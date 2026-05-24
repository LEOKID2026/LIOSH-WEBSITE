# Authorization Audit Plan (IDOR / vertical / horizontal escalation)

**Generated:** 2026-05-23
**Companion to:** [API_ROUTE_SECURITY_INVENTORY_PLAN.md](./API_ROUTE_SECURITY_INVENTORY_PLAN.md), [PARENT_STUDENT_OWNERSHIP_BOUNDARY_PLAN.md](./PARENT_STUDENT_OWNERSHIP_BOUNDARY_PLAN.md)
**Risk rows:** R-OWN-01, R-OWN-02, R-RLS-01, R-AUTH-02, R-DEV-01, R-DEV-02, R-COPILOT-02

## Goal

Define the **authorization test matrix** that the next fix pass must run before public launch. **Plan only — no tests run here.**

## Threat shapes

- **Horizontal escalation (parent ↔ parent).** Parent A reads/modifies parent B's children, reports, copilot output.
- **Horizontal escalation (student ↔ student under same parent).** Student A reads/modifies student B's data.
- **Horizontal escalation (student ↔ student across parents).** Student A in parent X reads/modifies student in parent Y.
- **Vertical escalation (student → admin).** Student session reaches admin/dev surfaces.
- **Vertical escalation (parent → admin).** Parent bearer reaches admin/dev surfaces.
- **Identity confusion via body.** Caller supplies `studentId` / `parentId` in the body; server uses it without verifying ownership.

## Test matrix (target: all green before public)

| # | Surface | Caller | Target | Expected | Rationale |
|---|---------|--------|--------|----------|-----------|
| H-PAR-1 | `/api/parent/list-students` | parent A bearer | (server returns) | only parent A's students | R-OWN-01 |
| H-PAR-2 | `/api/parent/students/{B's studentId}/report-data` | parent A bearer | parent B's child | 403 / 404 (no leakage of existence) | R-OWN-01 |
| H-PAR-3 | `/api/parent/update-student` body `{studentId: B}` | parent A bearer | parent B's child | 403 / 404 | R-OWN-01 |
| H-PAR-4 | `/api/parent/delete-student` body `{studentId: B}` | parent A bearer | parent B's child | 403 / 404 | R-OWN-01 |
| H-PAR-5 | `/api/parent/copilot-turn` body `{studentId: B}` | parent A bearer | parent B's child | 403; if accepted, response must not contain B's data | R-COPILOT-02 |
| H-STU-1 | `/api/learning/answer` | student A | crafted to write into student B's session | 403; row not written under B's id | R-OWN-02, R-RLS-01 |
| H-STU-2 | `/api/arcade/rooms/{room belonging to others}/snapshot` | student A | observe room they did not join | 403 | R-OWN-02 |
| H-STU-3 | `/api/student/me` | student A | (server returns) | only A's profile | R-OWN-02 |
| H-STU-4 | `/api/learning/planner-recommendation` body `{studentId: B}` | student A | another student | 403 | R-OWN-02 |
| H-STU-X | cross-parent: student A logs in, hits any route addressing parent Y's child | student A session | parent Y's data | 403 / 404 | R-OWN-02 |
| V-STU-1 | `/api/parent/list-students` | student A session (no parent bearer) | parent surface | 401 | vertical |
| V-STU-2 | `/api/student/dev-add-coins` | any student session in production | top-up | 404 (route disabled in prod) | R-DEV-01 |
| V-STU-3 | `/api/dev-student-simulator/login` in production | any caller | dev login | 404 | R-DEV-02 |
| V-STU-4 | `/api/learning-simulator/engine-review-pack-status` without admin token | any caller | admin pack | 401 / 403 | R-AUTH-02/03 |
| V-PAR-1 | `/api/learning-simulator/*` with parent bearer (no admin token) | parent | admin pack | 401 / 403 | R-AUTH-02 |
| V-OPS-1 | `/api/admin/monthly-persistence-award` without admin token | any caller | admin op | 401 / 403 | R-AUTH-03 |
| ID-1 | every `studentId`-bearing API | authenticated valid caller | own studentId | 200 | sanity |
| ID-2 | every `studentId`-bearing API | authenticated caller | non-existent studentId | 404 (no info disclosure) | IDOR baseline |

## How tests should be expressed

- Implement as Playwright fixtures + direct `fetch()` against the dev server on `localhost:3001` using the existing two-students-per-grade persona pool.
- Persist a JSON artifact under `reports/security/authz-matrix/<date>/`.
- Each row produces `{caller, target, status, body_excerpt, expected_match: bool}`.
- A single failure = launch blocker.

## Evidence required for "fixed"

A row in the [register](./SECURITY_RISK_REGISTER.md) may move to `fixed` only when:
1. The corresponding matrix row produced `expected_match: true` in a recorded artifact.
2. The fix is committed.
3. The matrix is wired into a CI gate (or at minimum the daily nightly track).

## Notes / planning-only constraints

- **Do not run** these tests in this pass.
- **Do not** implement the fixtures yet.
- This doc is the *definition of done* for the next fix pass on authorization.

