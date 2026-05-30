# UI Role-Scope Fix Report

**Date:** 2026-05-30  
**SQL / commit / push / deploy:** None

---

## Root cause

API-layer role boundaries were implemented (Phases 0–5), but **browser UI still used pre-boundary product flows**:

1. **`/api/admin/teachers`** listed all `teacher_profiles`, mixing private teachers with school staff.
2. **Admin detail** still exposed private-teacher quota tools for school-affiliated users (subjects UI was hidden; quotas were not).
3. **School Manager portal** had read-only teacher list — no invite teachers/operators UI despite APIs existing.
4. **`/api/school/me`** required `school_manager` only — operators could not bootstrap a portal session.
5. **`listSchoolTeachers`** included `school_operator` memberships, so operators could appear as teachers with subject UI.
6. **`/api/parent/list-students` on admin pages:** **No admin component calls this API.** Only `pages/parent/dashboard.js` fetches it. Console 403 on `/admin/teachers` is likely another tab, stale session, or navigation to parent routes — not admin page code.

---

## Fixed UI behavior

### Platform Admin (`/admin/teachers`)

- Title/nav: **"מורים פרטיים"** — list shows private teachers only.
- School staff excluded from normal admin teacher workflow.
- Direct URL to school staff: read-only message + link to school admin; quota/subject forms hidden.
- Server blocks quota/feature/status PATCH (`school_staff_not_private_teacher`).

### School Manager portal

- **`/school/teachers`:** UUID invite → `POST /api/school/teachers`.
- **`/school/operators`:** UUID invite + grant toggles (`student_access_admin`, `student_data_viewer`).
- Subject assignment on **`/school/teachers/[teacherId]`** only.

### School Operator

- Login → **`/school/operator/dashboard`**.
- **`GET /api/school/me`** returns `portalRole: school_operator` + grants.
- Redirected away from manager/teacher subject UI.

---

## Tests

| Suite | Result |
|-------|--------|
| Unit | 4/4 pass |
| UI scope (`ui-role-scope-matrix.mjs`) | 9/9 pass |
| Build | Pass |

---

## Pending Hebrew approval

See `docs/auth/PENDING_OPERATOR_UI_HEBREW.md`.
