from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func, and_
from database import get_session
from models import Waitlist, User, Venue
from schemas import BookingCreate, WaitlistRead
from auth import get_current_user
from typing import List

router = APIRouter(prefix="/waitlist", tags=["Waitlist"])

@router.post("/", summary="Join the waitlist for a slot")
async def join_waitlist(
    waitlist_in: BookingCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    venue = session.get(Venue, waitlist_in.venue_id)
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    # Prevent duplicate waitlist entries for the same slot
    existing = session.exec(select(Waitlist).where(
        and_(
            Waitlist.user_id == user.id,
            Waitlist.venue_id == waitlist_in.venue_id,
            Waitlist.requested_start == waitlist_in.start_time,
            Waitlist.requested_end == waitlist_in.end_time
        )
    )).first()
    if existing:
        raise HTTPException(status_code=400, detail="You are already in the waitlist for this exact slot")

    # Queue position is per venue+slot (not global)
    count = session.exec(
        select(func.count(Waitlist.id)).where(
            and_(
                Waitlist.venue_id == waitlist_in.venue_id,
                Waitlist.requested_start == waitlist_in.start_time,
                Waitlist.requested_end == waitlist_in.end_time
            )
        )
    ).one()

    new_entry = Waitlist(
        user_id=user.id,
        venue_id=waitlist_in.venue_id,
        requested_start=waitlist_in.start_time,
        requested_end=waitlist_in.end_time,
        queue_position=count + 1
    )
    session.add(new_entry)
    session.commit()
    session.refresh(new_entry)

    return {
        "message": "Successfully joined waitlist",
        "position": new_entry.queue_position,
        "venue": venue.name
    }

@router.get("/my", response_model=List[WaitlistRead], summary="Get your waitlist entries")
async def get_my_waitlist(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    return session.exec(select(Waitlist).where(Waitlist.user_id == user.id)).all()

@router.delete("/{waitlist_id}", summary="Leave a waitlist")
async def leave_waitlist(
    waitlist_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    entry = session.get(Waitlist, waitlist_id)
    if not entry or entry.user_id != user.id:
        raise HTTPException(status_code=404, detail="Waitlist entry not found or access denied")

    session.delete(entry)
    session.commit()
    return {"message": "Removed from waitlist"}
