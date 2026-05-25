---
name: Teacher Quotas Admin Control
overview: "Design and implement a teacher permissions / quotas / admin-control system: enforce a hard 40-students-per-class limit, lay a future-ready entitlement architecture, and build an owner-only admin screen to manage every teacher's quotas and feature flags."
todos:
  - id: q0-audit
    content: "Q0: Codebase audit — complete (this plan)"
    status: pending
  - id: q1-migration
    content: "Q1: Write supabase/migrations/025_teacher_quotas_admin.sql — stop for owner SQL approval"
    status: pending
  - id: q1-session
    content: "Q1: Update resolveTeacherPlanLimits() to return maxStudentsPerClass; change total-student default to null"
    status: pending
  - id: q2-helper
    content: "Q2: Add assertTeacherCanAddStudentToClass() to teacher-classes.server.js"
    status: pending
  - id: q2-wire
    content: "Q2: Wire per-class check into addClassMember(), createTeacherManagedStudent(), and members.js route"
    status: pending
  - id: q2-ui
    content: "Q2: Add class_student_limit_reached inline error in TeacherDashboardClient"
    status: pending
  - id: q2-diagnostic
    content: "Q2: Provide diagnostic SQL to detect existing classes over 40 students"
    status: pending
  - id: q3-admin-lib
    content: "Q3: Create lib/admin-server/admin-request.server.js and admin-audit.server.js"
    status: pending
  - id: q3-admin-api
    content: "Q3: Create pages/api/admin/teachers/* routes (list, detail, quotas, features, status, audit-log)"
    status: pending
  - id: q3-admin-ui
    content: "Q3: Create pages/admin/teachers/* pages and admin UI components"
    status: pending
  - id: q4-feature-flags
    content: "Q4: Implement assertTeacherFeatureEnabled() and wire into activity/message/report routes"
    status: pending
  - id: q5-school-stub
    content: "Q5: Activate school_accounts schema for real use when school manager phase begins"
    status: pending
isProject: false
---

# Teacher Permissions / Quotas / Admin Control — Full Implementation Plan

## 1. Current-State Audit (Q0 — complete)

### Existing tables
| Table | Relevant columns |
|---|---|
| `teacher_profiles` | `id`, `is_active`, `archived_at`, `school_id` (nullable stub) |
| `teacher_plans` | `code`, `student_limit` (total), `class_limit` (total) |
| `teacher_limits` | `teacher_id`, `plan_code`, `student_limit_override`, `class_limit_override`, `notes` |
| `teacher_classes` | `teacher_id`, `is_archived` |
| `teacher_class_students` | `class_id`, `student_id`, `removed_at` (soft-delete) |
| `teacher_students` | `teacher_id`, `student_id`, `archived_at` |

### Current limit model
The existing "20-student" limit is **teacher-wide active `teacher_students` links**, not per-class. Default plan `teacher_basic_20` seeds `student_limit=20, class_limit=5`. There is **no per-class student cap anywhere** in server or UI.

### Enforcement locations (current)
- `lib/teacher-server/teacher-session.server.js` — `resolveTeacherPlanLimits()` merges override → plan → hardcoded default 20.
- `lib/teacher-server/teacher-student-manage.server.js` — `createTeacherManagedStudent()` checks teacher-wide count.
- `lib/teacher-server/teacher-link.server.js` — `linkTeacherStudentWithConsent()` checks teacher-wide count.
- `lib/teacher-server/teacher-classes.server.js` — `createTeacherClass()` checks class count. `addClassMember()` does **not** check per-class student count — this is the primary gap.

### Current admin pattern
No admin UI exists. Only token-gated API routes (`x-admin-token` + env var) for non-teacher-portal admin tasks. Admin identity is purely operational, not a DB role.

### Where the "20" assumption lives
- `supabase/migrations/019_teacher_portal_foundation.sql` — plan seed data
- `lib/teacher-server/teacher-session.server.js` line 5: `SYSTEM_DEFAULT_STUDENT_LIMIT = 20`
- `scripts/teacher-portal/teacher-classroom-sim/config.mjs` — `STUDENT_COUNT = 20`
- Teacher UI has no limit display at all (contrast: parent dashboard shows `X / 3 children`)

---

## 2. Product Model

### Entitlement resolution order (per limit dimension)
```
admin override (teacher_limits.xxx_override)
  → plan default (teacher_plans.xxx)
    → system hardcoded fallback
```

