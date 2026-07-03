# Database Schema — Eluru Connect

> Every table, every column, every relationship. Includes the design reasoning behind each decision.

---

## Overview

The database has **4 core tables**:

```
users ─────────────────────────────────────────┐
  │                                             │
  │ (user_id FK)         (overridden_by FK)     │
  ▼                              ▼              │
bookings ◄──── (venue_id FK) ─── venues         │
                                   ▲            │
waitlist ──── (venue_id FK) ───────┘            │
  │                                             │
  └─── (user_id FK) ──────────────────────────►┘
```

---

## Table: `user`

Stores every registered account.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | INTEGER | auto | Primary key |
| `name` | VARCHAR | required | Full name |
| `phone_number` | VARCHAR | required, unique | Used as login username |
| `password_hash` | VARCHAR | required | bcrypt hash, never plaintext |
| `role` | ENUM | `citizen` | citizen / vip / venue_manager / govt_super_admin |
| `penalty_points` | INTEGER | `0` | Accumulated penalty score (future use) |
| `fair_play_strikes` | INTEGER | `0` | 0–3; at 3 → auto suspend |
| `is_suspended` | BOOLEAN | `false` | Suspended accounts cannot log in |

### Design Decisions

**Why phone number as username?**
India's digital identity infrastructure is phone-number-first (OTP logins, UPI, Aadhaar-linked). A phone number is universally available and familiar for citizens of all ages.

**Why store role as enum string?**
Integer role codes (0=citizen, 1=vip...) are opaque in queries and logs. String enums like `"govt_super_admin"` are self-documenting. The overhead is negligible.

**Why `penalty_points` AND `fair_play_strikes`?**
Strikes are a blunt 0/1/2/3 count used for the suspension threshold. Penalty points are a finer-grained score (future: could affect queue priority). They serve different purposes and are kept separate.

### Indexes

```sql
CREATE UNIQUE INDEX ON "user" (phone_number);
```

---

## Table: `venue`

Stores every public facility available for booking.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | INTEGER | auto | Primary key |
| `name` | VARCHAR | required | Full venue name |
| `location` | VARCHAR | required | Human-readable address |
| `image_url` | VARCHAR | default image | Unsplash photo URL |
| `latitude` | FLOAT | `0.0` | For future map integration |
| `longitude` | FLOAT | `0.0` | For future map integration |
| `capacity` | INTEGER | required | Maximum occupancy |
| `requires_deposit` | BOOLEAN | `false` | Whether a deposit is needed |
| `deposit_amount` | FLOAT | `0.0` | Deposit in INR |
| `rules_config` | JSONB | `{}` | Flexible per-venue rules |
| `quota_rules` | JSONB | `{}` | Custom quota overrides per venue |

### Why JSONB for rules_config?

Venues have heterogeneous rules. ASR Stadium might have:
```json
{ "no_alcohol": true, "security_deposit_required": true, "min_booking_hours": 2 }
```
Municipal Community Center might have:
```json
{ "noise_curfew": "22:00", "catering_allowed": true }
```

A relational column for every possible rule would require schema migrations for each new venue type. JSONB stores arbitrary structured data with PostgreSQL's full JSON querying capabilities.

---

## Table: `booking`

The central table. Every confirmed, cancelled, completed, or overridden booking lives here.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | INTEGER | auto | Primary key |
| `user_id` | INTEGER | required | FK → `user.id` |
| `venue_id` | INTEGER | required | FK → `venue.id` |
| `start_time` | TIMESTAMP | required | UTC stored, displayed in IST |
| `end_time` | TIMESTAMP | required | Must be after start_time |
| `status` | ENUM | `confirmed` | confirmed / cancelled / completed / no_show / overridden |
| `booking_type` | ENUM | `standard` | standard / vip / govt_override |
| `created_at` | TIMESTAMP | `now()` | When the booking was created |
| `override_reason` | VARCHAR | `null` | Mandatory if admin overrides |
| `overridden_by_user_id` | INTEGER | `null` | FK → `user.id` — which admin acted |
| `checkout_photo_url` | VARCHAR | `null` | Future: photo evidence at checkout |
| `reported_dirty_by_next_user` | BOOLEAN | `false` | Future: next user flags venue condition |

### Two Foreign Keys to `user`

`user_id` = the citizen who made the booking.
`overridden_by_user_id` = the admin who cancelled it (if applicable).

SQLAlchemy needs explicit `foreign_keys` hints to resolve this ambiguity:

```python
user: User = Relationship(
    back_populates="bookings",
    sa_relationship_kwargs={"foreign_keys": "[Booking.user_id]"}
)
overridden_by: Optional[User] = Relationship(
    sa_relationship_kwargs={"foreign_keys": "[Booking.overridden_by_user_id]"}
)
```

### Status State Transitions

```
[CONFIRMED] ──(user cancels)──────► [CANCELLED]
[CONFIRMED] ──(session ends)───────► [COMPLETED]
[CONFIRMED] ──(no check-in)────────► [NO_SHOW]
[CONFIRMED] ──(admin overrides)────► [OVERRIDDEN]
```

