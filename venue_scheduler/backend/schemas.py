from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, Dict
from models import UserRole, BookingStatus, BookingType
from datetime import datetime, timezone

# ---- User Schemas ----

class UserCreate(BaseModel):
    name: str
    phone_number: str
    password: str

    @field_validator('password')
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

    @field_validator('phone_number')
    @classmethod
    def phone_valid(cls, v: str) -> str:
        digits = ''.join(filter(str.isdigit, v))
        if len(digits) < 10:
            raise ValueError('Phone number must be at least 10 digits')
        return v

class UserRead(BaseModel):
    id: int
    name: str
    phone_number: str
    role: UserRole
    is_suspended: bool
    fair_play_strikes: int
    penalty_points: int

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    phone_number: Optional[str] = None

# ---- Venue Schemas ----

class VenueCreate(BaseModel):
    name: str
    location: str
    capacity: int
    requires_deposit: bool = False
    deposit_amount: float = 0.0
    image_url: Optional[str] = None
    rules_config: Optional[Dict] = {}
    quota_rules: Optional[Dict] = {}

class VenueRead(BaseModel):
    id: int
    name: str
    location: str
    capacity: int
    requires_deposit: bool
    deposit_amount: float
    image_url: Optional[str] = None

# ---- Booking Schemas ----

class BookingCreate(BaseModel):
    venue_id: int
    start_time: datetime
    end_time: datetime

    @model_validator(mode='after')
    def end_after_start(self) -> 'BookingCreate':
        if self.end_time <= self.start_time:
            raise ValueError('end_time must be after start_time')
        duration_hours = (self.end_time - self.start_time).total_seconds() / 3600
        if duration_hours > 12:
            raise ValueError('A single booking cannot exceed 12 hours')
        return self

class BookingRead(BaseModel):
    id: int
    user_id: int
    venue_id: int
    start_time: datetime
    end_time: datetime
    status: BookingStatus
    booking_type: BookingType
    created_at: datetime
    override_reason: Optional[str] = None

# ---- Override Schema ----

class OverrideRequest(BaseModel):
    reason: str

    @field_validator('reason')
    @classmethod
    def reason_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Override reason cannot be empty')
        if len(v.strip()) < 10:
            raise ValueError('Override reason must be at least 10 characters')
        return v.strip()

# ---- Waitlist Schemas ----

class WaitlistRead(BaseModel):
    id: int
    user_id: int
    venue_id: int
    requested_start: datetime
    requested_end: datetime
    queue_position: int
    created_at: datetime

# ---- Admin Schemas ----

class UserSuspendRequest(BaseModel):
    reason: str
