from sqlmodel import Session, select, func, and_
from models import Booking, User, Venue, BookingStatus
from datetime import datetime, timedelta
from fastapi import HTTPException

def check_user_eligibility(user: User):
    if user.is_suspended:
        raise HTTPException(
            status_code=403,
            detail="Your account is suspended due to fair-play violations. Contact the municipal office."
        )
    if user.fair_play_strikes >= 3:
        raise HTTPException(
            status_code=403,
            detail="Account locked: Too many fair-play strikes (3/3). Contact the municipal office to appeal."
        )

def enforce_quotas(session: Session, user: User, venue_id: int, vip_limit: int = 4):
    """
    Enforce monthly booking quota per user per venue.
    Citizens: max 4/month. VIP users: configurable via vip_limit (default 8).
    """
    one_month_ago = datetime.utcnow() - timedelta(days=30)
    count = session.exec(
        select(func.count(Booking.id)).where(
            and_(
                Booking.user_id == user.id,
                Booking.venue_id == venue_id,
                Booking.status == BookingStatus.CONFIRMED,
                Booking.start_time > one_month_ago
            )
        )
    ).one()

    from models import UserRole
    limit = vip_limit if user.role == UserRole.VIP else 4
    if count >= limit:
        raise HTTPException(
            status_code=400,
            detail=f"Monthly quota exceeded: You can book this venue a maximum of {limit} times per month."
        )

def check_vip_quota_release(venue: Venue, start_time: datetime):
    """
    Prime-time slots (Sundays before 12 PM) are reserved for VIP/Government for 48 hours.
    After 48 hours before the event, they open to all citizens.
    This policy ensures VIP access without permanently locking citizens out.
    """
    # Check if slot is in prime-time window (configurable via venue.quota_rules in future)
    is_prime_time = start_time.weekday() == 6 and start_time.hour < 12

    if is_prime_time:
        hours_until_event = (start_time - datetime.utcnow()).total_seconds() / 3600
        if hours_until_event > 48:
            raise HTTPException(
                status_code=403,
                detail=(
                    "This is a VIP/Government priority slot (Sunday morning prime-time). "
                    f"It will open to citizens {int(hours_until_event - 48)} hours from now "
                    "(48 hours before the event)."
                )
            )
