---
name: Phase 4 School Portal
overview: Comprehensive written plan for Phase 4 — School Portal Security & School Launch Readiness. Plan only; no implementation until explicit owner approval.
todos:
  - id: create-plan-file
    content: Write the plan to .cursor/plans/school_phase4_security_final_closure_plan.md
    status: in_progress
isProject: false
---

# Phase 4 — School Portal Security & School Launch Readiness Final Closure Plan

**Plan path:** `.cursor/plans/school_phase4_security_final_closure_plan.md`
**Status:** PLAN ONLY — No implementation has occurred.
**Date:** 2026-05-30

---

## Plan Is the Sole Source of Execution Instructions

All implementation constraints, approvals, exclusions, scope boundaries, precision requirements, test requirements, deliverables, and acceptance criteria are written in this plan file.

No extra implementation instructions may be taken from chat messages.

Manual owner approval is required before any future implementation begins.

If a requirement is unclear or conflicts with this plan, stop and update this plan before coding.

No commit, push, deploy, or install may be performed without a separate explicit owner decision.

### Data safety constraints (applies to all sub-phases)

- All adversarial data setup, malformed-data tests, cross-school fixtures, and `loadSchoolClassInScope` OR-logic tests must use QA/throwaway fixtures only. No production data and no real student data may be used in any test unless the owner explicitly approves in writing before the test runs.
- All destructive SQL or fixture mutation (INSERT, UPDATE, DELETE on any table) must be limited to throwaway QA data and requires explicit owner approval before execution.
- If a test inadvertently touches or could touch production or real student data, stop immediately, document the risk, and request owner decision before proceeding.

### Sub-phase gating

- Phase 4.0 is audit and mapping only. No fixes, even small or obviously safe fixes, may be implemented during Phase 4.0 without owner approval after the findings list is produced and reviewed.
- Each sub-phase 4.1 through 4.7 requires a separate manual owner approval before starting.
- Each sub-phase also requires a separate manual owner approval before moving to the next sub-phase. Approval to start 4.1 does not imply approval to start 4.2.
- If a sub-phase reveals a finding that changes scope, stop and update this plan before continuing.

---

## A. Executive Summary

Phase 4 is the school-portal security and launch-readiness closure for the LIOSH platform's **multi-tenant school deployment path**. It is separate from Phase 1–3 (parent, private teacher, student session) because school users operate under a materially different auth model:

- School staff authenticate via a separate `liosh_staff_session` cookie (code + PIN), not Supabase JWT
- School operators have a grant-based least-privilege model (`student_access_admin`, `student_data_viewer`)
- Tenant isolation is enforced entirely in application logic (RLS is enabled but no DB-level tenant policies exist)
- School managers administer teachers, operators, students, classes, and enrollment within one school
- Multiple audit logs exist across four separate tables, only partially surfaced in the manager UI

The expected end-state of Phase 4 is:

- Full school role/action authorization matrix verified at code and live-HTTP level
- No known cross-school IDOR
- School operator grant boundaries confirmed and tested
- Staff session lifecycle confirmed
- Audit trail minimum viable coverage assessed and gaps addressed
- Documentation checklist produced for legal/privacy
- A final closure ZIP and explicit GREEN/YELLOW/RED verdict delivered

"Closed" for a **controlled school pilot** means: no known cross-tenant IDOR, staff session lifecycle verified, operator grant boundaries confirmed, minimum audit trail in place, build passes.

"Closed" for **paid deployment** or **Ministry/official supplier path** adds: complete audit trail merging, full legal/DPA documentation reviewed externally, live HTTP matrix passing, PWA shared-device guidance written.

What remains intentionally excluded: ENV handling, Parent-only or private-teacher-only launch path (except regression), games/coins (unless school security risk), payment/subscription logic, commit/push/deploy, destructive SQL without owner approval.

---

## B. Scope Declaration

### In scope

- School manager/admin auth and authorization
- School operator auth and grant-based authorization
- School teacher access, subject permissions, class permissions
- School student visibility, access credentials, lifecycle
- School class visibility and enrollment management
- School report access (student, class, school-wide, physical)
- School activity creation, assignment, report, export
- School worksheets/PDF activity flows
- School parent-report preview flows (teacher homeroom path)
- School staff code/PIN flows — sessions, expiry, revocation, lockout
- School student code/PIN lifecycle in school context
- School enrollment and class-transfer behavior
- School tenant isolation (cross-school IDOR prevention)
- School audit logs — all four tables, gaps, merging
- School legal/documentation readiness checklist
- PWA/shared-device guidance for school environments
- Runtime/live HTTP security verification
- Regression against Phase 1–3 where school routes touch the same logic (session binding, subject gates, persona eligibility)

### Explicitly out of scope

- ENV handling (completely excluded, all phases)
- Parent-only launch path except regression references
- Private-teacher-only launch path except regression references
- Non-school marketing/product polish
- Games, coins, gamification (no school security risk identified)
- Payment, subscription, billing
- Commit / push / deploy
- Destructive SQL without explicit owner approval
- Actual implementation in this planning task
- Phase 1–3 reopening (already closed separately)

---

## C. Current Known Phase 4 Inputs from Prior Audits

These findings were deferred from Phase 1–3 work and are the primary inputs for this plan.

