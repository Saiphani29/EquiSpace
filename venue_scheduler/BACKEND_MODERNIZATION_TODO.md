# Venue Scheduler: Backend Modernization Roadmap

## 🎯 Vision
Upgrade the functional core into an enterprise-grade, high-concurrency engine that matches the premium "Spotlight" UI.

---

## 🛡️ Phase 1: Security & Governance
- [ ] **Advanced RBAC:** Implement granular permissions (e.g., `CAN_CANCEL_ANY`, `CAN_EDIT_QUOTAS`) instead of simple roles.
- [ ] **IP-Based Geofencing:** Restrict booking access to local municipal IP ranges to prevent international bot spam.
- [ ] **Automated Suspension Engine:** Logic that automatically bans accounts after 3 "Fair-Play Strikes" without admin intervention.
- [ ] **2FA Integration:** Add SMS-based Two-Factor Authentication for Admin and VIP roles.

## ⚙️ Phase 2: Logic & Algorithms (The "Brain")
- [ ] **Smart Waitlist Algorithm:** Auto-allocate cancelled slots based on queue position and "Fair-Play" score.
- [ ] **Dynamic Pricing Engine:** Logic for surge pricing or "Peak Hour" fees for high-demand venues.
- [ ] **Maintenance Windows:** Automated blocking of venues for municipal cleaning/repairs based on venue health scores.
- [ ] **Dispute Resolution API:** A dedicated endpoint for citizens to upload "Peer-Review" photos of messy venues.

## 📊 Phase 3: Analytics & High-Availability
- [ ] **Real-time Analytics API:** Aggregate usage stats (Peak hours, top users, revenue) for the Admin Dashboard.
- [ ] **Redis Caching:** Integrate Redis to cache venue lists and public calendars for <10ms response times.
- [ ] **Health Check Probes:** Specialized `/health` and `/ready` endpoints for Docker/Kubernetes orchestration.
- [ ] **Automated Backup Service:** Cron job to dump Neon DB to S3/Local storage every 24 hours.

## 📧 Phase 4: Communications & Notifications
- [ ] **Email/SMS Webhooks:** Integrate Twilio or SendGrid for instant booking confirmations and override alerts.
- [ ] **Push Notification Service:** WebSocket-based "Toast" triggers for real-time announcements.
- [ ] **Digital Receipt PDF Generator:** Auto-generate branded booking certificates for citizen proof-of-reservation.

---
*Created on 2026-05-02*
