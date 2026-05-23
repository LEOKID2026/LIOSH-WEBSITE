# Cookie / Session / CSRF Audit Plan

**Generated:** 2026-05-23
**Risk rows:** R-COOKIE-01 (P1), R-CSRF-01 (P1), R-AUTH-04 (P2)

## Goal

Confirm posture of the student session cookie, the parent bearer's client-side storage, and CSRF defenses on state-changing endpoints. **Read-only audit.**

## Cookie posture (target — to confirm in next pass)

| Cookie | Issuer | Required flags | Notes |
|--------|--------|----------------|-------|
| Student session cookie (`lib/learning-supabase/student-auth.js` family) | `/api/student/login` | `HttpOnly`, `Secure` (in prod), `SameSite=Lax` minimum (`Strict` preferred since flow stays on first party), `Path=/`, finite `Max-Age` | confirm name + flags by reading the handler |
| Parent Supabase auth | `@supabase/supabase-js` SDK | follow Supabase defaults (typically client-side localStorage); avoid mixing with `HttpOnly` cookie unless Supabase SSR helper is used | confirm whether SSR cookie helper is in use |
| Dev simulator session | `/api/dev-student-simulator/*` | dev-only; flags less critical; route 404s in prod | see [DEV_ROUTE_HARDENING_PLAN.md](./DEV_ROUTE_HARDENING_PLAN.md) |

## Audit checklist (per cookie)

1. Inspect `Set-Cookie` headers emitted by the issuing route — record name + flags.
2. Confirm `HttpOnly` (true ⇒ JS cannot read it ⇒ XSS cannot exfiltrate).
3. Confirm `Secure` is set when `NODE_ENV === 'production'`.
4. Confirm `SameSite` value; record reasoning.
5. Confirm `Max-Age` and `Path`.
6. Confirm a logout path **clears** the cookie (not just removes server state).

## Session lifecycle (R-AUTH-04)

| Question | Audit method |
|----------|--------------|
| What is the student session lifetime? | read handler |
| Can a parent revoke a student session? | read parent UI / API |
| Does logging in on device 2 invalidate device 1? | reason from token model |
| What happens if the access PIN is rotated mid-session? | read PIN-rotation handler in `/api/parent/create-student-access-code` |

If revocation is missing, add a register row (R-AUTH-05; create when confirmed) with `pilot:accept`, `public:fix-before`.

## CSRF posture (R-CSRF-01)

State-changing routes that **must** have a CSRF defense:

| Route | Method | Auth | CSRF defense (target) |
|-------|--------|------|-----------------------|
| `/api/student/login` | POST | none → cookie | SameSite=Lax cookie + Origin check + content-type guard |
| `/api/student/logout` | POST | session cookie | SameSite cookie sufficient; Origin check |
| `/api/parent/create-student` | POST | bearer | bearer in `Authorization` header → not vulnerable to classic CSRF; ensure no cookie-based fallback |
| `/api/parent/update-student` | POST | bearer | same |
| `/api/parent/delete-student` | POST | bearer | same |
| `/api/parent/create-student-access-code` | POST | bearer | same; double-submit token optional |
| `/api/parent/copilot-turn` | POST | bearer or cookie | if cookie path used, require Origin check |
| `/api/learning/session/start`, `/answer`, `/finish`, `/planner-recommendation` | POST | session cookie | SameSite + Origin check |
| `/api/arcade/*` (mutating) | POST | session cookie | same |
| `/api/student/dev-add-coins` | POST | DEV-ONLY | n/a in prod (404) |

### Origin / Referer check policy

For cookie-authenticated mutating routes, require **at least one** of:

- `Origin` header equals an allowlisted origin (production domain + preview domain).
- `Referer` header starts with allowlisted origin.

Reject otherwise with 403.

Cross-reference: [CORS_ORIGIN_AUDIT_PLAN.md](./CORS_ORIGIN_AUDIT_PLAN.md).

### CSRF token (optional, defense-in-depth)

- For high-value parent surfaces (`update-student`, `delete-student`), add a per-session CSRF token in a non-`HttpOnly` cookie + matching header (double-submit pattern). Optional; `SameSite=Lax` + bearer is the primary defense.

## XSS-tied risk

Bearer / session cookies are only safe to the extent the page does not have XSS. See [XSS_INPUT_OUTPUT_AUDIT_PLAN.md](./XSS_INPUT_OUTPUT_AUDIT_PLAN.md) and [SECURITY_HEADERS_CSP_PLAN.md](./SECURITY_HEADERS_CSP_PLAN.md) (CSP closes the post-XSS exfil path).

## Acceptance for next fix pass (cookie/session/CSRF slice)

- Student session cookie has `HttpOnly`, `Secure` (prod), `SameSite` documented value.
- Origin check active on every cookie-authenticated mutating route.
- Logout clears cookie + server state (verified test artifact under `reports/security/cookie-csrf/<date>/`).
- Session lifetime + revocation behavior documented.
- R-COOKIE-01 + R-CSRF-01 may move toward `fixed` once these artifacts exist.
