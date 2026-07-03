# API Reference — Eluru Connect Backend

> Every endpoint, its method, authentication requirement, request body, and response shape. Base URL: `http://localhost:8000`

---

## Authentication

All protected endpoints require a JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Tokens are obtained from `/auth/login` and expire after **24 hours**.

---

## Quick Reference Table

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/auth/register` | No | — | Create account |
| POST | `/auth/login` | No | — | Get JWT token |
| GET | `/auth/me` | Yes | Any | Get current user profile |
| GET | `/venues/` | Yes | Any | List all venues |
| POST | `/venues/` | Yes | Admin | Create venue |
| GET | `/bookings/my` | Yes | Any | My bookings |
| POST | `/bookings/` | Yes | Any | Create booking |
| POST | `/bookings/{id}/cancel` | Yes | Any | Cancel my booking |
| POST | `/bookings/{id}/check-in` | Yes | Any | Check in to booking |
| GET | `/waitlist/my` | Yes | Any | My waitlist entries |
| POST | `/waitlist/` | Yes | Any | Join waitlist |
| DELETE | `/waitlist/{id}` | Yes | Any | Leave waitlist |
| GET | `/admin/users` | Yes | Admin/Manager | List all users |
| POST | `/admin/users/{id}/suspend` | Yes | Admin | Suspend user |
| POST | `/admin/users/{id}/reinstate` | Yes | Admin | Reinstate user |
| POST | `/admin/users/{id}/grant-vip` | Yes | Admin | Grant VIP |
| POST | `/admin/users/{id}/revoke-vip` | Yes | Admin | Revoke VIP |
| POST | `/admin/users/{id}/clear-strikes` | Yes | Admin | Clear fair-play strikes |
| POST | `/admin/bookings/{id}/override` | Yes | Admin | Override booking |
| GET | `/admin/stats` | Yes | Admin | Platform statistics |
| GET | `/admin/audit-log` | Yes | Admin | Server audit log |
| GET | `/public/audit` | No | — | Public transparency ledger |
| WebSocket | `/ws` | No | — | Real-time event stream |
| GET | `/health` | No | — | Health check |

---

## Auth Endpoints

### POST `/auth/register`

Create a new citizen account.

**Request Body:**
```json
{
  "name": "Venkatesh Rao",
  "phone_number": "9848012345",
  "password": "mypassword123"
}
```

**Validation:**
- `password`: minimum 6 characters
- `phone_number`: minimum 10 digits (strips non-digits)

**Response `201`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer"
}
```

**Error `422`:**
```json
{
  "detail": [{ "loc": ["body", "password"], "msg": "Password must be at least 6 characters" }]
}
```

**Error `400`:**
```json
{ "detail": "Phone number already registered" }
```

---

### POST `/auth/login`

Exchange credentials for a JWT token.

**Rate limit:** 10 requests per minute per IP.

**Request Body:**
```json
{
  "username": "9848012345",
  "password": "mypassword123"
}
```

Note: Uses OAuth2 `application/x-www-form-urlencoded` format (standard FastAPI OAuth2PasswordRequestForm).

