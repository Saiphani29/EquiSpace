# Implementation Plan: VIP, Government Overrides & Venue Maintenance

## 1. Background & Motivation
The initial architecture assumed a completely flat hierarchy where all users are equal. However, operational reality dictates two major challenges:
1. **Authority & Revenue:** Government entities require the authority to utilize venues for official purposes (rallies, maintenance). Additionally, there is a potential revenue model in offering "VIP" access.
2. **Maintenance & Clean-up:** Public spaces frequently suffer from the "Tragedy of the Commons." Without accountability, venues are left dirty for the next user, creating a poor experience and burdening municipal resources.

## 2. Scope & Impact
We will implement a hybrid approach for Government/VIP access (Reserved Quotas + Transparent Overrides) and a **Hybrid Accountability System** (Deposits + Digital Check-outs) to ensure venues are maintained without requiring constant physical supervision by municipal staff.

## 3. Proposed Solution Architecture: Authority & VIP Access

### A. The "Proactive" Approach: Reserved Quota Allocation
*   **Concept:** Venue configurations include a "Govt/VIP Quota" (e.g., 10% of all slots). 
*   **Mechanism:** These slots are unavailable to standard citizens during the regular booking window. 
*   **Auto-Release:** If the Government or a paying VIP has not booked this reserved slot by **48 hours** before the start time, the system automatically unlocks it and notifies the public waitlist.

### B. The "Reactive" Approach: Transparent Override
*   **Concept:** For sudden, unavoidable government requirements, a high-level official can cancel an already confirmed citizen's booking.
*   **Accountability:** The admin MUST select a **Standardized Reason Code**. The public calendar displays: **"Overridden by Government: [Reason Code]"**. The displaced citizen receives an immediate full refund and priority waitlist status.

---

## 4. Proposed Solution Architecture: Maintenance & Clean-up

To solve the cleaning challenge without constantly paying for municipal staff, we will use a **Hybrid Accountability System**:

### A. The Smart Deposit (Financial Leverage)
*   For high-value venues (e.g., Community Halls, VIP bookings), a mandatory **Refundable Security Deposit** is held on the user's card.
*   If the venue is left clean, the deposit is automatically released back to the user 24 hours later.
*   If the venue requires cleaning, the deposit is captured and routed directly to a local municipal cleaning crew or private contractor.

### B. Digital Check-Out & Photo Proof (Citizen Accountability)
*   For free, open spaces (e.g., public cricket grounds), enforcing a deposit might cause public backlash. Instead, we use a mandatory **Digital Check-Out**.
*   When a booking ends, the user receives an SMS prompting them to upload one "After" photo of the ground via the web app.

### C. The Peer-Review Penalty Loop
*   When the *next* citizen arrives for their slot, they are prompted: "Is the venue clean? (Yes/No)".
*   If they select "No" and upload a photo of a mess, the system flags the previous user.
*   An admin reviews the conflict. If the previous user left the mess, they forfeit any deposit AND receive a **"Fair-Play Strike"**. Two strikes result in a 6-month ban from the platform.

---

## 5. Implementation Steps

### Step 1: Database Schema Updates
1.  **Users Table:** Add roles (`VIP`, `GOVT_SUPER_ADMIN`) and `fair_play_strikes` (Integer).
2.  **Venues Table:** Add `requires_deposit` (Boolean), `deposit_amount` (Decimal), and `quota_rules` (JSON).
3.  **Bookings Table:** Add `booking_type`, `override_reason`, `checkout_photo_url`, `reported_dirty_by_next_user` (Boolean).

### Step 2: Backend Logic (FastAPI)
1.  **Override Engine:** Create secure endpoints for Govt Overrides that automatically trigger refund workflows for the displaced user.
2.  **Deposit Management:** Integrate with a payment gateway (like Stripe) to "Hold" funds rather than capturing them immediately.
3.  **Check-Out Webhook:** Create logic that emails/texts users 10 minutes before their slot ends, requesting the check-out photo.

### Step 3: Frontend Interface (React)
1.  **Public Calendar:** Show "Government Override" warnings in red and "VIP" slots in gold.
2.  **Check-Out Flow:** Build a mobile-friendly screen allowing users to snap and upload a photo directly from their phone camera to complete their booking.

---

## 6. Verification & Migration
*   **Testing:** Thoroughly test the "Peer-Review Loop" where User B reports User A, ensuring User A's deposit is correctly captured and strikes are applied.
*   **Migration:** These fields will be included in the initial database creation scripts.