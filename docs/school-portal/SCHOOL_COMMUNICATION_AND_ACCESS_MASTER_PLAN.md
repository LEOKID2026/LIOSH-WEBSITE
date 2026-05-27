# School Communication and Account Management — Master Plan

**Status:** PLANNING ONLY — No implementation code, no SQL executed, no commit, no push.
**Date:** 2026-05-27 (revised 2026-05-27)
**Author:** AI Planning Agent
**Approval required before any implementation begins.**

---

> **APPROVED WORKFLOW**
>
> 1. Agent prepares the final full plan.
> 2. Owner reviews the full plan (with ChatGPT if desired).
> 3. Owner gives one explicit approval: **`START FULL SCHOOL PORTAL IMPLEMENTATION`**
> 4. Agent implements the full approved school-portal scope from start to finish (Steps 1 → 2 → 3, no inter-step stops).
> 5. Agent runs all planned tests and fixes issues found during implementation/testing.
> 6. Agent sends one final completion report.
> 7. Owner uploads the report and files to ChatGPT.
> 8. Owner and ChatGPT review everything at the end.
> 9. Owner performs manual UI/mobile/desktop checks.
> 10. Owner decides whether the work is accepted.
>
> **Phases 1, 2, and 3 are internal execution milestones only. They are NOT stop points that require owner approval between them. The agent does not stop between phases unless there is a hard technical blocker (e.g., a migration must be manually applied before testing can proceed).**

---

## 0. Scope Boundary and Regression Protection

### 0.1 What This Project Touches

This project is scoped entirely to the **school portal context**. The allowed impact area is:

- School manager portal (`/school/**`)
- School-issued student and parent credentials
- School-linked parent access (guardian session, `created_by_school_id`)
- School parent inbox (`/parent/school-inbox`)
- School manager messages to parents and teachers
- Teacher inbox **only** for teachers who are members of a school (`/teacher/school-messages`)
- Teacher-to-parent messages **only** when operating inside the school context and only where explicitly planned in migration 033
- Parent mini-report **only** for school-linked children (new dashboard card on parent dashboard, additive only)

### 0.2 What This Project Must Not Touch

**Regular private teachers and regular non-school parents must remain completely unchanged.**

**Implementation rule:** Any code path that could affect a regular private teacher or a regular non-school parent is a protected flow. If a change to a protected flow is technically unavoidable, it must be:
- Additive only (a new column, a new condition, a new route — never a modification to existing logic).
- Guarded by school context (`school_id IS NOT NULL`, `created_by_school_id IS NOT NULL`, membership check, or equivalent).
- Explicitly listed in the final report under "Changes to protected flows" with justification.

No code may be written, and no existing file may be modified, that changes behavior for:

- Regular private teacher portal (`/teacher/**` outside `/teacher/school-messages`)
- Regular private teacher dashboard
- Regular teacher-created parent/student access flow (`/api/teacher/student-access/...`, `/api/teacher/student-login-access/...`)
- Regular teacher parent-message panel (`TeacherParentMessagePanel`, `/api/teacher/students/[studentId]/parent-messages`) — the only permitted change is the silent backfill of `school_id` on new sends (migration 033), which is a null-safe additive column that does not change any existing behavior
- Regular parent who registered normally to the site (Supabase Auth, `students.parent_id`)
- Regular parent dashboard behavior outside the school context (no existing UI or API changed; new school inbox card is additive only)
- Existing non-school parent report behavior (`/learning/parent-report`, existing `/api/parent/` routes)
- Existing private teacher parent-message behavior except where migration 033 silently adds `school_id`

### 0.3 Regression Proof Requirements

The final completion report must include passing results for every item below. If any of these regressions fail, the project is not complete.

- Existing teacher guardian access panel creates guardian access unchanged.
- Existing teacher student login access panel creates student login unchanged.
- Existing private teacher parent-message panel sends messages unchanged.
- Existing parent dashboard functions unchanged for normal registered parents.
- Existing parent report page (`/learning/parent-report`) loads with correct data unchanged.
- School dashboard, teachers, classes, students pages all load unchanged.
- School physical class report loads unchanged.
- Demo school simulation smoke test (`tests/e2e/demo-school-simulation-smoke.spec.ts`) passes with no failures.
- No route outside `/school/**`, `/teacher/school-messages`, and explicitly approved school-related parent routes has changed behavior.

---

## 1. Executive Summary

The School Portal currently provides school managers with a learning-activity and roster overview (teachers, classes, students, activities) but has **no communication capability** and **no school-level account management**. Parents, students, and teachers currently rely on WhatsApp for school communication.

This plan covers the full end-to-end implementation of:

- **School communication center** — structured, role-scoped messaging from school manager to parents **and teachers**, and from homeroom/subject teachers to parents in school context. This is **not** free chat; it is structured, auditable, targeted school communication.
- **School-level student and parent account management** — creation, reset, block/unblock, and audit of student and parent portal access, anchored to a school code prefix.
- **Parent portal in school context** — parent-facing inbox, mini-report per child, and child list in school branding.
- **Teacher/staff inbox** — teachers receive school manager messages in a dedicated school messages section of the teacher portal.
- **Mandatory first-login PIN change for parents** — school-issued parent credentials require a PIN change on first login. Student PIN remains simpler.
- **Permissions** — clean matrix covering super admin, school manager, optional school secretary, homeroom teacher, subject teacher, parent, and student.

The plan is structured in four implementation phases. Phase 1 is account management and the mandatory first-login foundation. Phase 2 is the messaging core (parent inbox, teacher inbox, school manager → all audiences). Phase 3 is read receipts dashboard, advanced targeting, and dashboard counters. Phase 4 is optional future features.

---

## 2. Existing System Audit

### 2A. Regular Teacher Flow — What Exists Today

#### 2A.1 Student Username and Access Creation

**Tables:**
- `student_access_codes` — student login access records. Columns: `id`, `student_id`, `code_hash` (bcrypt of username), `login_username` (denormalized display), `is_active`, `revoked_at`, `created_at`. PIN is not stored here; it is stored separately in `student_guardian_access` or via a separate credential mechanism.
- `student_guardian_access` — parent/guardian access per student. Columns: `id`, `student_id`, `created_by_teacher_id`, `login_username`, `login_username_normalized`, `code_hash`, `pin_hash`, `delivery_channel`, `is_active`, `expires_at`, `revoked_at`.

**Username format (already implemented):**
- The format is `{prefix}-{kind}{sequence}` where prefix is 3 lowercase letters, kind is `p` (parent) or `s` (student), sequence is zero-padded.
- Examples: `leo-p01` (parent), `leo-s01` (student).
- Logic lives in `lib/teacher-server/teacher-access-prefix.server.js`.
- Each teacher gets a unique `access_prefix` stored in `teacher_profiles.access_prefix`.
- Prefix is assigned once, never changes.
- Prefix uniqueness is enforced by a unique partial index on `teacher_profiles`.

**APIs:**
- `POST /api/teacher/student-login-access/create` — teacher creates student login (username + PIN).
- `GET /api/teacher/student-login-access` — list student login access records.
- `POST /api/teacher/student-login-access/[accessId]/rotate-pin` — reset student PIN.
- `POST /api/teacher/student-login-access/[accessId]/rotate-username` — rotate student username.
- `POST /api/teacher/student-login-access/[accessId]/revoke` — revoke student access.
- `POST /api/teacher/student-access/create` — teacher creates parent/guardian access.
- `GET /api/teacher/student-access` — list parent access records.
- `POST /api/teacher/student-access/[accessId]/rotate-pin` — reset parent PIN.
- `POST /api/teacher/student-access/[accessId]/rotate-username` — rotate parent username.
- `POST /api/teacher/student-access/[accessId]/revoke` — revoke parent access.

**Parent self-service:**
- `POST /api/parent/create-student-access-code` — parent creates or resets student credentials from parent dashboard.

**UI components:**
- `components/teacher-portal/StudentLoginAccessPanel.jsx` — shows student login username, status, create/revoke/reset-PIN UI with "shown once" credential box.
- `components/teacher-portal/GuardianAccessPanel.jsx` — shows parent access username, status, magic link, create/revoke/reset-PIN UI.
- Both panels implement the **shown-once** security pattern: PIN is displayed once after creation/reset and never retrieved again.

#### 2A.2 PIN and Credential Security

**Crypto module:** `lib/guardian-server/guardian-crypto.server.js`
- `hashStudentSecret(text)` — bcrypt-style hash for PINs and usernames.
- `generateStudentPin()` — generates a random 4-digit PIN.
- `normalizeStudentPin(pin)` — validates and normalizes PIN.
- `generateMagicLinkToken()` — generates a one-time magic link token.
- `normalizeStudentUsername(username)` — lowercases and trims.

**PIN policy (currently):**
- Student PIN: 4 digits (validated with `/^\d{4}$/`).
- Parent PIN: stored as hash; current generation likely 4-6 digits (to be confirmed in `generateStudentPin()`).
- Hashes stored; plaintext never persisted; shown once after creation/reset.
- Audit trail: `teacher_access_audit` table (append-only) logs all credential events.

#### 2A.3 Parent Report Flow

- Route: `/learning/parent-report?studentId=...&source=parent|teacher|guardian`.
- Teacher redirects to this via `/teacher/student/[studentId]/parent-report` (server-side redirect).
- School portal fetches report data via `GET /api/school/students/[studentId]/report-data`, which reuses `buildTeacherStudentReportPayload` from `lib/teacher-server/teacher-report.server.js`.
- Report includes: learning sessions, accuracy by subject, activity timeline, recommendations.
- Report is generated on-demand; no PDF in school portal today (PDF exists in worksheet flow).

#### 2A.4 Teacher-to-Parent Messaging

**Table:** `teacher_parent_messages` (migration 023)
- Columns: `id`, `teacher_id`, `student_id`, `message`, `is_hidden`, `created_at`, `updated_at`.
- Append-only (soft-delete via `is_hidden`). No read receipt. No message type. No targeting beyond student.
- RLS: no authenticated policies — all via service role.

**APIs:**
- `GET /api/teacher/students/[studentId]/parent-messages` — list messages for a student.
- `POST /api/teacher/students/[studentId]/parent-messages` — send a message.
- `POST /api/teacher/students/[studentId]/parent-messages/[messageId]/hide` — hide (soft-delete).

**UI:** `components/teacher-portal/TeacherParentMessagePanel.jsx` — compose and list messages per student.

#### 2A.5 Roles and Permissions (Teacher Flow)

- `school_teacher_memberships.role`: `'teacher'` or `'school_admin'`.
- `school_admin` = school manager — has access to `/school/*` portal.
- `teacher` = regular teacher — has access to `/teacher/*` portal only.
- Teacher-student relationship types: `primary_teacher`, `subject_teacher`, `tutor`, `observer` (in `teacher_students`).
- Parent: authenticated via Supabase Auth (standard user session). Can access `/parent/*`.
- Guardian: uses custom cookie/session system via `student_guardian_access` and `student_guardian_sessions`. No Supabase Auth session.
- Student: uses custom PIN/access code (`student_access_codes`). No Supabase Auth session.

#### 2A.6 Relevant Tests (Teacher Flow)

- `tests/e2e/teacher-activities.spec.ts`
- `tests/e2e/teacher-activity-draft-ui.spec.ts`
- `tests/e2e/teacher-code-access-login.spec.ts`
- `tests/e2e/parent-report-real-ui-load.spec.ts`
- `tests/e2e/parent-policy-acceptance-d2b.spec.ts`
- `tests/classroom-activities/teacher-activity-student-answers.test.mjs`
- Various fixtures: `parent-report-api-body-e2e.mjs`, `parent-report-pipeline.mjs`, etc.

---

### 2B. School Portal — What Exists Today

#### 2B.1 Pages

| Route | Purpose |
|---|---|
| `/school/dashboard` | Stats (teachers, students, classes, activities), alerts, quick links, recent activities |
| `/school/teachers` | List teachers with subject assignments, class counts |
| `/school/teachers/[teacherId]` | Teacher detail with classes and subjects |
| `/school/classes` | List physical classes, assign teachers |
| `/school/students` | Browse enrolled students by grade/physical class, view reports, enroll students |

**Navigation:** Dashboard, Teachers, Classes, Students. No messaging nav. No accounts nav.

#### 2B.2 Student Card in School Portal

- Students are browsed on `/school/students` by grade → physical class → student list.
- Clicking a student opens `SchoolReportModal` which shows learning report data.
- There is **no "Access & Accounts" section** in the student card today.
- There is **no school-level credential management** for students or parents in the school portal.

#### 2B.3 APIs

| Route | Method | Purpose |
|---|---|---|
| `/api/school/me` | GET | School context, stats, manager info |
| `/api/school/dashboard` | GET | Dashboard data |
| `/api/school/audit-log` | GET | Audit events |
| `/api/school/activities` | GET | Recent school-wide activities |
| `/api/school/classes` | GET/POST | List/create physical classes |
| `/api/school/classes/[classId]/report-data` | GET | Physical class report |
| `/api/school/classes/[classId]/assign-teacher` | POST | Assign teacher to class |
| `/api/school/classes/[classId]/archive` | POST | Archive a class |
| `/api/school/classes/physical-report` | GET | Cross-class physical report |
| `/api/school/students` | GET/POST | List enrolled students / enroll a student |
| `/api/school/students/browse-summary` | GET | Grade/class counts for browse |
| `/api/school/students/[studentId]/report-data` | GET | Student learning report |
| `/api/school/students/[studentId]/enrollment` | GET/DELETE | Enrollment details |
| `/api/school/students/[studentId]/class-transfer` | POST | Transfer student to another class |
| `/api/school/teachers` | GET | List teachers |
| `/api/school/teachers/[teacherId]` | GET/PATCH | Teacher detail / update |
| `/api/school/teachers/[teacherId]/subjects` | GET/POST | List/add subjects |
| `/api/school/teachers/[teacherId]/subjects/[subjectId]` | DELETE | Remove subject |
| `/api/school/worksheet-activities` | GET | List worksheets |
| `/api/school/worksheet-activities/[worksheetId]/report` | GET | Worksheet report |

**No messaging APIs exist today in school portal.**
**No account management APIs exist today in school portal.**
**No teacher inbox exists today.**

#### 2B.4 Server Libraries

- `lib/school-server/school-request.server.js` — `requireSchoolManagerApiContext()`: validates teacher JWT, checks `school_admin` role, loads school account. This is the single auth gate for all school APIs.
- `lib/school-server/school-scope.server.js` — `verifyStudentVisibleToSchool()`, `resolveSchoolReportTeacherForStudent()`.
- `lib/school-server/school-membership.server.js` — `loadTeacherSchoolMembership()`, `teacherHasActiveAssignments()`.
- `lib/school-server/school-students.server.js` — student enrollment, listing by physical class.
- `lib/school-server/school-reports.server.js` — student/class report audit.
- `lib/school-server/school-operations.server.js` — operational actions (class transfer, archive, etc.).

#### 2B.5 DB Tables Supporting School Portal