| Finding | Status | Priority |
|---------|--------|---------|
| School audit log completeness: `listSchoolAuditLog` only exposes 9 actions from `teacher_access_audit`; `school_operator_audit_log` and `school_staff_audit_log` are not surfaced | confirmed issue | HIGH |
| `loadSchoolClassInScope` OR logic: a class is in scope if EITHER teacher is in school roster OR `school_id` matches — adversarial edge case with stale teacher roster not tested | likely issue | HIGH |
| Multi-school teacher membership: `loadTeacherSchoolMembership` returns the earliest-joined school only; no test for dual-membership teacher accessing wrong school | likely issue | MEDIUM |
| School DPA/legal documentation: not created | confirmed issue | HIGH (pre-paid) |
| Full school tenant security: excluded from Phase 1–3 | confirmed scope boundary | — |
| Live HTTP school ownership tests not run | confirmed gap | HIGH |
| Class report and physical report are manager-only; operators with `student_data_viewer` get per-student only | verified design, needs confirmation test | MEDIUM |
| No dedicated school portal HTTP security matrix in `scripts/security/` | confirmed gap | HIGH |
| `school_operator_audit_log` and `school_staff_audit_log` exist but are not merged into manager audit view | confirmed issue | MEDIUM |
| `school-portal-security-matrix.mjs` exists in `scripts/school-portal/` but requires `SCHOOL_SECURITY_TEST_PASSWORD` and live fixtures | needs verification of current pass/fail state | MEDIUM |
| `tests/auth/role-boundary-operator-verification.mjs` covers operator grant boundary but is not part of a documented acceptance run | needs verification | LOW |
| Staff session (`liosh_staff_session`) lifecycle: suspend/revoke → session invalid — exists in code but no automated live test | confirmed gap | HIGH |
| No CSP coverage for school pages (`wave2k-csp-smoke.mjs` covers `/`, student, parent, learning — not school portal) | confirmed gap | MEDIUM |
| Registration request flow (`050_school_registration_requests.sql`) — security model for request approval/rejection not audited | needs verification | MEDIUM |

---

## D. Role/Action Authorization Matrix

### Roles

- **platform_admin** — platform-level superuser
- **school_manager** — school_admin membership + school_manager entitlement
- **school_operator_access_admin** — school_operator persona + `student_access_admin` grant
- **school_operator_data_viewer** — school_operator persona + `student_data_viewer` grant
- **school_operator_no_grants** — school_operator persona, neither grant
- **school_teacher** — school_teacher persona + membership
- **private_teacher** — private teacher persona (no school membership)
- **school_parent** — parent linked to school student
- **school_student** — student in a school class

### Action matrix (expected authorization)

| Action | platform_admin | school_manager | operator_access_admin | operator_data_viewer | operator_no_grants | school_teacher | private_teacher | school_parent | school_student |
|--------|---------------|---------------|----------------------|---------------------|--------------------|---------------|----------------|--------------|---------------|
| View school dashboard | ALLOW | ALLOW | DENY | DENY | DENY | DENY | N/A | N/A | N/A |
| View classes | ALLOW | ALLOW | DENY | DENY | DENY | CONDITIONAL (own) | N/A | N/A | N/A |
| Create/edit/archive class | ALLOW | ALLOW | DENY | DENY | DENY | DENY | N/A | N/A | N/A |
| View students list | ALLOW | ALLOW | DENY | DENY | DENY | CONDITIONAL (own class) | N/A | N/A | N/A |
| Create/edit student | ALLOW | ALLOW | DENY | DENY | DENY | DENY | N/A | N/A | N/A |
| Archive/deactivate student | ALLOW | ALLOW | DENY | DENY | DENY | DENY | N/A | N/A | N/A |
| Move student between classes | ALLOW | ALLOW | CONDITIONAL (`access_admin`) | DENY | DENY | DENY | N/A | N/A | N/A |
| Manage enrollments | ALLOW | ALLOW | CONDITIONAL (`access_admin`) | DENY | DENY | DENY | N/A | N/A | N/A |
| Generate/rotate student PIN | ALLOW | ALLOW | CONDITIONAL (`access_admin`) | DENY | DENY | DENY | N/A | N/A | N/A |
| Revoke/block student code | ALLOW | ALLOW | CONDITIONAL (`access_admin`) | DENY | DENY | DENY | N/A | N/A | N/A |
| Manage parent link | ALLOW | ALLOW | CONDITIONAL (`access_admin`) | DENY | DENY | DENY | N/A | N/A | N/A |
| Create school teacher | ALLOW | ALLOW | DENY | DENY | DENY | DENY | N/A | N/A | N/A |
| Suspend/revoke school teacher | ALLOW | ALLOW | DENY | DENY | DENY | DENY | N/A | N/A | N/A |
| Manage teacher subjects | ALLOW | ALLOW | DENY | DENY | DENY | DENY | N/A | N/A | N/A |
| Manage teacher classes | ALLOW | ALLOW | DENY | DENY | DENY | DENY | N/A | N/A | N/A |
| Create classroom activity | ALLOW | ALLOW | DENY | DENY | DENY | CONDITIONAL (own subject/class) | DENY | N/A | N/A |
| Create individual student activity | ALLOW | ALLOW | DENY | DENY | DENY | CONDITIONAL (own subject) | DENY | N/A | N/A |
| View activity report | ALLOW | ALLOW | DENY | DENY | DENY | CONDITIONAL (own activity) | DENY | N/A | N/A |
| Export activity report | ALLOW | ALLOW | DENY | DENY | DENY | CONDITIONAL (own activity) | DENY | N/A | N/A |
| View student diagnostic report | ALLOW | ALLOW | DENY | CONDITIONAL (`data_viewer`) | DENY | CONDITIONAL (own student) | DENY | CONDITIONAL (own child) | N/A |
| View class report | ALLOW | ALLOW | DENY | DENY | DENY | CONDITIONAL (own class + subject) | N/A | N/A | N/A |
| View school-wide report | ALLOW | ALLOW | DENY | DENY | DENY | DENY | N/A | N/A | N/A |
| View parent-report preview | ALLOW | ALLOW | DENY | DENY | DENY | CONDITIONAL (homeroom teacher) | DENY | N/A | N/A |
| View audit logs | ALLOW | CONDITIONAL (9 action types) | DENY | DENY | DENY | DENY | N/A | N/A | N/A |
| Manage operators | ALLOW | ALLOW | DENY | DENY | DENY | DENY | N/A | N/A | N/A |
| Access cross-school data | ALLOW | DENY | DENY | DENY | DENY | DENY | DENY | DENY | DENY |
| Direct API call with altered IDs | ALLOW | DENY | DENY | DENY | DENY | DENY | DENY | DENY | DENY |

Implementation must verify each CONDITIONAL case produces 403/404 when the condition is not met. DENY cases must always return 403 or 404 (not 200 or 500).

---

## E. API Route Audit Plan

### High-risk route families

**`/api/school/**` (55 handlers)**

Every route must be verified:

- Authentication: requires school staff session cookie or manager JWT
- Tenant: `school_id` from authenticated session, not from request body/query
- Student/class/teacher params: validated against school scope before service-role reads
- No service-role read before ownership check
- Safe 403/404 on failure (no detail leak)

**Priority routes for adversarial testing:**

| Route | Risk | Check |
|-------|------|-------|
| `GET /api/school/students/[studentId]/report-data` | Cross-school IDOR | Manager of school A → student from school B |
| `GET /api/school/classes/[classId]/report-data` | Cross-school + class scope | `loadSchoolClassInScope` OR logic |
| `GET /api/school/classes/physical-report` | Aggregate scope | school_id from session |
| `GET /api/school/audit-log` | Audit exposure | incomplete — 9 actions only |
| `PATCH /api/school/operators/[operatorId]/grants` | Privilege escalation | Manager only; operator cannot self-promote |
| `pages/api/school/students/[studentId]/accounts/**` | Credential IDOR | school_id scope |
| `GET /api/school/worksheet-activities/[worksheetId]/report` | School vs teacher scope | school_id on worksheet |
| `pages/api/school/staff/login` | Brute force | Rate limiting; lockout behavior |
| `pages/api/school/staff/change-pin` | Session binding | Must use active staff session; cannot use other user's session |

**`/api/teacher/**` in school context**

| Route | School risk |
|-------|-------------|
| `GET /api/teacher/classes/[classId]/report-data` | Teacher must be in school membership for class |
| `GET /api/teacher/students/[studentId]/report-data` | School student must be in teacher's classes |
| `GET /api/teacher/students/[studentId]/parent-report-data` | Teacher must be homeroom; student must be in school |
| `POST /api/teacher/activities/index` | Subject gate + school_id |
| `POST /api/teacher/student-activities/index` | Subject gate |
| `GET /api/teacher/me` | Returns school membership; must block deactivated teacher |

**Verification checklist per route:**

- [ ] Requires authentication (not unauthenticated)
- [ ] Identity from session/JWT, not client-supplied param
- [ ] `school_id` validated from session, not query
- [ ] `class_id` validated against `school_id`
- [ ] `student_id` validated against `school_id`
- [ ] `teacher_id` validated against `school_id`
- [ ] Subject permission validated
- [ ] Operator grant validated where applicable
- [ ] Blocks cross-school IDOR
- [ ] Blocks cross-class IDOR
- [ ] Blocks cross-teacher IDOR
- [ ] Returns 403/404 (not 200 or 500)
- [ ] Does not use service role before ownership check
- [ ] Export uses same guard as report route

---

## F. School Tenant Isolation Plan

This is the highest-priority security concern.

### Checks required

**Manager isolation:**
- Manager of School A: GET `/api/school/students/[school_B_student_id]/report-data` → 403/404
- Manager of School A: GET `/api/school/classes/[school_B_class_id]/report-data` → 403/404
- Manager of School A: GET `/api/school/teachers/[school_B_teacher_id]` → 403/404
- Manager of School A: PATCH `/api/school/operators/[school_B_operator_id]/grants` → 403/404
- Manager of School A: GET `/api/school/audit-log` (must only return school A events)

**Operator isolation:**
- Operator of School A with `data_viewer`: GET student report for school B student → 403/404
- Operator of School A: GET `/api/school/operators` (manager-only) → 403

**Teacher isolation:**
- School teacher of School A: access school B class report → 403/404
- School teacher with class A only: access class B report in same school → 403/404
- School teacher with subject Math only: access Hebrew report → 403/404
- School teacher: GET `/api/school/audit-log` → 403

**`loadSchoolClassInScope` OR logic adversarial test:**
- Manually construct a class row where `school_id = school_A` but `teacher_id` is a member of `school_B`
- Test: school B manager trying to access this class → should be 403
- Test: verify both conditions must match the same school

**Multi-school teacher membership edge case:**
- Teacher is a member of both school A and school B (joined school B after school A)
- `loadTeacherSchoolMembership` returns earliest-joined school
- Verify teacher APIs use the correct school for authorization
- Verify teacher cannot access school B routes via school A session

### Fixture requirements

```
SCHOOL_A_MANAGER_BEARER
SCHOOL_B_MANAGER_BEARER
SCHOOL_A_OPERATOR_ACCESS_ADMIN_BEARER
SCHOOL_A_OPERATOR_DATA_VIEWER_BEARER
SCHOOL_A_OPERATOR_NO_GRANTS_BEARER
SCHOOL_A_TEACHER_MATH_BEARER
SCHOOL_A_TEACHER_HEBREW_BEARER
SCHOOL_A_CLASS_A_ID
SCHOOL_A_CLASS_B_ID
SCHOOL_B_CLASS_ID
SCHOOL_A_STUDENT_ID
SCHOOL_B_STUDENT_ID
SCHOOL_A_ACTIVITY_ID
SCHOOL_B_ACTIVITY_ID
SCHOOL_A_STAFF_CODE_COOKIE
```

### Static inspection

- Review `school-request.server.js` — confirm `school_id` is always extracted from session, never from request body/query
- Review `school-scope.server.js` — confirm `loadSchoolClassInScope` AND conditions
- Review all `pages/api/school/**` handlers — confirm service-role queries are after guard calls

---

## G. School Teacher Subject/Class Permission Plan

### Enforcement chain

```
pages/api/teacher/activities/index.js
  → assertActivitySubjectAllowed (school-subjects.server.js)
    → checkSchoolTeacherSubjectPermission (membership + school_teacher_subjects)
    → checkPrivateTeacherSubjectPermission (private_teacher_subjects)
```

### Checks required

- Teacher has only Math grant: attempt Hebrew activity creation → `subject_not_permitted`
- Teacher has only Math grant: attempt Hebrew class report → 403
- Teacher has only Math grant: Hebrew activity report → 403
- Teacher has only Math grant: worksheet creation in Hebrew → 403 (via `assertActivitySubjectAllowed`)
- Teacher has only class A: access class B report in same school → 403
- `assertTeacherClassReportSubjectAllowed` re-runs after subject revocation in teacher report
- Report/export subject filter: revoked subject not present in JSON payload
- Summary totals recomputed after subject filter (via `recomputeReportSummaryFromSubjects`) — must not leak dropped subjects as zero-values
- `filterReportByPermittedSubjects` applied consistently before report response