All terminal states are irreversible. You cannot move from CANCELLED back to CONFIRMED. A new booking must be created.

### Conflict Detection Query

When a new booking is requested for `(venue_id, start, end)`, the system checks:

```sql
SELECT * FROM booking
WHERE venue_id = :venue_id
  AND status = 'confirmed'
  AND start_time < :end_time      -- existing booking starts before new one ends
  AND end_time > :start_time      -- existing booking ends after new one starts
FOR UPDATE;                       -- lock these rows during the transaction
```

This is the **interval overlap check**:
- Two intervals overlap if and only if: `A.start < B.end AND A.end > B.start`

---

## Table: `waitlist`

Stores users queued for a specific time slot at a specific venue.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | INTEGER | auto | Primary key |
| `user_id` | INTEGER | required | FK → `user.id` |
| `venue_id` | INTEGER | required | FK → `venue.id` |
| `requested_start` | TIMESTAMP | required | The exact slot they want |
| `requested_end` | TIMESTAMP | required | Must match a taken booking's times |
| `queue_position` | INTEGER | required | 1 = first in line |
| `created_at` | TIMESTAMP | `now()` | Used as tiebreaker for queue ordering |

### Queue Position Logic

Queue position is calculated at insertion time:

```python
count = session.exec(
    select(func.count(Waitlist.id)).where(
        Waitlist.venue_id == venue_id,
        Waitlist.requested_start == start_time,
        Waitlist.requested_end == end_time
    )
).one()
new_entry.queue_position = count + 1
```

This counts how many others are waiting for this **exact slot** (same venue + same start + same end). The new user gets the next position.

### Promotion on Cancellation

When a confirmed booking is cancelled:

```python
# Find the first person in the waitlist for this slot
next_user = session.exec(
    select(Waitlist)
    .where(
        Waitlist.venue_id == cancelled_booking.venue_id,
        Waitlist.requested_start == cancelled_booking.start_time,
        Waitlist.requested_end == cancelled_booking.end_time
    )
    .order_by(Waitlist.queue_position)
    .with_for_update()   # lock to prevent two cancellations promoting the same person
    .limit(1)
).first()

if next_user:
    # Create a new confirmed booking for them
    new_booking = Booking(user_id=next_user.user_id, ...)
    session.delete(next_user)  # remove from waitlist
    # broadcast notification to all WebSocket clients
```

---

## Entity Relationship Diagram (Text)

```
┌──────────────────────┐         ┌──────────────────────────────────────┐
│        USER          │         │               BOOKING                │
│──────────────────────│         │──────────────────────────────────────│
│ id (PK)              │◄────────│ user_id (FK → user.id)               │
│ name                 │         │ id (PK)                              │
│ phone_number (UNIQUE)│         │ venue_id (FK → venue.id)             │
│ password_hash        │         │ start_time                           │
│ role                 │◄────────│ overridden_by_user_id (FK → user.id) │
│ fair_play_strikes    │         │ status                               │
│ penalty_points       │         │ booking_type                         │
│ is_suspended         │         │ override_reason                      │
└──────────────────────┘         │ created_at                           │
                                 └──────────────┬───────────────────────┘
                                                │
                                                │ venue_id
                                                ▼
┌──────────────────────┐         ┌──────────────────────────────────────┐
│      WAITLIST        │         │               VENUE                  │
│──────────────────────│         │──────────────────────────────────────│
│ id (PK)              │         │ id (PK)                              │
│ user_id (FK)         │────────►│ name                                 │
│ venue_id (FK)        │────────►│ location                             │
│ requested_start      │         │ capacity                             │
│ requested_end        │         │ requires_deposit                     │
│ queue_position       │         │ deposit_amount                       │
│ created_at           │         │ image_url                            │
└──────────────────────┘         │ latitude / longitude                 │
                                 │ rules_config (JSONB)                 │
                                 │ quota_rules (JSONB)                  │
                                 └──────────────────────────────────────┘
```

---

## Datetime Storage Convention

All timestamps are stored as **UTC** in PostgreSQL. The frontend receives UTC strings and converts to IST (`UTC+5:30`) for display using `toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })`.

Why UTC in the database?
- PostgreSQL `TIMESTAMP WITHOUT TIME ZONE` stores whatever you give it. If two servers in different timezones insert data, you get inconsistent values.
- UTC is the universal reference. IST is a display concern, not a storage concern.
- Daylight saving doesn't apply to India, but the UTC standard still eliminates ambiguity.

---

## Migration Strategy

The current `seed.py` uses `SQLModel.metadata.drop_all(engine)` — it drops and recreates all tables on every seed run. This is appropriate for development.

For production, the recommended approach is **Alembic**:
```bash
alembic init alembic
alembic revision --autogenerate -m "add checkout_photo_url to booking"
alembic upgrade head
```

Alembic generates migration scripts that apply only the delta changes — safe for production data.
