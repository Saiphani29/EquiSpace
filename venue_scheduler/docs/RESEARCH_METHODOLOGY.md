# Research Methodology — How Eluru Connect Was Designed

> This document covers the research, problem analysis, design decisions, and trade-offs that shaped every major feature of the system. It reads like the "why" behind the "what."

---

## 1. Problem Discovery

### Starting Point: Observation

The starting point was a simple observation about how public venues work in Tier-2 Indian cities. When a local school wants to book ASR Stadium for an annual sports day, the process looks like this:

1. The principal calls someone they know at the municipality
2. That person checks a paper register or a personal WhatsApp group
3. If no conflicts, the booking is noted in handwriting
4. No confirmation is sent — it's assumed
5. If an official wants that slot later, the school booking quietly disappears

This is not a rare edge case. It is the standard process in most Tier-2 and Tier-3 cities across India. The problem has three root causes:

| Root Cause | Impact |
|-----------|--------|
| No digital record | No accountability, easy to deny bookings exist |
| No public visibility | Corruption is invisible — citizens can't challenge it |
| No automated queue | Empty venues when cancellations happen |

### Research Questions

Before writing any code, three research questions were defined:

1. **What does a fair booking system need?** — Equal access, quota limits, conflict detection
2. **How do you prevent corruption without police?** — Public ledger, mandatory reasons, audit trail
3. **What happens to no-shows?** — Fair-play scoring, automatic waitlist promotion

---

## 2. Literature & Reference Research

### Existing Systems Studied

| System | What We Learned |
|--------|----------------|
| IRCTC (Indian Railways) | Waitlist system, quota tiers, confirmed/waitlist/RAC states |
| BookMyShow | Seat conflict detection, optimistic UI, real-time seat locking |
| UK Government GOV.UK | Public accountability design, citizen-facing transparency |
| Chandigarh Smart City Portal | Municipal booking attempt, identified UX failures to avoid |
| Kerala e-Governance portals | Studied what works in Indian government digital services |

### Key Insight from IRCTC

IRCTC's waitlist system inspired the automatic promotion model. When a confirmed ticket is cancelled, IRCTC automatically upgrades the first waitlisted passenger. We applied the same logic to venue slots — except our promotion happens in real-time via WebSocket instead of batch processing overnight.

### Key Insight from BookMyShow

BookMyShow uses seat locking: when you click a seat, it's temporarily locked for 10 minutes while you complete payment. We could not implement this for venues (a 12-hour slot cannot be "locked" for 10 minutes). Instead, we use PostgreSQL row-level locking (`SELECT FOR UPDATE`) which locks only during the transaction — milliseconds, not minutes.

### Key Insight from UK Government Design Principles

The UK's GDS (Government Digital Service) principle: **"Do the hard work to make it simple."** Their booking portals use plain language and minimal steps. This directly influenced our UI design — no unnecessary fields, plain confirmations, one action per screen.

---

## 3. Technology Selection Research

### Backend Framework Decision

Candidates evaluated:

| Framework | Language | Pros | Cons | Decision |
|-----------|----------|------|------|----------|
| FastAPI | Python | Auto docs, async, Pydantic | Newer ecosystem | **CHOSEN** |
| Django REST | Python | Mature, batteries-included | Heavier, less async | Rejected |
| Express.js | Node.js | Fast, large ecosystem | No type safety by default | Rejected |
| Spring Boot | Java | Enterprise-grade | Too heavy for project scope | Rejected |

FastAPI was chosen because:
- Native async support is essential for WebSocket + REST on the same server
- Pydantic v2 validation eliminates 80% of manual input checking code
- Auto-generated `/docs` page enables instant testing without Postman setup
- Python makes the codebase accessible to any team member with ML/data background

### Database Decision

| Option | Type | Pros | Cons | Decision |
|--------|------|------|------|----------|
| PostgreSQL | Relational | ACID, row locking, JSONB | Requires hosting | **CHOSEN** |
| MySQL | Relational | Familiar, fast | Weaker locking model | Rejected |
| MongoDB | Document | Flexible schema | No strong transactions | Rejected |
| SQLite | Relational | Zero setup | No concurrent writes | Dev only |

PostgreSQL was chosen specifically because of `SELECT FOR UPDATE` — the only reliable way to prevent double-booking under concurrent load without application-level distributed locks.

Neon (serverless PostgreSQL) was chosen for hosting because:
- Free tier is sufficient for development and demo
- Standard PostgreSQL wire protocol — switch to any other host by changing `DATABASE_URL`
- Automatic connection pooling handles FastAPI's async session model

### Frontend Framework Decision

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| React 18 + TypeScript | Type safety, huge ecosystem, hooks | JSX complexity | **CHOSEN** |
| Vue 3 | Gentle learning curve | Smaller ecosystem | Rejected |
| Svelte | Minimal boilerplate | Less TypeScript integration | Rejected |
| Next.js | SSR + React | Overkill — no SEO requirement | Rejected |

React was chosen because TypeScript strict mode catches API shape mismatches at compile time — critical when the backend and frontend are developed together and the API evolves.

### 3D Graphics Decision

Three.js was chosen over CSS 3D transforms for the login page hero because:
- True WebGL rendering — GPU-accelerated
- Rich animation ecosystem via `@react-three/fiber` and `@react-three/drei`
- The Float, Stars, and OrbitControls utilities from Drei save hundreds of lines

The 3D scene is isolated to the login page to avoid rendering overhead on the dashboard (where the user spends most of their time).

---

## 4. Fair-Play System Design

### Research: How Do Other Systems Prevent Abuse?

| System | Anti-Abuse Mechanism |
|--------|---------------------|
| Uber | Rating system + account flags |
| Airbnb | Review system + cancellation penalties |
| Library reservations | No-show tracking, account suspension |
| Sports facility bookings (UK) | Strike system, 3-strike ban |

