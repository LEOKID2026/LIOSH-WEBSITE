# UI Role Scope Fix — Pass 2 Report

Date: 2026-05-30  
Scope: Browser QA gaps — admin nav/parents, email staff invite, operator-only UI

## Root cause

1. **Platform Admin:** `AdminShell` nav lacked **Registered parents**; no `/admin/parents` pages despite existing PATCH API.
2. **School Manager invite:** `SchoolUserIdInviteForm` reused student enrollment copy (`SCHOOL_ENROLL_SECTION`, `SCHOOL_STUDENT_ID`); APIs accepted UUID only.
3. **Operator UI:** Grant toggles showed raw keys; operator detail/dashboard could be confused with teacher flows; `/school/teachers/[id]` had no redirect for operator UUIDs.

## Files changed

### Admin
- `components/admin/AdminShell.jsx` — nav tabs: private teachers, schools, registered parents (active state)
- `components/admin/ParentAdminTable.jsx` — new
- `components/admin/ParentAdminSettingsForm.jsx` — new
- `pages/admin/parents/index.js` — new
- `pages/admin/parents/[userId].js` — new
- `pages/api/admin/parents/index.js` — new GET list
- `lib/admin-server/admin-parent-settings.server.js` — `listAdminParents`
- `lib/admin-portal/admin-ui.he.js` — parent nav/strings

### School staff invite
- `lib/school-server/school-staff-invite.server.js` — email → userId resolution
- `pages/api/school/teachers/index.js` — POST accepts `email` or `teacherUserId`
- `pages/api/school/operators/index.js` — POST accepts `email` or `operatorUserId`
- `components/school-portal/SchoolStaffEmailInviteForm.jsx` — email-first; UUID in collapsed advanced
- `pages/school/teachers/index.js` — uses email invite form
- `components/school-portal/SchoolOperatorsManager.jsx` — email invite + grant panel
- `lib/school-portal/school-ui.he.js` — staff invite strings (no student wording)
- `lib/school-server/school-operator.server.js` — operator email in list

### Operator UI
- `lib/school-portal/operator-grant-labels.js` — interim English grant labels
- `components/school-portal/SchoolOperatorGrantPanel.jsx` — grant-only panel
- `pages/school/operators/[operatorId].js` — identity + grants only
- `pages/school/operator/dashboard.js` — grant panel, no teacher UI
- `pages/school/teachers/[teacherId].js` — redirect operator UUID → `/school/operators/[id]`
- `components/school-portal/SchoolPortalShell.jsx` — `SCHOOL_NAV_OPERATORS`

### Docs / tests
- `docs/auth/PENDING_OPERATOR_UI_HEBREW.md` — proposed Hebrew for owner approval
- `tests/auth/ui-role-scope-matrix.mjs` — extended checks

## Route confirmation (manual browser QA checklist)

| Route | Expected |
|-------|----------|
| `/admin/teachers` | Private teachers only; nav shows Schools + Registered parents |
| `/admin/schools` | Schools management |
| `/admin/parents` | Registered parents list → settings detail |
| `/school/teachers` | Email invite for teachers; no student UUID copy |
| `/school/teachers/[teacherId]` | Subject assignment for teachers only; operators redirect |
| `/school/operators` | Email invite; grant toggles with readable labels |
| `/school/operators/[id]` | Operator identity + grants only |
| `/school/operator/dashboard` | Operator home; grants only; no subjects |

Login: platform admin `office@leo.com`; school manager `school@leo-k.com`; operator `qa-school-operator@leo-k.com`; password `DEMO_TEACHER_PASSWORD` / `leo7479`.

## Hebrew pending

Operator **grant** labels remain English interim until owner approves Hebrew in `docs/auth/PENDING_OPERATOR_UI_HEBREW.md`.

## No SQL / commit / push / deploy

Confirmed — none performed in this pass.
