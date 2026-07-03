# Developer Guide — Contributing to Eluru Connect

> Everything a new developer needs to understand the codebase, make changes safely, and add new features without breaking existing ones.

---

## Getting Your Bearings

Start by reading these files in order:

1. `backend/models.py` — the database tables (the foundation of everything)
2. `backend/schemas.py` — what the API accepts and returns
3. `backend/routers/bookings.py` — the most complex business logic
4. `frontend/src/types/index.ts` — TypeScript interfaces matching the backend schemas
5. `frontend/src/api/client.ts` — how the frontend talks to the backend

Once you understand these 5 files, the rest of the codebase will make sense.

---

## Code Organisation Principles

### Backend

Every router file owns one resource:

| File | Owns |
|------|------|
| `routers/auth.py` | User registration, login, /me |
| `routers/bookings.py` | Booking CRUD, check-in, cancel |
| `routers/venues.py` | Venue CRUD |
| `routers/waitlist.py` | Join/leave waitlist |
| `routers/admin.py` | Admin-only actions |

Business logic that crosses resources lives in `utils/`:

| File | Responsibility |
|------|---------------|
| `utils/fair_play.py` | Quota enforcement, strike logic |
| `utils/ws_manager.py` | WebSocket connection pool |

Configuration never lives in application code — it lives in `.env` read by `config.py`.

### Frontend

```
src/
├── types/         ← TypeScript interfaces only — no logic
├── api/           ← HTTP calls only — no UI
├── components/    ← Reusable UI pieces — no page-level logic
└── pages/         ← Full pages — compose components, call api/
```

A component should not call the API directly. Pages call the API and pass data down as props. This makes components testable in isolation.

---

## Adding a New API Endpoint

### Example: Add `GET /venues/{id}` — fetch a single venue

**Step 1: Add the route to `routers/venues.py`**

```python
@router.get("/{venue_id}", response_model=VenueRead)
def get_venue(
    venue_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    venue = session.get(Venue, venue_id)
    if not venue:
        raise HTTPException(404, "Venue not found")
    return venue
```

**Step 2: Verify the schema covers what you need**

`VenueRead` in `schemas.py` should have all fields you want to return. If not, add the field there and the corresponding column to `models.py`.

**Step 3: Test in Swagger UI**

Navigate to `http://localhost:8000/docs`, find your new endpoint, click "Try it out."

**Step 4: Use it in the frontend**

```typescript
// In api/client.ts or inline in the page
const venue = await api.get<Venue>(`/venues/${id}`);
```

---

## Adding a New Frontend Page

### Example: Add a "Venue Calendar" page

**Step 1: Create the page component**

```typescript
// src/pages/VenueCalendar.tsx
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Booking } from '../types';

const VenueCalendar = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);

    useEffect(() => {
        api.get<Booking[]>('/bookings/my').then(res => setBookings(res.data));
    }, []);

    return <div>...</div>;
};

export default VenueCalendar;
```

**Step 2: Add a route in `App.tsx`**

```typescript
import VenueCalendar from './pages/VenueCalendar';

// Inside <Routes>:
<Route path="/calendar" element={<VenueCalendar />} />
```

**Step 3: Add navigation in `AppLayout`**

```typescript
<NavLink to="/calendar">Calendar</NavLink>
```

---

## Adding a New Database Column

### Example: Add `phone_verified: bool` to the User table

**Step 1: Add the column to `models.py`**

```python
class User(SQLModel, table=True):
    ...
    phone_verified: bool = Field(default=False)
```

**Step 2: Re-seed (development) or migrate (production)**

Development:
```bash
python seed.py    # drops and recreates all tables
```

Production (using Alembic):
```bash
alembic revision --autogenerate -m "add phone_verified to user"
alembic upgrade head
```

**Step 3: Expose in the schema if needed**

```python
class UserRead(BaseModel):
    ...
    phone_verified: bool
```

**Step 4: Update TypeScript interface**

```typescript
// types/index.ts
export interface User {
    ...
    phone_verified: boolean;
}
```

---

## Understanding the Booking Creation Flow

This is the most complex path in the system. Here's exactly what happens when `POST /bookings/` is called:

```
1. JWT extracted from Authorization header
2. User loaded from database (suspended check)
3. BookingCreate schema validates request body:
   - end_time > start_time ✓
   - duration <= 12 hours ✓
4. enforce_quotas() checks monthly booking count
   - citizen: max 4 this month
   - vip: max 8 this month
5. SELECT FOR UPDATE: lock existing confirmed bookings for this venue
6. Check for time overlap with locked bookings
   - If overlap exists → HTTPException(409)
7. Determine booking_type:
   - govt_super_admin → GOVT_OVERRIDE
   - vip → VIP
   - citizen → STANDARD
8. Insert new Booking with status=CONFIRMED
9. session.commit() (releases lock)
10. manager.broadcast({"type": "booking_created", ...})
11. Return BookingRead schema
```

