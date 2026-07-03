from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Venue, User
from schemas import VenueCreate, VenueRead
from auth import check_admin_role, get_current_user
from typing import List

router = APIRouter(prefix="/venues", tags=["Venues"])

@router.post("/", response_model=VenueRead, summary="Create a new venue (admin only)")
def create_venue(
    venue_in: VenueCreate,
    admin: User = Depends(check_admin_role),
    session: Session = Depends(get_session)
):
    new_venue = Venue(**venue_in.model_dump())
    session.add(new_venue)
    session.commit()
    session.refresh(new_venue)
    return new_venue

@router.get("/", response_model=List[VenueRead], summary="List all public venues")
def list_venues(skip: int = 0, limit: int = 50, session: Session = Depends(get_session)):
    return session.exec(select(Venue).offset(skip).limit(limit)).all()

@router.get("/{venue_id}", response_model=VenueRead, summary="Get a specific venue")
def get_venue(venue_id: int, session: Session = Depends(get_session)):
    venue = session.get(Venue, venue_id)
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    return venue

@router.put("/{venue_id}", response_model=VenueRead, summary="Update venue details (admin only)")
def update_venue(
    venue_id: int,
    venue_in: VenueCreate,
    admin: User = Depends(check_admin_role),
    session: Session = Depends(get_session)
):
    venue = session.get(Venue, venue_id)
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    for key, value in venue_in.model_dump(exclude_unset=True).items():
        setattr(venue, key, value)
    session.add(venue)
    session.commit()
    session.refresh(venue)
    return venue
