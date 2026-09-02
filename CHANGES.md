# NEXVENTURE Engineering Review Log

This file records repository changes, engineering decisions, verification commands, and review calls made while assessing the MERN migration on `main`.

## 2026-08-26

### User-directed scope

- Review target: current branch diff and working tree.
- Product intent: one discovery and connection platform for founders, startups, freelancers, investors, fundraising opportunities, and startup professionals.
- Process choice: skipped the optional `/office-hours` design exercise to accelerate the review.
- Documentation choice: record review decisions, commands, findings, and edits in this file.

### Changes made during the review

- Added gstack skill-routing guidance to `AGENTS.md` after explicit approval.
- Created this review log after explicit approval.
- Commit created: `5bf8446 chore: add gstack skill routing rules to AGENTS.md`.

### Repository state observed

- The working tree replaces the tracked TanStack/React application with separate `backend/` and `frontend/` npm workspaces.
- Tracked diff: 93 files changed, 145 insertions, and 9,302 deletions, excluding 60 untracked MERN files.
- New backend: Express, Mongoose, MongoDB connection, demo-data seeding, and authentication endpoints.
- New frontend: React/Vite, TanStack Router, authentication context, landing/auth/dashboard UI, and static startup discovery data.
- No `TODOS.md`, test framework, test script, test files, or CI workflow was detected.

### Verification commands and results

- `git status --short --branch`: large uncommitted application replacement on `main`.
- `git diff --stat` and `git diff --name-status`: confirmed the 93-file tracked replacement.
- `rg --files backend frontend`: inventoried 16 untracked backend files and 44 untracked frontend files.
- `npm run lint`: passed.
- `npm run build`: passed with a Vite warning; the main JavaScript bundle is 567.62 kB minified and 175.58 kB gzip.
- Test-framework detection: no framework or tests found.
- CI/distribution detection: no `.github` workflow found.
- Primary-source web search for current framework guidance was attempted but the search service returned HTTP 404; recommendations are therefore grounded in inspected code and established framework behavior until sources can be verified.

### Step 0 scope challenge

- Existing tracked code already supplied the landing page, login, signup, protected dashboard, router, and reusable UI. Much of the new frontend relocates or converts that foundation rather than adding a wholly new capability.
- The migration combines repository restructuring, TypeScript-to-JavaScript conversion, backend creation, authentication, demo seeding, new discovery UI, dependency replacement, and deletion of Lovable metadata in one working tree.
- This exceeds the review threshold of eight files and creates multiple independent subsystems without tests, so a scope decision is required before the detailed architecture review.

### Open decisions

- D3 resolved: stabilize the migration as staged milestones.

### Accepted delivery strategy

1. Stabilize the MERN workspace and preserve existing Phase 1 behavior.
2. Replace demo authentication behavior with a production-safe authentication boundary and automated tests.
3. Add persistent ecosystem discovery and connection features as later vertical slices.
4. Add deployment checks before any slice is considered shippable.

This is a scope reduction for the first milestone, not a reduction of the final NEXVENTURE product vision.

### Architecture review

- Finding A1: `POST /auth/google` does not perform Google OAuth. It creates or returns one fixed shared account and issues a valid application token to any caller.
- Decision D4: implement real Google OAuth in Milestone 1, including provider configuration, callback validation, account linking, failure handling, and integration tests.
- Finding A2: authentication currently uses a hand-written JWT implementation, a production-capable default signing secret, and browser `localStorage` for bearer tokens. Session architecture decision pending.
- Decision D5: replace bearer JWT storage with Mongo-backed server sessions using `HttpOnly`, `Secure`, `SameSite` cookies, CSRF protection, revocable logout, and production environment validation.
- Finding A3: `User.role` is one required enum value limited to founder, investor, mentor, or student; it cannot represent freelancers/startup professionals or users who participate in multiple capacities. Domain-model decision pending.
- Decision D6: use a multi-role identity model while keeping exactly four top-level roles: Founder, Investor, Mentor, and Student. Freelancers and startup professionals are modeled through professional profiles, skills, availability, and startup memberships. The existing four-card role selector remains the onboarding entry point.
- Finding A4: the migration deletes `.lovable/project.json` even though repository instructions state that the connected branch syncs to Lovable. Integration decision pending.
- Decision D7: intentionally disconnect the application from Lovable and establish an independent MERN build, deployment, and rollback workflow. Published Git history remains immutable; Lovable-specific removal happens only after the replacement pipeline is verified.
- Finding A5: the startup directory is a frontend-only `COMPANIES` array; there is no `Startup` model, ownership boundary, query API, pagination, or server-side authorization. Data architecture decision pending.
- Decision D8: build a MongoDB-backed REST vertical slice for startups. It includes `Startup`, `StartupMembership`, indexed list/detail queries, cursor pagination, validated filters, ownership authorization, and replacement of frontend fixtures with API data.
- Finding A6: the repository has no CI workflow, deployable artifact definition, production start topology, rollback mechanism, or hosting contract. Deployment architecture decision pending.
- Decision D9, superseded after architecture feedback: do not ship the frontend and backend as one container.
- Revised D9: deploy the Vite frontend and Node/Express backend independently, with managed MongoDB. Use controlled sibling production domains, an exact credentialed-CORS allowlist, secure cookie attributes, CSRF protection, versioned API contracts, independent health checks, and rollback support for both releases.
- Finding A7: `server.js` enables CORS and unbounded `express.json()` but has no schema validation, security headers, rate limiting, request correlation, or abuse controls. API-boundary decision pending.
- Decision D10: implement the complete API safety baseline in Milestone 1: validated production configuration, request schemas, payload limits, security headers, global and auth-specific rate limits, request IDs, structured errors, and automated tests.
- Finding A8: the password-reset endpoint returns a success response without creating a reset token, persisting expiry state, or sending email, while the UI tells users to check their inbox. Recovery-flow decision pending.
- Decision D11: remove password reset from Milestone 1 instead of shipping the placeholder. A complete recovery flow is deferred and must include hashed one-time tokens, expiry, atomic consumption, email delivery, replay tests, and session revocation.