**Response `200`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer"
}
```

**Error `401`:**
```json
{ "detail": "Incorrect phone number or password" }
```

**Error `403`:**
```json
{ "detail": "Account suspended. Contact municipal office." }
```

---

### GET `/auth/me`

Get the currently authenticated user's profile.

**Response `200`:**
```json
{
  "id": 2,
  "name": "Venkatesh Rao",
  "phone_number": "9848012345",
  "role": "citizen",
  "is_suspended": false,
  "fair_play_strikes": 1,
  "penalty_points": 0
}
```

---

## Venue Endpoints

### GET `/venues/`

List all public venues.

**Response `200`:**
```json
[
  {
    "id": 1,
    "name": "Alluri Sitarama Raju (ASR) Stadium",
    "location": "Powerpet, Eluru",
    "capacity": 5000,
    "requires_deposit": true,
    "deposit_amount": 500.0,
    "image_url": "https://images.unsplash.com/..."
  }
]
```

---

### POST `/venues/`

Create a new venue. **Admin only.**

**Request Body:**
```json
{
  "name": "New Community Hall",
  "location": "Eluru Main Rd",
  "capacity": 200,
  "requires_deposit": false,
  "deposit_amount": 0,
  "image_url": "https://..."
}
```

**Response `201`:** Full venue object.

---

## Booking Endpoints

### GET `/bookings/my`

Get all bookings belonging to the authenticated user, newest first.

**Response `200`:**
```json
[
  {
    "id": 14,
    "user_id": 2,
    "venue_id": 1,
    "start_time": "2024-05-10T09:00:00",
    "end_time": "2024-05-10T12:00:00",
    "status": "confirmed",
    "booking_type": "standard",
    "created_at": "2024-05-08T14:22:00",
    "override_reason": null
  }
]
```

---

### POST `/bookings/`

Create a new booking.

**Request Body:**
```json
{
  "venue_id": 1,
  "start_time": "2024-05-10T09:00",
  "end_time": "2024-05-10T12:00"
}
```

**Validation (server-side):**
- `end_time` must be after `start_time`
- Duration cannot exceed 12 hours
- Slot must not overlap with an existing confirmed booking

**Response `201`:** Full booking object.

**Error `409` — Slot conflict:**
```json
{ "detail": "This slot is already booked" }
```

**Error `429` — Quota exceeded:**
```json
{ "detail": "Monthly quota of 4 bookings reached" }
```

---

### POST `/bookings/{booking_id}/cancel`

Cancel a confirmed booking. Automatically promotes waitlist.

**Response `200`:**
```json
{ "message": "Booking cancelled. Slot released." }
```

**Error `403`:**
```json
{ "detail": "You can only cancel your own bookings" }
```

**Error `400`:**
```json
{ "detail": "Only confirmed bookings can be cancelled" }
```

---

### POST `/bookings/{booking_id}/check-in`

Mark arrival at the venue.

**Response `200`:**
```json
{ "message": "Check-in recorded successfully" }
```

---

## Waitlist Endpoints

### GET `/waitlist/my`

Get all waitlist entries for the current user.

**Response `200`:**
```json
[
  {
    "id": 3,
    "user_id": 3,
    "venue_id": 2,
    "requested_start": "2024-05-14T10:00:00",
    "requested_end": "2024-05-14T15:00:00",
    "queue_position": 1,
    "created_at": "2024-05-08T11:00:00"
  }
]
```

---

### POST `/waitlist/`

Join the waitlist for a specific slot.

**Request Body:**
```json
{
  "venue_id": 2,
  "start_time": "2024-05-14T10:00",
  "end_time": "2024-05-14T15:00"
}
```

**Response `201`:**
```json
{
  "id": 3,
  "queue_position": 1,
  ...
}
```

**Error `400`:**
```json
{ "detail": "You are already on the waitlist for this slot" }
```

---

### DELETE `/waitlist/{entry_id}`

Leave a waitlist. Removes your entry; others keep their positions.

**Response `200`:**
```json
{ "message": "Removed from waitlist" }
```

---

## Admin Endpoints

All admin endpoints require role `govt_super_admin`. Viewing endpoints also allow `venue_manager`.

### GET `/admin/users`

List all registered users with full profile data.

**Response `200`:** Array of user objects including `phone_number` (not shown in public API).

---

### POST `/admin/users/{user_id}/suspend`

Suspend a user account. They cannot log in while suspended.

**Request Body:**
```json
{ "reason": "Repeated no-shows and abusive behaviour reported by venue staff" }
```

**Response `200`:**
```json
{ "message": "User suspended" }
```

---

### POST `/admin/users/{user_id}/reinstate`

Lift a suspension.

**Response `200`:**
```json
{ "message": "User reinstated" }
```

---

### POST `/admin/users/{user_id}/grant-vip`

Upgrade a citizen account to VIP (doubles monthly quota).

**Response `200`:**
```json
{ "message": "VIP status granted" }
```

---

### POST `/admin/users/{user_id}/revoke-vip`

Downgrade VIP back to citizen.

---

### POST `/admin/users/{user_id}/clear-strikes`

Reset `fair_play_strikes` to 0.

---

### POST `/admin/bookings/{booking_id}/override`

Cancel any booking with a mandatory written reason.

**Request Body:**
```json
{
  "reason": "Reserved for District Collector's official programme — Order No. DC/ELR/2024/007"
}
```

**Validation:**
- `reason` must be non-empty
- `reason` must be at least 10 characters

**Response `200`:**
```json
{ "message": "Booking overridden", "booking_id": 42 }
```

This action:
1. Sets booking status to `overridden`
2. Stores the reason and admin's user ID
3. Writes to `logs/audit.log`
4. Broadcasts via WebSocket to all connected clients

---

### GET `/admin/stats`

Platform-wide statistics.

**Response `200`:**
```json
{
  "total_users": 847,
  "total_bookings": 2341,
  "suspended_users": 3,
  "vip_users": 12
}
```

---

### GET `/admin/audit-log`

Last 100 lines of the server-side audit log file.

**Response `200`:**
```json
{
  "log": "2024-05-08 14:32:11 | OVERRIDE | admin_id=1 booking_id=42 | ..."
}
```

---

## Public Endpoint

### GET `/public/audit`

No authentication required. Returns all bookings with status and override reasons.

**Response `200`:**
```json
[
  {
    "id": 42,
    "venue_id": 1,
    "start_time": "2024-05-10T09:00:00",
    "end_time": "2024-05-10T13:00:00",
    "status": "overridden",
    "booking_type": "govt_override",
    "override_reason": "District Collector programme — Order DC/ELR/2024/007"
  }
]
```

Note: User names and phone numbers are **not included** in this response — only booking data.

---

## WebSocket

### `ws://localhost:8000/ws`

