# Pre-Launch Security Re-Audit - GPT55 - 2026-05-31

## 1. Executive Summary

**Verdict: YELLOW.**

**Launch blocked?** No active code-level P0/P1 blocker was found in this repo snapshot. Public launch should still be held until the production/preview environment checklist confirms the safe defaults are actually deployed.

**Verified closed:** dev coin top-up hardcoded code removal, engine review token checks, Parent Copilot strict production payload default, student username validation, deleted health endpoint in active routes, engine-review raw HTML removal, env tracking cleanup, and School Student Admin Profile access controls.

**Top remaining risks:**

- Production env state cannot be proven from the repo: `ENGINE_REVIEW_ADMIN_TOKEN`, `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN`, `PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION`, `DEV_TOPUP_ENABLED`, and `NEXT_PUBLIC_DEV_TOPUP_ENABLED` still need deployment-side verification before release.
- Parent/teacher/admin Supabase browser sessions are bearer-token based and stored by the client SDK; combined with production `script-src 'unsafe-inline'`, any future XSS has high account-takeover impact.
- Rate limiting is in-memory. It is useful for pilot/single-instance safety, but not a distributed abuse control for public launch scale.
- `npm audit` reports a moderate `postcss` advisory through `next`; there is no safe automatic fix from `npm audit fix` because it proposes a breaking downgrade path.

## 2. Findings Table

| ID | Severity | Area | Finding | Evidence/file lines | Impact | Recommended fix | Launch blocker? |
|---|---|---|---|---|---|---|---|
| GPT55-001 | P1 launch/ops gate | ENV / deploy | Repo defaults are safe, but actual Vercel/Supabase production env values were not and should not be read/changed in this audit. Launch depends on confirming privileged flags are off or strongly tokenized. | `.env.example:75-87`, `pages/api/learning-simulator/generate-expert-review-pack.js:32-65`, `lib/parent-copilot/copilot-turn-payload.server.js:34-40`, `lib/security/dev-topup.server.js:6-16` | If production has weak/old tokens or unsafe flags, internal admin/dev/Copilot paths could be exposed. | Before launch, verify production env: `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN=false` unless intentionally enabled with a long random server-only token; `PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION` unset/false; dev top-up flags false. | Conditional yes: launch should wait for env signoff. |
| GPT55-002 | P2 | Auth / XSS blast radius | Parent/teacher/admin Supabase sessions use browser-persisted bearer sessions rather than HttpOnly cookies. Production CSP still allows inline scripts. | `lib/learning-supabase/client.js:24-32`, `next.config.js:21-24` | Any future XSS can steal browser session tokens and access child/school data. | Move toward nonce/hash CSP and consider SSR/HttpOnly cookie auth for high-risk personas. | No, if no active XSS sink is present and manual XSS QA passes. |
| GPT55-003 | P2 | Abuse controls | Login and selected APIs have in-memory rate limits only; limits reset per process and do not coordinate across serverless instances. | `lib/security/login-rate-limit.js:17-18`, `lib/security/public-api-rate-limit.js:54-75`, route grep shows partial adoption across sensitive APIs. | Brute-force and high-cost endpoint abuse may bypass limits under distributed traffic. | Add Redis/KV/WAF-backed limits for login, PIN/code, AI, reports/exports, profile writes, and student activity mutations. | No for controlled launch; should be a near-term hardening item. |
| GPT55-004 | P2 | Dependencies | `npm audit` reports 2 moderate vulnerabilities: `postcss <8.5.10` via `next`, advisory for XSS in CSS stringify output. | `npm audit` output; `package.json:440`, `package.json:453` | Supply-chain/XSS risk if vulnerable code path is reachable. | Track Next/PostCSS patched release path; avoid `npm audit fix --force` without review because it proposes a breaking `next` change. | No immediate blocker unless advisory is exploitable in deployed paths. |
| GPT55-005 | P3 | Docs / stale artifacts | Deleted `/api/learning-supabase/health` appears only in old docs/build artifacts, including a tracked `.tmp` build log. No active route file exists. | `Glob pages/api/learning-supabase/health.*` returned 0; `rg` found `.tmp/teacher-classroom-sim-build.log:87` and historical docs. | QA confusion; no live endpoint exposure found. | Remove tracked `.tmp` logs or clearly mark old audit/docs sections as historical. | No. |
| GPT55-006 | P3 | Privileged feature gating | Engine review APIs correctly require a server token, but still use a `NEXT_PUBLIC_*` flag as the server-side enablement switch. Token remains the real authority. | `pages/api/learning-simulator/engine-review-pack-status.js:33-39`, `pages/api/learning-simulator/generate-expert-review-pack.js:32-65`, `lib/security/admin-token.js:20-44` | Build-time public flag leaks enablement state and is easy to misconfigure. | Long-term: split public UI hint from server-only `ENGINE_REVIEW_ADMIN_ENABLED`; keep token required. | No. |

