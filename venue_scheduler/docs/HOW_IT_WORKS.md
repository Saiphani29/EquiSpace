# How It Works — Eluru Connect Explained Simply

> This guide explains the interesting and clever parts of the system in plain language. How does it actually prevent two people booking the same slot? How does the waitlist know when to promote you? Read on.

---

## 1. How Booking Conflict Is Prevented

### The Problem

Imagine 200 people all pressing "Confirm Booking" at the exact same second for ASR Stadium on Sunday morning. Without any protection, all 200 could get a "Booking Confirmed!" message — but the stadium can only have one booking per slot.

### The Solution: Database Lock

When your booking request arrives, the server doesn't just check "is this slot free?" and immediately book. That check-then-book pattern has a race condition — another request can sneak in between the check and the insert.

Instead, the server does this:

```
1. "Lock" all existing bookings for this venue and time window
   (Other requests that want the same slot are now FROZEN — they wait)

2. Check the locked records — is there a conflict?

3a. If YES → return "Slot Taken" error. Unlock.
3b. If NO → insert the new booking. Unlock.

4. Frozen requests now unfreeze and do their own check
   They find your booking already there → they all get "Slot Taken"
```

This is called a **database row-level lock** (`SELECT FOR UPDATE` in SQL). The lock exists for only a few milliseconds — long enough to safely check and insert, short enough that no user ever notices the delay.

Think of it like a single bathroom key at a petrol station. Only one person can hold the key at a time. You might wait 5 seconds for the previous person to finish, but you never both end up in the bathroom at once.

---

## 2. How the Waitlist Automatically Promotes You

### The Mechanism

Every waitlist entry stores the **exact time slot** you want (not just "I want this venue someday"):

```
Lakshmi's waitlist entry:
  Venue: Helapuri Town Hall
  Slot: 10 AM – 3 PM on 14 May
  Position: #1
```

When Venkatesh cancels his booking for that exact slot:

```
Server: "Who is waiting for Town Hall, 10AM-3PM, 14 May?"
Server: "Lakshmi is at position #1"

Server creates a new CONFIRMED booking for Lakshmi
Server deletes Lakshmi's waitlist entry
Server sends Lakshmi a notification via WebSocket
```

This happens entirely automatically — no human involvement, no delay. Lakshmi's phone gets the notification within a second of Venkatesh hitting cancel.

### What If Two People Cancel at the Same Time?

Same lock mechanism as booking creation. The server locks the waitlist entries while promoting, so even if two bookings are cancelled simultaneously, the #1 waitlist person only gets one new booking — not two.

---

## 3. How Real-Time Notifications Work

### The Old Way (Polling)

Most basic systems work like this:
- Every 30 seconds, your browser asks the server: "Anything new?"
- Server says yes or no
- 30 second delay between events and you knowing about them
- Wasteful — 99% of those requests get "nothing new"

### The New Way (WebSocket)

When you open the app, your browser opens a **persistent connection** to the server. It stays open as long as your tab is open. The server can push messages to you at any moment:

```
[Browser]                          [Server]
   │                                  │
   │──── "Hello, I'm connected" ─────►│
   │                                  │
   │    ...time passes...             │
   │                                  │
   │                   Venkatesh cancels booking
   │                                  │
   │◄─── "Hey Lakshmi, your slot     │
   │      at Town Hall is confirmed!" │
   │                                  │
   │  [toast notification appears]    │
```

The message travels in under 50 milliseconds. You know before you can even think to refresh the page.

---

## 4. How the Fair-Play System Knows You Didn't Show Up

### The Check-In Window

When your booking starts (say, 10 AM), a 30-minute window opens. During this window, you tap **Check-In** on your dashboard.

If you tap it:
- Booking is marked as checked-in
- No strike

If 10:30 AM passes without a check-in:
- Server marks booking as `no_show`
- `fair_play_strikes` increases by 1
- If strikes reach 3 → account automatically suspended

### How Does the Server Know 30 Minutes Passed?

The check-in endpoint itself does this check. When you hit Check-In:

```python
now = current time
window_end = booking.start_time + 30 minutes

if now > window_end:
    # You're late — this counts as a no-show
    booking.status = NO_SHOW
    user.fair_play_strikes += 1
else:
    # On time — check-in recorded
    booking.status = CONFIRMED (with check-in timestamp)
```

A scheduled background job can also sweep for past bookings that never had a check-in. Either way, the strike is recorded.

---

## 5. How Government Override Accountability Works

### The Technical Chain

When an admin overrides a booking, here's exactly what the system does — every step:

```
1. Admin submits override with reason text

2. Pydantic validates: reason must be ≥ 10 characters
   (Forces a real explanation, not just "." or "x")

3. Booking status changes to OVERRIDDEN
   The reason text is stored in the booking record
   The admin's user ID is stored in overridden_by_user_id

4. Python writes to audit.log:
   "2024-05-08 14:32:11 | OVERRIDE | admin_id=1 booking_id=42 | reason=..."
   (This file is append-only — cannot be edited without trace)

5. WebSocket broadcasts to all connected users:
   Every browser learns about the override in real-time

6. The public audit page reads from the database
   Every citizen can see: booking ID, venue, time, override reason
   Visible immediately, no login required
```

