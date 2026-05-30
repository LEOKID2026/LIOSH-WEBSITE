---
name: Phase 1-3 Security Closure
overview: "Implementation plan for confirmed Phase 1-3 security failures: parent policy persona bypass, deactivated teacher on me/onboard, and student session survival after school block/revoke. Phase 4 (school portal) is explicitly excluded."
todos:
  - id: fix-p1-4
    content: "Fix policy acceptance safely: prevent teacher/admin/non-parent personas from provisioning parent entitlement in lib/parent-server/policy-acceptance.server.js / resolveAuthenticatedParentUserId. Do not rely only on app_metadata.role unless code inspection proves it covers all teacher/admin accounts; otherwise use persona/entitlement checks. Document the evidence either way in the final summary."
    status: completed
  - id: fix-p2-8-me
    content: "Fix deactivated teacher on me.js: add is_account_active === false check after limitsRow is loaded in pages/api/teacher/me.js"
    status: completed
  - id: fix-p2-8-onboard
    content: "Fix deactivated teacher on onboard.js: load and check teacher_limits.is_account_active before allowing onboard in pages/api/teacher/onboard.js"
    status: completed
  - id: fix-p3-2-export
    content: Export endLiveStudentSessions from lib/teacher-server/teacher-student-login-access.server.js (remove module-private)
    status: completed
  - id: fix-p3-2-sessions
    content: Call endLiveStudentSessions in setSchoolStudentBlocked, revokeSchoolStudentAccess, and rotateSchoolStudentPin inside lib/school-server/school-account-management.server.js
    status: completed
  - id: fix-p3-2-auth
    content: "Defense-in-depth: re-validate access_code_id in getAuthenticatedStudentSession inside lib/learning-supabase/student-auth.js"
    status: completed
  - id: write-selftest
    content: Write scripts/security/wave4a-phase1-3-security-selftest.mjs covering all 3 confirmed FAIL cases
    status: completed
  - id: run-build-and-selftests
    content: Run npm run build + wave1/2a/2b/2h selftests + new wave4a selftest; record results
    status: completed
  - id: create-zip
    content: Create ZIP deliverable with changed files, new test, plan, summary, test results, and not-included section
    status: completed
isProject: false
---

# Phase 1–3 Security Closure — Implementation Plan

**Current build scope:** Phase 1 (Parent/children), Phase 2 (Private teacher), Phase 3 (Student session lifecycle).

**Verification findings source:** Direct read-only code inspection completed in prior session.  
Live HTTP tests: not run — manual verification by owner and reviewer after delivery.

---

## Plan Is the Sole Source of Execution Instructions

All implementation constraints, approvals, exclusions, and precision requirements must be written in this plan file.

No additional implementation approvals, hidden assumptions, or out-of-plan instructions may be taken from chat message text.

The build must follow this plan only.

If any requirement is unclear or conflicts with the plan, stop and update the plan before coding.

---

## Scope Declaration

### IN SCOPE — Current build

- **A. Parent / own children** — fix policy acceptance persona bypass
- **B. Private teacher / own students and subjects** — fix deactivated teacher on `me` and `onboard`
- **C. Student session/access lifecycle** — fix school block/revoke/rotate not ending sessions + defense-in-depth auth re-validation

### EXPLICITLY EXCLUDED — Not part of this build

- **ENV handling** — excluded by owner instruction throughout.
- **Phase 4 — School Portal / school manager / school operator / full school tenant security** — will be handled only later, after an explicit owner decision. It is not part of the current build scope. This includes: school audit log completeness, school operator/staff audit visibility, `loadSchoolClassInScope` OR logic, multi-school membership handling, school DPA/legal documentation.
- **School manager/operator/staff audit-log implementation** — deferred to Phase 4.
- **School DPA / legal / documentation implementation** — not a code issue; deferred to Phase 4.
- **Batch monitor subject re-check (P2-4)** — deferred to P2 Later; read-only own-data gap, no cross-teacher leak.
- **Commit, push, or deploy** — none in this build.
- **New npm dependencies** — none permitted.

---

## Verification Findings (prior read-only pass)

---

## Phase 1 — Parent / Children

### P1-1: Parent A cannot access Parent B child report-data
**Verdict: PASS**

Double-locked by RLS + application filter:
- `requireParentApiContext` → `resolveBearerUser` → Supabase `auth.getUser()` → `hasActivePersonaEntitlement(..., "parent")`
- Then `ctx.bearerSupabase.from("students").eq("parent_id", ctx.parentUserId)` — Supabase RLS policy `students_parent_full_access` (`parent_id = auth.uid()`) provides a second layer
- Foreign `studentId` → `.maybeSingle()` → null → 404 before service-role aggregation runs

