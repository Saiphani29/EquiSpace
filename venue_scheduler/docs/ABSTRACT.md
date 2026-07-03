# Abstract — Eluru Connect: A Digital Public Venue Management System

---

## Project Title

**Eluru Connect** — A Role-Aware, Transparent, Real-Time Public Venue Booking and Governance Platform for Eluru Municipal Corporation, Andhra Pradesh

---

## One-Paragraph Abstract

Eluru Connect is a full-stack web application that digitises the booking and management of public venues owned by the Eluru Municipal Corporation. The system replaces a paper-based, opaque, and corruption-prone allocation process with a real-time, role-aware platform accessible to every citizen. Citizens register using their mobile number, browse available government-owned spaces (stadiums, town halls, community centres, exhibition grounds), and reserve time slots through an intuitive booking interface. A fair-play engine limits how many slots any single user can hold, tracks no-show behaviour, and automatically suspends accounts that repeatedly misuse the system. A multi-tier WebSocket notification pipeline instantly alerts waitlisted users when a cancellation opens a slot. Government officials operate through a separate admin layer that logs every override with a mandatory reason, publishing those reasons to a public transparency ledger so citizens can audit official actions. The platform is built on FastAPI (Python), PostgreSQL (Neon cloud), and React 18 (TypeScript), with Three.js 3D visualisations on the landing page and Framer Motion animations throughout the UI.

---

## Problem Statement

Public venues in Tier-2 Indian cities like Eluru are typically allocated through personal contacts, phone calls to municipal clerks, or physical visits to the collectorate. This process has three fundamental problems:

1. **Inaccessibility** — Citizens without connections to officials cannot reliably book prime venues.
2. **Opacity** — There is no public record of who booked what, when, or why. Officials can silently block slots for personal use.
3. **Inefficiency** — No-shows and last-minute cancellations leave venues empty while others wait, with no automatic reallocation mechanism.

---

## Proposed Solution

A three-layer digital platform:

| Layer | Purpose |
|-------|---------|
| **Citizen layer** | Self-service booking, real-time waitlist, fair-play score, personal dashboard |
| **Admin layer** | Government override with mandatory reasons, user management, audit trails |
| **Public layer** | Read-only transparency ledger visible to every citizen — no login required |

---

## Key Contributions

- **Conflict-safe booking** using PostgreSQL row-level locking (`SELECT FOR UPDATE`) to prevent double-booking under concurrent requests
- **Automatic waitlist promotion** — when a booking is cancelled, the first waitlisted user is instantly converted to a confirmed booking via WebSocket notification
- **Fair-play scoring system** — a points-based penalty model that degrades booking priority and suspends chronic abusers, creating equitable access
- **Role-based quota enforcement** — Citizens: 4 active bookings/month; VIPs: 8/month; Government admins: unlimited with override logging
- **Mandatory accountability** — every government override requires a reason of ≥ 10 characters, permanently stored and publicly visible
- **Zero-trust frontend** — JWT tokens stored in `localStorage`, auto-invalidated on 401, with role-checked route guards on every admin page

---

## Technology Stack Summary

| Component | Technology |
|-----------|-----------|
| Backend API | FastAPI 0.110 (Python 3.11) |
| Database | PostgreSQL 15 (Neon Serverless) |
| ORM | SQLModel + SQLAlchemy 2 |
| Authentication | JWT (python-jose) + bcrypt |
| Real-time | WebSocket (FastAPI native) |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS 3 |
| Animations | Framer Motion 11 |
| 3D Graphics | Three.js + @react-three/fiber |
| State Management | React hooks (no external store) |

---

## Outcomes

- Eliminates single-point-of-corruption in venue allocation
- Reduces venue idle time through automated waitlist promotion
- Provides citizens with evidence to challenge unfair official decisions
- Achieves sub-200ms API response times on the Neon free tier
- Requires zero additional hardware — runs on existing cloud infrastructure

---

## Target Users

| User Type | Who They Are |
|-----------|-------------|
| Citizens | Residents of Eluru booking a venue for events, sports, meetings |
| VIP Members | NGOs, schools, registered cultural organisations with elevated quotas |
| Venue Managers | Municipal staff who maintain venue listings |
| Govt Super Admins | Elected officials / collectors who can override bookings for public interest |
| General Public | Anyone who wants to audit bookings — no account needed |

---

*This project was developed as an academic mini-project demonstrating applied web engineering, database design, real-time systems, and civic technology principles.*
