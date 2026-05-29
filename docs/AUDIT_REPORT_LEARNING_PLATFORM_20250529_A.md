# Audit Report — Hebrew Learning Platform
**Audit ID:** AUDIT-2025-0529-A  
**Date:** 2025-05-29  
**Auditor:** Independent Code Review (Cascade)  
**Scope:** Full learning platform — auth, authorization, Supabase/RLS, report engine, classroom activities, Excel export, PDF status, UI/UX (learning/report surfaces), curriculum, parent safety, school/teacher/student portals, data quality, performance, error handling, security  
**Exclusions:** Games/arcade/coins economy, crypto/token features, known `.env` handling documentation gaps (unless real secret exposure found)  
**Method:** Static code analysis, migration analysis, route audit — no destructive commands or data mutations executed

---

## Executive Summary

The platform demonstrates a well-structured, defense-in-depth security posture for its core learning features. Auth is layered (bearer tokens for teacher/school/parent, cookie sessions for students/guardians), Supabase service-role clients are used server-side for all mutations, and RLS is enabled on all primary tables. Rate limiting, cross-origin guards, and safe logging are broadly applied.

**Critical findings:** None that allow immediate unauthorized data access in the standard flows.

**High findings:** 4 confirmed — including an in-memory rate limiter that resets on every serverless cold start (no persistence across workers), a hardcoded weak admin token in `.env.example`, missing rate limiting on activity status-change mutations, and a school report endpoint that performs N+1 teacher scans per student (scalability risk at production school size).

**Medium findings:** 6 — including `_dailyBySubject` leak risk path, no rate limiting on school portal `/api/school/*` read endpoints, activity status transition missing CSRF guard, parent creation endpoint missing school scope validation on `studentId`, and PDF v1 flag not enforced at the UI component level.

**Low/Info findings:** Several, including no `Retry-After` header on school endpoints, no structured 429 on activity `status.js`, and partial PII field coverage in report sanitization.

---

## Scope & Coverage

| Area | Covered | Notes |
|---|---|---|
| Global architecture | ✓ | Next.js pages/api, lib/server, utils |
| Authentication — teacher | ✓ | Bearer + Supabase JWT |
| Authentication — guardian/parent | ✓ | Cookie session, hash-based |
| Authentication — student | ✓ | Cookie session, code+PIN |
| Authentication — school admin | ✓ | Bearer + role check |
| Supabase RLS | ✓ | Migrations 001, 020, 027 reviewed |
| Service role usage | ✓ | All server files confirmed |
| Teacher report engine | ✓ | Report build + subject filter |
| Parent mini-report engine | ✓ | Guardian scope, student scope |
| School admin report engine | ✓ | Scope resolution, teacher delegation |
| Classroom activities lifecycle | ✓ | Status transitions, student play |
| Enriched Excel export (7-sheet) | ✓ | Full workbook builder reviewed |
| PDF export status | ✓ | Flag confirmed disabled |
| Hebrew RTL / UI labels | ✓ | Export, display labels |
| Curriculum mapping | ✓ | Subject allowlist, grade resolution |
| Parent-facing safety | ✓ | PII sanitization, guardian scope |
| School portal access control | ✓ | Manager role, school scope |
| Private teacher portal | ✓ | Subject grants, no school membership |
| Student area flows | ✓ | Activity start/answer/submit |
| Data quality / simulation risk | ✓ | Rate limit state, in-memory |
| Performance / scalability | ✓ | N+1 patterns identified |
| Error handling | ✓ | safeApiLog, structured errors |
| Security checklist | ✓ | IDOR, CSRF, injection, secrets |

---

## Findings by Severity

---

### BLOCKER / HIGH

---

#### FINDING-001 · HIGH · In-Memory Rate Limiter Resets on Every Cold Start (Serverless)

- **Area:** Security — Rate Limiting
- **Files:** `lib/security/in-memory-rate-limit.js`, `lib/security/login-rate-limit.js`
- **What was checked:** Rate limit state storage mechanism
- **Evidence:**
  ```
  /** @type {Map<string, Map<string, { count: number, windowStart: number }>>} */
  const namespaces = new Map();
  ```
  Both `namespaces` and `buckets` are module-level JavaScript `Map` objects — in-process memory only.
- **Impact:** On Vercel or any serverless deployment, each function invocation may run in a fresh cold-start process. An attacker can bypass all in-memory rate limits by triggering enough concurrent requests across multiple cold starts. The student login brute-force protection (`CREDENTIAL_MAX_ATTEMPTS = 10`, `IP_MAX_ATTEMPTS = 30`) is therefore not reliable in production serverless deployments.
- **Affected endpoints:** `POST /api/student/login`, `POST /api/guardian/login`, copilot turn endpoints, Hebrew audio endpoints
- **Reproduction:** Trigger 11 concurrent POST requests to `/api/student/login` from distributed clients — each cold-started worker will allow all attempts.
- **Severity:** HIGH (login brute-force protection is the primary consumer; in pilot/low-traffic this may be acceptable, but it is a false guarantee of protection)
- **Fix direction:** Replace with a persistent shared store (Redis/Upstash, Supabase rate-limit table, or Vercel KV) for production. Document the current limitation prominently. Do not claim production-safe rate limiting until resolved.
- **Confirmation status:** CONFIRMED (structural analysis)

---

#### FINDING-002 · HIGH · Hardcoded Weak Admin Token in `.env.example`

- **Area:** Security — Secrets
- **Files:** `.env.example` line 79-80
- **What was checked:** Default/example environment values for sensitive tokens
- **Evidence:**
  ```
  NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN=true
  ENGINE_REVIEW_ADMIN_TOKEN=7479
  ```
  The `ENGINE_REVIEW_ADMIN_TOKEN` is set to the trivially guessable 4-digit value `7479` as the committed default in `.env.example`. The `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN=true` is also committed as the default, meaning the route is enabled unless explicitly overridden.
- **Impact:** If a developer deploys without changing this token, any attacker who reads the public `.env.example` can call `POST /api/learning-simulator/generate-expert-review-pack` with `x-engine-review-token: 7479` and gain access to internal engine review pack generation. The value `7479` also appears to match the project name suffix in the workspace path, making it discoverable by anyone who knows the project.
- **Severity:** HIGH — the token provides access to an internal admin endpoint. Even if the endpoint itself is low-risk (read/snapshot), it leaks curriculum/question data and sets a dangerous precedent.
- **Fix direction:** Replace `7479` with a placeholder like `REPLACE_WITH_SECURE_RANDOM_TOKEN` in `.env.example`. Set `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN=false` as the committed default. Add rotation instructions. Verify `.env.production` does not use this default.
- **Confirmation status:** CONFIRMED