### Known-safe areas (already verified in Phase 1–3)

- `assertActivitySubjectAllowed` unit tests: `scripts/tests/private-teacher-activity-subject-gate-unit.mjs` — PASS
- `loadStudentActivityBatchMonitor` subject gate: added in Phase 1–3 closure

### Remaining school-specific gaps

- Live HTTP test: teacher token → ungranted subject endpoint → confirm 403
- Live HTTP test: revoke subject mid-session → subsequent request → confirm 403
- Teacher dashboard subject filtering: confirm UI cards do not expose revoked subject data even via direct API call

---

## H. School Operator/Staff Permission Plan

### Operator grant model

Two boolean grants in `school_operator_grants` (migration 044):

| Column | Effect |
|--------|--------|
| `student_access_admin` | Enables `requireSchoolCredentialAdminApiContext` and `requireSchoolClassAdminApiContext` |
| `student_data_viewer` | Enables `requireSchoolDataViewerContext` for `GET /api/school/students/[studentId]/report-data` |

Default on provisioning: both `false`. Manager grants via `PATCH /api/school/operators/[operatorId]/grants`.

### Checks required

**Operator with no grants:**
- `GET /api/school/me` → 200 (limited payload)
- `GET /api/school/operators` → 403
- `GET /api/school/students/[studentId]/report-data` → 403
- `GET /api/school/students/[studentId]/accounts` → 403

**Operator with `access_admin` only:**
- `GET /api/school/students/[studentId]/accounts` → 200
- Enrollment/PIN/credential ops → 200
- `GET /api/school/students/[studentId]/report-data` → 403 (needs `data_viewer` too)
- Operator cannot self-grant `student_data_viewer` → 403

**Operator with `data_viewer` only:**
- `GET /api/school/students/[studentId]/report-data` → 200
- `GET /api/school/students/[studentId]/accounts` → 403

**Manager-only routes that must always reject operators (any grants):**
- `GET /api/school/dashboard` → 403
- `GET /api/school/students` (list) → 403
- `GET /api/school/classes/[classId]/report-data` → 403
- `GET /api/school/classes/physical-report` → 403
- `GET /api/school/audit-log` → 403
- `GET /api/school/operators` → 403
- `GET /api/school/teachers` → 403
- `GET /api/school/messages` → 403

### Staff session (`liosh_staff_session`) lifecycle

**Existing docs:** `docs/auth/SCHOOL_STAFF_ROUTE_AUDIT.md`, `docs/auth/SCHOOL_STAFF_LOGIN_MODEL_PROPOSAL.md`
**Auth server:** `lib/school-server/school-staff-session.server.js`

Checks required:

- Staff login: invalid code → rate-limited failure logged to `school_staff_audit_log`
- Staff login: wrong PIN → `staff_login_failed` audit event
- Staff login: correct code+PIN → session cookie issued; `staff_login_success` audit event
- Staff suspend: `pages/api/school/operators/[operatorId]/suspend` → subsequent `GET /api/school/me` with staff cookie → 401
- Staff reactivate: subsequent login allowed
- Staff code regenerate: old code → login attempt → fail
- Staff PIN reset: old PIN → login attempt → fail
- Staff logout: cookie cleared; session row `ended_at` set
- Session expiry: expired session → 401 on next API call
- Staff `change-pin` requires active session; cannot use another user's session

### Existing test coverage

- `tests/auth/school-staff-code-pin-verification.mjs` — covers PIN flow
- `tests/auth/role-boundary-operator-verification.mjs` — covers grant boundary

Gaps: no automated suspend → 401 test; no shared-session adversarial test.

---

## I. School Student Credential/Session Lifecycle Plan

School-specific flows (complementing Phase 1–3 student session basics):

| Event | Expected behavior |
|-------|------------------|
| Manager blocks student code | Student session ends (Phase 1–3 `endLiveStudentSessions` called) |
| Manager revokes student code | Session ends; student must re-enroll |
| Manager rotates PIN | Session ends; student must login with new PIN |
| Operator (`access_admin`) blocks/revokes/rotates | Same as manager for credential ops |
| Student transfers to another class | Activity access follows product rules (documented per product decision) |
| Student archived/deactivated | Access codes deactivated; sessions end |
| Operator with `data_viewer` only | Cannot block/revoke/rotate (403 on credential routes) |

Regression checks against Phase 1–3:
- `getAuthenticatedStudentSession` fail-closed for null `access_code_id` (already implemented; verify school flow also produces valid `access_code_id`)
- School student login via code+PIN → session must always have `access_code_id` set

---

## J. School Reports/Export Plan

### Report surfaces

| Endpoint | Auth | Subject filter | Class filter | School scope |
|----------|------|---------------|-------------|-------------|
| `GET /api/school/students/[studentId]/report-data` | data_viewer or manager | via `buildTeacherStudentReportPayload` + subject filter | — | school_id in session |
| `GET /api/school/classes/[classId]/report-data` | manager | `filterReportByPermittedSubjects` | class in school scope | school_id in session |
| `GET /api/school/classes/physical-report` | manager | aggregate | all school classes | school_id in session |
| `GET /api/school/worksheet-activities/[worksheetId]/report` | manager | worksheet subject | — | worksheet in school |
| `GET /api/teacher/students/[studentId]/report-data` | teacher session | `loadTeacherPermittedSubjects` | teacher's students | via membership |
| `GET /api/teacher/classes/[classId]/report-data` | teacher session | subject grant | teacher's classes | via membership |
| `GET /api/teacher/students/[studentId]/parent-report-data` | teacher session | homeroom check | teacher's class | — |

### Checks required

- Report payload does not contain internal fields (verified via `stripInternalReportPayloadFields`)
- Report payload does not contain other school's student data
- Report payload subject breakdown does not include revoked/ungranted subjects (even as zero-value)
- Export payload (if added) uses same guard as report route — no separate download path that bypasses checks
- `Cache-Control: no-store` on all report endpoints (verify headers)
- No CSV/export download routes currently exist under `pages/api/school/` — if added, same ownership checks apply

---

## K. School Activity/Worksheet/PDF/Live Feature Plan

