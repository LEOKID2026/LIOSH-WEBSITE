---
name: School Student Admin Profile
overview: Add an optional administrative profile to every school student — viewable by manager, authorized secretary, and teacher; editable only by manager and authorized secretary. All fields are optional. No student requires a profile to function normally.
todos:
  - id: confirm-plan
    content: Plan approved by owner 2026-05-31. Hebrew copy approved (Section 10). Permissions approved. Teacher portal file identified — pages/teacher/student/[studentId].js
    status: completed
  - id: migration-sql
    content: Write 053_school_student_admin_profiles.sql (prepared — owner has NOT run SQL yet)
    status: completed
  - id: server-api
    content: Implement lib/school-server/school-student-profile.server.js and three API routes
    status: completed
  - id: ui-school-portal
    content: Add פרטים button to SchoolStudentCard, create SchoolStudentDetailsModal and SchoolStudentDetailsPanel, add optional details section to create form
    status: completed
  - id: ui-teacher-portal
    content: Add read-only admin profile panel to teacher portal student view (pages/teacher/student/[studentId].js)
    status: completed
  - id: tests
    content: Write __tests__/school/admin-profile.test.js — 27 tests pass (validation, merge, grant matrix, static wiring)
    status: completed
  - id: owner-run-sql
    content: Owner runs supabase/migrations/053_school_student_admin_profiles.sql manually
    status: pending
  - id: qa-checklist
    content: Execute manual QA checklist (Section 9) after SQL is applied — manager, secretary, teacher roles
    status: pending
  - id: final-review
    content: Pre-SQL review packages v1–v3 delivered; awaiting SQL + manual QA for production sign-off
    status: completed
isProject: false
---

# School Student Administrative Profile — Full Implementation Plan

## Implementation status (2026-05-31)

**Code: built and pre-SQL reviewed (v3). SQL: prepared only — not run. No commit / push / deploy.**

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 — Plan confirmation | ✅ Done | Owner approved 2026-05-31 |
| Phase 2 — SQL migration file | ✅ Written | `supabase/migrations/053_school_student_admin_profiles.sql` — **owner must run manually** |
| Phase 3 — Server / API | ✅ Done | See changed files below |
| Phase 4 — UI | ✅ Done | School portal + teacher portal |
| Phase 5 — Tests | ✅ Done | 27/27 pass; `npm run build` pass |
| Phase 6 — Manual QA | ⏳ Pending | Blocked until SQL applied (Section 9) |
| Phase 7 — Review package | ✅ Done | `review-packages/.../school-student-admin-profile-pre-sql-review-v3.zip` |

### Files created / changed

| File | Purpose |
|------|---------|
| `supabase/migrations/053_school_student_admin_profiles.sql` | New table + RLS (not executed) |
| `lib/school-server/school-student-profile.server.js` | Parse, merge, get, upsert, teacher field stripping |
| `lib/school-portal/school-student-profile-fields.js` | Shared client helpers (age, form payload) |
| `pages/api/school/students/[studentId]/admin-profile.js` | GET + PUT (school portal) |
| `pages/api/school/students/[studentId]/name.js` | PATCH student name |
| `pages/api/teacher/students/[studentId]/admin-profile.js` | GET read-only (teacher portal) |
| `lib/school-portal/school-communication.he.js` | Section 10 strings + `SC_BTN_HIDE_DETAILS` |
| `components/school-portal/SchoolStudentDetailsPanel.jsx` | Profile panel |
| `components/school-portal/SchoolStudentDetailsModal.jsx` | Modal wrapper |
| `components/school-portal/SchoolDrillDown.jsx` | "פרטים" button on `SchoolStudentCard` |
| `pages/school/students/index.js` | Modal wiring, `canViewDetails` / `canEditDetails` |
| `components/school-portal/SchoolStudentCreateForm.jsx` | Optional collapsed details on create |
| `pages/teacher/student/[studentId].js` | Read-only teacher "פרטים" modal |
| `__tests__/school/admin-profile.test.js` | Unit + static permission tests |

### Pre-SQL review fixes applied (v2 + v3)

- **Partial PUT:** Omitted keys preserve existing DB values; explicit `null` clears only the sent field; full UI form still sends all keys.
- **GET authorization (v3):** School-portal GET uses `requireSchoolStudentBrowseContext` (manager OR secretary with `student_data_viewer` **OR** `student_access_admin`). **Not** `requireSchoolDataViewerContext` — that helper only allows `student_data_viewer` and would block `student_access_admin`-only secretaries.
- **Audit log:** Name PATCH writes `actionType: "student_update"` with `metadata.operation: "student_name_updated"` (DB enum allows `student_update`, not `student_name_updated` as top-level action).
- **Teacher import fix:** `sendTeacherApiError` imported from `teacher-session.server.js` on teacher admin-profile route.

### Still pending (owner)

1. Run migration `053_school_student_admin_profiles.sql`
2. Execute Section 9 manual QA checklist in browser
3. Commit / push / deploy when satisfied

---

## 1. Current-State Investigation

### 1.1 Student storage
- Canonical student record: `public.students` (columns: `id`, `parent_id`, `full_name`, `grade_level`, `is_active`, `created_at`, `updated_at`)
- School-student linkage: `public.school_student_enrollments` (`school_id`, `student_id`, `unenrolled_at`). One active enrollment per `(school_id, student_id)` enforced by partial unique index on `unenrolled_at IS NULL`
- `school_id` is NOT on `public.students` — it lives only on the enrollment row
- **No** `school_student_profiles` or any supplementary administrative profile table exists

### 1.2 Student display name
- Source of truth: `public.students.full_name` (text NOT NULL)
- All live school portal APIs read `full_name` dynamically via `lib/school-server/school-students.server.js` — updates auto-propagate everywhere
- `school_message_recipients.recipient_display_name` is a historical send-time snapshot — intentionally immutable, acceptable not to backfill
- No other hardcoded name storage found in migrations 001–052

### 1.3 School staff and roles
- `school_teacher_memberships.role` ∈ `{teacher, school_admin, school_operator}`
  - `school_admin` = school manager (product name: "מנהל/ת")
  - `school_operator` = authorized secretary (product name: "מזכיר/ה מורשה"). Note: the DB role is named `school_operator` but in all product UI and plan language this role is called "authorized secretary"
  - `teacher` = teaching staff
- Secretary permission grants: `school_operator_grants` table — booleans `student_access_admin` and `student_data_viewer`, keyed on `(school_id, operator_user_id)`
- Manager grants these booleans to the authorized secretary via `pages/school/operators/[operatorId].js` — **no new UI needed** for grant management

### 1.4 Existing API guards (lib/school-server/school-request.server.js)

| Guard | Allows |
|-------|--------|
| `requireSchoolManagerApiContext` | `school_admin` role + `school_manager` entitlement |
| `requireSchoolDataViewerContext(schoolId)` | Manager OR operator w/ `student_data_viewer` only |
| `requireSchoolCredentialAdminContext(schoolId)` | Manager OR operator w/ `student_access_admin` |
| `requireSchoolCredentialAdminApiContext` | Same, without pre-resolved schoolId |
| `requireSchoolStudentBrowseContext` / `requireSchoolStudentBrowseApiContext` | Manager OR operator w/ `student_access_admin` **OR** `student_data_viewer` |