The 3-strike suspension model was drawn from public library systems in the UK and sports facility management systems. The math:

- 3 strikes = suspended (gives users two warnings before action)
- Each no-show = 1 strike (proportional, not immediate ban)
- Admin can clear strikes (allows for extraordinary circumstances)
- VIP users have higher quotas but same strike rules (equal accountability)

### Monthly Quota Research

The 4-booking/month citizen limit was derived by estimating:

- Eluru population: ~220,000
- Estimated digital users at launch: ~5,000 (2.3% digital penetration)
- Total venue-hours available per month: ~10 venues × 30 days × 8 hrs = 2,400 slot-hours
- At 4 bookings/user max: even if all 5,000 users book every month, demand is 20,000 bookings but supply is ~2,400 slots → natural queue via fair-play prevents hoarding

---

## 5. Data Model Research

### Booking State Machine

The booking status was designed as a finite state machine:

```
                    ┌──────────────┐
                    │  CONFIRMED   │
                    └──────┬───────┘
                           │
           ┌───────────────┼────────────────┐
           ▼               ▼                ▼
      ┌─────────┐    ┌──────────┐    ┌────────────┐
      │CANCELLED│    │COMPLETED │    │  NO_SHOW   │
      └─────────┘    └──────────┘    └────────────┘
           │
           ▼
      ┌──────────────┐
      │  OVERRIDDEN  │  (admin only — never from COMPLETED/NO_SHOW)
      └──────────────┘
```

States are **terminal** once reached except for CONFIRMED. This prevents data corruption — you cannot un-cancel a booking; you must create a new one.

### Waitlist Design

The waitlist table stores the **exact requested time slot** (not just "I want this venue someday"). This means:

- Two people can waitlist different time slots at the same venue simultaneously
- When a booking is cancelled, only the waitlist entries matching that exact slot get promoted
- Queue position is per-slot, not per-venue — fairer than a global venue queue

This design was inspired by how concert ticket waitlists work — you're waiting for a specific show at a specific time, not "any concert at some point."

---

## 6. Security Research

### Threat Modelling (STRIDE)

| Threat | Type | Mitigation Designed |
|--------|------|---------------------|
| User A books same slot as User B | Race condition | `SELECT FOR UPDATE` |
| Admin silently cancels bookings | Spoofing/Tampering | Mandatory reason + public ledger |
| User books 100 slots to hoard | Denial of Service | Monthly quota + rate limiting |
| Attacker bruteforces passwords | Brute Force | Rate limit 10/min + bcrypt |
| Token stolen from localStorage | Elevation | 24h expiry + suspend check on every call |
| API called without auth | Unauthorised access | FastAPI Depends() on every endpoint |

### Why Not OAuth / Google Login?

OAuth was considered but rejected because:
1. Requires the user to have a Google/GitHub account (excludes elderly citizens)
2. Adds external service dependency (if Google is down, login is down)
3. Phone number is the natural identifier for Indian government services (Aadhaar-style)

Phone number + password was chosen because every citizen has a phone number and is familiar with this pattern from banking apps.

---

## 7. UI/UX Research

### Design Principles Applied

**Principle 1: Progressive Disclosure**
Show only what's needed for the current task. The booking modal starts with just two fields (start, end time). The conflict screen only appears if needed.

**Principle 2: Inline Feedback**
Show duration preview as you type. Show error messages inline, not in alert boxes. Toast notifications for success/failure — non-blocking, don't interrupt the workflow.

**Principle 3: Zero Ambiguity for Government Actions**
Every government override is displayed with explicit language: "OVERRIDE: [reason]" — not a softened phrase. Citizens need to understand exactly what happened.

**Principle 4: Mobile-First Sizing**
Buttons are minimum 44px tall (Apple HIG recommendation for touch targets). Forms use large text inputs. This matters because a significant portion of Eluru's internet users access the web on mobile data.

### Colour System Research

The primary blue `#0078D4` was chosen because:
- It is Microsoft's "Fluent Design" blue — widely recognised as a trustworthy, institutional colour
- High contrast against white (passes WCAG AA at 14px+)
- Conveys civic/government authority without being aggressive
- Amber `#F59E0B` is used for VIP and warnings — warm, notable, but not alarming
- Rose/Red for cancellations and strikes — universally understood as "negative"

---

## 8. What We Would Change With More Time

| Limitation | Ideal Solution |
|-----------|---------------|
| No SMS notifications | Integrate Twilio / AWS SNS for SMS alerts when waitlist is promoted |
| No payment gateway | Razorpay integration for online deposit collection |
| No map view | Google Maps embed using stored latitude/longitude coordinates |
| Manual check-in | QR code at venue scanned by warden's phone |
| WebSocket not authenticated | Add JWT verification on WS handshake |
| No email verification | OTP verification on phone number at registration |
| Single-server WebSocket | Redis Pub/Sub for multi-instance horizontal scaling |

---

## 9. Academic Grounding

This project applies concepts from:

| Concept | Where Applied |
|---------|--------------|
| **Concurrency Control** (Database Systems) | `SELECT FOR UPDATE` row-level locking |
| **Finite State Machines** (Theory of Computation) | Booking status transitions |
| **Producer-Consumer Pattern** (OS) | Waitlist queue with automatic promotion |
| **Observer Pattern** (Design Patterns) | WebSocket broadcast to all connected clients |
| **Role-Based Access Control** (Security) | 5-tier role system with endpoint guards |
| **Event-Driven Architecture** | Booking events trigger waitlist promotion + WebSocket broadcast |
| **RESTful API Design** | Resource-based URLs, proper HTTP status codes |