#### Architecture section result

- Eight issues reviewed; all eight decisions resolved.
- Foundation topology: modular MERN application, multi-role user identity, Mongo-backed sessions, real Google OAuth, persistent REST startup directory, complete API boundary, and separately deployed frontend/backend services.
- Explicitly deferred: password recovery and broader ecosystem feature slices after the startup-directory foundation.
- Architecture confirmation D12: accepted after revising D9 to separate frontend/backend deployment.

### Code quality review

- Finding Q1: the four role constants are duplicated in `backend/utils/enums.js` and `frontend/src/utils/enums.js`; API request/response contracts otherwise have no shared source of truth. Contract-sharing decision pending.
- Decision D13: create `packages/contracts` for shared role constants and runtime request/response schemas; bundle it into both independently deployed applications.
- Finding Q2: `backend/server.js` constructs the Express app, connects to MongoDB, seeds data, opens a port, and calls `process.exit(1)` in one module, so importing the app has process-level side effects and blocks isolated integration tests. Composition decision pending.
- Decision D14: split an import-safe Express app factory from the server process entry. Startup owns MongoDB, seed policy, listening, graceful shutdown, and process exit; tests import the app without opening a port.
- Finding Q3: frontend route files use `createFileRoute`, but `frontend/src/router.jsx` manually imports, assigns, parents, and registers every route while `vite.config.js` has no router-generation plugin. Routing decision pending.
- Decision D15: use a fully code-based TanStack Router tree as the single source of truth; route modules export components/configuration without `createFileRoute` duplication.
- User constraint: strictly use the MERN stack in JavaScript. Do not introduce TypeScript, Next.js, GraphQL, serverless framework architecture, or a non-MERN backend abstraction. Shared contracts are JavaScript runtime schemas.
- Finding Q4: the root ESLint configuration gives browser and Node globals to all JavaScript files and disables `no-unused-vars` plus React refresh checks globally, allowing real defects to pass lint. Lint-policy decision pending.
- Decision D16: add separate strict ESLint profiles for frontend, backend, shared contracts, configuration, and tests. JavaScript linting becomes a required CI gate.
- Finding Q5: frontend production code contains four demo emails and the shared password `password123`, and `login.jsx` always renders quick-login buttons even though backend seeding runs only in development. Demo-environment decision pending.
- Decision D17: retain demo accounts only in development-only seed and UI modules; production builds must omit quick-login code and pass an automated credential-absence check.
- Finding Q6: `frontend/src/routes/_authenticated/route.jsx` redirects inside `useEffect` after render, showing a spinner and dropping the intended destination instead of enforcing authentication in the router lifecycle. Guard decision pending.
- Decision D18: enforce protected routes in code-based TanStack Router `beforeLoad`, using router auth context, session readiness, and a validated `returnTo` path.
- Finding Q7: the login page renders a `Remember me` checkbox without controlled state or any impact on session lifetime. Session-persistence UX decision pending.
- Decision D19: implement browser-session and bounded persistent-session lifetimes; `Remember me` selects the latter and both paths require rotation, expiry, logout, and integration tests.
- Finding Q8: `frontend/src/lib/api/authClient.js` sends bare `fetch` calls without `credentials`, timeout, cancellation, request IDs, typed/structured error categories, or retry policy. Client-boundary decision pending.
- Decision D20: create one explicit frontend API client with credentialed cookies, CSRF handling, abort/timeout support, request IDs, content-type validation, structured `ApiError`, and retries only for safe reads.

#### Code quality section result

- Eight issues reviewed; all eight decisions resolved.
- Accepted: shared JavaScript contracts, testable backend composition, code-based routing, strict scoped lint, development-only demo fixtures, router lifecycle auth guards, real session persistence choice, and one reusable API client.

### Test review

No test framework, test script, test file, or CI test job exists. Current automated coverage is therefore zero.

```text
CODE PATHS                                                     USER FLOWS
[GAP] Backend: database and process lifecycle (8 paths)        [GAP] [→E2E] Password login
  ├── already connected / connect / connection failure          ├── valid / invalid / rate-limited
  ├── development seed / production skip                        └── browser vs persistent session
  └── graceful start / shutdown / startup failure              [GAP] [→E2E] Real Google OAuth

[GAP] Backend: identity and sessions (20 paths)                 [GAP] [→E2E] Signup and onboarding
  ├── signup validation / duplicate / race / success             ├── four initial roles
  ├── password login validation / failure / success              └── add a second role later
  ├── Google callback success / denial / replay / link conflict [GAP] [→E2E] Protected navigation
  └── session create / rotate / expire / revoke / remember       ├── redirect with safe returnTo
                                                                  └── expiry and logout recovery
[GAP] Backend: API boundary and errors (6 paths)
  ├── schema rejection / body limit / rate limit               [GAP] [→E2E] Startup discovery
  └── not found / domain error / unexpected error                ├── empty / single / many results
                                                                  ├── search / filters / cursor pages
[GAP] Backend: startup REST slice (8 paths)                       └── slow / failed / stale request
  ├── list / detail / create / edit
  └── owner / member / forbidden / stale-write conflict        [GAP] [→E2E] Startup management
                                                                  ├── create / edit / authorization
[GAP] Frontend: session and routing (8 paths)                     └── duplicate submit / two tabs
  ├── bootstrap success / absent / expired / network failure
  └── allow / redirect / safe returnTo / unsafe returnTo        [GAP] User-visible error recovery
                                                                  ├── offline / timeout / 401 / 403
[GAP] Frontend: forms and API client (18 paths)                   └── 409 / 429 / 500 / retry
  ├── login and signup validation branches
  ├── credentials / CSRF / timeout / abort / JSON failure
  └── safe retry / mutation no-retry

[GAP] Frontend: discovery and responsive UI (18 paths)
  ├── query / each filter / each sort / clear / empty
  ├── save / unsave / pagination / stale response
  └── mobile filters / navigation / sidebar / logout

COVERAGE: 0/101 planned paths tested (0%)
Code paths: 0/86 (0%) | User flows: 0/15 (0%)
QUALITY: ★★★:0 ★★:0 ★:0 | GAPS: 101 (9 critical E2E journey groups)
```

