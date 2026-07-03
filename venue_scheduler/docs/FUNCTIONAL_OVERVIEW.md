# Functional Overview — What Eluru Connect Does

> This document explains every feature from a **user's perspective** — what you can do, why it exists, and what happens when you use it. No code. No jargon. Just behaviour.

---

## The Big Picture

Eluru Connect is a booking system for **government-owned public spaces** in Eluru, Andhra Pradesh. Think of it like booking a movie ticket — except you're booking a stadium, town hall, or community centre that belongs to the public.

Before this system existed, you had to call a municipal clerk, visit the office, or "know someone." Now you open a browser, pick a venue and time, and you're done in under two minutes.

---

## Who Uses It

### 1. Citizens (Regular Public)
The default role. Any person with a phone number can register.

**What they can do:**
- Browse all venues with photos, capacity, and deposit requirements
- Book any available time slot (up to 12 hours per booking)
- Cancel their booking (releases slot back to waitlist)
- Join a waitlist when a slot is taken
- Check in when they arrive at the venue
- View their booking history and fair-play score

**Limits:**
- Maximum 4 active confirmed bookings per month
- Maximum 1 active booking per venue at a time
- Cannot book prime-time slots 3+ times in the same month

---

### 2. VIP Members
Organisations, NGOs, registered groups — verified by an admin.

**Extra abilities over Citizens:**
- 8 active bookings per month (double the citizen quota)
- Gold star badge on their profile and bookings
- Visually distinct booking cards in the public view

---

### 3. Venue Managers
Municipal staff who look after specific venues.

**What they can do:**
- All citizen abilities
- View all bookings across the system (read-only)
- Cannot override or delete — only admins can do that

---

### 4. Govt Super Admins
The most powerful role — Collectors, MLAs, Municipal Commissioners.

**What they can do:**
- All citizen and manager abilities
- **Override** (cancel) any confirmed booking with a mandatory written reason
- Suspend or reinstate any user account
- Grant or revoke VIP status for any user
- Clear fair-play strikes for users
- View the full server-side audit log
- See complete platform statistics

**What they CANNOT hide:**
- Every override they make is permanently public
- The reason they provide is shown to all citizens
- There is no "silent" action — all admin actions are logged with their user ID

---

## Feature-by-Feature Walkthrough

---

### Feature 1: Venue Browser

The main page after login. Shows every public venue with:
- A full-width photo
- Venue name and location
- Capacity (e.g. "5,000 seats")
- Deposit requirement (e.g. "₹500 refundable deposit")
- A **Book Now** button

**What happens when you click Book Now:**
A modal dialog slides open. You pick a start date/time and end date/time. The system shows you a live duration preview (e.g. "Duration: 3 hours") and warns you if you exceed 12 hours.

---

### Feature 2: Booking

When you confirm a booking:
1. The system checks if the slot is already taken
2. If free — your booking is instantly confirmed
3. If taken — you see a conflict screen with an option to join the waitlist
4. A success notification appears at the top of your screen
5. Your dashboard immediately shows the new booking

**Real-time effect:** Every connected browser receives a live update that the venue's availability changed.

**Rules the system enforces automatically:**
- Start time must be at least 30 minutes from now
- End time must be after start time
- Maximum 12 hours per booking
- No overlapping bookings at the same venue
- Monthly quota enforced (4 for citizens, 8 for VIPs)

---

### Feature 3: Check-In

When you arrive at the venue, tap **Check-In** on your dashboard booking card.

**Why this matters:**
The system needs proof that you actually showed up. If you don't check in within 30 minutes of your booking start time, the system marks it as a **No-Show** and adds a **fair-play strike** to your account.

3 strikes → account suspended automatically.

---

### Feature 4: Cancellation

Tap **Cancel** on any confirmed booking.

