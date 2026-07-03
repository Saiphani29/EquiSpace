# Security Model — Eluru Connect

> A thorough explanation of every security layer in the system: what attacks are defended against, how, and why each defence was chosen.

---

## Threat Model

Before writing code, we identified every realistic attack on the system:

| Threat | Attacker | Goal |
|--------|---------|------|
| Double-booking | Two users simultaneously | Both get the same confirmed slot |
| Slot hoarding | One user | Book all prime slots to resell/block |
| Brute-force login | Attacker | Guess any user's password |
| Token hijacking | Attacker with stolen token | Impersonate victim permanently |
| Privilege escalation | Citizen user | Access admin endpoints |
| Silent corruption | Govt admin | Cancel bookings without leaving a trace |
| Fake cancellations | Attacker | Cancel someone else's booking |
| API flooding | Attacker | Exhaust server resources |
| Suspended account bypass | Suspended user | Continue using the system after ban |

---

## Defence 1: Password Hashing (bcrypt)

### What It Protects Against
Database breach — if the database is stolen, raw passwords cannot be extracted.

### How It Works

```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)   # bcrypt with salt, 12 rounds

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

bcrypt works by:
1. Generating a random **salt** (16 bytes of entropy)
2. Running the password + salt through the Blowfish cipher 2^12 = 4096 times
3. Storing `$2b$12$<salt><hash>` — the salt is embedded in the hash

The 12 rounds make each verification take ~100ms on modern hardware. For a user logging in, this is imperceptible. For an attacker trying 10 billion password guesses per second, it reduces throughput to ~10 guesses/second — making brute force computationally infeasible.

### Why Not SHA256 / MD5?
SHA256 can be computed ~10 billion times per second on commodity GPU hardware. A stolen database with SHA256 hashes can be cracked in minutes using rainbow tables. bcrypt was specifically designed to be slow and is the industry standard for password storage.

---

## Defence 2: JWT Authentication

### What It Protects Against
Unauthenticated access to protected endpoints.

### Token Structure

```
Header:    { "alg": "HS256", "typ": "JWT" }
Payload:   { "sub": "9848012345", "exp": 1717086400 }
Signature: HMAC-SHA256(base64(header) + "." + base64(payload), SECRET_KEY)
```

The **signature** is what prevents forgery. To create a valid token for a different user, the attacker must know the `JWT_SECRET_KEY`. Without it, any modification to the payload invalidates the signature.

### Expiry

Tokens expire after **24 hours** (`ACCESS_TOKEN_EXPIRE_MINUTES=1440`). After expiry:
- The backend returns `401 Unauthorized`
- The Axios interceptor catches the 401 and calls `localStorage.clear()` + redirect to login
- The user must re-authenticate

This limits the window of damage if a token is stolen — it becomes useless after 24 hours.

### Frontend Token Storage

Tokens are stored in `localStorage`. This is a pragmatic choice for a government civic app:
- `localStorage` is accessible to JavaScript, which is a known XSS risk
- The alternative (`HttpOnly cookies`) requires CORS cookie handling and CSRF tokens
- For this application's threat model (municipal venue booking, not banking), localStorage is acceptable
- The 24-hour expiry limits the damage window

For a production banking-grade system, `HttpOnly` cookies with `SameSite=Strict` would be the correct choice.

---

## Defence 3: Role-Based Access Control (RBAC)

### Role Hierarchy

```
GUEST (unauthenticated)
  └─► CITIZEN (registered user)
        └─► VIP (elevated citizen)
              └─► VENUE_MANAGER (can view all bookings)
                    └─► GOVT_SUPER_ADMIN (full control)
```

### Enforcement

Every admin endpoint uses a role-checking dependency:

```python
def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.GOVT_SUPER_ADMIN:
        raise HTTPException(403, "Admin access required")
    return current_user
```

This dependency is injected at the route level:

```python
@router.post("/bookings/{id}/override")
async def override_booking(
    id: int,
    override: OverrideRequest,
    admin: User = Depends(require_admin),   # ← enforced here
    session: Session = Depends(get_session)
):
```

Even if a citizen somehow gets a valid token, they cannot reach admin endpoints — the role check happens server-side, independent of what the frontend shows.

### Frontend Route Guards

The frontend also hides admin UI from non-admins:

```typescript
{user.role === 'govt_super_admin' && (
  <NavLink to="/admin">Admin Panel</NavLink>
)}
```

This is a UX protection only — not a security one. The real protection is the server-side role check.

---

## Defence 4: Double-Booking Prevention (Row-Level Lock)

### The Race Condition

Without locking:
```
Time 0ms: User A checks → slot is free ✓
Time 1ms: User B checks → slot is free ✓
Time 2ms: User A inserts booking → success
Time 2ms: User B inserts booking → success (BUG: double booking!)
```

### The Fix: SELECT FOR UPDATE

```python
# Lock any existing bookings for this venue+slot while we check
existing = session.exec(
    select(Booking)
    .where(Booking.venue_id == venue_id)
    .where(Booking.status == BookingStatus.CONFIRMED)
    .where(Booking.start_time < end_time)
    .where(Booking.end_time > start_time)
    .with_for_update()
).all()

