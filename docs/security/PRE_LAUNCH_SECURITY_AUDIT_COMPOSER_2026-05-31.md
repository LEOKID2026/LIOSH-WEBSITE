# Pre-Launch Security Audit (Investigation Only)

**Agent:** COMPOSER  
**Date:** 2026-05-31  
**Scope:** Full application — auth, APIs, school student admin profile, parent/teacher/student portals, Supabase/RLS posture, env hygiene, headers, rate limits, exports, games/coins, dependencies  
**Mode:** Read-only — no code, SQL, deploy, commit, or env changes

---

## 1. Executive summary

| Item | Result |
|------|--------|
| **Overall verdict** | **YELLOW** |
| **Launch blocked by code alone?** | **No** — authorization patterns for portals and the new school student admin profile are largely sound in application code |
| **Launch blocked by deployment/config?** | **Conditionally yes** — owner must confirm production Vercel env (see §4 and P0 rows below) and apply migration `053` before relying on admin-profile storage |

### Top 5 risks

1. **Production env secrets and flags (deployment)** — `ENGINE_REVIEW_ADMIN_TOKEN` must not be a guessable value if `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN=true`; `PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION` must remain unset/false; all server-only keys must be set only in Vercel (not in git). Historical secret exposure in git history is out of repo scope but still a launch item per [ENV_TRACKING_CLEANUP_CLOSURE.md](./ENV_TRACKING_CLEANUP_CLOSURE.md).
2. **Parent auth in browser storage (architecture)** — Supabase parent sessions use the client SDK (not HttpOnly cookies). Any XSS can exfiltrate Bearer tokens. CSP allows `'unsafe-inline'` scripts in production builds.
3. **Serverless rate limiting (abuse)** — Login, copilot, and many sensitive routes use in-process `consumeRateLimit`; limits do not coordinate across Vercel instances.
4. **Unauthenticated health probe** — `GET /api/learning-supabase/health` is public; production masks table names but still exposes aggregate DB readiness (acceptable for ops, worth conscious exposure decision).
5. **Dev coin bypass in source** — Hardcoded dev top-up code `7479` in tracked source; API returns **404 in production** (`guardDevOnlyApiRoute`), but the public nav can still show the dev coin UI on non-student pages.

### What is clean / closed (repo code)

- Student session cookies: `HttpOnly`, `SameSite=Lax`, `Secure` in production, opaque token, DB revocation on logout and revoked/expired access codes on login.
- School staff cookies: `HttpOnly`, `SameSite=Strict`, `Secure` in production, bounded `Max-Age`.
- Cookie-mutating routes: production Origin/Referer guard (`rejectIfCrossOriginCookieMutation`) when not using Bearer auth.
- Dev-only APIs (`dev-add-coins`, `dev-student-simulator/*`): `rejectIfProductionApi` → 404 in production.
- Service role key: server-only (`LEARNING_SUPABASE_SERVICE_ROLE_KEY`); client bundle uses anon key only.
- Parent Copilot production path: server-rebuilt report payload by default; client payload ignored unless emergency env flag.
- School student admin profile: role/grant gates, cross-school checks, partial PUT merge, teacher national-ID stripping with regression guard.
- Spreadsheet exports: formula-prefix sanitization (`sanitizeSpreadsheetCellValue`).
- Git env tracking: only `.env.example` tracked; `.gitignore` blocks real env files (verified 2026-05-31).
- `npm run build`: **pass**

---

## 2. Findings table