File: [`pages/api/parent/students/[studentId]/report-data.js`](pages/api/parent/students/[studentId]/report-data.js) lines 54–65.  
Automated live HTTP test: **PENDING** (R-OWN-01 in risk register).

---

### P1-2: Parent A cannot access/link/update unrelated student IDs
**Verdict: PASS**

- **create-student.js**: inserts `parent_id: ctx.parentUserId` via `ctx.bearerSupabase`; limit counted via `.eq("parent_id", ctx.parentUserId)`
- **update-student.js**: `bearerSupabase.update().eq("id", studentId).eq("parent_id", ctx.parentUserId)` — foreign ID → no matching row → 403
- **delete-student.js**: RPC `delete_parent_owned_student` is a security-definer function with `WHERE s.parent_id = auth.uid()` — foreign ID raises exception
- **verifyParentOwnsStudent** (`lib/parent-server/parent-activity.server.js`): `eq("parent_id", parentId)` on service-role before all activity mutations

All student CRUD routes use `requireParentApiContext` before the ownership filter.

---

### P1-3: Regular parent report includes only parent-owned data
**Verdict: PASS**

`aggregateParentReportPayload` runs only on the student row already confirmed to match `parent_id`. The `includeParentActivities: true` flag is exclusive to the parent path; teacher and school report routes omit it. `enrichPayloadWithParentFacing` is also parent-only.

---

### P1-4: Policy acceptance route persona bypass
**Verdict: FAIL — Confirmed real gap**

**Severity: P1** (not P0 in isolation, but enables privilege escalation path)

**Route:** `POST /api/parent/policy-acceptance/accept.js`  
**Guard used:** `resolveAuthenticatedParentUserId` — bearer → `auth.getUser()` → returns any authenticated Supabase user ID. **No** `hasActivePersonaEntitlement(..., "parent")` check.

**What a teacher JWT can do by calling this route:**
1. `recordParentPolicyAcceptance` inserts a row in `parent_policy_acceptances` keyed to the teacher's `user_id`
2. `provisionParentEntitlementOnAccept` calls `upsertActiveEntitlement(db, teacherUserId, "parent")` — creates/activates a `parent` entitlement row for the teacher
3. Creates `parent_account_settings` for the teacher (`account_status: "active"`, `reports_enabled: true`)

This means a teacher account gains a **valid parent persona entitlement** and can then call `requireParentApiContext`-guarded routes (`create-student.js`, `report-data.js`, etc.) as a parent — though the data scope remains limited to students whose `parent_id` equals the teacher's `user_id`.

**Root cause:** Every `auth.users` signup triggers a `parent_profiles` row (trigger `on_auth_user_created_parent_profile` in `001_learning_core_foundation.sql`), so the FK constraint does not block teacher accounts.

**Reproduction steps:**
1. Sign in as a teacher — obtain Bearer token
2. `POST /api/parent/policy-acceptance/accept` with valid `termsVersion` / `privacyVersion` in body
3. Check `account_persona_entitlements` — teacher now has an active `parent` entitlement
4. Call `GET /api/parent/students/list-students` with teacher token — 200 (empty, because teacher has no children)
5. Call `POST /api/parent/create-student` with teacher token — 200, student created with `parent_id = teacher.userId`

_Historical recommended fix from prior read-only verification. Superseded by Section A of the Implementation Plan below._

---

### P1-5: Parent logout / session behavior
**Verdict: PARTIAL**

- **Parent:** No server-side logout route. `pages/parent/dashboard.js` calls `supabase.auth.signOut()` (client-side SDK). Supabase JWT is invalidated on the server via Supabase's own session management, but the codebase has no explicit `POST /api/parent/logout` to revoke the bearer or clear any cookie. Adequate for normal browser use; questionable on shared/kiosk machines.
- **Student:** `pages/api/student/logout.js` clears `liosh_student_session` cookie **and** sets `revoked_at + ended_at` on the session DB row. **PASS** for student.
- **PWA:** Service worker pre-caches `/`, `/game`, `/learning` (public pages only) — no auth API responses cached. Student-protected routes depend on `/api/student/me` fetch at runtime. Logout correctly clears the HttpOnly cookie; the SW cache does not hold auth data.
- **Gap:** No "logout all devices" UX for students; a parent has no way to invalidate a student session from the parent dashboard (only teacher or school can via revoke/rotate path).

---

## Phase 2 — Private Teacher

### P2-1: Private teacher can access only linked students
**Verdict: PASS**