---

#### FINDING-003 · HIGH · Activity Status Mutation (`status.js`) Has No Rate Limiting

- **Area:** Security — Rate Limiting, Classroom Activities
- **Files:** `pages/api/teacher/activities/[activityId]/status.js`
- **What was checked:** Rate limiting applied to mutating PATCH endpoint for activity lifecycle transitions
- **Evidence:** The route calls `requireTeacherApiContext` then directly calls `transitionActivityStatus` with no call to `consumeRateLimit`, `rejectIfRateLimited`, or any rate-limit helper. Compared against `pages/api/teacher/activities/index.js` which does apply rate limiting for activity creation.
- **Impact:** A compromised teacher account can spam status transitions (activate → pause → close → archive) at arbitrary speed — potentially corrupting activity state for live classroom sessions (e.g., closing a quiz mid-session for an entire class). No rate floor exists to prevent this.
- **Severity:** HIGH — could disrupt live classroom sessions if a teacher account is abused or if there is a client bug causing rapid repeated calls.
- **Fix direction:** Add `consumeRateLimit` (namespace `teacher_activity_status`, per `teacherId`) immediately after `requireTeacherApiContext`. Also confirm CSRF guard (`guardCookieMutationOrigin`) is present — it is **not** currently present in `status.js` (Bearer-only routes skip it, which is correct, but should be documented).
- **Confirmation status:** CONFIRMED

---

#### FINDING-004 · HIGH · School Student Report — N+1 Teacher Scan Per Student

- **Area:** Performance / Scalability
- **Files:** `lib/school-server/school-scope.server.js` → `resolveSchoolReportTeacherForStudent`, called from `pages/api/school/students/[studentId]/report-data.js`
- **What was checked:** How school manager student report resolves which teacher to use for data
- **Evidence:**
  ```js
  for (const teacherId of scope.teacherIds) {
    const access = await teacherHasReportAccessToStudent(serviceRole, teacherId, studentId);
    if (access.ok && access.allowed) {
      return { ok: true, teacherId };
    }
  }
  ```
  `teacherHasReportAccessToStudent` itself performs multiple DB queries (`teacher_students`, `teacher_classes`, `teacher_class_students`, optionally `school_teacher_memberships`, `school_student_enrollments`). In a school with 50 teachers this becomes O(50) × O(4+ queries) = 200+ queries per single student report request.
- **Impact:** At production school scale (50+ teachers, 500+ students), the school admin student report page will become prohibitively slow. `loadSchoolScope` is memoized but the per-teacher access check is not.
- **Severity:** HIGH — blocks production school launch at real scale.
- **Fix direction:** Pre-compute teacher→student visibility in `loadSchoolVisibleStudentIds` (already partially done for the visible-student check). For report access resolution, build a reverse index: for a given `studentId` find the smallest set of directly-linked teachers before iterating all school teachers. Alternatively, add a `resolved_report_teacher_id` lookup table. Apply `memoSchoolServerQuery` to the result.
- **Confirmation status:** CONFIRMED

---

### MEDIUM

---

#### FINDING-005 · MEDIUM · `_dailyBySubject` Field — Deletion Depends on Code Path Executing

- **Area:** Data Privacy / Report Leakage
- **Files:** `lib/school-server/school-subjects.server.js` → `applyDailyActivityFilterFromSubjectBreakdown`
- **What was checked:** Whether the internal `_dailyBySubject` aggregation field is always stripped before API response
- **Evidence:**
  ```js
  // Strip it from the payload so the API response cannot leak per-subject day-level breakdowns
  delete payload._dailyBySubject;
  ```
  This `delete` is only executed inside `applyDailyActivityFilterFromSubjectBreakdown`, which is only called from `filterReportByPermittedSubjects`. If `filterReportByPermittedSubjects` is called with `permittedSubjects = null` (unrestricted — for private teachers or school admins), the early-return branch at line 212 returns `reportPayload` unmodified — without ever calling `applyDailyActivityFilterFromSubjectBreakdown`.
- **Impact:** If `_dailyBySubject` is populated in the base payload (by the aggregation layer) and the caller is unrestricted (null permittedSubjects), the field would be included in the API response and exposed to the client. This leaks per-subject per-day counts beyond what the UI is designed to show.
- **Severity:** MEDIUM — data over-exposure. Not a direct auth bypass but exposes internal aggregation detail not intended for the API consumer.
- **Fix direction:** Always `delete payload._dailyBySubject` at the end of `filterReportByPermittedSubjects`, regardless of the `permittedSubjects` value (move the delete to before the early return, or add it to the unrestricted return path).
- **Confirmation status:** CONFIRMED (code path analysis)

---

#### FINDING-006 · MEDIUM · School Portal API Endpoints — No Rate Limiting on Read Endpoints

- **Area:** Security — Rate Limiting
- **Files:** `pages/api/school/me.js`, `pages/api/school/teachers/index.js`, `pages/api/school/students/[studentId]/report-data.js`, all school GET endpoints
- **What was checked:** Whether school admin read endpoints apply rate limiting
- **Evidence:** `requireSchoolManagerApiContext` (in `lib/school-server/school-request.server.js`) has no rate-limit call. No school API endpoint reviewed has a `consumeRateLimit` or `rejectIfRateLimited` call. Contrast with teacher endpoints which do apply rate limiting via `requireTeacherApiContext`.
- **Impact:** A compromised school admin account can scrape all student data (names, grades, report data) at unlimited rate. Given that `buildTeacherStudentReportPayload` triggers multiple DB queries per call, this is also a denial-of-service vector against the Supabase DB.
- **Severity:** MEDIUM
- **Fix direction:** Add per-IP + per-manager rate limiting in `requireSchoolManagerApiContext` (analogous to how teacher rate limiting is applied). Also add `Retry-After` headers to 429 responses.
- **Confirmation status:** CONFIRMED

---

#### FINDING-007 · MEDIUM · Guardian Login — Cookie Not Marked `SameSite=Strict` / `__Host-` Prefix Not Used