### Dimensions
| Dimension | Current active | Future |
|---|---|---|
| `max_students_per_class` | **40** (new) | configurable per teacher |
| `max_classes_per_teacher` | null (unlimited) | configurable |
| `max_total_students_per_teacher` | null (unlimited) | configurable |
| Feature: classroom_activities | true | flag |
| Feature: parent_messaging | true | flag |
| Feature: ai_reports | true | flag |
| Feature: live_audio | false | flag |

### "Unlimited" sentinel
`null` in any limit column = unlimited (consistent with existing `teacher_school_unlimited` plan pattern).

---

## 3. New Database Design (Migration 025)

**File to create:** `supabase/migrations/025_teacher_quotas_admin.sql`

> **Migration file only. Owner runs SQL manually. Agent must stop for approval.**

### 3.1 Extend `teacher_plans`

```sql
ALTER TABLE public.teacher_plans
  ADD COLUMN IF NOT EXISTS max_students_per_class integer null
    CHECK (max_students_per_class IS NULL OR max_students_per_class >= 1);

-- Update existing plan seeds
UPDATE public.teacher_plans SET max_students_per_class = 40 WHERE code = 'teacher_basic_20';
UPDATE public.teacher_plans SET max_students_per_class = 40 WHERE code = 'teacher_pro_50';
-- teacher_school_unlimited stays NULL (unlimited)
```

### 3.2 Extend `teacher_limits`

```sql
ALTER TABLE public.teacher_limits
  ADD COLUMN IF NOT EXISTS max_students_per_class_override integer null
    CHECK (max_students_per_class_override IS NULL OR max_students_per_class_override >= 1),
  ADD COLUMN IF NOT EXISTS feature_flags jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_account_active boolean NOT NULL DEFAULT true;
```

`feature_flags` shape (future-ready):
```json
{
  "classroom_activities": true,
  "parent_messaging": true,
  "ai_reports": true,
  "live_audio": false
}
```

### 3.3 New table: `admin_audit_log`

```sql
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid        NOT NULL,  -- auth.users.id of the admin who acted
  target_type   text        NOT NULL CHECK (target_type IN ('teacher')),
  target_id     uuid        NOT NULL,
  action        text        NOT NULL,  -- e.g. 'update_quota', 'deactivate', 'set_feature'
  before_state  jsonb       NULL,
  after_state   jsonb       NULL,
  notes         text        NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_audit_log_target_idx ON public.admin_audit_log (target_type, target_id);
CREATE INDEX admin_audit_log_admin_idx  ON public.admin_audit_log (admin_user_id);

-- RLS: enabled, no authenticated policies (service-role only)
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
```

### 3.4 Future-stub tables (schema only, no data)

```sql
-- school_accounts (future Phase Q5)
CREATE TABLE IF NOT EXISTS public.school_accounts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  country_code text        NULL,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- school_teacher_memberships (future Phase Q5)
CREATE TABLE IF NOT EXISTS public.school_teacher_memberships (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid        NOT NULL REFERENCES public.school_accounts (id) ON DELETE CASCADE,
  teacher_id  uuid        NOT NULL REFERENCES public.teacher_profiles (id) ON DELETE CASCADE,
  role        text        NOT NULL DEFAULT 'teacher'
              CHECK (role IN ('teacher', 'school_admin')),
  joined_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, teacher_id)
);

-- Enable the FK stub that already exists on teacher_profiles.school_id
ALTER TABLE public.teacher_profiles
  ADD CONSTRAINT teacher_profiles_school_id_fk
  FOREIGN KEY (school_id) REFERENCES public.school_accounts (id) ON DELETE SET NULL;
```

> Note: school tables are created empty with no business logic. All existing flows are unaffected.

---

## 4. System Default Constant Change

In [`lib/teacher-server/teacher-session.server.js`](lib/teacher-server/teacher-session.server.js):

- Rename `SYSTEM_DEFAULT_STUDENT_LIMIT = 20` → split into two constants:
  - `SYSTEM_DEFAULT_MAX_TOTAL_STUDENTS = null` (unlimited for now)
  - `SYSTEM_DEFAULT_MAX_STUDENTS_PER_CLASS = 40`
- Update `resolveTeacherPlanLimits()` to return a third field: `maxStudentsPerClass` using the same override → plan → default resolution chain.
- Keep `studentLimit` (total) and `classLimit` resolving as before but update defaults to `null` (unlimited) for now.

---

## 5. Enforcement Layer

### New helper: `assertTeacherCanAddStudentToClass()`

**File:** [`lib/teacher-server/teacher-classes.server.js`](lib/teacher-server/teacher-classes.server.js)

