# Public Transparency Audit 🔍

---

## What is the Public Audit?

The **Public Transparency Audit** is a real-time public ledger of all venue bookings in Eluru. Any citizen can open it and see:

- How many bookings exist (and their statuses)
- Which bookings were overridden by the government
- The official reasons for each government action
- Utilization charts for each venue

This is what makes Eluru Connect fundamentally different from the old system — **corruption is impossible when everything is public**.

---

## What You Can See

### Booking Status Breakdown
A bar chart showing how many bookings are:
- ✅ Confirmed (in progress)
- 🟢 Completed (used successfully)
- ⚪ Cancelled (cancelled by user)
- 🔴 No-Show (user didn't show up)
- 🟡 Overridden (government cancelled)

### Anti-Corruption Ledger
A list of all recent bookings with their status. Each entry is marked:
- **Verified** — Normal booking, no issues
- **Override: [reason]** — Government cancelled, reason shown

### Government Override List
If any booking was overridden by an official, you'll see a special section with:
- Which booking was cancelled
- Which venue and time
- The **exact official reason** provided by the admin

---

## Why This Matters

### The Old System (Before)
- To book ASR Stadium for a community event, you had to "know someone"
- Officials would block slots for their own use without explanation
- No way for citizens to challenge or verify bookings

### The New System (After)
- Anyone can book online — equal access guaranteed
- Government overrides are tracked and require a reason
- If an official abuses the system, **it shows in the public ledger**
- Citizens can screenshot and report any suspicious overrides

---

## How Overrides Are Logged

When a `GOVT_SUPER_ADMIN` overrides a booking:

1. The booking status changes to `overridden`
2. The reason is stored in the database
3. It appears in the **Public Audit** view immediately
4. It's written to the **server-side audit log** (`logs/audit.log`)
5. The action includes the admin's user ID — accountability is built in

---

## Who Can See What?

| Data | Who Can Access |
|------|---------------|
| All bookings (status, venue, time) | **Everyone** — public |
| Override reasons | **Everyone** — public |
| User names/phone numbers | **Admin only** — private |
| Audit log (full) | **GOVT_SUPER_ADMIN only** |
| Server logs | **Server admin only** |

---

## Using the Audit as a Citizen

If you think a government override was unfair:
1. Note the **Booking ID** from the Public Audit
2. Note the stated **reason**
3. Compare with official news/orders (e.g., election commission orders)
4. If the reason seems false or made up, file a complaint with the Municipal Commissioner

The system gives you **evidence** — what you do with it is your democratic right.