`teacherHasReportAccessToStudent` in [`lib/teacher-server/teacher-report.server.js`](lib/teacher-server/teacher-report.server.js) tries three paths in order:
1. Direct `teacher_students` link — returns allowed
2. Student in teacher's own `teacher_class_students` (class owned by teacher) — returns allowed
3. School context (`teacherHasSchoolContextReportAccess`) — requires `school_teacher_memberships` row; private teachers have none → `membership: null` → `{ allowed: false }`

Unlinked school students → `{ ok: true, allowed: false }` → callers return **403 `student_not_linked`**.

---

### P2-2: Private teacher cannot access school-managed/unlinked students
**Verdict: PASS**

Confirmed by P2-1 logic. A private teacher with no school membership cannot enter the school-context branch. The only way a school student is accessible is via an explicit private `teacher_students` link or class roster entry — both require teacher creation, which is blocked for school staff by `rejectIfSchoolTeacher` on the create/link mutations.

---

### P2-3: Subject grants enforced in activity creation
**Verdict: PASS**

- Classroom activity (`POST /api/teacher/activities/index.js`): calls `assertActivitySubjectAllowed` → `assertPrivateTeacherSubjectAllowed` for non-school teachers → queries `private_teacher_subjects.eq("teacher_id", teacherId).eq("subject", subjectKey)` → 403 `subject_not_permitted` if missing
- Individual student activity (`POST /api/teacher/student-activities/index.js`): same gate + `assertTeacherCanManageStudentAccess` (student linkage check)

---

### P2-4: Subject grants enforced in batch monitor read
**Verdict: PARTIAL — Confirmed gap (lower severity)**

`GET /api/teacher/student-activities/batch/[batchId].js` → `loadStudentActivityBatchMonitor` queries `student_activities` filtered only by `batch_id + teacher_id`. No subject re-validation on read. A private teacher whose subject grant was revoked after creating a batch can still read the batch monitor.

**Severity: P2** — read-only access to data the teacher originally created and owns; no cross-teacher data leak; subject grant enforcement is correctly applied at create time.

---

### P2-5: Subject grants enforced in activity report and export
**Verdict: PASS**

- Individual activity report (`/api/teacher/student-activities/[activityId]/report`): `buildStudentActivityReportPayload` → `loadTeacherStudentActivityOwned` → `assertActivitySubjectAllowed` on the owned activity's subject
- Classroom activity report (`/api/teacher/activities/[activityId]/report`): `buildActivityReportPayload` → same gate
- Report export (`/api/teacher/activities/[activityId]/report-export`): `buildEnrichedActivityReportPayload` → `buildActivityReportPayload` → same gate

---

### P2-6: Subject grants enforced in student diagnostic report and parent preview
**Verdict: PASS for access gate; PARTIAL for per-subject filtering**

- Student linkage check (`teacherHasReportAccessToStudent`): **PASS** — unlinked students blocked at 403
- `applySchoolTeacherReportFilter` for private teachers: `loadTeacherPermittedSubjects` returns `permittedSubjects: null` when no school membership → `filterReportByPermittedSubjects` skips filtering → **no subject stripping from aggregate report for private teachers**. This is by-design: subject enforcement for private teachers is on activity mutations, not on the aggregate diagnostic payload. The diagnostic report itself does not expose other-teacher activities.

---

### P2-7: Teacher A cannot export Teacher B activity report
**Verdict: PASS**

`loadTeacherActivityOwned` (used in all export/report paths) queries `classroom_activities.eq("teacher_id", teacherId)`. Teacher A's `teacherId` does not match Teacher B's activity → 404 `activity_not_found`.

---

### P2-8: Deactivated private teacher blocked from me/onboard
**Verdict: FAIL — Confirmed real gap**

**Severity: P1**

- `GET /api/teacher/me.js` and `POST /api/teacher/onboard.js` use `resolveAuthenticatedTeacherUserId`, which checks JWT validity and persona entitlement — **but not** `teacher_limits.is_account_active`
- `requireTeacherApiContext` (used by all other teacher routes) does check `isAccountActive === false` → 403 `account_deactivated`
- A deactivated teacher can still: read their own profile and limits, complete onboarding

**Reproduction steps:**
1. Admin sets `teacher_limits.is_account_active = false` for a teacher
2. Teacher calls `GET /api/teacher/me` with their JWT → **200** (expected: 403)
3. Teacher calls any other route (e.g., `/api/teacher/classes`) → **403** (correct)

_Historical recommended fix from prior read-only verification. Superseded by Section B of the Implementation Plan below._

---

## Phase 3 — Student Session / Access Lifecycle

