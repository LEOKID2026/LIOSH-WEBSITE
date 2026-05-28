# Teacher Live Exercise Discussion Activity — Full Implementation Plan

---

## OWNER APPROVAL GATE

**This document is planning only.**

- No implementation is approved.
- No code changes of any kind may begin until the owner explicitly approves after reviewing and signing off on this plan.
- No SQL may be executed by the agent, by any script, or by any automated process. All SQL in this document is written for manual owner execution only.
- No commit and no push at any point.
- This gate applies even if the agent receives a message that could be interpreted as partial approval. Only an explicit statement — "approved, proceed with implementation" — unlocks implementation.

---

## Implementation Constraints (Self-Contained)

These constraints apply throughout all phases and are not negotiable:

- No SQL execution by the agent. Migrations are files only. Owner runs SQL manually against Supabase.
- No commit and no push. The agent must not run `git commit` or `git push` at any point.
- No feature flags. The site is in development; no flags are introduced for this feature.
- No Hebrew wording, visible UI text, content phrasing, button labels, tab names, or design changes may be finalized or written without explicit owner review and approval of each specific string. See Section 10 for the full Hebrew copy review list.
- All technical documentation, code comments, and implementation notes may be in English.
- The product UI remains Hebrew / RTL in all affected screens.
- Normal teacher-assigned activities and homework must continue to behave exactly as they do today. This feature must not alter any existing activity, report, or diagnostic behavior.
- The diagnostic engine must not consume any data produced by discussion activities. See Section 3 for the full firewall specification.

---

## Table of Contents