```js
export async function assertTeacherCanAddStudentToClass(
  serviceRole, classId, maxStudentsPerClass
) {
  if (maxStudentsPerClass === null) return { ok: true }; // unlimited
  const { count, error } = await serviceRole
    .from("teacher_class_students")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId)
    .is("removed_at", null);
  if (error) return { ok: false, status: 500, code: "db_error" };
  if (count >= maxStudentsPerClass)
    return { ok: false, status: 409, code: "class_student_limit_reached",
             classStudentLimit: maxStudentsPerClass };
  return { ok: true };
}
```

### Where to call it

Every path that adds a student to a class must call this check **server-side**:

| File | Function | Action |
|---|---|---|
| [`lib/teacher-server/teacher-classes.server.js`](lib/teacher-server/teacher-classes.server.js) | `addClassMember()` | Add before insert |
| [`lib/teacher-server/teacher-student-manage.server.js`](lib/teacher-server/teacher-student-manage.server.js) | `createTeacherManagedStudent()` | Add before `addClassMember` call when `classId` provided |
| [`pages/api/teacher/classes/[classId]/members.js`](pages/api/teacher/classes/[classId]/members.js) | POST handler | Pass `ctx.limits.maxStudentsPerClass` |

`maxStudentsPerClass` is read from `ctx.limits` which comes from `requireTeacherApiContext` → `resolveTeacherPlanLimits`.

### Existing helpers to keep (no removal)

- `countActiveTeacherStudentLinks` — used for total-student limit (currently unlimited, keep for future)
- `assertTeacherCanManageStudentAccess` — keep unchanged

### Simulation bootstrap exemption

[`scripts/teacher-portal/teacher-classroom-sim/bootstrap.mjs`](scripts/teacher-portal/teacher-classroom-sim/bootstrap.mjs) uses service-role direct inserts (bypasses API routes), so it naturally bypasses enforcement. The simulation uses 20 students per class, well under 40. No change needed in Q2. **Document** this explicitly in the bootstrap file comments.

### Handling existing classes over 40 students

At migration time, run a read-only diagnostic query:
```sql
SELECT class_id, COUNT(*) AS active_members
FROM teacher_class_students
WHERE removed_at IS NULL
GROUP BY class_id
HAVING COUNT(*) > 40;
```
If any exist, they are **grandfathered** — the new limit only blocks new additions. The admin screen will surface the count so the owner can manually decide. Do not retroactively remove students.

---

## 6. New Server Library: Admin

**File:** `lib/admin-server/admin-request.server.js`

```js
export async function requireAdminApiContext(authHeader) {
  const userId = await resolveAdminUserId(authHeader); // checks app_metadata.role === "admin"
  if (!userId.ok) return userId;
  return { ok: true, adminUserId: userId.adminUserId, serviceRole };
}
```

### Admin identity model

Use **Supabase `app_metadata.role = "admin"`** on the owner's auth user — consistent with the existing teacher pattern (`app_metadata.role = "teacher"`). Set this once manually via Supabase Auth dashboard or CLI.

> Open question for owner: Which Supabase user ID is the admin? Must be set before Q3 ships.

Token-based admin (`x-admin-token`) for the **existing** admin API routes is left unchanged. New teacher-management admin APIs use the `app_metadata.role` model.

---

## 7. API Design

