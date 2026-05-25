# School Managed Portal — Full Planning Document

**Project:** LEO KIDS  
**Planning date:** 2026-05-26  
**Revision:** 2 — updated per owner review comments  
**Status:** Planning only — no SQL applied, no code written, no commit.  
**Target migration:** 027 (owner must apply manually)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Existing Architecture Summary](#2-existing-architecture-summary)
3. [Proposed School Data Model](#3-proposed-school-data-model)
4. [Proposed Role Model](#4-proposed-role-model)
5. [Routing and Session Model](#5-routing-and-session-model)
6. [Dual-Role Behavior](#6-dual-role-behavior)
7. [Proposed Subject-Permission Model](#7-proposed-subject-permission-model)
8. [Preserving Private Teachers](#8-preserving-private-teachers)
9. [School Enrollment vs Teacher Visibility](#9-school-enrollment-vs-teacher-visibility)
10. [Server-Side Permission Enforcement](#10-server-side-permission-enforcement)
11. [API Changes Required](#11-api-changes-required)
12. [UI Pages Required](#12-ui-pages-required)
13. [Migration 027 Proposal](#13-migration-027-proposal)
14. [Security and IDOR Test Plan](#14-security-and-idor-test-plan)
15. [Regression Test Plan](#15-regression-test-plan)
16. [**Final Execution Rules and Owner Manual Gates**](#16-final-execution-rules-and-owner-manual-gates)
17. [Phased Implementation Roadmap](#17-phased-implementation-roadmap)

---

## 1. Executive Summary

The School Managed Portal adds a school organization layer on top of the existing teacher portal. Every existing behavior for private teachers, parents, students, and the owner admin remains untouched. Schools are strictly opt-in; any teacher not found in `school_teacher_memberships` is treated as a private teacher with zero school-related restrictions.

**Key design decisions confirmed in Revision 2:**

- `school_teacher_memberships` is the **sole source of truth** for school access. `teacher_profiles.school_id` is a denormalization convenience field and is never used as a security gate.
- The school manager is not a new Supabase auth role. They authenticate as `role = 'teacher'` and are elevated by a `school_teacher_memberships` record with `role = 'school_admin'`.
- Login stays at `/teacher/login`. No separate school login exists. `/school/*` pages share the identical Supabase Bearer session.
- A user who is both a school manager and an active teacher can access both portals. Default redirect after login goes to `/school/dashboard`; a navigation link returns them to `/teacher/dashboard`.
- Subject permissions enforce access not only on activity creation but on **all report endpoints**: student reports, class reports, weak topics, recommendations, activity history, individual activity history, and parent report preview. A math-only teacher cannot see English diagnostic data.
- School enrollment (in `school_student_enrollments`) gives the school manager visibility. It does **not** automatically make a student visible to every teacher in the school. Teachers see only students assigned to them via `teacher_students` or class membership, exactly as today.
- Owner admin school management (create school, view school, assign manager, assign teacher, audit) is **Phase 1** — it is required infrastructure for everything else and must exist before any school manager can log in.
- Audit logging is introduced in every phase alongside the actions it covers. It does not wait for a hardening phase.

---

## 2. Existing Architecture Summary

### 2.1 Technology Stack

- **Framework:** Next.js Pages Router (`pages/`). No App Router. No `middleware.ts`.
- **Auth:** Supabase Auth. Role stored in `user.app_metadata.role` (`teacher`, `admin`). Students use a separate cookie-based session (`liosh_student_session`). Guardians use `liosh_guardian_session`.
- **API layer:** `pages/api/` only. Server auth via `Authorization: Bearer <access_token>` parsed with `requireTeacherApiContext` or `requireAdminApiContext`.
- **DB mutations:** Service role client only. RLS policies on teacher tables are SELECT-only for authenticated users; all writes go through server-side API handlers.
- **No edge middleware** — all routing protection is per-page (client redirect) and per-API-handler (server check).

### 2.2 Current Database Tables (Final State After Migration 026)

#### Core teacher tables

| Table | Key Columns | Notes |
|-------|------------|-------|
| `teacher_profiles` | `id` (= auth user id), `display_name`, `preferred_language`, `school_id` (nullable FK → `school_accounts`), `is_active`, `archived_at`, `access_prefix` | One row per teacher Supabase user |
| `teacher_students` | `teacher_id`, `student_id`, `relationship` (primary_teacher/subject_teacher/tutor/observer), `archived_at` | Many teachers per student supported; unique partial on (teacher_id, student_id) WHERE archived_at IS NULL |
| `teacher_classes` | `teacher_id`, `name`, `grade_level`, `subject_focus`, `color_hint`, `is_archived` | Owned by one teacher; no school_id yet |
| `teacher_class_students` | `class_id`, `student_id`, `joined_at`, `removed_at` | Soft remove; unique partial (class_id, student_id) WHERE removed_at IS NULL |
| `teacher_limits` | `teacher_id` (PK), `plan_code`, `student_limit_override`, `class_limit_override`, `max_students_per_class_override`, `feature_flags` (jsonb), `is_account_active` | Per-teacher quota and feature gate |
| `teacher_plans` | `code` (PK), `display_name`, `student_limit`, `class_limit`, `max_students_per_class` | Seeded: `teacher_basic_20`, `teacher_pro_50`, `teacher_school_unlimited` |
| `teacher_access_audit` | `teacher_id`, `action`, `metadata` | Audit trail for teacher-scope actions |
| `admin_audit_log` | `admin_user_id`, `target_type` (teacher), `target_id`, `action`, `before_state`, `after_state` | Admin actions audit; service-role only |

#### Activity tables

| Table | Key Columns | Owned By |
|-------|------------|---------|
| `classroom_activities` | `teacher_id`, `class_id`, `subject`, `topic`, `status`, `question_set` | Teacher via `teacher_id` |
| `classroom_activity_student_status` | `activity_id`, `student_id`, `status`, `score_pct` | Derived from classroom_activities |
| `classroom_activity_attempts` | `activity_id`, `student_id`, `question_index`, `is_correct` | Derived |
| `student_activities` | `teacher_id`, `student_id`, `subject`, `topic`, `status` | Teacher via `teacher_id` |
| `student_activity_status` | `activity_id`, `student_id`, `status`, `score_pct` | Derived |
| `student_activity_attempts` | `activity_id`, `student_id`, `question_index`, `is_correct` | Derived |

#### School stubs (025 — no app logic yet)

| Table | Columns | Status |
|-------|---------|--------|
| `school_accounts` | `id`, `name`, `country_code`, `is_active`, `created_at`, `updated_at` | Stub only — no API reads/writes |
| `school_teacher_memberships` | `id`, `school_id`, `teacher_id`, `role` (teacher/school_admin), `joined_at` | Stub only — no API reads/writes |

`teacher_profiles.school_id` FK to `school_accounts` was wired in 025 but is never written by app code and is never used for security decisions.

### 2.3 Authentication Flow (Current)

```
Browser: supabase.auth.signInWithPassword(email, password)
         ↓
Supabase Auth returns access_token
         ↓
Client sets Authorization: Bearer <token> on all API calls
         ↓
Server: getUser(token) → user.app_metadata.role
  role = 'teacher' → requireTeacherApiContext
  role = 'admin'   → requireAdminApiContext
  else             → 403
```

`requireTeacherApiContext` additional checks:
- Teacher portal not globally disabled (env flag)
- `teacher_profiles.is_active = true` and `archived_at IS NULL`
- `teacher_limits.is_account_active = true`
- Returns: `teacherId`, `limits`, `featureFlags`, `serviceRole`

Admin goes to `/teacher/login`, detects `role = 'admin'` client-side, shows admin UI.

### 2.4 Current UI Page Map

```
pages/
├── teacher/
│   ├── login.js                                        /teacher/login
│   ├── dashboard.js                                    /teacher/dashboard
│   ├── class/[classId].js                              /teacher/class/:classId
│   ├── class/[classId]/activities/index.js             /teacher/class/:classId/activities
│   ├── class/[classId]/activities/new.js               /teacher/class/:classId/activities/new
│   ├── class/[classId]/activities/[actId]/monitor.js   ...monitor
│   ├── class/[classId]/activities/[actId]/report.js    ...report
│   ├── student/[studentId].js                          /teacher/student/:studentId
│   └── student/[studentId]/parent-report.js            ...parent-report
├── admin/teachers/
│   ├── index.js                                        /admin/teachers
│   └── [teacherId].js                                  /admin/teachers/:teacherId
├── parent/  (login, dashboard, rewards, child-report)
├── student/ (login, home, activity, arcade, games/*)
└── guardian/ (login, view)
```

No `pages/school/` or `pages/admin/schools/` exist yet.

### 2.5 Current Permission Model (Server-Side)

| Resource | Ownership check |
|----------|----------------|
| Class | `teacher_classes.teacher_id = auth.uid()` |
| Classroom activity | `classroom_activities.teacher_id = auth.uid()` |
| Individual activity | `student_activities.teacher_id = auth.uid()` |
| Student report access | Active `teacher_students` link OR student in any active class owned by teacher |
| Class report | Teacher owns class |

No subject-level permission exists. Any teacher can create activities and view reports for any subject.

---

## 3. Proposed School Data Model

### 3.1 Design Principles

- **`school_teacher_memberships` is the sole authorization source of truth** for school membership and role. `teacher_profiles.school_id` is a convenience denormalization used for FK joins and backfills only — it is never used to make an access decision.
- A teacher with no row in `school_teacher_memberships` is a **private teacher**, regardless of whether `teacher_profiles.school_id` is set or NULL.
- A teacher with `school_teacher_memberships.role = 'school_admin'` is a **school manager**.
- A teacher with `school_teacher_memberships.role = 'teacher'` is a **school teacher** subject to subject-permission restrictions.
- Students are enrolled in a school explicitly via `school_student_enrollments`. Enrollment makes the student visible to the school manager. It does not grant visibility to individual teachers.
- Classes belong to a teacher. The school sees them through the teacher's membership, not through any class-level school column alone.

### 3.2 Extended `school_accounts`

Add columns to the existing stub:

| New Column | Type | Purpose |
|-----------|------|---------|
| `contact_email` | `text` (nullable, valid email format) | School contact for owner admin use |
| `city` | `text` (nullable, max 100) | Display in owner admin |
| `max_teachers` | `integer` (nullable, ≥ 1) | Soft cap enforced at invite time; NULL = unlimited |

`updated_at` trigger already exists on the stub.

### 3.3 Extended `school_teacher_memberships`

Existing: `role CHECK IN ('teacher', 'school_admin')`

No change to the CHECK constraint. `school_admin` covers the school manager/principal role. The UI maps `school_admin` to the appropriate Hebrew label without touching the DB enum.

Add column:

| New Column | Type | Purpose |
|-----------|------|---------|
| `subjects_locked` | `boolean` NOT NULL default `false` | When true, teacher cannot self-modify their subject list; only school manager can |

### 3.4 New `school_teacher_subjects`

Subject-level permissions for school teachers. This table drives enforcement across activity creation **and all report endpoints**.

```
school_teacher_subjects
  id            uuid PK default gen_random_uuid()
  school_id     uuid NOT NULL FK → school_accounts(id) ON DELETE CASCADE
  teacher_id    uuid NOT NULL FK → teacher_profiles(id) ON DELETE CASCADE
  subject       text NOT NULL CHECK(length(trim(subject)) BETWEEN 1 AND 64)
  grade_level   text (nullable, max 32)  -- NULL = all grade levels for this subject
  granted_by    uuid NOT NULL FK → teacher_profiles(id) ON DELETE RESTRICT
  created_at    timestamptz NOT NULL DEFAULT now()
  UNIQUE (school_id, teacher_id, subject, grade_level)
```

A school teacher with no rows in this table for their school cannot create any activities and will see empty/redacted subject sections in all reports until the school manager grants at least one subject.

### 3.5 New `school_student_enrollments`

Explicitly links a student to a school. This is the **only** table that grants school-manager visibility to a student. It does not affect individual teacher visibility.

```
school_student_enrollments
  id                  uuid PK default gen_random_uuid()
  school_id           uuid NOT NULL FK → school_accounts(id) ON DELETE CASCADE
  student_id          uuid NOT NULL FK → students(id) ON DELETE CASCADE
  enrolled_by         uuid (nullable) FK → teacher_profiles(id) ON DELETE SET NULL
  enrolled_at         timestamptz NOT NULL DEFAULT now()
  unenrolled_at       timestamptz (nullable, soft unenroll)
  notes               text (nullable, max 500)
  UNIQUE (school_id, student_id) WHERE unenrolled_at IS NULL
```

A student not in this table for a given school is invisible to that school's manager. A student's enrollment in a school does not automatically create `teacher_students` links or class memberships for any teacher.

### 3.6 FK on `teacher_classes`

Add `school_id` to `teacher_classes` for efficient school-level class queries:

```sql
ALTER TABLE public.teacher_classes
  ADD COLUMN school_id uuid
  REFERENCES school_accounts(id) ON DELETE SET NULL;
```

Backfill via `teacher_profiles.school_id` join. This column is a convenience for queries, not an access gate. The access gate is always `school_teacher_memberships`.

### 3.7 FK on `classroom_activities` and `student_activities`

Add `school_id` for efficient school-level activity queries:

```sql
ALTER TABLE public.classroom_activities
  ADD COLUMN school_id uuid REFERENCES school_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.student_activities
  ADD COLUMN school_id uuid REFERENCES school_accounts(id) ON DELETE SET NULL;
```

Backfill from teacher's membership. Again: these are query-efficiency columns, not security gates.

### 3.8 Complete Proposed Entity Relationship

```
school_accounts (1)
  ├──< school_teacher_memberships >── teacher_profiles  [AUTH SOURCE OF TRUTH]
  │                  role: teacher | school_admin
  ├──< school_student_enrollments >── students  [MANAGER VISIBILITY ONLY]
  ├──< school_teacher_subjects >── teacher_profiles  [SUBJECT PERMISSIONS]
  └── (denormalized FK on)
        teacher_profiles.school_id          (convenience, not security)
        teacher_classes.school_id           (query efficiency)
        classroom_activities.school_id      (query efficiency)
        student_activities.school_id        (query efficiency)

teacher_profiles (1)
  ├──< teacher_classes (teacher owns)
  │     └──< teacher_class_students >── students
  │     └──< classroom_activities
  │           └──< classroom_activity_student_status
  │           └──< classroom_activity_attempts
  ├──< teacher_students >── students (direct link)
  └──< student_activities
        └──< student_activity_status
        └──< student_activity_attempts
```

---

## 4. Proposed Role Model

### 4.1 Auth Roles (Supabase `app_metadata.role`)

| Role value | Who has it | Access |
|-----------|-----------|--------|
| `teacher` | Private teachers, school teachers, school managers | Teacher portal APIs AND school portal APIs |
| `admin` | Owner/system admin only | Admin portal APIs; no school portal access |

**No new Supabase auth role is added.** The school manager distinction is a DB record in `school_teacher_memberships`, not an auth role.

### 4.2 School Role Detection (Post-Login Flow)

```
POST /teacher/login (Supabase client-side signInWithPassword)
  → success → GET /api/teacher/me
    → server queries:
        teacher_profiles (profile)
        teacher_limits   (quotas/flags)
        school_teacher_memberships WHERE teacher_id = uid
          (returns role, school_id — or null if private teacher)
    → response includes:
        schoolMembership: {
          schoolId: uuid,
          schoolRole: 'school_admin' | 'teacher',
          schoolName: string,
          isSchoolManager: boolean
        } | null
  → client:
      if isSchoolManager → redirect /school/dashboard
      else              → redirect /teacher/dashboard (existing behavior)
```

The `schoolMembership` is derived entirely from `school_teacher_memberships`. `teacher_profiles.school_id` is NOT queried for this routing decision.

### 4.3 Role Capabilities Matrix

| Capability | Private Teacher | School Teacher | School Manager | Owner Admin |
|-----------|----------------|----------------|----------------|-------------|
| Log in via `/teacher/login` | Yes | Yes | Yes | Yes |
| See `/teacher/dashboard` | Yes | Yes | Yes (via nav link) | No |
| See `/school/dashboard` | No | No | Yes | No |
| Create classes | Yes | Yes (plan limit) | Yes | No |
| Create activities for any subject | Yes (no restriction) | No — `school_teacher_subjects` | Yes (all subjects) | No |
| View report for any subject | Yes (no restriction) | No — subject-filtered | Yes (all subjects) | No |
| View all teachers in school | No | No | Yes | Via /admin/schools |
| View all students in school | No | No | Yes (enrolled students) | Via /admin/schools |
| See students not linked to them | No | No | Yes (if enrolled) | No |
| View class report | Own classes | Own classes (filtered by subject) | All school classes | No |
| View student report | Linked students | Linked students (subject-filtered) | All enrolled students | No |
| Manage subject permissions | No | No | Yes | No |
| Manage teacher quotas | No | No | No | Yes |
| Create/manage schools | No | No | No | Yes |
| Assign teachers/managers to school | No | No | No | Yes |
| Activate/deactivate teacher accounts | No | No | No | Yes |

### 4.4 `requireSchoolManagerApiContext` — New Server Helper

```
lib/school-server/school-request.server.js

requireSchoolManagerApiContext(req)
  1. Bearer + getUser() — same as requireTeacherApiContext
  2. app_metadata.role must be 'teacher'
  3. Query school_teacher_memberships WHERE teacher_id = uid AND role = 'school_admin'
  4. If not found → 403 not_a_school_manager
  5. Load school_accounts WHERE id = membership.school_id AND is_active = true
  6. If school not active → 403 school_inactive
  7. Returns: { schoolId, managerId (= auth uid), schoolName, serviceRole }
```

Source of truth: `school_teacher_memberships`. `teacher_profiles.school_id` is not consulted.

### 4.5 `loadTeacherSchoolMembership` — New Shared Helper

Used by teacher-side APIs to determine if a teacher is a school member (for subject-permission and report-filter checks):

```
lib/school-server/school-membership.server.js

loadTeacherSchoolMembership(serviceRole, teacherId)
  Query: school_teacher_memberships
    WHERE teacher_id = teacherId
    LIMIT 1
  Returns: { schoolId, role } | null

  null → private teacher → no restrictions apply
  { role: 'teacher' } → school teacher → subject permissions apply
  { role: 'school_admin' } → school manager → no subject restrictions,
                              but school manager APIs available
```

This function is the **single guard** for all school-context decisions on teacher-side APIs. It does not look at `teacher_profiles.school_id`.

---

## 5. Routing and Session Model

### 5.1 Login Endpoint

**There is one login endpoint: `/teacher/login`.**

No separate `/school/login` is created. The existing Supabase email/password login form is used by private teachers, school teachers, school managers, and the owner admin identically. Post-login routing is determined by the `/api/teacher/me` response.

### 5.2 Route Namespace Decision: `/school/*`

**Decision: use `/school/dashboard`, not `/teacher/school/dashboard`.**

Rationale:
- Consistent with how the admin portal uses `/admin/` (a separate namespace under the same Supabase auth) rather than `/teacher/admin/`.
- The school manager portal is conceptually a different interface with its own shell, navigation, and scope — not a sub-section of the teacher's personal workspace.
- Shorter, cleaner URL that reads clearly to the school manager.
- Avoids the implication that `/teacher/school/*` belongs to the logged-in teacher's personal classes/students.

### 5.3 Session Model for `/school/*`

All `/school/*` pages use the **identical Supabase Bearer session** as `/teacher/*` pages. There is no second auth cookie, no second login, no separate token.

The same `lib/teacher-portal/use-teacher-portal-session.js` session helper is called from school pages to resolve the Bearer token. The difference is that school API calls are made to `/api/school/*` endpoints, which run `requireSchoolManagerApiContext` server-side instead of `requireTeacherApiContext`.

```
Client (school page)
  → resolveTeacherAccessToken()  (same hook, same token)
  → schoolAuthFetch('GET /api/school/dashboard', { Bearer })
  → server: requireSchoolManagerApiContext
      checks school_teacher_memberships
      returns school-scoped data
```

### 5.4 Post-Login Routing Logic (Full)

```javascript
// In pages/teacher/login.js (client, after signInWithPassword succeeds)
const me = await teacherAuthFetch('/api/teacher/me');

if (me.role === 'admin') {
  router.replace('/admin/teachers');  // existing behavior
} else if (me.schoolMembership?.isSchoolManager) {
  router.replace('/school/dashboard'); // new: school manager
} else {
  router.replace('/teacher/dashboard'); // existing: private or school teacher
}
```

---

## 6. Dual-Role Behavior

### 6.1 Definition

A user may simultaneously be:
- Assigned as a school manager (`school_teacher_memberships.role = 'school_admin'`)
- An active teacher with their own classes and students

This is a legitimate configuration, e.g., the school principal also teaches one class.

### 6.2 Default Behavior

On login, if the user is a school manager, they are redirected to `/school/dashboard` regardless of whether they also have personal classes. This is the primary role.

### 6.3 Cross-Portal Navigation

`SchoolPortalShell` includes a navigation link: **"My Teacher Dashboard"** (Hebrew label from existing translation). This link appears only if the school manager has at least one personal class or linked student (checked from `schoolMembership.hasTeacherActivity` in the `/api/teacher/me` response).

`TeacherPortalShell` includes a navigation link: **"School Management"** (Hebrew label) if `me.schoolMembership?.isSchoolManager === true`. This returns the user to `/school/dashboard`.

### 6.4 API Behavior for Dual-Role Users

When a dual-role user calls teacher-side APIs (`/api/teacher/*`), the server context is `requireTeacherApiContext` — they are treated as a teacher, scoped to their `teacherId`. They see only their own classes and students, exactly as any other teacher.

When they call school-side APIs (`/api/school/*`), the server context is `requireSchoolManagerApiContext` — they see all school-scoped data.

The two contexts are never mixed. A dual-role user cannot escalate teacher-side permissions by virtue of also being a school manager.

### 6.5 Subject Permissions for Dual-Role Users

A school manager who also teaches is **not** subject-restricted in either portal:
- On `/api/teacher/activities` (POST): `school_teacher_memberships.role = 'school_admin'` → no subject restriction (school managers have all-subject access, same rule as before).
- On `/api/teacher/students/[id]/report-data`: no subject filter applied.

This check is: `if (membership?.role === 'school_admin') { skip subject filter; }`.

---

## 7. Proposed Subject-Permission Model

### 7.1 Scope of Enforcement

Subject permissions gate access at two levels for school teachers:

1. **Activity creation** — a math teacher cannot create an English activity.
2. **Report data** — a math teacher cannot see English diagnostic sections in any report.

Both levels are enforced **server-side** in the API layer. The client may hide UI elements for UX, but the server enforces independently.

### 7.2 Subjects That Are Restricted

For a school teacher (`school_teacher_memberships.role = 'teacher'`):

- All data in reports is filtered to their permitted subjects only.
- A teacher with zero permitted subjects sees empty reports and cannot create any activity.
- A teacher with `[math]` permitted sees only math session data, math weak topics, math recommendations, math activity history, math individual activity history.
- English and Hebrew diagnostic details, vocabulary progress, reading scores — all hidden if the teacher does not have the corresponding subject permission.

For a school manager (`role = 'school_admin'`): no restriction. All subjects visible.

For a private teacher (no `school_teacher_memberships` row): no restriction. All subjects visible.

### 7.3 Subject Permission Check (Activity Creation)

```javascript
// lib/school-server/school-subjects.server.js

async function checkSchoolTeacherSubjectPermission(
  serviceRole, teacherId, schoolId, subject, gradeLevel
) {
  const { data } = await serviceRole
    .from('school_teacher_subjects')
    .select('id')
    .eq('school_id', schoolId)
    .eq('teacher_id', teacherId)
    .eq('subject', subject)
    .or(`grade_level.is.null,grade_level.eq.${gradeLevel ?? ''}`)
    .limit(1);
  return (data?.length ?? 0) > 0;
}
```

Called from `POST /api/teacher/activities` and `POST /api/teacher/student-activities`. The guard pattern:

```javascript
const membership = await loadTeacherSchoolMembership(serviceRole, teacherId);
if (membership && membership.role !== 'school_admin') {
  // School teacher: check subject permission
  const allowed = await checkSchoolTeacherSubjectPermission(
    serviceRole, teacherId, membership.schoolId, body.subject, classGradeLevel
  );
  if (!allowed) return res.status(403).json({ code: 'subject_not_permitted' });
}
// Private teacher or school manager: no restriction
```

### 7.4 Subject Permission Enforcement on Reports

Each report-producing API endpoint applies a subject filter after the standard ownership/access check passes. The filter is applied in a new shared utility:

```javascript
// lib/school-server/school-subjects.server.js

async function loadTeacherPermittedSubjects(serviceRole, teacherId, schoolId) {
  // Returns Set of subject strings, or null if no restriction applies
  const membership = await loadTeacherSchoolMembership(serviceRole, teacherId);
  if (!membership || membership.role === 'school_admin') return null; // no restriction
  const { data } = await serviceRole
    .from('school_teacher_subjects')
    .select('subject')
    .eq('school_id', membership.schoolId)
    .eq('teacher_id', teacherId);
  return new Set((data ?? []).map(r => r.subject));
}

function filterReportByPermittedSubjects(reportPayload, permittedSubjects) {
  // permittedSubjects: Set | null (null = no filter)
  if (!permittedSubjects) return reportPayload; // private teacher or manager
  // Strip subject sections not in the permitted set
  return applySubjectFilter(reportPayload, permittedSubjects);
}
```

### 7.5 Report Endpoints Affected and Filtering Detail

| Endpoint | What Is Filtered |
|---------|-----------------|
| `GET /api/teacher/students/[studentId]/report-data` | `learning_sessions` grouped by subject; weak topics by subject; recommendations by subject; classroom activity history filtered to permitted subjects; individual activity history filtered to permitted subjects; overall stats remain but subject breakdowns are stripped |
| `GET /api/teacher/students/[studentId]/parent-report-data` | Same subject filter; parent-preview copy only shows permitted subject sections |
| `GET /api/teacher/classes/[classId]/report-data` | Per-student breakdown filtered to class's subject (class report is already single-subject because a class has a `subject_focus`; if `subject_focus` is not permitted → 403 `subject_not_permitted_for_class`) |
| `GET /api/school/students/[studentId]/report-data` | No filter — school manager sees all subjects |
| `GET /api/school/classes/[classId]/report-data` | No filter |

**Class report special case:** A class has a `subject_focus` column in `teacher_classes`. If a school teacher tries to view the report for a class whose `subject_focus` is a subject they are not permitted to teach, the server returns 403 `subject_not_permitted_for_class`. This check is added to `GET /api/teacher/classes/[classId]/report-data`.

**Student report detail:** The `aggregateParentReportPayload` builder returns data keyed by subject. After the builder runs, `filterReportByPermittedSubjects` removes all keys not in the permitted set. This means:
- Weak topics in non-permitted subjects → removed
- Recommendations for non-permitted subjects → removed
- Activity history items where `activity.subject` is not permitted → removed
- Individual activity history items where `activity.subject` is not permitted → removed
- Per-subject learning stats (accuracy, time, question counts) → removed for non-permitted subjects
- The permitted subjects' data is returned intact

### 7.6 Grade-Level Scoping

`school_teacher_subjects.grade_level = NULL` means "all grade levels for this subject." A specific value (e.g., `"grade_3"`) means the teacher is permitted only for that subject in that grade.

In report filtering, grade level is applied only when the student or class has a known grade. If grade is unknown, a NULL grade_level row is sufficient for access.

### 7.7 School Manager Subject Access

School managers have implicit all-subject access via their `role = 'school_admin'` membership. No `school_teacher_subjects` row is needed or checked for them.

---

## 8. Preserving Private Teachers

### 8.1 Invariants That Must Not Break

- A teacher with no row in `school_teacher_memberships` is a private teacher.
- Private teachers must pass **zero** school-related checks.
- Every existing API for private teachers must work identically after migration 027 is applied.
- Private teacher feature flags, quotas, plans, and RLS remain unchanged.

### 8.2 Implementation Guard (Membership-Based)

All school-related checks use `loadTeacherSchoolMembership` as the sole guard. If it returns null, the code path is identical to pre-migration behavior.

```javascript
// Example in /api/teacher/activities POST
const membership = await loadTeacherSchoolMembership(serviceRole, teacherId);
if (membership && membership.role !== 'school_admin') {
  // School teacher: enforce subject permission
  const allowed = await checkSchoolTeacherSubjectPermission(...);
  if (!allowed) return res.status(403).json({ code: 'subject_not_permitted' });
}
// membership === null → private teacher → fall through with no restriction
// membership.role === 'school_admin' → school manager → fall through with no restriction
```

**Critical:** Do not use `teacher_profiles.school_id` as this guard. A teacher could have `school_id` set from a previous school assignment but no current active membership (e.g., removed from school). Using `school_teacher_memberships` ensures only active memberships count.

### 8.3 Migration 027 Backfill Safety

The new nullable FK columns added to `teacher_classes`, `classroom_activities`, and `student_activities` default to NULL. Existing private-teacher rows stay NULL permanently. No data is changed for private teachers.

---

## 9. School Enrollment vs Teacher Visibility

This section explicitly documents a critical invariant to prevent confusion during implementation.

### 9.1 The Rule

**School enrollment (`school_student_enrollments`) and teacher-student visibility (`teacher_students` / `teacher_class_students`) are completely independent.**

| Action | Effect |
|--------|--------|
| School manager enrolls student in school | Student appears in `/api/school/students` for that school's manager |
| School manager enrolls student in school | Student does NOT appear in any teacher's dashboard or reports |
| Teacher A is assigned to student via `teacher_students` | Teacher A sees student; school manager may or may not have enrolled student separately |
| Teacher B is in the same school as Teacher A | Teacher B cannot see Teacher A's students unless Teacher B also has a `teacher_students` link or class membership |

### 9.2 School Manager Aggregation Query (Correct)

The school manager's student list joins only `school_student_enrollments`:

```sql
SELECT s.id, s.display_name, sse.enrolled_at
FROM school_student_enrollments sse
JOIN students s ON s.id = sse.student_id
WHERE sse.school_id = $schoolId AND sse.unenrolled_at IS NULL
ORDER BY s.display_name;
```

The school manager may additionally see which teachers within the school are linked to each enrolled student (for information purposes), but this is a supplementary display join, not an access gate:

```sql
-- Supplementary: which school teachers are linked to this enrolled student?
SELECT tp.display_name, ts.relationship
FROM teacher_students ts
JOIN teacher_profiles tp ON tp.id = ts.teacher_id
JOIN school_teacher_memberships stm ON stm.teacher_id = tp.id AND stm.school_id = $schoolId
WHERE ts.student_id = $studentId AND ts.archived_at IS NULL;
```

### 9.3 Teacher Visibility (Unchanged)

A school teacher calls `GET /api/teacher/dashboard`. The server loads `listTeacherStudents(teacherId)` — this is a query against `teacher_students` scoped by `teacher_id`. The fact that other students are enrolled in the same school has no effect. Nothing changes here.

### 9.4 Who Enrolls Students in the School

The school manager enrolls students. A school teacher cannot enroll a student in the school; they can only link students to themselves via the existing teacher-student link flow (which does not change).

---

## 10. Server-Side Permission Enforcement

### 10.1 Enforcement Points

All permission checks happen server-side, inside Next.js API handlers. No UI-only permission gate is sufficient. The client may hide buttons for UX, but the server enforces independently.

### 10.2 New Server Library Files

| File | Purpose |
|------|---------|
| `lib/school-server/school-request.server.js` | `requireSchoolManagerApiContext` |
| `lib/school-server/school-membership.server.js` | `loadTeacherSchoolMembership` (sole guard for school checks on teacher-side APIs) |
| `lib/school-server/school-session.server.js` | Load school profile, membership details |
| `lib/school-server/school-students.server.js` | `listSchoolStudents`, `enrollStudent`, `unenrollStudent` |
| `lib/school-server/school-teachers.server.js` | `listSchoolTeachers`, `getSchoolTeacher` |
| `lib/school-server/school-subjects.server.js` | `grantSubjectPermission`, `revokeSubjectPermission`, `checkSchoolTeacherSubjectPermission`, `loadTeacherPermittedSubjects`, `filterReportByPermittedSubjects` |
| `lib/school-server/school-reports.server.js` | School-level report aggregation |
| `lib/school-server/school-classes.server.js` | `listSchoolClasses` |
| `lib/admin-server/admin-schools.server.js` | Owner admin school management (create, assign, remove, audit) |

### 10.3 Permission Check Decision Tree

```
Teacher-side API request arrives
         ↓
requireTeacherApiContext (existing: Bearer, role=teacher, profile active, account active)
         ↓
loadTeacherSchoolMembership(teacherId)
         │
         ├── null  → private teacher → no school restrictions → existing behavior
         │
         ├── role = 'school_admin' → school manager → no subject restrictions
         │   (may access teacher-side data as their own teacher persona)
         │
         └── role = 'teacher' → school teacher
               ↓
               Activity creation?
                 → checkSchoolTeacherSubjectPermission(subject, gradeLevel)
                 → 403 subject_not_permitted if not allowed
               Report request?
                 → loadTeacherPermittedSubjects()
                 → filterReportByPermittedSubjects(payload, permittedSubjects)
               Class report?
                 → verify class.subject_focus IN permittedSubjects
                 → 403 subject_not_permitted_for_class if not allowed
```

```
School-side API request arrives
         ↓
requireSchoolManagerApiContext
  (Bearer, role=teacher, school_teacher_memberships.role=school_admin, school active)
         ↓
All school-scoped data: verify resource belongs to ctx.schoolId before returning
         (schoolId always from server context, never from request params/body)
```

```
Admin-side API request arrives
         ↓
requireAdminApiContext (existing: Bearer, role=admin)
         ↓
Admin school management: any school_id accepted (admin sees all schools)
```

### 10.4 IDOR Prevention for School Manager APIs

Every school manager API route must verify the requested resource belongs to the manager's school using `ctx.schoolId` from `requireSchoolManagerApiContext`:

```javascript
// Correct pattern for class detail
const cls = await serviceRole
  .from('teacher_classes')
  .select('id, school_id')
  .eq('id', classId)
  .eq('school_id', ctx.schoolId)  // school_id from server context, not request
  .single();
if (!cls.data) return res.status(403).json({ code: 'class_not_in_school' });
```

Never use a client-supplied `schoolId` query parameter for access decisions.

### 10.5 Audit Logging

**Audit logging is introduced in the same phase as the action it covers.** See the phased roadmap (Section 16) for which audits go in which phase.

Admin school management actions write to `admin_audit_log` (target_type `'school'`). School manager actions write to `teacher_access_audit` (using the school-specific action names added in migration 027). These writes happen synchronously inside the API handler, before the success response is returned.

---

## 11. API Changes Required

### 11.1 Modified Existing APIs

| Route | Change | Reason |
|-------|--------|--------|
| `GET /api/teacher/me` | Add `schoolMembership: { schoolId, schoolRole, schoolName, isSchoolManager, hasTeacherActivity } \| null` | Client routing; membership sourced from `school_teacher_memberships` only |
| `GET /api/teacher/dashboard` | Add `schoolContext: { schoolName, schoolRole } \| null` | School teacher sees school badge in shell |
| `POST /api/teacher/activities` | Add membership check → subject permission check for school teachers | Enforce `school_teacher_subjects` |
| `POST /api/teacher/student-activities` | Same membership + subject permission check | Same |
| `GET /api/teacher/students/[studentId]/report-data` | Add `loadTeacherPermittedSubjects` → `filterReportByPermittedSubjects` after existing ownership check | Subject-filtered reports |
| `GET /api/teacher/students/[studentId]/parent-report-data` | Same subject filter | Subject-filtered parent preview |
| `GET /api/teacher/classes/[classId]/report-data` | Add class `subject_focus` permission check; 403 if not permitted | Subject-filtered class report |

No other existing teacher APIs need changes. All resource-ownership checks remain identical.

### 11.2 New School Manager APIs (`pages/api/school/`)

```
GET  /api/school/me
  Auth: requireSchoolManagerApiContext
  Returns: school profile, manager info, stats (teacher count, student count, class count)
  Audit: none (read-only)

GET  /api/school/dashboard
  Auth: requireSchoolManagerApiContext
  Returns: summary cards (teachers active, students enrolled, active classes, activities today)
  Audit: none (read-only)

GET  /api/school/teachers
  Auth: requireSchoolManagerApiContext
  Returns: school_teacher_memberships + teacher_profiles for this school

GET  /api/school/teachers/[teacherId]
  Auth: requireSchoolManagerApiContext + verify membership.school_id = ctx.schoolId
  Returns: teacher profile, limits, class list, subject permissions, student count

GET  /api/school/teachers/[teacherId]/subjects
  Auth: requireSchoolManagerApiContext + verify teacher in school via membership
  Returns: school_teacher_subjects rows for this teacher

POST /api/school/teachers/[teacherId]/subjects
  Auth: requireSchoolManagerApiContext + same-origin
  Body: { subject: string, grade_level?: string }
  Action: INSERT school_teacher_subjects; granted_by = ctx.managerId
  Audit: school_subject_granted (teacher_access_audit for the affected teacher_id)

DELETE /api/school/teachers/[teacherId]/subjects/[subjectId]
  Auth: requireSchoolManagerApiContext + same-origin
  Verify: school_teacher_subjects.school_id = ctx.schoolId
  Action: DELETE row
  Audit: school_subject_revoked (teacher_access_audit for affected teacher_id)

GET  /api/school/classes
  Auth: requireSchoolManagerApiContext
  Query: ?teacherId, ?subject, ?gradeLevel, ?isArchived
  Returns: teacher_classes WHERE school_id = ctx.schoolId (via membership-derived school_id)

GET  /api/school/classes/[classId]/report-data
  Auth: requireSchoolManagerApiContext + verify class.school_id = ctx.schoolId
  Returns: same payload as teacher class report (no subject filter — manager sees all)
  Audit: school_class_viewed

GET  /api/school/students
  Auth: requireSchoolManagerApiContext
  Returns: school_student_enrollments + student profiles for this school

POST /api/school/students
  Auth: requireSchoolManagerApiContext + same-origin
  Body: { studentId: uuid, notes?: string }
  Action: INSERT school_student_enrollments; enrolled_by = ctx.managerId
  Audit: school_student_enrolled

DELETE /api/school/students/[studentId]/enrollment
  Auth: requireSchoolManagerApiContext + same-origin
  Verify: enrollment.school_id = ctx.schoolId
  Action: soft unenroll (unenrolled_at = now())
  Audit: school_student_unenrolled

GET  /api/school/students/[studentId]/report-data
  Auth: requireSchoolManagerApiContext + verify enrollment in school
  Returns: full report payload, no subject filter
  Audit: school_student_report_viewed

GET  /api/school/activities
  Auth: requireSchoolManagerApiContext
  Query: ?teacherId, ?classId, ?subject, ?status
  Returns: classroom_activities WHERE school_id = ctx.schoolId
```

### 11.3 New Owner Admin APIs for School Management (`pages/api/admin/schools/`)

```
GET  /api/admin/schools
  Auth: requireAdminApiContext
  Returns: all school_accounts with teacher count, is_active

POST /api/admin/schools
  Auth: requireAdminApiContext + same-origin
  Body: { name, contact_email?, city?, max_teachers?, country_code? }
  Action: INSERT school_accounts
  Audit: admin_audit_log target_type='school' action='school_created'

GET  /api/admin/schools/[schoolId]
  Auth: requireAdminApiContext
  Returns: school detail + school_teacher_memberships list + student enrollment count

PATCH /api/admin/schools/[schoolId]
  Auth: requireAdminApiContext + same-origin
  Body: { name?, contact_email?, city?, max_teachers?, is_active?, country_code? }
  Action: UPDATE school_accounts
  Audit: admin_audit_log action='school_updated' before_state/after_state

POST /api/admin/schools/[schoolId]/assign-teacher
  Auth: requireAdminApiContext + same-origin
  Body: { teacherId: uuid }
  Verify: teacher not already in a school (if so: error teacher_already_in_school unless force=true in body)
  Action:
    1. UPSERT school_teacher_memberships (school_id, teacher_id, role='teacher')
    2. UPDATE teacher_profiles SET school_id = schoolId WHERE id = teacherId
    3. UPDATE teacher_classes SET school_id = schoolId WHERE teacher_id = teacherId AND school_id IS NULL
    4. UPDATE classroom_activities SET school_id = schoolId WHERE teacher_id = teacherId AND school_id IS NULL
    5. UPDATE student_activities SET school_id = schoolId WHERE teacher_id = teacherId AND school_id IS NULL
  Audit: admin_audit_log action='school_teacher_assigned'

POST /api/admin/schools/[schoolId]/assign-manager
  Auth: requireAdminApiContext + same-origin
  Body: { teacherId: uuid }
  Verify: teacher must already have membership in this school (run assign-teacher first, or include in one call)
  Action: UPDATE school_teacher_memberships SET role='school_admin'
  Audit: admin_audit_log action='school_manager_assigned'

DELETE /api/admin/schools/[schoolId]/teachers/[teacherId]
  Auth: requireAdminApiContext + same-origin
  Action:
    1. DELETE school_teacher_memberships WHERE school_id AND teacher_id
    2. UPDATE teacher_profiles SET school_id = NULL WHERE id = teacherId
    (classes/activities keep their school_id for historical query access)
  Audit: admin_audit_log action='school_teacher_removed'

GET  /api/admin/schools/[schoolId]/audit-log
  Auth: requireAdminApiContext
  Returns: admin_audit_log WHERE target_id = schoolId AND target_type = 'school'
```

---

## 12. UI Pages Required

### 12.1 New School Portal Pages (`pages/school/`)

No design changes. Use `components/Layout.js` and a new `SchoolPortalShell` component (mirrors `TeacherPortalShell` pattern). Hebrew text/copy from existing translation files only. Session resolved using the same Supabase Bearer token as teacher pages.

| Route | File | Purpose |
|-------|------|---------|
| `/school/dashboard` | `pages/school/dashboard.js` | School overview: teacher cards, student count, recent activities |
| `/school/teachers` | `pages/school/teachers/index.js` | List of teachers in school with subject badges |
| `/school/teachers/[teacherId]` | `pages/school/teachers/[teacherId].js` | Teacher profile: classes, subjects, student list, subject permission manager |
| `/school/classes` | `pages/school/classes/index.js` | All classes in school; filter by teacher/subject/grade |
| `/school/classes/[classId]` | `pages/school/classes/[classId].js` | Class detail (reuse existing class report viewer) |
| `/school/students` | `pages/school/students/index.js` | All enrolled students; enroll/unenroll; which teachers each is linked to |
| `/school/students/[studentId]` | `pages/school/students/[studentId].js` | Student report (full, no subject filter) |

### 12.2 New Admin Pages for Schools (`pages/admin/schools/`)

| Route | File | Purpose |
|-------|------|---------|
| `/admin/schools` | `pages/admin/schools/index.js` | List all schools; create school button |
| `/admin/schools/[schoolId]` | `pages/admin/schools/[schoolId].js` | School detail: assign teachers, promote manager, deactivate, audit log |

### 12.3 Modified Existing Pages

| Page | Change |
|------|--------|
| `pages/teacher/login.js` | Post-login: if `schoolMembership.isSchoolManager` → redirect `/school/dashboard`; else existing behavior |
| `pages/teacher/dashboard.js` | If `me.schoolMembership?.isSchoolManager` → show "School Management" nav link in shell |
| `pages/admin/teachers/index.js` | Add "School" column showing which school each teacher belongs to |
| `pages/admin/teachers/[teacherId].js` | Add "School" section: current school, assign to school link, remove from school button |

### 12.4 New Client Library Files

| File | Purpose |
|------|---------|
| `lib/school-portal/use-school-portal-session.js` | `useSchoolPortalLoad`, `schoolAuthFetch` (same Bearer token as teacher) |
| `components/school-portal/SchoolPortalShell.jsx` | Shell wrapper; includes "My Teacher Dashboard" link for dual-role users |
| `components/school-portal/SchoolTeacherCard.jsx` | Teacher card with subject permission badges |
| `components/school-portal/SchoolStudentTable.jsx` | Enrolled student list with linked teachers column |
| `components/school-portal/SubjectPermissionManager.jsx` | Add/remove subject permissions (inline in teacher detail page) |
| `components/admin/SchoolAdminTable.jsx` | School list for admin page |
| `components/admin/SchoolAssignForm.jsx` | Assign teacher/manager form on school detail page |

---

## 13. Migration 027 Proposal

**Status:** DRAFT — do not apply until owner explicitly approves and runs manually.  
**Depends on:** 026 (all previous migrations applied).

### 13.1 Migration File: `supabase/migrations/027_school_managed_portal.sql`

```sql
-- 027_school_managed_portal.sql
-- School Managed Portal — schema additions
-- Requires: 025_teacher_quotas_admin (school_accounts, school_teacher_memberships)
-- Apply: manual by owner only. DO NOT run via CI or automated tooling.

BEGIN;

-- ============================================================
-- SECTION 1: Extend school_accounts
-- ============================================================

ALTER TABLE public.school_accounts
  ADD COLUMN IF NOT EXISTS contact_email text
    CHECK (contact_email IS NULL OR contact_email ~* '^[^@]+@[^@]+\.[^@]+$'),
  ADD COLUMN IF NOT EXISTS city text
    CHECK (city IS NULL OR char_length(trim(city)) BETWEEN 1 AND 100),
  ADD COLUMN IF NOT EXISTS max_teachers integer
    CHECK (max_teachers IS NULL OR max_teachers >= 1);

-- ============================================================
-- SECTION 2: Extend school_teacher_memberships
-- ============================================================

ALTER TABLE public.school_teacher_memberships
  ADD COLUMN IF NOT EXISTS subjects_locked boolean NOT NULL DEFAULT false;

-- ============================================================
-- SECTION 3: New table — school_teacher_subjects
-- ============================================================

CREATE TABLE IF NOT EXISTS public.school_teacher_subjects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL
    REFERENCES public.school_accounts(id) ON DELETE CASCADE,
  teacher_id  uuid NOT NULL
    REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  subject     text NOT NULL
    CHECK (char_length(trim(subject)) BETWEEN 1 AND 64),
  grade_level text
    CHECK (grade_level IS NULL OR char_length(trim(grade_level)) BETWEEN 1 AND 32),
  granted_by  uuid NOT NULL
    REFERENCES public.teacher_profiles(id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, teacher_id, subject, grade_level)
);

CREATE INDEX IF NOT EXISTS school_teacher_subjects_teacher_idx
  ON public.school_teacher_subjects (school_id, teacher_id);

ALTER TABLE public.school_teacher_subjects ENABLE ROW LEVEL SECURITY;
-- No authenticated client policies; service-role only.

-- ============================================================
-- SECTION 4: New table — school_student_enrollments
-- (Manager visibility only; does not affect teacher_students)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.school_student_enrollments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid NOT NULL
    REFERENCES public.school_accounts(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL
    REFERENCES public.students(id) ON DELETE CASCADE,
  enrolled_by  uuid
    REFERENCES public.teacher_profiles(id) ON DELETE SET NULL,
  enrolled_at  timestamptz NOT NULL DEFAULT now(),
  unenrolled_at timestamptz,
  notes        text
    CHECK (notes IS NULL OR char_length(trim(notes)) <= 500)
);

CREATE UNIQUE INDEX IF NOT EXISTS school_student_enrollments_active_uq
  ON public.school_student_enrollments (school_id, student_id)
  WHERE unenrolled_at IS NULL;

CREATE INDEX IF NOT EXISTS school_student_enrollments_school_idx
  ON public.school_student_enrollments (school_id)
  WHERE unenrolled_at IS NULL;

CREATE INDEX IF NOT EXISTS school_student_enrollments_student_idx
  ON public.school_student_enrollments (student_id)
  WHERE unenrolled_at IS NULL;

ALTER TABLE public.school_student_enrollments ENABLE ROW LEVEL SECURITY;
-- No authenticated client policies; service-role only.

-- ============================================================
-- SECTION 5: Add school_id FK to teacher_classes (query convenience)
-- ============================================================

ALTER TABLE public.teacher_classes
  ADD COLUMN IF NOT EXISTS school_id uuid
    REFERENCES public.school_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS teacher_classes_school_id_idx
  ON public.teacher_classes (school_id)
  WHERE school_id IS NOT NULL;

-- Backfill: private teachers remain NULL
UPDATE public.teacher_classes tc
  SET school_id = tp.school_id
  FROM public.teacher_profiles tp
  WHERE tc.teacher_id = tp.id
    AND tp.school_id IS NOT NULL
    AND tc.school_id IS NULL;

-- ============================================================
-- SECTION 6: Add school_id FK to classroom_activities
-- ============================================================

ALTER TABLE public.classroom_activities
  ADD COLUMN IF NOT EXISTS school_id uuid
    REFERENCES public.school_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS classroom_activities_school_id_idx
  ON public.classroom_activities (school_id)
  WHERE school_id IS NOT NULL;

UPDATE public.classroom_activities ca
  SET school_id = tp.school_id
  FROM public.teacher_profiles tp
  WHERE ca.teacher_id = tp.id
    AND tp.school_id IS NOT NULL
    AND ca.school_id IS NULL;

-- ============================================================
-- SECTION 7: Add school_id FK to student_activities
-- ============================================================

ALTER TABLE public.student_activities
  ADD COLUMN IF NOT EXISTS school_id uuid
    REFERENCES public.school_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS student_activities_school_id_idx
  ON public.student_activities (school_id)
  WHERE school_id IS NOT NULL;

UPDATE public.student_activities sa
  SET school_id = tp.school_id
  FROM public.teacher_profiles tp
  WHERE sa.teacher_id = tp.id
    AND tp.school_id IS NOT NULL
    AND sa.school_id IS NULL;

-- ============================================================
-- SECTION 8: Extend admin_audit_log target_type for schools
-- ============================================================

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_target_type_check;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_target_type_check
    CHECK (target_type IN ('teacher', 'school'));

-- ============================================================
-- SECTION 9: Extend teacher_access_audit action CHECK
-- (School manager actions audited here using teacher_id of the manager)
-- ============================================================

ALTER TABLE public.teacher_access_audit
  DROP CONSTRAINT IF EXISTS teacher_access_audit_action_check,
  DROP CONSTRAINT IF EXISTS teacher_access_audit_action_chk;

ALTER TABLE public.teacher_access_audit
  ADD CONSTRAINT teacher_access_audit_action_chk CHECK (action IN (
    'grant_created','grant_revoked','grant_expired',
    'pin_rotated','username_rotated',
    'magic_link_sent','magic_link_consumed','magic_link_expired',
    'guardian_login_success','guardian_login_failed','guardian_logout',
    'teacher_link_created','teacher_link_archived',
    'teacher_onboarded',
    'class_created','class_archived','class_updated',
    'class_member_added','class_member_removed',
    'viewed_student_report','viewed_class_report',
    'link_created','link_archived','link_consent_failed','link_limit_reached',
    'consent_issued','consent_revoked',
    'magic_link_issued',
    'student_created_by_teacher','student_name_updated',
    'activity_created','activity_activated','activity_paused',
    'activity_closed','activity_archived',
    -- School manager actions (teacher_id = the manager performing the action)
    'school_subject_granted','school_subject_revoked',
    'school_student_enrolled','school_student_unenrolled',
    'school_class_viewed','school_student_report_viewed'
  ));

COMMIT;
```

### 13.2 Post-Apply Checklist (owner manual steps)

1. `SELECT COUNT(*) FROM teacher_classes WHERE school_id IS NOT NULL;` — compare to count of `teacher_profiles WHERE school_id IS NOT NULL`.
2. `SELECT COUNT(*) FROM school_teacher_subjects;` — expect 0 (correct, no seed data).
3. `SELECT COUNT(*) FROM school_student_enrollments;` — expect 0 (correct).
4. `\d school_accounts` in psql — verify new columns present.
5. Test existing teacher session: `GET /api/teacher/me` — no errors, existing fields intact.
6. Verify `admin_audit_log` existing rows have `target_type = 'teacher'` — no constraint violation.
7. Confirm `teacher_access_audit` CHECK allows all previously-used action values.

---

## 14. Security and IDOR Test Plan

### 14.1 Cross-School IDOR Tests

| Test Case | Expected Result |
|-----------|----------------|
| School manager A calls `GET /api/school/teachers` | Returns only school A teachers; schoolId from server context, not request |
| School manager A calls `GET /api/school/classes/[classId]` where classId belongs to school B | 403 `class_not_in_school` |
| School manager A calls `GET /api/school/students/[studentId]/report-data` where student enrolled only in school B | 403 `student_not_enrolled_in_school` |
| School manager A calls `DELETE /api/school/teachers/[teacherId]/subjects/[subjectId]` where subjectId is for school B | 403 `subject_not_in_school` |
| School manager A calls `GET /api/admin/schools` | 403 `not_an_admin` |

### 14.2 Teacher-to-School Boundary Tests

| Test Case | Expected Result |
|-----------|----------------|
| School teacher (not manager) calls `GET /api/school/dashboard` | 403 `not_a_school_manager` |
| School teacher with subjects `[math]` creates activity with `subject = "math"` | 200 OK |
| School teacher with subjects `[math]` creates activity with `subject = "english"` | 403 `subject_not_permitted` |
| School teacher with subjects `[math]` calls student report-data | Response contains only math sections; English/Hebrew sections absent |
| School teacher with subjects `[math]` calls class report for a math class | 200 OK with math data |
| School teacher with subjects `[math]` calls class report for an English class | 403 `subject_not_permitted_for_class` |
| Private teacher (no membership row) calls `POST /api/teacher/activities` any subject | 200 OK; no restriction |
| School teacher calls `GET /api/teacher/classes` | Only their own classes; unchanged |

### 14.3 Enrollment ≠ Visibility Tests

| Test Case | Expected Result |
|-----------|----------------|
| School manager enrolls student S in school A | Student S does NOT appear in any school teacher's dashboard |
| Teacher T in school A has no `teacher_students` row for student S | Teacher T's `GET /api/teacher/dashboard` does not show student S |
| Teacher T1 links student S; Teacher T2 is in same school | T2 does not see student S unless T2 also links student S |
| School manager's `GET /api/school/students` | Shows S (enrolled); shows T1 as linked teacher for S |

### 14.4 Admin IDOR Tests

| Test Case | Expected Result |
|-----------|----------------|
| Owner admin calls `GET /api/admin/schools` | 200 all schools |
| Teacher (any kind) calls `GET /api/admin/schools` | 403 `not_an_admin` |
| Owner admin assigns teacher already in school A to school B without force=true | 409 `teacher_already_in_school` |
| Owner admin assigns teacher already in school A to school B with force=true | Succeeds; old membership replaced; old school_id overwritten |

### 14.5 Membership Source of Truth Tests

| Test Case | Expected Result |
|-----------|----------------|
| Teacher has `teacher_profiles.school_id` set but no `school_teacher_memberships` row | Treated as private teacher; no subject restriction; cannot access school portal |
| Teacher removed from school (membership deleted) but `teacher_profiles.school_id` not yet cleared | Still treated as private teacher; server uses membership only |
| School manager creates activity | `loadTeacherSchoolMembership` returns `role=school_admin` → no subject restriction |

### 14.6 Dual-Role Tests

| Test Case | Expected Result |
|-----------|----------------|
| Dual-role user (manager + active teacher) logs in | Redirected to `/school/dashboard` |
| Same user navigates to `/teacher/dashboard` via nav link | Loads teacher dashboard with their own classes only |
| Same user calls `POST /api/teacher/activities` | No subject restriction (manager role bypasses check) |
| Same user calls `GET /api/school/teachers` | Returns school teachers (school manager context) |

### 14.7 Audit Completeness Tests

| Action | Expected Audit Row |
|--------|-------------------|
| Admin creates school | `admin_audit_log` target_type='school' action='school_created' |
| Admin assigns teacher to school | `admin_audit_log` action='school_teacher_assigned' |
| Admin promotes to manager | `admin_audit_log` action='school_manager_assigned' |
| School manager grants subject permission | `teacher_access_audit` teacher_id=manager action='school_subject_granted' |
| School manager enrolls student | `teacher_access_audit` action='school_student_enrolled' |
| School manager views student report | `teacher_access_audit` action='school_student_report_viewed' |

---

## 15. Regression Test Plan

### 15.1 Private Teacher Regression (Must Not Break)

| Scenario | Verify |
|---------|--------|
| Private teacher logs in | Redirects to `/teacher/dashboard`; `schoolMembership = null` in `/api/teacher/me` |
| Private teacher creates classroom activity for any subject | 200 OK; no subject permission check runs |
| Private teacher creates individual student activity for any subject | 200 OK |
| Private teacher's student report | Full report, no subject filter applied |
| Private teacher's class report | Full report, no subject filter applied |
| Private teacher's parent report preview | Unchanged |
| Private teacher links/unlinks student | Unchanged |
| Private teacher's access prefix | Unchanged |
| Private teacher's feature flags | Unchanged |
| Private teacher's quota | Unchanged |

### 15.2 Parent/Guardian Regression (Must Not Break)

| Scenario | Verify |
|---------|--------|
| Parent login, dashboard, child report, rewards | All unchanged |
| Guardian login, view | Unchanged |
| Parent messaging via teacher | Unchanged |

### 15.3 Student Regression (Must Not Break)

| Scenario | Verify |
|---------|--------|
| Student login via access code | Unchanged |
| Student home page, activity flow, arcade, games | Unchanged |
| `learning_sessions` data | Unchanged |

### 15.4 Admin Regression (Must Not Break)

| Scenario | Verify |
|---------|--------|
| Owner admin login → `/admin/teachers` | Unchanged |
| Admin teacher list, teacher detail, quota edit, feature flags | Unchanged |
| `admin_audit_log` existing rows (target_type='teacher') | No constraint violation; still valid |
| `teacher_access_audit` existing action values | All pass new CHECK constraint |

### 15.5 Multi-Teacher Student Regression

| Scenario | Verify |
|---------|--------|
| Student linked to Teacher A and Teacher B | Both see student in their dashboards independently |
| Teacher A archives link | Teacher B's link unaffected |
| Teacher A creates individual activity | Teacher B cannot see it (scoped to Teacher A) |
| School manager enrolls student already linked to two teachers | Enrollment INSERT succeeds; both teacher links remain; neither teacher gains new visibility from enrollment |

### 15.6 Migration 027 Apply Regression

| Check | Verify |
|-------|--------|
| `teacher_classes` backfill counts | Match `teacher_profiles WHERE school_id IS NOT NULL` |
| Private teacher `classroom_activities` rows | `school_id = NULL` confirmed |
| `teacher_access_audit` constraint | All pre-existing action values still pass |
| `admin_audit_log` constraint | All pre-existing target_type='teacher' rows still pass |

---

## 16. Final Execution Rules and Owner Manual Gates

This section is the authoritative contract between the owner and the implementing agent. It takes precedence over any implicit assumptions or general agent behavior. It must be read and followed in full before any implementation begins.

---

### 16.1 Intent

This plan is intended to be implemented through to a **finished, production-ready School Managed Portal product** after final owner approval. The goal is a complete feature, not a skeleton — all phases in the roadmap are in scope unless the owner explicitly descopes one.

---

### 16.2 Continuous Implementation After Approval

Once the owner gives final implementation approval:

- The agent may implement all approved phases sequentially, without stopping between phases to ask for new architecture approval.
- The agent does not need to re-present the plan or ask permission to start the next phase after one phase completes.
- The agent should proceed phase-by-phase autonomously until the product is finished, stopping only for the mandatory gates listed in Section 16.3 or if a genuine blocker, ambiguity, failed test, or owner-only action is encountered.
- If a blocker, unexpected failure, or design ambiguity arises mid-implementation, the agent must stop, explain the issue clearly, and wait for owner direction before continuing.

---

### 16.3 Mandatory Stops (Owner Gates)

These are the only situations where the agent must stop and wait for the owner to act or confirm:

| Gate | What happens | Owner action required |
|------|-------------|----------------------|
| **SQL migration gate** | Agent creates `supabase/migrations/027_school_managed_portal.sql` and stops immediately | Owner reviews SQL, runs it manually in Supabase, confirms success |
| **Post-SQL confirmation** | Agent resumes only after owner explicitly confirms "SQL applied" | Owner says confirmed; agent continues from Phase 1 |
| **Commit/push gate** | Agent never commits or pushes to git | Owner must explicitly request each commit or push |
| **Blocker/ambiguity gate** | Unexpected test failure, design conflict, or unclear requirement | Owner provides direction; agent resumes |

There are **no other mandatory stops** between phases once the SQL gate is cleared and implementation is approved.

---

### 16.4 Migration 027 — Creation and Handoff

The agent creates the migration file at:

```
supabase/migrations/027_school_managed_portal.sql
```

When this file is created, the agent must immediately stop and provide:

1. **Migration file path** — absolute path to the created SQL file
2. **SQL summary** — plain-language description of every change made (tables created, tables altered, columns added, indexes, triggers, backfills)
3. **Manual Supabase execution instructions** — step-by-step instructions for the owner to apply the migration (e.g., paste into Supabase SQL Editor, or use `supabase db push` with appropriate flags)
4. **Verification and backfill checks** — specific SQL queries the owner must run after applying, to confirm backfill counts and constraint integrity
5. **Rollback note** — description of what a manual rollback would require if anything goes wrong (since there is no automated rollback)

The agent must **not** run SQL against any database, including local or staging environments, unless explicitly told to do so by the owner.

---

### 16.5 No Commit or Push Without Explicit Approval

The agent must not run `git commit`, `git push`, or any equivalent operation at any point during implementation. Every commit must be explicitly requested by the owner and described (message, files to stage) before the agent creates it.

---

### 16.6 Hebrew and RTL Requirements

These rules apply to every file touched or created during implementation:

- **The entire site is Hebrew and RTL.** This is not optional or configurable per-page.
- Every new school portal page (`/school/*`) and admin school page (`/admin/schools/*`) must be fully Hebrew and RTL — all labels, headings, error messages, button text, empty states, and help text.
- Hebrew copy must match the style and vocabulary of existing pages (e.g., `pages/teacher/dashboard.js`, `pages/parent/dashboard.js`). Consult existing Hebrew strings before writing new ones.
- **Existing Hebrew copy must not be modified** unless the owner explicitly approves a specific change.
- RTL layout must be applied to all new UI components (`dir="rtl"` on containers, or CSS `direction: rtl` consistent with the existing pattern in the codebase). Do not introduce LTR layout for any school page.
- Do not add new languages, language-switching logic, or i18n libraries.

---

### 16.7 Design Language Requirements

- The existing visual design language (colors, typography, spacing, component patterns) must be preserved across all new pages.
- New pages must use `components/Layout.js` as the root layout wrapper, consistent with all existing pages.
- `SchoolPortalShell` and `AdminShell` must follow the same structural pattern as `TeacherPortalShell` and `AdminShell` respectively.
- No new CSS frameworks, UI libraries, or design systems may be introduced.
- No changes to `styles/globals.css` unless strictly required and scoped to school pages only.

---

### 16.8 Scope Boundaries — What Must Not Change

The following must remain completely unchanged by this implementation:

| Area | Rule |
|------|------|
| Parent behavior | Parent login, dashboard, reports, messaging, guardian access — no changes to any parent-facing feature or API |
| Student behavior | Student login, home, activities, arcade, games — no changes unless explicitly approved for "school activity visibility" per Section 16.9 |
| Private teachers | All private teacher flows (login, dashboard, classes, students, activities, reports, access codes) must work identically after implementation |
| Owner admin at `/admin` | Existing admin pages and APIs must remain unchanged; new school management is additive |
| RLS model | All new DB tables use service-role only; no new client-facing RLS policies |
| Supabase Auth roles | No new `app_metadata.role` values; school roles are DB-only |

---

### 16.9 Student Behavior — Permitted Exception

Students may be shown contextual information about which activity was assigned by a school teacher vs. a personal/private teacher, or whether an activity belongs to a school class vs. a private class. This is display-only — the student's learning flow, login, session, arcade, and games must not change. Any student-facing display changes in this area require explicit owner approval before implementation.

---

### 16.10 Permission Enforcement Rules

These rules are non-negotiable and must be followed in every API handler:

- **UI hiding is not sufficient.** Every API that serves data or performs a mutation must return `403` when the caller does not have permission, regardless of whether the UI hides the button or link.
- Subject permissions must be enforced server-side at the API layer on **all** of: activity creation (classroom and individual), student report, class report, weak topics, recommendations, activity history, individual activity history, and teacher-side parent report preview.
- School manager APIs must derive `schoolId` from `requireSchoolManagerApiContext` (the server-side membership lookup) — never from request query params or body.
- `school_teacher_memberships` is the sole authorization source. `teacher_profiles.school_id` must never be used as a security gate.
- A private teacher (no `school_teacher_memberships` row) must never be affected by any school permission check.

---

### 16.11 Role Scoping Rules

| Role | Scope |
|------|-------|
| Owner admin | Global. Can create/manage any school. Can manage any teacher. Cannot access school portal pages. |
| School manager | Their school only. Can view all teachers, classes, students enrolled in their school. Cannot manage teacher quotas or accounts (owner admin only). |
| School teacher | Their own classes and linked students only. Subject-restricted. Cannot see other teachers' students or classes. |
| Private teacher | Exactly as before. Zero school checks. |

---

### 16.12 Audit Logging Rule

Every management action introduced in a phase must write its audit log entry in the same phase. Audit logging is not deferred to a later or hardening phase. The implementation agent must not mark a phase complete if any action in that phase is missing its audit write.

---

### 16.13 Final Delivery Report

When all phases are complete, the agent must produce a final delivery report containing all of the following:

1. **Files changed** — complete list of every file created or modified, with a one-line description of the change
2. **SQL created** — filename and summary of every migration file written
3. **Manual SQL instructions** — reminder of which SQL files the owner must apply and in what order
4. **Tests run** — which test cases from the Security/IDOR test plan (Section 14) and regression test plan (Section 15) were verified, and the outcome of each
5. **Security/IDOR checks** — explicit confirmation that each IDOR scenario in Section 14 was tested and passed
6. **Regression checks** — explicit confirmation that each regression scenario in Section 15 was verified and passed
7. **Hebrew/RTL confirmation** — explicit statement that all new pages are Hebrew and RTL, with the list of pages verified
8. **Remaining limitations** — any known gaps, deferred items, or edge cases that were not resolved, clearly described so the owner knows what is and is not in the delivered product

---

## 17. Phased Implementation Roadmap

> **Execution note:** After the owner confirms implementation approval and after the SQL gate in Phase 0 is cleared (owner confirms migration applied), the agent proceeds through Phase 1 → Phase 7 continuously without stopping for new architecture approvals. The only stops are the mandatory owner gates defined in Section 16.3. See Section 16.2 for the full continuous-implementation rule.

### Phase 0 — Migration (Owner Action Required — Mandatory SQL Gate)

- Agent creates `supabase/migrations/027_school_managed_portal.sql`
- Agent stops and delivers: file path, SQL summary, manual execution instructions, verification checks, rollback note (per Section 16.4)
- **Owner reviews SQL, applies it manually in Supabase, confirms success**
- Agent resumes at Phase 1 only after owner confirmation

**Deliverable:** Schema ready. No school data exists yet. No application code deployed.

---

### Phase 1 — Owner Admin School Management

**Why first:** Without the ability to create a school and assign a school manager, the school portal cannot be tested or used at all. This is foundational infrastructure.

**Goal:** Owner admin can create schools, view them, assign teachers, promote a manager, remove a teacher, and view school audit logs — all with audit logging from day one.

**Scope:**
- `lib/admin-server/admin-schools.server.js` — all school management functions
- `GET /api/admin/schools`
- `POST /api/admin/schools` — with `admin_audit_log` entry `school_created`
- `GET /api/admin/schools/[schoolId]` — school detail with teacher list
- `PATCH /api/admin/schools/[schoolId]` — with `admin_audit_log` entry `school_updated`
- `POST /api/admin/schools/[schoolId]/assign-teacher` — writes membership + denormalized school_id + backfills classes/activities; with audit `school_teacher_assigned`
- `POST /api/admin/schools/[schoolId]/assign-manager` — promotes to `school_admin`; with audit `school_manager_assigned`
- `DELETE /api/admin/schools/[schoolId]/teachers/[teacherId]` — removes membership, clears school_id; with audit `school_teacher_removed`
- `GET /api/admin/schools/[schoolId]/audit-log`
- `pages/admin/schools/index.js` — school list + create button
- `pages/admin/schools/[schoolId].js` — school detail with teacher/manager management
- `components/admin/SchoolAdminTable.jsx`
- `components/admin/SchoolAssignForm.jsx`
- Modify `pages/admin/teachers/index.js` — add school column
- Modify `pages/admin/teachers/[teacherId].js` — add school section with assign/remove buttons

**Audit:** All write operations produce `admin_audit_log` rows in this phase.

**Testing:** Admin IDOR tests (14.4); admin regression (15.4); verify audit rows for each action.

---

### Phase 2 — School Manager Auth + School Dashboard

**Why after Phase 1:** Phase 1 creates the school and assigns the manager. Phase 2 lets the manager log in.

**Goal:** School manager can log in via `/teacher/login` and see a read-only school dashboard.

**Scope:**
- `lib/school-server/school-membership.server.js` — `loadTeacherSchoolMembership` (the single guard)
- `lib/school-server/school-request.server.js` — `requireSchoolManagerApiContext`
- `lib/school-server/school-session.server.js` — school profile loader
- `GET /api/school/me`
- `GET /api/school/dashboard`
- `lib/school-portal/use-school-portal-session.js`
- `components/school-portal/SchoolPortalShell.jsx` — with "My Teacher Dashboard" link for dual-role
- `pages/school/dashboard.js`
- Modify `GET /api/teacher/me` — add `schoolMembership` field (sourced from `school_teacher_memberships`, not `teacher_profiles.school_id`)
- Modify `pages/teacher/login.js` — post-login routing for school managers
- Modify `pages/teacher/dashboard.js` — add "School Management" nav link for dual-role users

**Audit:** School manager login is not audited separately (Supabase Auth handles auth logging). Dashboard access is read-only; no audit entry.

**Testing:** School manager login flow; dual-role navigation (14.6); private teacher login unaffected (15.1); membership-as-source-of-truth tests (14.5).

---

### Phase 3 — School Teachers and Subject Permissions (Including Report Enforcement)

**Goal:** School manager can view teachers, manage subject permissions. Subject permissions are enforced on activity creation AND all report endpoints for school teachers.

**Scope:**
- `lib/school-server/school-teachers.server.js`
- `lib/school-server/school-subjects.server.js` — all functions including `loadTeacherPermittedSubjects` and `filterReportByPermittedSubjects`
- `GET /api/school/teachers`, `GET /api/school/teachers/[teacherId]`
- `GET /api/school/teachers/[teacherId]/subjects`, `POST`, `DELETE` — each with `teacher_access_audit` entry
- `pages/school/teachers/index.js`, `pages/school/teachers/[teacherId].js`
- `components/school-portal/SchoolTeacherCard.jsx`
- `components/school-portal/SubjectPermissionManager.jsx`
- Modify `POST /api/teacher/activities` — membership guard + subject permission check
- Modify `POST /api/teacher/student-activities` — same
- Modify `GET /api/teacher/students/[studentId]/report-data` — subject filter
- Modify `GET /api/teacher/students/[studentId]/parent-report-data` — subject filter
- Modify `GET /api/teacher/classes/[classId]/report-data` — class subject_focus check + filter
- Modify `GET /api/teacher/dashboard` — add `schoolContext` to response

**Audit:** `school_subject_granted` and `school_subject_revoked` written in this phase.

**Testing:** All tests in 14.2; subject permission report enforcement (14.2 rows 4–6); private teacher bypass (15.1); dual-role subject bypass (14.6 rows 3–4); enrollment ≠ visibility confirmed still intact (14.3).

---

### Phase 4 — School Classes and Reports (Manager View)

**Goal:** School manager can view all classes in the school and their reports.

**Scope:**
- `lib/school-server/school-classes.server.js`
- `GET /api/school/classes`, `GET /api/school/classes/[classId]/report-data`
- `pages/school/classes/index.js`, `pages/school/classes/[classId].js`
- Reuse `buildTeacherClassReportPayload` from `lib/teacher-server/teacher-class-report.server.js` (no subject filter applied for manager)

**Audit:** `school_class_viewed` written on each class report view.

**Testing:** Cross-school IDOR (14.1 rows 2); class report regression for private teachers (15.1 row 5).

---

### Phase 5 — School Students and Student Reports (Manager View)

**Goal:** School manager can enroll students, view enrolled student list, and view full student reports.

**Scope:**
- `lib/school-server/school-students.server.js`
- `GET /api/school/students`, `POST /api/school/students`, `DELETE /api/school/students/[studentId]/enrollment`
- `GET /api/school/students/[studentId]/report-data`
- `pages/school/students/index.js`, `pages/school/students/[studentId].js`
- `components/school-portal/SchoolStudentTable.jsx`
- Reuse report builder from `lib/teacher-server/teacher-report.server.js` (no subject filter for manager)

**Audit:** `school_student_enrolled`, `school_student_unenrolled`, `school_student_report_viewed` written in this phase.

**Testing:** Cross-school IDOR (14.1 rows 3); enrollment ≠ visibility (14.3); multi-teacher student regression (15.5); audit completeness (14.7).

---

### Phase 6 — School Activities View

**Goal:** School manager can view all activities across the school for monitoring.

**Scope:**
- `GET /api/school/activities`
- `lib/school-server/school-reports.server.js`
- Augment `pages/school/dashboard.js` with recent activities section

**Audit:** No new audit entry for listing; individual activity reports (if added) get their own entry.

**Testing:** Cross-school IDOR; regression on classroom activity monitor for private teachers (15.1 rows 3–4).

---

### Phase 7 — Hardening and Final Validation

**Goal:** Full test matrix execution, edge cases, load verification, and final delivery report.

**Scope:**
- Full IDOR test matrix (Section 14) — all tests executed systematically
- Full regression test matrix (Section 15) — all tests executed
- School deactivation flow (`school_accounts.is_active = false` → manager 403 `school_inactive`)
- Teacher removal-from-school edge case: classes and activities retain `school_id` for historical queries; manager no longer sees the teacher
- Verify all audit log rows exist for all test actions from Phases 1–6
- Load test: school dashboard with 50+ teachers / 500+ students / 1000+ activities
- Produce final delivery report per Section 16.13

**At phase completion:** Agent delivers the full report specified in Section 16.13. Implementation is considered done. No further action without explicit owner instruction.

---

## Appendix: Key File Paths (Existing, To Be Modified)

| File | Purpose |
|------|---------|
| `lib/teacher-server/teacher-session.server.js` | Teacher auth — to extend `/api/teacher/me` with `schoolMembership` |
| `lib/teacher-server/teacher-request.server.js` | `requireTeacherApiContext` — reference for school equivalent |
| `lib/teacher-server/teacher-class-report.server.js` | Class report builder — to add class subject_focus check |
| `lib/teacher-server/teacher-report.server.js` | Student report builder — to add `filterReportByPermittedSubjects` call |
| `lib/teacher-server/teacher-activities.server.js` | Activity management — to add membership + subject guard |
| `lib/teacher-server/student-activity.server.js` | Individual activity management — same guard |
| `lib/admin-server/admin-request.server.js` | Admin auth pattern — reference for admin school APIs |
| `lib/admin-server/admin-teachers.server.js` | Admin teacher detail — to add school assignment section |
| `supabase/migrations/025_teacher_quotas_admin.sql` | School stubs origin |
| `pages/teacher/login.js` | Login — to add post-login school manager routing |
| `pages/api/teacher/me.js` | Teacher session endpoint — to add `schoolMembership` field |
| `pages/api/teacher/activities/index.js` | Activity creation — to add subject check |
| `pages/api/teacher/student-activities/index.js` | Individual activity creation — to add subject check |
| `pages/api/teacher/students/[studentId]/report-data.js` | Student report — to add subject filter |
| `pages/api/teacher/students/[studentId]/parent-report-data.js` | Parent preview — to add subject filter |
| `pages/api/teacher/classes/[classId]/report-data.js` | Class report — to add class subject_focus check |

---

*End of planning document (Revision 2, with Execution Rules). No SQL has been applied. No code has been written. Implementation begins only after the owner gives final approval. The mandatory SQL gate and all rules in Section 16 are binding throughout implementation.*
