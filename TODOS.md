# TODOS

## Authentication

### Complete secure password recovery

**What:** Add a production password-reset request and completion flow.

**Why:** Password users need a safe self-service recovery path instead of manual support.

**Context:** Milestone 1 removes the current success-only placeholder because it sends no email. Implement a random one-time token, store only its hash and expiry, deliver a provider-backed link, consume it atomically, revoke existing sessions, and cover enumeration, expiry, replay, delivery failure, and success with automated tests.

**Effort:** M
**Priority:** P2
**Depends on:** Mongo-backed session architecture, API safety baseline, and production transactional-email configuration.

## Product roadmap

### Build the remaining ecosystem vertical slices

**What:** Deliver profiles and skills, people discovery, connection requests, investor/fundraising opportunities, professional availability, and notifications as ordered end-to-end slices.

**Why:** Authentication and a startup directory do not yet fulfill NEXVENTURE's promise that every side of the startup ecosystem can discover and connect.

**Context:** Start after the secure foundation and persistent startup directory ship. Each slice must include Mongo models and indexes, REST endpoints, authorization rules, React loading/empty/error states, 100% coverage for changed business logic, critical Playwright journeys, metrics, and deployment acceptance checks. Keep Founder, Investor, Mentor, and Student as the four top-level roles; represent freelancers and startup professionals through profiles, skills, availability, and memberships.

**Effort:** XL
**Priority:** P1
**Depends on:** Milestone 1 authentication foundation and Milestone 2 persistent startup directory.

## Completed
