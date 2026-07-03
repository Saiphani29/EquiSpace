# Fair-Play System — How Equitable Access Works

> A deep dive into the fair-play engine: what it is, why it exists, how it calculates scores, what triggers penalties, and how it shapes the booking experience.

---

## The Problem It Solves

Public resources are scarce. ASR Stadium has maybe 30 bookable 3-hour slots per month during prime time (evenings and weekends). If there are no limits:

- One wealthy business could book all 30 slots months in advance
- 200 other citizens get nothing
- The whole point of a "public" space is defeated

Even without malicious intent, absenteeism hurts others:
- Venkatesh books the community centre for Saturday afternoon
- He forgets / gets busy / doesn't show up
- 50 people on the waitlist were blocked for nothing
- The venue sits empty

The fair-play system solves both problems: **quota limits prevent hoarding, strike penalties deter no-shows.**

---

## Component 1: Monthly Quota

### The Limits

| Role | Active Confirmed Bookings Per Month |
|------|-------------------------------------|
| Citizen | 4 |
| VIP | 8 |
| Govt Super Admin | Unlimited (they have public interest duties) |
| Venue Manager | 4 (same as citizen for personal bookings) |

### How It's Counted

"Active confirmed bookings this month" means:
- Booking was created in the current calendar month
- Status is currently `confirmed` (not cancelled, completed, or no-show)

```python
month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)

month_count = session.exec(
    select(func.count(Booking.id)).where(
        and_(
            Booking.user_id == user.id,
            Booking.created_at >= month_start,
            Booking.status == BookingStatus.CONFIRMED
        )
    )
).one()

if month_count >= limit:
    raise HTTPException(429, f"Monthly quota of {limit} bookings reached. Wait for next month or cancel an existing booking.")
```

### Design Choice: Why Calendar Month?

Alternative: rolling 30-day window. This is more "fair" mathematically but confusing for users — "why can't I book? I booked 30 days ago but that's still within the window."

Calendar month is simpler: "you get 4 bookings per month, resets on the 1st." Users understand this intuitively.

---

## Component 2: Fair-Play Strikes

### What Earns a Strike

| Action | Strikes Added |
|--------|--------------|
| No check-in within 30 min of booking start | +1 |
| Admin manually adds a strike | +1 |

### What Reduces Strikes

| Action | Strikes Removed |
|--------|----------------|
| Admin clears strikes | All strikes reset to 0 |

Strikes do **not** automatically decay over time in the current version. This is intentional — no-show behaviour should have lasting consequences until an admin reviews and clears them as a deliberate act of clemency.

### Suspension Threshold

```python
if user.fair_play_strikes >= 3:
    user.is_suspended = True
    session.commit()
```

Three no-shows = automatic suspension. The account cannot be used until a `GOVT_SUPER_ADMIN` reinstates it. This creates strong disincentive to ignore bookings.

---

## Component 3: No-Show Detection

### How Check-In Works

When a user arrives at the venue, they tap **Check-In** on their dashboard. This calls:

```
POST /bookings/{id}/check-in
```

The backend records the check-in timestamp.

### How No-Shows Are Detected

A background process (or a scheduled task) runs periodically. It looks for bookings where:
- Status = `confirmed`
- `start_time` was more than 30 minutes ago
- No check-in recorded

These are marked as `no_show` and the user's `fair_play_strikes` is incremented:

```python
@router.post("/{booking_id}/check-in")
async def check_in(booking_id: int, user=Depends(get_current_user), session=Depends(get_session)):
    booking = session.get(Booking, booking_id)
    if not booking or booking.user_id != user.id:
        raise HTTPException(404)

    now = datetime.utcnow()
    window_end = booking.start_time + timedelta(minutes=30)

    if now > window_end:
        # Too late to check in — mark as no-show
        booking.status = BookingStatus.NO_SHOW
        user.fair_play_strikes += 1
        if user.fair_play_strikes >= 3:
            user.is_suspended = True
    else:
        booking.status = BookingStatus.CONFIRMED  # check-in noted

    session.commit()
```

---

## Component 4: The Fair-Play Score Display

### Score Calculation

```typescript
const fairPlayPct = Math.max(0, 100 - user.fair_play_strikes * 34);
```

| Strikes | Score |
|---------|-------|
| 0 | 100% |
| 1 | 66% |
| 2 | 32% |
| 3 | 0% (suspended) |

The visual display is a row of 3 progress bars — filled in rose-red for each strike, slate-grey for clean:

```typescript
{[0, 1, 2].map((i) => (
    <div
        key={i}
        className={`h-2 flex-1 rounded-full ${
            i < user.fair_play_strikes ? 'bg-rose-400' : 'bg-slate-100'
        }`}
    />
))}
```

