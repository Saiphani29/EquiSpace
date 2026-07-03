# Technical Overview — How Eluru Connect Is Built

> This document explains the engineering architecture: every layer of the stack, how they connect, and the specific technical decisions made and why.

---

## System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                          │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              React 18 + TypeScript (Vite)                │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐   │  │
│  │  │  LoginPage  │  │  Venues Page │  │   Dashboard   │   │  │
│  │  │  (3D Hero)  │  │  BookingModal│  │  AdminPanel   │   │  │
│  │  └─────────────┘  └──────────────┘  └───────────────┘   │  │
│  │                                                          │  │
│  │  Axios (JWT interceptor) ──────► REST API calls          │  │
│  │  WebSocket client        ──────► Real-time updates       │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬─────────────────────────────────┘
                               │ HTTPS / WSS
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Python 3.11)                  │
│                                                                  │
│  ┌────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐  │
│  │ /auth      │  │  /bookings   │  │ /venues  │  │ /admin   │  │
│  │ /auth/me   │  │  /bookings/my│  │          │  │          │  │
│  └────────────┘  └──────────────┘  └──────────┘  └──────────┘  │
│                                                                  │
│  ┌────────────┐  ┌──────────────────────────────────────────┐   │
│  │ /waitlist  │  │  WebSocket /ws  (ConnectionManager)      │   │
│  └────────────┘  └──────────────────────────────────────────┘   │
│                                                                  │
│  Middleware: CORS ── JWT Auth ── Rate Limiting ── Audit Logger   │
└──────────────────────────────┬───────────────────────────────────┘
                               │ SQLModel / SQLAlchemy 2
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│              PostgreSQL 15 — Neon Serverless Cloud               │
│                                                                  │
│   users ──── bookings ──── venues ──── waitlist                  │
│                                                                  │
│   Row-level locking (SELECT FOR UPDATE) on hot paths            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Backend: FastAPI

### Why FastAPI?

- **Auto-generated OpenAPI docs** at `/docs` — every endpoint is instantly testable
- **Async-native** — WebSocket and HTTP share the same event loop without threads
- **Pydantic validation** — request body validation is declarative, not manual `if` checks
- **Python ecosystem** — SQLAlchemy, python-jose, passlib all integrate cleanly

### Project Structure

```
backend/
├── main.py              ← App entry point, CORS, router registration
├── config.py            ← pydantic-settings reads .env file
├── database.py          ← Engine creation, session dependency
├── models.py            ← SQLModel table definitions
├── schemas.py           ← Pydantic request/response shapes
├── auth.py              ← JWT creation/validation, password hashing
├── seed.py              ← Database seeder (users, venues, dummy bookings)
├── .env                 ← Secrets (not committed to git)
├── routers/
│   ├── auth.py          ← /auth/register, /auth/login, /auth/me
│   ├── bookings.py      ← /bookings/, /bookings/my, check-in, cancel
│   ├── venues.py        ← /venues/ CRUD
│   ├── waitlist.py      ← /waitlist/, /waitlist/my
│   └── admin.py         ← /admin/users, override, suspend, VIP
└── utils/
    ├── ws_manager.py    ← WebSocket connection pool
    └── fair_play.py     ← Quota enforcement, strike logic
```

---

## Configuration Management

All secrets live in `.env`. Python reads them via `pydantic-settings`:

```python
# config.py
class Settings(BaseSettings):
    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440   # 24 hours
    frontend_url: str = "http://localhost:5173"
    model_config = SettingsConfigDict(env_file=".env")
```

This means:
- Zero hardcoded secrets anywhere in source code
- Swap database by changing one env variable — no code changes
- Works identically on localhost and production (just different `.env`)

---

## Database Layer

### ORM: SQLModel

SQLModel combines SQLAlchemy (the battle-tested ORM) with Pydantic (the validation library). One class definition serves as both the DB table schema and the API response type:

```python
class Booking(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    venue_id: int = Field(foreign_key="venue.id")
    start_time: datetime
    end_time: datetime
    status: BookingStatus = Field(default=BookingStatus.CONFIRMED)
    booking_type: BookingType = Field(default=BookingType.STANDARD)
    override_reason: Optional[str] = None
    overridden_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
```

### PostgreSQL on Neon

Neon is a serverless PostgreSQL provider. Key properties:
- Connection pooling built-in (important for FastAPI's async model)
- Automatic scaling — handles 0 to many concurrent users
- Free tier sufficient for development and demo load
- Supports all standard PostgreSQL features (transactions, locking, JSONB)

### Row-Level Locking

The booking creation path uses `SELECT FOR UPDATE`:

```python
# This locks the rows while we check for conflicts
existing = session.exec(
    select(Booking)
    .where(Booking.venue_id == venue_id)
    .where(Booking.status == BookingStatus.CONFIRMED)
    .with_for_update()   # ← PostgreSQL lock
).all()
```

Without this lock, two users submitting at the same millisecond could both pass the conflict check and both get confirmed — a double-booking. The lock serialises concurrent requests at the database level.

---

## Authentication System

### Registration Flow
```
User submits {name, phone, password}
    → pydantic validates (phone ≥ 10 digits, password ≥ 6 chars)
    → bcrypt hashes the password (12 rounds)
    → User record inserted with role=CITIZEN
    → JWT token returned
```

### Login Flow
```
User submits {phone, password}
    → Look up user by phone
    → bcrypt.verify(submitted_password, stored_hash)
    → If match → create JWT with payload {sub: phone, exp: now+24h}
    → Return token
```

### JWT Structure
```json
{
  "sub": "9848012345",
  "exp": 1717000000
}
```

The token is signed with `JWT_SECRET_KEY` using HS256. Any tampering invalidates the signature.

### Per-Request Auth
Every protected endpoint uses a FastAPI dependency:

```python
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session)
) -> User:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    user = session.exec(select(User).where(User.phone_number == payload["sub"])).first()
    if user.is_suspended:
        raise HTTPException(403, "Account suspended")
    return user
```

The frontend's Axios interceptor auto-attaches the token to every request:

```typescript
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

## Real-Time: WebSocket

### Connection Manager

```python
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    async def broadcast(self, message: dict):
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)   # client disconnected
        for conn in dead:
            self.active_connections.remove(conn)
```

The dead-connection cleanup is critical. Without it, one user closing their browser tab would leave a stale connection in the list. The next broadcast would fail on that stale socket and potentially crash the broadcast loop.

### Events Broadcast

| Event Type | Triggered By | Payload |
|-----------|-------------|---------|
| `booking_created` | New booking confirmed | `{venue_id, start_time, end_time}` |
| `booking_cancelled` | User cancels | `{venue_id, booking_id}` |
| `waitlist_promoted` | Cancellation promotes next user | `{user_id, venue_id, message}` |
| `booking_overridden` | Admin override | `{booking_id, reason}` |

### Frontend WebSocket Client

```typescript
useEffect(() => {
  const ws = new WebSocket('ws://localhost:8000/ws');
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'waitlist_promoted' && data.user_id === currentUser.id) {
      toast.success(data.message);
      refetchBookings();
    }
  };
  return () => ws.close();
}, []);
```

---

## Fair-Play Engine

### `utils/fair_play.py`

```python
def enforce_quotas(session, user, venue_id, vip_limit=8):
    limit = vip_limit if user.role in (UserRole.VIP, UserRole.GOVT_SUPER_ADMIN) else 4

    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
    month_count = session.exec(
        select(func.count(Booking.id)).where(
            Booking.user_id == user.id,
            Booking.created_at >= month_start,
            Booking.status == BookingStatus.CONFIRMED
        )
    ).one()

    if month_count >= limit:
        raise HTTPException(429, f"Monthly quota of {limit} bookings reached")
