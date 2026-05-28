---
name: Teacher Live Discussion Feature
overview: Add a "Teacher Live Exercise Discussion Activity" that lets teachers pick one question from the site's exercise pool, send it to a class or students, collect their answers, and view the results for in-class discussion — with complete isolation from the diagnostic engine.
todos:
  - id: migrations
    content: Write migration 036 (private_teacher_subjects) and 037 (mode CHECK extensions)
    status: completed
  - id: shared-constants
    content: Update ACTIVITY_MODES and validateSameExactQuestionSet in classroom-activities-shared.server.js
    status: completed
  - id: diagnostic-firewall
    content: Add .neq('mode','discussion') filters at 3 query sites in classroom-activity-class-report.server.js and teacher-dashboard-activity.server.js
    status: completed
  - id: permission-helper
    content: Add assertPrivateTeacherSubjectAllowed in school-subjects.server.js; wire into teacher-activities.server.js create path
    status: completed
  - id: question-preview-api
    content: New API route and server lib for /api/teacher/discussion/question-preview
    status: completed
  - id: admin-subjects-api
    content: New admin API routes and server lib for private_teacher_subjects CRUD
    status: completed
  - id: teacher-library-ui
    content: New page pages/teacher/class/[classId]/discussion/new.js + TeacherDiscussionQuestionPicker component
    status: completed
  - id: private-teacher-ui
    content: New TeacherStudentDiscussionPanel for private teacher 1:1 discussions
    status: completed
  - id: student-ui-patch
    content: Patch pages/student/activity/[activityId].js to suppress correctness feedback for mode='discussion'
    status: completed
  - id: nav-tab
    content: Add Discussion tab to TeacherClassActivitiesNav and Activities nav
    status: completed
  - id: admin-ui
    content: Extend TeacherAdminDetailView with Discussion Subjects section
    status: completed
  - id: tests
    content: Write unit tests for permission helper, diagnostic firewall, and discussion lifecycle
    status: completed
