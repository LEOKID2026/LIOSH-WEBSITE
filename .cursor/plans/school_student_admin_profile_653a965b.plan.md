---
name: School Student Admin Profile
overview: Add an optional administrative profile to every school student — viewable by manager, authorized secretary, and teacher; editable only by manager and authorized secretary. All fields are optional. No student requires a profile to function normally.
todos:
  - id: confirm-plan
    content: User approves plan, confirms teacher portal UI file, approves Hebrew copy
    status: pending
  - id: migration-sql
    content: Write 053_school_student_admin_profiles.sql (no execution)
    status: pending
  - id: server-api
    content: Implement lib/school-server/school-student-profile.server.js and three API routes
    status: pending
  - id: ui-school-portal
    content: Add details tab to SchoolReportModal, create SchoolStudentDetailsPanel
    status: pending
  - id: ui-teacher-portal
    content: Add read-only admin profile panel to teacher portal student view
    status: pending
  - id: tests
    content: Write test file covering all permission/access scenarios
    status: pending
  - id: qa-checklist
    content: Execute manual QA checklist for manager, secretary, and teacher roles
    status: pending
  - id: final-review
    content: Produce final ZIP / summary for review
    status: pending
isProject: false
---


# School Student Administrative Profile — Full Implementation Plan

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
  - `school_admin` = school manager
  - `school_operator` = secretary/operator (product name; no separate DB role called "secretary")
  - `teacher` = teaching staff
- Operator permission grants: `school_operator_grants` table — booleans `student_access_admin` and `student_data_viewer`, keyed on `(school_id, operator_user_id)`
- Manager grants these booleans to operators via `pages/school/operators/[operatorId].js` — **no new UI needed** for grant management

### 1.4 Existing API guards (lib/school-server/school-request.server.js)

| Guard | Allows |
|-------|--------|
| `requireSchoolManagerApiContext` | `school_admin` role + `school_manager` entitlement |
| `requireSchoolDataViewerContext(schoolId)` | Manager OR operator w/ `student_data_viewer` |
| `requireSchoolCredentialAdminContext(schoolId)` | Manager OR operator w/ `student_access_admin` |
| `requireSchoolCredentialAdminApiContext` | Same, without pre-resolved schoolId |
| `requireSchoolStudentBrowseApiContext` | Manager OR operator w/ either grant |

**Important:** None of these guards accept `role = 'teacher'`. Teachers use the separate **teacher portal** (`pages/api/teacher/`) with `requireTeacherApiContext` + `teacherHasReportAccessToStudent`.

### 1.5 UI components
- `pages/school/students/index.js` — orchestrates the school portal student browse
- `components/school-portal/SchoolDrillDown.jsx` — `SchoolStudentCard` renders student cards with `onAccess` and `onReport` buttons
- `components/school-portal/SchoolReportModal.jsx` — tabbed modal with tabs: `report`, `assignment`, `access`. This is where the new `details` tab is added
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
  parent1_name              text        CHECK (parent1_name IS NULL OR char_length(trim(parent1_name)) BETWEEN 1 AND 200),
  parent1_phone             text        CHECK (parent1_phone IS NULL OR char_length(trim(parent1_phone)) BETWEEN 1 AND 50),
  parent2_name              text        CHECK (parent2_name IS NULL OR char_length(trim(parent2_name)) BETWEEN 1 AND 200),
  parent2_phone             text        CHECK (parent2_phone IS NULL OR char_length(trim(parent2_phone)) BETWEEN 1 AND 50),
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

  -- Administrative / logistic (returned to all authorized roles including teachers)
  transportation_notes      text        CHECK (transportation_notes IS NULL OR char_length(trim(transportation_notes)) <= 1000),
  internal_notes            text        CHECK (internal_notes IS NULL OR char_length(trim(internal_notes)) <= 2000),

  -- Fields withheld from teacher-portal API responses (returned to manager and authorized secretary only)
  date_of_birth             date,
  student_national_id       text        CHECK (student_national_id IS NULL OR char_length(trim(student_national_id)) BETWEEN 1 AND 30),
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

### 2.2 Field protection model

Every field in `school_student_profiles` is treated as protected school administrative data. No field is considered public or low-sensitivity. Authorization is required to read or write any field.

The distinction between roles is in **what teachers can see**, not in how strongly the data is protected:

| Field group | Manager | Authorized secretary | Teacher (own students only) |
|-------------|---------|---------------------|----------------------------|
| parent1/2 name, parent1/2 phone, parent_email, address, emergency_contact_name/phone, transportation_notes, internal_notes | View + Edit | View + Edit | View only |
| date_of_birth, student_national_id, medical_allergy_notes | View + Edit | View + Edit | **Not returned — withheld server-side** |