Legend: ★★★ behavior + edge + error | ★★ happy path | ★ smoke check | `[→E2E]` integration/browser coverage required.

- Finding T1: zero automated tests cover the current or accepted target architecture. Test-stack decision pending.
- Decision D22: standardize on Vitest for JavaScript units/integrations, React Testing Library for components, Supertest for Express, isolated Mongo test databases for persistence, and Playwright for critical browser journeys.
- Finding T2: there is no coverage threshold or CI test gate, so tests can be added without proving all accepted branches and user journeys are protected. Coverage-policy decision pending.
- Decision D23: CI requires 100% coverage for new and changed business logic, all critical Playwright journeys, strict lint, build verification, and a production credential scan.
- Regression rule applied: because the migration replaces existing landing, login, signup, router, and protected-dashboard behavior with no tests, those journeys are mandatory critical regression tests.
- QA artifact written: `~/.gstack/projects/Saransh-dev-10-founder-link-forge/shivam-main-eng-review-test-plan-20260826-143722.md`.

#### Test section result

- Coverage diagram produced: 0/101 planned paths currently tested.
- Two issues reviewed; both decisions resolved.
- Nine critical E2E journey groups identified; no LLM or prompt evals are required.
- Test confirmation D24: accepted without revision.

### Performance review

- Finding P1: `hashPassword()` and `verifyPassword()` use `crypto.scryptSync()` inside signup/login request paths, blocking the Node.js event loop during CPU-intensive password work. Password-hashing decision pending.
- Decision D25: use asynchronous, versioned Node `crypto.scrypt`, with bounded password input, explicit parameters, concurrency tests, and legacy-hash migration support.
- Finding P2: the production build emits one 567.62 kB minified JavaScript bundle because `frontend/src/router.jsx` eagerly imports every public, auth, dashboard, and discovery route. Bundle strategy decision pending.
- Decision D26: lazy-load explicit route groups and enforce bundle-size budgets in CI; include loading and chunk-failure recovery states.

#### Performance section result

- Two issues reviewed; both decisions resolved.
- Accepted: asynchronous password derivation and route-level code splitting.
- Intentionally deferred: application caching, queues, search infrastructure, and horizontal-scaling machinery until measured traffic or latency requires them.
- Performance confirmation D27: accepted without revision.

### Deferred-work review

- Decision D28: add secure password recovery to `TODOS.md` as a P2 follow-up after the authentication foundation ships.
- Decision D29: add the ordered post-foundation ecosystem expansion to `TODOS.md` as a P1 roadmap epic.

## Recommended execution plan

### Product and engineering boundary

- Stack: MongoDB, Express, React, and Node.js in JavaScript only.
- Delivery model: staged vertical slices, not one repository-wide replacement release.
- User roles: Founder, Investor, Mentor, and Student. One account may hold multiple roles.
- Freelancers and startup professionals: professional profiles, skills, availability, and startup memberships, not new top-level roles.
- Deployment: frontend and backend deploy independently behind controlled sibling domains.

### Target system

```text
                       ┌──────────────────────────────┐
                       │  Frontend static deployment  │
                       │  app.nexventure.com          │
                       │  React + Vite + TanStack     │
                       └──────────────┬───────────────┘
                                      │ HTTPS
                                      │ credentialed CORS + CSRF
                                      ▼
┌───────────────────┐   OAuth   ┌──────────────────────────────┐
│ Google identity   ├──────────►│ Backend Node deployment      │
│ provider          │◄──────────┤ api.nexventure.com/api/v1    │
└───────────────────┘           │ Express modular monolith      │
                                └──────────────┬───────────────┘
                                               │ Mongoose
                                               ▼
                                ┌──────────────────────────────┐
                                │ Managed MongoDB              │
                                │ users / sessions / profiles  │
                                │ startups / memberships       │
                                └──────────────────────────────┘
```

```text
User
  ├── roles[]: founder | investor | mentor | student
  ├── ProfessionalProfile (0..1)
  ├── Session (0..n, expiring and revocable)
  └── StartupMembership (0..n)
          └── Startup (1)
                 ├── owners/members through memberships
                 └── discovery fields + indexed cursor
```

### Milestone 0: Stabilize the migration foundation

Goal: make the repository safe to change before adding more product behavior.