| ID | Severity | Area | Finding | Evidence / file lines | Impact | Recommended fix | Test needed |
|----|----------|------|---------|----------------------|--------|-----------------|-------------|
| F-001 | P0 | ENV / deploy | If production sets `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN=true` with a weak `ENGINE_REVIEW_ADMIN_TOKEN`, internal engine-review and `admin/monthly-persistence-award` APIs become trivially reachable. `.env.example` now uses placeholder text, but **deployed** value must be verified. | `pages/api/learning-simulator/generate-expert-review-pack.js`, `pages/api/admin/monthly-persistence-award.js`, `.env.example` L79–80 | Full internal diagnostic pack generation / admin mutations | Before launch: keep `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN=false` in production **or** set a long random server-only token; rotate if ever deployed weak | Prod env audit; call APIs without token → 401/403 |
| F-002 | P0 | ENV / deploy | If `PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION=true` in production, Copilot trusts browser-supplied report snapshots (prompt injection / data exfil risk). | `lib/parent-copilot/copilot-turn-payload.server.js` L34–40; `.env.example` L17–20 | Copilot grounded on attacker-controlled diagnostics | Ensure flag **unset** or `false` on Vercel Production | POST `/api/parent/copilot-turn` with forged payload in prod |
| F-003 | P0 | DB / launch | Migration `053_school_student_admin_profiles.sql` enables RLS with **no policies** (service-role-only access). Until applied in Supabase, admin-profile APIs return `db_schema_not_ready`. | `supabase/migrations/053_school_student_admin_profiles.sql` L61 | Feature broken; misconfiguration if ad-hoc policies added elsewhere | Owner applies migration manually per file banner; verify no broad authenticated policies | SQL: `SELECT count(*) FROM school_student_profiles`; API GET/PUT smoke |
| F-004 | P1 | Auth / XSS | Parent portal uses Supabase JS session (typically localStorage). Not HttpOnly. Combined with CSP `script-src 'unsafe-inline'` in production. | `docs/security/COOKIE_CSRF_SESSION_POSTURE.md`; `next.config.js` L23 | XSS → parent session theft | Harden CSP (nonces/hashes), reduce inline scripts; long-term consider SSR cookie session for parents | XSS regression test on parent pages |
| F-005 | P1 | Rate limits | In-memory rate limits (`lib/security/in-memory-rate-limit.js`) on login, copilot, school profile writes, registration, etc. do not share state across serverless instances. | `pages/api/student/login.js` L44–49; `pages/api/parent/copilot-turn.js` L152, L190 | Distributed brute force / abuse | Edge or Redis-backed limits for login, copilot, exports | Load test from multiple IPs/instances |
| F-006 | P1 | Public API | `GET /api/learning-supabase/health` is unauthenticated; uses anon client to probe tables; production masks per-table detail but exposes `ok`, `checksSummary`, `checkedAt`. | `pages/api/learning-supabase/health.js` L51–105; `lib/security/learning-supabase-health-response.js` L15–26 | Recon / availability signal | Gate behind admin token or remove from public deploy; or accept as intentional ops endpoint | Curl prod health anonymously |
| F-007 | P1 | CSRF / cookies | `SameSite=Lax` on student session (not Strict). Cross-site GET navigations can carry cookie; mitigated by Origin guard on mutating methods without Bearer. | `lib/learning-supabase/student-auth.js` L68–80; `lib/security/same-origin.js` | CSRF on cookie-auth POST if guard bypassed | Consider `SameSite=Strict` if all flows are first-party; keep Origin guard tests | Cross-origin POST to `/api/student/activities/.../submit` |
| F-008 | P2 | Games / dev | Hardcoded `DEV_TOPUP_SECRET_CODE = "7479"` in `dev-add-coins` (production API 404, but secret in repo). Public layout shows `DevCoinTopupNav` when nav area is `public`. | `pages/api/student/dev-add-coins.js` L8–14; `lib/site-nav.js` L146; `components/Layout.js` L26 | Dev abuse in non-prod; UI noise in prod; teaches guessable pattern | Remove hardcoded code before launch or env-gate UI with `NODE_ENV`; delete route post-launch | Prod: POST dev-add-coins → 404; UI absent on student areas only |
| F-009 | P2 | Headers / CSP | Production CSP includes `'unsafe-inline'` for scripts (no `'unsafe-eval'`). | `next.config.js` L21–24 | Weakens XSS defenses | Nonce-based CSP for Next | Header inspection on prod |
| F-010 | P2 | Dependencies | `npm audit`: 2 moderate — PostCSS via `next` (GHSA-qx2v-qp2m-jg93). | `npm audit` 2026-05-31 | Supply-chain / XSS in CSS pipeline | Track Next.js upgrade path; do not blind `npm audit fix --force` | Re-run audit after Next bump |
| F-011 | P2 | Dev surface | Engine review **page** SSR returns `notFound` in production unless `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN=true`. APIs still exist if flag enabled at build time. | `pages/learning/dev/engine-review.js` L39–46 | Internal tools exposed if flag on in prod build | Keep flag false in production builds | Prod GET `/learning/dev/engine-review` → 404 |
| F-012 | P2 | XSS | `dangerouslySetInnerHTML` on engine-review dev page (dev-only page, notFound in prod by default). | `pages/learning/dev/engine-review.js` L608 | XSS if admin page enabled with untrusted HTML | Sanitize HTML or use text-only rendering | Review content source |
| F-013 | P3 | Info disclosure | `.env.example` includes public Supabase project URL host `ajxwmlwbzxwffrtlfuoe.supabase.co` (not a secret, identifies dev project). | `.env.example` L64 | Project enumeration | Use placeholder host in example for production-facing repos | N/A |
| F-014 | P3 | Health | Health response builder still embeds `DEV_PROJECT_HOST` constant in code path (nulled in prod mask). | `pages/api/learning-supabase/health.js` L47, L97 | Low | Remove constant or use env-only | N/A |
| F-015 | P3 | Historical | Past commits may contain real `.env*` values per closure doc; rotation not done in this audit. | `docs/security/ENV_TRACKING_CLEANUP_CLOSURE.md` L44–47 | Credential leak if history public | Rotate all keys that ever appeared in git; consider history scrub per IR plan | Secret scanner on history |
| F-016 | P3 | PIN entropy | Student PIN is 4 digits (~10k space); mitigated by login rate limit and generic errors. | `pages/api/student/login.js` L40–41 | Online brute force | Monitor failed logins; optional lockout policy | Rate-limit bypass test (F-005) |