### P3-1: Blocked/revoked student code cannot log in
**Verdict: PASS**

`pages/api/student/login.js` filters: `.eq("is_active", true).is("revoked_at", null)` on `student_access_codes`. Blocked/revoked codes → no matching row → 401 with generic error. In-memory rate limit (`lib/security/login-rate-limit.js`) prevents brute-force.

---

### P3-2: Existing active student session survives school block/revoke
**Verdict: FAIL — Confirmed real gap (C1)**

**Severity: P0 for real-student pilot**

`setSchoolStudentBlocked` and `revokeSchoolStudentAccess` in [`lib/school-server/school-account-management.server.js`](lib/school-server/school-account-management.server.js) update `student_access_codes` only. Neither calls `endLiveStudentSessions` or sets anything on `student_sessions`.

`getAuthenticatedStudentSession` validates:
- `student_sessions.revoked_at` — not touched by school block
- `student_sessions.ended_at` — not touched by school block
- `student_sessions.expires_at` — up to 7 days from login
- `students.is_active` — not touched by school block

**Result:** After school block/revoke, the student's cookie remains valid for up to 7 days. The student can continue to:
- Call `/api/student/me` → 200
- Start activities → 200
- Submit answers → 200

**Asymmetry:** Teacher-portal revoke/rotate **does** call `endLiveStudentSessions` (sets `ended_at`), so teacher actions are consistent. School portal actions are not.

**Also confirmed:** `rotateSchoolStudentPin` (school portal) does not call `endLiveStudentSessions` — the old session remains valid after a PIN change.

**Reproduction steps:**
1. Student logs in → cookie issued
2. School manager blocks the student's access code via `/api/school/students/{id}/accounts/student/block`
3. Student's cookie still valid → `GET /api/student/me` returns 200 with student data
4. Student can start and submit activities normally until session expires

_Historical recommended fix from prior read-only verification. Superseded by Section C of the Implementation Plan below._

---

### P3-3: Student A cannot start/submit Student B activity
**Verdict: PASS**

All `/api/student/activities/[activityId]/*` handlers derive `studentId` exclusively from `auth.studentId` (session cookie) — not from request body or query. `recordStudentActivityAnswer`, `startStudentActivity`, `submitStudentActivity` all receive `auth.studentId`. No path reads `studentId` from body.

---

### P3-4: Cross-class activity access blocked
**Verdict: PASS**

`loadActivityForStudent` → `verifyStudentInClass` queries `teacher_class_students.eq("class_id", data.class_id).eq("student_id", studentId)`. Student A cannot access a classroom activity from a class where only Student B is enrolled. Discussion mode adds an additional per-assignment check.

---

### P3-5: Archived/closed activity cannot be started or submitted
**Verdict: PASS**

`startStudentActivity` checks `row.status !== "active"` and `row.status !== "paused"` → 409 `activity_not_available`. `isActivityAcceptingAnswers` (called on submit) also blocks `status === "closed"`, `"archived"`, `"draft"`.

---

### P3-6: Logout clears access (including PWA mode)
**Verdict: PASS**

`pages/api/student/logout.js`:
- `clearStudentSessionCookie(res)` — sets `Max-Age=0` on `liosh_student_session`
- Sets `revoked_at + ended_at` on the session DB row for the current token

PWA service worker caches only public pages (`/`, `/game`, `/learning`); API responses are never cached. After logout, `StudentAccessGate` fetches `/api/student/me` → 401 → redirect to login.

---

## Phase 4 — School Portal (NOT IN CURRENT SCOPE)

Phase 4 — School Portal / school manager / school operator / full school tenant security will be handled only later, after an explicit owner decision. It is not part of the current build scope.

Known status from prior audit for reference only:
- Cross-school report-data: PASS (security matrix 27/27)
- Subject gate for school teachers: PASS
- School audit log completeness: PARTIAL (deferred to Phase 4)
- `loadSchoolClassInScope` OR logic: PARTIAL (deferred to Phase 4)

---

## Implementation Plan

### A. Fix: Parent policy acceptance persona bypass (P1-4)

**Files to change:** [`lib/parent-server/policy-acceptance.server.js`](lib/parent-server/policy-acceptance.server.js) — function `resolveAuthenticatedParentUserId`

#### Security requirement

The `POST /api/parent/policy-acceptance/accept` route must not allow teacher, admin, or any other non-parent persona to create a policy acceptance record or trigger `provisionParentEntitlementOnAccept`. This must be enforced server-side, not through UI hiding.