- **Area:** Security — CSRF / Cookie Hardening
- **Files:** `lib/guardian-server/guardian-session.server.js`, `lib/security/session-cookie-secure.js`
- **What was checked:** Cookie attributes for student guardian session cookies
- **Evidence:** The cross-origin guard (`rejectIfCrossOriginCookieMutation`) skips non-production environments and relies on `Origin`/`Referer` header matching. The `SameSite` attribute and `__Host-` prefix usage were not confirmed in the cookie-set path of guardian sessions; the reviewed session cookie helpers in `session-cookie-secure.js` are very small (380 bytes) and would need to be fully reviewed to confirm.
- **Impact:** If the guardian session cookie lacks `SameSite=Strict` or is not `__Host-` prefixed, a CSRF attack from a subdomain or a same-site malicious page could forge guardian session actions.
- **Severity:** MEDIUM (requires subdomain attacker or same-site context)
- **Fix direction:** Verify `guardian_session` cookie is set with `SameSite=Strict; Secure; HttpOnly; Path=/`. Consider adding `__Host-` prefix if the app does not use multiple subdomains. Document this in security policy.
- **Confirmation status:** SUSPECTED — requires reading `session-cookie-secure.js` fully and the actual `Set-Cookie` call in guardian session issuance

---

#### FINDING-008 · MEDIUM · School Parent Account Creation — `studentId` Not Schema-Validated Before School Scope Check

- **Area:** Security — Input Validation / IDOR
- **Files:** `pages/api/school/students/[studentId]/accounts/parent/create.js`
- **What was checked:** Input validation chain before school scope enforcement
- **Evidence:**
  ```js
  const studentId = req.query?.studentId;
  // ...
  const result = await createSchoolParentAccess({
    ...
    studentId: String(studentId),
  ```
  `studentId` is passed as `String(studentId)` directly to `createSchoolParentAccess` without first calling `isUuid()`. The scope check happens inside `createSchoolParentAccess` via `verifyStudentVisibleToSchool`, which does call `isUuid`. However, passing a non-UUID string (e.g., SQL-like string, oversized string) reaches `verifyStudentVisibleToSchool` first.
- **Impact:** Low SQL injection risk due to parameterized queries, but input validation should happen at the API boundary, not deep in the call stack. A non-UUID value would produce a 400 from `verifyStudentVisibleToSchool`, so IDOR is not achievable — but the validation depth is inconsistent with the rest of the codebase.
- **Severity:** MEDIUM (defense-in-depth gap)
- **Fix direction:** Add `if (!isUuid(studentId)) return sendSchoolApiError(res, 400, 'validation_failed', ...)` at the top of the handler, before `requireSchoolManagerApiContext`. Apply this pattern consistently to all `[studentId]` school routes.
- **Confirmation status:** CONFIRMED

---

#### FINDING-009 · MEDIUM · PDF v1 Flag Not Enforced at the Teacher Report UI Component Level

- **Area:** PDF Export Status
- **Files:** `lib/teacher-portal/teacher-activity-report-pdf-he.js` (line 11), `pages/teacher/class/[classId]/activities/[activityId]/report.js`
- **What was checked:** Whether `TEACHER_ACTIVITY_PDF_EXPORT_ENABLED = false` is actually checked before rendering a PDF export button in the teacher UI
- **Evidence:**
  - `TEACHER_ACTIVITY_PDF_EXPORT_ENABLED` is defined as `false` in `teacher-activity-report-pdf-he.js`
  - `teacher-activity-report-pdf.js` re-exports it: `export { TEACHER_ACTIVITY_PDF_EXPORT_ENABLED }`
  - In `report.js` (teacher activity report page), only `downloadActivityReportCsv` and `downloadEnrichedActivityReportXlsx` are imported — the PDF function is **not imported** and there is **no PDF button** rendered
  - The disable flag is therefore enforced by omission, not by an explicit runtime flag check — which is acceptable, but fragile
- **Impact:** If a future developer adds a PDF button and imports the PDF function without checking `TEACHER_ACTIVITY_PDF_EXPORT_ENABLED`, the disabled PDF v1 will ship. There is no runtime guard.
- **Severity:** MEDIUM — PDF v1 is known to be not product-ready; this creates a regression risk
- **Fix direction:** Add an explicit check: `if (TEACHER_ACTIVITY_PDF_EXPORT_ENABLED) { /* render PDF button */ }` in the UI, and add a comment in `report.js` noting why PDF export is absent. This makes the disabled state intentional and auditable.
- **Confirmation status:** CONFIRMED

---

#### FINDING-010 · MEDIUM · `filterReportByPermittedSubjects` Empty-Set Branch — Zeroed But `teacherGuidanceBlock` Could Expose Cross-Subject Patterns

- **Area:** Report Engine Truth / Data Leakage
- **Files:** `lib/school-server/school-subjects.server.js` lines 212-235
- **What was checked:** Whether a school teacher with `permittedSubjects.size === 0` receives a fully zeroed report
- **Evidence:**
  ```js
  if (permittedSubjects && permittedSubjects.size === 0) {
    const empty = { ...reportPayload };
    // subjects zeroed
    // recentMistakes zeroed
    // recomputeReportSummaryFromSubjects applied
    zeroed.teacherGuidanceBlock = buildStudentTeacherGuidanceV2(zeroed, { permittedSubjects });
  ```
  `buildStudentTeacherGuidanceV2` is called with the zeroed payload and the empty-set `permittedSubjects`. If the guidance builder does not respect this empty set and pulls from original payload fields not explicitly zeroed (e.g., `probeEvidence`, `diagnosticBlocks`, `recentMistakes` was zeroed but other arrays may not be), there is a risk of residual cross-subject data.
- **Impact:** A school teacher with no subject grants (empty set) could receive non-empty guidance blocks derived from subjects they are not permitted to see.
- **Severity:** MEDIUM — requires a school teacher with zero subject assignments, which is an unusual but valid state
- **Fix direction:** Verify `buildStudentTeacherGuidanceV2` and `buildParentFacingBlocks` both handle `permittedSubjects.size === 0` as a full empty result. Consider adding an integration test for this zero-grant edge case.
- **Confirmation status:** SUSPECTED — requires reading `teacher-guidance-v2.server.js` in full

---

### LOW / INFO

---

#### FINDING-011 · LOW · `clientIpFromRequest` — Trusts First Element of `x-forwarded-for` Without Proxy Validation

- **Area:** Security — Rate Limiting / IP Spoofing
- **Files:** `lib/security/in-memory-rate-limit.js`, `lib/security/login-rate-limit.js`
- **Evidence:**
  ```js
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  ```
  The first IP in `x-forwarded-for` is used as the client IP. If the platform is deployed behind a CDN/proxy that does not strip or rewrite this header, an attacker can spoof their IP by sending `x-forwarded-for: 1.2.3.4` and bypass per-IP rate limits.