### School student admin profile (feature-specific)

| ID | Severity | Area | Finding | Evidence | Impact | Recommended fix | Test needed |
|----|----------|------|---------|----------|--------|-----------------|-------------|
| F-SSP-01 | — | Authorization | **PASS (code):** GET school route uses `requireSchoolStudentBrowseContext` (manager, or operator with `student_access_admin` **or** `student_data_viewer`). PUT uses `requireSchoolCredentialAdminApiContext` (manager or `student_access_admin` only). Cross-school: `wrong_school` + `verifyStudentVisibleToSchool`. | `pages/api/school/students/[studentId]/admin-profile.js`; `lib/school-server/school-request.server.js` L220–571 | — | — | Matrix: manager / secretary grants / teacher / parent |
| F-SSP-02 | — | Teacher strip | **PASS:** Teacher GET uses `getSchoolStudentAdminProfile(..., { forTeacher: true })` + `stripTeacherAdminProfileFields`; regression returns 500 if national IDs leak. | `lib/school-server/school-student-profile.server.js` L297–334, L475–485; `pages/api/teacher/students/[studentId]/admin-profile.js` L87–110 | — | — | Teacher GET must omit `parent1NationalId`, `updatedBy` |
| F-SSP-03 | — | Partial PUT | **PASS:** `mergeAdminProfileFields` preserves omitted keys; present keys with `null` clear fields. | `lib/school-server/school-student-profile.server.js` L238–265, L346–408 | — | — | PUT single field; verify others preserved |
| F-SSP-04 | — | Student create | **PASS:** POST `/api/school/students` name-only path via `createSchoolManagedStudent`; profile fields optional. | `pages/api/school/students/index.js` L78–86 | — | — | Create student name only |
| F-SSP-05 | — | Name edit | **PASS:** PATCH name requires `requireSchoolCredentialAdminApiContext` (not teacher, not data_viewer-only). | `pages/api/school/students/[studentId]/name.js` L23–24 | — | — | data_viewer PATCH name → 403 |
| F-SSP-06 | P3 | RLS | Table has RLS enabled, no `CREATE POLICY` in migrations — correct for service-role-only access if no policies added in dashboard. | `053_school_student_admin_profiles.sql` | Accidental Supabase dashboard policy could open browser access | Post-apply: confirm zero permissive policies | Supabase advisors |

---

## 3. Route / API coverage table

Legend: **Y** = enforced in code reviewed; **N** = not required; **—** = partial / env-dependent