---

## Teacher Portal — Phase 2 (planning-only)

> **Planning-only addition.** No fixtures are implemented. No tests are run. This section defines the cross-tenant matrix that Phase 9 of the Teacher Portal must satisfy before any teacher-portal traffic is enabled. See [`docs/teacher-portal/RLS_SECURITY_PROPOSAL.md`](../teacher-portal/RLS_SECURITY_PROPOSAL.md) for the threat model and per-table RLS proposal that produces these rows.

### New persona bands

- **`TEACHER`** — Supabase Auth user with a `teacher_profiles` row. JWT bearer.
- **`GUARDIAN_VIEW`** — non-`auth.users` identity authenticated by `student_guardian_access`. Cookie `liosh_guardian_session`. Read-only, single-student scope.

### Threat shapes added

- **Horizontal escalation (teacher ↔ teacher).** Teacher A reads Teacher B's classes, links, audit, guardian access, or sessions; or mutates Teacher B's rows via API (service-role routes must reject).
- **Client mutation bypass (teacher → own rows).** Teacher A uses Supabase JS to `INSERT`/`UPDATE`/`DELETE` on `teacher_students`, `teacher_classes`, `teacher_class_students`, or `UPDATE` on `teacher_profiles`, bypassing consent, limits, audit, or guardian cascade. **Expected:** RLS deny on all such operations (`020` posture).
- **Horizontal escalation (teacher → student).** Teacher reads `students` / `learning_sessions` / `answers` for a student outside their `teacher_students` set.
- **Horizontal escalation (guardian ↔ guardian / student).** Guardian for student S1 reads any record outside S1.
- **Vertical escalation (teacher → admin / parent / student).** Teacher JWT used on parent/admin/student-only surfaces.
- **Vertical escalation (guardian → parent / teacher / student / admin).** Guardian cookie used on any non-guardian surface.
- **Identity confusion via cookie name.** Guardian cookie misread as student cookie (or vice versa).
- **Consent bypass.** Teacher links a parent-owned student without an explicit consent artifact.
- **Audit forgery / tampering.** Any client identity inserts, updates, or deletes a `teacher_access_audit` row.

### Test matrix (target: all green before any teacher-portal phase ships to public)