### Classroom activities

- `POST /api/teacher/activities/index` (school context): `assertActivitySubjectAllowed` → school teacher check
- Assignment to school class: class must be in teacher's permitted classes
- Report: `buildActivityReportPayload` → `assertActivitySubjectAllowed`
- Export: same guard as report
- School manager list (`GET /api/school/activities/index`): school_id scoped

### Individual student activities

- `POST /api/teacher/student-activities/index`: subject gate + teacher ownership of student
- Batch monitor: `loadStudentActivityBatchMonitor` — subject gate added in Phase 1–3
- Report: `buildStudentActivityReportPayload` → subject gate

### Worksheet/PDF activities

- `pages/api/teacher/worksheet-activities/index.js` and `pages/api/school/worksheet-activities/index.js`
- School worksheet: `assertActivitySubjectAllowed` called (verified in Phase 1–3 doc)
- School worksheet report: `GET /api/school/worksheet-activities/[worksheetId]/report` — manager only

### Checks required for school context

- Teacher cannot create activity in ungranted subject (static already verified)
- Teacher cannot view activity report for another teacher's activity in same school
- Manager can view all school worksheets (confirm school_id scope)
- Student can start only activities assigned to them (Phase 1–3 verified; regression only needed)

---

## L. Audit Logs/Accountability Plan

### Current state (confirmed issue)

Four separate audit tables; manager portal only surfaces 9 action types from `teacher_access_audit`.

**Table inventory:**

| Table | Actions logged | Manager portal visible |
|-------|---------------|----------------------|
| `teacher_access_audit` | school_subject_granted/revoked, enrollment, class ops, account ops, messaging | Only 9 of ~30+ school actions |
| `school_operator_audit_log` | grant changes, credential ops by operator, report_view | No |
| `school_staff_audit_log` | login, provision, suspend, reactivate, code/PIN events | No |
| `admin_audit_log` | platform-level school admin actions | Platform admin only |

### Minimum viable audit trail (for school pilot)

**Each audit event must include:**

```
actor_id
actor_role (school_manager | school_operator | school_teacher | school_admin)
school_id
action (namespaced, e.g. school_student_report_viewed)
target_type (student | teacher | operator | class | activity)
target_id
created_at
metadata (sanitized — no PIN, no token, no raw email unless confirmed safe)
```

### Required implementation work

1. **Extend `listSchoolAuditLog`** to include a selection of high-value actions from:
   - `school_operator_audit_log`: `credential_create`, `credential_revoke`, `report_view`, grant changes
   - `school_staff_audit_log`: `staff_login_success`, `staff_login_failed`, `staff_suspended`, `staff_reactivated`

2. **Audit completeness inventory** — map every school action to its audit write; identify gaps:
   - Are export downloads logged? (currently: no export routes exist, but add if routes added)
   - Are report views logged? (`school_student_report_viewed` in teacher_access_audit — verify all report routes call this)
   - Are failed logins logged? (`staff_login_failed` in `school_staff_audit_log` — confirm)
   - Are credential changes logged? (yes, via `teacher_access_audit` school_student_access_* + operator_audit)
   - Are teacher permission changes logged? (yes, `school_subject_granted/revoked`)
   - Are operator grant changes logged? (yes, `school_operator_audit_log`)
   - Are enrollment/class changes logged? (yes, `teacher_access_audit`)
   - Are parent-link actions logged? (`school_parent_*` in `teacher_access_audit`)

3. **School manager audit API** — decide scope: expand `SCHOOL_AUDIT_ACTIONS` or add a merged endpoint

4. **Audit data retention recommendation**: minimum 90 days for school pilot; 1 year for paid deployment

5. **No sensitive secrets in audit**: `sanitizeStaffAuditMetadata` exists — verify all write paths call it

---

## M. Database/RLS/Service-Role Model Plan

### Current model

- RLS enabled on all school tables
- Zero `CREATE POLICY` statements in any migration
- All access is via service-role from API handlers after application-layer ownership checks
- This is a deliberate architecture choice; no change proposed for school pilot

### Tables requiring school_id scoping

| Table | Has school_id | Scoped by |
|-------|--------------|-----------|
| `school_accounts` | yes | session school_id |
| `school_teacher_memberships` | yes | `verifyTeacherMembershipInSchool` |
| `school_teacher_subjects` | via membership | membership school_id |
| `school_student_enrollments` | yes | class → school_id |
| `school_operator_grants` | yes | session school_id |
| `school_operator_audit_log` | yes | query filter |
| `school_staff_audit_log` | yes (implicitly via staff_code) | query filter |
| `school_messages` | yes | school_id filter |
| `school_staff_access_codes` | yes | session school_id |
| `school_staff_sessions` | via staff_code | session binding |
| `classroom_activities` | yes (school_id nullable) | membership |
| `student_activities` | yes (school_id nullable) | membership |

### Service-role pattern audit

For each `pages/api/school/**` handler, verify the pattern:

```
1. guard (requireSchoolManagerApiContext or requireSchoolDataViewerContext etc.)
   ↓ resolves school_id from session
2. school-server function with (serviceRole, schoolId, ...)
   ↓ queries always include .eq("school_id", schoolId)
3. return payload
```

No handler should call a service-role function with an unauthenticated `schoolId` from request params.

### Decision framework

**Minimum for controlled school pilot:**
- Application-layer guards verified via live HTTP matrix
- All school tables have service-role access only (existing)
- No DB-level RLS policies required for pilot

**Recommended before paid deployment:**
- Add DB-level RLS `school_id` policies as defense-in-depth on the three most sensitive tables: `school_teacher_subjects`, `school_student_enrollments`, `school_operator_grants`

**Required for Ministry/official supplier path:**
- Full RLS policy review
- Penetration test or external security review
- DPA/legal documentation complete

---

## N. PWA/Shared School Devices Plan

School environments may use shared lab computers and shared PWA sessions.

### Checks required