isProject: false
---

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
12. [Risks, Open Questions, and Resolved Owner Decisions](#12-risks-open-questions-and-resolved-owner-decisions)
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

The question bank is not in Postgres. Content lives in JS files:

| Subject | Location | ID stability |
|---|---|---|
| Math / Geometry | `utils/math-*`, `utils/geometry-*` | Procedural generators — no stable static IDs |
| Science | `data/science-questions.js` | Stable string IDs but not preserved in frozen snapshots |
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

-- classroom_activities: replace constraint name if SELECT returned a different name
alter table public.classroom_activities
  drop constraint if exists classroom_activities_mode_check;

alter table public.classroom_activities
  add constraint classroom_activities_mode_check
  check (mode in ('live_lesson','guided_practice','quiz','homework','discussion'));

-- student_activities: replace constraint name if SELECT returned a different name
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
- `validateSameExactQuestionSet`: confirm single-question discussion sets pass. The correct_answer must still be present in the stored `question_set`. The existing strip of `correct_answer` from the student-facing payload happens in `loadActivityForStudent` and applies to all modes including `discussion` — no change needed there.

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

Add `.neq("mode", "discussion")` to classroom activity queries that contribute to accuracy or mastery metrics. Discussion activities may still appear in activity count metrics but must not contribute to accuracy, correct/wrong, or topic proficiency aggregation.

#### New: `lib/teacher-server/discussion-question-preview.server.js`

- Accepts `{ subject, gradeLevel, topic, difficulty, count = 5 }`.
- Generates `count` sample questions using the server-side equivalent of `generateActivityQuestionSetClient`.
- Returns full question objects including `correct_answer` (teacher-only endpoint).
- Validates teacher is permitted for the subject+grade before generating.

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
6. Teacher clicks "Use this question" → confirmation form: title (pre-populated), recipients = whole class (V1).
7. POST to `/api/teacher/activities` with `{ mode: 'discussion', question_count: 1, question_set: [selectedQuestion] }`.
8. On success → redirect to monitoring page.

For private teachers (1:1 discussion):

1. Teacher opens student page `pages/teacher/student/[studentId].js`.
2. New panel `TeacherStudentDiscussionPanel.jsx` visible.
3. Same question picker flow → POST to `/api/teacher/student-activities` with `mode='discussion'`.

Teacher monitoring view (reused):

- Reuse `pages/teacher/class/[classId]/activities/[activityId]/monitor.js`.
- For `mode='discussion'`: show summary (submitted / not submitted / correct / incorrect) + per-student table with their answer and correct/incorrect computed from stored `correct_answer` vs `selected_answer`.

### 2.6 Student UI Flow

1. Discussion activity appears in `StudentClassroomActivitiesPanel.jsx` on `pages/student/home.js`.
2. Student opens `pages/student/activity/[activityId].js` (no routing changes).
3. Patch: if `activity.mode === 'discussion'`, suppress correctness feedback after submission. Student sees neutral "answer submitted" confirmation. No correct/incorrect shown.
4. Submit → existing `/api/student/activities/[activityId]/submit` → writes to `classroom_activity_attempts`.

---

## 3. Diagnostic Firewall — Complete Specification

This section is authoritative. Any implementation that does not satisfy all items here is not complete.

### 3.1 What discussion activities must never do

- Must never write to `learning_sessions`.
- Must never write to `answers`.
- Must never call `/api/learning/answer` or any route that writes to `answers`.
- Must never call `/api/learning/session/start` or `/api/learning/session/finish`.
- Must never affect: parent reports, teacher diagnostic reports, class diagnostic reports, mastery/weakness diagnosis, topic next-step recommendations, or professional diagnostic scoring of any kind.

### 3.2 Why discussion activities are already safe from parent diagnostics

The parent diagnostic pipeline reads only `learning_sessions` + `answers` via `aggregateParentReportPayload` in `lib/parent-server/report-data-aggregate.server.js`. Discussion activities store answers in `classroom_activity_attempts`, which `aggregateParentReportPayload` does not read. No change is needed to protect parent diagnostics — the isolation is structural.

### 3.3 The one path that needs an explicit fix

`lib/teacher-server/classroom-activity-class-report.server.js` contains `mergeClassroomActivityRollupIntoReportPayload`, which reads `classroom_activities` for a class and merges per-student accuracy counts into teacher and school report payloads. Without a filter, `mode='discussion'` activity attempts would enter topic accuracy and subject accuracy in teacher reports.

Fix: add `.neq("mode", "discussion")` to the three Supabase query chains in that file:

| Location | Existing filter chain | Required addition |
|---|---|---|
| Line ~341 | `.eq("class_id", classId).neq("status", "archived")` | `.neq("mode", "discussion")` |
| Line ~427 | same pattern | `.neq("mode", "discussion")` |
| Line ~521 | same pattern | `.neq("mode", "discussion")` |

### 3.4 Complete list of report/aggregation paths and required actions

| Function / file | Current isolation | Action required |
|---|---|---|
| `aggregateParentReportPayload` in `lib/parent-server/report-data-aggregate.server.js` | Structural — reads only `learning_sessions` + `answers` | No change needed |
| `mergeClassroomActivityRollupIntoReportPayload` in `lib/teacher-server/classroom-activity-class-report.server.js` | Reads `classroom_activities` without mode filter | Add `.neq("mode","discussion")` at lines ~341, ~427, ~521 |
| `buildClassroomActivityRollupsByStudentId` in same file | Called with activities fetched above | Fixed at fetch level |
| `GET /api/teacher/students/[studentId]/report-data` | Calls `mergeClassroomActivityRollupIntoReportPayload` | Fixed by above |
| `GET /api/teacher/classes/[classId]/report-data` | Same merge function | Fixed by above |
| `GET /api/school/students/[studentId]/report-data` | Same merge function | Fixed by above |
| `GET /api/parent/students/[studentId]/report-data` | Structural isolation | No change needed |
| `lib/teacher-server/teacher-dashboard-activity.server.js` | Reads `classroom_activities` for accuracy | Add `.neq("mode","discussion")` to accuracy queries |
| `lib/teacher-server/teacher-guidance-v2.server.js` | Consumes aggregated payload | Verify; no direct classroom query expected |
| `generateParentReportV2` / `runDiagnosticEngineV2` in `utils/` | Client-side; operates on adapter output | Already safe after upstream fix |
| `student_activity_attempts` (private 1:1) | Not read by any diagnostic pipeline | Already isolated; no change needed |

### 3.5 Mandatory verification

Before implementation sign-off:

1. Record full JSON of `GET /api/parent/students/[testStudentId]/report-data` as baseline.
2. Record full JSON of `GET /api/teacher/students/[testStudentId]/report-data` as baseline.
3. Record full JSON of `GET /api/teacher/classes/[testClassId]/report-data` as baseline.
4. Create and activate a discussion activity. Have at least one student submit an answer.
5. Re-fetch all three endpoints.
6. Assert: all numeric values in `summary`, `subjects`, and `topics` are identical to baseline.
7. If any value changed, the firewall is incomplete and implementation must not be signed off.

---

## 4. V1 Scope — Exact Boundaries

### 4.1 School teacher V1

- Class-scoped only. Whole class receives the discussion activity.
- Recipient selection is implicit: all active class members receive a status row on activation (identical to existing classroom activity behavior).
- Selected-student targeting within a class is **deferred to a future phase**. Not in V1.
- Multi-class: teacher creates a separate discussion per class. No cross-class broadcast in V1.
- Grade is derived from the class. Teacher cannot override it.

### 4.2 Private teacher V1

- 1:1 only. One `student_activities` row per student with `mode='discussion'`.
- To send the same discussion to multiple students, the teacher creates one activity per student. The UI may support batch creation (one question pick → select N students → N rows created), but each row is independent.
- Group-scoped discussion is **deferred to a future phase**.
- Grade is derived from `students.grade_level`. Teacher cannot override it.

### 4.3 Explicitly deferred to future phases

- Selected-student targeting within a class (school teacher).
- Group-scoped discussions (private teacher).
- Teacher-controlled "reveal" of correct answer to students.
- Real-time push/WebSocket monitoring updates.
- AI analysis of discussion responses.
- Cross-class or cross-school broadcast.
- Scheduling / future-dated discussions.

---

## 5. Non-Goals and Explicit Exclusions

The following must not be built, implied, or accidentally introduced by this feature:

- No video of any kind.
- No audio of any kind.
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
- No changes to teacher diagnostic report content, format, or triggers (except the firewall additions in Section 3 that prevent discussion data from entering those reports).

---

## 6. Permission Model

### 6.1 Main/Platform Admin → Private Teacher

- Platform admin is the only entity authorized to grant or revoke discussion subject/grade permissions for private teachers.
- Admin opens `pages/admin/teachers/[teacherId].js`. New "Discussion Activity Subjects" section in `TeacherAdminDetailView.jsx`.
- Section shown only for private teachers (no `school_teacher_memberships` row). Hidden for school teachers.
- Admin grants: subject + optionally a specific grade (blank = all grades for that subject).
- APIs: `GET/POST /api/admin/teachers/[teacherId]/discussion-subjects`, `DELETE .../[grantId]`. All require platform admin auth context.
- **Default**: No rows in `private_teacher_subjects` = no access. Admin must explicitly grant. There is no auto-grant on account creation.
- **API enforcement**: The create-activity API rejects unauthorized subject/grade combinations at the server layer regardless of what the UI shows.

### 6.2 School Manager → School Teacher

- School managers manage permissions for teachers inside their own school only.
- Mechanism: existing `school_teacher_subjects` table via existing `GET/POST/DELETE /api/school/teachers/[teacherId]/subjects` routes.
- UI: existing `SchoolTeacherDetailContent.jsx`. No new UI needed.
- Discussion activity creation reuses `assertSchoolTeacherSubjectAllowed`. No separate discussion permission table for school teachers.
- School managers cannot grant permissions to teachers in other schools (enforced by `requireSchoolManagerApiContext`).
- School managers cannot elevate their own permissions.

### 6.3 Multi-Subject Teachers

- Private teacher with Math + Geometry grants sees both in the question picker.
- School teacher with Math + Geometry `school_teacher_subjects` rows sees both.
- Subject dropdown built dynamically from teacher's current active grants, filtered to subjects supported by `generateActivityQuestionSetClient`.
- API enforces full subject+grade combination at create time — having the subject grant is insufficient if the grade does not match.

### 6.4 Grade/Class Restrictions

- School teacher class discussion: grade from `teacher_classes.grade_level`. Teacher cannot override.
- Private teacher 1:1 discussion: grade from `students.grade_level`. Teacher cannot override.
- Permission check:
  - School teacher: `assertSchoolTeacherSubjectAllowed(teacherId, subject, derivedGrade)`.
  - Private teacher: `assertPrivateTeacherSubjectAllowed(teacherId, subject, derivedGrade)`.
  - `NULL grade_level` grant = permitted for all grades of that subject.
  - Integer `grade_level` grant = permitted for that specific grade only.

### 6.5 Student Recipient Restrictions

- Class discussion (V1): whole class only. Implicit on activate — all active class members get a status row.
- Private 1:1: target student must be in `teacher_students` for that teacher.
- Unauthorized student access: blocked by existing `loadActivityForStudent` scope check.

---

## 7. Implementation Phases

After owner approval, implementation proceeds end-to-end without stopping between phases.

### Phase 1 — SQL Migration Files

1. Write `supabase/migrations/036_private_teacher_subjects.sql`.
2. Write `supabase/migrations/037_discussion_activity_mode.sql` (including pre-check queries).
3. Deliver to owner. Owner runs both manually. Owner confirms success before Phase 2.

### Phase 2 — Server Constants and Shared Validation

- `lib/classroom-activities/classroom-activities-shared.server.js`: add `'discussion'` to `ACTIVITY_MODES`.
- Verify `validateSameExactQuestionSet` passes for single-question discussion set.

### Phase 3 — Diagnostic Firewall

- `lib/teacher-server/classroom-activity-class-report.server.js`: add `.neq("mode", "discussion")` at lines ~341, ~427, ~521.
- `lib/teacher-server/teacher-dashboard-activity.server.js`: same filter for accuracy queries.
- Write unit tests for this firewall before Phase 4.

### Phase 4 — Permission Helper and Activity Creation Gate

- Add `assertPrivateTeacherSubjectAllowed` to `lib/school-server/school-subjects.server.js`.
- Extend `lib/teacher-server/teacher-activities.server.js` with private teacher permission branch for `mode='discussion'`.
- Extend `lib/teacher-server/student-activity.server.js` with same branch.

### Phase 5 — Admin Permission API and Server Logic

- New `lib/admin-server/admin-private-teacher-subjects.server.js`.
- New `pages/api/admin/teachers/[teacherId]/discussion-subjects/index.js`.
- New `pages/api/admin/teachers/[teacherId]/discussion-subjects/[grantId].js`.

### Phase 6 — Question Preview API

- New `lib/teacher-server/discussion-question-preview.server.js`.
- New `pages/api/teacher/discussion/question-preview.js`.
- Must verify teacher permission before generating. Teacher-auth only. Returns correct answers.

### Phase 7 — Teacher Exercise Library UI

- New page: `pages/teacher/class/[classId]/discussion/new.js`.
- New component: `components/teacher-portal/TeacherDiscussionQuestionPicker.jsx`.
- New component: `components/teacher-portal/TeacherStudentDiscussionPanel.jsx`.
- Edit: `components/teacher-portal/TeacherClassActivitiesNav.jsx` — add Discussion tab. Hebrew label: see Section 10.

### Phase 8 — Student UI Patch

- `pages/student/activity/[activityId].js`: suppress correctness feedback for `mode='discussion'`. Hebrew text: see Section 10.
- Verify `StudentClassroomActivitiesPanel.jsx` renders discussion activities.

### Phase 9 — Teacher Monitoring UI

- Verify `pages/teacher/class/[classId]/activities/[activityId]/monitor.js` shows per-student answers for single-question activities.
- Add `mode='discussion'` display branch if needed: summary row + per-student table.

### Phase 10 — Admin UI Extension

- `components/admin/TeacherAdminDetailView.jsx`: add "Discussion Activity Subjects" section for private teachers.

### Phase 11 — Tests

- Unit: `assertPrivateTeacherSubjectAllowed`.
- Unit: diagnostic firewall (discussion excluded from rollup).
- Integration: create → activate → student submit → monitor.
- Integration: admin grant/revoke private teacher subjects.
- Regression: all existing activity modes unchanged.
- Regression: diagnostic reports unchanged after discussion submission.
- Full diagnostic verification per Section 3.5.

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
- Private teacher with Math grant grades 1–6 → accepted for Math grade 3; rejected for Math grade 7; rejected for Geometry.
- Private teacher with Math + Geometry grants (grades 1–6 each) → accepted for both subjects within grades 1–6.
- Private teacher with Math all-grades grant (`NULL grade_level`) → accepted for Math at any grade.
- School teacher with Math grades 3–4 → accepted for Math grade 3 and 4; rejected for Math grade 5; rejected for Geometry.
- School teacher with no subject grants → all discussion create attempts return 403.
- School manager modifying a teacher from another school → returns 403.
- Platform admin can POST to `/api/admin/teachers/[teacherId]/discussion-subjects` for any private teacher.
- Non-admin session calling admin discussion-subjects API → returns 401 or 403.

### Activity lifecycle tests

- Create discussion with `mode='discussion'`, `question_count=1`, valid frozen question → row in `classroom_activities` with correct values.
- Activate → `classroom_activity_student_status` rows for all class members with `not_started`.
- Student start → question returned without `correct_answer`.
- Student answer → attempt in `classroom_activity_attempts`.
- Student submit → status `submitted`.
- Student UI: no correctness indicator shown.
- Teacher monitor: shows each student's status and answer.
- Teacher monitor: shows correct/incorrect indicator.
- Student not in class attempts start → 404 or 403.

### Diagnostic non-regression tests

- Baseline all three diagnostic endpoints before any discussion activity.
- Student submits discussion answer.
- Re-fetch all three endpoints → all numeric values in `summary`, `subjects`, and `topics` identical to baseline.
- Unit test: `buildClassroomActivityRollupsByStudentId` with a `mode='discussion'` activity → rollup contribution is zero for that activity.

### Existing feature regression tests

- `mode='homework'` activity: create, activate, submit, teacher report → all unchanged.
- `mode='live_lesson'` activity: create, activate, advance question index → unchanged.
- `mode='guided_practice'` activity: create, activate, student complete → unchanged.
- School teacher subject grant/revoke via school manager UI → unchanged.
- Worksheet class and selected-student activities → unchanged.
- Parent report for home practice sessions → unchanged.
- Teacher student report for student with classroom activity history → unchanged.

---

## 10. Hebrew / UI Copy Review List

**No string below may be finalized or written into code without owner approval.**

During implementation, all strings below must be inserted as placeholder English text with a comment `// TODO: owner to approve Hebrew text` on each string. The owner reviews and supplies final Hebrew wording before the feature is released.

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
| Activity type label | "Discussion" | In teacher activities list and teacher monitoring page |
| Student activity list label | "Discussion Exercise" | In `StudentClassroomActivitiesPanel` activity type indicator |
| Student submission confirmation | "Your answer has been submitted" | `pages/student/activity/[activityId].js` after submit for discussion mode |
| Teacher monitoring — submitted | "Submitted" | Per-student status |
| Teacher monitoring — not submitted | "Not Yet Submitted" | Per-student status |
| Teacher monitoring — correct | "Correct" | Per-student answer indicator |
| Teacher monitoring — incorrect | "Incorrect" | Per-student answer indicator |
| Teacher monitoring — summary | "Submitted: N / Correct: N / Not Submitted: N" | Summary row above student list |
| Admin section heading | "Discussion Activity Subjects" | `TeacherAdminDetailView` new section |
| Admin grant button | "Grant Subject" | Admin UI grant button |
| Admin revoke button | "Revoke" | Admin UI per-row revoke |
| Private teacher — no access message | "No discussion subjects have been granted. Contact the platform administrator." | Shown when private teacher opens discussion creator with no grants |

All existing Hebrew labels in activities list, homework, worksheets, student home, parent reports, teacher reports, school portal, and admin pages must not be modified.

---

## 11. Manual QA Checklist

### Admin permission setup

- [ ] Log in as platform admin.
- [ ] Navigate to a private teacher's admin detail page.
- [ ] "Discussion Activity Subjects" section is visible.
- [ ] Grant Math for grades 1–3 → row appears.
- [ ] Grant Geometry for all grades → row appears.
- [ ] Revoke the Geometry grant → row disappears.
- [ ] Attempt to access admin discussion-subjects API with non-admin session → blocked.
- [ ] Attempt to grant discussion subjects for a school teacher via this section → section is hidden for school teachers.

### School manager permission setup

- [ ] Log in as school manager.
- [ ] Navigate to a teacher in the school portal.
- [ ] Existing subject grant/revoke works without regression.
- [ ] Attempt to access a teacher from another school → blocked.
- [ ] School manager cannot see or modify private teacher discussion subjects.

### Teacher exercise library — school teacher

- [ ] Log in as school teacher with Math grades 3–4 permission.
- [ ] Open grade-3 class → Discussion tab appears.
- [ ] Click "Create Discussion" → question picker page loads.
- [ ] Subject dropdown shows only Math (no Geometry or others).
- [ ] Select topic and difficulty → generate → ~5 question cards appear.
- [ ] Each card shows question, answer choices, highlighted correct answer.
- [ ] "Use this question" → confirmation form.
- [ ] Create activity → redirected to monitoring page.
- [ ] Activity appears in class activities list.
- [ ] Attempt to create discussion for grade-5 class (outside permission) → blocked.

### Teacher exercise library — private teacher

- [ ] Private teacher with no grants → discussion creation shows clear "no permissions" message.
- [ ] After admin grants Math grades 1–6 → teacher sees Math for grade-1 student.
- [ ] Private teacher cannot access grade-7 questions when grant covers only grades 1–6.

### Student open and submit

- [ ] Assigned student → discussion activity on home page.
- [ ] Open activity → question shown, no timer, no correct answer leaked.
- [ ] Answer and submit → neutral confirmation, no correct/incorrect.
- [ ] Re-open after submitting → already-submitted state.
- [ ] Student NOT in class → activity URL returns 404 or 403.

### Teacher monitoring

- [ ] Monitoring page loads.
- [ ] All class members shown with status.
- [ ] Submitted students show answer and correct/incorrect indicator.
- [ ] Not-submitted students show not-submitted state.
- [ ] Summary counts accurate.
- [ ] Refresh → updated data.

### Diagnostic / report non-impact

- [ ] Note parent report values before discussion.
- [ ] Create discussion, student submits.
- [ ] Parent report → all values identical.
- [ ] Teacher student report → subject and topic accuracy unchanged.
- [ ] Class report → no new accuracy entries.
- [ ] Existing homework activity: create, activate, student submit → teacher report reflects it normally.
- [ ] Existing learning session → parent report updates normally.

---

## 12. Risks, Open Questions, and Resolved Owner Decisions

### RESOLVED — Owner Decision — Procedural Question Generation (Math and Geometry)

**Decision recorded:** Procedural question generation for Math and Geometry is acceptable for discussion activities.

The selected preview question is frozen into the activity's `question_set` at creation time and remains stable for the entire life of that activity. The fact that a different preview session may generate a slightly different question instance is acceptable — once a teacher selects and creates the activity, that exact question is fixed permanently.

Math and Geometry must be fully supported as discussion subjects. Do not limit discussion activities to non-procedural subjects.

No action required. Implementation proceeds with all six subjects: `math`, `geometry`, `hebrew`, `english`, `science`, `moledet_geography`.

---

### RESOLVED — Private teacher subject defaults

No `private_teacher_subjects` rows exist today. All existing private teachers have no discussion access until the admin explicitly populates the table. There is no auto-grant migration. Admin must be informed to configure this before private teachers can use the feature. Default is deny.

### RESOLVED — `validateSameExactQuestionSet` relaxation scope

No relaxation is needed. Discussion questions have `correct_answer` stored in `question_set` (required for teacher monitoring). The student-facing payload already strips `correct_answer` for all modes in `loadActivityForStudent`. Behavior is unchanged.

### RESOLVED — Selected students in V1

School teacher: whole-class only. Private teacher: 1:1 only. Selected-student and group targeting are deferred to a future phase. This is stated in Section 4.

### RESOLVED — Private teacher multiple students simultaneously

Batch UI creation (one question pick → select N students → N `student_activities` rows) is acceptable in V1. Group-scoped discussions are deferred.

### RESOLVED — Correctness computation

`answersMatch()` string comparison is used. Acceptable for MCQ subjects in V1. Consistent with existing activity behavior. Teachers are aware this is a string match.

### RESOLVED — School teacher with multiple classes

Discussion creator is class-scoped. Teacher creates one discussion per class. Consistent with all classroom activities today.

### RESOLVED — `subjects_locked` flag

`school_teacher_memberships.subjects_locked` is not enforced in current app logic. Not introduced by this feature. Known gap noted.

### RESOLVED — Monitoring page refresh

Manual refresh only. No WebSocket required. Stated in V1 scope.

---

## 13. Before Implementation Approval — Final Checklist

Owner confirms each item before approving:

- [ ] Plan document reviewed in full and understood.
- [ ] V1 scope boundaries confirmed (Section 4): school teacher whole-class only, private teacher 1:1 only.
- [ ] Non-goals confirmed (Section 5).
- [ ] Owner decision on procedural question generation recorded and confirmed (Section 12).
- [ ] Permission defaults confirmed: private teachers have no access until admin grants.
- [ ] Hebrew copy list reviewed (Section 10) — owner will supply final Hebrew strings before release.
- [ ] SQL migrations 036 and 037 reviewed and understood. Owner will run manually.
- [ ] Diagnostic firewall approach confirmed (Section 3). Mandatory verification in Section 3.5 understood.
- [ ] File impact list reviewed (Section 8).
- [ ] Test plan reviewed (Section 9).
- [ ] Manual QA checklist reviewed (Section 11).
- [ ] End-of-implementation handoff requirements understood (Section 14).
- [ ] No remaining unresolved questions that would block implementation.

---

## 14. End-of-Implementation Handoff Requirements

After implementation, the agent must produce a handoff report containing all of the following. Implementation is not considered done until this report is delivered.

### Changed files list

Full list of every file created or modified, with a one-line description of each change.

### Migration files created (not executed)

- Confirm `supabase/migrations/036_private_teacher_subjects.sql` exists with expected content.
- Confirm `supabase/migrations/037_discussion_activity_mode.sql` exists with expected content.
- Confirm neither was executed by the agent.

### SQL manual instructions

Step-by-step instructions for the owner to apply both migrations, including the pre-check queries for constraint names before running migration 037.

### Tests run and results

List of all test files executed. Pass/fail count. Description of any failures and resolution.

### Build result

Confirm `next build` completes without errors.

### Diagnostic non-regression proof

JSON diff or explicit value comparison proving that after discussion activity submission, all three diagnostic endpoints (`/api/parent/students/[id]/report-data`, `/api/teacher/students/[id]/report-data`, `/api/teacher/classes/[id]/report-data`) return values identical to baseline. Method used must be stated.

### Permission test results

Confirmation that all permission test scenarios in Section 9 pass. Special attention: private teacher with no grants blocked; school teacher with wrong subject blocked; cross-school school manager blocked.

### Existing activity regression result

Confirmation that homework, live_lesson, guided_practice, and quiz activities behave identically to before. Confirmation that worksheet activities are unaffected. Confirmation that parent report for home practice sessions is unaffected.

### Full `git status --short`

Output showing all modified and new files.

### Confirmation statement

Explicit written confirmation: "No SQL was executed by the agent. No commit was made. No push was made."

---

*Plan version: 3 — canonical document. Contains Owner Approval Gate, all implementation constraints, full diagnostic firewall specification, exact V1 scope, non-goals, permission model, Hebrew copy review list, before-approval checklist, end-of-implementation handoff requirements, and all resolved owner decisions including the Math/Geometry procedural generation decision.*

*Ready for owner final review. No implementation approved until owner explicitly states approval.*