Connect to receive real-time booking events. No authentication required on connection.

**Event: booking_created**
```json
{
  "type": "booking_created",
  "venue_id": 1,
  "start_time": "2024-05-10T09:00:00",
  "end_time": "2024-05-10T12:00:00"
}
```

**Event: booking_cancelled**
```json
{
  "type": "booking_cancelled",
  "venue_id": 1,
  "booking_id": 14
}
```

**Event: waitlist_promoted**
```json
{
  "type": "waitlist_promoted",
  "user_id": 3,
  "venue_id": 2,
  "message": "Great news! Your waitlisted slot at Helapuri Town Hall is now confirmed!"
}
```

**Event: booking_overridden**
```json
{
  "type": "booking_overridden",
  "booking_id": 42,
  "reason": "District Collector programme"
}
```

---

## Health Check

### GET `/health`

Returns `200 OK` with `{"status": "ok"}`. Used by monitoring tools and deployment platforms.

---

## HTTP Status Codes Used

| Code | Meaning | Used When |
|------|---------|-----------|
| 200 | OK | Successful GET, action completed |
| 201 | Created | New resource (booking, user, venue) created |
| 400 | Bad Request | Business logic violation (e.g. cancel a completed booking) |
| 401 | Unauthorized | No token or expired token |
| 403 | Forbidden | Wrong role, or suspended account |
| 404 | Not Found | Resource ID doesn't exist |
| 409 | Conflict | Booking slot overlap |
| 422 | Unprocessable | Pydantic validation failed (field-level errors) |
| 429 | Too Many Requests | Rate limit or quota exceeded |
| 500 | Server Error | Unexpected exceptions |

---

## Interactive Docs

When the backend is running, visit:
- `http://localhost:8000/docs` — Swagger UI (try any endpoint live)
- `http://localhost:8000/redoc` — ReDoc (clean reference view)

Both are auto-generated from the FastAPI route definitions. No extra configuration needed.
