# Dev / Admin / Simulator Route Hardening Plan

**Generated:** 2026-05-23
**Risk rows:** R-DEV-01 (P0), R-DEV-02 (P0), R-AUTH-02 (P1), R-AUTH-03 (P1), R-DBG-01 (P2)
**Companion to:** [API_ROUTE_SECURITY_INVENTORY_PLAN.md](./API_ROUTE_SECURITY_INVENTORY_PLAN.md)

## Wave allocation (post-2026-05-23 owner ENV deferral)

This doc has two kinds of actions:

- **Code-only, allowed in Wave 1.** Adds a runtime hard-disable inside each handler using the **existing** `process.env.NODE_ENV === 'production'` value. Reads env, does **not** modify, rename, or rotate any env value. Does not change any flag's semantics. Allowed under the current scope.
- **ENV-side, deferred to Final ENV phase.** Pipeline pre-deploy preflight that *reads* deployed env state to fail bad combinations; rotation of `ENGINE_REVIEW_ADMIN_TOKEN` placeholder; replacing `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN` authority with a server-only flag. **Forbidden** in current waves.

## Goal

Every dev / admin / simulator surface must be one of:

- **Hard-removed in production** (route returns 404 because handler short-circuits on `process.env.NODE_ENV === 'production'`), OR
- **Server-token gated** with a strong, server-only token + timing-safe compare.

`NEXT_PUBLIC_*` flags must **never** be used as the authority for these surfaces.

## Routes / pages to harden

### Class A — must hard-404 in production

| Surface | Reason | Risk |
|---------|--------|------|
| `/api/student/dev-add-coins` | mutates balance via dev path; embeds hardcoded secret in source today | **R-DEV-01 (P0)** |
| `/api/dev-student-simulator/login` | dev student session issuer | **R-DEV-02 (P0)** |
| `/api/dev-student-simulator/logout` | paired with login | R-DEV-02 |
| `/learning/dev-student-simulator` | dev UI | R-DEV-02 |
| `/learning/dev-db-report-preview` | dev DB peek | R-DEV-02 |
| `/learning/dev/engine-review` | admin UI gated by `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN` | R-AUTH-02 |

### Class B — must require server-only admin token + timing-safe compare

| Surface | Required header | Risk |
|---------|------------------|------|
| `/api/learning-simulator/engine-review-pack-status` | `Authorization: Bearer ${ENGINE_REVIEW_ADMIN_TOKEN}` | R-AUTH-02/03 |
| `/api/learning-simulator/generate-expert-review-pack` | same | R-AUTH-03 |
| `/api/admin/monthly-persistence-award` | server-only admin token | R-AUTH-03 |
| ~~`/api/learning-supabase/health`~~ | *(removed)* | R-DBG-01 closed — no dedicated health route |

## Hardening pattern (target — applied in next fix pass, not now)

```js
// Pattern: hard-404 in production
export default async function handler(req, res) {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).end();
    return;
  }
  // ... dev handler
}

// Pattern: admin-token gate with timing-safe compare
import { timingSafeEqual } from 'node:crypto';
function isAdmin(req) {
  const expected = process.env.ENGINE_REVIEW_ADMIN_TOKEN || '';
  const got = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!expected || expected.length !== got.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(got));
}
```

> Code shown for planning purposes only — **do not apply in this pass.**

## Env flag policy

> **DEFERRED-BY-OWNER — FINAL PRE-LAUNCH ENV REVIEW / ROTATION.** Any change to a flag's name, value, or authority semantics is forbidden in current waves. The table below is the **target state** to be implemented during the Final ENV phase.

| Flag | Today | Target (Final ENV phase) |
|------|-------|--------------------------|
| `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN` | gates UI **and** authority | UI hint only; authority moves to server-only `ENGINE_REVIEW_ADMIN_ENABLED` (or simply: route exists when token present) |
| `ENGINE_REVIEW_ADMIN_TOKEN` | in `.env.example` with placeholder `7479` | rotate; remove placeholder; document as "32+ random bytes" in [ENV_SECRETS_AUDIT_PLAN.md](./ENV_SECRETS_AUDIT_PLAN.md) |
| `NEXT_PUBLIC_ARCADE_DEBUG` | dev hint | UI hint only; never authority |
| `PARENT_COPILOT_ALLOW_UNAUTH_LOCAL_PAYLOAD` | dev convenience | server enforces `process.env.NODE_ENV !== 'production'` regardless of value (see [PARENT_COPILOT_SECURITY_PLAN.md](./PARENT_COPILOT_SECURITY_PLAN.md)) |
| `PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION` | emergency operator escape | must be unset/false in public production; verified pre-launch |
| `ARCADE_ALLOW_FOUNDATION_ACTIONS` | testing-only | confirm off in public production |
| `NEXT_PUBLIC_DEBUG_STUDENT_IDENTITY` | noisy logs | confirm off in public production |

> Note: the runtime handler check `if (process.env.NODE_ENV === 'production') return 404;` only **reads** `NODE_ENV` and is allowed in Wave 1 — it does not change any env value or any other flag.

## Pipeline / pre-launch checklist (target)

> **DEFERRED-BY-OWNER — FINAL PRE-LAUNCH ENV REVIEW / ROTATION.** Implementation belongs to the Final ENV phase, not Wave 1 or Wave 2.

A pre-deploy script reads the production environment and **fails the deploy** if any of the following are true:

- `NODE_ENV !== 'production'`
- `PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION === 'true'`
- `PARENT_COPILOT_ALLOW_UNAUTH_LOCAL_PAYLOAD === 'true'`
- `NEXT_PUBLIC_ENABLE_PARENT_COPILOT_ON_SHORT === 'true'` (until server snapshot ships)
- `ARCADE_ALLOW_FOUNDATION_ACTIONS === 'true'`
- `NEXT_PUBLIC_DEBUG_STUDENT_IDENTITY === 'true'`
- `ENGINE_REVIEW_ADMIN_TOKEN` matches placeholder `7479`
- `LEARNING_STUDENT_ACCESS_SECRET` empty
- `LEARNING_SUPABASE_SERVICE_ROLE_KEY` empty

> Definition only. **Do not implement now.** Implementing today would either (a) require an env change to make the check pass, or (b) start blocking legitimate deploys before the owner has reviewed deployed env state.

## Dev-only tooling that must stay reachable in development

- The full simulator under `pages/learning/dev-student-simulator.js` and `/api/dev-student-simulator/*` — required by the in-progress nightly. Must work when `NODE_ENV !== 'production'`.
- `/learning/dev/engine-review` and `/api/learning-simulator/*` for owner-driven engine reviews.

The hardening pattern keeps both available in dev while ensuring production cannot reach them.

## Acceptance — Wave 1 (allowed now, code-only, no ENV changes)

- All Class A routes verifiably return 404 when `process.env.NODE_ENV === 'production'`.
- Existing dev/admin handlers gain the runtime hard-disable as the **first** statement.
- Class B handlers add `timingSafeEqual` for any token compare (the token value itself is **not** changed).
- Register rows R-DEV-01, R-DEV-02 may move from `known` to `fixed` for the runtime aspect.
- R-AUTH-03 may move toward `fixed` for the timing-safe-compare aspect.

## Acceptance — Final ENV phase (DEFERRED-BY-OWNER)

- Pipeline pre-deploy check active.
- `.env.example` placeholder `7479` rotated and replaced with a clearly fake non-numeric placeholder.
- `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN` authority moved to a server-only flag (R-AUTH-02 final closure).
- Register rows R-AUTH-02 (env-flag-authority) and R-DEV-01 (placeholder rotation) achieve full closure here.