| Table | Purpose |
|---|---|
| `school_accounts` | School record (id, name, country_code, contact_email, city, max_teachers, is_active) |
| `school_teacher_memberships` | teacher ↔ school link; role: 'teacher' or 'school_admin'; subjects_locked |
| `school_teacher_subjects` | Subject assignments per teacher per school |
| `school_student_enrollments` | Student ↔ school link (soft delete via unenrolled_at) |
| `teacher_classes` | Teacher classes (now has school_id FK) |
| `classroom_activities` | Classroom activities (now has school_id FK) |
| `student_activities` | Student activities (now has school_id FK) |
| `admin_audit_log` | Platform admin audit |
| `teacher_access_audit` | Teacher/school manager action audit |

**Missing from school portal DB:**
- No `school_code` field on `school_accounts`.
- No school-scoped messaging tables.
- No school-scoped parent/student account tracking.
- No read receipt tables.
- No teacher-directed school message delivery.
- No `must_change_pin` flag for parent accounts.

#### 2B.6 Components

- `SchoolPortalShell` — layout shell with nav.
- `SchoolPortalUi` — stat cards, quick action cards, section headers, buttons.
- `SchoolDrillDown` — `SchoolStudentCard`, `SchoolManagementCard`, loading/error states, breadcrumb.
- `SchoolReportModal` / `SchoolReportModalBody` — student report modal.
- `SchoolTeacherDetailContent/Modal` — teacher detail.
- `SchoolTeacherClassStudentsModal` — class students list.
- `SchoolTeacherPhysicalClassPickerModal` — physical class picker.
- `SchoolSubjectSelect` — subject selection dropdown.

#### 2B.7 Current Permission Model

Access gate: `requireSchoolManagerApiContext()` checks `school_admin` role in `school_teacher_memberships`.
No finer-grained school permissions exist. No secretary/staff role. No homeroom-teacher permission scope.

#### 2B.8 Tests (School Portal)

- `tests/e2e/demo-school-simulation-smoke.spec.ts` — school simulation smoke test.
- `tests/e2e/school-physical-class-report.spec.ts` — physical class report test.
- `tests/e2e/school-portal-security-smoke.spec.ts` — school portal security smoke test.

---

## 3. Gap Analysis

### What Is Missing

| Area | Gap |
|---|---|
| School code | `school_accounts` has no `school_code` column for username prefix |
| School-level student access | No school portal API or UI to create/view/reset student credentials |
| School-level parent access | No school portal API or UI to create/view/reset parent credentials |
| Account status visibility | School manager cannot see if a student/parent has an account or when they last logged in |
| Mandatory first-login PIN change | No `must_change_pin` flag; school-issued parent credentials can stay on temporary PIN indefinitely |
| School → parent messaging | No school → parent messaging tables, APIs, or UI |
| School → teacher messaging | No school → teacher messaging; teachers have no school message inbox |
| Teacher staff inbox | Teachers have no way to receive school manager messages |
| Teacher read receipts | No read receipt system for any teacher-directed message |
| Message types | No support for important/urgent/read-confirmation message types |
| Teacher messaging in school context | Existing `teacher_parent_messages` is teacher-scope only, not school-aware |
| Parent inbox (school context) | No parent-facing inbox for school messages |
| Parent mini-report | No short summary report for parents in school context |
| Read receipts | No recipient tracking on any message type |
| Message targeting — parents | No audience selection (all parents, by grade, by class, specific parent) |
| Message targeting — teachers | No teacher targeting (all teachers, by grade, by subject, by class team, specific teacher) |
| School nav | No Messages or Accounts navigation item in school portal |
| School secretary role | No role between school_admin and teacher for account-only staff |
| Student portal (school context) | No student-facing school messages |
| Multi-child parent support | Parent dashboard supports multiple children; school context must match |
| Dashboard counters | No unread/important message counters |

### What Can Be Reused

| Existing Piece | How to Reuse |
|---|---|
| `teacher-access-prefix.server.js` | Port `allocateTeacherAccessUsername` to school scope (swap teacher prefix for school code) |
| `student_guardian_access` table | School-created parent access rows go in same table; add `created_by_school_id` and `must_change_pin` columns |
| `student_access_codes` table | School-created student access rows go in same table; add `created_by_school_id` column |
| `guardian-crypto.server.js` | All PIN/hash logic is reusable with no changes |
| `buildTeacherStudentReportPayload` | Already used by school portal; reuse for mini-report too |
| `teacher_parent_messages` | Extend or parallel-use for teacher→parent in school context; teacher still creates messages |
| `teacher_access_audit` | Extend action allowlist for school account management events |
| `requireSchoolManagerApiContext` | Base auth gate for all new school manager APIs |
| `requireTeacherApiContext` (teacher APIs) | Base auth gate for teacher inbox and teacher school message APIs |
| `SchoolPortalShell` nav | Add Messages nav item |
| `SchoolDrillDown` components | Add Access & Accounts tab to existing student modal |
| `SchoolReportModal` | Extend to two-tab modal: Report + Access & Accounts |
| `GuardianAccessPanel` / `StudentLoginAccessPanel` | Adapt for school portal (different API routes, same UX pattern) |
| Parent report page `/learning/parent-report` | School context can link or embed this for parent mini-report |

### What Cannot Be Reused / Must Be New

| Area | Reason |
|---|---|
| School → parent messaging | Entirely new: audience targeting, message types, read receipts — teacher_parent_messages is per-student-per-teacher only |
| School → teacher messaging | Entirely new: no teacher-directed school message exists anywhere in the system |
| Teacher staff inbox | New UI section in teacher portal; teachers currently have no school message inbox |
| Parent school inbox | New: parent currently sees only learning data and credentials |
| Read receipt tracking | New tables required |
| Message audience resolution | New: resolving "all teachers of grade 3" or "all parents of class 3B" requires joining multiple tables |
| School code allocation | Similar to teacher prefix logic, but on `school_accounts` |

---

## 4. Proposed Architecture

### 4.1 System Boundary

```
┌─────────────────────────────────────────────────────────────────────┐
│                    School Portal (school_admin)                     │
│   Dashboard │ Teachers │ Classes │ Students │ Messages              │
└────────┬────────────────────────────────────────────────────────────┘
         │  school-scoped APIs (requireSchoolManagerApiContext)
         ▼
┌──────────────────────────────────────┐
│         Service Role Layer           │
│  school-request.server.js            │
│  school-messaging.server.js (NEW)    │
│  school-accounts.server.js (NEW)     │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                          Supabase DB                             │
│  school_accounts (+ school_code)                                 │
│  school_messages (NEW)                                           │
│  school_message_recipients (NEW)                                 │
│  school_message_read_receipts (NEW)                              │
│  student_guardian_access (+ created_by_school_id, must_change_pin)│
│  student_access_codes (+ created_by_school_id)                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     Parent Portal (Supabase Auth)                │
│  /parent/dashboard (existing)                                    │
│  /parent/school-inbox (NEW) — school messages + read receipts   │
│  /parent/mini-report (NEW or enhanced dashboard)                 │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                  Teacher Portal (teacher JWT)                    │
│  /teacher/* (existing — unchanged)                              │
│  /teacher/school-messages (NEW) — teacher receives school msgs  │
│  teacher_parent_messages: extended with school_id               │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 School Code Architecture

- Each `school_accounts` row gets a `school_code` column (3-4 lowercase letters, unique).
- School code is assigned at school creation and never changes.
- The school code is the username namespace for all school-issued credentials.
- School-issued parent username: `{school_code}-p{sequence}` (e.g., `leo-p0152`)
- School-issued student username: `{school_code}-s{sequence}` (e.g., `leo-s0152`)
- Format matches the existing teacher prefix format, extended with 4-digit padding.
- Zero-padded sequences (4 digits) to accommodate larger schools.
- **Permissions are never derived from username pattern** — all authorization uses DB relations.

### 4.3 Account Management Architecture

Two existing tables are extended with `created_by_school_id`:
- `student_guardian_access` — for school-issued parent access. Also receives `must_change_pin` boolean.
- `student_access_codes` — for school-issued student access.

This allows school manager to manage accounts for all enrolled students without conflicting with teacher-issued accounts.

One parent may have accounts linked to multiple children (via `student_guardian_access` rows for each `student_id`). The parent's username can be reused across children — the system supports one `student_guardian_access` row per student-parent pair, with the same username.

Account status is computed from: `is_active`, `revoked_at`, `expires_at`, and last session timestamp from `student_guardian_sessions`.

### 4.4 Messaging Architecture

School-level messaging uses new tables:
- `school_messages` — the message record (author, type, content, audience_type, school_id).
- `school_message_recipients` — fan-out: one row per resolved recipient (parent Supabase Auth user ID **or** teacher Supabase Auth user ID). Both parents and teachers are Supabase Auth users; both can appear as recipients.
- `school_message_read_receipts` — one row per recipient per message when read.

Teacher-to-parent messaging in school context reuses the existing `teacher_parent_messages` table, extended with `school_id` (nullable, FK to `school_accounts`).

Message audience resolution happens at send time: the API resolves the audience by querying `school_student_enrollments`, `teacher_class_students`, `student_guardian_access`, and `school_teacher_memberships`, then fans out into `school_message_recipients`.

---

## 5. Data Model Proposal

**DO NOT RUN. Owner applies manually.**

### 5.1 Migration 030 — School Code on school_accounts

```sql
-- 030_school_code.sql
-- Add school_code (3-4 lowercase letters) to school_accounts.
-- Unique, assigned once, never changes.

BEGIN;

ALTER TABLE public.school_accounts
  ADD COLUMN IF NOT EXISTS school_code text
    CHECK (
      school_code IS NULL
      OR (char_length(school_code) BETWEEN 3 AND 4
          AND school_code ~ '^[a-z]{3,4}$')
    );

CREATE UNIQUE INDEX IF NOT EXISTS school_accounts_school_code_uq
  ON public.school_accounts (school_code)
  WHERE school_code IS NOT NULL;

COMMENT ON COLUMN public.school_accounts.school_code IS
  'Stable 3-4 letter lowercase school code for username namespacing ({code}-p{seq}, {code}-s{seq}). Assigned once at school creation. Do not change after accounts exist.';

COMMIT;
```

**Rollback:** `ALTER TABLE school_accounts DROP COLUMN school_code;` (safe if no accounts yet use this column).

### 5.2 Migration 031 — School-Created Credentials + must_change_pin

```sql
-- 031_school_account_management.sql
-- Extend student_guardian_access and student_access_codes with school origin tracking.
-- Adds must_change_pin for school-issued parent accounts (mandatory first-login change).

BEGIN;

-- Parent access: track school-created rows
ALTER TABLE public.student_guardian_access
  ADD COLUMN IF NOT EXISTS created_by_school_id uuid
    REFERENCES public.school_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS student_guardian_access_school_idx
  ON public.student_guardian_access (created_by_school_id)
  WHERE created_by_school_id IS NOT NULL;

-- Parent access: mandatory first-login PIN change flag
-- true  = parent must change PIN on first login (set by school on create/reset)
-- false = no forced change required (default, also set after parent completes change)
ALTER TABLE public.student_guardian_access
  ADD COLUMN IF NOT EXISTS must_change_pin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.student_guardian_access.must_change_pin IS
  'When true, parent is required to change their PIN on first login. Set to true by school account management create/reset APIs. Reset to false after parent completes change.';

-- Student access: track school-created rows
ALTER TABLE public.student_access_codes
  ADD COLUMN IF NOT EXISTS created_by_school_id uuid
    REFERENCES public.school_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS student_access_codes_school_idx
  ON public.student_access_codes (created_by_school_id)
  WHERE created_by_school_id IS NOT NULL;