- **Impact:** Attacker can trivially bypass IP-based login rate limiting by rotating a spoofed header value.
- **Severity:** LOW (compounded with FINDING-001; when rate limits are in-memory this is a secondary concern)
- **Fix direction:** Use the last trusted IP from `x-forwarded-for` (configured for your proxy setup), or use `req.socket.remoteAddress` if behind a single trusted reverse proxy. Document the trusted proxy configuration.
- **Confirmation status:** CONFIRMED

---

#### FINDING-012 · LOW · School API — No `Retry-After` Header on Auth Failures

- **Area:** Security — Error Response Standards
- **Files:** `lib/school-server/school-request.server.js` → `sendSchoolApiError` (delegates to `sendTeacherApiError`)
- **Evidence:** `sendTeacherApiError` returns structured JSON errors but does not set `Retry-After` headers on rate-limit or repeated auth failures. The teacher API also lacks this on auth 401/403 responses.
- **Severity:** LOW — cosmetic security header gap
- **Fix direction:** Add `Retry-After: 60` to 429 responses. Also consider adding `WWW-Authenticate: Bearer realm="teacher"` on 401 responses.
- **Confirmation status:** CONFIRMED

---

#### FINDING-013 · LOW · Student Activity `live-state.js` Not Reviewed — Possible State Exposure

