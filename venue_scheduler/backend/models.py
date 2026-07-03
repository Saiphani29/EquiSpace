from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy.dialects.postgresql import JSONB

class UserRole(str, Enum):
    GUEST = "guest"
    CITIZEN = "citizen"
    VIP = "vip"
    VENUE_MANAGER = "venue_manager"
    GOVT_SUPER_ADMIN = "govt_super_admin"

class BookingStatus(str, Enum):
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"
    OVERRIDDEN = "overridden"

class BookingType(str, Enum):
    STANDARD = "standard"
    VIP = "vip"
    GOVT_OVERRIDE = "govt_override"

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    phone_number: str = Field(index=True, unique=True)
    password_hash: str
    role: UserRole = Field(default=UserRole.CITIZEN)
    penalty_points: int = Field(default=0)
    fair_play_strikes: int = Field(default=0)
    is_suspended: bool = Field(default=False)
    
    # Relationships
    # Explicitly link to user_id to avoid ambiguity with overridden_by_user_id
    bookings: List["Booking"] = Relationship(
        back_populates="user", 
        sa_relationship_kwargs={"foreign_keys": "[Booking.user_id]"}
    )

class Venue(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    location: str
    image_url: Optional[str] = Field(default="https://images.unsplash.com/photo-1595113316349-9fa4ee24f884?auto=format&fit=crop&q=80&w=800")
    latitude: float = Field(default=0.0)
    longitude: float = Field(default=0.0)
    capacity: int
    requires_deposit: bool = Field(default=False)
    deposit_amount: float = Field(default=0.0)
    rules_config: Dict = Field(default={}, sa_column=Column(JSONB))
    quota_rules: Dict = Field(default={}, sa_column=Column(JSONB))
    
    bookings: List["Booking"] = Relationship(back_populates="venue")

class Booking(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    venue_id: int = Field(foreign_key="venue.id")
    start_time: datetime
    end_time: datetime
    status: BookingStatus = Field(default=BookingStatus.CONFIRMED)
    booking_type: BookingType = Field(default=BookingType.STANDARD)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Override & Maintenance Data
    override_reason: Optional[str] = None
    overridden_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    checkout_photo_url: Optional[str] = None
    reported_dirty_by_next_user: bool = Field(default=False)

    user: User = Relationship(
        back_populates="bookings",
        sa_relationship_kwargs={"foreign_keys": "[Booking.user_id]"}
    )
    overridden_by: Optional[User] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Booking.overridden_by_user_id]"}
    )
    venue: Venue = Relationship(back_populates="bookings")

class Waitlist(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    venue_id: int = Field(foreign_key="venue.id")
    requested_start: datetime
    requested_end: datetime
    queue_position: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