**Minimum blocked cases (must be enforced):**
- Teacher JWT → `POST /api/parent/policy-acceptance/accept` → **403 before any record is written**
- Admin JWT → `POST /api/parent/policy-acceptance/accept` → **403 before any record is written**
- Any known non-parent persona → no parent entitlement provisioning allowed

**Minimum allowed cases (must remain working):**
- Real first-time parent user (no prior parent entitlement yet) → policy acceptance proceeds normally
- Existing parent entitlement user → policy status and acceptance remain valid

#### Implementation approach — choose one, document the choice in the summary

**Option 1 — `app_metadata.role` blocking (allowed only if coverage is proven):**

Before using this approach, the implementer must verify in code that:
1. Every teacher account registered via the teacher registration flow always has `app_metadata.role === "teacher"` set at the Supabase Auth level.
2. Every admin account always has `app_metadata.role === "admin"` set.
3. No legitimate parent account ever has `app_metadata.role` set to `"teacher"` or `"admin"`.

If all three conditions are confirmed by code inspection of the registration flows (`lib/auth/auth-registration-request.server.js`, admin provisioning), then the following guard is sufficient:

```js
// In resolveAuthenticatedParentUserId, after auth.getUser() succeeds:
const role = userData.user.app_metadata?.role;
if (role === "teacher" || role === "admin") {
  return { ok: false, error: "Not authorized for parent actions", status: 403 };
}
```

The final summary must document the file paths and code evidence confirming that `app_metadata.role` is reliably set for all teacher/admin accounts.

**Option 2 — persona/entitlement blocking (fallback if coverage cannot be proven):**

If `app_metadata.role` coverage cannot be confirmed for all teacher/admin paths, use the project's existing persona entitlement model to block non-parent personas. Check the `account_persona_entitlements` table via service role to confirm no active `school_teacher`, `private_teacher`, `school_manager`, `school_operator`, or `admin` entitlement exists for the requesting user before allowing the accept route to proceed.

This is a stronger but slightly heavier check (one extra DB query). It is always correct regardless of `app_metadata` coverage.

#### What `status.js` (`GET /api/parent/policy-acceptance/status.js`) needs

Apply the same role/entitlement guard for consistency. The status route is read-only and does not provision anything, but a teacher calling it and receiving a 200 with parent-style acceptance state is misleading. Block teacher/admin personas here as well, with the same fix.

#### Key constraint

Do not change `requireParentApiContext` itself. That function is used by many parent data routes that are already correctly gated. The fix is local to `resolveAuthenticatedParentUserId` and its call sites in `accept.js` and `status.js`.

---

### B. Fix: Deactivated teacher on me and onboard (P2-8)

#### B1. `pages/api/teacher/me.js`

**Current behavior:** Loads `limitsRow` via `loadTeacherLimitsRow` (line 67) and already returns 404 if no limits row exists (line 79–81). But does NOT check `limitsRow.limits.is_account_active`.

**Fix:** After the existing `!limitsRow.limits` check and before calling `resolveTeacherPlanLimits`, add:

```js
// After existing !limitsRow.limits check at line ~80:
if (limitsRow.limits.is_account_active === false) {
  return sendTeacherApiError(res, 403, "account_deactivated", "Teacher account is deactivated");
}
```

This is a 3-line addition after the already-existing `limitsRow` load and null check. No structural change required.

**File changed:** [`pages/api/teacher/me.js`](pages/api/teacher/me.js)

#### B2. `pages/api/teacher/onboard.js`

**Current behavior:** Calls `resolveAuthenticatedTeacherUserId` only; limits are loaded inside `provisionTeacherRows`. A deactivated teacher (who has `teacher_limits.is_account_active = false`) can complete onboarding.

**Fix:** After `resolveAuthenticatedTeacherUserId` and rate-limit check, load limits explicitly and block if `is_account_active === false`. A brand-new teacher who has never onboarded has no `teacher_limits` row yet — the guard must only fire when a limits row exists and is explicitly deactivated.

```js
// To add after rate-limit check, before provisionTeacherRows:
const serviceRole = getTeacherPortalServiceRole();
const limitsCheck = await loadTeacherLimitsRow(serviceRole, auth.teacherUserId);
if (limitsCheck.ok && limitsCheck.limits && limitsCheck.limits.is_account_active === false) {
  return sendTeacherApiError(res, 403, "account_deactivated", "Teacher account is deactivated");
}
```

`loadTeacherLimitsRow` is already imported in `onboard.js`. The service role is already created inside `provisionTeacherRows`; this moves the creation one step earlier.

**File changed:** [`pages/api/teacher/onboard.js`](pages/api/teacher/onboard.js)

---

### C. Fix: Student session survival after school block/revoke/rotate (P3-2)