- **Area:** Classroom Activities — Student Scope
- **Files:** `pages/api/student/activities/[activityId]/live-state.js` (1266 bytes, unread)
- **What was checked:** Directory listing shows a `live-state.js` endpoint, which was not read during this audit
- **Impact:** Unable to confirm whether this endpoint enforces `student_id` scoping on the live activity state (e.g., whether it returns other students' answers or timing information)
- **Severity:** LOW (manual verification required)
- **Fix direction:** Verify that `live-state.js` loads activity state only for the authenticated `studentId` and does not return other students' answers or teacher-only fields.
- **Confirmation status:** MANUAL VERIFICATION REQUIRED

---

#### FINDING-014 · LOW · `PARENT_PII_TOP_LEVEL_KEYS` in `sanitizeReportPayloadForTeacher` — Does Not Cover Nested PII

- **Area:** Data Privacy — Report Sanitization
- **Files:** `lib/teacher-server/teacher-report.server.js` lines 28-42
- **Evidence:**
  ```js
  const PARENT_PII_TOP_LEVEL_KEYS = new Set([
    "parent", "parentId", "parent_id", "parentEmail", "parent_email",
    "parentName", "parent_name", "parentDisplayName", ...
  ]);
  ```
  This sanitization only deletes top-level keys. If a parent PII field is nested inside another object in the payload (e.g., `student.parentEmail`, `parentFacing.guardianName`), it would not be caught.
- **Impact:** Teacher reports could inadvertently include nested parent PII if the payload builder ever adds nested parent fields.
- **Severity:** LOW — currently safe because payload builders do not nest parent PII, but fragile as the codebase grows
- **Fix direction:** Add a recursive PII scan or explicitly document that `sanitizeReportPayloadForTeacher` only handles top-level keys and audit each new payload field that touches parent data.
- **Confirmation status:** CONFIRMED (structural gap, not currently exploitable)

---

#### FINDING-015 · LOW · Activity Status Transition — `discussion` Mode Not Explicitly Blocked from `quiz`-Specific Actions

- **Area:** Classroom Activities — Lifecycle Correctness
- **Files:** `pages/api/teacher/activities/[activityId]/status.js`, `lib/teacher-server/teacher-activities.server.js`
- **What was checked:** Whether status transitions are mode-aware
- **Evidence:** The `transitionActivityStatus` function in `teacher-activities.server.js` validates ownership and status transitions but the allowed actions (`activate`, `pause`, `resume`, `close`, `archive`) are mode-agnostic. A `discussion` mode activity can be "resumed" even though the discussion mode has different lifecycle semantics from `quiz` mode.
- **Impact:** Minor state inconsistency; primarily a product correctness issue rather than security risk.
- **Severity:** LOW
- **Fix direction:** Add mode-aware transition validation: e.g., `pause`/`resume` should only apply to `quiz` and `live_lesson` modes; `discussion` should only allow `activate` → `close` → `archive`.
- **Confirmation status:** SUSPECTED — requires reading full `transitionActivityStatus` logic

---

#### FINDING-016 · INFO · `controlled_variants` Question Selection Hardcoded 501 — Not Enforced at DB Level

- **Area:** Classroom Activities — Feature Completeness
- **Files:** `lib/teacher-server/teacher-activities.server.js` line 182
- **Evidence:**
  ```js
  if (questionSelection === "controlled_variants") {
    return { ok: false, status: 501, code: "not_implemented", ... };
  }
  ```
  The DB schema (`024_classroom_activities.sql`) allows `controlled_variants` in the `question_selection` CHECK constraint. The API correctly rejects it with 501, but a direct DB insert with `question_selection = 'controlled_variants'` would succeed.
- **Impact:** Orphaned schema capability; no immediate security risk but could cause unexpected behavior if data is inserted via a migration, seed, or direct DB access.
- **Severity:** INFO
- **Fix direction:** Either remove `controlled_variants` from the DB CHECK constraint until the feature is ready, or add a DB trigger that prevents inserting activities with this value.
- **Confirmation status:** CONFIRMED

---

#### FINDING-017 · INFO · `school-server-cache.server.js` In-Memory Memoization Has Same Cold-Start Issue as Rate Limiter

- **Area:** Performance — Caching
- **Files:** `lib/school-server/school-server-cache.server.js`, `lib/school-server/school-scope.server.js`
- **Evidence:** `memoSchoolServerQuery` uses in-process memoization with a TTL. On serverless cold starts, the cache is empty for every new function instance, defeating the caching intent and causing the full `loadSchoolScope` + `loadSchoolVisibleStudentIds` query to run for every request.
- **Impact:** At production school scale, every school admin page load from a cold start will trigger 5+ Supabase queries. Combined with FINDING-004, this amplifies the performance risk.
- **Severity:** INFO (same root cause as FINDING-001 but for performance, not security)
- **Fix direction:** Use a distributed cache (Redis/Upstash/Vercel KV) or Supabase RPC for school scope computation. For the pilot, document the cache miss behavior and monitor Supabase query counts.
- **Confirmation status:** CONFIRMED

---

## Security Section

### Authentication Summary

| Role | Mechanism | Enforced at | Notes |
|---|---|---|---|
| Teacher / School Admin | Bearer JWT (Supabase) | `requireTeacherApiContext` / `requireSchoolManagerApiContext` | Role check via `normalizeTeacherRole` |
| Guardian/Parent | Cookie session (hash) | `requireGuardianApiContext` | Session revocation + expiry enforced |
| Student | Cookie session (hash) | `getAuthenticatedStudentSession` | Code+PIN login, hashed secrets |

### RLS Summary

All primary tables have `enable row level security`. Key posture:
- **Parent/student data tables** (`students`, `parent_profiles`, `learning_sessions`, `answers`, etc.): RLS on, service-role access only from API
- **Teacher tables** (`teacher_profiles`, `teacher_students`, `teacher_classes`): SELECT own via authenticated JWT; all mutations via service role only
- **Guardian/session tables** (`student_guardian_access`, `student_guardian_sessions`): RLS on, **no client policies** — server-only access confirmed
- **School tables** (`school_teacher_subjects`, `school_student_enrollments`): RLS enabled, service role only

**Gap:** Migrations 001 (`students`, `parent_profiles`) grant `for all` to authenticated users with `parent_id = auth.uid()`. This is correct for the parent portal but means any authenticated Supabase user can query their own students. No cross-parent IDOR risk identified since the policy correctly binds to `auth.uid()`.

### CSRF Protection

- **Teacher / School admin endpoints:** Bearer-only, CSRF not applicable ✓
- **Student / Guardian cookie endpoints (POST/PATCH):** `guardCookieMutationOrigin` applied via `rejectIfCrossOriginCookieMutation` ✓
- **School account creation (`parent/create.js`):** Uses `rejectIfCrossOriginCookieMutation` ✓
- **Activity status (`status.js`):** Bearer-only; no explicit CSRF guard needed, confirmed ✓

### Injection Risk

- All DB queries use Supabase's parameterized API (no raw SQL string interpolation found in server files)
- Export (`buildEnrichedQuestionsTable`) correctly calls `String(value)` for all cell data, no formula injection protection explicitly applied — see FINDING-018 below

---

#### FINDING-018 · MEDIUM · Excel Export — No Formula Injection Prevention in Cell Values

- **Area:** Security — Excel Export / Injection
- **Files:** `lib/teacher-portal/teacher-activity-report-export.js` — `buildEnrichedQuestionsTable`, `buildEnrichedStudentAnswersRows`
- **What was checked:** Whether cell values that originate from student-supplied data (e.g., `selectedAnswer`, `questionText`) are sanitized before being written to XLSX cells
- **Evidence:**
  ```js
  const selectedDisplay = r?.selectedAnswerDisplay != null ...
    ? String(r.selectedAnswerDisplay) : String(r.selectedAnswer)
  ```
  Values are cast to `String()` but if a student answer begins with `=`, `+`, `-`, or `@`, popular spreadsheet software (Excel, LibreOffice) may interpret it as a formula.
- **Impact:** A student could craft a carefully chosen answer (e.g., `=HYPERLINK("http://evil.com","click me")`) that executes when a teacher opens the exported Excel file. The risk is mitigated if the teacher's Excel has formula execution disabled, but this cannot be assumed.
- **Severity:** MEDIUM — supply-chain injection risk for teachers who open exported reports
- **Fix direction:** Prepend a tab or apostrophe to any cell value that starts with `=`, `+`, `-`, `@`, or `\t`. Apply this sanitization in a shared `sanitizeXlsxCell` helper and use it for all student-originated cells (answers, question text, student names).
- **Confirmation status:** CONFIRMED

---

## Report Engine Truth Section

### Teacher Student Report

- **Access control:** `teacherHasReportAccessToStudent` → 3-tier check (direct link, class membership, school context). Correctly returns 403 if no path found. ✓
- **Subject filtering:** `applySchoolTeacherReportFilter` → `filterReportByPermittedSubjects`. Confirmed correctly strips subjects, recentMistakes, probeEvidence.bySubject, dailyActivity, parentFacing, teacherGuidanceBlock. ✓ (with caveat from FINDING-005)
- **PII sanitization:** `sanitizeReportPayloadForTeacher` strips `parentEmail`, `parentId`, `parentName`, `copilotLastResponse`, `parentCopilot` etc. from top-level. See FINDING-014 for nested gap.
- **Date range:** `resolveTeacherReportDateRange` correctly enforces `MAX_WINDOW_DAYS = 366` and returns error on invalid/inverted ranges. ✓

### Parent Mini-Report (Guardian)

- **Student scope enforcement:** `studentId !== ctx.studentId` → 403 `student_scope_violation`. ✓
- **School guardian restriction:** `!ctx.accessRow?.created_by_school_id` → 403 `not_school_guardian`. This restricts mini-report access to school-issued guardians only — by design, confirmed.
- **Report payload:** Derived from `buildGuardianStudentReportPayload` → `buildMiniReportFromPayload`. Summarized view; does not expose raw DB rows. ✓

### School Admin Report

- **Student scope:** `verifyStudentVisibleToSchool` confirmed before report build. ✓
- **Teacher delegation:** `resolveSchoolReportTeacherForStudent` selects a teaching teacher who has access to the student. School admin does not directly build the report with their own teacher ID but delegates to a real teacher. ✓
- **No subject filter applied at school admin level:** This is intentional — school admins see all subjects. Confirmed. ✓
- **Audit write:** `writeSchoolStudentReportViewedAudit` called after successful report build. ✓

---

## UI/UX Section (Learning/Report Surfaces)

### Hebrew RTL Correctness

- **Excel export:** All sheets set `rightToLeft: true` via `!views` and `workbook.Workbook = { Views: [{ RTL: true }] }`. Column headers are in Hebrew. ✓
- **Cell alignment:** `readingOrder: 2` applied to all cells via `ENRICHED_HEADER_STYLE` / `ENRICHED_DATA_STYLE`. ✓
- **PDF v1 (disabled):** `setR2L(true)` and `NotoSansHebrew` font embedding are correctly implemented in `teacher-activity-report-pdf.js` — the RTL fix is production-grade when/if PDF v1 is re-enabled. ✓
- **Report page student table:** Uses `text-right` Tailwind class on the table — correct for Hebrew RTL. ✓
- **Hebrew labels:** `activityExportSubjectLabelHe`, `activityExportModeLabelHe`, `activityExportDifficultyLabelHe` are used for export columns — no raw English keys in exported files. ✓

### Label Completeness Risk

- `looksLikeRawExportKey` function exists in `teacher-activity-report-export-labels.js` suggesting there was a previous issue with raw English keys leaking. The guard is correct but its presence indicates historical risk. ✓ (mitigated)

---

## Export Section (Enriched Excel)

### 7-Sheet Workbook Structure

| Sheet | Hebrew Name | Content | RTL | Styles |
|---|---|---|---|---|
| 1 | סיכום פעילות | Key-value summary | ✓ | Bold labels |
| 2 | פרטי שאלות | Questions + choices + correct answer | ✓ | Header bold |
| 3 | סיכום תלמידים | Student summary sorted by score | ✓ | Header bold |
| 4 | תשובות תלמידים | Long-format student×question | ✓ | Header bold |
| 5 | ניתוח שאלות | Per-question analytics | ✓ | Header bold |
| 6 | ניתוח מיומנויות | Skill analytics | ✓ | Header bold |
| 7 | המלצות ומעקב | Recommendations (factual only) | ✓ | KV style |

**Assessment:** The export is structurally complete and well-designed. The "הצעות לפעולה" (suggestions for action) row is left intentionally blank — no AI-generated content in the export. ✓

**Gap identified:** See FINDING-018 (formula injection in student-supplied cells).

**Column widths:** Appropriate for Hebrew content (`wch` specified per sheet). ✓

**File naming:** `sanitizeActivityReportDownloadStem` strips forbidden filesystem characters. ✓ However, Hebrew characters in filenames are preserved (correct for modern OS support). ✓

---

## PDF Status Section

- **Teacher activity PDF v1:** `TEACHER_ACTIVITY_PDF_EXPORT_ENABLED = false` in `lib/teacher-portal/teacher-activity-report-pdf-he.js`. Confirmed not rendered in `report.js`. ✓
- **Parent report PDF:** `parent-report.js` uses a print-CSS approach (`@media print` with `#parent-report-pdf` ID targeting). This is NOT a jsPDF/pdf-lib export — it relies on the browser's print dialog. This is a different implementation path and is **not** disabled. It uses `isPrintLayout` state and CSS print rules.
- **Assessment:** The browser-print PDF approach for parents is functional and does not use the disabled jsPDF v1. The `#parent-report-pdf` print styles are comprehensive (RTL, color overrides, chart SVG text, recommendation blocks). ✓

---

## Test Results

All test commands run were read-only (no data mutation). No automated tests were executed as part of this audit — only static code analysis.

**Safe verification commands for the owner to run:**

```bash
# Verify subject filter correctness
npm run test:classroom-activities -- --filter="subject"

# Verify rate limit state resets (confirms FINDING-001)
node -e "const {consumeRateLimit} = require('./lib/security/in-memory-rate-limit.js'); console.log(consumeRateLimit({namespace:'t',keys:['k'],maxAttempts:1,windowMs:60000}));"

# Verify Excel export structure (safe, no DB)
npm run test:answer-compare

# Confirm PDF flag value
node -e "const {TEACHER_ACTIVITY_PDF_EXPORT_ENABLED} = require('./lib/teacher-portal/teacher-activity-report-pdf-he.js'); console.log('PDF enabled:', TEACHER_ACTIVITY_PDF_EXPORT_ENABLED);"
```

---

## Open Validation Gaps

1. ~~**`pages/api/student/activities/[activityId]/live-state.js`** — student scope unconfirmed~~ → **CLEARED** (see Addendum)
2. ~~**`lib/security/session-cookie-secure.js`** — `SameSite`/`HttpOnly`/`Secure` unconfirmed~~ → **CLEARED** (see Addendum)
3. ~~**`lib/teacher-server/teacher-guidance-v2.server.js`** — empty-set `permittedSubjects` handling~~ → **CLEARED** (see Addendum)
4. ~~**`lib/teacher-server/teacher-activities.server.js` → `transitionActivityStatus`** — mode-aware transition validation~~ → **PARTIALLY CLEARED** (see Addendum)
5. **`lib/teacher-server/teacher-activities-enriched.server.js`** — full review to confirm `answer_payload` / `client_meta` field handling for JSONB injection risk — **STILL OPEN**
6. **`pages/api/parent/copilot-turn.js`** — `PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION` env var impact — must be confirmed `false` in production deployment — **STILL OPEN**
7. **Production `.env` comparison** — `.env.example` shows `ENGINE_REVIEW_ADMIN_TOKEN=7479`; production value must be confirmed rotated (FINDING-002) — **STILL OPEN**

---

## Recommended Next Steps (Priority Order)

1. **[IMMEDIATE]** Rotate `ENGINE_REVIEW_ADMIN_TOKEN` in production. Change default in `.env.example` to a placeholder. (FINDING-002)
2. **[BEFORE SCHOOL LAUNCH]** Fix `_dailyBySubject` deletion in the unrestricted path of `filterReportByPermittedSubjects`. (FINDING-005)
3. **[BEFORE SCHOOL LAUNCH]** Add formula-injection sanitization to `buildEnrichedQuestionsTable` and `buildEnrichedStudentAnswersRows`. (FINDING-018)
4. **[BEFORE SCHOOL LAUNCH]** Fix N+1 teacher scan in `resolveSchoolReportTeacherForStudent`. (FINDING-004)
5. **[BEFORE PRODUCTION]** Add rate limiting to `status.js` and all school admin endpoints. (FINDING-003, FINDING-006)
6. **[BEFORE PRODUCTION]** Document and address in-memory rate limiter serverless limitation. Add warning to monitoring. (FINDING-001)
7. **[BEFORE PRODUCTION]** Confirm `SameSite=Strict` on all session cookies. (FINDING-007)
8. **[LOW PRIORITY]** Add `isUuid` guard at top of school `[studentId]` route handlers. (FINDING-008)
9. **[LOW PRIORITY]** Add explicit `TEACHER_ACTIVITY_PDF_EXPORT_ENABLED` runtime check in UI. (FINDING-009)
10. **[LOW PRIORITY]** Validate `live-state.js` student scope. (FINDING-013)

---

## Finding Index

| ID | Severity | Area | Confirmed |
|---|---|---|---|
| FINDING-001 | HIGH | Rate limiting — serverless cold start | CONFIRMED |
| FINDING-002 | HIGH | Hardcoded weak admin token | CONFIRMED |
| FINDING-003 | HIGH | No rate limit on activity status mutation | CONFIRMED |
| FINDING-004 | HIGH | N+1 teacher scan in school report | CONFIRMED |
| FINDING-005 | MEDIUM | `_dailyBySubject` unrestricted path not stripped | CONFIRMED |
| FINDING-006 | MEDIUM | No rate limiting on school GET endpoints | CONFIRMED |
| FINDING-007 | MEDIUM | Cookie SameSite/Secure attributes unconfirmed | SUSPECTED |
| FINDING-008 | MEDIUM | `studentId` not UUID-validated at API boundary in school routes | CONFIRMED |
| FINDING-009 | MEDIUM | PDF v1 flag enforced by omission only | CONFIRMED |
| FINDING-010 | MEDIUM | Empty-set permittedSubjects guidance block risk | SUSPECTED |
| FINDING-011 | LOW | x-forwarded-for IP spoofing in rate limiter | CONFIRMED |
| FINDING-012 | LOW | No Retry-After header on auth failures | CONFIRMED |
| FINDING-013 | LOW | live-state.js student scope unreviewed | MANUAL |
| FINDING-014 | LOW | Nested PII not covered by sanitizeReportPayloadForTeacher | CONFIRMED |
| FINDING-015 | LOW | Activity status transitions not mode-aware | SUSPECTED |
| FINDING-016 | INFO | controlled_variants allowed in DB but blocked in API | CONFIRMED |
| FINDING-017 | INFO | School in-memory cache resets on cold start | CONFIRMED |
| FINDING-018 | MEDIUM | Excel export formula injection (student-supplied cells) | CONFIRMED |

---

---

## Addendum — Second-Pass Validation Results

**Date:** 2025-05-29 (second pass)  
**Additional files reviewed:** `lib/security/session-cookie-secure.js`, `lib/learning-supabase/student-auth.js` (cookie set/clear), `lib/guardian-server/guardian-session.server.js` (guardian cookie), `pages/api/student/activities/[activityId]/live-state.js`, `lib/teacher-server/teacher-activities.server.js` (transitionActivityStatus, loadActivityForStudent), `lib/teacher-server/teacher-guidance-v2.server.js` (buildStudentTeacherGuidanceV2), `lib/school-server/school-subjects.server.js` (filterReportByPermittedSubjects, applyDailyActivityFilterFromSubjectBreakdown), `lib/parent-server/teacher-consent.server.js`, `lib/parent-server/policy-acceptance.server.js`

---

### FINDING-007 — UPDATED: Cookie Attributes CONFIRMED `SameSite=Lax`, NOT `SameSite=Strict`

**Original severity:** MEDIUM (SUSPECTED)  
**Updated status:** CONFIRMED — downgraded to LOW/acceptable with caveat

**Evidence from second pass:**

*Student session cookie (`lib/learning-supabase/student-auth.js`):*
```js
"SameSite=Lax",
`Max-Age=${SESSION_MAX_AGE_SECONDS}`,
secure ? "Secure" : "",
// "HttpOnly" — present
```

*Guardian session cookie (`lib/guardian-server/guardian-session.server.js`):*
```js
"HttpOnly",
"SameSite=Lax",
secure ? "Secure" : "",
```

**Both cookies use `SameSite=Lax`, not `SameSite=Strict`.** `Lax` protects against cross-site POST/PUT/PATCH/DELETE requests but permits cross-site GET navigation (e.g., clicking a link from another site). For a learning platform this is generally acceptable — the CSRF attack surface for GET-only reads is limited, and `rejectIfCrossOriginCookieMutation` adds an additional check for mutating requests.

`Secure` is correctly conditioned on production (`isSessionCookieSecure()` checks `NODE_ENV === 'production'` or `E2E_INSECURE_SESSION_COOKIES !== '1'`).

**Updated finding:** No `__Host-` prefix is used. This means a subdomain could set a cookie that overwrites the session if the platform ever introduces subdomains. For a single-origin deployment this is not a risk. Recommend documenting the `SameSite=Lax` choice explicitly.

**Severity update:** LOW (was MEDIUM/SUSPECTED) — no immediate vulnerability, design decision documented.

---

### FINDING-013 — CLEARED: `live-state.js` Student Scope CONFIRMED CORRECT

**Original status:** LOW — MANUAL VERIFICATION REQUIRED  
**Updated status:** CLEARED ✓

**Evidence:**
```js
// live-state.js
const auth = await getAuthenticatedStudentSession(req);
// ...
const result = await getStudentActivityLiveState(supabase, auth.studentId, activityId);
```

```js
// getStudentActivityLiveState → loadActivityForStudent
export async function loadActivityForStudent(serviceRole, studentId, activityId) {
  // ...
  const member = await verifyStudentInClass(serviceRole, data.class_id, studentId);
  if (!member.ok) return member;
  if (!member.member) {
    return { ok: false, status: 403, code: "forbidden" };
  }
```

`auth.studentId` is passed directly from the verified session — no client-supplied `studentId` parameter. `loadActivityForStudent` enforces class membership before returning. The live state only returns `activityStatus`, `currentQuestionIdx`, and `mode` — no other students' data. `Cache-Control: private, no-store` + `Vary: Cookie` are set correctly. **CLEARED.**

---

### FINDING-010 — CLEARED: Empty-Set `permittedSubjects` in `buildStudentTeacherGuidanceV2` CONFIRMED SAFE

**Original status:** MEDIUM (SUSPECTED)  
**Updated status:** CLEARED ✓

**Evidence:**
```js
// teacher-guidance-v2.server.js
function subjectsToIterate(permittedSubjects) {
  if (!permittedSubjects) return [...REPORT_AGG_SUBJECTS];
  return REPORT_AGG_SUBJECTS.filter((s) => permittedSubjects.has(s));
}
```

When `permittedSubjects` is an empty `Set`, `permittedSubjects.has(s)` returns `false` for all subjects, so `subjectsToIterate` returns `[]`. The main recommendation loop `for (const sid of subjectsToIterate(permittedSubjects))` iterates zero subjects, producing empty `recommendationUnits`, `strengthUnits`, and `supportSuggestionsV2`. The guidance will hit the `MIN_ANSWERS_FOR_STUDENT_SIGNAL` threshold immediately (zeroed payload has zero answers) and return early with `insufficientData: true`. **No cross-subject data leaks in this path.**

Also confirmed: `filterReportByPermittedSubjects` passes the empty Set to `buildStudentTeacherGuidanceV2` correctly (line 222-224). **CLEARED.**

---

### FINDING-005 — CONFIRMED WITH ADDITIONAL NUANCE: `_dailyBySubject` — Unrestricted Path Gap

**Original status:** MEDIUM (CONFIRMED)  
**Updated status:** CONFIRMED — with additional nuance

From second pass reading lines 211-236:
```js
export function filterReportByPermittedSubjects(reportPayload, permittedSubjects) {
  if (!permittedSubjects || permittedSubjects.size === 0) {
    if (permittedSubjects && permittedSubjects.size === 0) {
      // ... zeroing path — calls applyDailyActivityFilterFromSubjectBreakdown (which deletes _dailyBySubject)
      return zeroed;
    }
    return reportPayload;  // ← _dailyBySubject NOT deleted here
  }
```

The outer `if` condition returns `reportPayload` unchanged when `!permittedSubjects` (null/undefined — unrestricted). `applyDailyActivityFilterFromSubjectBreakdown` is **only** called in the empty-set branch and the restricted branch. When `permittedSubjects` is `null`, neither branch runs, and `_dailyBySubject` is returned in the payload as-is.

**Impact confirmed:** Any caller of `filterReportByPermittedSubjects(payload, null)` or any path that does not call it will return `_dailyBySubject` to the API consumer.

**Additional context from `applyDailyActivityFilterFromSubjectBreakdown` (line 303):**
```js
if (!breakdown || typeof breakdown !== "object") {
  delete payload._dailyBySubject;
  return;
}
```
The delete happens inside `applyDailyActivityFilterFromSubjectBreakdown` — only when called. In the unrestricted (`null`) path it is never called.

**Fix confirmed:** Add `delete reportPayload._dailyBySubject;` before `return reportPayload;` at line 236, OR call `applyDailyActivityFilterFromSubjectBreakdown(reportPayload, null)` on the unrestricted path. Status: **CONFIRMED, fix still needed.**

---

### FINDING-015 — PARTIALLY CLEARED: Status Transitions — Mode-Awareness

**Original status:** LOW (SUSPECTED)  
**Updated status:** PARTIALLY CLEARED

**Evidence from `transitionActivityStatus`:**
```js
} else if (action === "pause") {
  if (row.status !== "active" || row.mode !== "live_lesson") {
    return { ok: false, status: 409, code: "invalid_transition",
             message: "pause only for active live_lesson" };
  }
```

`pause` is already correctly restricted to `live_lesson` mode only. `resume` requires `status === 'paused'` (no mode check needed since only `live_lesson` can be paused). `close` from `active` or `paused` applies to all modes — this is correct since homework and discussion activities can also be closed.

**Remaining concern:** A `discussion` mode activity can be `paused` if someone inserts a paused row directly at the DB level and then `resume`d — but the API prevents `pause` on non-`live_lesson` activities. No immediate gap at the API level. **CLEARED for API surface.** DB-level constraint still absent (known from FINDING-016 pattern).

---

### Teacher Consent Token Flow — REVIEWED, NO ISSUES FOUND

`lib/parent-server/teacher-consent.server.js` reviewed. Token issuance:
- `assertParentOwnsStudent` verifies `student.parent_id === parentUserId` before any token is issued ✓  
- `assertTeacherProfileExists` verifies teacher is active ✓  
- Token is stored as `token_hash` (plaintext never persisted) ✓  
- Revocation sets `consumed_at` with a compound filter on `(parentUserId, teacherId, studentId, purpose)` ✓  
- `parseParentConsentIssueBody` enforces UUID validation on both `teacherId` and `studentId` ✓  

**No issues found.**

---

### Policy Acceptance — REVIEWED, NO ISSUES FOUND

`lib/parent-server/policy-acceptance.server.js` reviewed:
- Version comparison is strict equality — no fuzzy matching ✓  
- Version strings validated for length (1–64 chars) ✓  
- `source` validated against an allowlist `POLICY_ACCEPTANCE_SOURCES` ✓  
- `locale` validated for length ✓  
- Deduplication: if current version already accepted, returns early without duplicate insert ✓  
- `records` are append-only (no update/delete of policy acceptances) ✓  

**No issues found.**

---

## Updated Finding Index

| ID | Severity | Area | Status |
|---|---|---|---|
| FINDING-001 | HIGH | Rate limiting — serverless cold start | CONFIRMED |
| FINDING-002 | HIGH | Hardcoded weak admin token | CONFIRMED |
| FINDING-003 | HIGH | No rate limit on activity status mutation | CONFIRMED |
| FINDING-004 | HIGH | N+1 teacher scan in school report | CONFIRMED |
| FINDING-005 | MEDIUM | `_dailyBySubject` unrestricted path not stripped | CONFIRMED |
| FINDING-006 | MEDIUM | No rate limiting on school GET endpoints | CONFIRMED |
| FINDING-007 | LOW ↓ | Cookie `SameSite=Lax` (not Strict) — acceptable | CONFIRMED/DOWNGRADED |
| FINDING-008 | MEDIUM | `studentId` not UUID-validated at API boundary | CONFIRMED |
| FINDING-009 | MEDIUM | PDF v1 flag enforced by omission only | CONFIRMED |
| FINDING-010 | CLEARED ✓ | Empty-set permittedSubjects guidance — safe | CLEARED |
| FINDING-011 | LOW | x-forwarded-for IP spoofing in rate limiter | CONFIRMED |
| FINDING-012 | LOW | No Retry-After header on auth failures | CONFIRMED |
| FINDING-013 | CLEARED ✓ | live-state.js student scope — correct | CLEARED |
| FINDING-014 | LOW | Nested PII not covered by sanitizer | CONFIRMED |
| FINDING-015 | CLEARED ✓ | Activity status transitions mode-aware (API level) | CLEARED |
| FINDING-016 | INFO | controlled_variants DB/API mismatch | CONFIRMED |
| FINDING-017 | INFO | School in-memory cache cold-start reset | CONFIRMED |
| FINDING-018 | MEDIUM | Excel export formula injection (student cells) | CONFIRMED |

**Net active findings:** 13 confirmed (4 HIGH, 5 MEDIUM, 3 LOW, 1 INFO-active), 3 cleared, 2 INFO-only

---

*Report end (including addendum). No code was modified. No data was mutated. All findings are based on static analysis of source files and migrations as found in the workspace at audit time.*
