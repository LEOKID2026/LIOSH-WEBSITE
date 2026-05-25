---
name: School Managed Portal
overview: Design and document a school organization layer on top of the existing LEO KIDS teacher portal. Private teachers, parents, students, and the owner admin remain completely unchanged. The full plan is written to `docs/teacher-portal/SCHOOL_MANAGED_PORTAL_PLAN.md`. Revision 2 adds 7 owner-requested clarifications.
todos:
  - id: phase0-migration
    content: Owner reviews, approves, and manually applies migration 027_school_managed_portal.sql — then verifies backfill counts
    status: pending
  - id: phase1-admin
    content: "Phase 1: Owner admin school management — create school, view school, assign teacher, assign manager, remove teacher, audit log — with audit logging from day one"
    status: pending
  - id: phase2-auth
    content: "Phase 2: School manager auth — loadTeacherSchoolMembership, requireSchoolManagerApiContext, /api/school/me, /api/school/dashboard, school portal shell, login redirect, dual-role nav"
    status: pending
  - id: phase3-subjects
    content: "Phase 3: School teachers + subject permissions — list APIs, grant/revoke, subject check on activity creation AND all report endpoints (student report, class report, weak topics, recommendations, activity history, individual activity history, parent report preview)"
    status: pending
  - id: phase4-classes
    content: "Phase 4: School class list, class report via school manager context"
    status: pending
  - id: phase5-students
    content: "Phase 5: School student enrollment APIs, student report via school manager context"
    status: pending
  - id: phase6-activities
    content: "Phase 6: School-level activity view for school manager dashboard"
    status: pending
  - id: phase7-hardening
    content: "Phase 7: Full IDOR test matrix execution, regression tests, edge cases, load testing"
    status: pending
isProject: false
---

# School Managed Portal — Planning Summary (Revision 2)

## Revision 2 Changes

Seven owner-requested changes applied to `docs/teacher-portal/SCHOOL_MANAGED_PORTAL_PLAN.md`:

1. **Admin school management moved to Phase 1.** Owner admin APIs/pages for create school, view school, assign manager, assign teacher, and audit are now the first thing implemented — they are required before any school manager can log in.

2. **Routing confirmed.** Login stays at `/teacher/login`. No separate school login. `/school/*` uses the identical Supabase Bearer session. Route namespace `/school/dashboard` chosen over `/teacher/school/dashboard` (same rationale as `/admin/` being separate from `/teacher/`).

3. **Dual-role behavior defined.** A user who is both a school manager and an active teacher defaults to `/school/dashboard` on login. `SchoolPortalShell` shows a "My Teacher Dashboard" link; `TeacherPortalShell` shows a "School Management" link. Teacher-side APIs scope to personal data; school-side APIs scope to school data. No cross-escalation.

4. **Subject permissions now cover all report endpoints**, not only activity creation. Enforced on: student report, class report, weak topics, recommendations, activity history, individual activity history, teacher-side parent report preview. A math-only teacher sees only math sections. New `filterReportByPermittedSubjects` utility applied after the existing report builder runs. Class reports additionally check `class.subject_focus` against permitted subjects.

5. **School enrollment ≠ teacher visibility.** `school_student_enrollments` grants the school manager visibility only. Individual teacher visibility is exclusively governed by `teacher_students` and `teacher_class_students` — unchanged. An enrolled student does not automatically appear in any teacher's dashboard.

6. **`school_teacher_memberships` is the sole auth source of truth.** `teacher_profiles.school_id` is a denormalization convenience for FK joins only — never used as a security gate. New `loadTeacherSchoolMembership(serviceRole, teacherId)` is the single guard for all school-context checks on teacher-side APIs.

7. **Audit logging is in every phase.** Phase 1 (admin actions) and Phase 3 (subject grants/revokes) and Phase 5 (student enrollment) each introduce their audit writes immediately. No auditing deferred to a hardening phase.

## Role Model (Updated)

| Who | Supabase role | DB signal | Goes to |
|-----|--------------|-----------|---------|
| Private teacher | `teacher` | no `school_teacher_memberships` row | `/teacher/dashboard` |
| School teacher | `teacher` | `school_teacher_memberships.role = 'teacher'` | `/teacher/dashboard` |
| School manager | `teacher` | `school_teacher_memberships.role = 'school_admin'` | `/school/dashboard` |
| Dual-role | `teacher` | `school_admin` membership + own classes | `/school/dashboard` (with teacher nav link) |
| Owner admin | `admin` | — | `/admin/teachers` |

## Phase Order (Updated)

- Phase 0: Migration (owner manual action)
- Phase 1: **Owner admin school management** (create/view/assign/audit) — moved first
- Phase 2: School manager auth + dashboard
- Phase 3: School teachers + subject permissions (activity creation AND all reports)
- Phase 4: School classes + reports (manager view)
- Phase 5: School students + enrollment + reports (manager view)
- Phase 6: School activities view
- Phase 7: Hardening and final validation

## Full Plan Document

[`docs/teacher-portal/SCHOOL_MANAGED_PORTAL_PLAN.md`](docs/teacher-portal/SCHOOL_MANAGED_PORTAL_PLAN.md)

Contains: complete SQL draft for migration 027, full API spec with audit notes per endpoint, security/IDOR test matrix (7 categories), regression test plan, and 8-phase roadmap.