The score percentage appears in the top status badge of the dashboard. When the user is suspended, the badge switches to red with text "Account Suspended."

---

## Component 5: VIP Status

### What VIP Means

VIP is a status granted by an admin to organisations and groups with legitimate high-usage needs:
- NGOs running regular community events
- Schools with sports programmes
- Cultural organisations with frequent rehearsals
- Government-adjacent organisations

VIP doubles the monthly quota (4 → 8) without any other special privileges.

### VIP Booking Appearance

VIP bookings are tagged with `booking_type = "vip"`. In the UI:
- A gold star icon appears instead of the location pin
- An amber "⭐ VIP" badge shows on the booking card
- The booking appears on the public audit with the VIP type visible

This transparency is intentional — citizens can see that VIP quotas are being used for legitimate bookings, not secret special treatment.

### Granting VIP

Only `GOVT_SUPER_ADMIN` can grant or revoke VIP status:

```python
@router.post("/users/{user_id}/grant-vip")
async def grant_vip(user_id: int, admin=Depends(require_admin), session=Depends(get_session)):
    user = session.get(User, user_id)
    user.role = UserRole.VIP
    session.commit()
    logger.info(f"VIP_GRANT | admin_id={admin.id} target_user={user_id}")
```

The action is logged in the audit trail with the admin's ID.

---

## Component 6: Prime-Time Quotas (Advanced)

The `venue.quota_rules` JSONB field supports per-venue prime-time limits. This is a future-facing feature:

```json
{
    "prime_time_limit": 2,
    "prime_time_hours": [17, 18, 19, 20, 21]
}
```

With this config, a citizen could book ASR Stadium a maximum of **2 times per month during 5 PM–10 PM** (prime time), even if their overall quota of 4 isn't exhausted.

The `enforce_quotas` function reads these rules:

```python
def enforce_quotas(session, user, venue_id, vip_limit=8):
    venue = session.get(Venue, venue_id)
    quota_rules = venue.quota_rules or {}

    # Standard monthly quota check
    ...

    # Prime-time check (if venue has this rule)
    if 'prime_time_limit' in quota_rules:
        prime_hours = quota_rules.get('prime_time_hours', [17, 18, 19, 20])
        is_prime_time = booking_start_hour in prime_hours

        if is_prime_time:
            prime_count = count_prime_time_bookings(session, user.id, venue_id)
            if prime_count >= quota_rules['prime_time_limit']:
                raise HTTPException(429,
                    f"You've reached the prime-time limit of {quota_rules['prime_time_limit']} "
                    f"bookings at {venue.name} this month"
                )
```

---

## Why These Specific Numbers?

### Why 4 bookings for citizens?

- 4 bookings × 3 hours average = 12 hours/month of venue time per citizen
- For a student wanting to use the sports ground twice a week, they have room
- For someone trying to monopolise venues, 4 is too few to cause real damage
- Leaves 80% of slots open for others even if everyone maxes out (which they won't)

### Why 3 strikes for suspension?

- 1 strike = first offence warning (visible on dashboard, creates accountability)
- 2 strikes = serious warning (user can see the bar filling up, acts as deterrent)
- 3 strikes = suspension (three chances is industry standard for fairness)
- An admin can always reinstate — the system isn't final, it's a gatekeeping mechanism

### Why 30 minutes for check-in window?

- Enough time for someone running 5–10 minutes late
- Short enough that if someone genuinely forgot, the slot can be released to others
- Standard used by most sports facility systems

---

## User Experience of Fair-Play

### What the User Sees

On the Dashboard stats row:
```
┌──────────────────────────────┐
│  Fair-Play Strikes           │
│                              │
│    1   of 3 max              │
│                              │
│  [████░░░░░░]  [░░░░░░░░░░]  [░░░░░░░░░░]  │
└──────────────────────────────┘
```

One bar filled in red = 1 strike. Two empty = still safe.

On the header badge:
```
 🛡 Fair-Play: 66%
```

When suspended:
```
 🛡 Account Suspended   (red background)
```

### What the User Is Told on Booking

When they open the booking modal:

> **Remember:** Check in within 30 min of your start time. Missing check-in adds a fair-play strike.

This reminder appears on every booking attempt — no one can claim they didn't know.

---

## Summary: The Fair-Play Flywheel

```
Citizens book fairly
        │
        ▼
No-shows earn strikes
        │
        ▼
3 strikes = suspended
        │
        ▼
Suspended users can't hoard
        │
        ▼
Slots stay available for others
        │
        ▼
More citizens can book ──────────────────►  Citizens book fairly
```

The system creates a self-reinforcing loop where good behaviour is the rational choice — not because of moral pressure, but because the system makes abuse structurally unprofitable.
