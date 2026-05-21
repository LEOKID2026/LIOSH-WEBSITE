# Launch Readiness Checklist (Hebrew Learning Website)

> **Automated certification (2026-05-21):** See **[FULL_LAUNCH_READINESS_STATUS.md](./FULL_LAUNCH_READINESS_STATUS.md)** for the closed gate record, command table, and re-run instructions. This file remains the **manual** browser/product-flow checklist for owner smoke before public rollout.

Scope: documentation-only pre-launch checklist prepared during running simulation.

## Product Flows And Features

### Parent account flow
- Status: unchecked
- Risk level: critical
- How to verify: Login with valid parent account, confirm redirect to `parent/dashboard`, confirm protected APIs respond with parent-scoped data only.
- Launch blocker: yes

### Student username/PIN login flow
- Status: unchecked
- Risk level: critical
- How to verify: Login via student username/access-code + PIN, verify session cookie set, verify invalid PIN handling, verify brute-force protections.
- Launch blocker: yes

### Parent creates student
- Status: unchecked
- Risk level: high
- How to verify: Create new student from parent flow, validate record appears only under same parent, validate generated access code/PIN onboarding works.
- Launch blocker: yes

### Student access restrictions
- Status: unchecked
- Risk level: critical
- How to verify: As student, attempt parent pages and parent APIs; confirm deny; verify student can access only own session/content.
- Launch blocker: yes

### Parent report short view
- Status: unchecked
- Risk level: high
- How to verify: Render short report from parent account for own student, validate no null/undefined placeholders, validate ownership and date-range behavior.
- Launch blocker: yes

### Parent report detailed view
- Status: unchecked
- Risk level: high
- How to verify: Render detailed report with same parent/student, validate topic sections, weak-data messaging, ownership boundaries, and print-safe layout.
- Launch blocker: yes

### Parent PDF short
- Status: unchecked
- Risk level: medium
- How to verify: Export/print short report to PDF, verify Hebrew rendering, RTL, page breaks, and no clipped content/buttons.
- Launch blocker: no

### Parent PDF detailed
- Status: unchecked
- Risk level: high
- How to verify: Export/print detailed report and summary print mode, validate complete sections and disclaimer visibility.
- Launch blocker: yes

### Parent Copilot
- Status: unchecked
- Risk level: critical
- How to verify: Call Copilot as authenticated parent, verify student scoping and response safety tone, verify unauthenticated paths blocked in production settings.
- Launch blocker: yes

### Parent AI insight
- Status: unchecked
- Risk level: high
- How to verify: Inspect insight text in short/detailed reports for clarity, non-diagnostic tone, and consistency with available evidence.
- Launch blocker: yes

### Practice flow
- Status: unchecked
- Risk level: high
- How to verify: Start learning session, answer questions, finish session, confirm progress writes to correct student only and dashboard/report updates.
- Launch blocker: yes

### Question bank coverage
- Status: unchecked
- Risk level: critical
- How to verify: Run post-simulation question-bank audit plan by subject/grade/topic/subtopic and verify coverage thresholds.
- Launch blocker: yes

### Subject coverage
- Status: unchecked
- Risk level: high
- How to verify: Validate active coverage for Math, Geometry, Hebrew, English, Science, Homeland/Geography across target grades.
- Launch blocker: yes

## Platform QA

### Mobile QA
- Status: unchecked
- Risk level: high
- How to verify: Execute manual mobile checklist on iOS/Android breakpoints for parent/student/report/copilot flows.
- Launch blocker: yes

### RTL QA
- Status: unchecked
- Risk level: high
- How to verify: Validate RTL alignment and Hebrew line wrapping across dashboards, report cards, tables, charts, modals, and PDFs.
- Launch blocker: yes

### Auth/security QA
- Status: unchecked
- Risk level: critical
- How to verify: Execute auth-security readonly audit verification steps and confirm all critical/high items are fixed or explicitly waived.
- Launch blocker: yes

### Supabase production readiness
- Status: unchecked
- Risk level: critical
- How to verify: Confirm RLS posture, secrets hygiene, service-role confinement, environment separation, and migration state readiness.
- Launch blocker: yes

### Vercel production readiness
- Status: unchecked
- Risk level: high
- How to verify: Confirm production env vars, build settings, route exposure, and disable all dev/simulator routes in production environment.
- Launch blocker: yes

### Env/secrets readiness
- Status: unchecked
- Risk level: critical
- How to verify: Validate no weak/default secrets, no leaked service-role values to client, and strict separation of `NEXT_PUBLIC_*` vs server-only env.
- Launch blocker: yes

### Dev routes disabled/protected
- Status: unchecked
- Risk level: critical
- How to verify: Confirm simulator/dev/admin routes and API endpoints return deny/404 in production unless explicitly token-protected.
- Launch blocker: yes

## Final QA Commands (Run Only After Current Simulation Finishes)

### Post-simulation final verification command list
- Status: unchecked
- Risk level: medium
- How to verify: Run only after explicit simulation-finished confirmation:
  - `npm run qa:overnight-parent-ai` (full overnight QA, deferred)
  - targeted auth and report smoke checks
  - targeted mobile/RTL manual pass
  - final regression suite used by release gate
- Launch blocker: yes