**Implemented:** school-portal GET `/admin-profile` uses `requireSchoolStudentBrowseContext` (either grant). PUT/PATCH use `requireSchoolCredentialAdminApiContext`.

**Important:** None of these guards accept `role = 'teacher'`. Teachers use the separate **teacher portal** (`pages/api/teacher/`) with `requireTeacherApiContext` + `teacherHasReportAccessToStudent`.

### 1.5 UI components
- `pages/school/students/index.js` — orchestrates the school portal student browse
- `components/school-portal/SchoolDrillDown.jsx` — `SchoolStudentCard` renders student cards with `onAccess` and `onReport` buttons
- `components/school-portal/SchoolReportModal.jsx` — tabbed modal with tabs: `report`, `assignment`, `access`. **Not changed** by this feature — the "פרטים" modal is separate
- `components/school-portal/SchoolStudentAccessPanel.jsx`, `SchoolStudentAssignmentPanel.jsx` — existing tab panels (model for new panel)

### 1.6 Teacher portal student access path
Teachers use `pages/api/teacher/` routes, checked via `teacherHasReportAccessToStudent` (three-path check: `teacher_students` link, `teacher_class_students`, or school-context enrollment). A **separate teacher-portal route** is needed to serve admin profile data to teachers in read-only mode.

---

## 2. Data Model

### 2.1 New table: `school_student_profiles`

Migration file to create: `supabase/migrations/053_school_student_admin_profiles.sql`

```sql
CREATE TABLE IF NOT EXISTS public.school_student_profiles (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id                 uuid        NOT NULL REFERENCES public.school_accounts(id) ON DELETE CASCADE,
  student_id                uuid        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,

  -- Parent / Guardian
  -- Note: parent1_national_id and parent2_national_id are withheld from teacher-portal API responses (server-side)
  parent1_name              text        CHECK (parent1_name IS NULL OR char_length(trim(parent1_name)) BETWEEN 1 AND 200),
  parent1_phone             text        CHECK (parent1_phone IS NULL OR char_length(trim(parent1_phone)) BETWEEN 1 AND 50),
  parent1_national_id       text        CHECK (parent1_national_id IS NULL OR char_length(trim(parent1_national_id)) BETWEEN 1 AND 30),
  parent2_name              text        CHECK (parent2_name IS NULL OR char_length(trim(parent2_name)) BETWEEN 1 AND 200),
  parent2_phone             text        CHECK (parent2_phone IS NULL OR char_length(trim(parent2_phone)) BETWEEN 1 AND 50),
  parent2_national_id       text        CHECK (parent2_national_id IS NULL OR char_length(trim(parent2_national_id)) BETWEEN 1 AND 30),
  parent_email              text        CHECK (
                                          parent_email IS NULL
                                          OR (char_length(trim(parent_email)) BETWEEN 5 AND 320
                                              AND parent_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
                                        ),

  -- Address
  address                   text        CHECK (address IS NULL OR char_length(trim(address)) BETWEEN 1 AND 500),

  -- Emergency contact
  emergency_contact_name    text        CHECK (emergency_contact_name IS NULL OR char_length(trim(emergency_contact_name)) BETWEEN 1 AND 200),
  emergency_contact_phone   text        CHECK (emergency_contact_phone IS NULL OR char_length(trim(emergency_contact_phone)) BETWEEN 1 AND 50),

  -- Administrative / logistic (visible to all authorized roles including teachers)
  transportation_notes      text        CHECK (transportation_notes IS NULL OR char_length(trim(transportation_notes)) <= 1000),
  internal_notes            text        CHECK (internal_notes IS NULL OR char_length(trim(internal_notes)) <= 2000),

  -- Date, age, and medical data (visible to all authorized roles including teachers)
  date_of_birth             date,
  -- child_age_years is a fallback for when only an approximate age is known without a full birth date.
  -- When date_of_birth is set, the UI displays the computed age and hides this manual field.
  -- When date_of_birth is null, the UI shows child_age_years as an editable number.
  child_age_years           smallint    CHECK (child_age_years IS NULL OR (child_age_years >= 0 AND child_age_years <= 30)),
  medical_allergy_notes     text        CHECK (medical_allergy_notes IS NULL OR char_length(trim(medical_allergy_notes)) <= 2000),

  -- Audit
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  updated_by                uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

-- One profile per student per school
CREATE UNIQUE INDEX school_student_profiles_school_student_uidx
  ON public.school_student_profiles (school_id, student_id);

-- Quick reverse lookup from student_id
CREATE INDEX school_student_profiles_student_idx
  ON public.school_student_profiles (student_id);

-- RLS enabled, no client policies — service role only (matches all other school tables)
ALTER TABLE public.school_student_profiles ENABLE ROW LEVEL SECURITY;
```

### 2.1a Existing schema — no new columns needed for grade/class

- **Grade level**: `public.students.grade_level` (text, optional) already exists in the canonical `students` table. The student create form already accepts it. No new column is added.
- **Physical class assignment**: Handled by the existing enrollment + `teacher_class_students` system. No new column is added.
- **Enrollment notes**: `school_student_enrollments.notes` (text, optional) already exists. The student create form's "notes" field maps here. This is NOT the same as `internal_notes` in `school_student_profiles` — they are separate fields for different purposes.

### 2.2 Field protection model

Every field in `school_student_profiles` is treated as protected school administrative data. No field is considered public or low-sensitivity. Authorization is required to read or write any field.

Most fields are readable by all three authorized roles. The two national ID fields (`parent1_national_id` and `parent2_national_id`) are an exception: they are **withheld from teachers server-side**. There is no special permission for national IDs — they follow the manager/secretary model. Teachers simply never receive them.

| Role | Read standard fields | Read national ID fields | Edit fields | Edit student name |
|------|---------------------|------------------------|-------------|------------------|
| School manager | Yes | Yes | Yes | Yes |
| Authorized secretary (`student_access_admin`) | Yes | Yes | Yes | Yes |
| Authorized secretary (`student_data_viewer` only) | Yes | Yes | No | No |
| School teacher (own students only) | Yes | **No — withheld server-side** | No | No |

"Standard fields" = parent names, phones, email, address, emergency contact, transportation_notes, internal_notes, date_of_birth, child_age_years, medical_allergy_notes.

"National ID fields" = `parent1_national_id`, `parent2_national_id` — never included in the teacher-portal API response object.

**Child age rule:** If `date_of_birth` is set, the UI computes and displays the age automatically — `child_age_years` is not shown as an editable input. If `date_of_birth` is null, the UI shows `child_age_years` as an optional editable number field. Both fields are always stored and returned by the API. The age display label in the UI is "גיל הילד" (copy subject to approval).

