# School Communication and Account Management — Master Plan

**Status:** PLANNING ONLY — No implementation code, no SQL executed, no commit, no push.
**Date:** 2026-05-27
**Author:** AI Planning Agent
**Approval required before any implementation begins.**

---

## 1. Executive Summary

The School Portal currently provides school managers with a learning-activity and roster overview (teachers, classes, students, activities) but has **no communication capability** and **no school-level account management**. Parents, students, and teachers currently rely on WhatsApp for school communication.

This plan covers the full end-to-end implementation of:

- **School communication center** — structured, role-scoped messaging from school manager and homeroom/subject teachers to parents and teachers. This is **not** free chat; it is structured, auditable, targeted school communication.
- **School-level student and parent account management** — creation, reset, block/unblock, and audit of student and parent portal access, anchored to a school code prefix.
- **Parent portal in school context** — parent-facing inbox, mini-report per child, and child list in school branding.
- **Permissions** — clean matrix covering super admin, school manager, optional school secretary, homeroom teacher, subject teacher, parent, and student.

The plan is structured in four implementation phases. Phase 1 is account management and the first messaging building block. Phase 2 is the parent portal and teacher messaging. Phase 3 is read receipts, advanced targeting, and dashboard counters. Phase 4 is optional future features (scheduled messages, segments, student messaging).

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
| Messaging infrastructure | No school → parent or school → teacher messaging tables |
| Message types | No support for important/urgent/read-confirmation message types |
| Teacher messaging in school context | Existing `teacher_parent_messages` is teacher-scope only, not school-aware |
| Parent inbox (school context) | No parent-facing inbox for school messages |
| Parent mini-report | No short summary report for parents in school context |
| Read receipts | No recipient tracking on any message type |
| Message targeting | No audience selection (all parents, by grade, by class, specific parent) |
| School nav | No Messages or Accounts navigation item in school portal |
| School secretary role | No role between school_admin and teacher for account-only staff |
| Student portal (school context) | No student-facing school messages |
| Multi-child parent support | Parent dashboard supports multiple children; school context must match |
| Dashboard counters | No unread/important message counters |

### What Can Be Reused

| Existing Piece | How to Reuse |
|---|---|
| `teacher-access-prefix.server.js` | Port `allocateTeacherAccessUsername` to school scope (swap teacher prefix for school code) |
| `student_guardian_access` table | School-created parent access rows go in same table; add `created_by_school_id` column |
| `student_access_codes` table | School-created student access rows go in same table; add `created_by_school_id` column |
| `guardian-crypto.server.js` | All PIN/hash logic is reusable with no changes |
| `buildTeacherStudentReportPayload` | Already used by school portal; reuse for mini-report too |
| `teacher_parent_messages` | Extend or parallel-use for teacher→parent in school context; teacher still creates messages |
| `teacher_access_audit` | Extend action allowlist for school account management events |
| `requireSchoolManagerApiContext` | Base auth gate for all new school APIs |
| `SchoolPortalShell` nav | Add Messages and Accounts nav items |
| `SchoolDrillDown` components | Add Access & Accounts section to existing student card |
| `SchoolReportModal` | Reuse for parent mini-report rendering in school context |
| `GuardianAccessPanel` / `StudentLoginAccessPanel` | Adapt for school portal (different API routes, same UX pattern) |
| Parent report page `/learning/parent-report` | School context can link or embed this for parent mini-report |

### What Cannot Be Reused / Must Be New

| Area | Reason |
|---|---|
| School → parent/teacher messaging | Entirely new: audience targeting, message types, read receipts — teacher_parent_messages is per-student-per-teacher only |
| Parent school inbox | New: parent currently sees only learning data and credentials; needs school message inbox |
| Read receipt tracking | New tables required |
| Message audience resolution | New: resolving "all parents of grade 3" requires joining school_student_enrollments + student_guardian_access |
| School code allocation | Similar to teacher prefix logic, but on school_accounts |

---

## 4. Proposed Architecture

### 4.1 System Boundary

```
┌─────────────────────────────────────────────────────────────────────┐
│                        School Portal (school_admin)                 │
│   Dashboard │ Teachers │ Classes │ Students │ Messages │ Accounts   │
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
│  student_guardian_access (+ created_by_school_id)               │
│  student_access_codes (+ created_by_school_id)                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     Parent Portal (Supabase Auth)                │
│  /parent/dashboard (existing)                                    │
│  /parent/school-inbox (NEW) — school messages                    │
│  /parent/mini-report (NEW or enhanced dashboard)                 │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                  Teacher Portal (teacher JWT)                    │
│  /teacher/* (existing — unchanged)                              │
│  Teacher messaging in school context uses existing              │
│  teacher_parent_messages, extended with school_id               │
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
- `student_guardian_access` — for school-issued parent access.
- `student_access_codes` — for school-issued student access.

This allows school manager to manage accounts for all enrolled students without conflicting with teacher-issued accounts.

One parent may have accounts linked to multiple children (via `student_guardian_access` rows for each `student_id`). The parent's username can be reused across children if the same parent account covers multiple children — but the system must support one `student_guardian_access` row per student-parent pair.

Account status is computed from: `is_active`, `revoked_at`, `expires_at`, and last session timestamp from `student_guardian_sessions`.

### 4.4 Messaging Architecture

School-level messaging uses new tables:
- `school_messages` — the message record (author, type, content, audience_type, school_id).
- `school_message_recipients` — fan-out: one row per resolved recipient (parent auth user ID or teacher auth user ID).
- `school_message_read_receipts` — one row per recipient per message when read.

Teacher-to-parent messaging in school context reuses the existing `teacher_parent_messages` table, extended with `school_id` (nullable, FK to `school_accounts`). This allows school manager to see teacher messages in school context, and allows school to filter teacher messages by class/grade.

Message audience resolution happens at send time: the API resolves the audience (all parents of grade 3, all parents of class 3B, etc.) by querying `school_student_enrollments` + `teacher_class_students` + `student_guardian_access`, then fans out into `school_message_recipients`.

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

### 5.2 Migration 031 — School-Created Credentials

```sql
-- 031_school_account_management.sql
-- Extend student_guardian_access and student_access_codes with school origin tracking.
-- Also adds account_status_hint for dashboard display (not authoritative).