1. Keep root npm workspaces for `backend`, `frontend`, and `packages/contracts`; keep everything JavaScript.
2. Add `packages/contracts` with the four role constants and runtime API schemas.
3. Split backend app composition from process startup and add graceful shutdown.
4. Replace permissive lint settings with strict backend/frontend/contracts/test profiles.
5. Install and configure Vitest, React Testing Library, Supertest, isolated Mongo test databases, and Playwright.
6. Add CI gates for lint, tests, changed-business-logic coverage, frontend build, bundle budgets, and production credential scanning.
7. Preserve regression behavior for landing, login, signup, routing, and protected dashboard before deleting obsolete root files.

Acceptance:

- `npm run lint`, `npm test`, and `npm run build` pass from the root.
- Tests can import the Express app without opening a port or connecting to a shared database.
- Production frontend output contains no demo credentials or quick-login code.
- Existing Phase 1 journeys pass Playwright regression tests.

### Milestone 1: Production-safe authentication and identity

Goal: create a trustworthy account boundary before any user-generated ecosystem data.

1. Validate production environment configuration at startup; fail closed on missing secrets/origins/provider settings.
2. Add payload limits, security headers, exact CORS allowlists, CSRF protection, request IDs, structured errors, and global/auth-specific rate limits.
3. Replace custom bearer JWT/localStorage auth with Mongo-backed sessions and secure cookies.
4. Support browser-session and bounded persistent-session lifetimes through `Remember me`.
5. Convert password hashing to asynchronous, versioned Node `crypto.scrypt` with input bounds and legacy migration.
6. Implement real Google OAuth with state/nonce validation, denial handling, replay protection, and explicit account-link conflict rules.
7. Replace the single role field with the four-value multi-role identity model.
8. Remove the fake password-reset route and UI; keep full recovery in `TODOS.md`.
9. Move frontend requests to one credentialed, cancellable API client with CSRF, timeouts, request IDs, structured errors, and safe-read retries only.
10. Use a code-based TanStack Router tree with `beforeLoad` authentication, safe `returnTo`, and lazy route groups.
11. Compile development demo accounts and quick-login UI only in development.

Acceptance:

- Password and Google login pass API integration and Playwright tests.
- Session rotation, expiry, revocation, logout, two-tab behavior, and both persistence modes are covered.
- No open redirect, OAuth replay, account-link ambiguity, credential leakage, or fake recovery UI remains.
- All changed business-logic branches have 100% automated coverage.

### Milestone 2: Persistent startup discovery vertical slice

Goal: turn the static directory into the first real product capability.

1. Add `Startup` and `StartupMembership` models with explicit ownership and membership rules.
2. Add unique and compound indexes for slug, visibility, status, filters, and stable `(createdAt, _id)` cursor pagination.
3. Add REST list, detail, create, and edit endpoints using shared validation schemas.
4. Enforce founder/member authorization server-side; never trust role or ownership claims from the client.
5. Replace `COMPANIES` fixtures with API data and implement loading, empty, error, retry, pagination, and stale-response states.
6. Preserve current search, stage, industry, region, hiring, top-company, sort, save, and responsive-filter behavior.
7. Add optimistic-concurrency protection for edits and clear conflict recovery.

Acceptance:

- A founder can create a startup, authorized members can edit it, and non-members receive a clear 403.
- Public users can browse stable cursor pages and combine supported filters.
- Empty, malformed, slow, offline, 409, 429, and 500 paths have visible recovery and automated coverage.
- Static production fixtures are removed after parity is proven.

### Milestone 3: Independent production delivery and Lovable exit

Goal: replace Lovable with a repeatable frontend/backend release process.

1. Create independent frontend and backend CI/CD pipelines with immutable build identifiers.
2. Deploy the frontend as static assets/CDN and the backend as a versioned Node service.
3. Use controlled sibling domains, exact credentialed CORS origins, secure cookie policy, and CSRF configuration.
4. Add backend liveness/readiness checks, frontend smoke checks, structured logs, request correlation, and rollback commands.
5. Require backward-compatible API changes while old frontend assets may remain cached.
6. Verify both deployments and rollback, then remove Lovable metadata and update repository documentation.

Acceptance:

- Frontend and backend can deploy and roll back independently.
- A release smoke test proves login, session restoration, startup discovery, and API/database readiness.
- Lovable removal occurs only after the replacement pipeline succeeds.

### Milestone 4: Complete the ecosystem

Execute the P1 roadmap in `TODOS.md` as separate vertical slices: profiles and skills, people discovery, connection requests, investor/fundraising opportunities, professional availability, and notifications. Do not begin chat, AI matching, or event systems until the connection and opportunity loops show real usage.

## What already exists

| Existing capability                            | Evidence                                                                   | Plan treatment                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Landing, login, signup, protected dashboard UI | Previously tracked `src/routes/` and `src/components/nex/`                 | Preserve via regression tests; migrate rather than redesign in Milestone 0. |
| React/Vite frontend workspace                  | `frontend/package.json`, `frontend/vite.config.js`                         | Reuse; keep JavaScript and explicit code-based routing.                     |
| Express/Mongoose skeleton                      | `backend/server.js`, `backend/config/db.js`                                | Reuse after splitting app composition and hardening boundaries.             |
| User model and password helpers                | `backend/models/User.js`, `backend/utils/password.js`                      | Evolve to multi-role identity and asynchronous versioned hashes.            |
| Auth forms and context                         | `frontend/src/routes/login.jsx`, `signup.jsx`, `frontend/src/lib/auth.jsx` | Reuse UI; replace bearer/localStorage mechanics.                            |
| Startup directory UI and filters               | `frontend/src/routes/startups.jsx`, `frontend/src/data/companies.js`       | Preserve behavior; replace fixture data with REST results.                  |
| Root workspace scripts                         | `package.json`                                                             | Reuse; add test, coverage, CI, and production scripts.                      |

## NOT in scope