**All fields are optional:** No field in `school_student_profiles` is required. A student profile row can be created with all nulls. A student can exist with no profile row at all.

### 2.3 updated_by behavior
- Set to `ctx.actorUserId` on every PUT/PATCH write, using service role
- Returned as `updatedBy` (user ID) + `updatedByName` (resolved from `teacher_profiles.full_name`) in GET responses for manager and authorized secretary
- Not included in the teacher-portal GET response (teachers do not need to see who last edited the record)
- Shown in the school portal UI as a footer label — use approved copy from Section 10

### 2.4 Future enhancement: per-school field display configuration
Not included in this implementation. A future version could allow a school manager to disable specific field slots in the UI (e.g. hide the date_of_birth row from the panel entirely) via a configuration stored on `school_accounts`. This is intentionally deferred because:
- Hiding a field in the UI while still returning it from the API creates a confusing security model
- For v1, the security model is kept simple and explicit: all authorized roles can read all fields
- If this feature is added later, it must also suppress the field from the API response — not just hide it client-side

---

## 3. Permission Model

### 3.1 Authorized users

Only the following identities are permitted to access any endpoint in this feature:

| Identity | How identified | Read access | Write access |
|----------|---------------|-------------|--------------|
| School manager | `school_teacher_memberships.role = 'school_admin'` + `school_manager` persona entitlement | All fields | Yes |
| Authorized secretary | `school_teacher_memberships.role = 'school_operator'` + `school_operator` entitlement + `student_data_viewer` OR `student_access_admin` grant | All fields | Only with `student_access_admin` grant |
| School teacher | `school_teacher_memberships.role = 'teacher'` + confirmed access to student via `teacherHasReportAccessToStudent` | All fields **except** `parent1_national_id` and `parent2_national_id` (withheld server-side) | **Never** |

### 3.2 Explicitly blocked identities

The following identities are rejected with 403 at the API level on every request. No data is returned. No UI workaround can bypass this because the check is server-side only.

| Identity | Why blocked |
|----------|-------------|
| Parent user (Supabase JWT with `parent` persona) | Not in the school permission model |
| Student user (student session cookie or access code) | Not in the school permission model |
| Private teacher (teacher not in `school_teacher_memberships` for this school) | Not part of this school — no relationship to the student even if they have a teacher JWT |
| Unauthenticated request | No valid token |
| School staff from a different school | `membership.schoolId !== ctx.schoolId` — blocked as `wrong_school` |
| Authorized secretary with no grants | `student_data_viewer = false` AND `student_access_admin = false` — blocked |

Detection mechanism: Every endpoint uses `resolveAuthenticatedTeacherUserId` which handles both Supabase JWT and staff-cookie authentication. After resolving the user ID, the membership row is loaded and the role is checked explicitly. A non-school-membership token (e.g. parent JWT or student session) will fail to find any row in `school_teacher_memberships` and is rejected.

### 3.3 How manager grants secretary permission
No new UI or schema is needed. The manager uses the existing operators management page (`pages/school/operators/[operatorId].js`) to toggle `student_data_viewer` (view) and `student_access_admin` (create/edit/name-edit). These existing `school_operator_grants` booleans are reused — no new grant columns are added.

### 3.4 Server-side permission check rules

**Principal rule: authorization is enforced server-side on every request, independently of what the UI shows or hides.**

**GET admin-profile (school portal route):**
1. `resolveAuthenticatedTeacherUserId` — reject if no valid token
2. Load `school_teacher_memberships` — reject if no membership row for this school
3. If `role = 'school_admin'`: assert `school_manager` entitlement → allow, return full profile including all fields
4. If `role = 'school_operator'`: assert `school_operator` entitlement + (`student_data_viewer` OR `student_access_admin`) grant → allow, return full profile including all fields
5. If `role = 'teacher'`: → 403 `not_authorized` (teachers use the separate teacher-portal route and never access this school-portal endpoint)
6. Any other value: → 403

**GET admin-profile (teacher portal route):**
1. `requireTeacherApiContext` — resolves teacher user ID; rejects parent/student/unauthenticated
2. Verify teacher has a row in `school_teacher_memberships` for the same school as the enrolled student — reject if not
3. `teacherHasReportAccessToStudent(serviceRole, teacherId, studentId)` → 403 if false
4. `verifyStudentVisibleToSchool` — confirm student is enrolled in teacher's school → 403 if not
5. Build response: return all profile fields **except** `parent1_national_id` and `parent2_national_id` — these are stripped from the response object server-side before it is constructed, not hidden client-side. Also omit `updatedBy`/`updatedByName` (audit metadata not relevant to teachers). If `parent1NationalId` or `parent2NationalId` appears in a teacher-route response, that is a security regression.

**PUT admin-profile:**
- `requireSchoolCredentialAdminApiContext` (manager OR operator w/ `student_access_admin`) — rejects all other identities including teachers, parents, students, other-school users
- `verifyStudentVisibleToSchool(serviceRole, schoolId, studentId)` → 404 if not enrolled
- Upsert on `(school_id, student_id)` unique constraint

**PATCH student name:**
- `requireSchoolCredentialAdminApiContext` — same as PUT
- `verifyStudentVisibleToSchool` → 404 if not enrolled
- `UPDATE public.students SET full_name = $1, updated_at = now() WHERE id = $2`
- Write to `school_operator_audit_log` (`actionType = 'student_update'`, `metadata.operation = 'student_name_updated'`, metadata includes old + new name, schoolId, actorUserId)

### 3.5 Cross-school isolation
Every route (both school portal and teacher portal) verifies the `(school_id, student_id)` pair exists in `school_student_enrollments` with `unenrolled_at IS NULL` and that the resolved `school_id` matches the authenticated actor's school. A school_id mismatch always returns 403 `wrong_school`. This check is performed after authentication and cannot be skipped.

### 3.6 Permission quick reference (canonical, supersedes any conflicting language elsewhere)

**No new permissions are created for this feature.** The existing `school_operator_grants` booleans — `student_access_admin` and `student_data_viewer` — are reused exactly as-is.

| Actor | View all fields | Edit profile fields | Edit student name | Receives national IDs |
|-------|----------------|---------------------|-------------------|-----------------------|
| School manager | Yes | Yes | Yes | Yes |
| Secretary with `student_access_admin` | Yes | Yes | Yes | Yes |
| Secretary with `student_data_viewer` only | Yes | No | No | Yes |
| Secretary with no grants | No (403) | No (403) | No (403) | — |
| Teacher (own students only) | Yes (see below) | No (403) | No (403) | **No — stripped server-side** |
| Parent user | No (403) | No (403) | No (403) | — |
| Student user | No (403) | No (403) | No (403) | — |
| Private teacher (not in school) | No (403) | No (403) | No (403) | — |
| Other-school user | No (403) | No (403) | No (403) | — |

**Teacher-visible fields:** student name, grade, child age, date of birth, parent names, parent phones, parent email, address, emergency contact, medical/allergy notes, transportation notes, internal notes.