If anything from step 2–8 fails, the transaction is rolled back and no booking is created.

---

## Understanding the Cancellation + Waitlist Promotion Flow

```
1. POST /bookings/{id}/cancel received
2. Load booking, verify it belongs to current user
3. Check status == CONFIRMED (cannot cancel completed/no-show)
4. Set booking.status = CANCELLED
5. Query waitlist: find first entry for same venue + same time slot
   - ORDER BY queue_position ASC, LIMIT 1
   - WITH FOR UPDATE (lock against concurrent promotions)
6. If waitlist entry found:
   a. Create new Booking for the waitlisted user (status=CONFIRMED)
   b. Delete the waitlist entry
   c. Broadcast "waitlist_promoted" with their user_id + personalised message
7. Broadcast "booking_cancelled"
8. session.commit()
```

The `WITH FOR UPDATE` on step 5 prevents two simultaneous cancellations from promoting the same waitlist entry twice.

---

## TypeScript Patterns Used

### Never use `any`

```typescript
// Bad
const data: any = await api.get('/bookings/my');

// Good
const data = await api.get<Booking[]>('/bookings/my');
```

All API responses should be typed against the interfaces in `types/index.ts`.

### Error handling in API calls

```typescript
try {
    await api.post(`/bookings/${id}/cancel`);
    toast.success('Booking cancelled');
    fetchData();
} catch (err: unknown) {
    if (err instanceof AxiosError) {
        toast.error(err.response?.data?.detail || 'Cancellation failed');
    }
}
```

---

## Pydantic Validation Patterns

### Field validator (single field)

```python
@field_validator('phone_number')
@classmethod
def phone_valid(cls, v: str) -> str:
    digits = ''.join(filter(str.isdigit, v))
    if len(digits) < 10:
        raise ValueError('Phone number must be at least 10 digits')
    return v   # return the value (possibly transformed)
```

### Model validator (cross-field)

```python
@model_validator(mode='after')
def end_after_start(self) -> 'BookingCreate':
    if self.end_time <= self.start_time:
        raise ValueError('end_time must be after start_time')
    return self
```

Use `field_validator` for single-field rules. Use `model_validator` when you need to compare multiple fields.

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET_KEY` | Yes | (insecure default) | 64-char random hex string |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `1440` | Token lifetime (24h) |
| `FRONTEND_URL` | No | `http://localhost:5173` | CORS allowed origin |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|---------|----------|---------|-------------|
| `VITE_API_URL` | Yes | — | Backend base URL |

Variables prefixed with `VITE_` are bundled into the frontend JavaScript. Never put secrets in `VITE_` variables.

---

## Testing Checklist

Before submitting any change, manually verify:

### Booking Flow
- [ ] Book a slot → confirmed on dashboard
- [ ] Book the same slot again → 409 conflict → conflict screen appears
- [ ] Join waitlist from conflict screen → waitlist entry on dashboard
- [ ] Cancel first booking → waitlist user is auto-promoted

### Fair-Play
- [ ] Book 4 slots as citizen → 5th booking blocked with quota message
- [ ] Book 8 slots as VIP → 9th booking blocked

### Admin
- [ ] Admin can suspend a user → suspended user cannot log in
- [ ] Admin override requires reason ≥ 10 chars → short reason rejected
- [ ] Override appears on public audit ledger

### Auth
- [ ] Wrong password → 401
- [ ] Expired token → auto-logout
- [ ] Citizen accessing /admin URL → redirected (frontend) + 403 (backend)

---

## Useful Development Commands

```bash
# Backend: run with auto-reload
uvicorn main:app --reload --port 8000

# Backend: run seed
python seed.py

# Frontend: dev server
npm run dev

# Frontend: type check
npm run tsc --noEmit

# Frontend: build for production
npm run build

# View backend API docs
# http://localhost:8000/docs

# View WebSocket connections (rough count)
# http://localhost:8000/health
```

---

## What To Read Next

| Topic | Document |
|-------|---------|
| How the database is structured | `DATABASE_SCHEMA.md` |
| Every API endpoint | `API_REFERENCE.md` |
| How WebSocket events work | `REALTIME_SYSTEM.md` |
| Security decisions | `SECURITY_MODEL.md` |
| Fair-play algorithm | `FAIRPLAY_SYSTEM.md` |
| Deployment | `DEPLOYMENT_GUIDE.md` |
