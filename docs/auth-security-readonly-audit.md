# Auth Security Read-Only Audit

Date: 2026-05-04  
Mode: read-only audit (no fixes implemented)  
Scope: parent auth, student auth, username/PIN login, session handling, logout, ownership checks, service role usage, env exposure, dev/simulator routes, Supabase client/server split.

## Critical Risks

### 1) Dev coin top-up API with hardcoded secret
- Risk: Critical
- Why: `pages/api/student/dev-add-coins.js` contains hardcoded `DEV_TOPUP_SECRET_CODE` and mutates balance using elevated path.
- Files involved:
  - `pages/api/student/dev-add-coins.js`
  - `lib/arcade/server/arcade-coins.js`
- Recommended fix later:
  - Disable route in production (`NODE_ENV` hard gate).
  - Remove hardcoded secret from source and use strong server-only secret.
  - Add rate limit and audit logs for any dev override path.

### 2) Student username/PIN brute-force exposure
- Risk: Critical
- Why: 4-digit PIN login flow can be brute-forced without clear visible lockout/rate limiting in API layer.
- Files involved:
  - `pages/api/student/login.js`
  - `pages/api/parent/create-student-access-code.js`
  - `lib/learning-supabase/student-auth.js`
- Recommended fix later:
  - Add per-IP and per-student-code rate limits.
  - Add progressive lockout/backoff.
  - Consider stronger student secret policy for production.

## High Risks

### 3) Engine review status endpoint appears weakly gated
- Risk: High
- Why: `engine-review-pack-status` appears controlled by public flag, not strict admin token.
- Files involved:
  - `pages/api/learning-simulator/engine-review-pack-status.js`
  - `pages/api/learning-simulator/generate-expert-review-pack.js`
- Recommended fix later:
  - Require server-only admin token for status route as for generation route.
  - Replace `NEXT_PUBLIC_*` gate for privileged behavior with server-only env flag.

### 4) Public env flags used in privileged controls
- Risk: High
- Why: Admin/dev behavior controlled by `NEXT_PUBLIC_ENABLE_*` values can leak enablement state and create accidental exposure.
- Files involved:
  - `pages/learning/dev/engine-review.js`
  - `pages/api/learning-simulator/engine-review-pack-status.js`
  - `pages/api/learning-simulator/generate-expert-review-pack.js`
  - `pages/learning/dev-db-report-preview.js`
- Recommended fix later:
  - Move authorization gates to server-only env vars.
  - Keep `NEXT_PUBLIC_*` for UI hints only, not access control.

### 5) Copilot multi-auth modes need strict production hardening
- Risk: High
- Why: Copilot route includes parent bearer, student session, and optional local unauth/dev paths.
- Files involved:
  - `pages/api/parent/copilot-turn.js`
  - `lib/parent-copilot/copilot-turn-payload.server.js`
- Recommended fix later:
  - Force deny unauthenticated mode by default.
  - Add defense-in-depth ownership checks inside server-side payload rebuild.
  - Add runtime guardrails preventing unsafe prod flags.

## Medium Risks

### 6) Unauthenticated Hebrew utility endpoints
- Risk: Medium
- Why: Text/audio utilities may allow abuse, unexpected cost, or sensitive text processing without auth quotas.
- Files involved:
  - `pages/api/hebrew-nakdan.js`
  - `pages/api/hebrew-audio-ensure.js`
  - `pages/api/hebrew-audio-stream.js`
  - `pages/api/hebrew-audio-artifact.js`
- Recommended fix later:
  - Add auth or robust rate limits and abuse protections.
  - Add request caps and telemetry alerts.

### 7) Broad service-role usage can magnify ownership bugs
- Risk: Medium
- Why: Multiple APIs rely on service role queries; one missing ownership filter can become cross-tenant leak.
- Files involved:
  - `pages/api/student/login.js`
  - `pages/api/learning/session/start.js`
  - `pages/api/learning/answer.js`
  - `pages/api/learning/session/finish.js`
  - `lib/arcade/server/arcade-auth.js`
  - `pages/api/parent/students/[studentId]/report-data.js`
- Recommended fix later:
  - Add explicit automated tests for ownership checks.
  - Minimize service-role reads where user-scoped client is enough.

### 8) Token comparison hardening opportunity
- Risk: Medium
- Why: Admin token compare appears plain equality check.
- Files involved:
  - `pages/api/learning-simulator/generate-expert-review-pack.js`
- Recommended fix later:
  - Use timing-safe comparison logic (`timingSafeEqual`) with strict length checks.

## Low Risks

### 9) Environment sample values encourage weak defaults
- Risk: Low
- Why: `.env.example` contains weak illustrative token style that can be copied into real env.
- Files involved:
  - `.env.example`
- Recommended fix later:
  - Use non-guessable placeholder examples and explicit generation instructions.

### 10) Dev simulator exposure if flag misconfigured
- Risk: Low
- Why: Dev simulator is feature-flag protected; operational risk exists if production flag accidentally enabled.
- Files involved:
  - `pages/learning/dev-student-simulator.js`
  - `pages/api/dev-student-simulator/login.js`
  - `pages/api/dev-student-simulator/logout.js`
  - `utils/server/dev-student-simulator-auth.js`
- Recommended fix later:
  - Add environment policy checks in deployment pipeline to block unsafe flag combos.

## Ownership / Access Checks Summary

### Parent auth and report ownership
- Observed: parent APIs generally enforce bearer token and parent-scoped student filtering.
- Key files:
  - `pages/api/parent/create-student.js`
  - `pages/api/parent/list-students.js`
  - `pages/api/parent/update-student.js`
  - `pages/api/parent/students/[studentId]/report-data.js`
- Follow-up: add negative tests that parent cannot fetch another parent's student/report.

### Student auth and session handling
- Observed: student login, cookie session, and logout paths exist with hashed token/session flow.
- Key files:
  - `pages/api/student/login.js`
  - `pages/api/student/me.js`
  - `pages/api/student/logout.js`
  - `lib/learning-supabase/student-auth.js`
- Follow-up: add brute-force protections and explicit session expiry/revocation tests.

### Student-to-parent data boundary
- Observed: learning and arcade flows appear student-scoped by session identity.
- Key files:
  - `pages/api/learning/session/start.js`
  - `pages/api/learning/answer.js`
  - `pages/api/learning/session/finish.js`
  - `pages/api/arcade/*`
- Follow-up: add cross-tenant test suite proving student cannot access parent/private student data.

## Supabase Client/Server Separation
- Client-side Supabase usage observed in browser helpers (`anon` and public env usage).
- Server-side sensitive operations use server utilities/service role helpers.
- Recommended fix later:
  - Keep strict rule: never expose service role to client, never use `NEXT_PUBLIC_*` as access-control authority.

## APIs That Need Explicit Re-Verification After Simulation
- `/api/student/login`
- `/api/student/dev-add-coins`
- `/api/learning-simulator/engine-review-pack-status`
- `/api/parent/copilot-turn`
- `/api/parent/students/[studentId]/report-data`
- `/api/hebrew-nakdan`
- ~~`/api/learning-supabase/health`~~ *(removed)*

## Important
- No fixes implemented in this phase.
- This document is intentionally action-oriented for post-simulation blocker-only remediation.