**Teacher-withheld fields (stripped server-side before response is built):** `parent1_national_id`, `parent2_national_id`, `updatedBy`, `updatedByName`.

---

## 4. API Design

### 4.1 New routes

```
pages/api/school/students/[studentId]/admin-profile.js
  GET   — school portal only: manager or authorized secretary (operator w/ either grant)
          → returns all fields
  PUT   — school portal only: manager or authorized secretary w/ student_access_admin
          → all other identities → 403

pages/api/school/students/[studentId]/name.js
  PATCH — school portal only: manager or authorized secretary w/ student_access_admin
          → all other identities → 403

pages/api/teacher/students/[studentId]/admin-profile.js
  GET   — teacher portal only: school teacher w/ legitimate student access (read-only)
          → returns all profile fields EXCEPT parent1_national_id and parent2_national_id
          → includes dateOfBirth, childAgeYears, medicalAllergyNotes, all contact fields
          → national ID fields stripped server-side before the response is built
          → all other identities (parent, student, private teacher, other-school) → 403
```

The two GET routes are separate by design. There is no single endpoint that "detects" the role and returns different data. Mixing auth contexts in one handler is avoided to prevent misidentification bugs.

### 4.2 GET /api/school/students/[studentId]/admin-profile

Guard: `requireSchoolStudentBrowseContext` — manager OR operator with `student_data_viewer` **OR** `student_access_admin` (implemented v3; supersedes earlier plan note that named `requireSchoolDataViewerContext`)

Success response (profile exists):
```json
{
  "profile": {
    "parent1Name": "...", "parent1Phone": "...", "parent1NationalId": "...",
    "parent2Name": "...", "parent2Phone": "...", "parent2NationalId": "...",
    "parentEmail": "...", "address": "...",
    "emergencyContactName": "...", "emergencyContactPhone": "...",
    "transportationNotes": "...", "internalNotes": "...",
    "dateOfBirth": "2010-05-14", "childAgeYears": 14, "medicalAllergyNotes": "...",
    "updatedAt": "2026-05-31T00:00:00Z", "updatedBy": "<uuid>", "updatedByName": "..."
  },
  "isEmpty": false
}
```

Empty state response:
```json
{ "profile": null, "isEmpty": true }
```

The teacher-portal route returns the same shape **minus** `parent1NationalId`, `parent2NationalId`, `updatedBy`, and `updatedByName`.

### 4.3 PUT /api/school/students/[studentId]/admin-profile

Guard: `requireSchoolCredentialAdminApiContext`

Body (all optional, all nullable):
```json
{
  "parent1Name": "...", "parent1Phone": "...", "parent1NationalId": "...",
  "parent2Name": "...", "parent2Phone": "...", "parent2NationalId": "...",
  "parentEmail": "...", "address": "...",
  "emergencyContactName": "...", "emergencyContactPhone": "...",
  "transportationNotes": "...", "internalNotes": "...",
  "dateOfBirth": "YYYY-MM-DD", "childAgeYears": 10, "medicalAllergyNotes": "..."
}
```

Behavior: upsert. If no row exists yet, INSERT. If row exists, UPDATE only fields **present in the request body** (partial update — omitted keys preserve existing values; explicit `null` clears). Full UI form sends all keys (full replace). `updated_by` set to `ctx.actorUserId`. `updated_at` set to `now()`.

Rate limit:
```js
consumeRateLimit({
  namespace: "school_student_admin_profile_write",
  keys: [`ip:${ip}`, `actor:${ctx.actorUserId}`],
  maxAttempts: 60, windowMs: 60_000
})
```

### 4.4 PATCH /api/school/students/[studentId]/name

Guard: `requireSchoolCredentialAdminApiContext`

Body: `{ "fullName": "..." }` — required, 1–200 chars after trim

Server steps:
1. `verifyStudentVisibleToSchool` → 404 if not enrolled
2. `UPDATE public.students SET full_name = $1, updated_at = now() WHERE id = $2`
3. Write to `school_operator_audit_log` (`actionType = 'student_update'`, `metadata.operation = 'student_name_updated'`, metadata includes old + new name) — implemented to match DB enum

Rate limit:
```js
consumeRateLimit({
  namespace: "school_student_name_update",
  keys: [`ip:${ip}`, `actor:${ctx.actorUserId}`],
  maxAttempts: 20, windowMs: 60_000
})
```

### 4.5 GET /api/teacher/students/[studentId]/admin-profile

Guard chain (all steps must pass; any failure → 403 or 404, never partial data):
1. `requireTeacherApiContext` — rejects parent/student/unauthenticated/private-teacher tokens
2. Verify teacher has active `school_teacher_memberships` row for the relevant school
3. `teacherHasReportAccessToStudent` — rejects if teacher has no legitimate link to this student
4. `verifyStudentVisibleToSchool` — rejects if student not enrolled in teacher's school

Response shape: same `profile` object as the school-portal GET, but with the following fields **never present in the response object** (stripped server-side before the response is constructed — not set to null, not hidden client-side):
- `parent1NationalId`
- `parent2NationalId`
- `updatedBy`
- `updatedByName`

All other profile fields — including `dateOfBirth`, `childAgeYears`, and `medicalAllergyNotes` — are returned normally.

If `parent1NationalId` or `parent2NationalId` appears in a teacher-route response, that is a security regression.

This is a read-only endpoint — there is no PUT or PATCH on the teacher-portal route.

### 4.6 Validation summary

| Field | Rule |
|-------|------|
| parent1_name, parent2_name, emergency_contact_name | optional, trimmed, 1–200 chars if provided |
| parent1_phone, parent2_phone, emergency_contact_phone | optional, trimmed, 1–50 chars if provided |
| parent1_national_id, parent2_national_id | optional, trimmed, 1–30 chars if provided |
| parent_email | optional, must match email regex if provided |
| address | optional, trimmed, 1–500 chars if provided |
| transportation_notes, internal_notes, medical_allergy_notes | optional, max lengths per schema |
| date_of_birth | optional, valid ISO date string (YYYY-MM-DD) |
| child_age_years | optional, integer 0–30; used only when date_of_birth is not set |
| full_name (name PATCH) | required if endpoint called, 1–200 chars |

---

## 5. UI Design

### 5.1 "פרטים" button on the student card

The "פרטים" button is a visible, standalone action button added to `SchoolStudentCard` (in [`components/school-portal/SchoolDrillDown.jsx`](components/school-portal/SchoolDrillDown.jsx)).

- Added alongside the existing "דו״ח" (report) and "גישה" (access) buttons
- Existing buttons and their behavior are unchanged
- Controlled by a new `onDetails` prop (parallel to `onReport` and `onAccess`)
- Visible only when `canViewDetails` is true (manager or authorized secretary with either grant)
- `data-testid="school-student-details-{student.studentId}"`

**`SchoolReportModal.jsx` is not changed.** No new tab is added to the report modal. The "פרטים" button opens its own dedicated modal.