## 3. Closed Findings Verification

| Previous item | Status now | Evidence | Remaining action |
|---|---|---|---|
| Dev top-up hardcoded secret | Closed in active code | `pages/api/student/dev-add-coins.js:13-39` rejects disabled/missing secret and compares request code against env; `lib/security/dev-topup.server.js:6-16`; active-code `rg` found no `DEV_TOPUP_SECRET_CODE = "7479"` assignment. | Verify production `DEV_TOPUP_ENABLED=false` and `NEXT_PUBLIC_DEV_TOPUP_ENABLED=false`. |
| Engine review token | Closed in code; env signoff still needed | `.env.example:82-87` uses disabled public default and placeholder token; `generate-expert-review-pack.js:32-65`, `engine-review-pack-status.js:33-39`, and `admin-token.js:20-44` reject disabled, missing, absent, or wrong tokens. | Verify deployed token is long random if feature is enabled; otherwise keep public flag false. |
| Parent Copilot client payload flag | Closed in repo default | `.env.example:17-20` comments emergency flag only; `copilot-turn-payload.server.js:34-40` strict production mode is default unless env explicitly says true; `copilot-turn.js:4-12` documents client payload ignored in production. | Verify production env leaves flag unset/false. |
| Student login username validation | Closed | `pages/api/student/login.js:36-43` normalizes username/code and PIN, `login.js:59-68` matches code/PIN, then `login.js:85-93` requires `validateStudentLoginUsername`; helper allows legacy rows without username and rejects missing/mismatch at `student-login-username.server.js:20-29`. Tests passed. | Manual QA with real rows: username-required row and legacy code-only row. |
| Health endpoint removal | Closed in active routes | `Glob pages/api/learning-supabase/health.*` returned 0; active-code/docs search found no active route. `HEALTHCHECK_TOKEN` absent from active code and `.env.example`. | Clean historical docs/log mentions if desired. |
| Engine review `dangerouslySetInnerHTML` | Closed in active code | `rg "dangerouslySetInnerHTML|innerHTML|eval\\(|new Function" --glob "*.{js,jsx,ts,tsx}"` returned no matches in active JS/TS. | Continue XSS regression scans before release. |
| ENV tracking cleanup | Closed for tracked files | `git ls-files "*.env*" ".env*"` returned `.env.example` only; `.gitignore:46-52` blocks real env and Vercel env dumps. | Do not read/print real local env; perform deployment secret rotation/signoff separately. |
| School Student Admin Profile | Closed in code and tests | `admin-profile.js:61-90` GET uses browse context and school visibility; `admin-profile.js:93-140` PUT uses credential admin, school match, visibility, partial parser; `name.js:23-71` name edit uses credential admin; teacher route strips IDs/audit at `teacher/.../admin-profile.js:87-110`; RLS enabled at migration `053:61`; 36 targeted tests passed. | Manual HTTP QA with manager, secretary grants, teacher, parent/student/private-teacher/other-school accounts. |

## 4. Complex / Architecture Findings

| Issue | Launch blocker or accepted risk? | Proper fix | Risk if launching before fixing |
|---|---|---|---|
| Parent/admin/teacher browser bearer session architecture | Accepted risk if XSS scan/manual QA passes | Move high-risk personas to HttpOnly server sessions or reduce token exposure; pair with strict CSP. | Future XSS can become account takeover. |
| CSP uses `unsafe-inline` | Accepted risk for launch; harden soon | Inventory inline scripts/styles, add nonces/hashes, then remove `unsafe-inline`. | XSS defense-in-depth is weaker. |
| Distributed rate limiting | Accepted risk for controlled launch; not sufficient for scale | Add shared KV/Redis/WAF limits and alerting. | Brute force/cost abuse can bypass per-instance memory limits. |
| Dependency advisory | Accepted risk unless exploitable path is confirmed | Upgrade via tested Next/PostCSS path; avoid forced downgrade. | Moderate XSS-class supply-chain exposure remains. |
| Historical secret rotation/history | Launch/ops item, not repo-code blocker | Verify deployed secrets, rotate anything ever copied from old defaults, scan git history under owner process. | If old values reached production, external access may remain possible. |

## 5. Manual QA Checklist Still Required

