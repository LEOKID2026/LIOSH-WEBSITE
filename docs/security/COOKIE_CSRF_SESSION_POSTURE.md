# Cookie / CSRF / Session Posture (Formal)

**Generated:** 2026-05-23 (Wave 3A)  
**Risk rows:** R-COOKIE-01 (P1), R-CSRF-01 (P1), R-AUTH-04 (P2)  
**Evidence source:** code inspection — not a penetration test

**Companion (planning):** [COOKIE_SESSION_CSRF_AUDIT_PLAN.md](./COOKIE_SESSION_CSRF_AUDIT_PLAN.md)

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Student session cookie flags | **Implemented** | `HttpOnly`, `SameSite=Lax`, `Secure` in production, 7-day `Max-Age` |
| Parent auth | **Bearer (Supabase JWT)** | Client-side Supabase session; not HttpOnly cookie |
| CSRF — cookie routes | **Partially mitigated** | `SameSite=Lax` + production Origin/Referer guard |
| CSRF — parent bearer routes | **Low classic CSRF** | `Authorization` header not sent cross-site by browsers |
| Logout | **Implemented** | Clears cookie + sets `revoked_at`/`ended_at` on session row |
| Session expiry | **Implemented** | 7-day cookie + DB `expires_at` check |
| Parent-initiated revocation | **Partial** | PIN rotation; no “logout all devices” UI for student |
| Local dev | Origin guard **disabled** | `NODE_ENV !== 'production'` skips cross-origin rejection |

**R-COOKIE-01 / R-CSRF-01:** **partially-fixed** (code + this doc). Not `fixed` until live verification artifact + optional formal signoff.

---

## Student session cookie

**Issuer:** `POST /api/student/login`  
**Implementation:** [lib/learning-supabase/student-auth.js](../../lib/learning-supabase/student-auth.js)

| Property | Value |
|----------|--------|
| Name | `liosh_student_session` |
| `HttpOnly` | **Yes** |
| `Secure` | **Yes** when `NODE_ENV === 'production'` |
| `SameSite` | **Lax** |
| `Path` | `/` |
| `Max-Age` | **604800** (7 days) |
| Contents | Opaque session token (not student id) |

**Validation:** [getAuthenticatedStudentSession](../../lib/learning-supabase/student-auth.js) hashes token, loads `student_sessions` row, checks `expires_at`, `revoked_at`, `ended_at`, active student.

---

## Parent auth model

**Flow:** [pages/parent/login.js](../../pages/parent/login.js) → Supabase Auth (`@supabase/supabase-js` browser client)  
**API auth:** `Authorization: Bearer <access_token>` on `/api/parent/*`  
**Storage:** Supabase default client persistence (typically localStorage) — **not** an HttpOnly first-party cookie.

**CSRF implication:** Cross-site forms cannot attach arbitrary `Authorization` headers → classic CSRF against parent JSON APIs is **low** without XSS on the parent origin.

**XSS implication:** XSS on parent pages could exfiltrate bearer token from client storage — mitigate via CSP (Wave 2K) and input hygiene (Wave 2I).

---

## Same-origin / Origin–Referer guards

**Implementation:** [lib/security/same-origin.js](../../lib/security/same-origin.js)

- Applies to mutating methods: `POST`, `PUT`, `PATCH`, `DELETE`  
- **Production only:** returns `true` (allow) when `NODE_ENV !== 'production'`  
- Requires `Origin` match **or** `Referer` prefix match to request host  
- Rejection: **403** `{ code: "cross_origin" }`

**Routes using `guardCookieMutationOrigin`:**

| Route | File |
|-------|------|
| `/api/student/login` | `pages/api/student/login.js` |
| `/api/student/logout` | `pages/api/student/logout.js` |
| `/api/learning/session/start` | `pages/api/learning/session/start.js` |
| `/api/learning/session/finish` | `pages/api/learning/session/finish.js` |
| `/api/learning/answer` | `pages/api/learning/answer.js` |
| `/api/learning/planner-recommendation` | `pages/api/learning/planner-recommendation.js` |
| `/api/student/learning-profile` (PATCH/POST) | `pages/api/student/learning-profile.js` |
| `/api/parent/copilot-turn` | When student session cookie path used |
| Arcade mutating routes | [lib/arcade/server/arcade-auth.js](../../lib/arcade/server/arcade-auth.js) |

**Parent bearer-only routes** (`create-student`, `update-student`, `delete-student`, `create-student-access-code`, etc.): **no** cookie origin guard — rely on bearer + CORS default + no cookie fallback.

---

## State-changing route posture matrix

| Route | Auth | CSRF primary defense | Origin guard |
|-------|------|----------------------|--------------|
| Student login/logout | Cookie (after login) | SameSite + Origin (prod) | Yes |
| Learning session/* | Cookie | SameSite + Origin | Yes |
| Learning answer | Cookie | SameSite + Origin | Yes |
| Student learning-profile | Cookie | SameSite + Origin | Yes |
| Parent CRUD | Bearer | No classic CSRF | No |
| Copilot turn | Bearer **or** cookie | Bearer / SameSite+Origin | Conditional |
| Arcade mutations | Cookie | SameSite + Origin | Yes |
| Dev routes | N/A | 404 in production | N/A |

---

## Logout behavior

**Student:** `POST /api/student/logout`

1. `guardCookieMutationOrigin`  
2. `clearStudentSessionCookie` (`Max-Age=0`)  
3. Updates `student_sessions` with `revoked_at` and `ended_at` for token hash  

**Parent:** Supabase client sign-out in UI (not documented in this pass as server route).

---

## Session expiry and revocation (R-AUTH-04)

| Question | Current behavior | Gap |
|----------|------------------|-----|
| Student session lifetime | 7 days (cookie + DB expiry) | Documented |
| Concurrent devices | New login creates new session row; old rows may remain until expiry/revoke | No global “single session” policy |
| Parent revoke student session remotely | PIN rotation invalidates access code path; existing cookie until logout/expiry | **Gap:** no parent “force logout student” button |
| PIN rotation mid-session | New PIN required on next login; existing session may persist until revoked | Owner product decision |
| Admin session revocation | N/A | — |

**R-AUTH-04** remains **partially-fixed** — lifetime documented; remote revocation UX not shipped.

---

## Local development limitations

- Origin guard **skipped** outside production — cross-origin POSTs from local tools allowed.  
- `Secure` cookie flag **off** on localhost.  
- Do not infer production CSRF posture from dev behavior.

---

## Remaining Final ENV / deployment checks

| Check | Phase |
|-------|--------|
| Production `Secure` cookie on HTTPS deploy | Verify on Vercel prod URL |
| Preview deploy Origin allowlist if using non-production hostnames | Document per preview URL |
| Supabase auth cookie migration (if ever SSR) | Not planned — would be architecture change |
| CSRF double-submit token for high-value parent actions | Optional defense-in-depth — not implemented |
| Session fixation on login | New token issued on each login — OK |

---

## Verification artifacts (future)

- `reports/security/cookie-csrf/<date>/` — captured `Set-Cookie` headers from staging smoke  
- Live cross-origin POST test expecting 403 in production  

Wave 3A provides **documentation closure** only; live capture deferred.