- Password recovery in Milestone 1: removed honestly and tracked as a P2 follow-up.
- Chat or realtime messaging: connection requests come first; realtime infrastructure has no validated demand yet.
- AI recommendations: requires real interaction data and evaluation criteria that do not exist yet.
- Events and admin consoles: not required for the first discovery/connection loop.
- Payments or execution of investments: introduces financial and regulatory scope beyond discovery and fundraising opportunities.
- Microservices, GraphQL, TypeScript, Next.js, or serverless architecture: conflicts with the chosen JavaScript MERN modular monolith.
- Redis, queues, Elasticsearch, or application caching: add only after measurements show MongoDB/indexes and stateless API processes are insufficient.
- Full-text search infrastructure: begin with indexed MongoDB queries and measure relevance/latency first.

## Production failure modes

| Codepath              | Realistic production failure                            | Planned test |                                    Planned handling | User experience                                     |
| --------------------- | ------------------------------------------------------- | -----------: | --------------------------------------------------: | --------------------------------------------------- |
| Backend startup       | MongoDB unavailable or required env missing             |          Yes |          Fail startup/readiness; log correlation ID | Deployment remains unhealthy, not partially live.   |
| Password signup/login | Hash workload stalls requests or duplicate signup races |          Yes | Async scrypt, limits, unique-index conflict mapping | Clear validation/conflict/rate-limit message.       |
| Session lifecycle     | Expired, revoked, stolen, or stale two-tab session      |          Yes |          Rotate/revoke server session; clear cookie | Redirect to login with safe return path.            |
| Google OAuth          | Denial, forged state, replay, or account-link conflict  |          Yes |               Reject callback; preserve audit event | Clear retry or account-link guidance.               |
| API boundary          | Oversized/malformed/abusive request                     |          Yes |          Schema/body/rate rejection with request ID | Specific 400/413/429 recovery message.              |
| Startup list          | Invalid cursor, slow query, or stale response order     |          Yes | Validate cursor, indexed query, abort stale request | Stable results or retryable error state.            |
| Startup write         | Unauthorized member or concurrent edit                  |          Yes |           Server authorization and version conflict | Clear 403 or refresh-and-retry 409.                 |
| Frontend API client   | Offline, timeout, non-JSON response, or chunk failure   |          Yes |             Abort, categorize, safe-read retry only | Recoverable offline/timeout/reload state.           |
| Protected routing     | Unsafe external `returnTo` value                        |          Yes |                    Allow only internal known routes | User lands on a safe internal page.                 |
| Separate deployments  | New frontend calls an older backend contract            |          Yes |       Backward-compatible endpoints and smoke gates | Release blocked or rolled back before broad impact. |
| Demo fixtures         | Development credentials leak into production bundle     |          Yes |            Build-time exclusion and credential scan | Production never displays quick-login controls.     |

All listed failure modes currently lack coverage in the working tree. The accepted plan adds both tests and visible error handling, so there are zero unresolved silent critical gaps in the plan.

## Inline ASCII diagrams to maintain in implementation

- `backend/models/User.js`: identity, multi-role, profile, session, and membership relationships.
- Backend session service: create → rotate → expire/revoke state transitions.
- Backend OAuth service: redirect → callback validation → link/create → session pipeline.
- `backend/models/Startup.js` and membership model: ownership and edit-authorization relationships.
- Startup query service: validate filters → build indexed cursor query → map public response.
- Non-obvious integration/E2E setup: fixture isolation and cross-origin cookie flow.

## Worktree parallelization strategy

| Step                                 | Modules touched                                                | Depends on                                       |
| ------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------ |
| Foundation contracts and lint        | `packages/contracts/`, root config                             | —                                                |
| Test and CI foundation               | test config, `.github/`, root scripts                          | Foundation contracts and lint                    |
| Backend composition and API boundary | `backend/config/`, `backend/middleware/`, `backend/routes/`    | Foundation contracts                             |
| Authentication and identity          | `backend/models/`, `backend/services/`, `backend/controllers/` | Backend composition and API boundary             |
| Frontend router and API client       | `frontend/src/router/`, `frontend/src/lib/`, auth routes       | Foundation contracts                             |
| Startup REST slice                   | `backend/models/`, `backend/services/`, `backend/controllers/` | Authentication and identity                      |
| Startup frontend slice               | `frontend/src/routes/`, `frontend/src/components/`             | Frontend router/client and Startup REST contract |
| Independent deployment               | deployment config, `.github/`, docs                            | Authentication and startup smoke paths           |

- Lane A: contracts/lint → test/CI foundation.
- Lane B: backend composition/API safety → authentication/identity → startup REST.
- Lane C: frontend router/API client → startup frontend integration.
- Lane D: frontend/backend deployment scaffolding → release smoke/rollback verification.
- Execution: launch Lane A first. After contracts land, launch B + C + D in parallel. Merge auth/backend contracts before startup frontend integration. Finish with cross-lane Playwright and deployment smoke tests.
- Conflict flags: Lanes A and D both touch root scripts/CI; coordinate ownership. Lanes B and C share only contracts after Lane A, so avoid editing `packages/contracts/` concurrently.

## Implementation Tasks

Synthesized from this review's findings. Each task derives from a specific finding above.

- [ ] **T1 (P1, human: ~1 day / Codex: ~2–3h)** — Foundation — Add contracts, strict lint, tests, coverage, and CI gates.
  - Surfaced by: Q1, Q4, T1, T2.
  - Files: `package.json`, `eslint.config.js`, `packages/contracts/`, test configs, `.github/`.
  - Verify: `npm run lint && npm test && npm run build`.