- **Service worker `public/sw.js`:** already skips `/api/` routes (verified Phase 1–3); confirm school portal pages also receive `no-store` headers
- **Staff session expiry:** confirm `school_staff_sessions` has `expires_at`; confirm API rejects expired sessions
- **Staff logout:** cookie cleared; `school_staff_sessions.ended_at` set; re-use of same cookie → 401
- **Teacher JWT logout:** Supabase `signOut`; confirm teacher-portal pages do not cache teacher data in local storage
- **Student/teacher switching on same device:** student cookie + teacher JWT are separate cookies; no cross-contamination
- **Local storage audit:** no sensitive school tokens, student IDs, or report payloads stored in localStorage/sessionStorage
- **PWA installed mode logout:** after logout in PWA, navigating back does not serve cached protected pages

### Shared-device guidance document (required output)

Produce `docs/school/SCHOOL_SHARED_DEVICE_GUIDANCE.md` with:

- Steps to properly log out before leaving a shared terminal
- Administrator guidance on session expiry settings
- Recommendation to not use "remember me" / persistent sessions for school lab computers
- Kiosk mode considerations

---

## O. Privacy/Legal/Documentation Readiness Plan

This section produces a checklist only. Legal review must be performed externally.

### Documents/processes needed

| Item | Type | Status |
|------|------|--------|
| School data processing agreement (DPA) | Legal document | Not created |
| School onboarding agreement | Legal/business document | Not created |
| Privacy addendum for schools | Legal document | Not created |
| Roles as data controller/processor | Business decision + legal | Not decided |
| Parent/guardian consent process for school data | Product + legal | Not designed |
| Data retention policy | Business decision + implementation | Not created |
| Student deletion/portability request process | Process document | Not created |
| School termination/offboarding process | Process document | Not created |
| Student transfer between schools process | Process document | Not created |
| Incident response procedure | Process document | Not created |
| Access review procedure (periodic) | Process document | Not created |
| Support/admin access policy | Internal document | Not created |
| Backup/restore statement | Technical document | Not created |
| Audit log retention statement | Technical document | Not created |
| Subprocessor/vendor list | Legal document | Not created |
| AI/data usage explanation | Product + legal | Not created |

### Categorized by who must act

**Code/product required:** data deletion flow, student transfer flow, session-logout-all function

**Documentation required (owner/operator):** DPA template, onboarding agreement, privacy addendum, incident response

**Legal review required:** DPA content, processor/controller determination, Ministry compliance

**Owner business decision required:** AI data usage disclosure, retention periods, school termination data handling

---

## P. Runtime/Live HTTP Test Plan

### Script to create

`scripts/security/school-phase4-runtime-acceptance.mjs`

Follows same pattern as `scripts/security/phase1-3-runtime-acceptance.mjs`: static checks always run; live HTTP when env fixtures present; honest NOT_RUN when missing.

### Required env vars

```
SCHOOL_A_MANAGER_BEARER
SCHOOL_B_MANAGER_BEARER
SCHOOL_A_OPERATOR_ACCESS_ADMIN_COOKIE   (staff session cookie)
SCHOOL_A_OPERATOR_DATA_VIEWER_COOKIE
SCHOOL_A_OPERATOR_NO_GRANTS_COOKIE
SCHOOL_A_TEACHER_MATH_BEARER
SCHOOL_A_TEACHER_HEBREW_BEARER
SCHOOL_A_CLASS_A_ID
SCHOOL_A_CLASS_B_ID
SCHOOL_B_CLASS_ID
SCHOOL_A_STUDENT_ID
SCHOOL_B_STUDENT_ID
SCHOOL_A_ACTIVITY_ID
SCHOOL_B_ACTIVITY_ID
SCHOOL_A_WORKSHEET_ID
SCHOOL_A_BASE_URL   (default http://localhost:3000)
```

### Live test cases

| ID | Test | Expected |
|----|------|----------|
| tenant-student-report | Manager A → school B student report | 403/404 |
| tenant-class-report | Manager A → school B class report | 403/404 |
| tenant-teacher-detail | Manager A → school B teacher | 403/404 |
| tenant-operator-grant | Manager A → school B operator grants PATCH | 403/404 |
| tenant-audit-log | Manager A → audit log (must only return school A events) | 200, school A only |
| operator-no-grants-report | Operator (no grants) → student report | 403 |
| operator-no-grants-cred | Operator (no grants) → student accounts | 403 |
| operator-access-admin-report | Operator (access_admin only) → student report | 403 |
| operator-data-viewer-cred | Operator (data_viewer only) → student accounts | 403 |
| operator-data-viewer-dashboard | Operator (data_viewer) → school dashboard | 403 |
| operator-self-grant | Operator → PATCH own grants | 403 |
| teacher-math-hebrew-activity | Math teacher → Hebrew activity create | 403 |
| teacher-math-hebrew-report | Math teacher → Hebrew class report | 403 |
| teacher-class-a-class-b | Teacher (class A only) → class B report | 403 |
| teacher-foreign-activity | Teacher A → Teacher B activity report | 403/404 |
| school-student-foreign-activity | School student → school B activity start | 403/404 |
| staff-suspend-session | Manager suspends operator → existing cookie → /api/school/me | 401 |
| staff-wrong-pin | Brute-force login attempt → audit event | logged |
| class-scope-or-adversarial | Cross-school class scope attempt | 403 |
| report-no-store | Any school report response → Cache-Control: no-store | header present |
| audit-log-manager-only | Operator → /api/school/audit-log | 403 |

### Test types

| Area | Type |
|------|------|
| Tenant isolation | live HTTP |
| Operator grant matrix | live HTTP + unit |
| Subject/class gate | unit + live HTTP |
| Staff session lifecycle | live HTTP (manual action: suspend mid-test) |
| PWA/cache | browser/manual |
| Audit completeness | static inspection |
| loadSchoolClassInScope OR | unit adversarial |
| Multi-school membership | unit |

---

## Q. Existing QA Coverage Inventory

### School-specific scripts