All withheld fields are stripped from the response object on the server before it is sent. The teacher UI never receives these values. There is no client-side-only hiding.

### 2.3 updated_by behavior
- Set to `ctx.actorUserId` on every PUT/PATCH write, using service role
- Returned as `updatedBy` (user ID) + `updatedByName` (resolved from `teacher_profiles.full_name`) in GET response for manager and authorized secretary only
- Not included in the teacher-portal response
- Shown in the school portal UI as a footer label (copy TBD, requires approval)

### 2.4 Future field-visibility configuration
A `profile_hidden_fields jsonb DEFAULT '[]'::jsonb` column is added to `public.school_accounts` in the same migration. This allows a manager to hide specific field keys from the UI (e.g. hide `student_national_id` display) without deleting stored data. The GET API returns `hiddenFields: string[]`. The UI renders hidden fields with a masked label instead of the value. Implementation of the management UI for this setting is deferred to a future phase.

---

## 3. Permission Model

### 3.1 Authorized users

Only the following identities are permitted to access any endpoint in this feature:

| Identity | How identified | Read access | Write access |
|----------|---------------|-------------|--------------|
| School manager | `school_teacher_memberships.role = 'school_admin'` + `school_manager` persona entitlement | All fields | Yes |
| Authorized secretary | `school_teacher_memberships.role = 'school_operator'` + `school_operator` entitlement + `student_data_viewer` OR `student_access_admin` grant | All fields | Only with `student_access_admin` grant |
| School teacher | `school_teacher_memberships.role = 'teacher'` + confirmed access to student via `teacherHasReportAccessToStudent` | All fields **except**: date_of_birth, student_national_id, medical_allergy_notes | **Never** |

### 3.2 Explicitly blocked identities

The following identities are rejected with 403 at the API level on every request. No data is returned. No UI workaround can bypass this because the check is server-side only.

| Identity | Why blocked |
|----------|-------------|
| Parent user (Supabase JWT with `parent` persona) | Not in the school permission model |
| Student user (student session cookie or access code) | Not in the school permission model |
| Private teacher (teacher not in `school_teacher_memberships` for this school) | Not part of this school — no relationship to the student even if they have a teacher JWT |
| Unauthenticated request | No valid token |
| School staff from a different school | `membership.schoolId !== ctx.schoolId` — blocked as `wrong_school` |
| Operator with no grants | `student_data_viewer = false` AND `student_access_admin = false` — blocked |

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
5. Build response: include all fields **except** date_of_birth, student_national_id, medical_allergy_notes — these are stripped server-side before the response object is constructed, not hidden in the UI

**PUT admin-profile:**
- `requireSchoolCredentialAdminApiContext` (manager OR operator w/ `student_access_admin`) — rejects all other identities including teachers, parents, students, other-school users
- `verifyStudentVisibleToSchool(serviceRole, schoolId, studentId)` → 404 if not enrolled
- Upsert on `(school_id, student_id)` unique constraint

**PATCH student name:**
- `requireSchoolCredentialAdminApiContext` — same as PUT
- `verifyStudentVisibleToSchool` → 404 if not enrolled
- `UPDATE public.students SET full_name = $1, updated_at = now() WHERE id = $2`
- Write to `school_operator_audit_log` (action = `'student_name_updated'`, metadata includes old + new name, schoolId, actorUserId)

### 3.5 Cross-school isolation
Every route (both school portal and teacher portal) verifies the `(school_id, student_id)` pair exists in `school_student_enrollments` with `unenrolled_at IS NULL` and that the resolved `school_id` matches the authenticated actor's school. A school_id mismatch always returns 403 `wrong_school`. This check is performed after authentication and cannot be skipped.

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
  GET   — teacher portal only: school teacher w/ legitimate student access
          → returns all fields EXCEPT date_of_birth, student_national_id, medical_allergy_notes
          → all other identities (parent, student, private teacher, other-school) → 403
