# System Architecture — Eluru Connect

> A complete picture of how every part of the system fits together: layers, data flows, design patterns, and the reasoning behind every major structural decision.

---

## Architecture Style: Layered REST + WebSocket

Eluru Connect uses a **three-tier layered architecture**:

```
┌───────────────────────────────────────────────────────────────┐
│  PRESENTATION TIER  (React 18 + TypeScript, runs in browser)  │
├───────────────────────────────────────────────────────────────┤
│  APPLICATION TIER   (FastAPI, runs on server)                 │
├───────────────────────────────────────────────────────────────┤
│  DATA TIER          (PostgreSQL on Neon Cloud)                │
└───────────────────────────────────────────────────────────────┘
```

The tiers are **strictly separated**: the frontend never talks directly to the database. All database access goes through the FastAPI application layer. This means:
- The database credentials are never exposed to the browser
- Business logic (quota enforcement, state machine transitions) runs in one place
- The frontend can be replaced (mobile app, desktop app) without touching the backend

---

## Full System Diagram

```
                          INTERNET
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼─────────┐       ┌───────────▼─────────┐
    │   User's Browser   │       │   Admin's Browser   │
    │                   │       │                     │
    │  React 18 SPA     │       │  React 18 SPA       │
    │  ┌─────────────┐  │       │  ┌───────────────┐  │
    │  │ LoginPage   │  │       │  │  AdminPanel   │  │
    │  │ Dashboard   │  │       │  │  VenuesPage   │  │
    │  │ VenuesPage  │  │       │  └───────────────┘  │
    │  │ GuidePage   │  │       └────────┬────────────┘
    │  └─────────────┘  │                │
    │                   │         HTTPS + WSS
    │  Axios (REST)  ───┼─────────────► │
    │  WebSocket     ───┼─────────────► │
    └───────────────────┘               │
                                        │
                         ┌──────────────▼──────────────────────────┐
                         │          FastAPI Server                  │
                         │                                          │
                         │  ┌──────────────────────────────────┐   │
                         │  │         MIDDLEWARE CHAIN          │   │
                         │  │  CORS → Rate Limit → Logging      │   │
                         │  └──────────────┬───────────────────┘   │
                         │                 │                        │
                         │  ┌──────────────▼───────────────────┐   │
                         │  │           ROUTERS                 │   │
                         │  │                                   │   │
                         │  │  /auth   /venues   /bookings      │   │
                         │  │  /waitlist   /admin   /public     │   │
                         │  └──────────────┬───────────────────┘   │
                         │                 │                        │
                         │  ┌──────────────▼───────────────────┐   │
                         │  │     DEPENDENCY INJECTION          │   │
                         │  │  get_session()  get_current_user()│   │
                         │  │  require_admin()                  │   │
                         │  └──────────────┬───────────────────┘   │
                         │                 │                        │
                         │  ┌──────────────▼───────────────────┐   │
                         │  │       BUSINESS LOGIC              │   │
                         │  │  fair_play.py  ws_manager.py      │   │
                         │  └──────────────┬───────────────────┘   │
                         │                 │                        │
                         │  ┌──────────────▼───────────────────┐   │
                         │  │      SQLModel / SQLAlchemy        │   │
                         │  └──────────────┬───────────────────┘   │
                         └─────────────────┼────────────────────────┘
                                           │
                                    SSL/TLS │
                                           │
                         ┌─────────────────▼────────────────────────┐
                         │         PostgreSQL on Neon Cloud          │
                         │                                           │
                         │   user   venue   booking   waitlist       │
                         │                                           │
                         │   Connection pooling (Neon built-in)      │
                         └───────────────────────────────────────────┘
```

---

## Request Lifecycle: A Booking

Trace one complete request from click to database and back:

```
1. USER clicks "Confirm Booking" in BookingModal.tsx
   │
2. AXIOS sends:
   POST http://localhost:8000/bookings/
   Authorization: Bearer eyJ...
   Body: { venue_id: 1, start_time: "2024-05-10T09:00", end_time: "2024-05-10T12:00" }
   │
3. FASTAPI middleware stack:
   a. CORS middleware: checks Origin header → allowed ✓
   b. Rate limiter: checks IP request count → under limit ✓
   c. Request arrives at router
   │
4. FASTAPI dependency injection:
   a. get_session() → opens SQLAlchemy session
   b. get_current_user() → decodes JWT → loads User from DB
   c. Checks user.is_suspended → false ✓
   │
5. Pydantic validates BookingCreate:
   a. end_time > start_time ✓
   b. duration <= 12 hours ✓
   │
6. enforce_quotas():
   a. COUNT confirmed bookings this month for this user → 1
   b. Limit = 4 (citizen) → 1 < 4 ✓
   │
7. SELECT FOR UPDATE:
   a. Lock all confirmed bookings at venue 1 in the time window
   b. No overlapping bookings found ✓
   │
8. Create Booking object:
   booking = Booking(
     user_id=2, venue_id=1,
     start_time=..., end_time=...,
     status=CONFIRMED, booking_type=STANDARD
   )
   session.add(booking)
   │
9. session.commit() → row inserted, lock released
   │
10. manager.broadcast({"type": "booking_created", ...})
    → All WebSocket clients receive the event
   │
11. Return BookingRead (201 Created)
   │
12. AXIOS receives response
   │
13. REACT: toast.success("Booking confirmed!")
    fetchData() → dashboard refreshes
```