### 5.2 pages/school/students/index.js wiring
- Read `canViewDetails` and `canEditDetails` from the `me` object (via `lib/school-portal/operator-grants.js`)
- Pass `onDetails={canViewDetails ? () => openDetailsModal(student) : undefined}` to each `SchoolStudentCard`
- Maintain a `detailsModalStudent` state (null or the selected student) to control the modal
- No changes to browse, filtering, or report modal logic

### 5.3 New component: SchoolStudentDetailsModal

```
components/school-portal/SchoolStudentDetailsModal.jsx
```

A standalone modal that opens when the "פרטים" button is clicked. Wraps `SchoolStudentDetailsPanel` inside `ReportModalFrame`.

Props: `open`, `onClose`, `accessToken`, `authMethod`, `studentId`, `studentName`, `canEdit`, `schoolId`

### 5.4 New component: SchoolStudentDetailsPanel

```
components/school-portal/SchoolStudentDetailsPanel.jsx
```

Props: `accessToken`, `authMethod`, `studentId`, `studentName`, `canEdit`, `showAuditFooter`

- `canEdit`: true for manager and authorized secretary with `student_access_admin`. Never true for teachers.
- `showAuditFooter`: true in school portal context. Controls whether `updatedAt`/`updatedByName` footer is shown.

States and behavior:

- **Loading**: spinner while `GET admin-profile` is in flight
- **Empty state**: `SC_DETAILS_EMPTY_STATE` notice + `SC_BTN_ADD_DETAILS` button (if `canEdit`)
- **View mode**: all profile fields from API response; edit pencil button top-right if `canEdit`; age displayed as computed value if `dateOfBirth` is set, or `childAgeYears` editable field if `dateOfBirth` is null; `updatedAt`/`updatedByName` footer if `showAuditFooter`
- **Edit mode (inline)**: form fields replace value display; `SC_BTN_SAVE_DETAILS` + `SC_BTN_CANCEL_DETAILS` buttons; loading state on save; `SC_DETAILS_SAVE_ERROR` on failure; `SC_DETAILS_SAVE_SUCCESS` on success
- **Student name section** (top of panel): displays `studentName`; inline edit input + save/cancel if `canEdit` (wired to PATCH `/name`)

Field grouping in the UI — sections and labels from Section 10:

| # | Section (`SC_DETAILS_SECTION_*`) | Fields |
|---|----------------------------------|--------|
| 1 | `SC_DETAILS_SECTION_STUDENT` | `SC_DETAILS_FIELD_STUDENT_NAME`, `SC_DETAILS_FIELD_GRADE`, `SC_DETAILS_FIELD_CLASS`, `SC_DETAILS_FIELD_CHILD_AGE`, `SC_DETAILS_FIELD_DATE_OF_BIRTH` |
| 2 | `SC_DETAILS_SECTION_PARENTS` | `SC_DETAILS_FIELD_PARENT1_NAME`, `SC_DETAILS_FIELD_PARENT1_PHONE`, `SC_DETAILS_FIELD_PARENT1_NATIONAL_ID` (manager/secretary only), `SC_DETAILS_FIELD_PARENT2_NAME`, `SC_DETAILS_FIELD_PARENT2_PHONE`, `SC_DETAILS_FIELD_PARENT2_NATIONAL_ID` (manager/secretary only), `SC_DETAILS_FIELD_PARENT_EMAIL` |
| 3 | `SC_DETAILS_SECTION_ADDRESS` | `SC_DETAILS_FIELD_ADDRESS` |
| 4 | `SC_DETAILS_SECTION_EMERGENCY` | `SC_DETAILS_FIELD_EMERGENCY_NAME`, `SC_DETAILS_FIELD_EMERGENCY_PHONE` |
| 5 | `SC_DETAILS_SECTION_MEDICAL` | `SC_DETAILS_FIELD_MEDICAL_NOTES` |
| 6 | `SC_DETAILS_SECTION_TRANSPORT` | `SC_DETAILS_FIELD_TRANSPORT_NOTES` |
| 7 | `SC_DETAILS_SECTION_INTERNAL` | `SC_DETAILS_FIELD_INTERNAL_NOTES` |

`canViewNationalIds` is true for manager and authorized secretary. False for teachers (national IDs never returned by teacher route — not masked, absent from response).

All Hebrew copy is approved and listed in Section 10. No ad-hoc Hebrew strings may be added. Any string not listed in Section 10 requires separate owner approval.

### 5.5 Teacher portal ✅
Read-only panel added to **`pages/teacher/student/[studentId].js`**. It reuses `SchoolStudentDetailsPanel` with `canEdit = false` and `showAuditFooter = false`. It:
- Has no edit controls
- Has no student name edit option
- Renders all profile fields returned by `GET /api/teacher/students/[studentId]/admin-profile` — this includes date_of_birth, child_age_years, medical_allergy_notes, and all contact fields
- Does NOT render `parent1NationalId` or `parent2NationalId` — not returned by teacher route
- Shows age as computed (if dateOfBirth present) or childAgeYears
- Shows empty state gracefully when no profile exists (no add button)
- No `updatedBy` / `updatedByName` footer

### 5.6 Add-student flow: optional details section

The existing `SchoolStudentCreateForm.jsx` already accepts:
- `fullName` (required, blocks submit if empty)
- `gradeLevel` (optional)
- `physicalClassName` (optional, appears after grade is selected)
- `notes` (optional — maps to `school_student_enrollments.notes`, NOT admin profile `internal_notes`)
- `createLoginAccess` checkbox

Changes to `SchoolStudentCreateForm.jsx`:
- Add a collapsed "Optional: additional details" section below the existing fields — use `SC_BTN_ADD_DETAILS` as the expand trigger label
- When expanded, shows all admin profile fields: parent1/2 name, phone, national ID, email; address; emergency contact; date_of_birth; child_age_years; medical_allergy_notes; transportation_notes; internal_notes
- National ID fields are always shown in the create form (only manager/secretary can reach this form)
- The section starts collapsed; user expands it deliberately
- **Student creation is completely unaffected by these fields** — they are sent separately

Two-step creation flow:
1. `POST /api/school/students` — creates the student with name (+ optional grade/class/loginAccess). Called first, unchanged.
2. If any admin profile fields were filled: `PUT /api/school/students/[newStudentId]/admin-profile` — called immediately after successful creation. If this second call fails, the student is already created and a non-blocking error is shown.

This means:
- A student can always be created with name only — the profile write never blocks creation
- Profile fields can be added at any time after creation via the "פרטים" modal
- Nothing in the create form is required except `fullName`

---

## 6. Student Name Editing

### Where full_name is used (full audit)

| Location | Read or Write | Impact of UPDATE |
|----------|--------------|-----------------|
| `public.students.full_name` | Canonical source | Updated here |
| `lib/school-server/school-students.server.js` | Dynamic read | Auto-reflects change |
| All school portal API responses | Dynamic read | Auto-reflects change |
| Teacher portal API responses | Dynamic read | Auto-reflects change |
| Parent portal | Dynamic read | Auto-reflects change |
| `school_message_recipients.recipient_display_name` | Snapshot on send | Intentionally immutable — not updated |
| `student_learning_state.profile` (jsonb) | UI prefs only, not authoritative | Not affected |