```

The two GET routes are separate by design. There is no single endpoint that "detects" the role and returns different data. Mixing auth contexts in one handler is avoided to prevent misidentification bugs.

### 4.2 GET /api/school/students/[studentId]/admin-profile

Guard: `requireSchoolDataViewerContext` (OR `requireSchoolCredentialAdminContext` — both qualify)

Success response (profile exists):
```json
{
  "profile": {
    "parent1Name": "...", "parent1Phone": "...",
    "parent2Name": "...", "parent2Phone": "...",
    "parentEmail": "...", "address": "...",
    "emergencyContactName": "...", "emergencyContactPhone": "...",
    "transportationNotes": "...", "internalNotes": "...",
    "dateOfBirth": "2010-05-14", "studentNationalId": "...", "medicalAllergyNotes": "...",
    "updatedAt": "2026-05-31T00:00:00Z", "updatedBy": "<uuid>", "updatedByName": "..."
  },
  "isEmpty": false,
  "hiddenFields": []
}
```

Empty state response:
```json
{ "profile": null, "isEmpty": true, "hiddenFields": [] }
```

### 4.3 PUT /api/school/students/[studentId]/admin-profile

Guard: `requireSchoolCredentialAdminApiContext`

Body (all optional, all nullable):
```json
{
  "parent1Name": "...", "parent1Phone": "...",
  "parent2Name": "...", "parent2Phone": "...",
  "parentEmail": "...", "address": "...",
  "emergencyContactName": "...", "emergencyContactPhone": "...",
  "transportationNotes": "...", "internalNotes": "...",
  "dateOfBirth": "YYYY-MM-DD", "studentNationalId": "...", "medicalAllergyNotes": "..."
}
```

Behavior: upsert. If no row exists yet, INSERT. If row exists, UPDATE all provided fields. `updated_by` set to `ctx.actorUserId`. `updated_at` set to `now()`.

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
3. Write to `school_operator_audit_log` (`action = 'student_name_updated'`, metadata includes old + new name)

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

Response shape: identical structure to school portal GET, but the following fields are **never present in the response object**. They are stripped on the server before the object is constructed — not conditionally included and not set to null:
- `date_of_birth`
- `student_national_id`
- `medical_allergy_notes`
- `updatedBy`, `updatedByName` (audit metadata not exposed to teachers)

If any of those field names appear in a teacher-route response, it is a bug to be treated as a security regression.

### 4.6 Validation summary

| Field | Rule |
|-------|------|
| parent1/2_name, emergency_contact_name, parent1/2_phone, emergency_contact_phone | optional, trimmed, max lengths per schema |
| parent_email | optional, must match email regex if provided |
| address | optional, max 500 chars |
| transportation_notes, internal_notes, medical_allergy_notes | optional, max lengths per schema |
| date_of_birth | optional, valid ISO date string |
| student_national_id | optional, max 30 chars |
| full_name (name PATCH) | required if endpoint called, 1–200 chars |

---

## 5. UI Design

### 5.1 "פרטים" tab in SchoolReportModal
[`components/school-portal/SchoolReportModal.jsx`](components/school-portal/SchoolReportModal.jsx) currently renders tabs: `report`, `assignment`, `access`.

Changes:
- Add new tab identifier: `"details"`
- Add new prop: `canViewDetails: boolean` (visible to manager and to operators with either grant)
- Add new prop: `canEditDetails: boolean` (visible to manager and operators with `student_access_admin`)
- `showDetailsTab = Boolean(canViewDetails && sessionReady && effectiveStudentId)`
- Tab renders `SchoolStudentDetailsPanel` inside a `ReportModalFrame` (same pattern as `SchoolStudentAssignmentPanel`)

### 5.2 SchoolStudentCard
No changes to the card buttons. The card's `onReport` button already opens `SchoolReportModal` where the new tab lives.

### 5.3 New component: SchoolStudentDetailsPanel

```
components/school-portal/SchoolStudentDetailsPanel.jsx
```

Props: `accessToken`, `authMethod`, `studentId`, `studentName`, `canEdit`, `isSchoolPortal`

- `canEdit`: true for manager and authorized secretary with `student_access_admin`. Never true for teachers.
- `isSchoolPortal`: true when rendered in the school portal (manager/secretary). False when rendered in the teacher portal. Controls whether the server response will include the withheld fields and whether the UI should render those field slots at all. The actual field filtering is done server-side; this prop only affects whether the UI renders the field rows.

States and behavior:

- **Loading**: spinner while `GET admin-profile` is in flight
- **Empty state**: notice (copy TBD) + add button (if `canEdit`)
- **View mode**: all fields from API response; if `isSchoolPortal` renders date_of_birth, student_national_id, medical_allergy_notes field rows; edit pencil button top-right if `canEdit`; `updatedAt`/`updatedByName` footer if `isSchoolPortal`
- **Edit mode (inline)**: form fields replace value display; save + cancel buttons (copy TBD); loading state on save; error message on failure
- **Student name section** (top of panel): displays `studentName`; inline edit input + save/cancel if `canEdit` (wired to PATCH `/name`)

Hebrew copy for field labels is NOT finalized here — requires explicit approval before implementation.

### 5.4 Teacher portal
A read-only `SchoolStudentAdminProfileReadOnly` panel is added to the teacher portal student report modal (the exact file to confirm during Phase 3 investigation). It:
- Has no edit controls
- Has no student name edit option
- Renders only the fields returned by the teacher-portal API response (`isSchoolPortal = false`) — date_of_birth, student_national_id, medical_allergy_notes field rows are not rendered in this component at all
- Shows empty state gracefully when no profile exists
- Wired to `GET /api/teacher/students/[studentId]/admin-profile`
- No `updatedBy` / `updatedByName` footer (these are not returned by the teacher route)

### 5.5 pages/school/students/index.js wiring
- Read `canViewDetails` and `canEditDetails` from the `me` object (via `lib/school-portal/operator-grants.js`) and pass them as props to `SchoolReportModal`
- No changes to browse/filtering logic

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
4. Append row to `school_operator_audit_log` with `action = 'student_name_updated'` and metadata `{ oldName, newName, schoolId, studentId }`
5. Respond 200 `{ studentId, fullName }`

### Regression risk assessment
Low. All live reads pull from `students.full_name`. The only known non-propagating location is the historical message recipient snapshot, which is acceptable.

---

## 7. Privacy and Security

### All fields are protected school administrative data

Every field stored in `school_student_profiles` — including parent names, phone numbers, parent email, address, emergency contact, internal notes, transportation notes, date of birth, student national ID, and medical/allergy notes — is treated as protected school administrative data. There is no "public" or "low-sensitivity" tier among these fields.

The only distinction between roles is what a teacher is permitted to see vs. what a manager/secretary sees. This distinction is enforced server-side; it is not a UI decision.

### Core security rules

1. **Server-side enforcement on every request.** No authorization decision is based solely on what the UI shows or hides. Every GET, PUT, and PATCH request independently verifies the actor's identity, role, school membership, and applicable grants before any data is read or written.

2. **Blocked identities.** The following are rejected with 403 at the API layer on every request:
   - Parent users (Supabase parent JWT)
   - Student users (student session token or access code)
   - Private teachers — teachers who hold a `teacher_profiles` record but have no active row in `school_teacher_memberships` for this school
   - Operators with no grants (`student_data_viewer = false` AND `student_access_admin = false`)
   - Any user whose `school_teacher_memberships.school_id` does not match the student's enrolled school
   - Unauthenticated requests

3. **Cross-school isolation.** Every endpoint verifies that the student is actively enrolled (`unenrolled_at IS NULL`) in the actor's school via `school_student_enrollments`. A mismatch between the actor's resolved `school_id` and the student's enrolled school returns 403 `wrong_school` regardless of any other valid credentials.

4. **Withheld fields for teachers.** The fields `date_of_birth`, `student_national_id`, and `medical_allergy_notes` are never included in the teacher-portal API response. They are stripped from the server-side response object before it is built — not conditionally set to null, not hidden client-side. If any of these field names appear in a teacher-portal API response, it is a security regression.

5. **No write access for teachers.** Teachers cannot call PUT `/admin-profile` or PATCH `/name`. These endpoints use `requireSchoolCredentialAdminApiContext` which explicitly rejects the `teacher` role and all non-school-portal identities.

6. **Separate routes, no role-sniffing endpoint.** The school-portal GET and teacher-portal GET are separate route files. There is no single "smart" endpoint that changes its behavior based on the detected role. This eliminates the risk of a role-detection bug accidentally exposing restricted fields.

7. **No RLS client policies.** RLS is enabled on `school_student_profiles` with no `FOR authenticated` policies, consistent with all other school tables. All reads and writes go through service role with application-level permission checks.

8. **`student_national_id` is PII.** It is stored in plaintext in the database, consistent with how other PII (e.g. `full_name`, `parent_email`) is stored in this system. No additional encryption is planned in this phase.

### Future field-visibility configuration (not implemented in initial phases)
- `school_accounts.profile_hidden_fields` (jsonb array of field key strings) added in migration 053
- The GET endpoint returns `hiddenFields: string[]` from this column
- UI renders hidden fields with a masked indicator rather than the actual value
- The data remains stored and is accessible to the manager if the hidden flag is removed
- Management UI for toggling field visibility per school is a future enhancement
- **This feature is display-layer only.** Hiding a field through this mechanism does not restrict API access to that field — all authorized roles can still read it through the API regardless of the hidden flag

---

## 8. Testing Plan

All tests use existing test infrastructure. New test file: `__tests__/school/admin-profile.test.js`

**Basic access — no profile exists yet**
- Student without profile: GET (school route) → `{ profile: null, isEmpty: true }` 200
- Student without profile: GET (teacher route) → `{ profile: null, isEmpty: true }` 200

**Manager**
- GET: 200, all fields returned including date_of_birth, student_national_id, medical_allergy_notes
- PUT all fields: 200, row created, verify in DB
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

**Operator with no grants**
- GET (school route) → 403

**School teacher with legitimate access**
- GET (teacher route) → 200
- Verify response does NOT contain keys: `dateOfBirth`, `studentNationalId`, `medicalAllergyNotes`, `updatedBy`, `updatedByName`
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

### Manager browser checks
- [ ] "פרטים" tab visible in student modal
- [ ] Empty state: notice visible, add button present
- [ ] Fill all fields (including date_of_birth, national ID, medical notes), save → view mode shows values
- [ ] Edit student name → saved and reflected in student card header
- [ ] `updatedAt` / `updatedByName` footer appears after first save
- [ ] Cancel button reverts form to previous state
- [ ] Loading indicator during save

### Secretary browser checks (operator)
- [ ] With `student_data_viewer` only: tab visible, all fields shown, no edit controls, no save button
- [ ] With `student_access_admin`: tab visible, can edit all fields, can save, can edit student name
- [ ] Without either grant: tab NOT visible in UI
- [ ] date_of_birth, national ID, medical notes fields visible (secretary with either grant)

### Teacher browser checks
- [ ] "פרטים" panel visible in teacher portal student view (read-only)
- [ ] Parent names/phones, address, emergency contact, transportation notes, internal notes shown correctly
- [ ] date_of_birth, national ID, medical allergy notes are NOT present anywhere in the view (not shown, not masked, not "hidden" — simply absent)
- [ ] No edit controls visible anywhere in the panel
- [ ] No student name edit option visible
- [ ] Student outside teacher's classes: panel not accessible

### API permission checks (curl / Postman)
- [ ] GET school route with manager token → 200, all fields in response
- [ ] GET school route with `student_data_viewer` operator → 200, all fields in response
- [ ] GET school route with `student_access_admin` operator → 200, all fields in response
- [ ] GET school route with no-grant operator → 403
- [ ] GET school route with teacher token → 403
- [ ] GET school route with parent JWT → 403
- [ ] GET school route with student session → 403
- [ ] GET school route with token from another school → 403
- [ ] GET teacher route with legitimate school teacher + accessible student → 200, dateOfBirth / studentNationalId / medicalAllergyNotes keys absent from response body
- [ ] GET teacher route with legitimate school teacher + inaccessible student → 403
- [ ] GET teacher route with private teacher (not in school memberships) → 403
- [ ] GET teacher route with parent JWT → 403
- [ ] PUT with manager token → 200
- [ ] PUT with `student_access_admin` operator → 200
- [ ] PUT with `student_data_viewer`-only operator → 403
- [ ] PUT with teacher token → 403
- [ ] PUT with parent JWT → 403
- [ ] PUT with other-school token → 403
- [ ] PATCH name with manager → 200
- [ ] PATCH name with `student_access_admin` operator → 200
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

## 10. Out of Scope

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
- Any Hebrew copy changes without explicit approval

---

## 11. Delivery Phases

### Phase 1 — Plan confirmation (now)
- User approves this plan
- Confirm: teacher-side UI location (teacher portal modal — which file exactly)
- Confirm: Hebrew copy for all labels before any strings are written

### Phase 2 — SQL migration file only (NOT executed)
- Write `supabase/migrations/053_school_student_admin_profiles.sql`
- User reviews and runs manually
- No code changes in this phase

### Phase 3 — Server / API implementation
- New server helper: `lib/school-server/school-student-profile.server.js` (upsert, read, name update logic)
- New API routes:
  - `pages/api/school/students/[studentId]/admin-profile.js`
  - `pages/api/school/students/[studentId]/name.js`
  - `pages/api/teacher/students/[studentId]/admin-profile.js`
- No UI changes in this phase

### Phase 4 — UI implementation
- Add `"details"` tab to [`components/school-portal/SchoolReportModal.jsx`](components/school-portal/SchoolReportModal.jsx)
- Create `components/school-portal/SchoolStudentDetailsPanel.jsx`
- Wire `canViewDetails` / `canEditDetails` through `pages/school/students/index.js`
- Add read-only panel to teacher portal student view (file confirmed in Phase 1)
- Hebrew copy used only after user approval

### Phase 5 — Tests
- Write `__tests__/school/admin-profile.test.js` covering all scenarios above

### Phase 6 — Manual QA
- Execute QA checklist above for all three roles

### Phase 7 — Final ZIP / summary for review
- Collect all changed files, migration, and test output into a review package
