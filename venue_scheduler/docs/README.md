# Eluru Connect — Documentation Index

> Complete documentation for the Eluru Connect public venue booking platform. Start here.

---

## Quick Links

| I want to... | Go to |
|-------------|-------|
| Understand what the project does | [ABSTRACT.md](ABSTRACT.md) |
| See every feature explained simply | [FUNCTIONAL_OVERVIEW.md](FUNCTIONAL_OVERVIEW.md) |
| Understand how it's built (tech) | [TECHNICAL_OVERVIEW.md](TECHNICAL_OVERVIEW.md) |
| Understand the system architecture | [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) |
| Read how it was researched and designed | [RESEARCH_METHODOLOGY.md](RESEARCH_METHODOLOGY.md) |
| Understand the interesting mechanics | [HOW_IT_WORKS.md](HOW_IT_WORKS.md) |
| See the database tables and relationships | [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) |
| Look up a specific API endpoint | [API_REFERENCE.md](API_REFERENCE.md) |
| Understand security decisions | [SECURITY_MODEL.md](SECURITY_MODEL.md) |
| Understand real-time WebSocket system | [REALTIME_SYSTEM.md](REALTIME_SYSTEM.md) |
| Understand fair-play and quota system | [FAIRPLAY_SYSTEM.md](FAIRPLAY_SYSTEM.md) |
| Run the project locally or deploy it | [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) |
| Add new features / contribute code | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) |

---

## Legacy User Guides (Original Docs)

| Guide | Content |
|-------|---------|
| [GETTING_STARTED.md](GETTING_STARTED.md) | First-time user registration and setup |
| [BOOKING_GUIDE.md](BOOKING_GUIDE.md) | How to book a venue slot |
| [WAITLIST_GUIDE.md](WAITLIST_GUIDE.md) | How the waitlist works |
| [FAIRPLAY_GUIDE.md](FAIRPLAY_GUIDE.md) | Fair-play rules (user-facing) |
| [ADMIN_VIP_GUIDE.md](ADMIN_VIP_GUIDE.md) | Admin and VIP features |
| [TRANSPARENCY_AUDIT.md](TRANSPARENCY_AUDIT.md) | Public audit ledger explained |

---

## Project at a Glance

**What it is:** A full-stack web app for booking government-owned public venues in Eluru, Andhra Pradesh.

**Stack:** FastAPI (Python) + PostgreSQL (Neon) + React 18 (TypeScript) + Three.js + Framer Motion

**Key features:**
- Real-time booking conflict detection (database row-level locking)
- Automatic waitlist promotion via WebSocket
- Fair-play strike system (3 no-shows = suspended)
- Government override with mandatory public reasons (anti-corruption)
- 5-tier role system (Citizen → VIP → Manager → Govt Admin)
- 3D animated landing page

**Default login credentials:**

| Role | Phone | Password |
|------|-------|----------|
| Govt Super Admin | `9999999999` | `admin123` |
| Citizen | `9848012345` | `user123` |
| VIP Member | `9000000001` | `vip123` |

---

## Document Map by Audience

### For a student / first-time reader
1. [ABSTRACT.md](ABSTRACT.md) — what is this project?
2. [HOW_IT_WORKS.md](HOW_IT_WORKS.md) — the interesting mechanics explained
3. [FUNCTIONAL_OVERVIEW.md](FUNCTIONAL_OVERVIEW.md) — every feature described

### For a technical reviewer / evaluator
1. [TECHNICAL_OVERVIEW.md](TECHNICAL_OVERVIEW.md)
2. [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)
3. [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
4. [SECURITY_MODEL.md](SECURITY_MODEL.md)

### For a developer joining the project
1. [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)
2. [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
3. [API_REFERENCE.md](API_REFERENCE.md)

### For an academic presentation
1. [ABSTRACT.md](ABSTRACT.md)
2. [RESEARCH_METHODOLOGY.md](RESEARCH_METHODOLOGY.md)
3. [FAIRPLAY_SYSTEM.md](FAIRPLAY_SYSTEM.md)
4. [REALTIME_SYSTEM.md](REALTIME_SYSTEM.md)