### Safe update path
1. API receives `{ fullName }` — trim, validate 1–200 chars
2. `verifyStudentVisibleToSchool` — confirm student is in actor's school
3. `UPDATE public.students SET full_name = $1, updated_at = now() WHERE id = $2`
4. Append row to `school_operator_audit_log` with `actionType = 'student_update'`, `metadata.operation = 'student_name_updated'`, and metadata `{ oldName, newName, schoolId, studentId }`
5. Respond 200 `{ studentId, fullName }`

### Regression risk assessment
Low. All live reads pull from `students.full_name`. The only known non-propagating location is the historical message recipient snapshot, which is acceptable.

---

## 7. Privacy and Security

### All fields are protected school administrative data

Every field stored in `school_student_profiles` — including parent names, phone numbers, parent national IDs, parent email, address, emergency contact, internal notes, transportation notes, date of birth, and medical/allergy notes — is treated as protected school administrative data. There is no "public" or "low-sensitivity" tier among these fields. All three authorized roles must authenticate before receiving any data.

The only differences between roles are **read vs. edit** and **national ID visibility**:
- School manager: read all fields, edit all fields, edit student name
- Authorized secretary (with appropriate grant): read all fields, edit all fields (with `student_access_admin`), edit student name
- School teacher (for allowed students only): read all fields except parent national IDs, no editing of any kind

**National ID rule:** `parent1_national_id` and `parent2_national_id` are never returned in a teacher-portal API response. This is enforced server-side — the fields are stripped from the response object before it is built. There is no special permission toggle for national IDs; manager and authorized secretary can always read them; teachers never can.

### Core security rules

1. **Server-side enforcement on every request.** No authorization decision is based solely on what the UI shows or hides. Every GET, PUT, and PATCH request independently verifies the actor's identity, role, school membership, and applicable grants before any data is read or written.

2. **Blocked identities.** The following are rejected with 403 at the API layer on every request:
   - Parent users (Supabase parent JWT)
   - Student users (student session token or access code)
   - Private teachers — teachers who hold a `teacher_profiles` record but have no active row in `school_teacher_memberships` for this school
   - Authorized secretaries with no grants (`student_data_viewer = false` AND `student_access_admin = false`)
   - Any user whose `school_teacher_memberships.school_id` does not match the student's enrolled school
   - Unauthenticated requests

3. **Cross-school isolation.** Every endpoint verifies that the student is actively enrolled (`unenrolled_at IS NULL`) in the actor's school via `school_student_enrollments`. A mismatch between the actor's resolved `school_id` and the student's enrolled school returns 403 `wrong_school` regardless of any other valid credentials.

4. **No write access for teachers.** Teachers cannot call PUT `/admin-profile` or PATCH `/name`. These endpoints use `requireSchoolCredentialAdminApiContext` which explicitly rejects the `teacher` role and all non-school-portal identities.

5. **Separate routes, no role-sniffing endpoint.** The school-portal GET and teacher-portal GET are separate route files. There is no single "smart" endpoint that changes behavior based on the detected role. This eliminates the risk of a role-detection bug.

6. **No RLS client policies.** RLS is enabled on `school_student_profiles` with no `FOR authenticated` policies, consistent with all other school tables. All reads and writes go through service role with application-level permission checks.

7. **`parent1_national_id` and `parent2_national_id` are PII.** They are stored in plaintext in the database, consistent with how other PII (e.g. `full_name`, `parent_email`) is handled in this system. No additional encryption is planned in this phase. These fields are withheld from teachers at the API response layer.

### Future enhancement: per-school field display configuration
Not included in this implementation. If added in a future version, it must suppress the field from the API response as well as the UI — not hide it client-side while still returning the value from the API. See Section 2.4 for details.

---

## 8. Testing Plan

All tests use existing test infrastructure. New test file: `__tests__/school/admin-profile.test.js`

**Automated (implemented — 27 tests pass):**
- Input validation (email, DOB, age range, name parser)
- Partial merge (preserve omitted keys, explicit null clear, full-form replace)
- Profile mapping (school vs teacher field stripping)
- Child age helpers
- Secretary grant matrix: `student_data_viewer` only → GET ✓ PUT ✗; `student_access_admin` only → GET ✓ PUT ✓; both → GET ✓ PUT ✓; neither → GET ✗ PUT ✗
- Static wiring: GET uses `requireSchoolStudentBrowseContext`, PUT uses credential admin, teacher route strips national IDs, migration has no `profile_hidden_fields`

**Integration / live HTTP (Section 8 below — pending post-SQL or future test harness):**

**Student creation — name only**
- POST /api/school/students with fullName only → 200, student created, no profile row required
- Student created with name only: GET admin-profile → `{ profile: null, isEmpty: true }` 200 (no profile row is fine)
- Student created with name only: appears in student list, "פרטים" button visible, modal opens with empty state

**Student creation — with optional details**
- POST /api/school/students with fullName + gradeLevel + class → 200
- Followed by PUT admin-profile with parent/medical fields → 200, profile row created
- Second call failure does not block creation — student exists regardless

**Profile: no profile exists yet**
- Student without profile: GET (school route) → `{ profile: null, isEmpty: true }` 200
- Student without profile: GET (teacher route) → `{ profile: null, isEmpty: true }` 200

**Existing students: add/edit profile at any time**
- Existing student (pre-feature): GET admin-profile → `{ profile: null, isEmpty: true }` 200
- PUT admin-profile for existing student → 200, profile created
- Subsequent PUT → 200, profile updated (upsert)

**child_age_years field**
- PUT with dateOfBirth set + childAgeYears set: 200, both stored
- GET: both dateOfBirth and childAgeYears returned
- PUT with dateOfBirth null + childAgeYears = 10: 200, stored
- PUT with childAgeYears = -1: 400 (below 0)
- PUT with childAgeYears = 31: 400 (above 30)

**Manager**
- GET: 200, all fields returned including `parent1NationalId`, `parent2NationalId`, `dateOfBirth`, `medicalAllergyNotes`
- PUT all fields (including both national IDs): 200, row created, verify in DB
- PUT empty body (all nulls): 200, empty profile row created
- PUT partial body: 200, only provided fields updated
- PATCH name: 200, `students.full_name` updated, old name preserved in audit log

**Authorized secretary — view-only grant (`student_data_viewer` only)**
- GET (school route): 200, all fields returned
- PUT → 403
- PATCH name → 403

**Authorized secretary — edit grant (`student_access_admin`)**
- GET (school route): 200, all fields returned
- PUT → 200
- PATCH name → 200

**Authorized secretary — both grants**
- GET → 200, PUT → 200

**Authorized secretary with no grants**
- GET (school route) → 403