Three coordinated changes:

#### C1. Export `endLiveStudentSessions`

**File:** [`lib/teacher-server/teacher-student-login-access.server.js`](lib/teacher-server/teacher-student-login-access.server.js)

**Current:** `endLiveStudentSessions` is a module-private `async function` (line 30, no `export`).

**Fix:** Add `export` keyword:

```js
// Change line 30 from:
async function endLiveStudentSessions(serviceRole, studentId) {
// To:
export async function endLiveStudentSessions(serviceRole, studentId) {
```

One-character change. All existing call sites within the same file are unaffected.

#### C2. Import and call in school-account-management.server.js

**File:** [`lib/school-server/school-account-management.server.js`](lib/school-server/school-account-management.server.js)

**Add import** at the top of the existing imports section:

```js
import { endLiveStudentSessions } from "../teacher-server/teacher-student-login-access.server.js";
```

No circular dependency: `teacher-student-login-access.server.js` imports only from `teacher-*` and `guardian-server` namespaces; it does not import from `school-server`.

**Add calls in three functions:**

`setSchoolStudentBlocked` — after the successful `student_access_codes` update and before the audit write:

```js
// After the .update({is_active: !blocked}) succeeds:
if (blocked) {
  await endLiveStudentSessions(serviceRole, studentId);
}
```

`revokeSchoolStudentAccess` — after the successful `.update({is_active: false, revoked_at: now})`:

```js
await endLiveStudentSessions(serviceRole, studentId);
```

`rotateSchoolStudentPin` — after the successful pin hash update:

```js
await endLiveStudentSessions(serviceRole, studentId);
```

These calls set `ended_at` on all `student_sessions` rows for the student where `ended_at IS NULL`, matching exactly what the teacher-portal revoke path already does.

#### C3. Defense-in-depth: access code re-validation in getAuthenticatedStudentSession

**File:** [`lib/learning-supabase/student-auth.js`](lib/learning-supabase/student-auth.js)

**Why it is safe:** `student_sessions` already selects `access_code_id` in both the full and minimal fallback queries (line 116–117, confirmed). The column is always present.

**Fix:** After `isSessionStillActive` passes and before loading the `students` row, add a re-check of the access code:

```js
// After: if (!isSessionStillActive(sessionRow, nowMs)) return null;
// Before: const { data: student, ...} = await supabase.from("students")...
if (sessionRow.access_code_id) {
  const { data: codeRow } = await supabase
    .from("student_access_codes")
    .select("id, is_active, revoked_at")
    .eq("id", sessionRow.access_code_id)
    .maybeSingle();
  if (!codeRow?.id || codeRow.is_active === false || codeRow.revoked_at) {
    return null;
  }
}
```

If `access_code_id` is null (older sessions without an access code link — backward-compatible path), the check is skipped. One additional DB query per authenticated request; acceptable for the security guarantee.

---

### D. Batch monitor subject re-check (P2-4) — P2 Later

**Decision:** Deferred to P2 Later / Phase 4 preparation.

**Reason:** The gap is read-only access to the teacher's own previously-created data. No cross-teacher leak exists. Adding an async DB round-trip on every batch monitor GET expands the change surface without a clear pilot-blocking risk. The fix (`assertActivitySubjectAllowed` call in `loadStudentActivityBatchMonitor`) is documented for a future pass.

---

## Exact Files to Change

| File | Change |
|------|--------|
| `lib/parent-server/policy-acceptance.server.js` | Add reliable server-side teacher/admin/non-parent persona block in `resolveAuthenticatedParentUserId`, using proven `app_metadata.role` coverage or persona/entitlement checks as defined in Section A |
| `pages/api/teacher/me.js` | Add `is_account_active === false` check after `limitsRow` is loaded |
| `pages/api/teacher/onboard.js` | Load limits early and block if deactivated |
| `lib/teacher-server/teacher-student-login-access.server.js` | Export `endLiveStudentSessions` |
| `lib/school-server/school-account-management.server.js` | Import + call `endLiveStudentSessions` in block/revoke/rotatePin |
| `lib/learning-supabase/student-auth.js` | Add access code re-validation in `getAuthenticatedStudentSession` |
| `scripts/security/wave4a-phase1-3-security-selftest.mjs` | New selftest covering all 3 confirmed FAILs (static structural verification) |

**No SQL migrations required.** All changes are application-layer JS. No new tables, columns, or schema changes needed.

**No new npm dependencies required.** All imports come from existing modules.

**No Hebrew copy / UI / CSS changes required.**

---

## Tests to Run