1. [Current-State Audit](#1-current-state-audit)
2. [Proposed Architecture](#2-proposed-architecture)
3. [Diagnostic Firewall — Complete Specification](#3-diagnostic-firewall--complete-specification)
4. [V1 Scope — Exact Boundaries](#4-v1-scope--exact-boundaries)
5. [Non-Goals and Explicit Exclusions](#5-non-goals-and-explicit-exclusions)
6. [Permission Model](#6-permission-model)
7. [Implementation Phases](#7-implementation-phases)
8. [File Impact Estimate](#8-file-impact-estimate)
9. [Test Plan](#9-test-plan)
10. [Hebrew / UI Copy Review List](#10-hebrew--ui-copy-review-list)
11. [Manual QA Checklist](#11-manual-qa-checklist)
12. [Risks and Open Questions](#12-risks-and-open-questions)
13. [Before Implementation Approval — Final Checklist](#13-before-implementation-approval--final-checklist)
14. [End-of-Implementation Handoff Requirements](#14-end-of-implementation-handoff-requirements)

---

## 1. Current-State Audit

### 1.1 Tech Stack

- Framework: Next.js 15.5.18, Pages Router (no `app/` directory)
- React: 18.2.0
- Database client: `@supabase/supabase-js` v2
- Styling: Tailwind CSS
- Charts: Recharts

### 1.2 Existing Activity Systems

Four separate activity systems exist today:

| System | Core tables | Context |
|---|---|---|
| Classroom activities | `classroom_activities`, `classroom_activity_student_status`, `classroom_activity_attempts` | Class-scoped; teacher controls lifecycle |
| Individual activities | `student_activities`, `student_activity_status`, `student_activity_attempts` | Private tutor 1:1 |
| Worksheet activities | `worksheet_activities`, `worksheet_questions`, `worksheet_student_status`, `worksheet_student_answers`, `worksheet_student_assignments` | PDF/digital; supports selected-student scope |
| Self-directed practice | `learning_sessions`, `answers` | Student-initiated; **primary diagnostic input — must never be touched** |

There is no "uniform activity", "teacher_activities", or existing "discussion" activity type in the codebase.

### 1.3 Existing Activity Modes (DB CHECK constraints)

- `classroom_activities.mode`: `live_lesson`, `guided_practice`, `quiz`, `homework`
- `student_activities.mode`: `guided_practice`, `quiz`, `homework`
- Activity lifecycle statuses: `draft`, `active`, `paused`, `closed`, `archived`
- Per-student statuses: `not_started`, `in_progress`, `submitted`, `timed_out`
- `question_count` already allows 1 (CHECK: `between 1 and 50`)

### 1.4 Question Bank Structure

The question bank is not in Postgres. It lives in JS files:

| Subject | Location | ID stability |
|---|---|---|
| Math / Geometry | `utils/math-*`, `utils/geometry-*` | Procedural generators — no stable static IDs |
| Science | `data/science-questions.js` | Stable string IDs (e.g. `"body_1"`) but not preserved in frozen snapshots |
| Hebrew | `data/hebrew-questions/g1.js`–`g6.js` | Nested by topic/level; no top-level ID |
| English | `data/english-questions/*-pools.js` | Pool-based |
| Geography | `data/geography-questions/g*.js` | Per-grade files |
| Curriculum spine | `data/curriculum-spine/v1/skills.json` | Subject / grade / topic / subtopic metadata |

Teacher assignment path today: choose subject / grade / topic / difficulty → `generateActivityQuestionSetClient` → frozen `question_set` JSONB stored in the activity row. There is no teacher-facing "browse individual questions by ID" UI.

### 1.5 Existing Teacher Permission Model

#### Private teachers
- Identified by absence of a row in `school_teacher_memberships`.
- `assertSchoolTeacherSubjectAllowed` returns `allowed: true` unconditionally for private teachers today.
- There are no subject/grade restrictions for private teachers in the current codebase.

#### School teachers
- Row in `school_teacher_memberships` with `role = 'teacher'`.
- Subject/grade permissions in `school_teacher_subjects`: `grade_level IS NULL` = all grades for that subject; integer = specific grade only.
- Enforcement: application-layer in `lib/school-server/school-subjects.server.js`.

#### School admin/manager
- Same `school_teacher_memberships` table with `role = 'school_admin'`. Unrestricted within their school.
- Subject grant UI already exists: `components/school-portal/SchoolTeacherDetailContent.jsx`.
- APIs: `GET/POST /api/school/teachers/[teacherId]/subjects`, `DELETE /api/school/teachers/[teacherId]/subjects/[subjectId]`.

#### Platform admin
- Controls feature flags, quotas, account status, school assignments.
- Does not manage subject/grade grants for private teachers today.
- Admin UI: `pages/admin/teachers/`, `components/admin/TeacherAdminDetailView.jsx`.

### 1.6 Existing Pages and APIs Relevant to This Feature

Teacher pages:
- `pages/teacher/class/[classId]/activities/index.js` — activity list
- `pages/teacher/class/[classId]/activities/new.js` — create activity
- `pages/teacher/class/[classId]/activities/[activityId]/monitor.js` — live monitor
- `pages/teacher/student/[studentId].js` — individual student management

Teacher APIs:
- `pages/api/teacher/activities/index.js` (GET list, POST create)
- `pages/api/teacher/activities/[activityId]/status.js` (PATCH lifecycle)
- `pages/api/teacher/activities/[activityId]/monitor.js` (GET monitoring)
- `pages/api/teacher/activities/[activityId]/students/[studentId]/answers.js` (GET per-student answers)
- `pages/api/teacher/student-activities/index.js` (GET/POST for 1:1)

Student pages:
- `pages/student/home.js` — hosts `StudentClassroomActivitiesPanel`
- `pages/student/activity/[activityId].js` — unified play UI

Student APIs:
- `pages/api/student/activities/[activityId]/start.js`
- `pages/api/student/activities/[activityId]/answer.js`
- `pages/api/student/activities/[activityId]/submit.js`

---

## 2. Proposed Architecture

### 2.1 Reuse Strategy

| Need | Approach |
|---|---|
| Activity storage | Reuse `classroom_activities` (class) and `student_activities` (private 1:1) with new `mode='discussion'` |
| Student play | Reuse existing `/api/student/activities/*` routes unchanged |
| Teacher monitoring | Reuse existing `/api/teacher/activities/[id]/monitor` and monitor page |
| Question generation | Reuse `generateActivityQuestionSetClient` with `question_count=1` |
| School teacher permissions | Reuse `assertSchoolTeacherSubjectAllowed` + existing school manager UI |
| Activity creation API | Extend existing `POST /api/teacher/activities` to accept `mode='discussion'` |

No new activity tables are needed for V1.

### 2.2 Data Model Changes

Two migrations are required. Neither may be executed by the agent. Both are written as files for the owner to run manually.

---

#### Migration 036 — `private_teacher_subjects`

File: `supabase/migrations/036_private_teacher_subjects.sql`

Owner pre-run check: confirm `teacher_profiles` table exists (migration 019 must have been applied).

```sql
-- 036_private_teacher_subjects.sql
-- OWNER MUST RUN MANUALLY. Agent must NOT execute.
-- Creates subject/grade permission table for private (non-school) teachers.
-- Mirrors school_teacher_subjects but without school_id FK.
-- Requires 019_teacher_portal_foundation.sql applied first.

begin;

create table if not exists public.private_teacher_subjects (
  id          uuid        primary key default gen_random_uuid(),
  teacher_id  uuid        not null
                          references public.teacher_profiles(id) on delete cascade,
  subject     text        not null
                          check (subject in (
                            'math','geometry','hebrew','english',
                            'science','moledet_geography'
                          )),
  grade_level integer     null
                          check (grade_level is null or (grade_level between 1 and 12)),
  granted_by  uuid        not null
                          references auth.users(id),
  created_at  timestamptz not null default now()
);

comment on table public.private_teacher_subjects is
  'Subject/grade permissions for private (non-school) teachers, managed by platform admin only.
   grade_level IS NULL means all grades for that subject.
   Mirrors school_teacher_subjects without school_id FK.
   Mutations via service-role admin APIs only. RLS ON, no authenticated policies.';

-- grade_level NULL = all grades (unique per teacher+subject)
create unique index private_teacher_subjects_all_grades_uq
  on public.private_teacher_subjects (teacher_id, subject)
  where grade_level is null;

-- specific grade (unique per teacher+subject+grade)
create unique index private_teacher_subjects_per_grade_uq
  on public.private_teacher_subjects (teacher_id, subject, grade_level)
  where grade_level is not null;

create index private_teacher_subjects_teacher_idx
  on public.private_teacher_subjects (teacher_id);

alter table public.private_teacher_subjects enable row level security;
-- No authenticated RLS policies: all access via service-role APIs only.

commit;
```

---

#### Migration 037 — Add `discussion` to mode CHECK constraints

File: `supabase/migrations/037_discussion_activity_mode.sql`

Owner pre-run step — verify exact constraint names before running the migration:

```sql
-- Run these queries first, before executing the migration:
SELECT conname FROM pg_constraint
  WHERE conrelid = 'public.classroom_activities'::regclass AND conname LIKE '%mode%';
SELECT conname FROM pg_constraint
  WHERE conrelid = 'public.student_activities'::regclass AND conname LIKE '%mode%';
```

Replace constraint names in the migration below if the names returned differ from the defaults:

```sql
-- 037_discussion_activity_mode.sql
-- OWNER MUST RUN MANUALLY. Agent must NOT execute.
-- Extends mode CHECK constraints to allow 'discussion' mode on both activity tables.
-- This is additive: all existing rows and behavior are unchanged.
-- Verify constraint names with the SELECT queries above before running.

begin;

-- classroom_activities: replace constraint name below if SELECT returned a different name
alter table public.classroom_activities
  drop constraint if exists classroom_activities_mode_check;

alter table public.classroom_activities
  add constraint classroom_activities_mode_check
  check (mode in ('live_lesson','guided_practice','quiz','homework','discussion'));

-- student_activities: replace constraint name below if SELECT returned a different name
alter table public.student_activities
  drop constraint if exists student_activities_mode_check;

alter table public.student_activities
  add constraint student_activities_mode_check
  check (mode in ('guided_practice','quiz','homework','discussion'));

comment on column public.classroom_activities.mode is
  'Activity delivery mode.
   live_lesson = teacher-broadcast, guided_practice / quiz / homework = student self-paced.
   discussion = single-question teacher discussion exercise.
   discussion mode is excluded from all diagnostic rollups.';

comment on column public.student_activities.mode is
  'Activity delivery mode.
   guided_practice / quiz / homework = student self-paced.
   discussion = single-question private teacher discussion exercise.
   discussion mode is excluded from all diagnostic rollups.';

commit;
```

---

### 2.3 New API Routes

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/teacher/discussion/question-preview` | Generate ~5 sample questions for teacher picker; returns correct answers | Teacher session |
| GET | `/api/admin/teachers/[teacherId]/discussion-subjects` | List private teacher subject grants | Platform admin |
| POST | `/api/admin/teachers/[teacherId]/discussion-subjects` | Grant subject/grade to private teacher | Platform admin |
| DELETE | `/api/admin/teachers/[teacherId]/discussion-subjects/[grantId]` | Revoke grant | Platform admin |

All activity CRUD (create, activate, monitor, student play) reuses existing routes.

### 2.4 Server Library Changes

#### `lib/classroom-activities/classroom-activities-shared.server.js`

- Add `'discussion'` to `ACTIVITY_MODES` constant.
- `validateSameExactQuestionSet`: for `mode='discussion'`, confirm `question_count=1` is accepted. The correct_answer must still be present in the stored `question_set` (it is required for the teacher monitoring view). The existing strip of `correct_answer` from the student-facing payload happens in `loadActivityForStudent` and applies to all modes including `discussion` — no change needed there.

#### `lib/school-server/school-subjects.server.js`

Add new exported function:

```javascript
/**
 * Checks whether a private teacher (no school membership) is permitted
 * to use a given subject+grade for discussion activities.
 * Returns { ok: true, allowed: true|false }.
 *
 * Rules:
 *   - No rows at all → allowed: false (explicit deny by default)
 *   - Row with grade_level IS NULL for matching subject → allowed: true (all grades)
 *   - Row with matching subject AND grade_level = requested grade → allowed: true
 *   - No matching row → allowed: false
 */
export async function assertPrivateTeacherSubjectAllowed(
  serviceRole, teacherId, subject, gradeLevel
) { /* implementation in Phase 4 */ }
```

#### `lib/teacher-server/teacher-activities.server.js`

In `createClassroomActivity`: when `mode === 'discussion'`, after existing school teacher permission check, add a branch for private teachers that calls `assertPrivateTeacherSubjectAllowed`. If not allowed, return `{ ok: false, status: 403, code: 'subject_not_permitted' }`. The API must reject unauthorized subject/grade creation attempts regardless of what the UI shows.

#### `lib/teacher-server/student-activity.server.js`

Same permission branch for `mode='discussion'` in `createStudentActivity`.

#### `lib/teacher-server/classroom-activity-class-report.server.js` — Diagnostic Firewall

See Section 3 for full details. Summary: add `.neq("mode", "discussion")` to three specific `classroom_activities` queries.

#### `lib/teacher-server/teacher-dashboard-activity.server.js`

Add `.neq("mode", "discussion")` to classroom activity queries that contribute to accuracy or mastery metrics. Discussion activities may still appear in activity count metrics (e.g. "activities this week") but must not contribute to any accuracy, correct/wrong, or topic proficiency aggregation.

#### New: `lib/teacher-server/discussion-question-preview.server.js`

- Accepts `{ subject, gradeLevel, topic, difficulty, count = 5 }`.
- Generates `count` sample questions using the server-side equivalent of `generateActivityQuestionSetClient`.
- Returns full question objects including `correct_answer` (teacher-only endpoint).
- Validates that the requesting teacher is permitted for the subject+grade before generating.

#### New: `lib/admin-server/admin-private-teacher-subjects.server.js`

CRUD for `private_teacher_subjects`:
- `listPrivateTeacherSubjects(serviceRole, teacherId)`
- `grantPrivateTeacherSubject(serviceRole, teacherId, subject, gradeLevel, adminUserId)`
- `revokePrivateTeacherSubject(serviceRole, teacherId, grantId)`

All functions require a verified platform admin context.

### 2.5 Teacher UI Flow

For school teachers (class-scoped discussion):

1. Teacher opens class page → Discussion tab visible in nav alongside Activities / Worksheets.
2. Click "Create Discussion" → new page `pages/teacher/class/[classId]/discussion/new.js`.
3. Filter bar: subject (auto-filtered to class grade + teacher permissions), topic, subtopic, difficulty.
4. Click "Generate questions" → calls `/api/teacher/discussion/question-preview` → ~5 question cards appear.
5. Each card shows: question text, answer options, correct answer highlighted (teacher-only), topic/difficulty metadata.
6. Teacher clicks "Use this question" → confirmation form: title (pre-populated), recipients = whole class (default) or selected students from class roster.
7. POST to `/api/teacher/activities` with `{ mode: 'discussion', question_count: 1, question_set: [selectedQuestion] }`.
8. On success → redirect to monitoring page for that activity.

For private teachers (1:1 discussion):

1. Teacher opens student page `pages/teacher/student/[studentId].js`.
2. New panel `TeacherStudentDiscussionPanel.jsx` visible.
3. Same question picker flow → POST to `/api/teacher/student-activities` with `mode='discussion'`.
4. Monitoring via existing individual activity report endpoint.

Teacher monitoring view (reused):

- Reuse `pages/teacher/class/[classId]/activities/[activityId]/monitor.js`.
- For `mode='discussion'`: show summary (submitted / not submitted / correct / incorrect) + per-student table with their answer and correct/incorrect computed from stored `correct_answer` vs `selected_answer`.

### 2.6 Student UI Flow

1. Discussion activity appears in `StudentClassroomActivitiesPanel.jsx` on `pages/student/home.js` (existing list query already returns all active class activities; no change needed).
2. Student opens `pages/student/activity/[activityId].js` (no routing changes).
3. Patch required: if `activity.mode === 'discussion'`, suppress correctness feedback after submission. Student sees a neutral "answer submitted" confirmation. No correct/incorrect shown. No explanation shown.
4. Submit → existing `/api/student/activities/[activityId]/submit` → writes to `classroom_activity_attempts` as normal.

---

## 3. Diagnostic Firewall — Complete Specification

This section is authoritative. Any implementation that does not satisfy all items in this section is not complete.

### 3.1 What discussion activities must never do

- Must never write to `learning_sessions`.
- Must never write to `answers`.
- Must never call `/api/learning/answer` or any other route that writes to `answers`.
- Must never call `/api/learning/session/start` or `/api/learning/session/finish`.
- Must never affect: parent reports, teacher diagnostic reports, class diagnostic reports, mastery/weakness diagnosis, topic next-step recommendations, or professional diagnostic scoring of any kind.

### 3.2 Why discussion activities are already safe from parent diagnostics

The parent diagnostic pipeline reads only `learning_sessions` + `answers` via `aggregateParentReportPayload` in `lib/parent-server/report-data-aggregate.server.js`. Discussion activities store answers in `classroom_activity_attempts`, which `aggregateParentReportPayload` does not read. No change is needed to protect parent diagnostics — the isolation is structural.

### 3.3 Why classroom activities partially touch teacher diagnostics — and how to fix it

`lib/teacher-server/classroom-activity-class-report.server.js` contains `mergeClassroomActivityRollupIntoReportPayload`, which reads `classroom_activities` for a class and merges per-student accuracy counts into teacher and school report payloads. If `mode='discussion'` activities are not filtered, their attempts will contribute to topic accuracy and subject accuracy in teacher reports.

The fix is one filter added to three Supabase query chains in that file:

| Location in file | Existing filter chain | Required addition |
|---|---|---|
| Line ~341 | `.eq("class_id", classId).neq("status", "archived")` | `.neq("mode", "discussion")` |
| Line ~427 | same pattern | `.neq("mode", "discussion")` |
| Line ~521 | same pattern | `.neq("mode", "discussion")` |

### 3.4 Complete list of report and aggregation paths that must exclude `mode='discussion'`

Every function and API below must either already exclude discussion (by table isolation) or must be explicitly patched:

| Function / file | Current isolation | Action required |
|---|---|---|
| `aggregateParentReportPayload` in `lib/parent-server/report-data-aggregate.server.js` | Reads only `learning_sessions` + `answers` — structural isolation | No change needed |
| `mergeClassroomActivityRollupIntoReportPayload` in `lib/teacher-server/classroom-activity-class-report.server.js` | Reads `classroom_activities` without mode filter | Add `.neq("mode","discussion")` at lines ~341, ~427, ~521 |
| `buildClassroomActivityRollupsByStudentId` in same file | Called with activities fetched above | Fix at fetch level; this function need not change |
| `GET /api/teacher/students/[studentId]/report-data` | Calls `mergeClassroomActivityRollupIntoReportPayload` | Fixed by above |
| `GET /api/teacher/classes/[classId]/report-data` | Same merge function | Fixed by above |
| `GET /api/school/students/[studentId]/report-data` | Same merge function | Fixed by above |
| `GET /api/parent/students/[studentId]/report-data` | Structural isolation (no classroom tables) | No change needed |
| `lib/teacher-server/teacher-dashboard-activity.server.js` | Reads `classroom_activities` for accuracy metrics | Add `.neq("mode","discussion")` to accuracy-contributing queries |
| `lib/teacher-server/teacher-guidance-v2.server.js` | Consumes aggregated payload (already filtered after above fixes) | Verify; no direct classroom query expected |
| `generateParentReportV2` / `runDiagnosticEngineV2` in `utils/` | Client-side; operates on adapter output | No direct DB access; already safe after upstream fix |
| `student_activity_attempts` (private teacher 1:1) | Not read by any diagnostic report pipeline | Already isolated; no change needed |

### 3.5 Verification requirement

After implementation, the following check must be performed and documented before handoff:

1. Record the full JSON response of `GET /api/parent/students/[testStudentId]/report-data` as baseline.
2. Record the full JSON response of `GET /api/teacher/students/[testStudentId]/report-data` as baseline.
3. Record the full JSON response of `GET /api/teacher/classes/[testClassId]/report-data` as baseline.
4. Create and activate a discussion activity for the class. Have at least one student submit an answer.
5. Re-fetch all three endpoints.
6. Assert: all numeric values in `summary`, `subjects`, and `topics` are identical to baseline.
7. If any value changed, the diagnostic firewall is incomplete and implementation must not be signed off.

---

## 4. V1 Scope — Exact Boundaries

### 4.1 School teacher V1

- Class-scoped only. The teacher chooses recipients on `/teacher/class/[classId]/discussion/new`:
  - **Whole class** (default): all active class members receive a `classroom_activity_student_status` row on activate.
  - **Selected students**: teacher picks a subset from the class roster (checkboxes); only those students receive status rows on activate.
- API rejects student IDs not in the class roster (cross-class / cross-school IDs are rejected as `student_not_in_class`).
- Unassigned students do not see the activity on student home and receive `403 not_assigned` if they open the URL.
- Multi-class: a teacher with multiple classes must create a separate discussion per class. No cross-class broadcast in V1.
- The teacher question picker is filtered to the class's grade level and the teacher's permitted subjects. The teacher cannot override the grade.

### 4.2 Private teacher V1

- **Subject-only permissions** via `private_teacher_subjects` (platform admin grants subjects such as math, geometry — no grade or class scope).
- **Assigned students only**: the teacher may create discussion activities only for students linked in `teacher_students`.
- 1:1 only. One discussion activity per student using `student_activities` with `mode='discussion'`.
- The target student's `grade_level` is used **only** to generate grade-appropriate questions; it is **not** part of the permission check.
- Group-scoped discussion is **deferred to a future phase**.

### 4.3 What is explicitly deferred to future phases

- Group-scoped discussions for private teachers.
- Teacher-controlled "reveal" of correct answer to students.
- Real-time push/WebSocket updates on the monitoring page.
- AI analysis of discussion responses.
- Cross-class or cross-school broadcast.
- Scheduling / future-dated discussions.

---

## 5. Non-Goals and Explicit Exclusions

The following are not part of this feature and must not be built, implied, or accidentally introduced:

- No video of any kind.
- No audio of any kind (no recording, no playback, no text-to-speech tied to this feature).
- No chat or messaging between teacher and student within this feature.
- No screen sharing.
- No projector mode.
- No collaborative whiteboard.
- No AI discussion analysis or AI response evaluation.
- No automatic diagnostic scoring of discussion answers.
- No changes to the student learning engine or self-directed practice behavior.
- No broad redesign of any existing page.
- No new activity system (new tables) unless a documented blocker is discovered and approved by the owner.
- No changes to existing homework, live_lesson, guided_practice, or quiz modes.
- No changes to parent report content, format, or triggers.
- No changes to teacher diagnostic report content, format, or triggers (except the firewall additions that prevent discussion data from entering those reports).

---

## 6. Permission Model

### 6.1 Main/Platform Admin → Private Teacher

- Platform admin is the only entity authorized to grant or revoke discussion subject/grade permissions for private teachers.
- Admin opens `pages/admin/teachers/[teacherId].js`.
- New "Discussion Activity Subjects" section added to `TeacherAdminDetailView.jsx`.
- Section is shown only when the teacher has no `school_teacher_memberships` row (i.e., is a private teacher). For school teachers, the school manager handles permissions.
- Admin can grant: subject only (from the allowed subject list). No grade or class fields.
- Admin can revoke any grant.
- APIs: `GET/POST /api/admin/teachers/[teacherId]/discussion-subjects`, `DELETE /api/admin/teachers/[teacherId]/discussion-subjects/[grantId]`. All require platform admin auth context.

**Default for private teachers**: No access. A private teacher with zero rows in `private_teacher_subjects` receives a 403 on any attempt to create a discussion activity. Admin must explicitly grant.

**API enforcement**: The `POST /api/teacher/activities` and `POST /api/teacher/student-activities` endpoints must reject unauthorized subject/grade combinations at the server layer regardless of what the UI shows. The UI hides unavailable subjects as a convenience; it is not the enforcement point.

### 6.2 School Manager → School Teacher

- School managers manage subject/grade permissions for teachers inside their own school only.
- Existing mechanism: `school_teacher_subjects` table, managed via existing `GET/POST/DELETE /api/school/teachers/[teacherId]/subjects` routes.
- Existing UI: `SchoolTeacherDetailContent.jsx` subject grant badges and revoke controls. No new UI is needed.
- Discussion activity creation for school teachers reuses the existing `assertSchoolTeacherSubjectAllowed` check. No separate discussion-specific permission table is needed for school teachers.
- School managers cannot grant permissions to teachers in other schools. This is enforced by `requireSchoolManagerApiContext` which verifies the teacher belongs to the manager's school.
- School managers cannot grant permissions to themselves beyond what the platform admin has configured for the school.

### 6.3 Multi-Subject Teachers

- A private teacher with grants for Math (grades 1–6) and Geometry (grades 1–6) will see both subjects in the question picker dropdown.
- A school teacher with `school_teacher_subjects` rows for Math + Geometry will see both subjects.
- The subject dropdown is dynamically built from the teacher's current active grants filtered to subjects supported by `generateActivityQuestionSetClient`.
- The API enforces the full subject+grade combination at create time; it is not sufficient to have the subject grant without the grade matching.

### 6.4 Grade/Class Restrictions

- School teacher class discussion: grade is derived from `teacher_classes.grade_level` for the selected class. The teacher cannot pick a different grade. The permission check uses this grade automatically.
- Private teacher 1:1 discussion: `students.grade_level` is passed to question preview/generation only.
- Permission check logic:
  - School teacher: `assertSchoolTeacherSubjectAllowed(teacherId, subject, derivedGrade)` — subject + grade from class.
  - Private teacher: `assertPrivateTeacherSubjectAllowed(teacherId, subject)` — subject-only row in `private_teacher_subjects`.
  - Student assignment: `assertTeacherCanManageStudentAccess` / `teacher_students` link (unchanged).

### 6.5 Student Recipient Restrictions

- Class discussion (V1): `recipient_scope` on `classroom_activities` (`whole_class` | `selected_students`) plus `assigned_student_ids` when selected. Status rows on activate are the assignment boundary; monitor and student home use status rows only.
- Private teacher 1:1: target student must be in `teacher_students` for that teacher. The `student_activities` FK to `teacher_students` enforces this at the DB level.
- Unauthorized student access: class membership plus, for `mode=discussion`, an existing `classroom_activity_student_status` row (`403 not_assigned` otherwise).

---

## 7. Implementation Phases

After owner approval, implementation proceeds end-to-end through all phases without stopping between phases.

### Phase 1 — SQL Migration Files

1. Write `supabase/migrations/036_private_teacher_subjects.sql` (full content in Section 2.2).
2. Write `supabase/migrations/037_discussion_activity_mode.sql` (full content in Section 2.2, including pre-check queries).
3. Deliver both files to owner. Owner runs them manually. Owner confirms success before Phase 2.

### Phase 2 — Server Constants and Shared Validation

- `lib/classroom-activities/classroom-activities-shared.server.js`: add `'discussion'` to `ACTIVITY_MODES`.
- Verify `validateSameExactQuestionSet` passes for a single-question set with `correct_answer` present (expected to pass already; confirm by reading the validation code).

### Phase 3 — Diagnostic Firewall

- `lib/teacher-server/classroom-activity-class-report.server.js`: add `.neq("mode", "discussion")` at lines ~341, ~427, ~521.
- `lib/teacher-server/teacher-dashboard-activity.server.js`: add `.neq("mode","discussion")` to classroom activity queries contributing to accuracy metrics.
- Write unit tests for this firewall before continuing to Phase 4.

### Phase 4 — Permission Helper and Activity Creation Gate

- Add `assertPrivateTeacherSubjectAllowed` to `lib/school-server/school-subjects.server.js`.
- Extend `lib/teacher-server/teacher-activities.server.js` createClassroomActivity with private teacher permission branch for `mode='discussion'`.
- Extend `lib/teacher-server/student-activity.server.js` createStudentActivity with same branch.

### Phase 5 — Admin Permission API and Server Logic

- New `lib/admin-server/admin-private-teacher-subjects.server.js`.
- New `pages/api/admin/teachers/[teacherId]/discussion-subjects/index.js`.
- New `pages/api/admin/teachers/[teacherId]/discussion-subjects/[grantId].js`.

### Phase 6 — Question Preview API

- New `lib/teacher-server/discussion-question-preview.server.js`.
- New `pages/api/teacher/discussion/question-preview.js`.
- Must verify teacher permission before generating. Returns correct answers — teacher-auth only.

### Phase 7 — Teacher Exercise Library UI

- New page: `pages/teacher/class/[classId]/discussion/new.js`.
- New component: `components/teacher-portal/TeacherDiscussionQuestionPicker.jsx` (filter controls + question cards + "use this question" button).
- New component: `components/teacher-portal/TeacherStudentDiscussionPanel.jsx` (private teacher 1:1).
- Edit: `components/teacher-portal/TeacherClassActivitiesNav.jsx` — add Discussion tab. Hebrew label: see Section 10.

### Phase 8 — Student UI Patch

- `pages/student/activity/[activityId].js`: add `activity.mode === 'discussion'` condition to suppress correctness feedback and explanation after submission. Show neutral submission confirmation. Hebrew text: see Section 10.
- Verify `StudentClassroomActivitiesPanel.jsx` renders discussion activities in the activity list (likely no change needed; confirm visually).

### Phase 9 — Teacher Monitoring UI

- Verify `pages/teacher/class/[classId]/activities/[activityId]/monitor.js` shows per-student answers and correct/incorrect for single-question activities.
- If needed, add `mode='discussion'` display branch: summary row (submitted N / correct N / not submitted N) + per-student table.

### Phase 10 — Admin UI Extension

- `components/admin/TeacherAdminDetailView.jsx`: add "Discussion Activity Subjects" section for private teachers (hidden for school teachers). Hebrew labels: see Section 10.

### Phase 11 — Tests

- Unit: `assertPrivateTeacherSubjectAllowed` (all scenarios).
- Unit: diagnostic firewall (discussion mode excluded from rollup).
- Integration: create → activate → student submit → monitor.
- Integration: admin grant/revoke private teacher subjects.
- Regression: all existing activity modes unchanged.
- Regression: parent + teacher diagnostic reports unchanged after discussion submission.
- Full verification per Section 3.5.

### Phase 12 — Final QA

- Run manual QA checklist in Section 11.
- Produce end-of-implementation handoff report per Section 14.

---

## 8. File Impact Estimate

### New files

```
supabase/migrations/036_private_teacher_subjects.sql
supabase/migrations/037_discussion_activity_mode.sql
pages/api/teacher/discussion/question-preview.js
pages/api/admin/teachers/[teacherId]/discussion-subjects/index.js
pages/api/admin/teachers/[teacherId]/discussion-subjects/[grantId].js
lib/teacher-server/discussion-question-preview.server.js
lib/admin-server/admin-private-teacher-subjects.server.js
pages/teacher/class/[classId]/discussion/new.js
components/teacher-portal/TeacherDiscussionQuestionPicker.jsx
components/teacher-portal/TeacherStudentDiscussionPanel.jsx
tests/discussion-activity-permissions.test.js
tests/discussion-activity-diagnostic-firewall.test.js
tests/discussion-activity-lifecycle.test.js
```

### Existing files to modify

```
lib/classroom-activities/classroom-activities-shared.server.js
  → add 'discussion' to ACTIVITY_MODES

lib/teacher-server/teacher-activities.server.js
  → add private teacher permission check branch for mode='discussion'

lib/teacher-server/student-activity.server.js
  → add private teacher permission check branch for mode='discussion'

lib/teacher-server/classroom-activity-class-report.server.js
  → add .neq("mode","discussion") at lines ~341, ~427, ~521

lib/teacher-server/teacher-dashboard-activity.server.js
  → add .neq("mode","discussion") to accuracy metric queries

lib/school-server/school-subjects.server.js
  → add assertPrivateTeacherSubjectAllowed function

pages/student/activity/[activityId].js
  → suppress correctness feedback for mode='discussion'

components/teacher-portal/TeacherClassActivitiesNav.jsx
  → add Discussion tab (Hebrew label pending owner approval)

components/admin/TeacherAdminDetailView.jsx
  → add Discussion Subjects section for private teachers
```

---

## 9. Test Plan

### Permission tests

- Private teacher with zero `private_teacher_subjects` rows → `POST /api/teacher/activities` with `mode='discussion'` returns 403.
- Private teacher with Math grant for grades 1–6 → can create for Math grade 3; rejected for Math grade 7; rejected for Geometry grade 3.
- Private teacher with Math + Geometry grants (grades 1–6 each) → can create for both subjects within grades 1–6.
- Private teacher with Math all-grades grant (`NULL grade_level`) → can create for Math at any grade level.
- School teacher with `school_teacher_subjects` Math grades 3–4 → accepted for Math grade 3; accepted for Math grade 4; rejected for Math grade 5; rejected for Geometry.
- School teacher with no `school_teacher_subjects` rows → all discussion create attempts return 403.
- School manager attempts to modify a teacher from another school via `/api/school/teachers/[teacherId]/subjects` → returns 403.
- Platform admin can POST to `/api/admin/teachers/[teacherId]/discussion-subjects` for any private teacher.
- Non-admin session attempts to call admin discussion-subjects API → returns 401 or 403.

### Activity lifecycle tests

- Create discussion activity with `mode='discussion'`, `question_count=1`, valid single frozen question → row created in `classroom_activities` with correct column values.
- Activate → `classroom_activity_student_status` rows seeded for all active class members with `not_started`.
- Student calls start API → receives question without `correct_answer` in the payload.
- Student calls answer API → attempt recorded in `classroom_activity_attempts`.
- Student calls submit API → status updated to `submitted`.
- Student UI shows no correctness feedback (neutral confirmation only).
- Teacher monitor endpoint returns all student statuses and answers.
- Teacher monitor shows correct/incorrect computed from stored `correct_answer` vs `selected_answer`.
- Student not in the class attempts start → 404 or 403.
- Private teacher creates 1:1 discussion for student A → student B from same teacher cannot access it.

### Diagnostic non-regression tests

- Record baseline values from `GET /api/parent/students/[id]/report-data` before any discussion activity.
- Activate discussion; student submits answer.
- Re-fetch same endpoint → all values in `summary`, `subjects`, and `topics` identical to baseline. No difference permitted.
- Record baseline values from `GET /api/teacher/students/[id]/report-data`.
- Re-fetch after discussion submission → identical.
- Record baseline values from `GET /api/teacher/classes/[id]/report-data`.
- Re-fetch after discussion submission → identical.
- Unit test: pass a discussion-mode activity into `buildClassroomActivityRollupsByStudentId` input → output rollup is zero for that activity's attempts.

### Existing feature regression tests

- `mode='homework'` activity: create, activate, student submit, teacher report → all unchanged.
- `mode='live_lesson'` activity: create, activate, advance question index → unchanged.
- `mode='guided_practice'` activity: create, activate, student complete → unchanged.
- School teacher subject grant/revoke via school manager UI → unchanged.
- Worksheet class and selected-student activities → unchanged.
- Parent report for a student with home practice sessions → unchanged.
- Teacher student report for a student with classroom activity history → unchanged.
- Class report for a class with existing non-discussion activities → unchanged.

---

## 10. Hebrew / UI Copy Review List

**No Hebrew strings listed below may be finalized or written into code without owner approval.**

All strings below are marked as technical placeholders (English or transliterated) until the owner reviews and approves exact Hebrew wording. Implementation should use placeholder strings in code with a `// TODO: owner to approve Hebrew text` comment on each string.

### New UI strings requiring owner approval

| Location | Technical placeholder (English) | Where it appears |
|---|---|---|
| Nav tab (teacher class page) | "Discussion" | Tab in `TeacherClassActivitiesNav` alongside Activities and Worksheets |
| Page heading (create discussion) | "Create Discussion Activity" | `pages/teacher/class/[classId]/discussion/new.js` header |
| Filter label — subject | "Subject" | Question picker filter bar |
| Filter label — topic | "Topic" | Question picker filter bar |
| Filter label — difficulty | "Difficulty" | Question picker filter bar |
| Button — generate questions | "Generate Questions" | Question picker primary action |
| Button — use this question | "Use This Question" | Each question card |
| Button — create discussion | "Create Discussion" | Confirmation form submit button |
| Activity status label in student list | "Discussion" | Activity type label in teacher monitoring view and student home list |
| Student submission confirmation message | "Your answer has been submitted" | `pages/student/activity/[activityId].js` after submit for discussion mode |
| Student activity list label | "Discussion Exercise" | In `StudentClassroomActivitiesPanel` activity type indicator |
| Teacher monitoring — submitted label | "Submitted" | Per-student status |
| Teacher monitoring — not submitted label | "Not Yet Submitted" | Per-student status |
| Teacher monitoring — correct label | "Correct" | Per-student answer indicator |
| Teacher monitoring — incorrect label | "Incorrect" | Per-student answer indicator |
| Teacher monitoring — summary row | "Submitted: N / Correct: N / Not Submitted: N" | Summary row above student list |
| Admin section heading | "Discussion Activity Subjects" | `TeacherAdminDetailView` new section |
| Admin grant button | "Grant Subject" | Admin UI button |
| Admin revoke button | "Revoke" | Admin UI per-row button |
| Private teacher — no access message | "No discussion subjects have been granted. Contact the platform administrator." | Shown when private teacher opens discussion creator with no grants |

### Strings that do not change

All existing Hebrew labels, tab names, button labels, messages, and content in: activities list, homework labels, worksheet labels, student home page, parent reports, teacher reports, school portal, and admin pages. None of these may be modified as part of this feature.

---

## 11. Manual QA Checklist

### Admin permission setup

- [ ] Log in as platform admin.
- [ ] Navigate to a private teacher's admin detail page.
- [ ] "Discussion Activity Subjects" section is visible.
- [ ] Grant Math for grades 1–3 → row appears.
- [ ] Grant Geometry for all grades → row appears.
- [ ] Revoke the Geometry grant → row disappears.
- [ ] Attempt to access the admin discussion-subjects API with a non-admin session → blocked.
- [ ] Attempt to grant a subject for a teacher who is in a school (school teacher) → blocked or section hidden.

### School manager permission setup

- [ ] Log in as school manager.
- [ ] Navigate to a teacher in the school portal.
- [ ] Existing subject grant/revoke works without regression.
- [ ] Attempt to access a teacher from another school → blocked.
- [ ] School manager cannot see or modify private teacher discussion subjects.

### Teacher exercise library — school teacher

- [ ] Log in as school teacher with Math grades 3–4 permission.
- [ ] Open a grade-3 class → Discussion tab appears in nav.
- [ ] Click "Create Discussion" → question picker page loads.
- [ ] Subject dropdown shows only Math (no Geometry, no other subjects).
- [ ] Select topic and difficulty → click generate → ~5 question cards appear.
- [ ] Each card shows: question text, answer options, highlighted correct answer.
- [ ] "Use this question" → confirmation form loads.
- [ ] Create activity → success, redirected to monitoring page.
- [ ] Activity appears in class activities list.
- [ ] Attempt to create a discussion for a grade-5 class (outside teacher permission) → blocked.

### Teacher exercise library — private teacher

- [ ] Log in as private teacher with no grants → discussion creation shows a clear "no permissions" message.
- [ ] After admin grants Math grades 1–6 → same teacher sees Math subjects available for a grade-1 student.
- [ ] Private teacher cannot see grade-7 questions for a grade-7 student if grant only covers grades 1–6.

### Student open and submit

- [ ] Assigned student logs in → discussion activity appears on home page.
- [ ] Student opens activity → question displays, no timer, no correct answer leaked, no hint.
- [ ] Student selects an answer and submits → neutral confirmation message (no correct/incorrect shown).
- [ ] Student attempts to re-open after submitting → already-submitted state shown.
- [ ] Log in as a student NOT in the class → activity URL returns 404 or 403.

### Teacher monitoring

- [ ] Monitoring page loads for the discussion activity.
- [ ] All class members shown with their status.
- [ ] Submitted students show their answer and correct/incorrect indicator.
- [ ] Not-submitted students show not-submitted state.
- [ ] Summary counts are accurate.
- [ ] Refresh the page → updated data.

### Diagnostic and report non-impact

- [ ] Before creating discussion: note parent report summary values for a student.
- [ ] Create, activate, have student submit discussion answer.
- [ ] Check parent report → all values identical.
- [ ] Check teacher student report → subject and topic accuracy unchanged.
- [ ] Check class report → no new accuracy entries.
- [ ] Existing homework activity: create, activate, student submit → teacher class report reflects it normally (regression check).
- [ ] Existing learning session: student does self-practice → parent report updates normally (regression check).

---

## 12. Risks, Open Questions, and Resolved Owner Decisions

### RESOLVED — Owner Decision — Procedural Question Generation (Math and Geometry)

**Decision recorded:** Procedural question generation for Math and Geometry is acceptable for discussion activities.

The selected preview question is frozen into the activity's `question_set` at creation time and remains stable for the entire life of that activity. The fact that a different preview session may generate a slightly different question instance is acceptable — once a teacher selects and creates the activity, that exact question is fixed permanently.

Math and Geometry must be fully supported as discussion subjects. Do not limit discussion activities to non-procedural subjects.

No action required. Implementation proceeds with all six subjects: `math`, `geometry`, `hebrew`, `english`, `science`, `moledet_geography`.

---

### RESOLVED — Documented for clarity

**Private teacher subject defaults**

No `private_teacher_subjects` rows exist today. All existing private teachers have no discussion access until the admin explicitly populates the table. There is no auto-grant migration. Admin must be informed to configure this before private teachers can use the feature.

**`validateSameExactQuestionSet` relaxation**

No relaxation is needed. Discussion questions still have `correct_answer` stored in `question_set` — it is used by the teacher monitoring view. The student-facing payload already strips `correct_answer` for all modes in `loadActivityForStudent`. This behavior is unchanged.

**Selected students in V1**

School teacher: whole-class or selected students within one class. Private teacher: 1:1 only (one `student_activities` row per student). See Section 4.

**Private teacher multiple students**

Batch UI creation (one question pick → select N students → N `student_activities` rows created) is acceptable in V1. Group-scoped discussions are deferred.

**Correctness computation**

The existing `answersMatch()` string comparison is used. For MCQ subjects this is accurate. For open-text numeric questions, the match may be imperfect. This is a known limitation, acceptable in V1, consistent with existing activity behavior.

**School teacher with multiple classes**

Discussion creator is class-scoped. Teacher creates one discussion per class. Consistent with existing classroom activity behavior.

**`subjects_locked` flag**

`school_teacher_memberships.subjects_locked` is not enforced in current app logic. Does not affect this feature. Noted as a known gap in the codebase, not introduced by this feature.

**Monitoring page refresh**

No WebSocket required. Manual refresh only. Consistent with feature requirements and V1 scope.

---

## 13. Before Implementation Approval — Final Checklist

The owner should confirm each item before approving implementation:

- [ ] Plan document reviewed in full and understood.
- [ ] V1 scope boundaries confirmed (Section 4).
- [ ] Non-goals confirmed (Section 5).
- [ ] School teacher V1: whole-class or selected-students within class — confirmed acceptable.
- [ ] Private teacher V1: 1:1 only — confirmed acceptable.
- [ ] Unresolved risk resolved: question bank stability for procedural subjects — owner decision made and recorded.
- [ ] Permission defaults confirmed: private teachers have no access until admin grants.
- [ ] Hebrew copy list reviewed (Section 10) — owner has approved or noted required changes.
- [ ] SQL migrations 036 and 037 reviewed and understood. Owner will run manually.
- [ ] Diagnostic firewall approach confirmed (Section 3).
- [ ] File impact list reviewed (Section 8).
- [ ] Test plan reviewed (Section 9).
- [ ] Manual QA checklist reviewed (Section 11).
- [ ] End-of-implementation handoff requirements understood (Section 14).
- [ ] No open questions remain that would block implementation.

---

## 14. End-of-Implementation Handoff Requirements

After implementation is complete, the agent must produce a handoff report containing all of the following. Implementation is not considered done until this report is delivered.

### Required handoff report contents

**Changed files list**
- Full list of every file created or modified, with a one-line description of each change.

**Migration files created (not executed)**
- Confirm `supabase/migrations/036_private_teacher_subjects.sql` exists and contains expected content.
- Confirm `supabase/migrations/037_discussion_activity_mode.sql` exists and contains expected content.
- Confirm neither migration was executed by the agent.

**SQL manual instructions**
- Step-by-step instructions for the owner to apply the two migrations, including the pre-check queries for constraint names before running migration 037.

**Tests run and results**
- List of all test files executed.
- Pass/fail count.
- If any tests failed, description of failures and resolution.

**Build result**
- Confirm `next build` completes without errors.

**Diagnostic non-regression proof**
- JSON diff or explicit value comparison proving that after discussion activity submission, all three diagnostic endpoints (`/api/parent/students/[id]/report-data`, `/api/teacher/students/[id]/report-data`, `/api/teacher/classes/[id]/report-data`) return values identical to baseline.
- Method used to verify (test output, manual check, or automated assertion).

**Permission test results**
- Confirmation that the permission test scenarios in Section 9 pass.
- Special attention: private teacher with no grants blocked; private teacher with grants allowed; school teacher with wrong subject blocked; cross-school school manager blocked.

**Existing activity regression result**
- Confirmation that existing homework, live_lesson, guided_practice, and quiz mode activities behave identically to before.
- Confirmation that existing worksheet activities behave identically.
- Confirmation that parent report for home practice sessions is unaffected.

**Full `git status --short`**
- Output showing all modified and new files.

**Confirmation statement**
- Explicit written confirmation: "No SQL was executed by the agent. No commit was made. No push was made."

---

*Plan version: 3 — canonical document. Contains Owner Approval Gate, all implementation constraints, full diagnostic firewall specification, exact V1 scope, non-goals, permission model, Hebrew copy review list, before-approval checklist, end-of-implementation handoff requirements, and all resolved owner decisions including the Math/Geometry procedural generation decision.*

*Ready for owner final review. No implementation approved until owner explicitly states approval.*