**School teacher with legitimate access**
- GET (teacher route) → 200
- Verify response contains `dateOfBirth` and `medicalAllergyNotes`
- Verify response does NOT contain `parent1NationalId` or `parent2NationalId` (withheld server-side)
- Verify response does NOT contain `updatedBy` or `updatedByName` (audit metadata not returned to teachers)
- PUT (school route) → 403
- PUT (teacher route does not exist) → 404
- PATCH name (school route) → 403

**School teacher without access to this student**
- GET (teacher route) → 403

**Private teacher (teacher not in this school's memberships)**
- GET (school route) → 403
- GET (teacher route) → 403 (fails school-membership check)
- PUT (school route) → 403

**Parent user (parent JWT)**
- GET (school route) → 403
- GET (teacher route) → 403
- PUT (school route) → 403

**Student user (student session token)**
- GET (school route) → 403
- GET (teacher route) → 403
- PUT (school route) → 403

**Cross-school attack**
- Valid manager/operator/teacher token from school B accessing student from school A → 403 `wrong_school` on all endpoints

**Input validation**
- Invalid studentId (not a UUID): all endpoints → 400
- Valid UUID not enrolled in actor's school: GET → 404, PUT → 404
- PUT with oversized field (e.g. internal_notes > 2000 chars) → 400
- PUT with invalid email → 400
- PUT with invalid date_of_birth format → 400
- PATCH name with empty string → 400

**Rate limiting**
- >60 write calls in 60s → 429
- >20 name-patch calls in 60s → 429

**Regression / no side effects**
- Existing learning report API unaffected
- Existing class assignment API unaffected
- Existing student account access API unaffected
- Parent portal API unchanged

---

## 9. QA / Manual Verification Checklist

> **Status: not executed.** Blocked until owner runs `053_school_student_admin_profiles.sql`. All items below remain unchecked.

### Student creation checks (manager)
- [ ] Create student with name only → succeeds
- [ ] Grade and class fields optional — form submits without them
- [ ] Optional details section collapsed by default in create form
- [ ] Expand optional details → all profile fields visible
- [ ] Fill optional details + create → profile row created, "פרטים" modal shows filled values
- [ ] Fill no optional details + create → "פרטים" modal shows empty state

### Manager — "פרטים" button and modal
- [ ] "פרטים" button visible on student card alongside existing buttons
- [ ] Existing report / access buttons unchanged and still work
- [ ] "פרטים" button opens dedicated modal (not a tab inside the report modal)
- [ ] Empty state: notice visible, add button present
- [ ] Fill all fields (including parent1/2 national IDs, date_of_birth, medical notes), save → view mode shows values
- [ ] date_of_birth set → age computed and displayed automatically; childAgeYears field hidden
- [ ] date_of_birth null → childAgeYears editable field shown
- [ ] Edit student name → saved and reflected in student card header
- [ ] `updatedAt` / `updatedByName` footer appears after first save
- [ ] Cancel button reverts form to previous state
- [ ] Loading indicator during save
- [ ] Modal can be closed and reopened — shows latest saved state

### Authorized secretary browser checks
- [ ] With `student_data_viewer` only: "פרטים" button visible, modal opens, all fields shown (including parent national IDs, date_of_birth, medical notes), no edit controls, no save button
- [ ] With `student_access_admin`: "פרטים" button visible, modal opens, can edit all fields, can save, can edit student name
- [ ] Without either grant: "פרטים" button NOT visible on student card
- [ ] Optional details section in create form visible to secretary with `student_access_admin`

### Teacher browser checks
- [ ] "פרטים" button visible in teacher portal student view (opens read-only modal)
- [ ] All allowed fields shown correctly: parent names, phones, email, address, emergency contact, date_of_birth, child age, medical notes, transportation notes, internal notes
- [ ] parent1_national_id and parent2_national_id are NOT shown anywhere in the teacher view (not present in API response — not masked, not hidden — absent)
- [ ] No edit controls visible anywhere in the modal
- [ ] No student name edit option visible
- [ ] Student outside teacher's classes: "פרטים" button not accessible / request returns 403

### API permission checks (curl / Postman)
- [ ] GET school route with manager token → 200, all fields in response
- [ ] GET school route with `student_data_viewer` authorized secretary → 200, all fields in response
- [ ] GET school route with `student_access_admin` authorized secretary → 200, all fields in response
- [ ] GET school route with no-grant authorized secretary → 403
- [ ] GET school route with teacher token → 403
- [ ] GET school route with parent JWT → 403
- [ ] GET school route with student session → 403
- [ ] GET school route with token from another school → 403
- [ ] GET teacher route with legitimate school teacher + accessible student → 200, dateOfBirth and medicalAllergyNotes present, parent1NationalId and parent2NationalId are absent from response body
- [ ] GET teacher route with legitimate school teacher + inaccessible student → 403
- [ ] GET teacher route with private teacher (not in school memberships) → 403
- [ ] GET teacher route with parent JWT → 403
- [ ] PUT with manager token → 200
- [ ] PUT with `student_access_admin` authorized secretary → 200
- [ ] PUT with `student_data_viewer`-only authorized secretary → 403
- [ ] PUT with teacher token → 403
- [ ] PUT with parent JWT → 403
- [ ] PUT with other-school token → 403
- [ ] PATCH name with manager → 200
- [ ] PATCH name with `student_access_admin` authorized secretary → 200
- [ ] PATCH name with teacher token → 403
- [ ] PATCH name with parent JWT → 403

### Regression checks
- [ ] Student list page (`/school/students`) loads normally
- [ ] Learning report tab still opens and renders
- [ ] Class assignment tab still works
- [ ] Account access tab still works
- [ ] School dashboard stats unchanged
- [ ] Teacher portal student report unchanged
- [ ] Parent portal unchanged

---

## 10. Approved Hebrew Copy

These strings are owner-approved and may be used directly in implementation. Do not modify them without explicit owner approval.

### Button labels
| Key | Hebrew |
|-----|--------|
| `SC_BTN_STUDENT_DETAILS` | `פרטים` |
| `SC_BTN_EDIT_DETAILS` | `עריכה` |
| `SC_BTN_SAVE_DETAILS` | `שמירה` |
| `SC_BTN_CANCEL_DETAILS` | `ביטול` |
| `SC_BTN_ADD_DETAILS` | `הוספת פרטים` |
| `SC_BTN_HIDE_DETAILS` | `הסתר פרטים נוספים` |
| `SC_BTN_CLOSE_DETAILS` | `סגירה` |

### Modal title
| Key | Hebrew |
|-----|--------|
| `SC_DETAILS_MODAL_TITLE` | `פרטי תלמיד` |

### Section headings
| Key | Hebrew |
|-----|--------|
| `SC_DETAILS_SECTION_STUDENT` | `פרטי תלמיד` |
| `SC_DETAILS_SECTION_PARENTS` | `פרטי הורים` |
| `SC_DETAILS_SECTION_ADDRESS` | `כתובת ויצירת קשר` |
| `SC_DETAILS_SECTION_EMERGENCY` | `איש קשר לחירום` |
| `SC_DETAILS_SECTION_MEDICAL` | `מידע רפואי ואלרגיות` |
| `SC_DETAILS_SECTION_TRANSPORT` | `הסעות והערות` |
| `SC_DETAILS_SECTION_INTERNAL` | `הערות פנימיות` |

### Field labels
| Key | Hebrew |
|-----|--------|
| `SC_DETAILS_FIELD_STUDENT_NAME` | `שם התלמיד` |
| `SC_DETAILS_FIELD_GRADE` | `שכבה` |
| `SC_DETAILS_FIELD_CLASS` | `כיתה` |
| `SC_DETAILS_FIELD_CHILD_AGE` | `גיל הילד` |
| `SC_DETAILS_FIELD_DATE_OF_BIRTH` | `תאריך לידה` |
| `SC_DETAILS_FIELD_PARENT1_NAME` | `שם הורה 1` |
| `SC_DETAILS_FIELD_PARENT1_PHONE` | `טלפון הורה 1` |
| `SC_DETAILS_FIELD_PARENT1_NATIONAL_ID` | `תעודת זהות הורה 1` |
| `SC_DETAILS_FIELD_PARENT2_NAME` | `שם הורה 2` |
| `SC_DETAILS_FIELD_PARENT2_PHONE` | `טלפון הורה 2` |
| `SC_DETAILS_FIELD_PARENT2_NATIONAL_ID` | `תעודת זהות הורה 2` |
| `SC_DETAILS_FIELD_PARENT_EMAIL` | `אימייל הורה` |
| `SC_DETAILS_FIELD_ADDRESS` | `כתובת` |
| `SC_DETAILS_FIELD_EMERGENCY_NAME` | `שם איש קשר לחירום` |
| `SC_DETAILS_FIELD_EMERGENCY_PHONE` | `טלפון חירום` |
| `SC_DETAILS_FIELD_MEDICAL_NOTES` | `הערות רפואיות / אלרגיות` |
| `SC_DETAILS_FIELD_TRANSPORT_NOTES` | `הערות הסעה` |
| `SC_DETAILS_FIELD_INTERNAL_NOTES` | `הערות פנימיות` |

### Status and feedback strings
| Key | Hebrew |
|-----|--------|
| `SC_DETAILS_EMPTY_STATE` | `לא הוזנו פרטים נוספים לתלמיד זה.` |
| `SC_DETAILS_SAVE_SUCCESS` | `הפרטים נשמרו בהצלחה.` |
| `SC_DETAILS_SAVE_ERROR` | `לא ניתן לשמור את הפרטים כרגע. נסה שוב.` |
| `SC_DETAILS_NAME_UPDATE_SUCCESS` | `שם התלמיד עודכן בהצלחה.` |
| `SC_DETAILS_NAME_UPDATE_ERROR` | `לא ניתן לעדכן את שם התלמיד כרגע. נסה שוב.` |
| `SC_DETAILS_READONLY_BADGE` | `צפייה בלבד` |

These constants are added to `lib/school-portal/school-communication.he.js`.

---

## 11. Out of Scope

The following are explicitly excluded:

- Parent portal changes (parents cannot view or edit admin profile)
- Student portal changes
- Diagnostic engine logic
- Parent report or teacher report data changes
- Activity engine changes
- Games, coins, inventory
- Excel / CSV import-export
- Bulk editing multiple students at once
- SMS / WhatsApp / email integration
- Push notifications
- Audit log read UI (audit rows are written but no viewer UI is built)
- Student photo upload
- Any Hebrew copy not listed in Section 10 of this plan
- Any new permission columns or tables (no `student_profile_edit`, no `national_id_permission`, no new grants beyond existing `student_access_admin` / `student_data_viewer`)

---

## 12. Delivery Phases

### Phase 1 — Plan confirmation ✅
- Hebrew copy: approved (see Section 10)
- Permissions: approved (existing grants reused, no new permissions)
- Teacher portal UI file: **`pages/teacher/student/[studentId].js`**

### Phase 2 — SQL migration file only ✅ (file written; NOT executed)
- ✅ `supabase/migrations/053_school_student_admin_profiles.sql` written
- ⏳ Owner reviews and runs manually — **still pending**

### Phase 3 — Server / API implementation ✅
- ✅ `lib/school-server/school-student-profile.server.js`
- ✅ `lib/school-portal/school-student-profile-fields.js`
- ✅ `pages/api/school/students/[studentId]/admin-profile.js` (GET: browse context; PUT: credential admin)
- ✅ `pages/api/school/students/[studentId]/name.js`
- ✅ `pages/api/teacher/students/[studentId]/admin-profile.js`

### Phase 4 — UI implementation ✅
- ✅ "פרטים" button on `SchoolStudentCard` in [`components/school-portal/SchoolDrillDown.jsx`](components/school-portal/SchoolDrillDown.jsx)
- ✅ `components/school-portal/SchoolStudentDetailsPanel.jsx`
- ✅ `components/school-portal/SchoolStudentDetailsModal.jsx`
- ✅ Wiring in `pages/school/students/index.js`
- ✅ Optional details in `components/school-portal/SchoolStudentCreateForm.jsx`
- ✅ Read-only panel in `pages/teacher/student/[studentId].js`
- ✅ Hebrew from Section 10 + `SC_BTN_HIDE_DETAILS`

### Phase 5 — Tests ✅
- ✅ `__tests__/school/admin-profile.test.js` — 27 tests pass
- Covers: validation, partial merge, mapping, grant matrix (4 secretary cases), static route/helper wiring, migration shape
- Section 8 integration scenarios (live HTTP + DB) — **manual / post-SQL**

### Phase 6 — Manual QA ⏳
- Blocked until SQL applied — Section 9 checklist

### Phase 7 — Final summary for review ✅
- Pre-SQL packages: v1, v2, v3 ZIP under `review-packages/school-student-admin-profile-pre-sql-review/`
- Build pass; security searches documented in v3 package

---

## 13. Implementation Approval Gate

**Implementation is approved by the owner as of the plan cleanup on 2026-05-31.**

Active constraints (apply for the full duration of implementation):

- SQL migration file must be prepared only — it must NOT be run, applied, or pushed by Cursor
- No commits
- No pushes
- No deploys
- No changes to any unrelated UI, report, diagnostic logic, parent portal, student portal, game, coin, or activity engine
- Implementation scope is strictly limited to the student admin profile feature described in this plan
- Use only the approved Hebrew copy from Section 10 — no ad-hoc Hebrew strings
- Reuse existing permissions only: `student_access_admin` and `student_data_viewer` — no new permission columns or tables

At the end of implementation, return:
- List of all changed/created files — **see Implementation status section above**
- Path to the SQL migration file — `supabase/migrations/053_school_student_admin_profiles.sql` (**not run**)
- Test results — 27/27 pass; build pass
- Manual QA notes — Section 9 pending until owner runs SQL

**Gate still active:** no commit, push, or deploy by Cursor until owner approves post-QA.
