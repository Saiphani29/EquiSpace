# Transparent Public Venue & Sports Ground Scheduler

## 1. The Problem We Are Solving (Existing System)
In many towns, public resources like community halls, public cricket/football grounds, and park pavilions are managed manually. 
- **Favoritism & Corruption:** The same influential groups dominate the bookings.
- **Double Bookings:** Paper ledgers lead to overlapping reservations, causing physical disputes at the venue.
- **Lack of Transparency:** Citizens don't know when a venue is free without physically finding the official in charge.

## 2. The Proposed System (How We Solve It)
A digital, public ledger and scheduling system where the community can transparently view and book shared town spaces.
- **Public Calendar View:** Anyone can see what is booked, when, and by whom.
- **Fair-Play Algorithms:** Code-level rules prevent monopolization (e.g., "A user/team cannot book the prime Sunday morning slot two weeks in a row").
- **Automated Waitlists:** If a slot is canceled, the next group on the waitlist is automatically notified.

## 3. Technology Stack
- **Frontend:** React.js (TypeScript) + Tailwind CSS + a Calendar Library (like FullCalendar.js).
- **Backend:** FastAPI (Python) - *You already know this from the Milk Collection project!*
- **Database:** SQLite or MySQL (to handle booking transactions securely).

## 4. Challenges We Will Face & How to Solve Them
1. **Challenge:** *Fake Bookings (People making accounts just to block slots).*
   **Solution:** Limit the number of active bookings a single user can hold. Introduce a simple OTP/Phone verification step.
2. **Challenge:** *No-Shows (A group books the ground but doesn't show up, wasting the resource).*
   **Solution:** Implement a "Check-In" or feedback system. If a user is reported as a "No-Show" twice, their booking privileges are suspended for 30 days.
3. **Challenge:** *Race Conditions (Two people clicking 'Book' on the same slot at the exact same millisecond).*
   **Solution:** Use Database Row-Level Locking in FastAPI. This ensures the database strictly processes one request first and rejects the other.

## 5. Development To-Do List
- [ ] Phase 1: Design Database Schema (Users, Venues, Bookings).
- [ ] Phase 2: Build the FastAPI backend with CRUD and Fair-Play logic.
- [ ] Phase 3: Build the React frontend with a visual calendar.
- [ ] Phase 4: Test Race Conditions (simultaneous booking attempts).