**What happens immediately:**
1. Your booking status changes to `cancelled`
2. The time slot becomes available again
3. If anyone is on the waitlist for that exact slot, they are **automatically promoted** — their waitlist entry becomes a confirmed booking
4. The newly promoted user receives a real-time notification: "Great news! Your waitlisted slot at [Venue] is now confirmed!"
5. No human action required

---

### Feature 5: Waitlist

When a slot is taken, you can join the queue.

**How the queue works:**
- Each person in the queue has a numbered position (#1, #2, #3...)
- When the current booking is cancelled, #1 automatically gets the slot
- Everyone moves up one position
- You can leave the waitlist at any time from your dashboard

**You will be notified instantly** (WebSocket push) the moment you're promoted — no need to keep refreshing.

---

### Feature 6: Fair-Play Score

Every account has a score from 0% to 100%.

| Score | What It Means |
|-------|--------------|
| 100% | Clean record — no issues |
| 66% | 1 strike (1 no-show) |
| 33% | 2 strikes — booking limits may be tightened |
| 0% | 3 strikes — account suspended |

**What causes a strike:**
- Not checking in within 30 minutes of booking start time
- Admin manually adds a strike for documented abuse

**What resets strikes:**
- A Govt Super Admin can manually clear strikes as a one-time clemency

---

### Feature 7: Government Override

An admin needs ASR Stadium for an election commission event. The venue is already booked by a citizen.

**What the admin does:**
1. Opens the admin panel
2. Finds the conflicting booking by ID
3. Clicks Override
4. Writes a reason: *"Reserved for District Collector's official programme — Order No. DC/ELR/2024/007"*
5. Confirms

**What happens:**
- The booking status changes to `overridden`
- The citizen's booking is cancelled
- The reason is logged to the audit file on the server
- The reason is immediately visible on the **Public Transparency Ledger**
- The citizen and any watchdog organisation can see exactly what happened and why

---

### Feature 8: Public Transparency Audit

**No login required.** Any citizen, journalist, or NGO can open this page.

Shows:
- Total bookings breakdown by status (bar chart)
- Every recent booking with its status
- All government overrides with their reasons

This is the anti-corruption mechanism. If an official overrides a booking and writes a false reason, it is recorded and visible. Citizens can screenshot it and file a complaint with the Municipal Commissioner.

---

### Feature 9: Personal Dashboard

Your home screen after login. Shows:
- **Active bookings** — upcoming confirmed slots
- **Recent history** — past bookings (completed, cancelled, no-show)
- **Waitlist queue** — what you're waiting for and your position
- **Fair-play score** — strike indicator bar
- **Municipal notices** — announcements from the administration

---

### Feature 10: Admin Panel

For Govt Super Admins only. Shows:
- Full user list with their roles, strike counts, suspension status
- Buttons to: Suspend / Reinstate / Grant VIP / Revoke VIP / Clear Strikes
- Override any booking by ID with a mandatory reason field

---

## What the System Does NOT Do (Intentionally)

| Not Included | Why |
|-------------|-----|
| Payment gateway | Out of scope — deposits are handled offline at the venue |
| Photo upload at check-in | UI button exists, backend hookup is future work |
| SMS/email notifications | WebSocket covers real-time; SMS requires Twilio billing |
| Map view of venues | Coordinates stored in DB — Google Maps integration is future work |
| Mobile app | Responsive web works on mobile browsers; native app is future work |

---

## User Journey: First Time to First Booking

```
1. Open app in browser
2. See the 3D animated login screen
3. Register with your name, phone, password
4. Land on Browse Venues
5. Find "Municipal Community Center" — it's free and no deposit
6. Click Book Now
7. Pick tomorrow 10:00 AM to 12:00 PM
8. See "Duration: 2 hours" preview
9. Click Confirm Booking
10. Green toast: "Booking confirmed at Municipal Community Center!"
11. Go to Dashboard — card appears instantly
12. Tomorrow at venue — tap Check-In
13. Green toast: "Check-in successful! Enjoy your session."
14. After the session — status auto-changes to Completed
```

Total time from registration to confirmed booking: **under 3 minutes.**