- [ ] **T2 (P1, human: ~1 day / Codex: ~2–3h)** — Backend — Split app composition and add the complete API safety boundary.
  - Surfaced by: A7 and Q2.
  - Files: `backend/server.js`, backend app/config/middleware/routes modules.
  - Verify: Supertest imports the app without listening; boundary tests cover 400/404/413/429/500.
- [ ] **T3 (P1, human: ~2–3 days / Codex: ~5–8h)** — Authentication — Replace bearer JWT/localStorage with secure Mongo-backed sessions.
  - Surfaced by: A2, Q6, Q7, Q8.
  - Files: backend auth/session modules and frontend auth/router/API modules.
  - Verify: session lifecycle integration tests and Playwright password-login journeys.
- [ ] **T4 (P1, human: ~1–2 days / Codex: ~3–5h)** — OAuth — Implement real Google OAuth and account-link rules.
  - Surfaced by: A1.
  - Files: backend OAuth/auth modules, frontend login/signup routes, environment examples.
  - Verify: success, denial, forged state, replay, and account-link conflict tests.
- [ ] **T5 (P1, human: ~2 days / Codex: ~4–6h)** — Identity — Implement four-value multi-role identity and professional membership boundaries.
  - Surfaced by: A3.
  - Files: backend user/profile/membership models, shared contracts, onboarding UI.
  - Verify: role validation, add/remove role authorization, profile and membership tests.
- [ ] **T6 (P2, human: ~1 day / Codex: ~2–3h)** — Frontend foundation — Adopt code-based routing, guarded navigation, API client, and development-only demo fixtures.
  - Surfaced by: Q3, Q5, Q6, Q8.
  - Files: frontend router, auth routes, API modules, demo fixtures.
  - Verify: production credential scan, safe return-path tests, timeout/abort tests.
- [ ] **T7 (P1, human: ~3–5 days / Codex: ~6–10h)** — Startup domain — Add persistent startup and membership REST APIs.
  - Surfaced by: A5.
  - Files: backend startup/membership models, services, controllers, routes, shared contracts.
  - Verify: Supertest + isolated Mongo tests for list/detail/create/edit/auth/cursor paths.
- [ ] **T8 (P1, human: ~2–3 days / Codex: ~4–6h)** — Startup UI — Replace static companies with resilient API-backed discovery.
  - Surfaced by: A5 and test coverage diagram.
  - Files: frontend startup routes, components, API modules, removal of production fixture data.
  - Verify: React tests plus Playwright discovery and startup-management journeys.
- [ ] **T9 (P2, human: ~1 day / Codex: ~2–3h)** — Performance — Make password work asynchronous and split frontend routes.
  - Surfaced by: P1 and P2.
  - Files: backend password utilities/auth service, frontend router/build configuration.
  - Verify: auth concurrency test and CI bundle budgets.
- [ ] **T10 (P1, human: ~2–3 days / Codex: ~4–6h)** — Delivery — Build independent frontend/backend deploy and rollback pipelines.
  - Surfaced by: A6 and revised D9.
  - Files: deployment configuration, CI workflows, env examples, health endpoints, README.
  - Verify: staged deploy, cross-origin session smoke test, independent rollback drill.
- [ ] **T11 (P2, human: ~2h / Codex: ~30min)** — Migration — Remove Lovable integration only after replacement delivery passes.
  - Surfaced by: A4 and D7.
  - Files: `.lovable/`, Lovable-specific dependencies/config, README.
  - Verify: frontend/backend CI and rollback evidence exists before removal.

## Completion Summary

- Step 0: Scope Challenge — scope reduced to staged milestones.
- Architecture Review: 8 issues found, all decisions resolved.
- Code Quality Review: 8 issues found, all decisions resolved.
- Test Review: diagram produced, 101 gaps identified and folded into the test plan.
- Performance Review: 2 issues found, all decisions resolved.
- NOT in scope: written.
- What already exists: written.
- TODOS.md updates: 2 items proposed and accepted.
- Failure modes: 0 unresolved critical gaps in the accepted plan; current working tree remains unverified until implementation.
- Outside voice: skipped because this session is already running under Codex; nested Codex passes are disabled.
- Parallelization: 4 lanes, 3 can run in parallel after the contracts foundation.
- Lake Score: 18/21 scored recommendations chose the 10/10 complete option; the three deliberate exceptions were Lovable exit, password-recovery deferral, and code-based routing.
- Retrospective: prior commits built the landing/auth/dashboard Phase 1; the current migration rewrites those same areas without regression tests, so parity tests are mandatory before deletion.
- Durable learning: NEXVENTURE is strict JavaScript MERN, uses four multi-selectable roles, deploys frontend/backend separately, and exits Lovable only after replacement delivery is proven.

## Presentation UI acceleration — 2026-08-26

### Objective and design call

- Prioritized a presentation-safe frontend journey for today: landing page → startup discovery → login/signup → role workspace.
- Applied the `frontend-design` direction as a refined venture-intelligence desk: warm paper background, dark ink, high-signal blue/violet/cyan accents, editorial discovery typography, glass workspace panels, and restrained motion.
- Preserved the already strong startup-directory layout instead of replacing it. The directory, filters, sorting, saving, responsive cards, auth layouts, and workspace shell were visually inspected before making targeted changes.
- Kept the architecture strict JavaScript MERN. A temporary development fallback was added in this pass and fully removed by the backend-integration correction documented below.

### Implemented changes

- `frontend/src/lib/auth.jsx` (superseded later the same day)
  - Initially added development-only local sessions for the four roles to unblock the presentation.
  - This fallback was subsequently removed; all signup, login, and session restoration now require the real backend.
