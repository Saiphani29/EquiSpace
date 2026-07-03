# Booking a Venue — Complete Guide 📅

---

## How Bookings Work

When you book a venue, the system:
1. Checks you are **not suspended** and have **no active strikes ban**
2. Verifies you haven't **exceeded your monthly quota** (4 for citizens, 8 for VIP)
3. Checks there are **no conflicting confirmed bookings** for that slot
4. Locks the slot and creates your booking

All of this happens in milliseconds. The database uses **row-level locks** to ensure two people can't accidentally book the same slot at the same time.

---

## Creating a Booking

### From the App
1. Go to **Browse Venues**
2. Choose a venue → click **"Book Slot"**
3. Select start and end date/time
4. Click **"Confirm Booking"**

### Rules Your Booking Must Follow
- Start time must be **in the future** (at least a few minutes ahead)
- End time must be **after** start time
- A single booking cannot exceed **12 hours**
- You can book max **4 times per month per venue** (Citizens) or **8 times** (VIP)

---

## Booking Statuses

| Status | Meaning |
|--------|---------|
| `confirmed` | Active booking — you're good to go |
| `completed` | You checked in — session happened |
| `cancelled` | You or an admin cancelled it |
| `no_show` | You missed check-in — a strike was added |
| `overridden` | Govt admin cancelled it for official reasons |

---

## Cancelling a Booking

- Go to Dashboard → find your booking
- Click the **"Cancel"** button
- The slot is immediately released to the **waitlist queue**
- People waiting for that slot get notified automatically

> ⚠️ **Please cancel early if you can't make it.** This frees the venue for someone else!

---

## Check-In

The check-in window opens **30 minutes before** your start time and closes **30 minutes after**.

- ✅ Check in on time → Status becomes `completed`
- ❌ Miss the window → Status becomes `no_show` + **1 fair-play strike**
- After 3 strikes → **account suspended**

---

## Frequently Asked Questions

**Q: Can I book the same venue multiple times in a month?**
A: Yes, up to 4 times (citizens) or 8 times (VIP).

**Q: Can I change my booking time?**
A: Not directly. Cancel the booking and create a new one.

**Q: What if someone else books the slot I wanted?**
A: Join the **waitlist** — you'll automatically get the slot if it's cancelled.

**Q: Can the government cancel my booking?**
A: Yes, but only for official reasons (elections, disasters, etc.) — and the reason is made **public**.