### Admin APIs (all require `app_metadata.role === "admin"`)

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/admin/teachers` | List all teachers with usage stats |
| GET | `/api/admin/teachers/[teacherId]` | Single teacher detail |
| PATCH | `/api/admin/teachers/[teacherId]/quotas` | Update `teacher_limits` quota columns |
| PATCH | `/api/admin/teachers/[teacherId]/features` | Update `feature_flags` in `teacher_limits` |
| PATCH | `/api/admin/teachers/[teacherId]/status` | Set `is_account_active` |
| GET | `/api/admin/teachers/[teacherId]/audit-log` | Fetch `admin_audit_log` for teacher |

**Files to create under `pages/api/admin/teachers/`.**

### Response shape for `GET /api/admin/teachers`

```json
{
  "teachers": [{
    "teacherId": "...",
    "email": "...",
    "displayName": "...",
    "isActive": true,
    "planCode": "teacher_basic_20",
    "classCount": 3,
    "totalActiveStudents": 57,
    "classes": [{ "classId": "...", "name": "...", "activeStudentCount": 19 }],
    "quotas": {
      "maxStudentsPerClass": 40,
      "maxStudentsPerClassOverride": null,
      "maxClasses": null,
      "maxTotalStudents": null
    },
    "featureFlags": { "classroom_activities": true }
  }]
}
```

### Authorization rules (all admin APIs)

- Only `app_metadata.role === "admin"` may call any `/api/admin/teachers/*` route.
- Teacher cannot modify their own `teacher_limits` row via any API.
- Teacher cannot read another teacher's data.
- Student / parent / guardian are rejected at `requireTeacherApiContext` level; they cannot reach admin routes.
- All admin mutations write a row to `admin_audit_log` via a shared `writeAdminAuditRow()` helper.

**New helper:** `lib/admin-server/admin-audit.server.js` — `writeAdminAuditRow(serviceRole, adminUserId, targetType, targetId, action, before, after)`.

---

## 8. Admin UI Pages (`pages/admin/`)

All pages are server-side rendered (Pages Router pattern). Auth guard: redirect to `/teacher/login` (or a future `/admin/login`) if no valid admin session.

### Pages to create

| Route | File | Purpose |
|---|---|---|
| `/admin/teachers` | `pages/admin/teachers/index.js` | Teacher list table with usage stats |
| `/admin/teachers/[teacherId]` | `pages/admin/teachers/[teacherId].js` | Teacher detail + quota + feature editing |

### UI components to create

- `components/admin/AdminShell.jsx` — minimal shell (RTL, auth guard)
- `components/admin/TeacherAdminTable.jsx` — sortable table
- `components/admin/TeacherQuotaForm.jsx` — form for editing quotas/features

### Copy

No Hebrew copy without owner approval. Use English placeholder keys for now:
- `admin.teachers.title` → `"Teachers"`
- `admin.teachers.quota.maxStudentsPerClass` → `"Max students per class"`
- `admin.teachers.quota.override` → `"Override (leave blank = use plan default)"`
- `admin.teachers.feature.classroom_activities` → `"Classroom activities"`
- `admin.teachers.status.deactivate` → `"Deactivate teacher"`

> Hebrew copy keys will be proposed to owner for approval before final implementation.

---

## 9. Teacher-Facing UI Change

One targeted change in [`components/teacher-portal/TeacherDashboardClient.jsx`](components/teacher-portal/TeacherDashboardClient.jsx):

- In the class manage modal (function `ClassManagePanel`), display `{activeCount} / {maxStudentsPerClass} students` if a per-class limit applies.
- When `POST /api/teacher/classes/[classId]/members` returns `409 class_student_limit_reached`, show a clear inline message (copy key: `teacher.class.studentLimitReached`).
- No other teacher UI changes.

The dashboard already receives `limits` in the payload; `maxStudentsPerClass` just needs to be threaded through.

---

## 10. Future School Manager Architecture

The DB is already stub-ready (`teacher_profiles.school_id`, `school_accounts`, `school_teacher_memberships`). Future expansion:

```
school_accounts (id, name, is_active)
  └── school_teacher_memberships (school_id, teacher_id, role: teacher|school_admin)
        └── teacher_profiles (school_id FK)

Quota resolution (future):
  teacher_limits.override
    → school-level defaults (future school_quota_settings table)
      → teacher_plans
        → system fallback
```

`app_metadata.role` values to plan for: `"teacher"`, `"school_admin"`, `"admin"` (platform owner). School admin would only see teachers in their `school_id`.

**Nothing in this phase implements school logic.** The tables are created empty. Quota resolution code is written to accept a future `schoolDefaults` argument (default `null`).

---

## 11. Rollout Phases

### Q0 — Audit (done with this plan)
- Codebase review complete.
- Identified gaps: no per-class limit, no admin UI, no feature flags.

### Q1 — DB Foundation
- Write `supabase/migrations/025_teacher_quotas_admin.sql`.
- Stop. Owner reviews and runs SQL manually.
- After SQL confirmed: update `resolveTeacherPlanLimits()` to return `maxStudentsPerClass`, update `SYSTEM_DEFAULT_MAX_TOTAL_STUDENTS = null`.

### Q2 — Enforce 40 Students Per Class
- Add `assertTeacherCanAddStudentToClass()` to `teacher-classes.server.js`.
- Wire into `addClassMember()`, `createTeacherManagedStudent()`, and the `members.js` API route.
- Add inline UI error message for `class_student_limit_reached` in `TeacherDashboardClient`.
- Run diagnostic query to check for any existing classes over 40 (read-only).

### Q3 — Owner Admin Screen
- Create `lib/admin-server/admin-request.server.js`.
- Create `lib/admin-server/admin-audit.server.js`.
- Create all `pages/api/admin/teachers/` routes.
- Create `pages/admin/teachers/` pages.
- Owner sets `app_metadata.role = "admin"` on their Supabase user.

### Q4 — Feature Flags
- Populate default `feature_flags` JSON for all teachers.
- Add `assertTeacherFeatureEnabled(feature, featureFlags)` helper.
- Wire into activity, parent-message, and report routes as appropriate.
- Admin screen feature toggles are already built in Q3.

### Q5 — School Manager Readiness
- Activate `school_accounts` + `school_teacher_memberships` for real use.
- Add school admin role to `app_metadata.role`.
- Add school-scoped admin API routes.
- Add per-school quota defaults.

---

## 12. QA and Tests

| Test type | What to test | File location |
|---|---|---|
| Unit | `resolveTeacherPlanLimits` returns `maxStudentsPerClass` correctly | `__tests__/teacher-session.test.js` |
| Unit | `assertTeacherCanAddStudentToClass` blocks at 40, allows below | `__tests__/teacher-classes.test.js` |
| API smoke | `POST /api/teacher/classes/[id]/members` returns 409 at 40 | `scripts/teacher-portal/phase5c-class-limit-smoke.mjs` (new) |
| API smoke | `POST /api/teacher/students/create` with classId returns 409 at 40 | same |
| Security | Teacher cannot call `/api/admin/teachers/*` (expects 403) | new smoke |
| Security | Admin cannot bypass teacher portal with admin token | new smoke |
| Security | IDOR: teacher A cannot add student to teacher B's class | `phase9-security-smoke.mjs` (extend) |
| Regression | All existing phase4–phase10 smokes pass unmodified | CI |
| Build | `next build` passes with no new lint errors | CI |

---

## 13. Acceptance Criteria

The feature is complete when:
- [ ] `POST /api/teacher/classes/[classId]/members` returns `409 class_student_limit_reached` when the class has 40 active members.
- [ ] `POST /api/teacher/students/create` with `classId` returns `409 class_student_limit_reached` when the class already has 40 active members.
- [ ] A teacher with 41 classes and 1000 total students is not blocked (unlimited class/total counts).
- [ ] Teacher UI shows a clear message when their class is at 40.
- [ ] `GET /api/admin/teachers` returns list accessible only to `app_metadata.role === "admin"`.
- [ ] Admin can update `max_students_per_class_override` for a specific teacher.
- [ ] Every admin mutation is recorded in `admin_audit_log`.
- [ ] A non-admin teacher calling any `/api/admin/teachers/*` route receives `403`.
- [ ] Simulation bootstrap script still creates 20 students per class without errors.
- [ ] `next build` passes.

---

## 14. Risks and Open Questions

| # | Question / Risk | Owner action needed |
|---|---|---|
| 1 | **Admin user identity**: Which Supabase `auth.users.id` is the platform owner? Need `app_metadata.role = "admin"` set on that user before Q3. | Owner sets via Supabase dashboard |
| 2 | **Existing classes over 40**: Diagnostic query must be run before Q2 goes live. Grandfathering is the default. | Owner decides if any manual cleanup is needed |
| 3 | **Removed students**: `teacher_class_students.removed_at IS NOT NULL` rows do NOT count toward the 40. Re-adding a removed student to the same class uses the same unique index (enforces re-add instead of duplicate). Confirm this is desired. | Owner confirms |
| 4 | **Same student in two classes**: Each class is counted independently. Student in class A and class B counts as 1 in each, not 2 toward a single class cap. | By design — no action needed |
| 5 | **Simulation accounts**: bootstrap.mjs bypasses APIs via service role. It is exempt from the 40-per-class limit by design. Confirm this is acceptable. | Owner confirms |
| 6 | **Total-student default**: Changing `SYSTEM_DEFAULT_STUDENT_LIMIT` from 20 to `null` (unlimited) will affect any teacher whose `teacher_limits` row has `plan_code = teacher_basic_20` and both overrides are `null`. Before Q1 they were capped at 20 total students. After Q1 they are unlimited total (only 40-per-class applies). Confirm this intentional business decision. | Owner confirms |
| 7 | **Future paid plans**: Feature flags and quota overrides in `teacher_limits` are designed to support different paid tiers without a schema change. Tiers can be added as new rows in `teacher_plans`. | No action yet |
| 8 | **Hebrew copy for admin screen**: Admin UI will use English keys in Q3. Owner must approve Hebrew copy before Q3 ships to production. | Owner provides copy |
