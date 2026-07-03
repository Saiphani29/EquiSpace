# Waitlist System — How It Works ⏳

---

## What is the Waitlist?

When a time slot is already booked by someone else, you don't just lose out — you can **join the waitlist**. When the current booking gets cancelled (for any reason), the **first person in the waitlist queue automatically gets the slot**.

This is completely automatic. You don't need to keep checking.

---

## Joining the Waitlist

1. Try to book a slot that's already taken
2. The app shows: *"This slot is occupied. Would you like to join the waitlist?"*
3. Click **"Yes"**
4. You receive your **queue position** (e.g., Position #2)

You can also see all your waitlist entries on the **Dashboard** under "Waitlist Queue".

---

## How the Queue Works

- Queue positions are **per venue + per time slot** (not global)
- If 3 people are waiting for the same slot at ASR Stadium on Sunday 2 PM, their positions are 1, 2, 3
- When the slot is freed, **Position #1 gets it automatically**
- If Position #1 already has a conflicting booking, they still get the slot (they can cancel the old one if needed)

---

## Automatic Allocation

When a booking is cancelled or marked as a no-show:
1. The system immediately checks the waitlist for that venue + time slot
2. A new confirmed booking is created for the next person in line
3. The waitlist entry is deleted
4. A **real-time notification** is sent to that user

---

## Leaving the Waitlist

If your plans change:
- Go to **Dashboard**
- Under "Waitlist Queue", find the entry
- Click **"Leave waitlist"**

This frees your spot for the next person.

---

## Rules

| Rule | Detail |
|------|--------|
| Duplicate entries | Not allowed — you can only be in the queue once per slot |
| Queue position | Per venue + per exact time slot |
| Auto-allocation | Happens instantly when a cancellation occurs |
| Notification | WebSocket real-time push (no need to refresh) |

---

## Example Scenario

> Priya wants ASR Stadium on Sunday 2–6 PM. Raj already has it booked.
>
> Priya joins the waitlist — she's Position #1.
>
> The next day, Raj cancels his booking.
>
> The system **automatically** creates a confirmed booking for Priya and sends her a notification.
>
> Priya didn't have to do anything! 🎉