| Script | Covers | Current / Stale | Update needed |
|--------|--------|----------------|--------------|
| `scripts/school-portal/school-portal-security-matrix.mjs` | IDOR + subject permission matrix; requires live credentials | Status unknown | Verify it passes; update if stale |
| `scripts/school-portal/verify-school-blockers.mjs` | Blocker checks | Unknown | Run and triage |
| `scripts/school-portal/verify-school-operational-controls.mjs` | Operational controls | Unknown | Run and triage |
| `scripts/school-portal/verify-school-manager-login-flow.mjs` | Manager login | Unknown | Run and triage |
| `scripts/school-portal/verify-school-student-report-http.mjs` | Student report HTTP | Unknown | Run and triage |
| `tests/auth/role-boundary-operator-verification.mjs` | Operator grant boundary | Current | Include in acceptance |
| `tests/auth/school-staff-code-pin-verification.mjs` | Staff PIN flow | Current | Include in acceptance |
| `tests/auth/school-class-assignment-matrix.mjs` | Class assignment | Current | Include in acceptance |
| `tests/auth/role-boundary-integration-matrix.mjs` | Integration matrix | Current | Include in acceptance |
| `scripts/tests/school-student-report-school-scope-regression.mjs` | Report scope | Current | Part of regression |
| `scripts/teacher-portal/phase9-security-smoke.mjs` | Teacher/guardian only | Current | Not school portal |

### Gaps in existing coverage

- No dedicated school tenant cross-school IDOR live HTTP test
- No `school_operator_audit_log` or `school_staff_audit_log` coverage in manager UI tests
- No adversarial test for `loadSchoolClassInScope` OR logic
- CSP smoke (`wave2k`) does not cover school pages
- No automated test for staff session expiry/suspend → 401
- No test for multi-school membership ambiguity

---

## R. Implementation Phases

### Phase 4.0 — Audit and mapping (no fixes)

**Goal:** Complete inventory of routes, roles, tables, policies, tests. Produce authorization matrix with PASS/FAIL/PARTIAL/NOT_TESTED.

**Files/areas:** All `pages/api/school/**`, `lib/school-server/**`, migration files, existing test scripts

**Tests:** Run all existing school scripts (read-only); record outputs. Use QA/throwaway data only.

**Deliverable:** Authorization matrix spreadsheet/doc; gap list; prioritized fix list

**Stop condition:** Owner reviews gap list and approves which sub-phases to proceed with

**Owner approval gate:** Required before 4.1. No fixes of any kind — including trivially obvious ones — may be made during 4.0 without this approval. If a critical security regression is discovered that cannot wait, document it immediately, halt 4.0, and escalate to owner before touching any code.

---

### Phase 4.1 — Critical school access blockers

**Owner approval gate:** Required before starting 4.1 (after 4.0 findings reviewed). Required again before moving to 4.2.

**Goal:** Fix tenant isolation, role/permission, direct API IDOR, subject/class gates. Confirm `loadSchoolClassInScope` OR logic. All adversarial tests use QA/throwaway fixtures only.

**Files likely involved:**
- `lib/school-server/school-scope.server.js` — `loadSchoolClassInScope`
- `lib/school-server/school-request.server.js` — guards
- `pages/api/school/students/[studentId]/report-data.js`
- `pages/api/school/classes/[classId]/report-data.js`
- Any handler found to use `schoolId` from request params

**Tests:** Unit adversarial for OR logic; static audit of all school handlers

**Deliverable:** Fixed handlers; updated static selftest

**Stop condition:** All known tenant isolation failures resolved

---

### Phase 4.2 — School reports/export hardening

**Owner approval gate:** Required before starting 4.2. Required again before moving to 4.3.

**Goal:** Verify report/export route parity, subject filtering, internal field stripping. All test data must be QA/throwaway.

**Files likely involved:**
- `lib/school-server/school-subjects.server.js` — `filterReportByPermittedSubjects`, `recomputeReportSummaryFromSubjects`
- `pages/api/school/classes/[classId]/report-data.js`
- `pages/api/school/classes/physical-report.js`
- `pages/api/teacher/students/[studentId]/report-data.js`
- `lib/teacher-server/teacher-report.server.js`

**Tests:** Unit tests for subject-filtered report payload; check revoked subject not in JSON

**Deliverable:** Confirmed report guards; updated report unit tests

---

### Phase 4.3 — School credential/session hardening

**Owner approval gate:** Required before starting 4.3. Required again before moving to 4.4.

**Goal:** Staff session lifecycle, student credential grants, revoke/suspend invalidation, shared-device review. All credential/session mutation tests must use QA/throwaway accounts only.

**Files likely involved:**
- `lib/school-server/school-staff-session.server.js`
- `lib/school-server/school-staff-management.server.js`
- `lib/school-server/school-account-management.server.js`
- `pages/api/school/staff/**`

**Tests:** Suspend → 401 test; session expiry test; operator credential boundary

**Deliverable:** Verified session lifecycle; shared-device guidance doc

---

### Phase 4.4 — Audit logs/accountability

**Owner approval gate:** Required before starting 4.4. Required again before moving to 4.5. Owner must separately approve the scope of any audit table schema or API changes before implementation.

**Goal:** Inventory audit gaps; extend `listSchoolAuditLog`; confirm audit writes on key actions.

**Files likely involved:**
- `lib/school-server/school-operations.server.js` — `SCHOOL_AUDIT_ACTIONS`, `listSchoolAuditLog`
- `lib/school-server/school-operator.server.js` — `writeSchoolOperatorAuditLog`
- `lib/school-server/school-staff-audit.server.js` — `writeSchoolStaffAuditRow`
- `pages/api/school/audit-log.js`

**Tests:** Static: verify all report-view handlers call the audit write; verify sanitize called

**Deliverable:** Extended audit API; gap inventory doc; audit retention recommendation

**Stop condition:** Owner approves scope of audit expansion

---

### Phase 4.5 — Runtime acceptance and browser/manual QA

**Owner approval gate:** Required before starting 4.5. Required again before moving to 4.6. Owner must confirm that all live HTTP fixtures are QA/throwaway accounts before the script is run against any environment.

**Goal:** Run `school-phase4-runtime-acceptance.mjs` with fixtures; browser PWA checks; no fake PASS. All fixture accounts must be QA/throwaway. No real school, real student, or real staff credentials may be used.

**Files to create:**
- `scripts/security/school-phase4-runtime-acceptance.mjs`

**Tests:** All P live HTTP cases from section P; browser manual PWA steps

**Deliverable:** Test output files; manual verification notes