There is literally **no path** for an admin to override a booking silently. The architecture makes it structurally impossible — the reason storage, audit log write, and public broadcast all happen in the same function call.

---

## 6. How Quota Limits Are Enforced

### Why Frontend Checks Aren't Enough

The frontend shows your booking count and disables the button when you hit the limit. But a clever user could:
- Use browser developer tools to re-enable the button
- Send requests directly with `curl` or Postman
- Modify the JavaScript

So the real enforcement happens **on the server**, not in the browser:

```python
# Count confirmed bookings this calendar month
month_count = database.count(
    bookings where user_id = me
    AND created this month
    AND status = CONFIRMED
)

# Reject if over limit
if month_count >= 4:
    return error: "Monthly quota reached"
```

The frontend check is just a convenience — it prevents you from accidentally trying to submit. The server check is the actual gate.

---

## 7. How the 3D Landing Page Works

### Three.js + React

The login screen's animated orb is built with Three.js — a JavaScript library that draws 3D graphics using WebGL (your GPU):

```
Your GPU renders:
  1. An icosahedron (20-sided sphere) — the central orb
  2. A wireframe version of the same shape, slightly bigger
  3. Two torus rings (like Saturn's rings) at different angles
  4. 5,000 star particles in the background
  5. Two light sources (ambient blue + directional white)
```

Every frame (60 times per second), the GPU:
- Rotates the orb slightly
- Spins the torus rings
- Gently bobs the whole assembly up and down (the Float animation)
- Redraws everything

This gives the impression of a living, breathing 3D object.

### Why Only on the Login Page?

3D rendering uses the GPU and consumes some battery. For the booking dashboard — where you spend most of your time — a clean, fast 2D interface is better. The 3D scene is a first-impression feature, not a persistent one.

---

## 8. How JWT Tokens Keep You Logged In

### What a Token Is

When you log in, the server creates a small piece of text that looks like:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ODQ4MDEyMzQ1IiwiZXhwIjoxNzE3MDAwMDAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

This is three base64-encoded pieces joined by dots:
1. **Header**: algorithm used (HS256)
2. **Payload**: your phone number + expiry time
3. **Signature**: a cryptographic proof that the server created this

Your browser stores this token. With every API request, it sends:
```
Authorization: Bearer eyJhbGci...
```

The server verifies the signature (proves you didn't forge it), reads your phone number from the payload, loads your account, and lets you through.

### Why Can't You Fake a Token?

The signature is created with a secret key only the server knows. Without the secret key, you cannot create a valid signature. Any modification to the payload invalidates the existing signature.

### What Happens When It Expires?

After 24 hours, the `exp` field in the payload is in the past. The server rejects it with a 401 error. The frontend's Axios interceptor catches the 401, clears your localStorage, and sends you back to the login screen.

---

## 9. How Venue Name Lookup Works on the Dashboard

### The Problem

Bookings stored in the database look like this:
```json
{ "venue_id": 3, "start_time": "...", "status": "confirmed" }
```

The dashboard needs to show the venue **name** ("Municipal Community Center"), not the ID (3).

### The Solution: Build a Map

The dashboard fetches venues and bookings simultaneously:

```typescript
const [bookingsResponse, venuesResponse] = await Promise.all([
    api.get('/bookings/my'),
    api.get('/venues/')
]);

// Build a lookup map: { 1: "ASR Stadium", 2: "Town Hall", 3: "Community Center", ... }
const venueMap = {};
venuesResponse.data.forEach(venue => {
    venueMap[venue.id] = venue.name;
});

// Now display: venueMap[booking.venue_id] → "Municipal Community Center"
```

`Promise.all` fires both requests at the same time instead of waiting for one to finish before starting the other — roughly 2× faster.

---

## 10. How Booking Time Zones Are Handled

### The Hidden Complexity

India is IST (UTC+5:30). The database stores all times in UTC. The browser knows the user's local timezone.

When you pick "10:00 AM tomorrow" in the booking form, the browser's `datetime-local` input gives you a local-time string: `"2024-05-10T10:00"`. This is sent to the server, which parses it as UTC.

For a user in India, this creates a 5h30m mismatch — your "10 AM IST" would be stored as "10 AM UTC" (which is actually "3:30 PM IST").

### The Fix: Keep It Local

The booking form sends the local time string directly. The server stores it. The display reads it back and shows it in local time. No conversion happens. Both sides agree on the raw datetime string `"2024-05-10T10:00"` and treat it as "whatever time this is in your timezone."

This works as long as all users and all servers are in the same timezone (IST for Eluru Connect). For a global system, you'd need explicit timezone handling.

---

## Summary: The Clever Parts

| Feature | The Interesting Bit |
|---------|-------------------|
| No double bookings | PostgreSQL row-level lock during the check-then-insert |
| Instant waitlist | WebSocket push within 50ms of cancellation |
| No silent corruption | Mandatory reasons + append-only audit log + public ledger |
| Fair quota | Server-side count — client-side check is just UX |
| JWT auth | Signature verification — unforgeable without secret key |
| 3D hero | WebGL via Three.js — GPU-rendered 60fps animation |
| Venue names on dashboard | `Promise.all` fetches + local ID→name map |