| Command | Purpose |
|---------|---------|
| `npm run build` | Verify no build errors after all changes |
| `node scripts/security/wave1-security-selftest.mjs` | Regression: CSRF / cookie / origin guards |
| `node scripts/security/wave2a-security-selftest.mjs` | Regression: rate limits / public surface |
| `node scripts/security/wave2b-security-selftest.mjs` | Regression: copilot / ownership static |
| `node scripts/security/wave2h-ownership-boundary-selftest.mjs` | Regression: service-role ownership patterns |
| `node scripts/security/wave2i-security-selftest.mjs` | Regression: XSS / input hardening |
| `node scripts/security/wave4a-phase1-3-security-selftest.mjs` | **New:** covers all 3 confirmed FAIL cases including P1-4 fix strength verification |

No Playwright e2e suites required for this change set. Existing wave selftests run in ~seconds without a live server.

#### wave4a selftest — required coverage

The selftest `scripts/security/wave4a-phase1-3-security-selftest.mjs` must be a static/structural selftest (no live HTTP, no Supabase connection required). It must verify:

**P1-4 coverage check:**
- Read the implementation of `resolveAuthenticatedParentUserId` from `lib/parent-server/policy-acceptance.server.js`
- Confirm that the function includes a non-parent persona block before `provisionParentEntitlementOnAccept` can be reached
- If the implementation uses `app_metadata.role` blocking: confirm that code evidence of reliable teacher/admin role assignment is cited in the selftest output (file path + function name where role is set)
- If the implementation uses entitlement-based blocking: confirm that the check targets at least `school_teacher`, `private_teacher`, `school_manager`, `school_operator`, and `admin` entitlements
- Record the chosen approach in the selftest output: `[P1-4] approach: app_metadata.role | entitlement-based`
- The selftest must FAIL (clearly log FAIL) if the guard cannot be confirmed structurally

**P2-8 coverage check:**
- Read `pages/api/teacher/me.js` and confirm a check for `is_account_active === false` exists after `limitsRow` is loaded
- Read `pages/api/teacher/onboard.js` and confirm the same check exists before `provisionTeacherRows` is called
- Confirm deactivated-but-existing-limits path is blocked; confirm no-limits (new teacher) path is not blocked

**P3-2 coverage check:**
- Read `lib/school-server/school-account-management.server.js` and confirm `endLiveStudentSessions` is called in `setSchoolStudentBlocked`, `revokeSchoolStudentAccess`, and `rotateSchoolStudentPin`
- Read `lib/learning-supabase/student-auth.js` and confirm `access_code_id` re-validation exists in `getAuthenticatedStudentSession`
- Read `lib/teacher-server/teacher-student-login-access.server.js` and confirm `endLiveStudentSessions` is exported

---

## Priority List (Implementation Order)

### 1. Must fix before parent/private-teacher pilot (this build)

| ID | Finding | File(s) | Severity |
|----|---------|---------|---------|
| **P1-4** | Teacher JWT can provision parent entitlement via policy accept route | `lib/parent-server/policy-acceptance.server.js` | P1 |
| **P2-8** | Deactivated teacher still reaches `me` and `onboard` | `pages/api/teacher/me.js`, `pages/api/teacher/onboard.js` | P1 |

### 2. Must fix before real student data (this build)

| ID | Finding | File(s) | Severity |
|----|---------|---------|---------|
| **P3-2** | School block/revoke/rotate does not end live student sessions | `lib/school-server/school-account-management.server.js`, `lib/teacher-server/teacher-student-login-access.server.js`, `lib/learning-supabase/student-auth.js` | P0 |

### 3. Can wait — Phase 4 / Later (NOT this build)

| ID | Finding | Notes |
|----|---------|-------|
| **P2-4** | Batch monitor subject re-check after grant revoked | P2, read-only own data, deferred |
| **P1-5** | Parent logout server-side revocation | Standard SPA pattern; P2 |
| **School audit log gap** | Operator/staff audit tables not in school portal API | Phase 4 only |
| **Live ownership HTTP tests** | R-OWN-01/02 static PASS, live `--execute` pending | Phase 4 QA |
| **Phase 4 school portal security** | School manager, operator, tenant isolation hardening | Explicit owner decision required |

### 4. Can wait — paid deployment (NOT this build)

| ID | Finding | Notes |
|----|---------|-------|
| School DPA / legal consent for school context | Not a code issue; Phase 4 |
| In-memory rate limits not distributed | Adequate for pilot scale |
| `loadSchoolClassInScope` OR logic | Requires malformed data; Phase 4 |
| CSP 48h production soak signoff | Enforcing CSP already active |