**Stop condition:** All live cases PASS or documented as NOT_RUN with explicit reason (no FAIL)

---

### Phase 4.6 — Documentation/legal readiness pack

**Owner approval gate:** Required before starting 4.6. Required again before moving to 4.7.

**Goal:** Produce `docs/school/SCHOOL_LEGAL_READINESS_CHECKLIST.md`, `docs/school/SCHOOL_SHARED_DEVICE_GUIDANCE.md`, `docs/school/SCHOOL_ONBOARDING_OFFBOARDING_PROCESS.md`.

**Deliverable:** Three markdown documents; marked clearly as requiring external legal review before use

**Note:** No legal advice provided; documents are operational checklists only

---

### Phase 4.7 — Final closure ZIP and sign-off

**Owner approval gate:** Required before starting 4.7. Final verdict (GREEN/YELLOW/RED) must be confirmed by owner before any school pilot or deployment proceeds.

**Goal:** Final summary, test outputs, ZIP deliverable, explicit GREEN/YELLOW/RED verdict.

**Deliverables:**
- `reports/security/school-phase4-security-final-closure-summary.md`
- `reports/security/school-phase4-security-final-closure.zip`

**Acceptance criteria from section T must all pass before GREEN verdict**

---

## S. Effort Estimate

| Sub-phase | Estimate | Notes |
|-----------|----------|-------|
| 4.0 Audit/mapping | medium (1–2 days) | Run existing scripts; map matrix |
| 4.1 Critical access fixes | medium–large (1–5 days) | Depends on findings; OR-logic fix may be simple |
| 4.2 Report hardening | small–medium (0.5–2 days) | Subject filter chain is well-structured |
| 4.3 Credential/session | small–medium (0.5–2 days) | Session model is complete; mostly verification |
| 4.4 Audit logs | medium (1–3 days) | Merging three tables into unified view is non-trivial |
| 4.5 Runtime acceptance | medium (1–3 days) | Fixture setup is the hard part |
| 4.6 Documentation | small–medium (0.5–2 days) | Checklists only; no legal drafting |
| 4.7 Final ZIP | small (0.5 days) | — |

**Total range:** 6–19 days

**Minimum for controlled school pilot:** phases 4.0 + 4.1 + 4.3 + 4.5 (partial) = 3–9 days

**Stronger for paid deployment:** all sub-phases = 6–19 days + external legal review (timeline external)

**Ministry/official supplier path:** above + penetration test + full RLS policy + external audit = 3–8 additional weeks (external)

---

## T. Acceptance Criteria

**Phase 4 is closed when all of the following are true:**

- [ ] All school role/action matrix cases are PASS or intentionally deferred with written rationale
- [ ] No known cross-school IDOR (manager A → school B data returns 403/404)
- [ ] No known subject/class permission leak (revoked subject not in any JSON payload)
- [ ] No known export/report bypass (export uses same guard as report route)
- [ ] No known operator grant bypass (manager-only routes return 403 for any operator)
- [ ] `loadSchoolClassInScope` OR logic adversarial test PASS
- [ ] Multi-school membership edge case documented and tested
- [ ] Student/staff session lifecycle verified (suspend → 401; expiry → 401)
- [ ] Audit trail minimum viable coverage implemented and documented
- [ ] `school-phase4-runtime-acceptance.mjs` live HTTP matrix passes (or NOT_RUN with documented reason)
- [ ] Browser PWA shared-device manual checks complete
- [ ] School documentation readiness checklist created
- [ ] `npm run build` PASS
- [ ] All existing school test scripts run without regression
- [ ] Final ZIP delivered
- [ ] No ENV handling included
- [ ] No commit/push/deploy unless separately approved
- [ ] No real school/student/staff data used in any test unless explicitly approved by owner in writing
- [ ] All destructive SQL or fixture mutation limited to throwaway QA data; each instance approved by owner before execution

---

## U. Final Deliverable Requirements

After future implementation, deliverables must include:

**Files:**

```
reports/security/school-phase4-security-final-closure-summary.md
reports/security/school-phase4-security-final-closure.zip
  ├── all changed source files
  ├── all added/updated test scripts
  ├── test output files (test-output-*.txt)  ← raw, unedited
  ├── runtime/live matrix results
  ├── manual browser verification notes
  ├── audit log inventory
  ├── authorization matrix (final state)     ← per-cell PASS/FAIL/PARTIAL/NOT_TESTED
  ├── final API route inventory              ← each route + guard + verified status
  ├── manual NOT_RUN list                    ← every test case not run, with reason
  ├── owner decisions still required         ← explicit list of open decisions owner must make
  ├── remaining issues table
  └── not-included section
docs/school/SCHOOL_LEGAL_READINESS_CHECKLIST.md
docs/school/SCHOOL_SHARED_DEVICE_GUIDANCE.md
docs/school/SCHOOL_ONBOARDING_OFFBOARDING_PROCESS.md
.cursor/plans/school_phase4_security_final_closure_plan.md  ← original plan file, included verbatim
```

**Final summary must include:**

1. Executive summary
2. What was implemented
3. What was verified (static / unit / live HTTP / browser)
4. What was NOT verified (with explicit reason)
5. Test results (per-test PASS/FAIL/NOT_RUN)
6. Manual check results
7. Security verdict (GREEN / YELLOW / RED)
8. Remaining risks
9. What remains out of scope
10. Owner approval/sign-off checklist
11. Owner decisions still required — explicit list of any product, legal, or data decisions that remain open and must be resolved by the owner before the school path can fully proceed

**Verdict definitions:**

- **GREEN:** All acceptance criteria met; no known open HIGH findings; live HTTP matrix passed; browser PWA verified
- **YELLOW:** All structural fixes done; some live HTTP cases NOT_RUN (manual only); no known open HIGH findings; acceptable for controlled pilot with documented caveats
- **RED:** Known open HIGH finding (tenant IDOR, operator bypass, subject leak); do not proceed with real school data

---

## V. Required Final Plan Output

**Plan path:** `.cursor/plans/school_phase4_security_final_closure_plan.md`

**Implementation:** None. This is a plan document only.

**No code was changed. No commits. No deploys.**

Manual owner approval required before any sub-phase of implementation begins.