---

## Design Patterns Used

### 1. Dependency Injection

FastAPI's `Depends()` system makes the same database session and authenticated user available to every endpoint without repetition:

```python
@router.post("/")
async def create_booking(
    booking_in: BookingCreate,
    session: Session = Depends(get_session),       # injected
    user: User = Depends(get_current_user),        # injected
):
```

This is the same pattern as Spring's `@Autowired` or .NET's `IServiceCollection`.

### 2. Observer Pattern (WebSocket)

The `ConnectionManager` implements a lightweight Observer pattern:
- **Subject**: `manager` singleton
- **Observers**: every connected WebSocket (each browser tab)
- **Notification**: `manager.broadcast(event)` calls `send_json()` on all observers

New event types can be added without changing the observer registration mechanism.

### 3. State Machine (Booking Status)

Booking transitions follow a finite state machine with terminal states:

```
        ┌─ cancel() ─────► CANCELLED (terminal)
        │
CONFIRMED ── session end ──► COMPLETED (terminal)
        │
        ├─ no check-in ──► NO_SHOW (terminal)
        │
        └─ admin override ► OVERRIDDEN (terminal)
```

Terminal states cannot be transitioned. This prevents data corruption (e.g. completing an already-cancelled booking).

### 4. Repository-ish Routers

Each router is a thin layer over direct SQLModel queries. There's no explicit Repository class, but each router owns one resource and goes through the same session dependency. This is FastAPI's idiomatic style.

### 5. Interceptor Chain (Axios)

The frontend Axios instance has two interceptors:
- **Request interceptor**: attach `Authorization: Bearer <token>` to every outgoing request
- **Response interceptor**: if response is 401 → clear localStorage → redirect to login

This means auth handling is centralised — no `if (response.status === 401)` in every page component.

---

## Component Architecture (Frontend)

```
App.tsx
├── No token → <LoginPage />
│              ├── Three.js HeroScene (left panel)
│              └── Auth form (right panel)
│
└── Has token → <AppLayout />
               ├── Sidebar navigation
               │   ├── Browse Venues (all users)
               │   ├── Dashboard (all users)
               │   ├── Guide (all users)
               │   └── Admin Panel (govt_super_admin only)
               │
               └── <Routes>
                   ├── /venues  → <VenuesPage />
                   │             ├── VenueCard × N
                   │             └── <BookingModal /> (when open)
                   │
                   ├── /        → <Dashboard />
                   │             ├── SpotlightCard × 3 (stats)
                   │             ├── Booking cards (upcoming)
                   │             ├── Recent history list
                   │             └── Waitlist sidebar
                   │
                   ├── /guide   → <GuidePage />
                   │
                   └── /admin   → <AdminPanel />
                                 ├── User table
                                 └── Override form
```

---

## Data Flow: State Management

Eluru Connect uses **local React state** (no Redux, no Zustand). Each page component owns its data:

```typescript
// Dashboard.tsx
const [bookings, setBookings] = useState<Booking[]>([]);
const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
const [venueMap, setVenueMap] = useState<Record<number, string>>({});
const [loading, setLoading] = useState(true);

const fetchData = async () => {
    const [bRes, wRes, vRes] = await Promise.all([
        api.get<Booking[]>('/bookings/my'),
        api.get<WaitlistEntry[]>('/waitlist/my'),
        api.get<Venue[]>('/venues/'),
    ]);
    setBookings(bRes.data);
    setWaitlist(wRes.data);
    // build venueMap from venues
};
```

`Promise.all` fires all three requests simultaneously instead of sequentially — 3× faster.

When a WebSocket event arrives (e.g. waitlist promotion), `fetchData()` is called to refresh the view. This is simple but creates small UX moments where data briefly shows stale values. For the scale of this project, it's the right trade-off over the complexity of optimistic updates.

---

## Why No Redux / Global State?

For an application of this scale (4 pages, ~5 data types), global state management adds more complexity than it solves:
- No cross-page state sharing (each page fetches its own data)
- No derived state that needs memoisation across components
- WebSocket events trigger local refetches, not global store updates

If the app grew to 15+ pages with complex inter-page state, Redux Toolkit or Zustand would be worth adding.

---

## Why No SSR (Next.js)?

Server-Side Rendering would help with:
- SEO (search engine indexing)
- Initial page load performance

Neither applies here:
- This is a government booking portal, not a public website — SEO doesn't matter
- Users authenticate before seeing any content — no public pages to optimise
- Vite's client-side SPA gives sub-500ms navigation after initial load

Next.js would add deployment complexity (Node.js server needed) for zero benefit.

---

## Scalability Paths

The current architecture scales to roughly:

| Load | Handles It? |
|------|------------|
| 100 concurrent users | Yes, comfortably |
| 1,000 concurrent users | Yes (Neon connection pooling) |
| 10,000 concurrent users | Maybe — WebSocket list becomes bottleneck |
| 100,000 concurrent users | Needs: Redis Pub/Sub, multiple backend instances, CDN for frontend |

For Eluru's population (~220,000) with realistic digital penetration, the current architecture handles the realistic peak load with headroom to spare.

The single architectural change that enables horizontal scaling is replacing the in-memory `active_connections` list with Redis Pub/Sub — one configuration change, no restructuring.