-- Sequence counter for school-issued credentials (avoids table scans on large schools)
CREATE TABLE IF NOT EXISTS public.school_credential_sequences (
  school_id   uuid PRIMARY KEY
                REFERENCES public.school_accounts(id) ON DELETE CASCADE,
  next_parent_seq integer NOT NULL DEFAULT 1
    CHECK (next_parent_seq >= 1),
  next_student_seq integer NOT NULL DEFAULT 1
    CHECK (next_student_seq >= 1),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.school_credential_sequences IS
  'Monotonic sequence counters for school-issued credentials. Prevents gap-scan on large tables. Updated atomically via service role only.';

ALTER TABLE public.school_credential_sequences ENABLE ROW LEVEL SECURITY;
-- No authenticated policies. Service role only.

COMMIT;
```

**Rollback:**
```sql
ALTER TABLE student_guardian_access DROP COLUMN created_by_school_id;
ALTER TABLE student_guardian_access DROP COLUMN must_change_pin;
ALTER TABLE student_access_codes DROP COLUMN created_by_school_id;
DROP TABLE IF EXISTS school_credential_sequences;
```

**Compatibility:** No existing rows are affected; columns are nullable or have defaults. Existing teacher-created accounts remain unaffected (their `must_change_pin` defaults to false).

### 5.3 Migration 032 — School Messaging Tables

```sql
-- 032_school_messaging.sql
-- School-level messaging system.
-- Append-only message history. Fan-out to recipients (parents AND teachers).
-- Read receipts for both recipient types.

BEGIN;

CREATE TABLE IF NOT EXISTS public.school_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       uuid        NOT NULL
                                REFERENCES public.school_accounts(id) ON DELETE CASCADE,
  author_id       uuid        NOT NULL
                                REFERENCES public.teacher_profiles(id) ON DELETE RESTRICT,
  -- audience_type: who receives this message
  audience_type   text        NOT NULL
    CHECK (audience_type IN (
      -- parent audiences
      'all_parents',
      'grade_parents',
      'class_parents',
      'specific_parent',
      -- teacher audiences
      'all_teachers',
      'grade_teachers',
      'subject_teachers',
      'class_teachers',
      'specific_teacher',
      -- homeroom-teacher-initiated (restricted scope, Phase 3)
      'homeroom_class_parents',
      'homeroom_student_parent'
    )),
  -- audience_scope: JSON with gradeLevel, physicalClassName, teacherId, parentUserId, subjectKey
  audience_scope  jsonb       NOT NULL DEFAULT '{}',
  message_type    text        NOT NULL DEFAULT 'regular'
    CHECK (message_type IN (
      'regular',
      'important',
      'urgent',
      'requires_confirmation',
      'requires_response',
      'pinned',
      'archived'
    )),
  subject         text        NULL
    CHECK (subject IS NULL OR char_length(trim(subject)) BETWEEN 1 AND 200),
  body            text        NOT NULL
    CHECK (char_length(trim(body)) BETWEEN 1 AND 4000),
  has_attachment  boolean     NOT NULL DEFAULT false,
  attachment_url  text        NULL
    CHECK (attachment_url IS NULL OR char_length(attachment_url) <= 2000),
  is_hidden       boolean     NOT NULL DEFAULT false,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS school_messages_school_sent_idx
  ON public.school_messages (school_id, sent_at DESC)
  WHERE is_hidden = false;

CREATE INDEX IF NOT EXISTS school_messages_author_idx
  ON public.school_messages (author_id, sent_at DESC);

-- Index for teacher-directed messages
CREATE INDEX IF NOT EXISTS school_messages_teacher_audience_idx
  ON public.school_messages (school_id, audience_type, sent_at DESC)
  WHERE audience_type IN ('all_teachers','grade_teachers','subject_teachers','class_teachers','specific_teacher')
    AND is_hidden = false;

ALTER TABLE public.school_messages ENABLE ROW LEVEL SECURITY;
-- No authenticated policies. Service role only.

COMMENT ON TABLE public.school_messages IS
  'Append-only school communication records. Supports both parent and teacher audiences. Mutations via service-role APIs only. is_hidden = soft delete.';

-- Fan-out: one row per resolved recipient (parent or teacher)
CREATE TABLE IF NOT EXISTS public.school_message_recipients (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      uuid        NOT NULL
                                REFERENCES public.school_messages(id) ON DELETE CASCADE,
  -- recipient is a Supabase auth user (parent or teacher)
  recipient_user_id uuid      NOT NULL,
  recipient_type  text        NOT NULL
    CHECK (recipient_type IN ('parent', 'teacher')),
  -- denormalized for display; source of truth is auth.users
  recipient_display_name text NULL,
  -- student context (for parent recipients)
  student_id      uuid        NULL
                                REFERENCES public.students(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS school_message_recipients_msg_user_uq
  ON public.school_message_recipients (message_id, recipient_user_id);

CREATE INDEX IF NOT EXISTS school_message_recipients_user_msg_idx
  ON public.school_message_recipients (recipient_user_id, message_id);

CREATE INDEX IF NOT EXISTS school_message_recipients_msg_idx
  ON public.school_message_recipients (message_id);

-- Index for teacher recipients (teacher inbox queries)
CREATE INDEX IF NOT EXISTS school_message_recipients_teacher_idx
  ON public.school_message_recipients (recipient_user_id)
  WHERE recipient_type = 'teacher';

ALTER TABLE public.school_message_recipients ENABLE ROW LEVEL SECURITY;
-- No authenticated policies. Service role only.

-- Read receipts (shared for parent and teacher recipients)
CREATE TABLE IF NOT EXISTS public.school_message_read_receipts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      uuid        NOT NULL
                                REFERENCES public.school_messages(id) ON DELETE CASCADE,
  recipient_user_id uuid      NOT NULL,
  read_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS school_message_read_receipts_uq
  ON public.school_message_read_receipts (message_id, recipient_user_id);

CREATE INDEX IF NOT EXISTS school_message_read_receipts_msg_idx
  ON public.school_message_read_receipts (message_id);

CREATE INDEX IF NOT EXISTS school_message_read_receipts_user_idx
  ON public.school_message_read_receipts (recipient_user_id);

ALTER TABLE public.school_message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Both parents AND teachers (authenticated Supabase users) can INSERT their own read receipt
DROP POLICY IF EXISTS school_message_read_receipts_self_insert ON public.school_message_read_receipts;
CREATE POLICY school_message_read_receipts_self_insert
  ON public.school_message_read_receipts
  FOR INSERT
  TO authenticated
  WITH CHECK (recipient_user_id = auth.uid());

-- Both parents AND teachers can SELECT their own read receipts
DROP POLICY IF EXISTS school_message_read_receipts_self_select ON public.school_message_read_receipts;
CREATE POLICY school_message_read_receipts_self_select
  ON public.school_message_read_receipts
  FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

COMMIT;
```

**Rollback:**
```sql
DROP TABLE IF EXISTS school_message_read_receipts;
DROP TABLE IF EXISTS school_message_recipients;
DROP TABLE IF EXISTS school_messages;
```

**Migration order:** 032 requires 030 and 031 applied first.

### 5.4 Migration 033 — Teacher Messages Extended with School Context

```sql
-- 033_teacher_parent_messages_school_context.sql
-- Extend teacher_parent_messages with school_id for school-context filtering.

BEGIN;

ALTER TABLE public.teacher_parent_messages
  ADD COLUMN IF NOT EXISTS school_id uuid
    REFERENCES public.school_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS teacher_parent_messages_school_student_idx
  ON public.teacher_parent_messages (school_id, student_id, created_at DESC)
  WHERE is_hidden = false AND school_id IS NOT NULL;

-- Backfill: set school_id for existing messages where teacher belongs to a school
UPDATE public.teacher_parent_messages tpm
  SET school_id = tp.school_id
  FROM public.teacher_profiles tp
  WHERE tpm.teacher_id = tp.id
    AND tp.school_id IS NOT NULL
    AND tpm.school_id IS NULL;

COMMIT;
```

**Rollback:** `ALTER TABLE teacher_parent_messages DROP COLUMN school_id;`

### 5.5 Migration 034 — Audit Actions for Account Management and Messaging

```sql
-- 034_school_account_audit_actions.sql
-- Extend teacher_access_audit action CHECK for school account management and messaging events.
-- Requires 028_school_operational_audit_actions.sql applied first.

BEGIN;

ALTER TABLE public.teacher_access_audit
  DROP CONSTRAINT IF EXISTS teacher_access_audit_action_chk;

ALTER TABLE public.teacher_access_audit
  ADD CONSTRAINT teacher_access_audit_action_chk CHECK (action IN (
    -- existing actions (all preserved from 028) --
    'grant_created', 'grant_revoked', 'grant_expired',
    'pin_rotated', 'username_rotated',
    'magic_link_sent', 'magic_link_consumed', 'magic_link_expired',
    'guardian_login_success', 'guardian_login_failed', 'guardian_logout',
    'teacher_link_created', 'teacher_link_archived', 'teacher_onboarded',
    'class_created', 'class_archived', 'class_updated',
    'class_member_added', 'class_member_removed',
    'viewed_student_report', 'viewed_class_report',
    'link_created', 'link_archived', 'link_consent_failed', 'link_limit_reached',
    'consent_issued', 'consent_revoked', 'magic_link_issued',
    'student_created_by_teacher', 'student_name_updated',
    'activity_created', 'activity_activated', 'activity_paused',
    'activity_closed', 'activity_archived',
    'school_subject_granted', 'school_subject_revoked',
    'school_student_enrolled', 'school_student_unenrolled',
    'school_class_viewed', 'school_student_report_viewed',
    'school_student_class_transferred', 'school_class_teacher_reassigned',
    'school_class_archived',
    -- school account management actions --
    'school_student_access_created',
    'school_student_access_revoked',
    'school_student_pin_rotated',
    'school_student_access_blocked',
    'school_student_access_unblocked',
    'school_parent_access_created',
    'school_parent_access_revoked',
    'school_parent_pin_rotated',
    'school_parent_access_blocked',
    'school_parent_access_unblocked',
    'school_parent_linked_to_student',
    'school_parent_unlinked_from_student',
    'school_parent_pin_changed_by_parent',
    -- school messaging actions --
    'school_message_sent',
    'school_message_hidden',
    'school_message_read'
  ));

COMMIT;
```

### 5.6 Full Table Summary After All Migrations

| Table | Migration | Purpose |
|---|---|---|
| `school_accounts` | 025 + 027 + **030** | School record + school_code |
| `school_teacher_memberships` | 025 + 027 | Teacher ↔ school membership |
| `school_teacher_subjects` | 027 | Subject assignments |
| `school_student_enrollments` | 027 | Student ↔ school enrollment |
| `school_credential_sequences` | **031** | Monotonic counters for school-issued credentials |
| `school_messages` | **032** | School communication messages (parents + teachers) |
| `school_message_recipients` | **032** | Fan-out recipient list (parents + teachers) |
| `school_message_read_receipts` | **032** | Read receipt tracking (parents + teachers) |
| `student_guardian_access` | 019 + **031** | Parent/guardian access + created_by_school_id + must_change_pin |
| `student_access_codes` | 001/015 + **031** | Student access codes + created_by_school_id |
| `teacher_parent_messages` | 023 + **033** | Teacher→parent messages + school_id |
| `teacher_access_audit` | 019 + 021 + 024 + 027 + 028 + **034** | Audit log |

### 5.7 RLS Summary

| Table | RLS Policy |
|---|---|
| `school_messages` | Service role only (no authenticated policies) |
| `school_message_recipients` | Service role only |
| `school_message_read_receipts` | Any authenticated user can INSERT/SELECT own row (covers both parents and teachers) |
| `school_credential_sequences` | Service role only |
| `student_guardian_access` (new columns) | Inherits existing RLS (service role only) |
| `student_access_codes` (new column) | Inherits existing RLS (service role only) |

---

## 6. API Proposal

All new school APIs follow the existing pattern: bearer JWT, `requireSchoolManagerApiContext()` for school manager APIs, and `requireTeacherApiContext()` for teacher-side APIs.

### 6.1 School Account Management APIs

```
GET  /api/school/students/[studentId]/accounts
     Returns student login account status + parent accounts for this student.
     Response: { studentAccess: {...}, parentAccesses: [...] }

POST /api/school/students/[studentId]/accounts/student/create
     Create school-issued student login (auto-generates username + PIN).
     Response: { loginUsername, loginPinOnce }

POST /api/school/students/[studentId]/accounts/student/reset-pin
     Reset student PIN. Returns new PIN once.

POST /api/school/students/[studentId]/accounts/student/block
POST /api/school/students/[studentId]/accounts/student/unblock

POST /api/school/students/[studentId]/accounts/student/revoke

POST /api/school/students/[studentId]/accounts/parent/create
     Create new school-issued parent access (auto-generates username + 6-digit PIN).
     Body: { relation: 'father'|'mother'|'guardian'|'other', displayName?: string }
     Response: { loginUsername, loginPinOnce, mustChangePinOnFirstLogin: true }

POST /api/school/students/[studentId]/accounts/parent/[accessId]/reset-pin
     Reset parent PIN. Sets must_change_pin = true on the access row.
     Response: { loginPinOnce, mustChangePinOnFirstLogin: true }

POST /api/school/students/[studentId]/accounts/parent/[accessId]/block
POST /api/school/students/[studentId]/accounts/parent/[accessId]/unblock

POST /api/school/students/[studentId]/accounts/parent/[accessId]/revoke

POST /api/school/students/[studentId]/accounts/parent/link
     Link an existing parent access (by username) to this student.

POST /api/school/students/[studentId]/accounts/parent/[accessId]/unlink
```

### 6.2 School Messaging APIs (Manager — to Parents and Teachers)

```
GET  /api/school/messages
     List sent messages (paginated, filtered by type/date/audience).
     Response: { messages: [...], total, nextCursor }

POST /api/school/messages
     Send a new message to parents or teachers.
     Body: { audienceType, audienceScope, messageType, subject, body, hasAttachment, attachmentUrl }
     Response: { messageId, recipientCount, recipientTypes: ['parent'|'teacher'] }

GET  /api/school/messages/[messageId]
     Get message detail + recipient list + read counts (broken down by parent/teacher).

POST /api/school/messages/[messageId]/hide

GET  /api/school/messages/[messageId]/recipients
     List all recipients with read status.
     Query: recipientType (optional: 'parent'|'teacher')

GET  /api/school/messages/[messageId]/unread-recipients
     List recipients who have NOT read the message.
     Query: recipientType (optional filter)

GET  /api/school/messages/audience-preview
     Resolve audience size/names before sending.
     Query: audienceType, gradeLevel, physicalClassName, subjectKey, teacherId, ...
     Response: { recipientCount, recipientType, preview: [...first 10...] }
```

### 6.3 Teacher Messaging APIs (School Context — to Parents)

```
GET  /api/teacher/students/[studentId]/parent-messages
     (existing — unchanged, returns teacher's messages for this student)

POST /api/teacher/students/[studentId]/parent-messages
     (existing — school_id auto-populated from teacher's school_id on send)

GET  /api/school/students/[studentId]/parent-messages
     School manager view: all teacher messages for this student across all teachers.
     Query: teacherId (optional filter), includeHidden
```

### 6.4 Teacher Staff Inbox APIs (Teacher Receives School Messages)

```
GET  /api/teacher/school-messages
     List school messages addressed to this teacher (by auth.uid()).
     Requires teacher JWT.
     Response: { messages: [...], unreadCount }
     -- Messages are fetched from school_message_recipients WHERE recipient_user_id = teacherId

GET  /api/teacher/school-messages/[messageId]
     Get full school message body for this teacher.

POST /api/teacher/school-messages/[messageId]/read
     Teacher marks message as read.
     Inserts into school_message_read_receipts (idempotent).

GET  /api/teacher/school-messages/unread-count
     Returns { unreadCount } for badge in teacher portal header.
```

### 6.5 Parent Inbox APIs (School Context)

```
GET  /api/parent/school-messages
     List school messages addressed to this parent (by auth.uid()).
     Requires Supabase Auth parent session.
     Response: { messages: [...], unreadCount }

POST /api/parent/school-messages/[messageId]/read
     Mark a message as read (inserts into school_message_read_receipts).

GET  /api/parent/school-messages/[messageId]
     Get full message body.
```

### 6.6 Parent First-Login PIN Change API

```
POST /api/guardian/change-pin
     Parent changes their temporary PIN to a new self-chosen PIN.
     Requires guardian session (custom cookie). Validates old PIN (or must_change_pin=true bypass).
     Body: { newPin }
     On success: sets must_change_pin = false in student_guardian_access.
```

### 6.7 School Dashboard Stats API (Extended)

```
GET  /api/school/me
     (existing — extend response to include):
     stats.unreadParentMessageCount
     stats.unreadTeacherMessageCount
     stats.importantActiveMessageCount
```

### 6.8 School Audit Log

```
GET  /api/school/audit-log
     (existing — extend to include account management and messaging events)
```

---

## 7. UI / Page / Component Proposal

### 7.1 School Portal Navigation (Extended)

Current nav: Dashboard | Teachers | Classes | Students

Proposed nav (Phase 1+): Dashboard | Teachers | Classes | Students | **Messages**

Account management is accessed from within the student card (not a top-level nav item).

### 7.2 Student Card — Access & Accounts Design Decision

**Design decision: Two-tab modal inside the existing SchoolReportModal.**

The student report modal (`SchoolReportModal`) is extended with a second tab:
- **Tab 1: דוח לימודי** (Learning Report) — existing content, unchanged.
- **Tab 2: גישה וחשבונות** (Access & Accounts) — new content.

**Rationale for this design:**
- Avoids creating a new standalone student profile page (which would require separate routing and loading logic).
- Keeps student data management coherent in one place (the manager is already looking at a specific student when they need to manage credentials).
- Consistent with the existing modal pattern used for all student interactions in the school portal.
- Avoids overloading the student list/card with extra actions; accounts are one click from any student.
- Two tabs is a clean, non-confusing structure that users understand immediately.

**Why NOT a separate page:** A dedicated `/school/students/[studentId]/accounts` page would add routing complexity, break the browse-select-manage flow, and fragment the student management UX across two surfaces.

**Why NOT a section below the report:** Stacking accounts below report data in the same scrollable modal would make the modal too long and mix learning analytics with credential management.

**Tab 2 — Access & Accounts content:**

```
[Student Name / Class]
[Tab: דוח לימודי] [Tab: גישה וחשבונות ← active]

─── חשבון תלמיד ────────────────────────────────

  שם משתמש: leo-s0014
  סטטוס: פעיל | חסום | לא נוצר
  כניסה אחרונה: לפני 3 ימים | מעולם לא
  [צור חשבון] [איפוס PIN] [העתק פרטים] [חסום] [בטל חסימה]
  * PIN מוצג פעם אחת לאחר יצירה/איפוס, לאחר מכן מוסתר *

─── חשבונות הורים ──────────────────────────────

  [ + הוסף גישת הורה ]   [ חבר הורה קיים ]

  הורה 1:
    שם: [שם הורה]
    קשר: אמא
    שם משתמש: leo-p0014
    סטטוס: פעיל
    כניסה אחרונה: לפני יום
    שינוי PIN בכניסה ראשונה: הושלם
    [איפוס PIN] [העתק] [חסום] [נתק מתלמיד]

  הורה 2:
    שם: [שם הורה]
    קשר: אבא
    שם משתמש: לא נוצר
    [צור חשבון]
```

**New components:**
- `components/school-portal/SchoolStudentAccessPanel.jsx` — full Access & Accounts tab content.
- `components/school-portal/SchoolStudentParentAccessRow.jsx` — one parent access row with actions.
- `components/school-portal/SchoolCredentialShownOnceBox.jsx` — shown-once credential display (reuses pattern from teacher panels).

**Modification:**
- `components/school-portal/SchoolReportModal.jsx` — add tab navigation at top; render either `SchoolReportModalBody` (existing) or `SchoolStudentAccessPanel` (new) based on active tab.

### 7.3 School Messages Page (Phase 2)

**Route:** `/school/messages`

**Sections:**
- Compose button → opens compose modal/drawer.
- Sent messages list (paginated, filterable by type, date, audience type: parents/teachers).
- Message row: audience type badge, recipient count, read count / total, type badge, subject, date.
- Click message → open detail with recipient list and per-recipient read status.

**Compose modal — audience picker flow:**

For parent audiences:
1. Select: All parents / By grade / By class / Specific parent.
2. If grade: grade level picker.
3. If class: grade + physical class picker (reuses `SchoolTeacherPhysicalClassPickerModal`).
4. If specific parent: search by name/username.

For teacher audiences:
1. Select: All teachers / By grade / By subject / Physical-class teaching team / Specific teacher.
2. If grade: grade level picker.
3. If subject: subject picker (reuses `SchoolSubjectSelect`).
4. If class team: grade + physical class picker.
5. If specific teacher: search by name from teacher list.

Preview count before sending in both flows.

**New components:**
- `components/school-portal/SchoolMessagesPage.jsx` — page shell.
- `components/school-portal/SchoolComposeMessageModal.jsx` — compose form.
- `components/school-portal/SchoolAudiencePicker.jsx` — audience selection with parent/teacher switch.
- `components/school-portal/SchoolMessageRow.jsx` — list row.
- `components/school-portal/SchoolMessageDetailModal.jsx` — detail + recipient list.
- `components/school-portal/SchoolMessageReadReceiptPanel.jsx` — who read / who did not (filterable by recipient type).

### 7.4 Teacher Staff Inbox — School Messages (Phase 2)

**Where:** New section inside the existing teacher portal, accessible from teacher dashboard or nav.

**Route:** `/teacher/school-messages` (new page).

**Entry point:** Unread count badge in teacher portal header/nav. Teachers who have school membership see this section; teachers without school membership do not.

**Display logic:** Teacher sees all school messages where they are in `school_message_recipients`. This includes messages sent to `all_teachers`, `grade_teachers`, `subject_teachers`, `class_teachers`, or `specific_teacher`.

**Sections:**
- School messages inbox list (unread first, then by date).
- Message type badge (regular, important, urgent, requires confirmation).
- Click → full message body. Mark as read on open.
- Requires-confirmation: teacher must tap "קיבלתי" (Received) button.

**Teacher does NOT see:**
- Messages sent to parents.
- Messages from other schools.
- Peer teacher messages (teachers do not message each other through this system).

**New page/components:**
- `pages/teacher/school-messages.js` — teacher school inbox page.
- `components/teacher-portal/TeacherSchoolMessageList.jsx` — inbox list with type badges.
- `components/teacher-portal/TeacherSchoolMessageDetail.jsx` — full message view with mark-as-read.
- `components/teacher-portal/TeacherSchoolInboxBadge.jsx` — unread count badge for teacher nav.

**Modification:**
- `components/teacher-portal/TeacherPortalShell.jsx` — add school messages badge if teacher is a school member.

### 7.5 Parent Portal — School Inbox (Phase 2)

**Route:** `/parent/school-inbox` (new page).

**Sections:**
- School inbox: list of school messages (unread count badge).
- Message types: regular, important (yellow), urgent (red), requires confirmation.
- Each message: school name, date, subject/preview, read/unread indicator.
- Click → full message body. Mark as read on open.
- If multiple children: messages grouped by child or shown in unified inbox with child label.

**Enhanced parent dashboard:**
- Add link/section to school inbox from existing `/parent/dashboard`.
- Add mini-report card per child linking to school report.

**New pages/components:**
- `pages/parent/school-inbox.js` — school message inbox.
- `components/parent/ParentSchoolMessageList.jsx` — message list with type badges.
- `components/parent/ParentSchoolMessageDetail.jsx` — full message view.
- `components/parent/ParentSchoolInboxBadge.jsx` — unread count badge.

**First-login PIN change gate:**
- When parent logs in and `must_change_pin = true`, they are shown a mandatory PIN change screen before accessing school inbox or any other parent content.
- Component: `components/parent/ParentMustChangePinGate.jsx`.
- On completion: calls `POST /api/guardian/change-pin`, sets `must_change_pin = false`.

### 7.6 Parent Mini-Report in School Context (Phase 2)

**Approach:** Reuse `buildTeacherStudentReportPayload` (same as school portal student report).

**Short version for parents:**
- Child name + class.
- Subjects learned this month (icons/names).
- Overall accuracy per subject (simple bar or icon).
- 2-3 strength highlights.
- 1-2 areas needing practice.
- 1 short home recommendation.
- Last 3 teacher messages.
- Link to full report: `/learning/parent-report?studentId=...`.

**Route:** `/parent/mini-report?studentId=...` (new) OR embedded in parent dashboard as an expandable card.

**Component:** `components/parent/ParentMiniReportCard.jsx`.

**API:** `GET /api/parent/mini-report?studentId=...` — parent auth required; parent must own student.

### 7.7 School Dashboard — Message Counters (Phase 3)

**Extend school dashboard stats card area:**
- New stat card: Unread Parent Messages.
- New stat card: Unread Teacher Messages.
- New stat card: Important/Urgent Active.
- Quick link: "Compose Message" button from dashboard.

---

## 8. Permission Matrix

### 8.1 Roles

| Role | How Identified |
|---|---|
| Super Admin / Platform Owner | Platform-level admin flag (outside scope of this plan) |
| School Manager | `school_teacher_memberships.role = 'school_admin'` |
| School Secretary (future optional) | `school_teacher_memberships.role = 'school_secretary'` (new role value) |
| Homeroom Teacher | `school_teacher_memberships.role = 'teacher'` AND is the primary teacher of a physical class |
| Subject Teacher | `school_teacher_memberships.role = 'teacher'` AND has subject assignment but not primary class teacher |
| Parent | Supabase Auth user or guardian session with children linked to school-enrolled students |
| Student | Custom PIN session via `student_access_codes` |

### 8.2 Messaging Permissions — Sending

| Action | Super Admin | School Manager | School Secretary | Homeroom Teacher | Subject Teacher | Parent | Student |
|---|---|---|---|---|---|---|---|
| Send to all parents | Yes | Yes | No | No | No | No | No |
| Send to grade parents | Yes | Yes | No | No | No | No | No |
| Send to class parents | Yes | Yes | No | Yes (own class only, Phase 3) | No | No | No |
| Send to specific parent | Yes | Yes | No | Yes (own class only, Phase 3) | No | No | No |
| Send to all teachers | Yes | Yes | No | No | No | No | No |
| Send to grade teachers | Yes | Yes | No | No | No | No | No |
| Send to subject teachers | Yes | Yes | No | No | No | No | No |
| Send to class teaching team | Yes | Yes | No | No | No | No | No |
| Send to specific teacher | Yes | Yes | No | No | No | No | No |
| Send teacher→parent message | Yes | Yes | No | Yes (own class students) | Yes (own students only) | No | No |

### 8.3 Messaging Permissions — Receiving and Managing

| Action | Super Admin | School Manager | School Secretary | Homeroom Teacher | Subject Teacher | Parent | Student |
|---|---|---|---|---|---|---|---|
| Receive school messages (as teacher) | — | Yes (school_admin is also a teacher) | — | Yes | Yes | — | — |
| Receive school messages (as parent) | — | — | — | — | — | Yes | — |
| Mark message as read | — | — | — | Yes | Yes | Yes | — |
| View sent messages (school portal) | Yes | Yes | Yes | Own only | Own only | No | No |
| View read receipts | Yes | Yes | Yes | Own only | Own only | No | No |
| View who read / who did not | Yes | Yes | Yes | Own only | Own only | No | No |
| Hide/soft-delete message | Yes | Yes | No | Own only | No | No | No |

### 8.4 Account Management Permissions

| Action | Super Admin | School Manager | School Secretary | Homeroom Teacher | Subject Teacher | Parent | Student |
|---|---|---|---|---|---|---|---|
| Create student account | Yes | Yes | Yes (proposed) | Phase 3 candidate | No | Yes (self) | No |
| Reset student PIN | Yes | Yes | Yes (proposed) | Phase 3 candidate | No | Yes (own child) | No |
| Block/unblock student account | Yes | Yes | Yes (proposed) | No | No | No | No |
| Create parent account | Yes | Yes | Yes (proposed) | No | No | No | No |
| Reset parent PIN | Yes | Yes | Yes (proposed) | No | No | No | No |
| Block/unblock parent account | Yes | Yes | Yes (proposed) | No | No | No | No |
| Link parent to student | Yes | Yes | Yes (proposed) | No | No | No | No |
| Disconnect parent from student | Yes | Yes | Yes (proposed) | No | No | No | No |
| Change own PIN (first-login mandatory) | — | — | — | — | — | Yes | — |
| View own account | No | No | No | No | No | Yes | Yes |

### 8.5 Report / Data Permissions

| Action | Super Admin | School Manager | School Secretary | Homeroom Teacher | Subject Teacher | Parent | Student |
|---|---|---|---|---|---|---|---|
| View any student report | Yes | Yes | No | Own class only | Own students only | Own children only | Own only |
| View school-wide stats | Yes | Yes | Partial | No | No | No | No |
| View parent mini-report | Yes | Yes | No | No | No | Yes (own child) | No |

### 8.6 School Secretary Role (Phase 2 Optional)

- Add `'school_secretary'` to the `role` CHECK constraint in `school_teacher_memberships`.
- Secretary can manage accounts but cannot view learning reports or send messages.
- Requires new `requireSchoolStaffApiContext()` auth gate that allows both `school_admin` and `school_secretary`.

---

## 9. Username and PIN Strategy

### 9.1 School Code

- **Format:** 3-4 lowercase English letters (e.g., `leo`, `talp`, `kfar`).
- **Uniqueness:** Enforced by unique index on `school_accounts.school_code`.
- **Assignment:** At school creation, by platform admin. Not self-assigned by school.
- **Immutability:** Never changed after credentials exist. Special admin migration required if absolutely necessary (requires username rotation for all affected accounts).
- **Validation:** `^[a-z]{3,4}$`.

### 9.2 Student Username (School-Issued)

- **Format:** `{school_code}-s{sequence}` (e.g., `leo-s0152`).
- **Sequence:** Zero-padded to 4 digits. Sourced from `school_credential_sequences.next_student_seq`.
- **Allocation:** Atomic increment of `next_student_seq` at create time (service role only).
- **Uniqueness:** Checked against `student_access_codes` (normalized username) before issuing.
- **Same student:** If student already has an active username, school portal shows existing username and offers reset-PIN only.

### 9.3 Parent Username (School-Issued)

- **Format:** `{school_code}-p{sequence}` (e.g., `leo-p0152`).
- **Sequence:** Sourced from `school_credential_sequences.next_parent_seq`.
- **One parent, multiple children:** One username covers multiple children. Same `login_username` may appear in multiple `student_guardian_access` rows (one per child). Parent is identified by username; children are found by joining on `student_id`.
- **Existing parent account:** If a parent already has an account (teacher-issued), school manager sees the existing username and can reset PIN or link to additional children.

### 9.4 PIN Policy

| Credential | PIN Type | Length | First-Login Change |
|---|---|---|---|
| Student account | Numeric | 4 digits | Not required — student PIN is simpler |
| Parent account (school-issued) | Numeric | 6 digits | **Mandatory from Phase 1** — must_change_pin flag set on create/reset |
| Teacher account | Supabase Auth password | N/A | Supabase Auth handles this |

**Parent first-login PIN change — mandatory from Phase 1:**
- When school manager creates or resets a parent account, `must_change_pin = true` is set in `student_guardian_access`.
- On parent's next login, before accessing any portal content, they see a PIN-change screen (`ParentMustChangePinGate`).
- The gate calls `POST /api/guardian/change-pin` and sets `must_change_pin = false` on success.
- If the parent does not complete the change, they cannot access school inbox or mini-report.
- The existing PIN is the school-issued temporary PIN; the new PIN is chosen by the parent.
- The school manager does NOT know the parent's new PIN after the parent changes it.

**Security rules:**
- PIN is never stored in plaintext. Always hashed via `hashStudentSecret()`.
- Existing PIN is never displayed after creation.
- Temporary PIN is shown **once** immediately after creation or reset (shown-once box pattern).
- Forgotten PIN requires reset by school manager.

### 9.5 What the Existing System Already Handles

The crypto infrastructure in `lib/guardian-server/guardian-crypto.server.js` and the username allocation logic in `lib/teacher-server/teacher-access-prefix.server.js` are fully reusable. The school-scoped version needs:
- A new `allocateSchoolAccessUsername(serviceRole, schoolId, kind)` function (mirrors `allocateTeacherAccessUsername` but uses `school_accounts.school_code` and `school_credential_sequences`).
- The crypto functions remain identical.
- A new `generateSchoolParentPin()` function that generates 6 digits (extend or fork `generateStudentPin()`).

---

## 10. Messaging Strategy

### 10.1 Message Lifecycle

```
Compose → Select Audience → Preview Count → Send
       ↓
  Fan-out to school_message_recipients (parent rows + teacher rows)
       ↓
  [Parent sees in /parent/school-inbox]    [Teacher sees in /teacher/school-messages]
       ↓                                           ↓
  Opens message                             Opens message
  POST /api/parent/school-messages/read     POST /api/teacher/school-messages/read
       ↓                                           ↓
  Read receipt inserted (school_message_read_receipts)
       ↓
  Manager sees read_count / total_recipient_count in message detail
  Manager sees per-recipient-type breakdown (X/Y parents, A/B teachers)
```

### 10.2 Message Types and Phase

| Type | Phase | Applies To | Description |
|---|---|---|---|
| `regular` | Phase 2 | Parents + Teachers | Standard informational message |
| `important` | Phase 2 | Parents + Teachers | Highlighted; shown prominently in inbox |
| `urgent` | Phase 2 | Parents + Teachers | Highest priority; may trigger future notification |
| `requires_confirmation` | Phase 2 | Parents + Teachers | Must tap "Received" to dismiss |
| `requires_response` | Phase 3 | Parents | Parent must enter a text response |
| `pinned` | Phase 3 | Parents + Teachers | Pinned to top of inbox |
| `archived` | Phase 3 | Parents + Teachers | Moved to archive folder |

### 10.3 Complete Final Target Model

This section defines the **complete intended final target model** (Phases 2 and 3 combined). Each audience type is marked with the phase in which it becomes available.

#### Parent Target Audiences

| Audience Type | DB key | Phase | Resolution Logic |
|---|---|---|---|
| All school parents | `all_parents` | 2-initial | All active `student_guardian_access` rows + `students.parent_id` for school-enrolled students |
| By grade/layer | `grade_parents` | 2 | Filter by `students.grade_level` for enrolled students |
| By physical class | `class_parents` | 2 | Filter by `physical_class_name` in `teacher_classes` for enrolled students |
| Individual parent | `specific_parent` | 2 | Single `guardian_access_id` or parent Supabase Auth user ID |
| Future: dynamic groups | *(segment)* | Phase 4 | Parents of inactive students, learning support group, report-based filter |

#### Teacher Target Audiences

| Audience Type | DB key | Phase | Resolution Logic |
|---|---|---|---|
| All school teachers | `all_teachers` | 2 | All `school_teacher_memberships.teacher_id` for school |
| By grade/layer | `grade_teachers` | 2 | Teachers with `school_teacher_subjects.grade_level` matching |
| By subject | `subject_teachers` | 2 | Teachers with matching `subject` in `school_teacher_subjects` |
| Physical-class teaching team | `class_teachers` | 2 | Teachers assigned to specific physical class (all teachers of that class across subjects) |
| Individual teacher | `specific_teacher` | 2 | Single `teacher_id` in `school_teacher_memberships` |

#### Homeroom-Teacher-Initiated Audiences (Phase 3)

| Audience Type | DB key | Phase | Who Can Use | Resolution Logic |
|---|---|---|---|---|
| Homeroom class parents | `homeroom_class_parents` | 3 | Homeroom teacher of that class only | Parents of all students in teacher's physical class |
| Individual student's parent | `homeroom_student_parent` | 3 | Any teacher linked to that student | Parents of a specific student the teacher teaches |

**Phase 2 launch scope:** Start with `all_parents` and `all_teachers` only. Validate fan-out, delivery, and read receipt mechanics before expanding. Then add grade and class targeting. Teacher-initiated sending comes in Phase 3.

### 10.4 School Manager → Teacher Messaging (Dedicated Plan)

This section provides the full plan for the school manager messaging teachers.

#### What Can Be Sent

School manager can send the following to teacher audiences:
- General school announcements (all teachers).
- Grade/layer communications (teachers of grade 3, teachers of 4th grade, etc.).
- Subject-specific communications (math teachers, English teachers, etc.).
- Physical-class team communications (all teachers of class 3B).
- Private message to a specific teacher.

#### Teacher Recipient Model

Teachers are Supabase Auth users. Their `auth.users` ID is their teacher profile ID (`teacher_profiles.id`).

Fan-out uses the **same `school_message_recipients` table**, with `recipient_type = 'teacher'`. The `recipient_user_id` is the teacher's Supabase Auth user ID.

**Teacher audience resolution:**

- `all_teachers`: `SELECT teacher_id FROM school_teacher_memberships WHERE school_id = ? AND role IN ('teacher', 'school_admin')`
- `grade_teachers`: `SELECT DISTINCT teacher_id FROM school_teacher_subjects WHERE school_id = ? AND grade_level = ?`
- `subject_teachers`: `SELECT DISTINCT teacher_id FROM school_teacher_subjects WHERE school_id = ? AND subject = ?`
- `class_teachers`: `SELECT DISTINCT teacher_id FROM teacher_classes WHERE school_id = ? AND grade_level = ? AND name = ?` (all teachers whose class matches the physical class)
- `specific_teacher`: direct `teacher_id` from school membership

#### Teacher Staff Inbox UI

Located at: `/teacher/school-messages` (new page in teacher portal).

**Entry point:** Unread count badge in teacher portal nav, visible only to teachers who are members of a school.

**Inbox behavior:**
- Messages are listed newest first; unread messages are highlighted.
- Unread count badge clears as teacher opens messages.
- Marking as read: automatic on message open (POST to read receipt API).
- Requires-confirmation type: teacher must explicitly tap "קיבלתי" (Received).

**Teacher does NOT see:**
- Messages sent to parents.
- Messages from other schools.
- Messages from peer teachers (teachers do not message each other through this system).

**Teacher can:**
- View the full message.
- Mark as read.
- Tap confirmation for requires-confirmation type.
- See which school/manager sent the message.

**Teacher CANNOT:**
- Reply (Phase 1-3).
- Delete or hide messages.
- See other teachers' read status.

#### Read Receipts for Teacher Recipients

Same `school_message_read_receipts` table used for both parents and teachers.

School manager view of a message detail shows:
- **Parent receipts:** X of Y parents read.
- **Teacher receipts:** A of B teachers read.
- Both broken out separately in the UI.
- Manager can filter the recipient list by type (show only teachers / show only parents).

**Teacher unread dashboard:**

School manager dashboard (Phase 3) shows:
- Number of teachers who have not read the latest message sent to all teachers.
- Ability to see who specifically has not read (from message detail page).

#### Teacher Read Receipt API

```
POST /api/teacher/school-messages/[messageId]/read
     Teacher marks message as read.
     Requires teacher JWT. Validates that teacher is a recipient of this message.
     Inserts into school_message_read_receipts (idempotent).

GET  /api/school/messages/[messageId]/recipients?recipientType=teacher
     Manager views all teacher recipients with their read status.
```

### 10.5 Read Receipts (Parent and Teacher)

- When parent opens a message: `POST /api/parent/school-messages/[messageId]/read`.
- When teacher opens a message: `POST /api/teacher/school-messages/[messageId]/read`.
- Both insert into `school_message_read_receipts` (upsert — idempotent).
- Manager can see: `read_count / total_recipient_count` broken down by parent/teacher.
- Manager can list unread recipients: join `school_message_recipients` LEFT JOIN `school_message_read_receipts` WHERE `read_at IS NULL`.

### 10.6 What This Is NOT

This is **not free chat**. Specifically:
- No real-time chat.
- No reply threads (Phase 1-3).
- No parent-initiated messages.
- No teacher-to-teacher messages.
- No unsolicited teacher-parent DMs outside the school context.
- No unmoderated message channels.

Communication directions allowed:
- School manager → Parents (broadcast, targeted, individual).
- School manager → Teachers (broadcast, targeted, individual).
- Teacher → Parent (existing `teacher_parent_messages`, school-context aware, per-student).
- Homeroom teacher → Class parents (Phase 3, restricted scope).
- Parent → School: Only via `requires_response` type (Phase 3), not open chat.

---

## 11. Parent Mini-Report Strategy

### 11.1 Approach

Reuse `buildTeacherStudentReportPayload` already used by school portal. Create a **subset view** for parent mini-report:
- Filter to last 30 days.
- Show top 3-4 subjects with icons.
- Show accuracy per subject as a simple percentage bar.
- Show 2-3 strength highlights (from existing `recommendations` field).
- Show 1-2 areas needing practice.
- Show last 3 teacher messages from `teacher_parent_messages` (visible, not hidden).
- Link to full report: `/learning/parent-report?studentId=...&source=parent`.

### 11.2 API

`GET /api/parent/mini-report?studentId=...`
- Requires Supabase Auth session (parent).
- Verifies parent owns student (via `student_guardian_access` or `students.parent_id`).
- Returns: `{ childName, gradeLevel, physicalClass, subjectSummary: [...], strengths: [...], areasForPractice: [...], lastTeacherMessages: [...], lastUpdated }`.
- Calls `buildTeacherStudentReportPayload` internally with `{ skipAudit: true }`.

### 11.3 Multi-Child Support

Parent dashboard already handles multiple children. Mini-report must:
- Render one card per child.
- Each card fetches its own mini-report independently.
- Children are identified by existing `students` rows linked to parent.

---

## 12. Implementation Phases

### Internal Execution Order (Technical Sequencing Only — No Inter-Step Owner Approval Required)

The implementation is divided into three internal execution steps for technical ordering. They are **not** owner approval gates. The agent proceeds from Step 1 through Step 3 without stopping for owner review between steps.

**SQL is the only allowed mid-run pause:**

- Agent prepares migration SQL files only. Agent never executes SQL.
- Owner manually applies SQL in the Supabase SQL editor.
- When a migration file is required before integration tests can pass against the real database, the agent pauses, clearly states: (a) the exact file name, (b) exactly why it is required at this point, and (c) that the agent will continue automatically once the owner confirms it has been applied.
- This is a technical dependency, not an approval gate. Owner confirmation of SQL application is the only signal needed to resume.
- No other pause is permitted.

**These are NOT stop points:**
- Completion of Step 1 account management work.
- Completion of Step 2 messaging work.
- Any internal milestone, feature, or component completion.
- Discovering a test failure that the agent can fix without owner action.

**At the end of the full implementation (all steps complete), the agent sends one final completion report** for owner + ChatGPT review. See Section 12.5 for the complete required report structure.

**Constraints active throughout all steps:**
- Agent never executes SQL.
- Agent never commits.
- Agent never pushes.
- Owner applies all migrations manually in Supabase SQL editor only.
- No Hebrew text created or changed without owner approval of the exact wording (see Section 16.2 for approved list).
- No design changes to existing screens without owner approval.
- Regular private teacher flow and regular non-school parent flow must remain unchanged (see Section 0).

---

### Phase 1 — School Account Management Foundation

**Goal:** School manager can create, view, reset, block, and disconnect student and parent accounts from the school portal student card. Mandatory first-login PIN change is implemented for school-issued parent accounts from the start.

**Duration estimate:** 2-3 sprints.

**Files/areas affected:**
- New migration: `supabase/migrations/030_school_code.sql` (owner applies)
- New migration: `supabase/migrations/031_school_account_management.sql` (owner applies — includes `must_change_pin`)
- New migration: `supabase/migrations/034_school_account_audit_actions.sql` (owner applies)
- New server lib: `lib/school-server/school-account-management.server.js`
- New API routes: `pages/api/school/students/[studentId]/accounts/...`
- New API route: `pages/api/guardian/change-pin.js`
- New component: `components/school-portal/SchoolStudentAccessPanel.jsx`
- New component: `components/school-portal/SchoolStudentParentAccessRow.jsx`
- New component: `components/school-portal/SchoolCredentialShownOnceBox.jsx`
- New component: `components/parent/ParentMustChangePinGate.jsx`
- Modify component: `components/school-portal/SchoolReportModal.jsx` (add two-tab structure)
- `lib/school-server/school-request.server.js` — unchanged

**What is allowed:**
- Create new API routes under `/api/school/students/[studentId]/accounts/`.
- Create new `POST /api/guardian/change-pin` API.
- Extend `SchoolReportModal` with tab navigation.
- Add new server lib files.
- Add new migrations (owner applies manually).

**What is forbidden:**
- Changing existing teacher access panel behavior.
- Changing existing parent dashboard credential creation.
- Changing existing PIN/crypto functions.
- Displaying PIN anywhere except shown-once box.
- Relying on username pattern for permissions.
- Skipping `must_change_pin` on parent account create/reset.

**Exit criteria:**
- School manager can create a student account from school portal student card (Access & Accounts tab).
- School manager can create a parent account from school portal student card.
- Created credentials are shown once and then hidden.
- `must_change_pin = true` is returned in parent account create/reset response.
- School manager can reset PIN for student and parent.
- School manager can block/unblock accounts.
- School manager can disconnect parent from student.
- When parent logs in with `must_change_pin = true`, PIN-change gate appears before any other content.
- After PIN change, `must_change_pin = false` is set and parent can access content.
- All actions are logged in `teacher_access_audit`.
- Existing teacher flow is unaffected (regression test passes).
- Two-tab modal works for both Learning Report and Access & Accounts.

**Tests required:**
- Unit test: `school-account-management.server.js` — create, reset PIN, block, link, unlink, `must_change_pin` flag behavior.
- Unit test: `generateSchoolParentPin()` generates 6 digits.
- API test: each new `/api/school/students/[studentId]/accounts/*` route.
- API test: `POST /api/guardian/change-pin` — success, wrong old PIN, already-changed.
- Permission test: teacher (non-admin) cannot access account management endpoints.
- Permission test: parent cannot call `/api/guardian/change-pin` for another parent.
- Playwright: school manager creates student account, credentials shown once, PIN hidden after dismiss.
- Playwright: school manager resets parent PIN, `must_change_pin` shown in UI.
- Playwright: parent logs in with school-issued credentials → PIN-change gate appears → completes change → accesses content.
- Playwright: parent logs in again after change → no PIN-change gate.
- Regression: existing teacher guardian access panel creates access unchanged.
- Regression: existing parent dashboard credential creation unchanged.

**SQL dependency note:** Migrations 030, 031, and 034 must be manually applied by owner before integration tests that target the real DB can pass. Agent will prepare these files, state clearly when they are required, and then continue implementation. Owner applies them independently.

---

### Phase 2 — Messaging Core + Parent Inbox + Teacher Inbox + Mini-Report

**Goal:** School manager can send messages to parents and to teachers. Parents receive messages in a school inbox. Teachers receive messages in a teacher school messages section. Teacher messages in school context are linked to the school. Parent mini-report is available.

**Duration estimate:** 3-4 sprints.

**Files/areas affected:**
- New migration: `supabase/migrations/032_school_messaging.sql` (owner applies)
- New migration: `supabase/migrations/033_teacher_parent_messages_school_context.sql` (owner applies)
- New server lib: `lib/school-server/school-messaging.server.js`
- New API routes: `pages/api/school/messages/...`
- New API routes: `pages/api/parent/school-messages/...`
- New API routes: `pages/api/teacher/school-messages/...`
- New API route: `pages/api/parent/mini-report.js`
- New page: `pages/school/messages.js`
- New page: `pages/parent/school-inbox.js`
- New page: `pages/teacher/school-messages.js`
- New components (school portal): `SchoolMessagesPage`, `SchoolComposeMessageModal`, `SchoolAudiencePicker`, `SchoolMessageRow`, `SchoolMessageDetailModal`.
- New components (parent portal): `ParentSchoolMessageList`, `ParentSchoolMessageDetail`, `ParentSchoolInboxBadge`.
- New components (teacher portal): `TeacherSchoolMessageList`, `TeacherSchoolMessageDetail`, `TeacherSchoolInboxBadge`.
- New component: `ParentMiniReportCard`.
- Modify: `SchoolPortalShell` nav (add Messages link).
- Modify: `TeacherPortalShell` (add school messages badge for school-member teachers).
- Modify: `/parent/dashboard` (add school inbox link/count, mini-report card).
- Backfill migration: teacher messages get `school_id` populated.

**Phase 2 initial launch scope:** `all_parents` and `all_teachers` audience types only. Grade and class targeting added within Phase 2 after initial validation.

**What is allowed:**
- New page at `/school/messages`.
- New page at `/parent/school-inbox`.
- New page at `/teacher/school-messages`.
- Extend `SchoolPortalShell` nav.
- Extend `TeacherPortalShell` with badge.
- Add school inbox link to parent dashboard.

**What is forbidden:**
- Changing Hebrew UI text on existing parent dashboard sections.
- Changing existing teacher message API behavior.
- Adding real-time chat / free reply threads.
- Allowing subject teachers to send to classes they are not linked to.
- Displaying parent email in school portal messaging UI.

**Exit criteria:**
- School manager can compose and send a message to all parents.
- School manager can compose and send a message to all teachers.
- School manager can compose and send to grade or class parents.
- School manager can compose and send to grade, subject, or class teaching team teachers.
- Parent receives message in school inbox.
- Teacher receives message in teacher school messages section.
- Parent can view full message and it is marked as read.
- Teacher can view full message and it is marked as read.
- Teacher requires-confirmation messages require explicit "קיבלתי" tap.
- School manager can see read count per message, broken down by parent/teacher.
- Teacher parent message panel works unchanged.
- Teacher messages in school context show `school_id`.
- Parent mini-report shows subject summary for owned child.
- Multiple children: each child's mini-report is separate.
- Message type badges (regular, important, urgent) display correctly in both parent and teacher inboxes.

**Tests required:**
- Unit test: `school-messaging.server.js` — audience resolution for each audience type (parent + teacher).
- Unit test: audience resolution does not cross-contaminate schools.
- Unit test: teacher audience resolution — all_teachers, grade, subject, class team, specific.
- API test: `POST /api/school/messages` fan-out creates correct recipient rows (parent and teacher).
- API test: `POST /api/parent/school-messages/[messageId]/read` inserts read receipt.
- API test: `POST /api/teacher/school-messages/[messageId]/read` inserts read receipt.
- Permission test: parent cannot access teacher school messages endpoint.
- Permission test: teacher cannot access parent school messages endpoint.
- Permission test: parent cannot access another parent's messages.
- Permission test: teacher (non-admin) cannot send school-level messages from school portal.
- Playwright: compose → send to all parents → parent inbox shows message.
- Playwright: compose → send to all teachers → teacher school messages shows message.
- Playwright: parent opens message → read receipt created → manager sees count update.
- Playwright: teacher opens message → read receipt created → manager sees teacher read count update.
- Playwright: mini-report loads and shows subject summary.
- Multi-child Playwright: parent with 2 children sees separate mini-report per child.
- Playwright: audience preview shows correct count before sending.

**SQL dependency note:** Migrations 032 and 033 must be manually applied by owner before messaging integration tests can pass. Agent will prepare these files and state when they are required.

---

### Phase 3 — Read Receipts Dashboard, Advanced Targeting, Homeroom Teacher Messaging, Counters

**Goal:** Read receipt dashboard for school manager (parent + teacher breakdown). Homeroom teacher can send class messages. Advanced targeting (grade, subject, class team). Dashboard counters for unread messages.

**Duration estimate:** 2-3 sprints.

**Files/areas affected:**
- Extend `/api/school/messages/[messageId]/recipients` — add `recipientType` filter.
- Extend `/api/school/messages/[messageId]/unread-recipients` — add `recipientType` filter.
- Extend `/api/school/me` stats — add teacher/parent unread message counts.
- New component: `SchoolMessageReadReceiptPanel` (with parent/teacher tabs).
- New component: school dashboard message counter stat cards (parent unread, teacher unread, important active).
- New API route: `POST /api/teacher/school-messages` (homeroom teacher sends to class parents).
- Extend `SchoolPortalShell` nav badge (unread count).
- Extend teacher portal student card with `homeroom_student_parent` send option.
- Add `school_secretary` role to `school_teacher_memberships` CHECK constraint (no UI yet).

**What is allowed:**
- Homeroom teacher sending to their physical class parents.
- School manager read receipt view (parent + teacher separated).
- Dashboard counters.
- Grade, subject, and class-team audience targeting for school manager.

**What is forbidden:**
- Subject teacher sending to classes they are not linked to.
- Allowing parents to initiate messages (reply threads are future).
- Changing existing teacher_parent_messages behavior.

**Exit criteria:**
- School manager can see how many parents read a message.
- School manager can see how many teachers read a message.
- School manager can see who specifically has and has not read (parent list + teacher list).
- School manager can filter unread recipients by type (parent/teacher).
- Dashboard shows unread parent message count and unread teacher message count as separate stat cards.
- School manager can send to grade parents, class parents, grade teachers, subject teachers, class teaching team.
- Homeroom teacher can send a message to their physical class parents.
- Subject teacher cannot send school-level messages.
- School secretary role added to membership table CHECK constraint.

**Tests required:**
- API test: read receipt count is accurate for both parent and teacher recipients.
- API test: grade audience resolution returns correct teacher subset.
- API test: subject audience resolution returns correct teacher subset.
- API test: class-team audience resolution returns correct teacher subset.
- Permission test: homeroom teacher can only send to their own class parents.
- Permission test: subject teacher cannot access school messaging compose endpoints.
- Playwright: manager views read receipt panel with parent tab and teacher tab.
- Playwright: dashboard counter shows separate parent and teacher unread counts.
- Playwright: homeroom teacher sends message → class parents receive it → non-class parents do not.

**Note on homeroom teacher definition:** Per owner decision (Q4), if the current schema does not clearly define which teacher is the primary/homeroom teacher of a physical class, Phase 3 must first confirm the schema source of truth before enabling homeroom teacher sending. This is a code-level discovery, not an owner approval gate — agent resolves it from the existing codebase and documents the finding in the final report.

---

### Phase 4 — Future / Optional

**Goal:** Advanced features, scheduled messages, parent reply, segment targeting.

**Features (not scheduled):**
- Scheduled message delivery.
- Parent reply to `requires_response` messages.
- Segment targeting: parents of inactive students, learning support groups, report-based filters.
- Student-facing school messages (low priority per requirement).
- Push/email notifications for important messages.
- WhatsApp-style unread badge on parent login page.
- School secretary UI (account management without report access).
- Bulk print/export credentials for a class.
- Archive folder for old messages.
- Reminder to unread recipients (bulk message follow-up).

**What is forbidden in Phase 4:**
- Free chat / unmoderated messaging.
- Parent-initiated messages (unstructured).
- Breaking any Phase 1-3 behavior.

---

### 12.5 Final Completion Report (Delivered Once, After Full Implementation)

At the end of the full implementation (Phases 1, 2, and 3 complete), the agent sends one final report for owner + ChatGPT review. This report covers **all** of the following:

**A. File List**
- All new files created (full paths).
- All existing files modified (full paths, nature of change).
- Files intentionally NOT changed (confirm no accidental changes).

**B. DB / Migration Status**
- Which migrations have been applied (confirmation from owner).
- Which migrations are pending.
- Rollback commands for each migration.
- Confirmation that no SQL was executed by agent at any time.

**C. APIs Added or Modified**
- Full list of new API routes.
- Full list of modified API routes (what changed).
- For each route: auth gate used, audience scope, mutations performed.

**D. UI Added or Modified**
- Full list of new pages.
- Full list of new components.
- Full list of modified components (what changed).
- Confirmation that no Hebrew UI text was changed without approval.
- Confirmation that no design/layout changes to existing screens were made without approval.

**E. Tests Run**
- Unit tests: list of test files run and results.
- API/server tests: list of test files run and results.
- Playwright E2E tests: list of specs run and results.
- Permission/security tests: list run and results.
- RLS tests: list run and results.

**F. Tests Not Run (and why)**
- List any planned tests that were not run.
- Reason for each.

**G. Manual QA Checklist (Owner to verify)**
- [ ] School manager can create student account — credentials shown once.
- [ ] School manager can reset student PIN — new PIN shown once.
- [ ] School manager can block/unblock student account.
- [ ] School manager can create parent account — credentials shown once.
- [ ] School manager can reset parent PIN — `must_change_pin` shown.
- [ ] Parent first-login PIN-change gate appears after school-issued credential login.
- [ ] After PIN change, gate does not appear again.
- [ ] School manager can send message to all parents.
- [ ] School manager can send message to all teachers.
- [ ] School manager can send message to grade parents.
- [ ] School manager can send message to subject teachers.
- [ ] School manager can send message to class teaching team.
- [ ] School manager can send private message to one teacher.
- [ ] Parent receives message in school inbox.
- [ ] Teacher receives message in teacher school messages section.
- [ ] Parent marks message as read — read receipt appears in manager view.
- [ ] Teacher marks message as read — teacher read receipt appears in manager view.
- [ ] Manager read receipt panel shows parent count and teacher count separately.
- [ ] Parent mini-report shows correct subject summary for owned child.
- [ ] Parent with 2 children sees separate mini-report cards.
- [ ] School manager two-tab student modal: both tabs work correctly.
- [ ] Existing teacher portal: guardian access panel unchanged.
- [ ] Existing teacher portal: student login access panel unchanged.
- [ ] Existing parent dashboard: student credential creation unchanged.
- [ ] Existing parent report page loads unchanged.
- [ ] Existing teacher parent message panel unchanged.
- [ ] Demo school simulation smoke test passes.

**H. Mobile / Desktop Visual Checks (Owner to verify)**
- [ ] Student card Access & Accounts tab: mobile 375px.
- [ ] Student card Access & Accounts tab: desktop 1280px.
- [ ] School compose message modal: mobile.
- [ ] School compose message modal: desktop.
- [ ] Parent school inbox: mobile (RTL).
- [ ] Parent school inbox: desktop (RTL).
- [ ] Teacher school messages: mobile.
- [ ] Teacher school messages: desktop.
- [ ] Parent mini-report card: single child, mobile.
- [ ] Parent mini-report card: two children, mobile.
- [ ] Parent PIN-change gate: mobile.

**I. Permission / Security Checks**
- [ ] School manager cannot access another school's data (tested with two schools).
- [ ] Regular teacher (non-admin) cannot access school account management endpoints (403).
- [ ] Regular teacher cannot access school messaging compose endpoints (403).
- [ ] Teacher can access their own school messages inbox (200).
- [ ] Parent A cannot read messages of Parent B (403/empty).
- [ ] Guardian session cannot access school inbox (401).
- [ ] Subject teacher cannot send school messages (403).
- [ ] Homeroom teacher can only send to their own class (not other classes).
- [ ] No PIN is returned from any GET endpoint after creation.
- [ ] `must_change_pin` is set on every school-issued parent create/reset.

**J. Regression Checks (Existing Flows)**
- [ ] Existing teacher guardian access panel: creates access unchanged.
- [ ] Existing teacher student login access panel: creates student access unchanged.
- [ ] Parent dashboard: create student access code unchanged.
- [ ] Parent report page: loads unchanged with correct data.
- [ ] Teacher parent message panel: sends messages unchanged.
- [ ] School dashboard, teachers, classes, students pages: load unchanged.
- [ ] School physical class report: loads unchanged.
- [ ] Demo school simulation smoke test: passes unchanged.

**K. Multi-Child and Limited-Scope Tests**
- [ ] Parent multi-child: two children, each mini-report is separate and correct.
- [ ] Parent multi-child: school inbox shows messages for correct child.
- [ ] Homeroom teacher limited-scope: can only send to own class parents.
- [ ] Subject teacher limited-scope: cannot access school messaging at all.
- [ ] School manager full-scope: can see all students, all parents, all teachers in school.

**L. Confirmation Statements**
- [ ] Confirmed: no Hebrew wording changed on any existing screen without owner approval.
- [ ] Confirmed: no design or layout changes to existing screens without owner approval.
- [ ] Confirmed: no SQL executed by agent.
- [ ] Confirmed: no commits made by agent.
- [ ] Confirmed: no pushes made by agent.
- [ ] Confirmed: all migrations are pending owner manual application.

**M. Known Risks and Unresolved Issues**
- Any issues encountered during implementation that were partially or fully unresolved.
- Any tests that could not be run and why.
- Any performance or edge-case concerns observed.

**N. Changed-Files Package for Owner/ChatGPT Review**
- A ZIP file containing all new and modified files (if ZIP generation is possible in this environment).
- If ZIP creation is not possible: a complete list of every new and modified file path so the owner can retrieve and upload them individually to ChatGPT for review.
- The list must distinguish between new files and modified existing files.

---

## 13. Test and QA Plan

### 13.1 Unit Tests

- `school-account-management.server.js`: create student account, create parent account, reset PIN (student 4-digit, parent 6-digit), block, unblock, revoke, link parent, unlink parent, `must_change_pin` flag set on create/reset and cleared on change.
- `school-messaging.server.js`: audience resolution for each audience type (parent + teacher); fan-out creates correct recipient rows; no cross-school contamination; teacher-directed messages resolved correctly.
- `school-code` allocation: unique constraint prevents duplicate codes.
- `school-credential-sequences`: atomic increment.
- Username format: `{code}-s0152`, `{code}-p0152` format validation.
- PIN generation: 4-digit student, 6-digit parent.
- "Shown once" pattern: PIN not returned after creation if stored.
- `generateSchoolParentPin()`: always 6 digits.

### 13.2 API / Server Tests

- Each account management endpoint: create, reset PIN, block, unblock, revoke, link, unlink.
- `POST /api/guardian/change-pin`: success flow, wrong PIN, already changed.
- Each messaging endpoint: compose (parent audience), compose (teacher audience), list, hide, read receipt (parent), read receipt (teacher).
- Teacher inbox: GET messages, mark as read, unread count.
- Mini-report API: returns correct subset for parent.
- Audience preview endpoint: correct count for each audience type (parent + teacher).
- Backfill: `school_id` on teacher_parent_messages is set for school-associated teachers.

### 13.3 Permission / Security Tests

- School manager can access all school account endpoints. ✓
- Regular teacher (non-admin) receives 403 from school account and school message endpoints. ✓
- School manager cannot access another school's student accounts. ✓
- Parent can only see messages addressed to them. ✓
- Parent A cannot read messages of Parent B. ✓
- Teacher can only see school messages addressed to them. ✓
- Teacher A cannot read messages of Teacher B via teacher inbox API. ✓
- Guardian session cannot access school inbox (requires parent Supabase Auth). ✓
- Subject teacher cannot send school-level messages. ✓
- Homeroom teacher can only send to their own class parents (not other classes). ✓
- `must_change_pin` is set on every school-issued parent create/reset. ✓
- Parent cannot complete PIN change with wrong old PIN. ✓

### 13.4 RLS Tests

- `school_messages`: no row readable by authenticated user directly. Service role only.
- `school_message_recipients`: no row readable by authenticated user directly.
- `school_message_read_receipts`: authenticated user can INSERT own row (parent or teacher). Cannot INSERT for another user.
- `school_message_read_receipts`: authenticated user can SELECT own rows only.
- `school_credential_sequences`: no authenticated access.

### 13.5 Playwright E2E Tests

- School manager creates student account → credentials shown once → dismissed → not shown again.
- School manager resets student PIN → new PIN shown once.
- School manager blocks student account → student login fails.
- School manager creates parent account → `must_change_pin` indicated in UI.
- Parent logs in with school-issued credentials → PIN-change gate appears → completes change → accesses school inbox.
- Parent logs in again → no PIN-change gate.
- School manager sends message to all parents → each parent sees message in school inbox.
- School manager sends message to all teachers → each teacher sees message in teacher school messages.
- School manager sends message to specific teacher → only that teacher receives it.
- Parent opens message → read receipt created → manager sees parent count update.
- Teacher opens message → read receipt created → manager sees teacher count update.
- Manager read receipt panel → shows parent read count and teacher read count separately.
- Parent with 2 children: each child's mini-report shows separately.
- Homeroom teacher sends message to class parents → class parents receive message → non-class parents do not.
- Subject teacher: school messages compose UI is not accessible.
- School manager views audience preview before sending (correct count shown).

### 13.6 Mobile / Desktop Visual Checks

- School portal student card Access & Accounts tab: mobile (375px) and desktop (1280px).
- School compose message modal: mobile and desktop.
- Parent school inbox: mobile and desktop (RTL layout).
- Teacher school messages: mobile and desktop.
- Parent mini-report card: mobile (single child), mobile (2 children).
- Parent PIN-change gate: mobile.

### 13.7 Regression Checks

- Existing teacher guardian access panel: creates access unchanged.
- Existing teacher student login access panel: creates student access unchanged.
- Parent dashboard: create student access code unchanged.
- Parent report page: loads unchanged.
- Teacher parent message panel: sends messages unchanged.
- School dashboard, teachers, classes, students pages: all load unchanged.
- School physical class report: loads unchanged.
- Demo school simulation smoke test: passes unchanged.

---

## 14. Security and Privacy Checklist

- [ ] PIN never stored in plaintext. Only hash stored.
- [ ] PIN never returned from API after creation (only the "once" response).
- [ ] Temporary PIN shown in UI exactly once; dismissed → never shown again.
- [ ] Parent first-login PIN change is mandatory — `must_change_pin` enforced in guardian session flow.
- [ ] School manager cannot read another school's data (school_id boundary in all queries).
- [ ] Parent A cannot see Parent B's messages (recipient_user_id = auth.uid() in all parent queries).
- [ ] Teacher A cannot see Teacher B's school inbox messages (recipient_user_id = teacherId in all teacher queries).
- [ ] Subject teacher cannot access student accounts they are not linked to.
- [ ] `school_code` never used as a security boundary — all auth uses relational joins.
- [ ] Username pattern not used for permissions — all authorization via DB relations.
- [ ] `school_message_recipients` fan-out happens server-side only; client never resolves audience.
- [ ] Teacher audience resolution is school-scoped — teacher_id must be in school_teacher_memberships for the correct school.
- [ ] Audit log (`teacher_access_audit`) records all account management and messaging actions.
- [ ] Hebrew text in UI: never invented without owner approval.
- [ ] No PII (parent names, email) stored in audit log metadata (only user IDs and action codes).
- [ ] Message attachments: URL only stored (Phase 1/2); file upload to approved storage only if added later.
- [ ] School messages never expose parent email to school manager UI (only username and display name).
- [ ] Parent cannot send messages to school (Phase 1-3).
- [ ] Teacher cannot send school messages to other teachers (school manager only).
- [ ] Child data (mini-report) only visible to authenticated parent of that child.
- [ ] Guardian session does NOT have access to school inbox (school inbox requires Supabase Auth parent session or guardian session + school enrollment link).
- [ ] RLS on all new tables; no anon access; no direct authenticated mutation where service role is required.
- [ ] `school_credential_sequences` updated atomically (use Postgres FOR UPDATE or advisory lock in service role).

---

## 15. Risks

### 15.1 Data Privacy Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Wrong parent sees wrong child's message | Medium | High | `recipient_user_id = auth.uid()` check on all parent queries; RLS enforced |
| Teacher sees students from another class/school | Low | High | `verifyStudentVisibleToSchool()` check on all school APIs |
| Teacher receives school messages from wrong school | Low | High | Audience resolution always scoped to `school_id`; `school_teacher_memberships` used as scope |
| Duplicate parent accounts (teacher + school-issued) | High | Medium | UI warns if parent already has an active account; same username not issued twice |
| Username collision between schools | Low | Medium | Global unique index on normalized username across `student_guardian_access` |
| PIN exposed after creation | Low | High | Shown-once pattern enforced; no GET endpoint returns pin_hash or plaintext |
| Parent stays on temporary PIN indefinitely | Medium | High | `must_change_pin` enforced from Phase 1; gate blocks access until changed |
| School manager sees parent email | Medium | Medium | API returns display_name and username only, not email |

### 15.2 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Fan-out bottleneck for large schools (500+ parents + teachers) | Medium | Medium | Fan-out is batched; add background job if needed in Phase 4 |
| Audience resolution joins are slow for large schools | Medium | Medium | Proper indexes on `school_student_enrollments`, `teacher_class_students`, `school_teacher_subjects` |
| Breaking existing teacher portal | Medium | High | Strict API separation; no changes to existing teacher routes; regression tests |
| Breaking existing parent dashboard | Low | High | New APIs only; existing parent APIs unchanged |
| school_id backfill on teacher_parent_messages fails | Low | Low | Backfill is best-effort UPDATE; NULL school_id is acceptable for old messages |
| Hebrew UI text changed without approval | Low | High | Planning doc constraint; all copy approved before implementation |
| Teacher inbox conflicts with teacher dashboard | Low | Medium | Teacher inbox is a separate page; no changes to teacher dashboard |

### 15.3 Product Risks

| Risk | Description | Mitigation |
|---|---|---|
| Becoming uncontrolled WhatsApp | School messaging turns into free chat | Strict: no parent-initiated messages; no reply threads in Phase 1-3; all messages are from school/manager/teacher only |
| Teacher inbox overloaded | Teachers ignore school messages if too many | Manager can see who has not read; Phase 3 counters show unread; structure limits volume |
| Over-engineering Phase 1 | Adding too many message types at once | Phase 1 = accounts only; Phase 2 = basic messaging; types added incrementally |
| Confusing parent UX | Parent sees school inbox and teacher messages as separate | Mini-report design must clearly separate school messages from teacher academic messages |
| Username change needed after accounts exist | School code mistake | Policy: school code never changes; admin migration process documented |

---

## 16. Open Questions for Owner

1. **School code assignment:** Who assigns the school code — the platform admin, or can school managers request one? Should there be a UI for the platform admin to assign codes?

2. **Parent username scope:** Should one parent username cover multiple children (one credential, linked to multiple `student_guardian_access` rows), or should each child-parent relationship have a separate username? **Recommendation:** One parent credential, linked to multiple students.

3. **Guardian session vs. Supabase Auth for parents:** Currently, `students.parent_id` links to Supabase Auth users (full parent accounts), while `student_guardian_access` uses a custom cookie session. Should school-issued parent access use Supabase Auth or the existing guardian session system? **Recommendation:** Use existing guardian session system for school-issued parent access. School inbox then requires either a Supabase Auth parent session or a guardian session + enrollment link.

4. **Homeroom teacher definition:** What qualifies a teacher as a "homeroom teacher" for messaging? Is it being the primary teacher of a physical class? Does this need a flag in `school_teacher_memberships` or `teacher_classes`?

5. **Secretary role:** Is the school secretary role needed in Phase 1, or can it wait for Phase 2/3?

6. **Message attachment handling:** Attachments as URLs only (Phase 1/2), or is file upload to Supabase Storage required from the start?

7. **Notification delivery:** Are in-portal read receipts sufficient for Phase 2, or is email/SMS notification for urgent messages required in Phase 2?

8. **Parent mini-report:** Should the mini-report be a new page (`/parent/mini-report`) or an expandable card on the existing parent dashboard?

9. **Force PIN change — Phase 1 scope:** The plan sets `must_change_pin` as mandatory from Phase 1. Confirm: is the PIN-change gate required for Phase 1, or is it acceptable to show the flag in UI but not enforce the gate until Phase 2?

10. **Existing parent accounts:** Some parents already have Supabase Auth accounts (via `students.parent_id`). Should these parents receive school inbox messages using their Supabase Auth session? This would give them access without a guardian-style credential.

11. **Student portal messaging:** Is student-facing messaging ever in scope, or strictly parent/teacher only?

12. **Hebrew UI copy approval:** Who approves Hebrew text for all new UI surfaces? All copy must be reviewed before implementation begins.

13. **Teacher inbox placement:** Should teachers receive school manager messages in a **dedicated new page** (`/teacher/school-messages`) within the teacher portal, or as a **section on the existing teacher dashboard**? The plan proposes a dedicated page with a badge on the teacher nav. Confirm this is the preferred UX direction before Phase 2 implementation.

---

## 16.1 Owner Decisions — Recorded 2026-05-27

All 13 open questions have been answered by the owner. These decisions are binding for all phases. No deviation is permitted without explicit owner re-approval in writing.

| Q# | Question | Owner Decision |
|---|---|---|
| 1 | School code assignment | Manual/administrative only. No self-service UI in Phase 1. Each assignment must be documented and owner-approved before migration is applied. |
| 2 | Parent credential model | One parent credential covers multiple children. Do not create one credential per child-parent pair. |
| 3 | Guardian session vs. Supabase Auth | Use existing guardian/custom session pattern for school-issued parent access. Do not introduce or merge Supabase Auth parent behavior unless a separate audit proves it is safe and necessary. |
| 4 | Homeroom teacher definition | Homeroom teacher = teacher explicitly linked as primary/homeroom teacher of a physical class. If the current schema does not define this clearly, Phase 3 must first add/confirm the source of truth before enabling homeroom teacher messaging. |
| 5 | School secretary role | Not in Phase 1. Reserve for Phase 3/4 unless owner approves earlier in writing. |
| 6 | Attachments | No file upload in initial messaging phase. URL-only if needed. Full attachment implementation requires a separate approved plan. |
| 7 | Email/SMS/push notifications | Not in Phase 1 or initial Phase 2. Portal-only messaging only. External notifications planned separately. |
| 8 | Mini-report placement | Parent dashboard card/section first, with a link to a detailed report. Do not build a heavy new report engine. |
| 9 | First-login parent PIN change | Approved for Phase 1. All school-issued parent accounts must require changing the temporary PIN on first login. Student PIN does not require mandatory first-login change. |
| 10 | Existing Supabase Auth parent accounts | Do not merge into Phase 1. Existing Supabase Auth parent behavior must not be changed without a separate audit and owner approval. |
| 11 | Student messaging | Not in scope for Phase 1-3. Student account is for learning access only. Messaging remains future/optional. |
| 12 | Hebrew UI copy | Do not invent final Hebrew copy. Before Phase 1 implementation begins, agent will prepare the exact list of all new UI labels/messages needed, and owner approves the Hebrew wording before any code is written. |
| 13 | Teacher inbox placement | Approved as planned: dedicated page `/teacher/school-messages` with a navigation badge/indicator. |

### Phase 1 Approved Scope (binding)

**Included:**
- School account management foundation.
- School-issued student credentials (username + 4-digit PIN, shown once).
- School-issued parent credentials (username + 6-digit PIN, shown once, `must_change_pin = true`).
- Access & Accounts tab inside the existing `SchoolReportModal` two-tab modal.
- Parent mandatory first-login PIN change gate (`ParentMustChangePinGate`).
- PIN shown-once behavior for both student and parent accounts.
- Account status display (active, blocked, not created, last login).
- Reset PIN, block, unblock, revoke, link parent, unlink parent.
- All actions logged in `teacher_access_audit`.
- Required Phase 1 tests (unit, API, permission, Playwright, regression).
- Hebrew copy list prepared by agent and approved by owner before implementation begins.

**Explicitly excluded from Phase 1:**
- Messaging implementation of any kind.
- Teacher inbox implementation.
- Parent school inbox implementation.
- Read receipt dashboard.
- Advanced audience targeting.
- School secretary role UI.
- File attachments.
- Email/SMS/push notifications.
- Changes to existing regular teacher flow unless explicitly required and documented.

---

## 16.2 Hebrew Copy Approval List — Required Before Full Implementation Start

Every new Hebrew UI label, button, status word, heading, validation message, empty state, and confirmation message is listed below. **No Hebrew text may appear in any component unless it is in this list and marked as approved by owner.** Owner should correct any placeholder wording before the start command is given.

Format: `KEY | PLACEHOLDER TEXT | OWNER APPROVED TEXT`

Owner may provide corrections in the "Owner Approved Text" column before the start command.

---

### A. Access & Accounts Tab (SchoolReportModal second tab)

| Key | Surface | Placeholder Text |
|---|---|---|
| `tab_learning_report` | First tab title | `דוח לימודי` |
| `tab_access_accounts` | Second tab title | `גישה וחשבונות` |

---

### B. Student Account Section

| Key | Surface | Placeholder Text |
|---|---|---|
| `section_student_account` | Section heading | `חשבון תלמיד` |
| `status_active` | Account status | `פעיל` |
| `status_blocked` | Account status | `חסום` |
| `status_not_created` | Account status | `לא נוצר` |
| `last_login_never` | Last login fallback | `מעולם לא נכנס` |
| `last_login_days_ago` | Last login relative (X = number) | `לפני X ימים` |
| `last_login_today` | Last login if today | `היום` |
| `btn_create_account` | Create student account | `צור חשבון` |
| `btn_reset_pin` | Reset PIN | `איפוס PIN` |
| `btn_copy_credentials` | Copy credentials to clipboard | `העתק פרטים` |
| `btn_block` | Block account | `חסום` |
| `btn_unblock` | Unblock account | `בטל חסימה` |
| `btn_revoke` | Permanently revoke | `בטל גישה` |
| `confirm_revoke_student` | Revoke confirmation prompt | `האם לבטל את גישת התלמיד לצמיתות?` |
| `empty_student_account` | No account yet | `לא נוצר חשבון לתלמיד זה` |

---

### C. Parent Account Section

| Key | Surface | Placeholder Text |
|---|---|---|
| `section_parent_accounts` | Section heading | `חשבונות הורים` |
| `btn_add_parent` | Add new parent access | `הוסף גישת הורה` |
| `btn_link_parent` | Link existing parent | `חבר הורה קיים` |
| `label_relation` | Relation field label | `קשר לתלמיד` |
| `relation_mother` | Relation type | `אמא` |
| `relation_father` | Relation type | `אבא` |
| `relation_guardian` | Relation type | `אפוטרופוס` |
| `relation_other` | Relation type | `אחר` |
| `label_display_name` | Parent display name field | `שם הורה` |
| `btn_disconnect_parent` | Disconnect parent from this student | `נתק מתלמיד` |
| `confirm_disconnect_parent` | Disconnect confirmation | `האם לנתק הורה זה מהתלמיד?` |
| `confirm_revoke_parent` | Revoke parent confirmation | `האם לבטל את גישת ההורה לצמיתות?` |
| `must_change_pin_pending` | Badge — PIN change not yet done | `שינוי PIN נדרש בכניסה הראשונה` |
| `must_change_pin_done` | Badge — PIN change completed | `שינוי PIN הושלם` |
| `empty_parent_accounts` | No parent accounts yet | `לא נוצרו חשבונות הורים לתלמיד זה` |

---

### D. Shown-Once Credential Box

| Key | Surface | Placeholder Text |
|---|---|---|
| `credential_box_heading` | Box heading | `פרטי הגישה` |
| `credential_box_warning` | Warning under heading | `שמור את הפרטים עכשיו. הם לא יוצגו שוב.` |
| `credential_label_username` | Username field label | `שם משתמש` |
| `credential_label_pin` | PIN field label | `קוד גישה` |
| `credential_copied` | Toast after copy | `הועתק ללוח` |
| `credential_btn_dismiss` | Dismiss button | `אישור, שמרתי` |

---

### E. Parent First-Login PIN Change Gate

| Key | Surface | Placeholder Text |
|---|---|---|
| `pin_gate_heading` | Gate screen title | `שינוי קוד גישה` |
| `pin_gate_explanation` | Instructional text | `קוד הגישה שקיבלת הוא זמני. יש לבחור קוד גישה חדש לפני הכניסה לפורטל.` |
| `pin_gate_field_current` | Current/temporary PIN label | `קוד גישה זמני` |
| `pin_gate_field_new` | New PIN label | `קוד גישה חדש` |
| `pin_gate_field_confirm` | Confirm new PIN label | `אימות קוד גישה חדש` |
| `pin_gate_btn_submit` | Submit button | `אשר שינוי` |
| `pin_gate_success` | Success message | `קוד הגישה עודכן בהצלחה` |
| `pin_gate_error_wrong_current` | Wrong current PIN error | `קוד הגישה הנוכחי שגוי` |
| `pin_gate_error_mismatch` | PINs do not match | `קודי הגישה אינם תואמים` |
| `pin_gate_error_too_short` | PIN too short (6 digits required) | `קוד הגישה חייב להכיל 6 ספרות` |
| `pin_gate_error_digits_only` | Non-numeric input | `קוד הגישה חייב להכיל ספרות בלבד` |

---

### F. School Messages Page (Manager — `/school/messages`)

| Key | Surface | Placeholder Text |
|---|---|---|
| `nav_messages` | Nav item label | `הודעות` |
| `page_messages_title` | Page heading | `הודעות בית ספר` |
| `btn_compose` | Compose new message | `הודעה חדשה` |
| `messages_empty` | No messages sent yet | `לא נשלחו הודעות עדיין` |
| `col_subject` | Table/list column | `נושא` |
| `col_audience` | Table/list column | `נמענים` |
| `col_date` | Table/list column | `תאריך` |
| `col_read_count` | Table/list column | `קראו` |
| `filter_all` | Filter tab | `הכל` |
| `filter_parents` | Filter tab | `הורים` |
| `filter_teachers` | Filter tab | `מורים` |
| `badge_type_regular` | Message type badge | `רגיל` |
| `badge_type_important` | Message type badge | `חשוב` |
| `badge_type_urgent` | Message type badge | `דחוף` |
| `badge_type_requires_confirmation` | Message type badge | `דורש אישור קבלה` |

---

### G. Compose Message Modal

| Key | Surface | Placeholder Text |
|---|---|---|
| `compose_title` | Modal heading | `הודעה חדשה` |
| `compose_field_subject` | Subject field label | `נושא (אופציונלי)` |
| `compose_field_body` | Body field label | `תוכן ההודעה` |
| `compose_field_type` | Message type label | `סוג הודעה` |
| `compose_field_audience` | Audience label | `נמענים` |
| `compose_btn_send` | Send button | `שלח הודעה` |
| `compose_btn_cancel` | Cancel button | `ביטול` |
| `compose_preview_count` | Audience preview (X = count) | `X נמענים ייקבלו הודעה זו` |
| `compose_error_empty_body` | Validation | `יש להזין תוכן להודעה` |
| `compose_error_body_too_long` | Validation | `תוכן ההודעה ארוך מדי (עד 4000 תווים)` |
| `compose_success` | After send | `ההודעה נשלחה בהצלחה` |

---

### H. Audience Picker

| Key | Surface | Placeholder Text |
|---|---|---|
| `audience_section_parents` | Section label | `הורים` |
| `audience_section_teachers` | Section label | `מורים וצוות` |
| `audience_all_parents` | Option | `כל הורי בית הספר` |
| `audience_grade_parents` | Option | `הורי שכבה` |
| `audience_class_parents` | Option | `הורי כיתה` |
| `audience_specific_parent` | Option | `הורה ספציפי` |
| `audience_all_teachers` | Option | `כל מורי בית הספר` |
| `audience_grade_teachers` | Option | `מורי שכבה` |
| `audience_subject_teachers` | Option | `מורי מקצוע` |
| `audience_class_teachers` | Option | `צוות מורי כיתה` |
| `audience_specific_teacher` | Option | `מורה ספציפי` |
| `picker_select_grade` | Grade picker placeholder | `בחר שכבה` |
| `picker_select_class` | Class picker placeholder | `בחר כיתה` |
| `picker_select_subject` | Subject picker placeholder | `בחר מקצוע` |
| `picker_search_parent` | Search placeholder | `חפש הורה לפי שם או שם משתמש` |
| `picker_search_teacher` | Search placeholder | `חפש מורה לפי שם` |
| `picker_no_results` | No search results | `לא נמצאו תוצאות` |

---

### I. Parent School Inbox (`/parent/school-inbox`)

| Key | Surface | Placeholder Text |
|---|---|---|
| `nav_school_inbox` | Link on parent dashboard | `הודעות בית הספר` |
| `inbox_title` | Page heading | `הודעות מבית הספר` |
| `inbox_empty` | No messages | `אין הודעות מבית הספר` |
| `inbox_unread_badge` | Badge (X = count) | `X הודעות חדשות` |
| `inbox_unread_one` | Badge (singular) | `הודעה חדשה אחת` |
| `msg_from` | Sender label | `מ:` |
| `msg_date` | Date label (relative) | `לפני X ימים` |
| `msg_unread_indicator` | Unread dot label (screen reader) | `לא נקראה` |
| `msg_badge_important` | Important badge | `חשוב` |
| `msg_badge_urgent` | Urgent badge | `דחוף` |
| `msg_badge_requires_confirmation` | Requires confirmation badge | `דורש אישור קבלה` |
| `btn_mark_received` | Confirm receipt button | `קיבלתי` |
| `received_confirmed` | After confirmation | `אישרת קבלה` |
| `for_child` | Child label in multi-child context | `עבור: [שם הילד]` |

---

### J. Teacher School Inbox (`/teacher/school-messages`)

| Key | Surface | Placeholder Text |
|---|---|---|
| `nav_school_messages_teacher` | Badge/link in teacher nav | `הודעות בית הספר` |
| `teacher_inbox_title` | Page heading | `הודעות מהנהלת בית הספר` |
| `teacher_inbox_empty` | No messages | `אין הודעות מבית הספר` |
| `teacher_inbox_unread_badge` | Badge (X = count) | `X הודעות חדשות` |
| `teacher_msg_badge_important` | Important badge | `חשוב` |
| `teacher_msg_badge_urgent` | Urgent badge | `דחוף` |
| `teacher_msg_badge_requires_confirmation` | Requires confirmation | `דורש אישור קבלה` |
| `teacher_btn_mark_received` | Confirm receipt | `קיבלתי` |
| `teacher_received_confirmed` | After confirmation | `אישרת קבלה` |

---

### K. Read Receipt Dashboard (Manager View)

| Key | Surface | Placeholder Text |
|---|---|---|
| `receipts_panel_title` | Panel heading | `מצב קריאה` |
| `receipts_tab_parents` | Tab | `הורים` |
| `receipts_tab_teachers` | Tab | `מורים` |
| `receipts_read_count` | Summary (X of Y) | `קראו X מתוך Y` |
| `receipts_column_name` | Column | `שם` |
| `receipts_column_status` | Column | `סטטוס` |
| `receipts_status_read` | Row status | `קרא` |
| `receipts_status_unread` | Row status | `לא קרא` |
| `receipts_status_confirmed` | Row status (confirmed receipt) | `אישר קבלה` |
| `receipts_empty` | No recipients | `אין נמענים` |
| `receipts_filter_unread_only` | Filter toggle | `הצג לא קראו בלבד` |

---

### L. Parent Mini-Report Card

| Key | Surface | Placeholder Text |
|---|---|---|
| `mini_report_card_title` | Card heading | `דוח למידה קצר` |
| `mini_report_child_label` | Child name label | `תלמיד/ה:` |
| `mini_report_class_label` | Class label | `כיתה:` |
| `mini_report_subjects_title` | Subjects section | `מקצועות` |
| `mini_report_accuracy_label` | Accuracy label | `דיוק` |
| `mini_report_strengths_title` | Strengths section | `נקודות חוזק` |
| `mini_report_practice_title` | Practice areas section | `לחיזוק` |
| `mini_report_last_teacher_msgs` | Teacher messages section | `הודעות אחרונות מהמורה` |
| `mini_report_link_full` | Link to full report | `לדוח המלא` |
| `mini_report_no_data` | No learning data yet | `אין נתוני למידה עדיין` |
| `mini_report_last_updated` | Last update label | `עודכן:` |

---

### M. School Dashboard Message Counters

| Key | Surface | Placeholder Text |
|---|---|---|
| `counter_unread_parents` | Stat card title | `הודעות לא נקראו — הורים` |
| `counter_unread_teachers` | Stat card title | `הודעות לא נקראו — מורים` |
| `counter_important_active` | Stat card title | `הודעות חשובות פעילות` |
| `btn_compose_from_dashboard` | Quick action | `הודעה חדשה` |

---

**Total Hebrew strings in this list: 120**

**Owner instruction:** Review each placeholder text above. Any string the owner corrects must be implemented with the corrected wording. Any string the owner does not correct is approved as-is and will be implemented with the placeholder text shown.

---

## 17. Final Recommendation

### Approved Workflow (Single-Approval, Full-Scope)

```
Owner reviews full plan + Hebrew copy list (Section 16.2)
       ↓
Owner gives ONE explicit command:
  START FULL SCHOOL PORTAL IMPLEMENTATION
  (means: full scope Steps 1→2→3, no inter-step stops)
       ↓
Agent implements full scope in order, without stopping between steps
  - SQL files prepared by agent; owner applies them manually when signalled
  - Only allowed pause: owner manually applies a required migration file
  - After owner confirms SQL applied, agent continues automatically
       ↓
Agent runs all planned tests; fixes issues discovered during implementation/testing
       ↓
Agent sends ONE final completion report (Section 12.5)
       ↓
Owner uploads report + changed-files package to ChatGPT
       ↓
Owner and ChatGPT review at the end
       ↓
Owner performs manual UI/mobile/desktop checks
       ↓
Owner decides whether work is accepted
```

### Internal Execution Order (Technical, Not Owner Approval Gates)

1. Write migration files 030, 031, 034. Signal owner to apply them.
2. Build school account management server lib and all API routes (Phase 1).
3. Build `SchoolReportModal` two-tab extension, `SchoolStudentAccessPanel`, and credential components (Phase 1).
4. Build `ParentMustChangePinGate` and `POST /api/guardian/change-pin` (Phase 1).
5. Run Phase 1 unit, API, permission, Playwright, and regression tests (Phase 1).
6. Write migration files 032, 033. Signal owner to apply them.
7. Build school messaging server lib and all school message API routes (Phase 2).
8. Build teacher school inbox APIs (Phase 2).
9. Build parent mini-report API (Phase 2).
10. Build school messages page, parent school inbox page, teacher school messages page, and all related components (Phase 2).
11. Run Phase 2 unit, API, permission, Playwright, and regression tests (Phase 2).
12. Build read receipt dashboard, advanced targeting, homeroom teacher messaging, dashboard counters (Phase 3).
13. Run Phase 3 tests (Phase 3).
14. Run full regression suite (all phases).
15. Send final completion report.

### Architecture Principles to Maintain

- All mutations via service-role APIs. No direct client mutations on sensitive tables.
- Authorization always via DB relations. Never via username pattern.
- Append-only message history. Soft-delete only.
- Shown-once PIN pattern enforced at all account creation/reset points.
- Mandatory first-login PIN change for all school-issued parent accounts.
- Hebrew text: never change existing strings without approval. New strings require owner approval before any UI code touches them.
- **Regular private teacher flow: never modify.** All existing teacher portal routes, APIs, and components remain unchanged.
- **Regular non-school parent flow: never modify.** Existing parent dashboard, parent report, and parent API routes remain unchanged except for additive-only new items (school inbox card on dashboard, new `/parent/school-inbox` page, new `/api/parent/school-messages/` routes).
- School scope: all school queries always filter by `school_id`. No data crosses school boundaries.
- Teacher scope: teacher inbox queries always filter by `recipient_user_id = teacher's auth user ID`.
- Audit trail: all account management and messaging actions logged in `teacher_access_audit`.

### What the Owner Must Do Before Implementation Starts

1. Review the full plan and the Hebrew copy list in Section 16.2. Approve the exact Hebrew wording for each item or provide corrections.
2. Type the explicit command: **`START FULL SCHOOL PORTAL IMPLEMENTATION`** — this means implement the full approved scope from Step 1 through Step 3 in order, without stopping for product approvals between steps.
3. When agent signals that migration files 030, 031, 034 are ready: apply them in Supabase SQL editor, then confirm so agent can continue.
4. When agent signals that migration files 032, 033 are ready: apply them in Supabase SQL editor, then confirm so agent can continue.
5. Assign a `school_code` value to at least one test school in the DB (post migration 030).

### Workflow Constraints (Non-Negotiable, All Phases)

- Agent never executes SQL.
- Agent never commits.
- Agent never pushes.
- Owner applies all migrations manually in Supabase SQL editor only.
- No Hebrew text created or changed without owner approval of the exact wording.
- No design changes to existing screens without owner approval.
- Regular private teacher flow and regular non-school parent flow must remain byte-for-byte unchanged in behavior.

---

*This document is planning only. No implementation code has been written. No SQL has been executed. No commits or pushes have been made. All decisions in this document require owner review and the explicit command `START FULL SCHOOL PORTAL IMPLEMENTATION` before any implementation begins.*