| Route group | Auth checked? | Role checked? | Ownership checked? | Notes |
|-------------|---------------|---------------|--------------------|-------|
| `/api/parent/**` | Y (Bearer + `requireParentApiContext`) | Y (parent persona, feature flags) | Y (`parent_id` on students, per-route) | `report-data`: bearerSupabase + service aggregate; strips `_dailyBySubject` |
| `/api/parent/copilot-turn` | Y | Y (+ monthly limit) | Y (student session match or parent owns student) | Prod: server payload; rate limits IP + auth bucket |
| `/api/parent/activities/**` | Y | Y | Y (parent-owned activities) | Reviewed index + `[activityId]` pattern |
| `/api/student/login`, `logout`, `me` | login N / others Y | N / student | Y (session token, access code state) | Login rate limit; revoked/expired codes rejected |
| `/api/student/activities/**` | Y (cookie) | student | Y (`submitStudentActivity` uses session `studentId`) | Origin guard on mutations |
| `/api/student/dev-add-coins` | Y in dev | — | Y | **404 in production** |
| `/api/student/worksheet-activities/**` | Y | student | Y | Same session model |
| `/api/teacher/**` | Y (Bearer or staff cookie) | Y (entitlement persona) | Y (class/subject/student grants, `teacherHasReportAccessToStudent`) | Private vs school: `rejectIfSchoolTeacher` on private routes |
| `/api/teacher/students/[id]/admin-profile` | Y | school teacher + report access | Y | GET only; national IDs stripped |
| `/api/teacher/students/[id]/report-data` | Y | Y | Y | `sanitizeReportPayloadForTeacher` |
| `/api/school/**` | Y | Y (manager / operator grants) | Y (`schoolId` membership, `verifyStudentVisibleToSchool`) | Staff cookie + JWT paths |
| `/api/school/students/[id]/admin-profile` | Y | browse vs admin contexts | Y | PUT rate limited in prod |
| `/api/school/students/[id]/name` | Y | credential admin only | Y | PATCH rate limited |
| `/api/school/students` GET/POST | Y | browse / credential admin | Y | Name-only create supported |
| `/api/guardian/**` | Y | guardian persona | Y (PIN gate, student scope) | Rate limits on `me`, logout |
| `/api/admin/**` | Y | `app_metadata.role === admin` + entitlement | Y (per admin route) | Service role after JWT verify |
| `/api/auth/*-request` | N (public registration) | N | N | Rate limit 10/hour/IP; Origin guard |
| `/api/learning-supabase/health` | **N** | N | N | Prod masks details (F-006) |
| `/api/learning/**` (session/answer) | Y (student cookie) | student | Y (session `student_id` match) | |
| `/api/learning-simulator/*` | Y (admin token + build flag) | admin | — | Disabled unless `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN` |
| `/api/dev-student-simulator/**` | dev only | — | — | **404 in production** |
| `/api/arcade/**` | Y (`requireArcadeStudent`, no body `studentId`) | student | Y | Cookie + Origin on mutations |
| `/api/hebrew-audio-*`, `/api/security/csp-report` | varies | — | — | Not exhaustively re-audited here; treat as lower risk |

---

## 4. ENV / secrets — current repo state

### Tracked env files (2026-05-31)

```
git ls-files → .env.example (+ docs/scripts referencing env patterns)
```

**Not tracked:** `.env`, `.env.local`, `.env.production`, `.env.vercel.prod.check`, etc. (per `git check-ignore` / [ENV_TRACKING_CLEANUP_CLOSURE.md](./ENV_TRACKING_CLEANUP_CLOSURE.md))

### Tracked secret assignments

`git grep` for `LEARNING_SUPABASE_SERVICE_ROLE_KEY=`, `LEARNING_STUDENT_ACCESS_SECRET=`, `VERCEL_OIDC_TOKEN=`, `ENGINE_REVIEW_ADMIN_TOKEN=` in tracked files → **placeholders/empty in `.env.example` only**; historical `7479` appears in **docs/audits** and risk register, not in current `.env.example` (now `replace-with-long-random-secret`).

### Vercel / runtime env names (from code + `.env.example`)