- Parent auth: parent can only list/report/create activities for own children; no other child IDs.
- Student auth: username-required row rejects correct code/PIN without exact normalized username; legacy row without username still works if intended; revoked/expired access code invalidates sessions.
- Teacher auth: private teacher vs school teacher separation; subject scope filtering; no manager/secretary-only fields; teacher admin-profile response omits `parent1NationalId`, `parent2NationalId`, `updatedBy`, `updatedByName`.
- School roles: manager all fields/edit/name; `student_access_admin` secretary edit/name; `student_data_viewer` view-only; no-grant secretary blocked; other-school users blocked.
- Production env: dev top-up disabled; engine review disabled or strong token; Parent Copilot client payload override unset/false; no debug `NEXT_PUBLIC_*` flags.
- Dev/admin behavior: engine review APIs reject missing/wrong token; dev top-up route is 404 when disabled.
- Reports/exports: teacher subject-scoped report/export cannot include hidden subjects or restricted fields; CSV/XLSX formula sanitization remains active.
- Headers: verify deployed `Content-Security-Policy`, HSTS, frame/referrer/permissions policies with `curl -I`.

## 6. Commands Run and Results

| Command/search | Result |
|---|---|
| `git status --short` | Only unrelated untracked `docs/security/PRE_LAUNCH_SECURITY_REAUDIT_CASCADE_2026-05-31.md` was present before this report. |
| `git ls-files "*.env*" ".env*"` | `.env.example` only. |
| `rg` dangerous patterns: `dangerouslySetInnerHTML`, `innerHTML`, `eval(`, `new Function` in active JS/TS | No matches. |
| `rg` health/deleted token patterns | No active route; `HEALTHCHECK_TOKEN` absent from active code and `.env.example`; stale `.tmp`/historical docs references only. |
| `rg` fixed env patterns | `.env.example` placeholders/defaults plus explanatory code/docs; no hardcoded dev top-up secret assignment. |
| `npm audit` | Failed with 2 moderate vulnerabilities: `postcss <8.5.10` via `next`; force fix proposes breaking change. |
| `npm run build` | Passed. Next production build completed with exit code 0. |
| `node --test "__tests__/student/login-username-validation.test.js" "__tests__/school/admin-profile.test.js"` | Passed: 36 tests, 0 failures. Node emitted module-type warnings only. |

## 7. Files Inspected

- `.env.example`
- `.gitignore`
- `next.config.js`
- `package.json`
- `lib/learning-supabase/client.js`
- `lib/learning-supabase/server.js`
- `lib/learning-supabase/student-auth.js`
- `lib/learning-supabase/student-login-username.server.js`
- `lib/security/dev-topup.server.js`
- `lib/security/admin-token.js`
- `lib/security/api-guards.js`
- `lib/security/same-origin.js`
- `lib/security/login-rate-limit.js`
- `lib/security/public-api-rate-limit.js`
- `lib/security/session-cookie-secure.js`
- `lib/parent-copilot/copilot-turn-payload.server.js`
- `lib/auth/persona-guard.server.js`
- `lib/admin-server/admin-request.server.js`
- `lib/school-server/school-request.server.js`
- `lib/school-server/school-staff-session.server.js`
- `lib/school-server/school-staff-login.server.js`
- `lib/school-server/school-student-profile.server.js`
- `lib/school-server/school-subjects.server.js`
- `lib/teacher-server/teacher-session.server.js`
- `lib/teacher-server/teacher-request.server.js`
- `lib/teacher-server/teacher-report.server.js`
- `lib/teacher-server/teacher-activities.server.js`
- `lib/guardian-server/guardian-session.server.js`
- `pages/api/student/login.js`
- `pages/api/student/dev-add-coins.js`
- `pages/api/student/logout.js`
- `pages/api/learning/answer.js`
- `pages/api/learning/session/start.js`
- `pages/api/learning/session/finish.js`
- `pages/api/parent/copilot-turn.js`
- `pages/api/parent/students/[studentId]/report-data.js`
- `pages/api/school/students/[studentId]/admin-profile.js`
- `pages/api/school/students/[studentId]/name.js`
- `pages/api/teacher/students/[studentId]/admin-profile.js`
- `pages/api/teacher/students/[studentId]/parent-report-data.js`
- `pages/api/admin/**` representative routes and guard usage
- `pages/api/guardian/login.js`
- `pages/api/school/staff/login.js`
- `pages/learning/dev/engine-review.js`
- `supabase/migrations/001_learning_core_foundation.sql`
- `supabase/migrations/003_student_sessions_revocation_and_expiry.sql`
- `supabase/migrations/048_school_staff_code_pin_login.sql`
- `supabase/migrations/051_parent_assigned_activities.sql`
- `supabase/migrations/053_school_student_admin_profiles.sql`
- `__tests__/student/login-username-validation.test.js`
- `__tests__/school/admin-profile.test.js`

## 8. No-Change Confirmation

- No code changes made.
- No SQL run.
- No Supabase/Vercel/env settings read, changed, or printed.
- No commit.
- No push.
- No deploy.
- No secret values printed. Real local `.env*` files were detected as untracked but not opened.