if existing:
    raise HTTPException(409, "This slot is already booked")

# Safe to insert — we hold the lock
new_booking = Booking(...)
session.add(new_booking)
session.commit()   # ← lock is released here
```

With the lock:
```
Time 0ms: User A acquires lock, checks → free ✓
Time 1ms: User B tries to acquire lock → BLOCKED (waiting)
Time 2ms: User A inserts, commits, releases lock
Time 3ms: User B acquires lock, checks → NOT free → returns 409
```

PostgreSQL guarantees serialisation at the row level. No two transactions can hold `FOR UPDATE` locks on the same rows simultaneously.

---

## Defence 5: Rate Limiting

### Login Endpoint

```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, ...):
```

10 requests per minute per IP. After 10 failed attempts:
- Returns `429 Too Many Requests`
- The attacker must wait 60 seconds before trying again

This makes a brute-force attack against an account with a 6-character password take:
- 6-char alphanumeric password space: 62^6 = 56 billion combinations
- At 10/minute = 600/hour → 56 billion / 600 = **107 million hours** = impractical

---

## Defence 6: Monthly Quota Enforcement

### Slot Hoarding Prevention

```python
month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
count = session.exec(
    select(func.count(Booking.id)).where(
        Booking.user_id == user.id,
        Booking.created_at >= month_start,
        Booking.status == BookingStatus.CONFIRMED
    )
).one()

limit = 8 if user.role in (VIP, GOVT_SUPER_ADMIN) else 4
if count >= limit:
    raise HTTPException(429, f"Monthly quota of {limit} bookings reached")
```

This check runs **server-side** on every booking creation. The frontend displays the limit as a courtesy, but the backend enforces it absolutely.

Even if a user builds a custom client to bypass the frontend, the backend will reject their 5th booking (for citizens) or 9th booking (for VIPs).

---

## Defence 7: Suspended Account Check

### Bypass Prevention

A suspended user might still have a valid, unexpired JWT token in their browser. We check the suspension flag on every request — not just at login:

```python
async def get_current_user(token, session) -> User:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    user = session.exec(select(User).where(...)).first()

    if not user:
        raise HTTPException(401, "User not found")
    if user.is_suspended:
        raise HTTPException(403, "Account suspended")  # checked EVERY request

    return user
```

When an admin suspends a user, that user's next API call — even mid-session — returns 403. The Axios interceptor catches it and logs them out immediately.

---

## Defence 8: Mandatory Override Accountability

### Preventing Silent Corruption

Every government override requires:
1. A written reason (≥ 10 characters)
2. The admin's user ID stored in `overridden_by_user_id`
3. An entry written to the server-side audit log
4. Immediate visibility on the public transparency ledger

```python
# Validation in schemas.py
@field_validator('reason')
@classmethod
def reason_not_empty(cls, v: str) -> str:
    if not v.strip():
        raise ValueError('Override reason cannot be empty')
    if len(v.strip()) < 10:
        raise ValueError('Override reason must be at least 10 characters')
    return v.strip()
```

There is **no way** for an admin to override a booking without leaving a public record. The system architecture makes silent corruption structurally impossible.

---

## Defence 9: CORS Policy

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],   # NOT "*"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

`allow_origins=["*"]` with `allow_credentials=True` is rejected by browsers (CORS specification). The fix specifies the exact frontend origin. Only requests from `http://localhost:5173` (dev) or the configured production domain can include credentials.

This prevents malicious third-party websites from making authenticated API calls on behalf of a logged-in user (CSRF-style attack via CORS).

---

## Defence 10: Input Validation (Pydantic)

All request bodies are validated by Pydantic before they reach business logic:

```python
class BookingCreate(BaseModel):
    venue_id: int          # must be integer — no SQL injection via venue_id
    start_time: datetime   # must parse as valid datetime
    end_time: datetime

    @model_validator(mode='after')
    def end_after_start(self):
        if self.end_time <= self.start_time:
            raise ValueError('end_time must be after start_time')
        if (self.end_time - self.start_time).total_seconds() / 3600 > 12:
            raise ValueError('Cannot exceed 12 hours')
        return self
```

SQLModel uses parameterised queries via SQLAlchemy — no raw SQL string interpolation. SQL injection is structurally prevented.

---

## Security Summary Card

```
┌────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                         │
│                                                            │
│  Network     → CORS allowlist (specific origin only)       │
│  Transport   → HTTPS in production (TLS)                   │
│  Auth        → JWT HS256, 24h expiry                       │
│  Passwords   → bcrypt 12 rounds + random salt              │
│  Rate Limit  → 10 login attempts/minute/IP                 │
│  Access      → Role check on every admin endpoint          │
│  Suspension  → Checked on EVERY authenticated request      │
│  Data        → Row-level lock on booking writes            │
│  Quotas      → Server-side monthly limit enforcement       │
│  Audit       → Append-only log + public ledger             │
│  Input       → Pydantic validation + parameterised SQL     │
└────────────────────────────────────────────────────────────┘
```