```

### Strike System

| Trigger | Action |
|---------|--------|
| No check-in within 30 min | `fair_play_strikes += 1` |
| 3 strikes | `is_suspended = True` |
| Admin clears strikes | `fair_play_strikes = 0` |
| Admin suspends manually | `is_suspended = True` + reason logged |

---

## Frontend: React 18 + TypeScript

### Project Structure

```
frontend/src/
├── types/
│   └── index.ts           ← All shared TypeScript interfaces
├── api/
│   └── client.ts          ← Axios instance with JWT interceptor
├── components/
│   ├── SpotlightCard.tsx   ← Reusable card with cursor glow effect
│   ├── BookingModal.tsx    ← Two-step booking + conflict UI
│   └── three/
│       └── HeroScene.tsx   ← Three.js 3D animated orb
└── pages/
    ├── LoginPage.tsx       ← Split layout: 3D hero + auth form
    ├── Dashboard.tsx       ← Active bookings + waitlist + fair-play
    ├── VenuesPage.tsx      ← Browse + book venues
    ├── AdminPanel.tsx      ← Admin user management + overrides
    └── GuidePage.tsx       ← In-app feature guide for users
```

### Type Safety

Every API response is typed. The `User`, `Booking`, `Venue`, and `WaitlistEntry` interfaces in `types/index.ts` ensure TypeScript catches mismatches at compile time, not at runtime in production.

### datetime-local Bug Fix

The browser's `datetime-local` input type expects `YYYY-MM-DDTHH:MM` in **local time**. `new Date().toISOString()` returns UTC. For an IST user (UTC+5:30), this difference causes valid future bookings to be rejected.

**Fix — custom local formatter:**
```typescript
const toLocalISO = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}` +
         `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const minStr = toLocalISO(new Date(Date.now() + 30 * 60 * 1000));
```

---

## 3D Landing Page

Built with Three.js via `@react-three/fiber` (React renderer for Three.js) and `@react-three/drei` (utility components):

- **Icosahedron mesh** — animated slow rotation (the central orb)
- **Wireframe overlay** — same geometry, slightly larger, transparent wireframe
- **Two torus rings** — orbital rings at different angles, continuously spinning
- **Stars background** — `<Stars>` component from drei, 5000 particles
- **Float animation** — gentle vertical bob using `<Float>` from drei
- **Ambient + directional lights** — blue-tinted lighting to match brand colour

The 3D scene renders only on the login page. After login, the app switches to a standard 2D layout to keep performance optimal for the dashboard and venue browser.

---

## CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],  # specific origin, NOT "*"
    allow_credentials=True,                  # needed for cookies/auth
    allow_methods=["*"],
    allow_headers=["*"],
)
```

`allow_origins=["*"]` with `allow_credentials=True` is rejected by browsers. The fix is to specify the exact frontend origin. This means on production you set `FRONTEND_URL=https://yourdomain.com` and it just works.

---

## Audit Logging

Every admin action writes to `logs/audit.log`:

```
2024-01-15 14:32:11 | OVERRIDE | admin_id=1 booking_id=42 | reason=Election commission order
2024-01-15 14:35:00 | SUSPEND  | admin_id=1 target_user=7 | reason=Repeated no-shows
2024-01-15 14:40:22 | VIP_GRANT | admin_id=1 target_user=3
```

The log uses Python's standard `logging` module with a file handler. Log entries are append-only — even the database owner cannot silently delete them without leaving evidence in filesystem metadata.

---

## Security Model Summary

| Threat | Mitigation |
|--------|-----------|
| Double-booking race condition | `SELECT FOR UPDATE` PostgreSQL lock |
| Brute-force login | Rate limit: 10 requests/minute per IP |
| Token theft / reuse | 24-hour expiry; HS256 signature |
| Privilege escalation | Role checked on every admin endpoint |
| CORS bypass | Specific origin allowlist, not wildcard |
| Suspended user access | Checked on every `/auth/me` call |
| Mass booking abuse | Monthly quota enforced server-side |
| Silent corruption | Mandatory override reasons + public ledger |

Full security details: see `SECURITY_MODEL.md`
