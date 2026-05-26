# School Managed Portal — Delivery Report

**Date:** 2026-05-26  
**Plan:** `docs/teacher-portal/SCHOOL_MANAGED_PORTAL_PLAN.md` (Revision 2)  
**Migration:** `supabase/migrations/027_school_managed_portal.sql` — **not applied** (owner manual gate)

## Owner manual gate (required before live DB testing)

1. Review and apply `027_school_managed_portal.sql` per `docs/teacher-portal/MIGRATION_027_MANUAL_APPLY.md`
2. Verify backfill counts documented in that file
3. No git commit/push without explicit owner approval

## What was implemented

### Phase 0 — Migration artifact
- SQL migration file + manual apply guide (owner applies)

### Phase 1 — Owner admin school management
- Server: `lib/admin-server/admin-schools.server.js`
- APIs: `pages/api/admin/schools/*` (list, create, detail, assign teacher/manager, remove teacher, audit)
- UI: `pages/admin/schools/index.js`, `pages/admin/schools/[schoolId].js`
- Components: `SchoolAdminTable.jsx`, `SchoolAssignForm.jsx`
- Admin nav: schools link in `AdminShell.jsx`
- Teacher admin: school column + detail section (`TeacherAdminTable`, `TeacherAdminDetailView`)
- `admin-teachers.server.js`: school membership from `school_teacher_memberships` (not `teacher_profiles.school_id` alone)

### Phase 2 — School manager auth + portal shell
- `lib/school-server/school-membership.server.js`, `school-request.server.js`, `school-session.server.js`
- APIs: `/api/school/me`, `/api/school/dashboard`
- UI: `SchoolPortalShell`, `use-school-portal-session.js`, `school-ui.he.js`
- Pages: `pages/school/dashboard.js` (+ teachers/classes/students list pages)
- Login redirect: school managers → `/school/dashboard` (`pages/teacher/login.js`)
- `GET /api/teacher/me` + dashboard payload include `schoolMembership`
- Dual-role: teacher shell school badge + link; school shell teacher link when `hasTeacherActivity`

### Phase 3 — Subject permissions
- `lib/school-server/school-subjects.server.js` (grant/revoke, filter, assert)
- School APIs: `/api/school/teachers/[teacherId]/subjects`
- Teacher enforcement: activity create (class + individual), student report, parent preview, class report (`subject_not_permitted_for_class`)
- UI: `pages/school/teachers/[teacherId].js` subject manager

### Phases 4–6 — School manager data APIs + pages
- Classes: `/api/school/classes`, class report-data; `pages/school/classes/index.js`
- Students: enroll/unenroll/report APIs; `pages/school/students/index.js`
- Activities: `/api/school/activities`; dashboard recent list

### Phase 7 — Hardening notes
- IDOR: all school routes use `requireSchoolManagerApiContext` + school-scoped queries; teacher routes unchanged for private teachers
- Regression: private teachers without membership bypass school checks; enrollment does not add `teacher_students` rows
- **Limitation:** Live E2E requires migration 027 on Supabase
- **Limitation:** Activity/student-activity individual report endpoints not subject-filtered (single-activity scope; plan focused on aggregate report-data)

## Hebrew / RTL
- All new UI: `dir="rtl"` `lang="he"` on shells; strings in `admin-ui.he.js` / `school-ui.he.js`

## Key files (new)
- `supabase/migrations/027_school_managed_portal.sql`
- `lib/school-server/*`
- `pages/api/school/**`
- `pages/school/**`
- `pages/admin/schools/**`
- `components/admin/School*.jsx`
- `components/school-portal/SchoolPortalShell.jsx`

## Key files (modified)
- `pages/api/teacher/me.js`, `pages/teacher/login.js`
- `pages/api/teacher/students/*/report-data.js`, `parent-report-data.js`
- `pages/api/teacher/classes/*/report-data.js`
- `pages/api/teacher/activities/index.js`, `student-activities/index.js`
- `lib/teacher-server/teacher-activities.server.js`, `teacher-dashboard.server.js`
- `components/admin/*`, `components/teacher-portal/TeacherPortalShell.jsx`