- `frontend/src/routes/login.jsx`
  - Kept the four role cards as the fastest presentation entry point.
  - Removed the misleading password-reset modal and simulated success state.
  - Replaced it with an honest “Secure recovery coming soon” status until the secure token/email flow in `TODOS.md` is implemented.
- `frontend/src/routes/_authenticated/dashboard.jsx`
  - Added role-specific dashboard headlines, summaries, KPIs, and signals for all four roles.
  - Added responsive KPI cards and current upcoming-event dates.
  - Verified the Founder workspace visually on desktop and mobile.

### Calls and evidence

| Call                                                    | Result / decision                                                                                                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev:frontend`                                  | Initially started on `http://localhost:8081` because port 8080 was occupied; later restarted cleanly on the expected `http://localhost:8080`.        |
| In-app browser bootstrap                                | Failed with a sandbox metadata error; switched to the local gstack headless browser for visual QA.                                                   |
| Browser audit: `/`, `/startups`, `/login`, `/dashboard` | All pages returned HTTP 200 and rendered without page failures.                                                                                      |
| Browser interaction: Founder quick-login                | Passed; navigated from `/login` to `/dashboard` and rendered Sarah Chen’s Founder workspace.                                                         |
| Desktop screenshots                                     | Landing, startup directory, login, and Founder dashboard captured under `/private/tmp/nexventure-*.png`.                                             |
| Mobile viewport `390x844`                               | Dashboard and startup directory verified; navigation collapses correctly and content remains readable with no horizontal overflow.                   |
| `npm run dev:backend`                                   | Watch mode failed with `EMFILE: too many open files`; this is an environment/watch-limit issue.                                                      |
| `node backend/server.js`                                | Sandboxed startup could not access local MongoDB. A later unrestricted probe proved Mongo was healthy and the real backend was started successfully. |
| `npm run lint`                                          | Initial run found two formatting-only issues; both were corrected. Final run passed.                                                                 |
| `npm run build`                                         | Passed: 543 modules, CSS 59.43 kB (10.37 kB gzip), JS 527.09 kB (161.32 kB gzip). Vite still reports the already-planned >500 kB chunk warning.      |
| `git diff --check`                                      | Repository-wide check reports pre-existing CRLF whitespace in root config files; scoped check for the UI files and this log passes.                  |

### Presentation route

1. Open `http://localhost:8080`.
2. Show the landing ecosystem story and open **Explore Startups**.
3. Demonstrate search, sorting, filters, and bookmarking in the startup directory.
4. Open **Signup**, create a real account, then show the Mongo-backed login and dashboard flow.
5. Use **Explore** in the workspace sidebar to show the Mongo-backed startup catalog.

### Remaining functionality boundary

- The UI is presentation-ready. Mongo-backed password authentication and startup discovery are connected; secure cookie sessions, real Google OAuth, messaging, events, mentor booking, applications, and fundraising workflows remain implementation work under milestones T1–T10 above.
- Sidebar items without a route are still visual placeholders. Dashboard data is representative local data, not persisted production data.

## Visible landing-page redesign — 2026-08-26

This pass was triggered by direct feedback that the earlier work did not look visually different. The prior pass had primarily improved authentication reliability and dashboard content while preserving the existing landing-page design. This pass intentionally replaces that presentation surface with a clearly different visual system.

### New visual direction

- Replaced the generic light purple-gradient presentation with a high-contrast editorial “dealroom” identity.
- New palette: midnight ink, warm paper, acid signal green, and coral proof accents.
- New signature composition: oversized asymmetric headline paired with a live startup dealroom rather than orbiting glass cards.
- New typography treatment uses tightly tracked display type plus editorial serif italics for contrast.
- Motion remains restrained and respects `prefers-reduced-motion`.

### Visual files changed

- `frontend/src/components/nex/Hero.jsx` — completely replaced with the dark editorial hero, live Aerloop dealroom, network pulse, and four-role rail.
- `frontend/src/components/nex/Navbar.jsx` — replaced the transparent/light navigation treatment with a dark floating navigation capsule, beta marker, and acid CTA.
- `frontend/src/components/nex/Trust.jsx` — replaced glass partner pills with a compact acid-green trust strip.
- `frontend/src/components/nex/Features.jsx` — replaced six gradient glass cards with a numbered editorial capability index.
- `frontend/src/components/nex/Stats.jsx` — replaced the white glass stat card with a full-width dark network-density grid.
- `frontend/src/components/nex/Testimonials.jsx` — replaced four generic cards with large outcome-led editorial proof rows.
- `frontend/src/components/nex/CTA.jsx` — replaced the pastel glass CTA with a large acid-green “Enter the room” conversion panel.
- `frontend/src/styles.css` — added landing texture, selection colors, and reduced-motion handling.

### Verification calls

| Call                          | Result                                                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                | Passed after formatting the redesigned components.                                                                                                    |
| `npm run build`               | Passed; 543 modules transformed. Existing route-splitting warning remains tracked.                                                                    |
| Browser render at `1440x1000` | New hero rendered with dark dealroom identity, live metrics panel, acid CTA, and no layout failure.                                                   |
| Browser render at `390x844`   | New hero and navigation remain readable with correct stacking and no horizontal overflow.                                                             |
| Local server restart          | Port 8081 server stopped; presentation server now runs at `http://localhost:8080`.                                                                    |
| Visual artifacts              | `/private/tmp/nexventure-redesign-hero.png`, `nexventure-redesign-features.png`, `nexventure-redesign-cta.png`, and `nexventure-redesign-mobile.png`. |

