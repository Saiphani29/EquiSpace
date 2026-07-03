# Admin & VIP Management Guide 🏛️

---

## Who Are Admins?

There are two admin roles in Eluru Connect:

### GOVT_SUPER_ADMIN
The most powerful role. Typically the District Collector's office or Municipal Commissioner.

**Powers:**
- View all users
- Suspend/Reinstate citizen accounts
- Grant/Revoke VIP status
- Clear fair-play strikes
- Override any booking (with reason)
- View full audit log

### VENUE_MANAGER
Municipal staff managing specific venues.

**Powers:**
- Create and update venue details
- View all users (read-only)
- Basic booking management

---

## The Admin Panel

Admins see an extra **"Admin Panel"** link in the sidebar (marked with a ⭐ VIP badge).

### User Management Table
Shows all registered citizens with:
- Name and phone number
- Current role
- Fair-play strikes (colour-coded: green/amber/red)
- Account status (Active/Suspended)
- Action buttons

### Available Actions (Super Admin Only)

| Action | When to Use |
|--------|-------------|
| **Suspend** | Repeated violations, rule breaking |
| **Reinstate** | After appeal or correction period |
| **Grant VIP** | Official organisation recognised by municipality |
| **Revoke VIP** | VIP misused or organisation dissolved |
| **Clear Strikes** | After successful appeal |

---

## Government Overrides

Government admins can forcibly cancel any booking for **official municipal needs**.

### When to Use Overrides
- Election booth setup (ordered by Election Commission)
- Emergency services (flood, disaster relief)
- Scheduled maintenance
- VIP state visits

### How to Override
1. Go to **Admin Panel** → right side panel "Government Override"
2. Enter the **Booking ID** (find it in the Public Audit or audit log)
3. Write a **clear public reason** (minimum 10 characters)
4. Click **"Execute Override"**

> ⚠️ **IMPORTANT:** All overrides are permanently logged and publicly visible. Misusing this power is a serious offence.

---

## VIP Membership

### What VIPs Get
- 8 bookings per month per venue (vs 4 for citizens)
- Priority access to Sunday prime-time slots
- Their bookings show a gold ⭐ badge

### Who Should Be VIP
- MLA/MLC offices
- District-level sports committees
- Government schools/colleges for official events
- Municipal department heads

### Who Should NOT Be VIP
- Individual citizens (even well-known ones)
- Private clubs or businesses
- Political party offices (must follow standard procedure)

---

## Audit Log

The audit log records every sensitive action:

```
2026-05-03T10:23:45 - USER_ID: 1 | ACTION: GOVT_OVERRIDE | DETAILS: Booking ID 42 overridden. Reason: Election booth setup...
2026-05-03T11:00:00 - USER_ID: 1 | ACTION: SUSPEND_USER | DETAILS: User ID 5 (Ravi) suspended. Reason: 3 no-shows...
2026-05-03T14:30:00 - USER_ID: 1 | ACTION: PROMOTE_VIP | DETAILS: User ID 8 (MLA Office) promoted to VIP.
```

### Viewing the Audit Log
- Go to **Admin Panel** (only visible to GOVT_SUPER_ADMIN)
- The audit panel shows the last 200 entries
- Full logs are stored in `logs/audit.log` on the server

---

## Security Model

| Feature | Implementation |
|---------|---------------|
| Admin routes | Require valid JWT + VENUE_MANAGER or GOVT_SUPER_ADMIN role |
| Super admin actions | Require GOVT_SUPER_ADMIN role specifically |
| Cannot suspend another super admin | Hard-coded protection |
| Cannot demote admin accounts | Hard-coded protection |
| All privileged actions | Written to audit log |
| Login brute force | Rate limited to 10 attempts/minute |
| Override reason | Minimum 10 characters enforced |

---

## Emergency Contacts

If you suspect admin account misuse or unauthorised overrides:
- Review the **Public Audit** tab — available to all citizens
- Every override is visible to the public with the stated reason
- Contact the District Collector's office with audit log evidence