---

## Expected Final Deliverable

After implementation, create a ZIP file containing:

**Changed source files:**
- `lib/parent-server/policy-acceptance.server.js`
- `pages/api/teacher/me.js`
- `pages/api/teacher/onboard.js`
- `lib/teacher-server/teacher-student-login-access.server.js`
- `lib/school-server/school-account-management.server.js`
- `lib/learning-supabase/student-auth.js`

**Added files:**
- `scripts/security/wave4a-phase1-3-security-selftest.mjs`

**Documentation files:**
- This plan file (`.cursor/plans/focused_security_verification_28343be1.plan.md`)
- `reports/security/phase1-3-security-closure-summary.md` — final implementation summary (see required content below)

#### Required content of `reports/security/phase1-3-security-closure-summary.md`

The summary must include all of the following sections:

**P1-4 policy acceptance fix evidence:**
- Which approach was used: `app_metadata.role` blocking or persona/entitlement blocking
- If `app_metadata.role` was used: exact file paths and function names where teacher and admin accounts are assigned their `app_metadata.role` during registration, confirming reliable coverage
- If entitlement-based was used: which entitlement types are blocked and where the check runs
- Explicit confirmation: "Teacher JWT → `POST /api/parent/policy-acceptance/accept` → 403 before any record is written"
- Explicit confirmation: "Admin JWT → `POST /api/parent/policy-acceptance/accept` → 403 before any record is written"
- Explicit confirmation: "Legitimate parent policy acceptance continues to work"

**P2-8 deactivated teacher fix evidence:**
- Confirmation that `me.js` returns 403 `account_deactivated` when `teacher_limits.is_account_active === false`
- Confirmation that `onboard.js` returns 403 `account_deactivated` when limits row exists and is deactivated
- Confirmation that first-time teachers (no limits row yet) are not blocked during onboarding

**P3-2 student session lifecycle fix evidence:**
- Confirmation that `setSchoolStudentBlocked` calls `endLiveStudentSessions` on block
- Confirmation that `revokeSchoolStudentAccess` calls `endLiveStudentSessions` on revoke
- Confirmation that `rotateSchoolStudentPin` calls `endLiveStudentSessions` on PIN rotation
- Confirmation that `getAuthenticatedStudentSession` re-validates `access_code_id` before returning a valid session
- Confirmation that active (non-blocked) student sessions are unaffected

**Test results:**
- Output of `npm run build`
- Output of `wave1`, `wave2a`, `wave2b`, `wave2h`, `wave2i` selftests (PASS/FAIL per check)
- Output of `wave4a` selftest (PASS/FAIL per check with approach evidence for P1-4)

**Remaining known issues (if any):** List any items that were identified but not fixed in this build, with severity and deferred-to phase.

**Manual verification steps for owner:** The three reproduction scenarios from this plan.

**Not included in this build (explicit statement):**
> ENV handling excluded by owner instruction.  
> Phase 4 School Portal / school manager / school operator security postponed until explicit owner approval.  
> School audit log completeness (listSchoolAuditLog operator/staff tables) deferred to Phase 4.  
> School DPA / legal / documentation — not a code issue; deferred to Phase 4.  
> Batch monitor subject re-check (P2-4) — deferred to P2 Later.  
> No commit, push, or deploy was performed.

**Not included in ZIP:**
- ENV handling (excluded by owner instruction)
- Phase 4 School Portal security (postponed until explicit owner approval)
- School manager/operator/staff audit-log implementation
- School DPA / legal / documentation
- Batch monitor subject re-check (P2-4, deferred to P2 Later)
- Live cross-parent HTTP ownership matrix execution (requires QA fixtures; remains PENDING)

**Final summary statement (to appear in deliverable):**

> Current build scope completed: Parent / Private Teacher / Student Session Security Closure.  
> School Portal / Phase 4 remains postponed until explicit owner approval.  
> No commit, push, deploy, ENV handling, or broad school portal implementation was performed.

---

## Manual Verification Steps (for owner after delivery)

These require a running environment with QA credentials and cannot be run as static selftests:

1. **P1-4 confirmation:** Sign in as a teacher → call `POST /api/parent/policy-acceptance/accept` with valid policy versions → expect **403** (previously 200 + parent entitlement created)
2. **P2-8 confirmation:** Admin sets `teacher_limits.is_account_active = false` → teacher calls `GET /api/teacher/me` → expect **403** (previously 200)
3. **P3-2 confirmation:** Student logs in → school manager blocks via `/api/school/students/{id}/accounts/student/block` → student calls `GET /api/student/me` with same cookie → expect **401** (previously 200)