| Variable | Client? | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_LEARNING_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY` | Yes | Anon key (RLS-bound) |
| `LEARNING_SUPABASE_SERVICE_ROLE_KEY` | **No** | Server APIs |
| `LEARNING_STUDENT_ACCESS_SECRET` | **No** | Student access crypto |
| `ENGINE_REVIEW_ADMIN_TOKEN` | **No** | Engine review + some admin APIs |
| `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN` | Yes (build) | Gates dev admin UI/APIs |
| `PARENT_COPILOT_*`, `GEMINI_API_KEY`, `PARENT_REPORT_NARRATIVE_*` | **No** (except documented `NEXT_PUBLIC` copilot UI flags) | AI server-side |
| `TEACHER_PORTAL_ENABLED`, `TEACHER_PORTAL_INVITE_ONLY`, … | Mostly server | Portal kill switches |
| `SCHOOL_STAFF_*_SESSION_SECONDS` | No | Staff cookie lifetime |

### Launch-time items (verify only — no rotation performed)

- [ ] Confirm production `ENGINE_REVIEW_ADMIN_TOKEN` is strong; `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN` is **false** unless explicitly required
- [ ] Confirm `PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION` is **not** `true`
- [ ] Rotate any credential ever committed to git history
- [ ] Confirm `LEARNING_STUDENT_ACCESS_SECRET` and service role key differ between dev and prod projects if applicable

---

## 5. Manual QA checklist

- [ ] Parent A cannot open parent B child report (`/api/parent/students/{id}/report-data` → 404/403)
- [ ] Parent Copilot cannot answer about another child’s data (wrong `studentId` with valid parent JWT → 404)
- [ ] Student cannot submit activity for peer (tamper `activityId` with valid session → forbidden)
- [ ] School manager cross-school: token/school from school A, student from school B → `wrong_school` / not visible
- [ ] Secretary **no grant**: admin profile GET → `operator_grant_required`
- [ ] Secretary **data_viewer**: GET admin profile OK; PUT → 403
- [ ] Secretary **student_access_admin**: PUT partial field; national IDs visible on school route
- [ ] School teacher: school admin-profile route → 403; teacher admin-profile → OK without national IDs
- [ ] Private teacher cannot call school-only endpoints; school staff cannot create private students (`school_teacher_no_private_access`)
- [ ] Revoked student access code cannot log in; existing session invalidated after logout
- [ ] Staff cookie: `SameSite=Strict`; PIN change required gate before APIs
- [ ] Production: `/api/student/dev-add-coins` → 404; dev simulator → 404
- [ ] Production: `/api/learning-supabase/health` response contains no table names
- [ ] Teacher activity XLSX export opens in Excel without formula execution (cells starting with `=`)
- [ ] Browser Supabase: anon key only in bundle (devtools Sources search `service_role`)

---

## 6. Commands run

| Command | Result |
|---------|--------|
| `git status --short` | Clean (`---` only) |
| `git ls-files \| findstr /i env` | `.env.example` + docs/scripts (no real env files) |
| `git grep -I LEARNING_SUPABASE_SERVICE_ROLE_KEY=` etc. | Placeholders/docs only |
| `git grep -I parent1NationalId` (JS) | Server + tests; teacher route strips |
| `git grep -I dangerouslySetInnerHTML` | `pages/learning/dev/engine-review.js` only |
| `git grep -I eval(` | No matches in JS/JSX |
| `git grep -I 7479` / `dev-add` / `bypass` | dev-add-coins, e2e defaults, docs — see F-008 |
| `npm audit` | **Fail (vulns present):** 2 moderate (postcss/next) |
| `npm run build` | **Pass** (exit 0) |

Not run (would need live env / DB): `npm run verify:learning-rls`, `scripts/school-portal/school-portal-security-matrix.mjs`, Playwright security smokes.

---

## 7. Files inspected (major)

- `next.config.js`, `.gitignore`, `.env.example`
- `lib/learning-supabase/student-auth.js`, `lib/learning-supabase/server.js`, `lib/learning-supabase/client.js`
- `lib/security/api-guards.js`, `production-guard.js`, `same-origin.js`, `login-rate-limit.js`, `in-memory-rate-limit.js`, `public-api-rate-limit.js`, `export-cell-sanitize.js`, `learning-supabase-health-response.js`
- `lib/teacher-server/teacher-session.server.js`, `teacher-report.server.js`, `private-teacher-guard.server.js`
- `lib/school-server/school-request.server.js`, `school-student-profile.server.js`, `school-staff-session.server.js`, `school-scope.server.js`
- `lib/auth/persona-guard.server.js`, `lib/admin-server/admin-request.server.js`
- `lib/parent-copilot/copilot-turn-payload.server.js`, `lib/parent-server/report-data-aggregate.server.js`, `parent-facing-report-authority.js`
- `pages/api/student/login.js`, `logout.js`, `dev-add-coins.js`, `activities/[activityId]/submit.js`
- `pages/api/parent/copilot-turn.js`, `students/[studentId]/report-data.js`
- `pages/api/school/students/index.js`, `[studentId]/admin-profile.js`, `[studentId]/name.js`
- `pages/api/teacher/students/[studentId]/admin-profile.js`
- `pages/api/learning-supabase/health.js`, `pages/api/auth/school-request.js`
- `pages/learning/dev/engine-review.js`, `components/Layout.js`, `lib/site-nav.js`
- `supabase/migrations/053_school_student_admin_profiles.sql` (+ RLS-enabled migrations grep)
- `docs/security/ENV_TRACKING_CLEANUP_CLOSURE.md`, `COOKIE_CSRF_SESSION_POSTURE.md`

---

## 8. No-change confirmation

| Action | Done? |
|--------|-------|
| Code modified | **No** |
| SQL / migrations applied | **No** |
| Vercel / Supabase settings changed | **No** |
| Git commit | **No** |
| Git push | **No** |
| Deploy | **No** |
| Hebrew copy / UI design changed | **No** |
| Secret values printed in this report | **No** (redacted / names only) |

---

*End of report — COMPOSER agent, 2026-05-31*
