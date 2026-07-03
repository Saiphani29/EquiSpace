from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select, and_
from database import get_session
from models import Booking, User, Venue, BookingStatus, BookingType, UserRole
from schemas import BookingCreate, BookingRead, OverrideRequest
from auth import get_current_user, check_admin_role
from utils.fair_play import check_user_eligibility, enforce_quotas, check_vip_quota_release
from utils.limiter import limiter
from utils.logger import log_audit_action
from utils.ws_manager import manager
from typing import List, Optional
from datetime import datetime
import logging

router = APIRouter(prefix="/bookings", tags=["Bookings"])
logger = logging.getLogger(__name__)

@router.post("/", response_model=BookingRead, summary="Create a new booking")
@limiter.limit("5/minute")
async def create_booking(
    request: Request,
    booking_in: BookingCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    check_user_eligibility(user)

    # Row-level lock on venue to prevent race conditions
    venue = session.exec(select(Venue).where(Venue.id == booking_in.venue_id).with_for_update()).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    # Quota and VIP prime-time checks for citizens
    if user.role == UserRole.CITIZEN:
        enforce_quotas(session, user, booking_in.venue_id)
        check_vip_quota_release(venue, booking_in.start_time)

    # VIP gets larger quota but is still checked
    if user.role == UserRole.VIP:
        enforce_quotas(session, user, booking_in.venue_id, vip_limit=8)

    # Check for conflicting confirmed bookings
    overlap = session.exec(select(Booking).where(
        and_(
            Booking.venue_id == booking_in.venue_id,
            Booking.status == BookingStatus.CONFIRMED,
            Booking.start_time < booking_in.end_time,
            Booking.end_time > booking_in.start_time
        )
    )).first()

    if overlap:
        raise HTTPException(
            status_code=409,
            detail="Slot occupied. Join the Waitlist for automated allocation if cancelled."
        )

    booking_type = BookingType.STANDARD
    if user.role == UserRole.VIP:
        booking_type = BookingType.VIP
    elif user.role == UserRole.GOVT_SUPER_ADMIN:
        booking_type = BookingType.GOVT_OVERRIDE

    new_booking = Booking(
        user_id=user.id,
        venue_id=booking_in.venue_id,
        start_time=booking_in.start_time,
        end_time=booking_in.end_time,
        status=BookingStatus.CONFIRMED,
        booking_type=booking_type
    )
    session.add(new_booking)
    session.commit()
    session.refresh(new_booking)

    try:
        await manager.broadcast({
            "event": "BOOKING_CREATED",
            "venue_id": new_booking.venue_id,
            "venue_name": venue.name,
            "start_time": new_booking.start_time.isoformat(),
            "booking_type": booking_type.value
        })
    except Exception as e:
        logger.error(f"Broadcast failed after booking creation: {e}")

    return new_booking

@router.get("/my", response_model=List[BookingRead], summary="Get current user's bookings")
def list_my_bookings(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    return session.exec(select(Booking).where(Booking.user_id == user.id)).all()

@router.get("/", response_model=List[BookingRead], summary="List all bookings (public ledger)")
def list_bookings(
    venue_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session)
):
    try:
        statement = select(Booking)
        if venue_id:
            statement = statement.where(Booking.venue_id == venue_id)
        return session.exec(statement.offset(skip).limit(limit)).all()
    except Exception as e:
        logger.error(f"Database error in list_bookings: {e}")
        raise e

@router.post("/{booking_id}/check-in", summary="Check in to a confirmed booking")
async def check_in_booking(
    booking_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    booking = session.get(Booking, booking_id)
    if not booking or booking.user_id != user.id:
        raise HTTPException(status_code=404, detail="Booking not found or access denied")

    if booking.status != BookingStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail=f"Cannot check-in to a {booking.status} booking")

    now = datetime.utcnow()
    diff = (now - booking.start_time).total_seconds() / 60

    if diff < -30:
        raise HTTPException(status_code=400, detail="Check-in opens 30 minutes before your slot starts.")
    if diff > 30:
        booking.status = BookingStatus.NO_SHOW
        user.fair_play_strikes += 1
        if user.fair_play_strikes >= 3:
            user.is_suspended = True
        session.add(booking)
        session.add(user)
        session.commit()
        await trigger_waitlist_allocation(booking.venue_id, booking.start_time, booking.end_time, session)
        raise HTTPException(
            status_code=403,
            detail="Check-in window closed. No-Show recorded. One strike added to your fair-play profile."
        )

    booking.status = BookingStatus.COMPLETED
    session.add(booking)
    session.commit()
    return {"message": "Check-in successful! Enjoy your session.", "status": "COMPLETED"}

@router.post("/{booking_id}/cancel", summary="Cancel a confirmed booking")
async def cancel_booking(
    booking_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    booking = session.get(Booking, booking_id)
    if not booking or (booking.user_id != user.id and user.role != UserRole.GOVT_SUPER_ADMIN):
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status != BookingStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="Only confirmed bookings can be cancelled")

    booking.status = BookingStatus.CANCELLED
    session.add(booking)
    session.commit()

    await trigger_waitlist_allocation(booking.venue_id, booking.start_time, booking.end_time, session)
    return {"message": "Booking cancelled. Slot released to waitlist queue."}

@router.post("/{booking_id}/override", summary="Government override a booking (admin only)")
async def override_booking(
    booking_id: int,
    override: OverrideRequest,
    admin: User = Depends(check_admin_role),
    session: Session = Depends(get_session)
):
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = BookingStatus.OVERRIDDEN
    booking.override_reason = override.reason
    booking.overridden_by_user_id = admin.id
    booking.booking_type = BookingType.GOVT_OVERRIDE

    session.add(booking)
    session.commit()

    log_audit_action(admin.id, "GOVT_OVERRIDE", f"Booking ID {booking_id} overridden. Reason: {override.reason}")

    try:
        await manager.broadcast({
            "event": "BOOKING_OVERRIDDEN",
            "booking_id": booking_id,
            "reason": override.reason,
            "admin_id": admin.id
        })
    except Exception as e:
        logger.error(f"Broadcast failed for override: {e}")

    return {"message": "Booking overridden successfully", "booking_id": booking_id}

async def trigger_waitlist_allocation(venue_id: int, start: datetime, end: datetime, session: Session):
    from models import Waitlist
    # Use row-level lock to prevent double allocation race conditions
    statement = select(Waitlist).where(
        and_(
            Waitlist.venue_id == venue_id,
            Waitlist.requested_start <= start,
            Waitlist.requested_end >= end
        )
    ).order_by(Waitlist.queue_position.asc()).with_for_update()

    next_in_line = session.exec(statement).first()
    if not next_in_line:
        return

    new_booking = Booking(
        user_id=next_in_line.user_id,
        venue_id=venue_id,
        start_time=start,
        end_time=end,
        status=BookingStatus.CONFIRMED,
        booking_type=BookingType.STANDARD
    )
    session.add(new_booking)
    session.delete(next_in_line)
    session.commit()

    try:
        await manager.broadcast({
            "event": "WAITLIST_ALLOCATED",
            "target_user_id": next_in_line.user_id,
            "venue_id": venue_id,
            "message": "Your waitlisted slot has been automatically allocated!"
        })
    except Exception as e:
        logger.error(f"Broadcast failed for waitlist allocation: {e}")