| # | Surface | Caller | Target | Expected | Rationale (risk row) |
|---|---------|--------|--------|----------|----------------------|
| **H-TCH-1** | `/api/teacher/classes` (any read or write) | Teacher A bearer | Teacher B's class | 403 / 404 | R-TCH-02 |
| **H-TCH-2** | `/api/teacher/students` (read or unlink) | Teacher A bearer | Teacher B's link | 403 / 404 | R-TCH-02 |
| **H-TCH-3** | `/api/teacher/student-access/list` | Teacher A bearer | Teacher B's guardian access rows | 403 / no leakage | R-TCH-02 |
| **H-TCH-4** | `/api/teacher/student-access/revoke` | Teacher A bearer | Teacher B's guardian access | 403 | R-TCH-02 |
| **H-TCH-5** | `/api/teacher/students/[studentId]/report-data` | Teacher A bearer | Student linked only to Teacher B | 403 | R-TCH-03 |
| **H-TCH-6** | `/api/teacher/students/link` | Teacher A bearer | Existing parent-owned student, no consent token | 400 / 403 | R-TCH-01 |
| **H-TCH-7** | `/api/teacher/students/link` | Teacher A bearer | Existing parent-owned student, valid consent token | 200 (link created + audit row) | R-TCH-01 sanity |
| **H-TCH-8** | Supabase JS `INSERT` into `teacher_students` | Teacher A bearer | any `student_id` | RLS reject (no policy) | R-TCH-01, R-TCH-08 |
| **H-TCH-8b** | Supabase JS `UPDATE` on `teacher_students` (e.g. change `student_id`) | Teacher A bearer | own link row | RLS reject | R-TCH-08 |
| **H-TCH-8c** | Supabase JS `DELETE` on `teacher_students` | Teacher A bearer | own link row | RLS reject | R-TCH-08 |
| **H-TCH-8d** | Supabase JS `INSERT`/`UPDATE`/`DELETE` on `teacher_classes` | Teacher A bearer | own or any class | RLS reject | R-TCH-08 |
| **H-TCH-8e** | Supabase JS `INSERT` into `teacher_class_students` | Teacher A bearer | any membership | RLS reject | R-TCH-08 |
| **H-TCH-8f** | Supabase JS `UPDATE` on `teacher_profiles` | Teacher A bearer | own profile | RLS reject (no update policy in first implementation) | R-TCH-08 |
| **H-TCH-9** | Supabase JS direct insert into `teacher_access_audit` | Teacher A bearer | any audit row | RLS reject | R-TCH-04 |
| **H-TCH-10** | Supabase JS direct update / delete on `teacher_access_audit` | Teacher A bearer | any audit row | RLS reject | R-TCH-04 |
| **H-TCH-11** | Supabase JS direct read on `student_guardian_access` | Teacher A bearer | any row (own or other) | 0 rows / RLS reject | server-only invariant |
| **V-TCH-1** | `/api/parent/list-students` | Teacher A bearer (no parent bearer) | parent surface | 401 | vertical |
| **V-TCH-2** | `/api/parent/students/[studentId]/report-data` | Teacher A bearer | any student | 401 | vertical |
| **V-TCH-3** | `/api/parent/copilot-turn` | Teacher A bearer | any student | 401 | vertical |
| **V-TCH-4** | `/api/student/me`, `/api/student/dev-add-coins` | Teacher A bearer | student surface | 401 / 404 | vertical |
| **V-TCH-5** | `/api/admin/monthly-persistence-award`, `/api/learning-simulator/*` | Teacher A bearer | admin surface | 401 / 403 | vertical |
| **H-GRD-1** | `/api/guardian/student/[S2]/report-data` | Guardian session for S1 | Different student S2 | 403 | R-GRD-01 |
| **H-GRD-2** | `/api/guardian/me` | Guardian session for S1 | own scope | 200, payload contains only S1 identifier | sanity |
| **H-GRD-3** | `/api/guardian/student/[S1]/report-data` | Revoked guardian session (S1) | own student | 401 | R-GRD-04 |
| **H-GRD-4** | `/api/guardian/student/[S1]/report-data` | Expired guardian session (S1) | own student | 401 | R-GRD-04 |
| **V-GRD-1** | `/api/parent/list-students` | Guardian session | parent surface | 401 | R-GRD-02 |
| **V-GRD-2** | `/api/parent/students/[studentId]/report-data` | Guardian session | parent report | 401 | R-GRD-02 |
| **V-GRD-3** | `/api/parent/copilot-turn` | Guardian session | parent copilot | 401 | R-GRD-02 (T-GRD-6) |
| **V-GRD-4** | `/api/teacher/*` (any) | Guardian session | teacher surface | 401 | R-GRD-02 |
| **V-GRD-5** | `/api/student/me`, `/api/student/learning-profile` | Guardian session | student surface | 401 / 404 | R-GRD-02 |
| **V-GRD-6** | `/api/admin/*`, `/api/learning-simulator/*` | Guardian session | admin surface | 401 / 403 | vertical |
| **V-GRD-7** | `/api/guardian/login` (rapid attempts, same IP and same username) | Anonymous | brute-force PIN | rate-limit triggered + audit row | R-GRD-03 |
| **V-GRD-8** | Supabase JS direct read on any new Phase-1 table | Anonymous (anon role) | any new table | RLS reject (no anon policy) | T-GRD-9 |
| **CONS-1** | `/api/teacher/students/link` | Teacher with valid bearer, malformed / replayed / expired consent token | Existing parent-owned student | 400 / 403 (no link, no audit row except `consent_failed`) | R-TCH-01 |
| **CONS-2** | `/api/teacher/students/link` | Teacher with valid bearer, valid consent for *another* student | Different `student_id` in body | 400 / 403 (consent must match `student_id`) | R-TCH-01 |
| **AUDIT-1** | `/api/teacher/student-access/create` then `/api/teacher/student-access/revoke` | Teacher A bearer | own guardian access row | 200; audit shows `grant_created` then `grant_revoked`; no rows in `student_guardian_sessions` survive revoke | R-GRD-04, R-TCH-04 |
| **AUDIT-2** | Audit `metadata` payload review | service-role write attempt | row containing `pin` / `email` / `token` / `ip` / `full_name` keys | helper rejects write before insert | R-TCH-05 |
| **PARENT-REG-1** | Full parent dashboard regression suite | Parent A bearer | own children | unchanged behavior | regression baseline (R-OWN-01 unchanged) |
| **STUDENT-REG-1** | Full student login + learning regression suite | Student A session | own scope | unchanged behavior | regression baseline (R-OWN-02 unchanged) |
| **PARENT-LOGIN-1** | `pages/parent/login.js` rendering and behavior | any caller | login page | unchanged HTML, no guardian-mode toggle, no banner, no link | "What must remain unchanged" invariant |

A single failure in any row above is a Teacher Portal launch blocker — same severity rule as the existing `H-PAR-*` / `H-STU-*` matrix.

### Evidence required for `fixed` (Teacher Portal rows)

A Teacher Portal row in the [register](./SECURITY_RISK_REGISTER.md) (`R-TCH-*` or `R-GRD-*`) may move to `fixed` only when:

1. The corresponding matrix row produced `expected_match: true` in a recorded artifact under `reports/security/teacher-portal-authz-matrix/<date>/`.
2. The fix is committed (after Phase 9 sign-off).
3. The matrix is wired into the existing CI gate (or at minimum the daily nightly track) alongside the parent / student matrix rows.

### Notes / planning-only constraints (Teacher Portal)

- Phase 2 is **documentation only**. No fixtures, no tests, no code, no DB changes.
- Phase 9 (cross-tenant tests) is the first phase that exercises this matrix; Phase 9 is a separate, owner-approved phase.
- This appended section is the *definition of done* for Teacher Portal authorization.