BEGIN;

-- Parent access: track school-created rows
ALTER TABLE public.student_guardian_access
  ADD COLUMN IF NOT EXISTS created_by_school_id uuid
    REFERENCES public.school_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS student_guardian_access_school_idx
  ON public.student_guardian_access (created_by_school_id)
  WHERE created_by_school_id IS NOT NULL;

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
ALTER TABLE student_access_codes DROP COLUMN created_by_school_id;
DROP TABLE IF EXISTS school_credential_sequences;
```

**Compatibility:** No existing rows are affected; columns are nullable. Existing teacher-created accounts remain unaffected.

### 5.3 Migration 032 — School Messaging Tables

```sql
-- 032_school_messaging.sql
-- School-level messaging system.
-- Append-only message history. Fan-out to recipients. Read receipts.

BEGIN;

-- Message type enum via CHECK
CREATE TABLE IF NOT EXISTS public.school_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       uuid        NOT NULL
                                REFERENCES public.school_accounts(id) ON DELETE CASCADE,
  author_id       uuid        NOT NULL
                                REFERENCES public.teacher_profiles(id) ON DELETE RESTRICT,
  -- audience_type: who receives this message
  audience_type   text        NOT NULL
    CHECK (audience_type IN (
      'all_parents',
      'grade_parents',
      'class_parents',
      'specific_parent',
      'all_teachers',
      'grade_teachers',
      'subject_teachers',
      'class_teachers',
      'specific_teacher',
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

ALTER TABLE public.school_messages ENABLE ROW LEVEL SECURITY;
-- No authenticated policies. Service role only.

COMMENT ON TABLE public.school_messages IS
  'Append-only school communication records. Mutations via service-role school and teacher APIs only. is_hidden = soft delete.';

-- Fan-out: one row per resolved recipient
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

ALTER TABLE public.school_message_recipients ENABLE ROW LEVEL SECURITY;
-- No authenticated policies. Service role only.

-- Read receipts
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

-- Parents can INSERT their own read receipt (authenticated policy)
DROP POLICY IF EXISTS school_message_read_receipts_parent_insert ON public.school_message_read_receipts;
CREATE POLICY school_message_read_receipts_parent_insert
  ON public.school_message_read_receipts
  FOR INSERT
  TO authenticated
  WITH CHECK (recipient_user_id = auth.uid());

-- Parents can SELECT their own read receipts
DROP POLICY IF EXISTS school_message_read_receipts_parent_select ON public.school_message_read_receipts;
CREATE POLICY school_message_read_receipts_parent_select
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

**Migration order:** 032 requires 030 (school_code) and 031 (school credential columns) applied first.

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

### 5.5 Migration 034 — Audit Actions for Account Management

```sql
-- 034_school_account_audit_actions.sql
-- Extend teacher_access_audit action CHECK for school account management events.
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
    -- new school account management actions --
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
    -- new school messaging actions --
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
| `school_messages` | **032** | School communication messages |
| `school_message_recipients` | **032** | Fan-out recipient list |
| `school_message_read_receipts` | **032** | Read receipt tracking |
| `student_guardian_access` | 019 + **031** | Parent/guardian access + created_by_school_id |
| `student_access_codes` | 001/015 + **031** | Student access codes + created_by_school_id |
| `teacher_parent_messages` | 023 + **033** | Teacher→parent messages + school_id |
| `teacher_access_audit` | 019 + 021 + 024 + 027 + 028 + **034** | Audit log |

### 5.7 RLS Summary

| Table | RLS Policy |
|---|---|
| `school_messages` | Service role only (no authenticated policies) |
| `school_message_recipients` | Service role only |
| `school_message_read_receipts` | Parent INSERT own; parent SELECT own; service role full |
| `school_credential_sequences` | Service role only |
| `student_guardian_access` (new column) | Inherits existing RLS (service role only) |
| `student_access_codes` (new column) | Inherits existing RLS (service role only) |

---

## 6. API Proposal

All new school APIs follow the existing pattern: bearer JWT, `requireSchoolManagerApiContext()` for school manager APIs, and appropriate role checks for teacher APIs.

### 6.1 School Account Management APIs

```
GET  /api/school/students/[studentId]/accounts
     Returns student login account status + parent accounts for this student.
     Response: { studentAccess: {...}, parentAccesses: [...] }

POST /api/school/students/[studentId]/accounts/student/create
     Create school-issued student login (auto-generates username + PIN).
     Response: { loginUsername, loginPinOnce (shown once, not persisted in response) }

POST /api/school/students/[studentId]/accounts/student/reset-pin
     Reset student PIN. Returns new PIN once.

POST /api/school/students/[studentId]/accounts/student/block
POST /api/school/students/[studentId]/accounts/student/unblock
     Block/unblock student access.

POST /api/school/students/[studentId]/accounts/student/revoke
     Revoke student access entirely.

POST /api/school/students/[studentId]/accounts/parent/create
     Create new school-issued parent access (auto-generates username + PIN).
     Body: { relation: 'father'|'mother'|'guardian'|'other', displayName?: string }
     Response: { loginUsername, loginPinOnce }

POST /api/school/students/[studentId]/accounts/parent/[accessId]/reset-pin
     Reset parent PIN.

POST /api/school/students/[studentId]/accounts/parent/[accessId]/block
POST /api/school/students/[studentId]/accounts/parent/[accessId]/unblock

POST /api/school/students/[studentId]/accounts/parent/[accessId]/revoke

POST /api/school/students/[studentId]/accounts/parent/link
     Link an existing parent access (by username) to this student.

POST /api/school/students/[studentId]/accounts/parent/[accessId]/unlink
     Disconnect parent from this student only.
```

### 6.2 School Messaging APIs (Manager)

```
GET  /api/school/messages
     List sent messages (paginated, filtered by type/date).
     Response: { messages: [...], total, nextCursor }

POST /api/school/messages
     Send a new message.
     Body: { audienceType, audienceScope, messageType, subject, body, hasAttachment, attachmentUrl }
     Response: { messageId, recipientCount }

GET  /api/school/messages/[messageId]
     Get message detail + recipient list + read counts.

POST /api/school/messages/[messageId]/hide
     Soft-delete (hide) a message.

GET  /api/school/messages/[messageId]/recipients
     List recipients with read status.

GET  /api/school/messages/[messageId]/unread-recipients
     List recipients who have NOT read the message.

GET  /api/school/messages/audience-preview
     Resolve audience size/names before sending.
     Query: audienceType, gradeLevel, physicalClassName, ...
     Response: { recipientCount, preview: [...first 10...] }
```

### 6.3 Teacher Messaging APIs (School Context)

```
GET  /api/teacher/students/[studentId]/parent-messages
     (existing — unchanged, returns teacher's messages for this student)

POST /api/teacher/students/[studentId]/parent-messages
     (existing — school_id auto-populated from teacher's school_id on send)

GET  /api/school/students/[studentId]/parent-messages
     School manager view: all teacher messages for this student across all teachers.
     Query: teacherId (optional filter), includeHidden
```

### 6.4 Parent Inbox APIs (School Context)

```
GET  /api/parent/school-messages
     List school messages addressed to this parent (by auth.uid()).
     Requires Supabase Auth session.
     Response: { messages: [...], unreadCount }

POST /api/parent/school-messages/[messageId]/read
     Mark a message as read (inserts into school_message_read_receipts).

GET  /api/parent/school-messages/[messageId]
     Get full message body.
```

### 6.5 School Dashboard Stats API (Extended)

```
GET  /api/school/me
     (existing — extend response to include):
     stats.unreadMessageCount (messages to school staff without response)
     stats.importantMessageCount
```

### 6.6 School Audit Log

```
GET  /api/school/audit-log
     (existing — extend to include account management and messaging events)
```

---

## 7. UI / Page / Component Proposal

### 7.1 School Portal Navigation (Extended)

Current nav: Dashboard | Teachers | Classes | Students

Proposed nav (Phase 1+): Dashboard | Teachers | Classes | Students | **Messages** | *(Accounts handled inside student card)*

### 7.2 Student Card — Access & Accounts Section (Phase 1)

**Where:** Existing `SchoolReportModal` or a new `SchoolStudentDetailModal` which shows the report plus an "Access & Accounts" section.

**Sections inside student card:**

```
[Student Name / Class]
[Learning Report Tab] [Access & Accounts Tab]

--- Access & Accounts Tab ---

Student Account:
  Username: leo-s0014
  Status: active | blocked | not created
  Last Login: 3 days ago | Never
  [Create Account] [Reset PIN] [Copy Credentials] [Block] [Unblock]
  * PIN shown once after create/reset, then hidden *

Parent Accounts:
  [ + Add Parent Access ]
  [ Link Existing Parent ]

  Parent 1:
    Name: אמא שלי
    Relation: mother
    Username: leo-p0014
    Status: active
    Last Login: 1 day ago
    [Reset PIN] [Copy] [Block] [Disconnect from student]

  Parent 2:
    Name: אבא שלי
    Relation: father
    Username: leo-p0015
    Status: not created
    [Create Account]
```

**New components:**
- `components/school-portal/SchoolStudentAccessPanel.jsx` — full Access & Accounts section.
- `components/school-portal/SchoolStudentParentAccessRow.jsx` — one parent access row.
- `components/school-portal/SchoolCredentialShownOnceBox.jsx` — reuse "shown once" pattern from teacher panels.

### 7.3 School Messages Page (Phase 2)

**Route:** `/school/messages`

**Sections:**
- Compose button → opens compose modal/drawer.
- Sent messages list (paginated, filterable by type, date, audience).
- Message row: recipient count, type badge, subject, date, read count / total count.
- Click message → open detail with recipient list and read status.

**New components:**
- `components/school-portal/SchoolMessagesPage.jsx` — page shell.
- `components/school-portal/SchoolComposeMessageModal.jsx` — compose form with audience picker, type selector, body, subject, optional attachment URL.
- `components/school-portal/SchoolMessageRow.jsx` — list row.
- `components/school-portal/SchoolMessageDetailModal.jsx` — detail + recipient list.
- `components/school-portal/SchoolAudiencePicker.jsx` — audience selection UI (all parents / grade / class / specific).
- `components/school-portal/SchoolMessageReadReceiptPanel.jsx` — who read / who did not.

**Audience picker flow:**
1. Select audience type (all parents, grade parents, class parents, specific parent, all teachers, ...).
2. If grade: grade level picker.
3. If class: grade + physical class picker (reuses `SchoolTeacherPhysicalClassPickerModal`).
4. If specific parent: search by name/username.
5. Preview count before sending.

### 7.4 Parent Portal — School Inbox (Phase 2)

**Route:** `/parent/school-inbox` (new page) or extended `/parent/dashboard`.

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

### 7.5 Parent Mini-Report in School Context (Phase 2)

**Approach:** Reuse existing `buildTeacherStudentReportPayload` (same as school portal student report).

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

**Component:** `components/parent/ParentMiniReportCard.jsx` — calls existing `/api/parent/student-report` (to be created) which wraps `buildTeacherStudentReportPayload`.

**API:** `GET /api/parent/mini-report?studentId=...` — returns the short report subset. Parent auth required. Parent must own student.

### 7.6 School Dashboard — Message Counters (Phase 3)

**Extend school dashboard stats card area:**
- New stat card: Unread Messages (messages requiring response with no read receipt yet).
- New stat card: Important/Urgent Active (unpinned important messages from last 7 days).
- Quick link: "Compose Message" button from dashboard.

### 7.7 Teacher Messages in School Context (Phase 2)

No new teacher portal page. Teachers continue using existing `/teacher/student/[studentId]` with `TeacherParentMessagePanel`. The extension (adding `school_id` to `teacher_parent_messages`) is transparent.

School manager can view all teacher messages per student from school portal student card.

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
| Parent | Supabase Auth user with children linked via `student_guardian_access` or `students.parent_id` |
| Student | Custom PIN session via `student_access_codes` |

### 8.2 Messaging Permissions

| Action | Super Admin | School Manager | School Secretary | Homeroom Teacher | Subject Teacher | Parent | Student |
|---|---|---|---|---|---|---|---|
| Send to all parents | Yes | Yes | No | No | No | No | No |
| Send to grade parents | Yes | Yes | No | No | No | No | No |
| Send to class parents | Yes | Yes | No | Yes (own class only) | No | No | No |
| Send to specific parent | Yes | Yes | No | Yes (own class only) | No | No | No |
| Send to all teachers | Yes | Yes | No | No | No | No | No |
| Send to teacher group | Yes | Yes | No | No | No | No | No |
| View sent messages | Yes | Yes | Yes | Own only | Own only | No | No |
| View read receipts | Yes | Yes | Yes | Own only | Own only | No | No |
| Hide/delete message | Yes | Yes | No | Own only | Own only | No | No |
| Receive school messages | — | — | — | Yes | Yes | Yes | No |
| Mark message as read | — | — | — | Yes | Yes | Yes | No |
| Send teacher→parent message | Yes | Yes | No | Yes (own class students) | Yes (own students only) | No | No |

### 8.3 Account Management Permissions

| Action | Super Admin | School Manager | School Secretary | Homeroom Teacher | Subject Teacher | Parent | Student |
|---|---|---|---|---|---|---|---|
| Create student account | Yes | Yes | Yes (proposed) | Maybe (Phase 2) | No | Yes (self) | No |
| Reset student PIN | Yes | Yes | Yes (proposed) | Maybe (Phase 2) | No | Yes (own child) | No |
| Block/unblock student account | Yes | Yes | Yes (proposed) | No | No | No | No |
| Create parent account | Yes | Yes | Yes (proposed) | No | No | No | No |
| Reset parent PIN | Yes | Yes | Yes (proposed) | No | No | No | No |
| Block/unblock parent account | Yes | Yes | Yes (proposed) | No | No | No | No |
| Link parent to student | Yes | Yes | Yes (proposed) | No | No | No | No |
| Disconnect parent from student | Yes | Yes | Yes (proposed) | No | No | No | No |
| View own account | No | No | No | No | No | Yes | Yes |

### 8.4 Report / Data Permissions

| Action | Super Admin | School Manager | School Secretary | Homeroom Teacher | Subject Teacher | Parent | Student |
|---|---|---|---|---|---|---|---|
| View any student report | Yes | Yes | No | Own class only | Own students only | Own children only | Own only |
| View school-wide stats | Yes | Yes | Partial | No | No | No | No |
| View parent mini-report | Yes | Yes | No | No | No | Yes (own child) | No |

### 8.5 School Secretary Role (Phase 2 Optional)

To add without breaking existing model:
- Add `'school_secretary'` to the `role` CHECK constraint in `school_teacher_memberships`.
- Secretary can manage accounts but cannot view learning reports or send messages.
- Requires new `requireSchoolStaffApiContext()` auth gate that allows both `school_admin` and `school_secretary`.

---

## 9. Username and PIN Strategy

### 9.1 School Code

- **Format:** 3-4 lowercase English letters (e.g., `leo`, `talp`, `kfar`).
- **Uniqueness:** Enforced by unique index on `school_accounts.school_code`.
- **Assignment:** At school creation, by platform admin. Not self-assigned by school.
- **Immutability:** Never changed after credentials exist. Special admin migration required if change is absolutely necessary (requires username rotation for all affected accounts).
- **Validation:** `^[a-z]{3,4}$`.

### 9.2 Student Username (School-Issued)

- **Format:** `{school_code}-s{sequence}` (e.g., `leo-s0152`).
- **Sequence:** Zero-padded to 4 digits. Sourced from `school_credential_sequences.next_student_seq`.
- **Allocation:** Atomic increment of `next_student_seq` at create time (service role only).
- **Uniqueness:** Checked against `student_access_codes` (normalized username) before issuing.
- **Same student:** If student already has an active username, the school portal shows existing username and offers reset-PIN only.

### 9.3 Parent Username (School-Issued)

- **Format:** `{school_code}-p{sequence}` (e.g., `leo-p0152`).
- **Sequence:** Sourced from `school_credential_sequences.next_parent_seq`.
- **One parent, multiple children:** If a parent is linked to multiple students, their **one username** covers all children. The `student_guardian_access` row is per-student, but the same `login_username` can appear for the same parent across multiple student rows (the parent is identified by username; their children are found by joining on `student_id`).
- **Existing parent account:** If a parent already has an account (teacher-issued), school manager sees the existing username and can reset PIN or link it to additional children without creating a new account.

### 9.4 PIN Policy

| Credential | PIN Type | Length | Complexity |
|---|---|---|---|
| Student account | Numeric | 4 digits | Simple (suitable for children) |
| Parent account (school-issued) | Numeric (Phase 1) or alphanumeric (Phase 2) | 6 digits or temp password | Must change on first login (Phase 2) |
| Teacher account | Supabase Auth password | N/A | Standard email/password |

**Security rules:**
- PIN is never stored in plaintext. Always hashed via `hashStudentSecret()`.
- Existing PIN is never displayed after creation.
- Temporary PIN is shown **once** immediately after creation or reset (shown-once box pattern, already implemented in `GuardianAccessPanel` and `StudentLoginAccessPanel`).
- Forgotten PIN requires reset by school manager (or parent for student PIN).
- "Force change on first login" for parent: Phase 2 feature. Requires adding a `must_change_pin` flag to `student_guardian_access`.

### 9.5 What the Existing System Already Handles

The crypto infrastructure in `lib/guardian-server/guardian-crypto.server.js` and the username allocation logic in `lib/teacher-server/teacher-access-prefix.server.js` are fully reusable. The school-scoped version only needs:
- A new `allocateSchoolAccessUsername(serviceRole, schoolId, kind)` function (mirrors `allocateTeacherAccessUsername` but uses `school_accounts.school_code` and `school_credential_sequences` instead of `teacher_profiles.access_prefix`).
- The crypto functions remain identical.

---

## 10. Messaging Strategy

### 10.1 Message Lifecycle

```
Compose → Audience Preview → Send → Fan-out (school_message_recipients)
       ↓
 [Recipient sees in inbox] → Opens message → Read receipt inserted
       ↓
 [Manager sees read counts in message detail]
```

### 10.2 Message Types and Phase

| Type | Phase | Description |
|---|---|---|
| `regular` | Phase 2 | Standard informational message |
| `important` | Phase 2 | Highlighted in yellow in parent inbox |
| `urgent` | Phase 2 | Highlighted in red; may trigger notification (future) |
| `requires_confirmation` | Phase 2 | Parent must tap "Received" button |
| `requires_response` | Phase 3 | Parent must enter a response |
| `pinned` | Phase 3 | Pinned to top of inbox |
| `archived` | Phase 3 | Moved to archive folder |

### 10.3 Audience Types and Resolution

| Audience Type | Resolution Logic |
|---|---|
| `all_parents` | All `student_guardian_access` + `students.parent_id` for enrolled students in school |
| `grade_parents` | Filter by `teacher_class_students.grade_level` or student grade |
| `class_parents` | Filter by `physical_class_name` in `teacher_classes` |
| `specific_parent` | Single `guardian_access_id` or Supabase Auth user ID |
| `all_teachers` | All `school_teacher_memberships.teacher_id` for school |
| `grade_teachers` | Teachers with subjects in that grade |
| `subject_teachers` | Teachers with matching subject in `school_teacher_subjects` |
| `class_teachers` | Teachers assigned to a specific physical class |
| `specific_teacher` | Single `teacher_id` |
| `homeroom_class_parents` | Teacher sends to parents of their physical class students |
| `homeroom_student_parent` | Teacher sends to parents of a specific student they teach |

**Important:** Subject teachers can only send in `homeroom_student_parent` or `homeroom_class_parents` scope if they are linked to those students via `teacher_students`. The API enforces this by checking the teacher's student scope.

### 10.4 Read Receipts

- When parent opens a message: `POST /api/parent/school-messages/[messageId]/read`.
- This inserts into `school_message_read_receipts` (upsert — idempotent).
- Manager can see: `read_count / total_recipient_count`.
- Manager can list unread recipients: join `school_message_recipients` LEFT JOIN `school_message_read_receipts` where `read_at IS NULL`.

### 10.5 What This Is NOT

This is **not free chat**. There is no real-time chat, no reply threads (Phase 1/2), no parent-initiated messages, and no unsolicited teacher-parent DMs outside the school context. The communication flow is:
- School → Parent (one-way broadcast or targeted).
- School → Teacher (one-way broadcast or targeted).
- Teacher → Parent (existing teacher_parent_messages, school-context aware).
- Parent → School: Only via `requires_response` type (Phase 3), not open chat.

---

## 11. Parent Mini-Report Strategy

### 11.1 Approach

Reuse `buildTeacherStudentReportPayload` already used by school portal. This function returns full report data including subject rollups, accuracy, sessions, and recommendations.

Create a **subset view** for parent mini-report:
- Filter to last 30 days.
- Show top 3-4 subjects with icons.
- Show accuracy per subject as a simple percentage bar.
- Show 2-3 strength highlights (from existing `recommendations` field).
- Show 1-2 areas needing practice.
- Show last 3 teacher messages from `teacher_parent_messages` (visible, not hidden, for teacher linked to this student at the school).
- Link to full report: `/learning/parent-report?studentId=...&source=parent`.

### 11.2 API

`GET /api/parent/mini-report?studentId=...`
- Requires Supabase Auth session (parent).
- Verifies parent owns student (via `student_guardian_access` or `students.parent_id`).
- Returns: `{ childName, gradeLevel, physicalClass, subjectSummary: [...], strengths: [...], areasForPractice: [...], lastTeacherMessages: [...], lastUpdated }`.
- Calls `buildTeacherStudentReportPayload` internally with `{ skipAudit: true }`.

### 11.3 Multi-Child Support

Parent dashboard already handles multiple children (up to `studentLimit`). Mini-report must:
- Render one card per child.
- Each card fetches its own mini-report independently.
- Children are identified by existing `students` rows linked to parent.

---

## 12. Implementation Phases

### Phase 1 — School Account Management Foundation

**Goal:** School manager can create, view, reset, block, and disconnect student and parent accounts from the school portal student card.

**Duration estimate:** 2-3 sprints.

**Files/areas affected:**
- New migration: `supabase/migrations/030_school_code.sql`
- New migration: `supabase/migrations/031_school_account_management.sql`
- New migration: `supabase/migrations/034_school_account_audit_actions.sql`
- New server lib: `lib/school-server/school-account-management.server.js`
- New API routes: `pages/api/school/students/[studentId]/accounts/...`
- New component: `components/school-portal/SchoolStudentAccessPanel.jsx`
- New component: `components/school-portal/SchoolStudentParentAccessRow.jsx`
- Modify component: `components/school-portal/SchoolReportModal.jsx` (add Access & Accounts tab)
- `lib/school-server/school-request.server.js` (unchanged — existing auth gate works)

**What is allowed:**
- Create new API routes under `/api/school/students/[studentId]/accounts/`.
- Extend `SchoolReportModal` with a second tab.
- Add new server lib files.
- Add new migrations (owner applies manually).

**What is forbidden:**
- Changing existing teacher access panel behavior.
- Changing existing parent dashboard credential creation.
- Changing existing PIN/crypto functions.
- Displaying PIN anywhere except shown-once box.
- Relying on username pattern for permissions.

**Exit criteria:**
- School manager can create a student account from school portal student card.
- School manager can create a parent account from school portal student card.
- Created credentials are shown once and then hidden.
- School manager can reset PIN for student and parent.
- School manager can block/unblock accounts.
- School manager can disconnect parent from student.
- All actions are logged in `teacher_access_audit`.
- Existing teacher flow is unaffected (regression test passes).

**Tests required:**
- Unit test: `school-account-management.server.js` — create, reset PIN, block, link, unlink.
- API test: each new `/api/school/students/[studentId]/accounts/*` route.
- Permission test: teacher (non-admin) cannot access account management endpoints.
- Playwright: school manager creates student account, credentials shown once, PIN hidden after dismiss.
- Playwright: school manager resets parent PIN.
- Regression: existing teacher flow creates guardian access unchanged.

**Owner approval gate:** School code must be assigned to at least one test school before Phase 1 QA.

---

### Phase 2 — Messaging Core + Parent Inbox + Teacher School Context

**Goal:** School manager can send messages to parents and teachers. Parents receive messages in a school inbox. Teacher messages in school context are linked to the school.

**Duration estimate:** 3-4 sprints.

**Files/areas affected:**
- New migration: `supabase/migrations/032_school_messaging.sql`
- New migration: `supabase/migrations/033_teacher_parent_messages_school_context.sql`
- New server lib: `lib/school-server/school-messaging.server.js`
- New API routes: `pages/api/school/messages/...`
- New API routes: `pages/api/parent/school-messages/...`
- New API route: `pages/api/parent/mini-report.js`
- New page: `pages/school/messages.js`
- New page: `pages/parent/school-inbox.js`
- New components: `SchoolMessagesPage`, `SchoolComposeMessageModal`, `SchoolAudiencePicker`, `SchoolMessageRow`, `SchoolMessageDetailModal`.
- New components: `ParentSchoolMessageList`, `ParentSchoolMessageDetail`.
- New component: `ParentMiniReportCard`.
- Modify: `SchoolPortalShell` nav (add Messages link).
- Modify: `/parent/dashboard` (add school inbox link/count, mini-report card).
- Backfill migration: teacher messages get `school_id` populated.

**What is allowed:**
- New page at `/school/messages`.
- New page at `/parent/school-inbox`.
- Extend `SchoolPortalShell` nav.
- Add school inbox link to parent dashboard.

**What is forbidden:**
- Changing Hebrew UI text on existing parent dashboard sections.
- Changing existing teacher message API behavior.
- Adding real-time chat / free reply threads.
- Allowing subject teachers to send to classes they are not linked to.

**Exit criteria:**
- School manager can compose and send a message to all parents.
- School manager can compose and send to grade or class parents.
- Parent receives message in school inbox.
- Parent can view full message and it is marked as read.
- Teacher parent message panel works unchanged.
- Teacher messages in school context show `school_id`.
- Parent mini-report shows subject summary for owned child.
- Multiple children: each child's mini-report is separate.
- Message type badges (regular, important, urgent) display correctly.

**Tests required:**
- Unit test: `school-messaging.server.js` — audience resolution for each audience type.
- Unit test: audience resolution does not cross-contaminate schools.
- API test: `POST /api/school/messages` fan-out creates correct recipient rows.
- API test: `POST /api/parent/school-messages/[messageId]/read` inserts read receipt.
- Permission test: parent cannot access another parent's messages.
- Permission test: teacher (non-admin) cannot send school-level messages.
- Playwright: compose → send → parent inbox shows message.
- Playwright: parent opens message → read receipt created → manager sees read count update.
- Playwright: mini-report loads and shows subject summary.
- Multi-child Playwright: parent with 2 children sees separate mini-report per child.

**Owner approval gate:** Hebrew UI copy for message compose, message type labels, and parent inbox must be approved before implementation.

---

### Phase 3 — Read Receipts Dashboard, Advanced Targeting, Homeroom Teacher Messaging

**Goal:** Read receipt dashboard for school manager. Homeroom teacher can send class messages. Segment targeting (grade filter). Dashboard counters for unread messages.

**Duration estimate:** 2-3 sprints.

**Files/areas affected:**
- Extend `/api/school/messages/[messageId]/recipients` with read status.
- Extend `/api/school/messages/[messageId]/unread-recipients`.
- Extend `/api/school/me` stats response with message counters.
- New component: `SchoolMessageReadReceiptPanel`.
- New component: school dashboard message counter stat card.
- New API route: `POST /api/teacher/school-messages` (teacher sends in school context — homeroom class parents).
- Extend `SchoolPortalShell` nav badge (unread count).
- Extend teacher portal student card with `homeroom_student_parent` send option (Phase 3+).
- Add `school_secretary` role to `school_teacher_memberships` CHECK constraint.

**What is allowed:**
- Homeroom teacher sending to their physical class parents.
- School manager read receipt view.
- Dashboard counters.

**What is forbidden:**
- Subject teacher sending to classes they are not linked to.
- Allowing parents to initiate messages (reply threads are future).
- Changing existing teacher_parent_messages behavior.

**Exit criteria:**
- School manager can see how many recipients read a message.
- School manager can see list of who read and who did not read.
- School manager can filter unread recipients by class.
- Dashboard shows unread message count.
- Homeroom teacher can send a message to their physical class parents.
- Subject teacher cannot send school-level messages.
- School secretary role added to membership table (no UI yet).

**Tests required:**
- API test: read receipt count is accurate.
- Permission test: homeroom teacher can only send to their own class parents.
- Permission test: subject teacher cannot access school messaging endpoints.
- Playwright: manager views read receipt panel.
- Playwright: dashboard counter increments after unread message.

**Owner approval gate:** Homeroom teacher messaging scope — confirm which teachers qualify as "homeroom" (by physical class primary teacher assignment).

---

### Phase 4 — Future / Optional

**Goal:** Advanced features, scheduled messages, parent reply, student account improvements, segment targeting.

**Features (not scheduled):**
- Scheduled message delivery.
- Parent reply to `requires_response` messages.
- Segment targeting: parents of inactive students, learning support groups, report-based filters.
- Student-facing school messages (low priority per requirement).
- Push/email notifications for important messages.
- `must_change_pin` flag for parent first-login (force PIN change).
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

## 13. Test and QA Plan

### 13.1 Unit Tests

- `school-account-management.server.js`: create student account, create parent account, reset PIN, block, unblock, revoke, link parent, unlink parent.
- `school-messaging.server.js`: audience resolution for each audience type; fan-out creates correct recipient rows; no cross-school contamination.
- `school-code` allocation: unique constraint prevents duplicate codes.
- `school-credential-sequences`: atomic increment.
- Username format: `{code}-s0152`, `{code}-p0152` format validation.
- PIN generation: 4-digit student, 6-digit parent.
- "Shown once" pattern: PIN not returned after creation if stored.

### 13.2 API / Server Tests

- Each account management endpoint: create, reset PIN, block, unblock, revoke, link, unlink.
- Each messaging endpoint: compose, send, list, hide, read receipt.
- Mini-report API: returns correct subset for parent.
- Audience preview endpoint: correct count for each audience type.
- Backfill: `school_id` on teacher_parent_messages is set for school-associated teachers.

### 13.3 Permission / Security Tests

- School manager can access all school account endpoints. ✓
- Regular teacher (non-admin) receives 403 from school account endpoints. ✓
- School manager cannot access another school's student accounts. ✓
- Parent can only see messages addressed to them. ✓
- Parent A cannot read messages of Parent B. ✓
- Guardian session (custom, non-Supabase-Auth) cannot access school inbox (school inbox requires Supabase Auth parent session). ✓
- Subject teacher cannot send school-level messages. ✓
- Homeroom teacher can only send to their own class parents (not other classes). ✓

### 13.4 RLS Tests

- `school_messages`: no row readable by authenticated user directly. Service role only.
- `school_message_recipients`: no row readable by authenticated user directly.
- `school_message_read_receipts`: parent can INSERT own row; parent cannot INSERT for another user.
- `school_message_read_receipts`: parent can SELECT own rows; cannot SELECT another parent's rows.
- `school_credential_sequences`: no authenticated access.

### 13.5 Playwright E2E Tests

- School manager creates student account → credentials shown once → dismissed → not shown again.
- School manager resets student PIN → new PIN shown once.
- School manager blocks student account → student login fails.
- School manager creates parent account → parent can log in with new credentials.
- School manager sends message to all parents → each parent sees message in school inbox.
- Parent opens message → read receipt created → manager sees count update.
- Parent with 2 children: each child's mini-report shows separately.
- Homeroom teacher sends message to class parents → class parents receive message → non-class parents do not.
- Subject teacher cannot see school messaging compose button.
- School manager views read receipt panel → lists who read and who did not.

### 13.6 Mobile / Desktop Visual Checks

- School portal student card Access & Accounts tab: mobile (375px) and desktop (1280px).
- School compose message modal: mobile and desktop.
- Parent school inbox: mobile and desktop (RTL layout).
- Parent mini-report card: mobile (single child), mobile (2 children).

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
- [ ] School manager cannot read another school's data (school_id boundary in all queries).
- [ ] Parent A cannot see Parent B's messages (recipient_user_id = auth.uid() in all parent queries).
- [ ] Subject teacher cannot access student accounts they are not linked to.
- [ ] `school_code` never used as a security boundary — all auth uses relational joins.
- [ ] Username pattern not used for permissions — all authorization via DB relations.
- [ ] `school_message_recipients` fan-out happens server-side only; client never resolves audience.
- [ ] Audit log (teacher_access_audit) records all account management and messaging actions.
- [ ] Hebrew text in UI: never invented without owner approval.
- [ ] No PII (parent names, email) stored in audit log metadata (only user IDs and action codes).
- [ ] Message attachments: URL only stored (Phase 1/2); file upload (if any) to approved storage only.
- [ ] School messages never expose parent email to school manager UI (only username and display name).
- [ ] Parent cannot send messages to school (Phase 1-3; Phase 4 may add requires_response reply).
- [ ] Child data (mini-report) only visible to authenticated parent of that child.
- [ ] Guardian session (non-Supabase-Auth custom session) does NOT have access to school inbox.
- [ ] RLS on all new tables; no anon access; no direct authenticated mutation where service role is required.
- [ ] `school_credential_sequences` updated atomically (use Postgres advisory lock or FOR UPDATE in service role).

---

## 15. Risks

### 15.1 Data Privacy Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Wrong parent sees wrong child's message | Medium | High | `recipient_user_id = auth.uid()` check on all parent queries; RLS enforced |
| Teacher sees students from another class/school | Low | High | `verifyStudentVisibleToSchool()` check on all school APIs |
| Duplicate parent accounts (teacher + school-issued) | High | Medium | UI warns if parent already has an active account; same username not issued twice |
| Username collision between schools | Low | Medium | Global unique index on normalized username across `student_guardian_access` |
| PIN exposed after creation | Low | High | Shown-once pattern enforced; no GET endpoint returns pin_hash or plaintext |
| School manager sees parent email | Medium | Medium | API returns display_name and username only, not email |

### 15.2 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Fan-out bottleneck for large schools (500+ parents) | Medium | Medium | Fan-out is async; use batched insert; add background job if needed |
| Audience resolution joins are slow | Medium | Medium | Proper indexes on `school_student_enrollments`, `teacher_class_students` |
| Breaking existing teacher portal | Medium | High | Strict separation of APIs; no changes to existing teacher routes; regression tests |
| Breaking existing parent dashboard | Low | High | New APIs only; existing parent APIs unchanged |
| school_id backfill on teacher_parent_messages fails | Low | Low | Backfill is best-effort UPDATE; NULL school_id is acceptable for old messages |
| Hebrew UI text changed without approval | Low | High | Planning doc constraint; no Hebrew text invented in plan; all copy approved before implementation |

### 15.3 Product Risks

| Risk | Description | Mitigation |
|---|---|---|
| Becoming uncontrolled WhatsApp | School messaging turns into free chat | Strict: no parent-initiated messages; no reply threads in Phase 1-3; all messages are from school/teacher only |
| Over-engineering Phase 1 | Adding too many message types at once | Phase 1 = accounts only; Phase 2 = basic messaging; message types added incrementally |
| Confusing parent UX | Parent sees school inbox and teacher messages as separate | Mini-report design must clearly separate school messages from teacher academic messages |
| Teacher conflict | School manager sends messages that conflict with teacher's class messages | Teachers are notified of school messages to their class; read receipts visible to both manager and teacher (Phase 3) |
| Username change needed after accounts exist | School code mistake | Policy: school code never changes; admin migration process documented before launch |

---

## 16. Open Questions for Owner

1. **School code assignment:** Who assigns the school code — the platform admin, or can school managers request one? Should there be a UI for the platform admin to assign codes?

2. **Parent username scope:** Should one parent username cover multiple children (one credential, linked to multiple `student_guardian_access` rows), or should each child-parent relationship have a separate username? **Recommendation:** One parent credential, linked to multiple students.

3. **Guardian session vs. Supabase Auth for parents:** Currently, `students.parent_id` links to Supabase Auth users (full parent accounts), while `student_guardian_access` uses a custom cookie session. Should school-issued parent access use Supabase Auth or the existing guardian session system? **Recommendation:** Use existing guardian session system for school-issued parent access (consistent with teacher-issued accounts; avoids Supabase Auth email requirement). School inbox requires either system.

4. **Homeroom teacher definition:** What qualifies a teacher as a "homeroom teacher" for messaging? Is it being the primary teacher of a physical class? Does this need a flag in `school_teacher_memberships` or `teacher_classes`?

5. **Secretary role:** Is the school secretary role needed in Phase 1, or can it wait for Phase 2/3?

6. **Message attachment handling:** Attachments as URLs only (Phase 1/2), or is file upload to Supabase Storage required from the start?

7. **Notification delivery:** Are in-portal read receipts sufficient for Phase 2, or is email/SMS notification for urgent messages required in Phase 2?

8. **Parent mini-report:** Should the mini-report be a new page (`/parent/mini-report`) or an expandable card on the existing parent dashboard?

9. **Force PIN change on first login:** Is this a Phase 1 requirement or Phase 2? What UI does the parent see when forced to change?

10. **Existing parent accounts:** Some parents already have Supabase Auth accounts (via `students.parent_id`). Should these parents receive school inbox messages using their Supabase Auth session? This would give them access without a guardian-style credential.

11. **Student portal messaging:** Is student-facing messaging ever in scope, or strictly parent/teacher only?

12. **Hebrew UI copy approval:** Who approves Hebrew text for all new UI surfaces? All copy must be reviewed before implementation begins.

---

## 17. Final Recommendation

### Recommended Implementation Order

1. **First: Apply migrations 030 and 031** (school code + credential tracking). These are additive, have no product impact, and unlock everything else.

2. **Second: Build school account management APIs and student card UI (Phase 1)**. This is the highest-value, lowest-risk change. School managers need this regardless of messaging.

3. **Third: Apply migration 032 and build messaging core (Phase 2)**. Start with `all_parents` audience only. Prove the fan-out and read-receipt mechanics work before expanding audience types.

4. **Fourth: Build parent school inbox and mini-report (Phase 2)**.

5. **Fifth: Expand messaging audience types, homeroom teacher messaging, read receipt dashboard (Phase 3)**.

6. **Later: Phase 4 optional features** based on product usage data.

### Architecture Principles to Maintain

- All mutations via service-role APIs. No direct client mutations on sensitive tables.
- Authorization always via DB relations. Never via username pattern.
- Append-only message history. Soft-delete only.
- Shown-once PIN pattern enforced at all account creation/reset points.
- Hebrew text: never change existing strings without approval. New strings: approve before code.
- Regular teacher flow: never modify existing teacher portal APIs or behavior.
- School scope: all school queries always filter by `school_id`. No data crosses school boundaries.
- Audit trail: all account management and messaging actions logged in `teacher_access_audit`.

### What the Owner Needs to Do Before Phase 1 Implementation

1. Assign school codes to existing school accounts in the DB (manually, post-migration-030).
2. Approve Hebrew UI copy for the Access & Accounts section.
3. Answer open questions 3, 4, and 5 (guardian session vs Supabase Auth; homeroom teacher definition; secretary role timing).
4. Confirm PIN policy: 4-digit student, 6-digit parent in Phase 1; force-change in Phase 2.

---

*This document is planning only. No implementation code has been written. No SQL has been executed. No commits or pushes have been made. All decisions in this document require owner review and approval before implementation begins.*