## Backend and section integration correction — 2026-08-26

### Confirmed root causes

1. Landing section links used router hash navigation. Browser reproduction showed scrolling occurred, but the fixed navigation and animated reveal states made the result fragile and hard to distinguish. Native anchors plus explicit scroll offsets provide deterministic section navigation.
2. Shared mock accounts were active in three independent places: frontend local-session fallback code, visible login credential cards, and development records seeded into MongoDB.
3. The backend was not broken. MongoDB was installed and running on `127.0.0.1:27017`; earlier connection failures came from starting Node inside the restricted sandbox. The frontend-only Vite process also meant no API was available on port 5050.
4. The startup directory read `frontend/src/data/companies.js` directly, so it looked functional while bypassing Express and MongoDB entirely.

### Authentication and API changes

- Removed all frontend local/demo authentication from `frontend/src/lib/auth.jsx`.
- Removed mock credential cards and mock-email imports from `frontend/src/routes/login.jsx`.
- Removed fake Google buttons from login and signup until real OAuth credentials are configured.
- Disabled the fake backend Google-user creation and fake password-reset success responses; both endpoints now return explicit HTTP 501 responses.
- Removed automatic demo-user seeding from backend startup and deleted `backend/config/seed.js`.
- Removed the demo email/password constants from `frontend/src/utils/enums.js`.
- Deleted exactly five known mock user records from local MongoDB. Result: `deletedCount: 5`; verification: `mockCount: 0`.
- Added development CORS support for both `localhost:8080` and `127.0.0.1:8080` while preserving the configured production origin.
- Changed backend development startup from `node --watch` to `node server.js` because Node watch mode failed with `EMFILE` in this workspace.

### Section-navigation changes

- Landing section navigation now uses native `href="#section"` anchors for Home, Explore, Investors, Mentors, Events, and About.
- Added smooth scrolling and an 88px section scroll offset so the fixed navigation does not cover section headings.
- Browser regression results:
  - Explore → `#features`, section top `88px`, first article opacity `1`.
  - Investors → `#investors`, section rendered and visible.
  - Events → `#cta`, CTA reveal opacity `1`.

### Mongo-backed startup directory

- Added `backend/models/Startup.js` with the current discovery-card fields and indexed signal fields.
- Added `GET /api/v1/startups` through a controller and Express route.
- Added `backend/scripts/importStartups.js` and imported the 12 curated catalog records into MongoDB using idempotent upserts.
- Added `frontend/src/lib/api/startupClient.js` and connected `/startups` to the API.
- Removed runtime use of the frontend `COMPANIES` fixture from the directory.
- Added loading skeletons, explicit backend-error UI, and a retry action.
- Deduplicated the development catalog request so React Strict Mode does not issue duplicate API calls.

### Commands and verification evidence

| Call                                     | Result                                                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `mongosh ... db.runCommand({ ping: 1 })` | `{ ok: 1 }`; local MongoDB healthy.                                                                                          |
| Backend start outside sandbox            | `MongoDB connected: 127.0.0.1/nexventure`; API listening on port 5050.                                                       |
| `GET /api/v1/health`                     | HTTP 200; database `state: connected`, `isConnected: true`, `lastError: null`.                                               |
| Removed mock Founder login               | HTTP 401 with `Invalid email or password.`                                                                                   |
| Real temporary account signup            | HTTP 201; user persisted in MongoDB.                                                                                         |
| Real `/auth/me` session restoration      | HTTP 200 with the created Mongo user.                                                                                        |
| Real account login                       | HTTP 200; frontend navigated to `/dashboard`.                                                                                |
| Temporary integration user cleanup       | `deletedCount: 1`; no test account left behind.                                                                              |
| Startup catalog import                   | `12 inserted, 0 updated`.                                                                                                    |
| `GET /api/v1/startups`                   | HTTP 200, `count: 12`, first company `Aerloop`.                                                                              |
| Browser `/startups` check                | 12 rendered company cards, backend unavailable state false, real port-5050 request observed.                                 |
| Browser removed-mock check               | Stayed on `/login`, no Demo credentials text, invalid mock credentials visibly rejected.                                     |
| `npm test`                               | 1 integration suite passed: mock rejection, signup, login, `/auth/me`, unavailable fake endpoints, startup API, and cleanup. |
| `npm run lint`                           | Passed.                                                                                                                      |
| `npm run build`                          | Passed; existing >500 kB route-splitting warning remains.                                                                    |

### Still not implemented

- Google OAuth needs provider credentials and callback configuration; no fake substitute remains.
- Password recovery needs signed single-use tokens plus an email provider; no fake success remains.
- Startup creation/editing, memberships, messaging, events, mentor booking, applications, fundraising workflows, and persistent bookmarks remain future vertical slices.

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                        | Runs | Status  | Findings                                                             |
| ------------- | --------------------- | -------------------------- | ---: | ------- | -------------------------------------------------------------------- |
| CEO Review    | `/plan-ceo-review`    | Scope and strategy         |    0 | —       | Not run                                                              |
| Codex Review  | `/codex review`       | Independent second opinion |    0 | SKIPPED | Running under Codex; nested pass disabled                            |
| Eng Review    | `/plan-eng-review`    | Architecture and tests     |    1 | CLEAR   | 20 issues/gaps folded into a staged plan; 0 unresolved critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps                 |    0 | —       | Not run                                                              |
| DX Review     | `/plan-devex-review`  | Developer experience       |    0 | —       | Not run                                                              |

**VERDICT:** ENG CLEARED — ready to implement Milestone 0; the current working tree itself is not ready to ship.

NO UNRESOLVED DECISIONS
