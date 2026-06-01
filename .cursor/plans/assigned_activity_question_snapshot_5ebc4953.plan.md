---
name: Assigned Activity Question Snapshot
overview: Formalize the existing de-facto question freeze in assigned activities by adding stable per-question keys, a snapshot_status marker, canonical field shapes, and a worksheet answer snapshot; and ensure authorized teacher, school admin, and parent users have a review modal/detail view to reconstruct activity data — without touching free-practice flows, report redesign, Hebrew copy unless approved, or any account relationships.
todos:
  - id: phase1
    content: "Phase 1: Owner reviews SQL plan (Section 7) and approves; owner runs migration on staging"
    status: completed
  - id: phase2
    content: "Phase 2: Teacher assigned activity snapshot write path (classroom + individual)"
    status: completed
  - id: phase3
    content: "Phase 3: Parent assigned activity snapshot write path (separate from teacher)"
    status: completed
  - id: phase4
    content: "Phase 4: Answer submission question_key reference validation"
    status: completed
  - id: phase5
    content: "Phase 5: Reconstruction read path + worksheet snapshot + Section 1.9 review modal discovery addendum"
    status: completed
  - id: phase5b
    content: "Phase 5b: Review modal/button additions per context (requires owner approval of discovery addendum)"
    status: completed
  - id: phase6
    content: "Phase 6: Full regression tests, acceptance criteria verification, owner sign-off"
    status: completed
isProject: false
---

# Assigned Activity Question Snapshot — Implementation Plan

## 0. Scope Boundaries and Acceptance Criteria

### Explicit out-of-scope items

The following are explicitly excluded from this plan and must not be touched during implementation:

- Free student learning flows (`public.answers`, `POST /api/learning/answer`, learning sessions)
- Per-session snapshots for non-assigned practice
- Report UI redesign or any new aggregate report behavior
- Hebrew copy — must not be changed unless exact wording is approved by the owner
- UI/design redesign — the review modal work in Section 11 targets minimum required additions only, not a UI redesign
- Student-facing review UI (no new student UI unless it already exists and is needed for consistency)
- Private parent account ↔ school-provided parent access relationships — these are separate contexts and must remain completely separate
- Any shared write path, shared table, or cross-account logic between teacher and parent account contexts
- Migration creation or SQL execution — SQL provided in Section 7 is for owner review and manual application only

### Acceptance Criteria

### Positive acceptance criterion

After implementation, for every **new** teacher-assigned or parent-assigned activity, it must be possible to reconstruct all of the following **without reading from the live question generator or bank**:

- the exact question text shown to the student
- the answer options
- the correct answer
- the student's selected answer
- correctness result
- question order
- stable `question_key` for each question

### Positive acceptance criterion — review modal

After implementation, an authorized teacher, school manager/admin, or parent must be able to open a review modal or detail view for a completed assigned activity and reconstruct the activity from stored data only:

- question text
- answer options
- correct answer
- each student's selected answer
- correctness per question
- success percentage per student
- overall activity success percentage where relevant
- unanswered / incomplete questions where relevant
- legacy fallback state indicator if the old activity has no reliable question snapshot

Each context sees only its own authorized activities:
- Teacher / private teacher: only their own assigned activities
- School manager / admin: only school-context activities they are authorized to see
- Parent: only activities assigned in that parent account/context

### Negative acceptance criterion

Normal free student learning (via `POST /api/learning/answer` → `public.answers`) must remain completely untouched. No assigned-activity snapshot logic must ever execute in that code path.

---

## 1. Current-State Analysis

### 1.1 Core finding — the freeze is de-facto, not formalized

The current system **already stores full question content** in `question_set` for `classroom_activities`, `student_activities`, and `parent_assigned_activities`. The problem is **not** that questions are never saved. The problem is that the freeze is informal and has several structural gaps:

- No stable per-question key — only positional `question_index` used
- No `snapshot_status` / `snapshot_frozen_at` marker — cannot distinguish a correctly frozen activity from a legacy row with `question_set = '[]'`
- Too much dependence on array position for question identity
- Field shapes are inconsistent across generators (15+ aliases in existing data)
- Worksheet answers have no `question_snapshot` at all
- Some existing review and export paths may not reliably use frozen data under all edge cases

This plan formalizes the freeze without replacing the existing storage mechanism.

### 1.2 Tables that store assigned activities

| Table | Migration | Assignor | `question_set` column? |
|---|---|---|---|
| `classroom_activities` | `024_classroom_activities.sql` | Teacher → class | Yes, `jsonb not null default '[]'` |
| `student_activities` | `026_student_activities.sql` | Teacher → one student | Yes, `jsonb not null default '[]'` |
| `parent_assigned_activities` | `051_parent_assigned_activities.sql` | Parent → linked child | Yes, `jsonb not null default '[]'` |
| `worksheet_activities` | `029_worksheet_activities.sql` | Teacher → class (PDF/digital) | No — questions in separate `worksheet_questions` table |

Teacher-assigned and parent-assigned activities are **completely separate account contexts** and must remain so. No shared tables, shared write paths, or cross-account logic exists or will be introduced.

### 1.3 Tables that store student answers / submissions

| Table | Migration | Source activity |
|---|---|---|
| `classroom_activity_attempts` | `024` | `classroom_activities` |
| `classroom_activity_student_status` | `024` | aggregate |
| `student_activity_attempts` | `026` | `student_activities` |
| `student_activity_status` | `026` | aggregate |
| `parent_activity_attempts` | `051` | `parent_assigned_activities` |
| `parent_activity_status` | `051` | aggregate |
| `worksheet_student_answers` | `029` | `worksheet_activities` / `worksheet_questions` |
| `answers` | `001` | Free-practice sessions — **out of scope, must not be touched** |

### 1.4 Existing snapshot fields

| Field | Where | Status |
|---|---|---|
| `question_set` (jsonb) | All three activity tables | Written at CREATE time; full question objects — the de-facto freeze |
| `question_snapshot` (jsonb) | All three attempt tables | Written per-answer at SCORE time; server copy of one question from `question_set` |
| `worksheet_questions` table | Separate normalized table | Written at worksheet create time |
| `question_snapshot` on worksheet answers | **Does not exist** | Gap |

### 1.5 Is question content real or placeholder?

Real content. At create time `validateSameExactQuestionSet` in [`lib/classroom-activities/classroom-activities-shared.server.js`](lib/classroom-activities/classroom-activities-shared.server.js) requires:
- Prompt: `question` / `prompt` / `stem` (or `params.kind`)
- Correct answer: `correct_answer` / `correctAnswer` / `expectedAnswer` / `answer`

Questions are generated client-side by `generateActivityQuestionSetClient` and POSTed with full content. No question IDs from a central DB bank are stored — the full text+options+answer+params array is frozen into `question_set`.

### 1.6 API routes — creation

| Route | File | Activity type |
|---|---|---|
| `POST /api/teacher/activities` | `pages/api/teacher/activities/index.js` | Classroom |
| `POST /api/teacher/student-activities` | `pages/api/teacher/student-activities/index.js` | Individual |
| `POST /api/teacher/worksheet-activities` | `pages/api/teacher/worksheet-activities/index.js` | Worksheet |
| `POST /api/parent/activities` | `pages/api/parent/activities/index.js` | Parent-assigned |

### 1.7 API routes — answer submission

All interactive activity types share:
- `POST /api/student/activities/[activityId]/answer` — dispatches to `recordStudentActivityAnswer` → scoped to classroom / student / parent based on `loadActivityForStudent`
- `POST /api/student/worksheet-activities/[worksheetId]/submit` — separate worksheet path

### 1.8 Existing read paths affected by this plan (technical dependency only)

These paths currently read from `question_set` and/or `question_snapshot`. This plan does not redesign them. Phase 5 narrows the change to ensuring they can use `question_key` and fall back cleanly for legacy records.

| Route / screen | What it reads |
|---|---|
| `GET /api/teacher/activities/[activityId]/students/[studentId]/answers` | `classroom_activity_attempts` + `question_set` via `mergeFrozenQuestionSources` |
| Teacher Excel export (`/report-export`) | `classroom_activity_attempts` + `question_set` via `frozen-activity-question.server.js` |
| `GET /api/teacher/student-activities/[activityId]/report` | `student_activity_attempts` |
| `GET /api/parent/activities/[activityId]` | `parent_activity_attempts` |
| Worksheet grade/review | `worksheet_student_answers` + `worksheet_questions` JOIN |

### 1.9 Review modal / view button — discovery required before implementation

Before Phase 5 / Section 11 work begins, the following must be inspected and documented as a discovery sub-task:

- Which teacher activity windows (classroom monitor, individual student activity list) already have a "view answers" or "review" button/action.
- Which components and routes implement that button: exact file paths, component names, and API endpoints called.
- What data those APIs currently return — whether it includes question text, options, correct answer, and student answer, or only aggregate scores.
- Whether school manager / admin currently has an equivalent path to reach activity review data — or whether school manager pages exist at all that expose activity details.
- Whether the school manager's access is routed through the same teacher-portal APIs with an authorization check, or through separate school-admin endpoints.
- Whether the parent-assigned activity detail view (`GET /api/parent/activities/[activityId]`, `ParentSentActivitiesPanel`) currently reconstructs per-question data (question text + student answer + correctness), or only shows aggregate scores.
- Which API endpoints each authorized context uses for per-question review data today.
- Whether those APIs depend on `question_index` alone, or whether they are already structured to accept a `question_key` lookup once the snapshot work is complete.
- Whether any existing review component uses `mergeFrozenQuestionSources` / `frozen-activity-question.server.js` to resolve questions, or reads raw fields directly.

This discovery must be completed before planning any component changes in Section 11. The output of the discovery is a short addendum listing existing vs missing, per context, that the owner can review before approving Section 11 implementation.

### 1.10 Key structural gaps identified (snapshot layer)

1. **No "snapshot locked" marker.** `question_set` defaults to `'[]'::jsonb`. There is no `snapshot_frozen_at` timestamp or `snapshot_status` field to distinguish "questions were saved and locked" from "old activity created before validation existed."
2. **No stable per-question key.** Each question in `question_set` is referenced only by its array position (`question_index`). If the array order were ever corrupted there is no recovery path.
3. **Field name aliases proliferate.** `frozen-activity-question.server.js` already handles 15+ aliases (question/prompt/stem/questionText/text/body, choices/options/answers/answerOptions, correctAnswer/correct_answer/expectedAnswer/answer/correct/solution, difficultyLevel/difficulty_level/difficulty). New code reading snapshots must always go through the resolver.
4. **Unanswered questions have no per-attempt snapshot.** If a student partially completes an activity, questions they never reached have no `question_snapshot` row. The activity-level `question_set` is the only record of those questions.
5. **Worksheets have no attempt-level question snapshot.** `worksheet_student_answers` has no `question_snapshot` column; review must JOIN `worksheet_questions`.
6. **Source tracking is partial.** Some question objects carry `params.diagnosticSkillId` or `params.patternFamily`, but there is no canonical `source_question_id` or `generator_source` field at the top level.

---

## 2. Recommended Data Model

### Option comparison

**Option A — Enhance existing JSONB `question_set` on activity tables (recommended)**
- `question_set` already stores full question content at create time — it is the de-facto snapshot.
- Enhancements: add `snapshot_status` (`'frozen'` | `'legacy_missing'`), `snapshot_frozen_at`, and a stable `qk` (question key) UUID inside each question object.
- No new tables. All existing read paths continue working without change.
- Storage: JSONB compressed in-row; a 10-question activity with ~200 bytes/question = ~2 KB. At 100k activities, ~200 MB total — acceptable.
- Query complexity: low (single row read); export already uses `frozen-activity-question.server.js`.
- Backward compatibility: `snapshot_status = 'legacy_missing'` marks old records; fallback reads `question_snapshot` on attempts.

**Option B — Separate normalized `assigned_activity_questions` table**
- One row per question per activity. Queryable by `activity_id` + `question_index`.
- More complex schema (new table, FK, indexes). Requires JOIN on every read path.
- Easier to query by skill or topic across activities, but no current requirement for this.
- Higher migration risk: must backfill from existing `question_set` JSONB.
- No benefit over Option A for the stated goals.

**Option C — Hybrid**
- Keep JSONB `question_set` as primary snapshot; add normalized table only for export/analytics queries.
- Adds write complexity (must write two places atomically).
- Premature — no current analytics query requirement justifies it.

### Recommendation: Option A

Endorse `question_set` as the canonical frozen snapshot with three targeted enhancements:
1. Add `snapshot_status` text column and `snapshot_frozen_at` timestamptz to activity tables.
2. Add a stable `qk` UUID to each question object inside `question_set` at write time.
3. Add `question_snapshot` column to `worksheet_student_answers` (mirrors the pattern from the other three attempt tables).

---

## 3. Proposed Snapshot Shape

### 3.1 Per-question object stored inside `question_set`

This is a normalized canonical shape. All new activity creation must write this shape. The `frozen-activity-question.server.js` aliases remain for reading legacy records.

```json
{
  "qk": "uuid-v4",
  "question_index": 0,
  "question": "מה שווה 3 + 4?",
  "choices": ["5", "6", "7", "8"],
  "correct_answer": "7",
  "subject": "math",
  "topic": "addition",
  "subtopic": null,
  "grade": "g2",
  "difficulty": "easy",
  "skill_key": "math_addition_basic",
  "source_question_id": null,
  "generator_source": "math-question-generator",
  "params": { "kind": "addition", "a": 3, "b": 4 },
  "explanation": "3 + 4 = 7",
  "hint": null,
  "shape": null
}
```

Field semantics:
- `qk` — stable UUID assigned once at activity create time; never changes even if index shifts due to bug
- `question_index` — 0-based integer, matches position in array (redundant but self-documenting for exported rows)
- `question` — canonical text field; always written; existing aliases (`prompt`, `stem`, etc.) accepted on read only
- `choices` — array of strings or null for typed-answer questions
- `correct_answer` — canonical field; existing aliases accepted on read only
- `subject`, `topic`, `subtopic`, `grade`, `difficulty`, `skill_key` — copied from activity-level metadata at snapshot time
- `source_question_id` — original ID from static bank (e.g. `"body_1"`) if available; null for procedurally generated
- `generator_source` — string name of the generator module (e.g. `"math-question-generator"`, `"science-static-bank"`)
- `params` — preserved from generator for diagnostic / future re-render use
- `explanation`, `hint`, `shape` — preserved from generator output

### 3.2 Activity-level snapshot metadata (new columns)

On `classroom_activities`, `student_activities`, `parent_assigned_activities`:

```sql
snapshot_status      text        not null default 'legacy_missing'
                                 check (snapshot_status in ('frozen', 'legacy_missing')),
snapshot_frozen_at   timestamptz null
```

`snapshot_status = 'frozen'` is written at activity CREATE time after `validateSameExactQuestionSet` passes and `question_set` is persisted.

`snapshot_frozen_at` = the `created_at` timestamp of the activity (written at same time).

Old rows keep `snapshot_status = 'legacy_missing'` and `snapshot_frozen_at = null`.

---

## 4. Write-Path Plan

### 4.1 Teacher classroom activity (`POST /api/teacher/activities`)

Current flow in [`lib/teacher-server/teacher-activities.server.js`](lib/teacher-server/teacher-activities.server.js) → `createClassroomActivity`:

1. `parseCreateActivityBody` validates `questionSet` via `validateSameExactQuestionSet`.
2. `jsonSafeCloneForStorage(parsed.payload.questionSet)` is saved as `question_set`.
3. Row is inserted with `status: 'draft'`.

**Proposed change (write path only):**
- Before calling `jsonSafeCloneForStorage`, run a new `normalizeAndFreezeQuestionSet(rawSet, { subject, topic, subtopic, grade, difficulty, skillKey })` function that:
  - Normalizes field aliases to canonical form (`question`, `choices`, `correct_answer`, etc.)
  - Assigns a `qk` UUID to each question object (using `crypto.randomUUID()`)
  - Adds `question_index`, `subject`, `topic`, `subtopic`, `grade`, `difficulty`, `skill_key` to each question if not present
  - Adds `source_question_id` and `generator_source` if detectable from `params`
  - Returns the canonical array
- Insert row with the normalized `question_set`, `snapshot_status: 'frozen'`, and `snapshot_frozen_at: new Date().toISOString()`.

The `question_set` is frozen at CREATE (draft) time. It must not be updated by any subsequent API call. Activate/status transitions must NOT accept a new `questionSet` in the request body.

### 4.2 Teacher individual student activity (`POST /api/teacher/student-activities`)

Current flow in [`lib/teacher-server/student-activity.server.js`](lib/teacher-server/student-activity.server.js) → `createStudentActivity`:

Same as 4.1. Apply `normalizeAndFreezeQuestionSet` before insert; write `snapshot_status: 'frozen'`.

### 4.3 Parent-assigned activity (`POST /api/parent/activities`)

Current flow in [`lib/parent-server/parent-activity.server.js`](lib/parent-server/parent-activity.server.js) — mirrors the teacher individual pattern.

Same as 4.1. The parent and teacher flows are **completely independent**. No shared write code should be created between them. Each must call `normalizeAndFreezeQuestionSet` separately from its own server module.

### 4.4 Where the freeze must happen

The snapshot must be written server-side inside the INSERT transaction. The client sends raw `questionSet`; normalization and `qk` assignment happen on the server before DB write. The client must never send `qk`, `snapshot_status`, or `snapshot_frozen_at` — these are server-assigned only.

---

## 5. Answer-Submission Plan

### 5.1 Current behavior (all three scopes)

When `POST /api/student/activities/[activityId]/answer` is called:
1. Server reads `question_set[questionIndex]` from the activity row.
2. Derives `correct_answer` server-side; never from client.
3. Upserts `question_snapshot: { ...question }` into the attempt table.
4. The attempt row stores: `question_index`, `question_snapshot`, `selected_answer`, `correct_answer`, `is_correct`.

### 5.2 Proposed changes

- After normalization (Phase 2/3), `question_set` entries all have `qk`. The attempt write should include `question_key: question.qk` as a new column on attempt tables.
- The `question_snapshot` on attempt rows continues to be written as a full copy (security audit trail; it is server-written and never trusted from client).
- No full question text duplication concern: the `question_snapshot` is a server copy for audit. The canonical source is `question_set` on the activity row. Both may exist simultaneously.

### 5.3 Proposed attempt row additions

New column on `classroom_activity_attempts`, `student_activity_attempts`, `parent_activity_attempts`:

```sql
question_key   text   null  -- stable qk from question_set item; null for legacy attempts
```

- Written at the same time as `question_snapshot`.
- Enables future joins/reports by stable key rather than positional index.
- Legacy attempts (before Phase 2) will have `question_key = null`; this is acceptable.

---

## 6. Backward Compatibility Plan

### 6.1 Old activities with `question_set = '[]'`

These are marked `snapshot_status = 'legacy_missing'` by the default column value. They receive no backfill.

**Fallback read behavior for all screens/exports:**
1. Try `question_set` from the activity row. If non-empty and `snapshot_status = 'frozen'`, use it (canonical path).
2. If `question_set` is empty or `snapshot_status = 'legacy_missing'`, fall back to `question_snapshot` on individual attempt rows. This covers questions the student actually answered.
3. For questions the student never answered (no attempt row), there is no recoverable question text. Display a placeholder (e.g. "שאלה [N] — לא זמינה"). This is the existing behavior since `question_snapshot` defaults to `'{}'::jsonb`.

### 6.2 Existing read code

`frozen-activity-question.server.js` already supports 15+ field aliases and has `mergeFrozenQuestionSources` which merges activity-level `question_set[i]` with attempt-level `question_snapshot`. This function is already the correct fallback path. No change to its logic is required in this phase.

### 6.3 What NOT to do

- Do not attempt to re-generate questions from banks for old activities. Banks are procedural/random — regeneration would produce different questions.
- Do not backfill `qk` values into old `question_set` arrays. Old arrays stay as-is; `question_key` on old attempt rows stays null.
- Do not modify old `snapshot_status` values after the fact; the default `'legacy_missing'` is the permanent marking.

---

## 7. SQL Plan (owner-run only — do not execute)

### 7.1 New columns on activity tables

```sql
-- Apply to: classroom_activities, student_activities, parent_assigned_activities
-- Each table needs its own migration statement

alter table public.classroom_activities
  add column if not exists snapshot_status    text        not null default 'legacy_missing'
                                              check (snapshot_status in ('frozen', 'legacy_missing')),
  add column if not exists snapshot_frozen_at timestamptz null;

-- Same for student_activities and parent_assigned_activities
```

### 7.2 New column on attempt tables

```sql
-- Apply to: classroom_activity_attempts, student_activity_attempts, parent_activity_attempts

alter table public.classroom_activity_attempts
  add column if not exists question_key text null;

-- Same for student_activity_attempts and parent_activity_attempts
```

### 7.3 New column on worksheet_student_answers

```sql
alter table public.worksheet_student_answers
  add column if not exists question_snapshot jsonb not null default '{}'::jsonb;

comment on column public.worksheet_student_answers.question_snapshot is
  'Server-written copy of worksheet_questions row at grading/scoring time; mirrors pattern from classroom_activity_attempts.';
```

### 7.4 Indexes

```sql
-- Fast lookup of activities that have a valid frozen snapshot
create index if not exists classroom_activities_snapshot_status_idx
  on public.classroom_activities (snapshot_status, created_at desc);

create index if not exists student_activities_snapshot_status_idx
  on public.student_activities (snapshot_status, created_at desc);

create index if not exists parent_assigned_activities_snapshot_status_idx
  on public.parent_assigned_activities (snapshot_status, created_at desc);

-- Fast lookup of attempts by question_key (future analytics)
create index if not exists classroom_activity_attempts_question_key_idx
  on public.classroom_activity_attempts (question_key)
  where question_key is not null;

-- Same for student_activity_attempts and parent_activity_attempts
```

### 7.5 RLS / security

All three activity tables and all three attempt tables already use `enable row level security` with no client policies (service-role only, per migration comments). No new RLS policies are needed. The new columns inherit the same table-level RLS as existing columns.

`worksheet_student_answers` — same pattern; no new RLS needed for the new column.

### 7.6 Constraints

- `snapshot_status` check constraint uses `in ('frozen', 'legacy_missing')` — if new statuses are needed in future, an alter will be required (same pattern as existing `mode` / `status` columns).
- `question_key` on attempt tables is intentionally `null` to allow legacy rows.

### 7.7 Backfill / data migration strategy

**No automatic backfill is recommended.** Reasons:
1. Old `question_set` arrays may contain non-canonical field names; backfilling `qk` would require running `normalizeAndFreezeQuestionSet` across potentially inconsistent historical data.
2. Old rows stay `snapshot_status = 'legacy_missing'` permanently; the fallback read path handles them.
3. Only new activities created after Phase 2/3 deployment will have `snapshot_status = 'frozen'` and `qk` in questions.

**Optional targeted backfill (owner decision only):** After Phase 2 is deployed and stable, the owner may choose to run a one-time script that:
- Reads rows where `snapshot_status = 'legacy_missing'` AND `question_set != '[]'` AND `jsonb_array_length(question_set) > 0`
- Runs `normalizeAndFreezeQuestionSet` on each
- Writes back the normalized set and updates `snapshot_status = 'frozen'`, `snapshot_frozen_at = created_at`
- This is owner-run, logged, and outside scope of this plan.

### 7.8 Rollback

All changes are additive (`add column if not exists`). To roll back:
```sql
alter table public.classroom_activities drop column if exists snapshot_status;
alter table public.classroom_activities drop column if exists snapshot_frozen_at;
-- etc.
```
No existing data would be lost. Application code from Phase 2+ would need to be reverted to stop writing the new fields.

---

## 8. Test Plan

Tests to be written (no implementation yet):

1. **Teacher classroom activity saves frozen snapshot**
   - Create activity via `POST /api/teacher/activities` with valid `questionSet`.
   - Assert DB row has `snapshot_status = 'frozen'`, `snapshot_frozen_at` is not null, `question_set.length = questionCount`.
   - Assert each question object in `question_set` has a non-null `qk` UUID.
   - Assert canonical fields (`question`, `choices`, `correct_answer`) are present.

2. **Parent-assigned activity saves frozen snapshot** (independent from teacher test)
   - Same assertions via `POST /api/parent/activities`.
   - Assert no cross-account data leakage between parent and teacher tables.

3. **Student answer references snapshot question**
   - Start + answer an activity.
   - Assert attempt row has `question_key` matching `question_set[questionIndex].qk`.
   - Assert attempt `question_snapshot` contains the correct question text.
   - Assert `correct_answer` on attempt was derived from `question_set`, not from client body.

4. **Old activity without snapshot still works**
   - Seed an activity row with `question_set = '[]'`, `snapshot_status = 'legacy_missing'`.
   - Seed attempt rows with populated `question_snapshot`.
   - Assert that the teacher answer detail API and parent activity detail API return correct per-question data using the fallback path (attempt-level `question_snapshot`).
   - Assert no crash, no 500 error.

5. **Snapshot does not change if source question bank changes later**
   - Freeze a snapshot. Modify the static bank or generator to return different questions.
   - Call answer endpoint. Assert `question_snapshot` on the attempt matches the original frozen `question_set`, not the new bank output.

6. **No snapshot is saved for regular free student learning**
   - Submit an answer via `POST /api/learning/answer` (free-practice path).
   - Assert no rows are written to any activity attempt table.
   - Assert no `question_snapshot` is written to `public.answers`.

7. **Export / review paths reconstruct question + answer correctly**
   - Create activity, have student answer 3 of 5 questions.
   - Call teacher export API.
   - Assert the export contains correct question text for all 5 questions (answered ones from `question_snapshot`, unanswered ones from `question_set`).
   - Assert the 2 unanswered questions show a defined placeholder, not a crash.

8. **Worksheet student answer captures snapshot**
   - Submit worksheet answer.
   - Assert `worksheet_student_answers.question_snapshot` contains the correct `worksheet_questions` row content at submit time.

---

## 9. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| **Storage growth from per-attempt `question_snapshot`** | Low | Already exists and works; adding `question_key` text column is negligible |
| **Malformed snapshot data (incomplete freeze)** | Medium | `normalizeAndFreezeQuestionSet` validates before write; transaction fails atomically if validation fails |
| **Mismatched question order** | Medium | Stable `qk` UUID decouples identity from position; fallback merges both sources |
| **Old activity compatibility breaks** | Low | `legacy_missing` default + existing `mergeFrozenQuestionSources` fallback handles it; existing tests must remain green |
| **Duplicate logic between teacher and parent assignment flows** | Medium | Both call the same `normalizeAndFreezeQuestionSet` utility, but the write paths remain in separate server modules; do NOT merge the modules |
| **Private parent account / school parent account boundary violation** | Critical | Plan explicitly prohibits any shared write path, shared reporting, or cross-account logic; teacher tables and parent tables remain separate; enforced by RLS (service-role only, scoped per `teacher_id` / `parent_id`) |
| **`qk` collision** | Very low | `crypto.randomUUID()` collision probability is negligible; no uniqueness constraint needed in DB |
| **Worksheet snapshot missing during grading window** | Medium | Write `question_snapshot` at submit time before any grading; `worksheet_questions` row at that moment is the source of truth |
| **Client sends `qk` or `snapshot_status` in POST body** | Low | Server ignores / overwrites these fields before insert; they are never taken from client body |

---

## 10. Phased Execution Proposal

Discovery and file/table mapping is complete (this document). Implementation begins at Phase 1 after owner approval of this plan.

**Phase 1 — DB design and owner SQL approval**
- Owner reviews Section 7 SQL plan.
- Owner runs migration on staging, verifies no breakage.
- Owner approves or requests changes.
- No application code changes in this phase.

**Phase 2 — Teacher assigned activity snapshot write path**
- Implement `normalizeAndFreezeQuestionSet` utility in `lib/classroom-activities/`.
- Update `createClassroomActivity` in [`lib/teacher-server/teacher-activities.server.js`](lib/teacher-server/teacher-activities.server.js) to call normalizer and write `snapshot_status`, `snapshot_frozen_at`.
- Update `createStudentActivity` in [`lib/teacher-server/student-activity.server.js`](lib/teacher-server/student-activity.server.js) similarly.
- Update answer write path in both files to write `question_key` on attempt rows.
- Write tests from Section 8, items 1, 3, 5, 6.
- All existing tests must remain green.

**Phase 3 — Parent assigned activity snapshot write path**
- Update parent activity CREATE in [`lib/parent-server/parent-activity.server.js`](lib/parent-server/parent-activity.server.js).
- Update parent answer write path to write `question_key`.
- Write tests from Section 8, items 2, 3.
- Teacher and parent code paths remain separate; no shared create logic.

**Phase 4 — Answer submission reference validation**
- Add server-side assertion that `questionIndex` is within bounds of `question_set` array.
- Log warning (non-fatal) when `question_key` cannot be resolved (e.g. during legacy fallback).
- Write test from Section 8, item 4 (old activity still works).

**Phase 5 — Reconstruction read path, worksheet snapshot gap, and review modal discovery**
- Scope: storage and data reconstruction only on the write/API side. Do not redesign report UI or aggregate report logic.
- Update teacher answer detail API and teacher export to use `question_key` when available, falling back to positional index for legacy rows. The existing `mergeFrozenQuestionSources` in `frozen-activity-question.server.js` is the correct base for this. Add `questionKey` and `snapshotStatus` to `mapFrozenQuestionDetail` output (see Section 11.6).
- Update worksheet submit handler in `lib/worksheet-activities/worksheet-student.server.js` to write `question_snapshot` (copy of the `worksheet_questions` row at submit time) to `worksheet_student_answers`.
- Complete the discovery described in Section 1.9: inspect all three contexts (teacher, school admin, parent) and produce the discovery addendum documenting existing vs missing review button/modal coverage.
- Write tests from Section 8, items 7, 8.
- **Gate:** submit the Section 1.9 discovery addendum to the owner before beginning any component changes in Phase 5b.

**Phase 5b — Review modal / view button additions** (requires owner approval of Section 1.9 discovery addendum)
- Implement minimum required additions for each context as determined by the Section 1.9 discovery:
  - Teacher classroom: verify or add a per-student review action on the monitor page.
  - Teacher individual student: verify or add a review action on the individual activity detail.
  - School manager / admin: verify or add an activity review path within existing school authorization rules.
  - Parent: verify or add per-question data display in `ParentSentActivitiesPanel` / parent activity detail.
- All contexts use separate components and separate API calls. No cross-context sharing.
- Do not change Hebrew copy without owner approval of exact wording.
- Write tests from Section 8, items 4, 7 (updated to cover legacy modal fallback).

**Phase 6 — Regression tests and final verification**
- Full regression run: all existing teacher portal, parent portal, and student activity tests.
- Verify the positive acceptance criterion (snapshot): for every new assigned activity, all seven data points (question text, options, correct answer, student answer, correctness, order, `question_key`) are reconstructable from the DB without calling any question generator or bank.
- Verify the positive acceptance criterion (review modal): an authorized teacher, school manager/admin, and parent can each open a review modal/detail for a completed activity and see question text, options, correct answer, student answer, correctness, success percentage, and legacy fallback state.
- Verify the negative acceptance criterion: free-practice path (`POST /api/learning/answer` → `public.answers`) is completely untouched; no snapshot logic runs in that path.
- Verify isolation: teacher, school admin, and parent contexts show only their own authorized activities; no cross-context data.
- Performance check: no new N+1 queries introduced by snapshot reads or review API calls.
- Owner sign-off before merge.

---

## 11. Assigned Activity Review Modal / View Button Coverage

This section is a planning stub only. Implementation requires the discovery output from Section 1.9 to be completed and approved by the owner first. No UI must be changed without that discovery step.

### 11.1 Scope and constraints

- This is not a UI redesign. The requirement is a minimum addition: a clear button or action in each authorized context that opens a modal or detail view showing completed activity data reconstructed from the frozen snapshot.
- Hebrew copy must not be changed without owner approval of exact wording.
- Each context is isolated. No shared component, shared API call, or cross-context data flow between teacher, school admin, and parent contexts.
- Student-facing review UI is out of scope unless already present and needed for consistency.

### 11.2 Data the modal must be able to show

For each activity reviewed:

- Exact question text (from `question_set` if `snapshot_status = 'frozen'`; fallback to per-attempt `question_snapshot` if `snapshot_status = 'legacy_missing'`)
- Answer options (`choices` array)
- Correct answer
- Each student's selected answer
- Correctness per question (per student)
- Success percentage per student (`correct_count / answers_count * 100`)
- Overall activity success percentage (average across students, where relevant)
- Unanswered / incomplete questions (where a student has no attempt row for a question index)
- Legacy fallback state: if the activity has `snapshot_status = 'legacy_missing'` and a question cannot be reconstructed, the modal must display a defined placeholder rather than crash or silently omit the question

### 11.3 Context 1 — Teacher / private teacher

**Classroom activities:**
- The monitor page (`pages/teacher/class/[classId]/activities/[activityId]/monitor.js`) and the teacher answer detail route (`GET /api/teacher/activities/[activityId]/students/[studentId]/answers`) already exist.
- Discovery (Section 1.9) must confirm: does the monitor page already have a per-student "view answers" action that opens a modal? Does the returned data include question text, options, correct answer, and per-student selected answer?
- If yes and complete: document it; no change needed.
- If yes but incomplete (e.g., only scores, no question text): plan a minimal API response extension to include the frozen snapshot fields.
- If missing: plan the minimum addition — a button on the student row in the monitor UI that calls the existing answers API and renders question+answer pairs in a modal.

**Individual student activities:**
- The individual activity report route (`GET /api/teacher/student-activities/[activityId]/report`) exists.
- Discovery must confirm: is there a UI button to open per-question review from the individual student activity list?
- Apply the same "existing / incomplete / missing" decision as above.

**After snapshot work (Phases 2–4):** the review API should be updated to use `question_key` lookup when available, and to surface `snapshot_status` so the modal can show the legacy indicator. This is the Phase 5 read-path change.

### 11.4 Context 2 — School manager / admin

- Discovery (Section 1.9) must establish: do school manager/admin pages exist that list assigned activities? If so, which routes and components.
- If school manager access to activity data is already routed through the same teacher-portal APIs with an authorization scope check (e.g., `school_id` gate), then the review modal change may simply be ensuring those APIs return sufficient snapshot data and that the school-manager UI surface has an equivalent "review" button.
- If school manager has no path to activity review at all, plan the minimum required addition: a detail view reachable from the school admin panel that calls the authorized activity detail API and renders the same modal content as the teacher context.
- Must not create new cross-account relationships. School manager sees only activities belonging to teachers in their school, governed by existing `school_id` authorization rules.
- Must not connect school parent access with private parent accounts.

### 11.5 Context 3 — Parent / private parent

- The `GET /api/parent/activities/[activityId]` route and `ParentSentActivitiesPanel` component already exist.
- Discovery (Section 1.9) must confirm: does `ParentSentActivitiesPanel` currently show per-question data (question text + student answer + correctness) when a completed activity is opened? Or does it show only aggregate scores?
- If per-question data is already shown: document the component and API; confirm it uses `mergeFrozenQuestionSources` or equivalent for question text resolution.
- If only aggregate scores are shown: plan the minimum addition — expand the `GET /api/parent/activities/[activityId]` response to include per-question attempt data (already in `parent_activity_attempts`) and render it in the existing panel or a modal inside `ParentSentActivitiesPanel`.
- This context is isolated to that parent's account. No connection to school parent access.

### 11.6 API readiness check

After the snapshot write path (Phases 2–3) and answer reference work (Phase 4) are complete, each review API endpoint must be able to return:

| Field | Source |
|---|---|
| `questionText` | `question_set[i].question` (canonical) or `question_snapshot.question` (fallback) |
| `choices` | `question_set[i].choices` or `question_snapshot.choices` |
| `correctAnswer` | `question_set[i].correct_answer` (server-only; stripped from student view) |
| `selectedAnswer` | attempt row `selected_answer` |
| `isCorrect` | attempt row `is_correct` |
| `questionKey` | `question_set[i].qk` (nullable for legacy) |
| `questionIndex` | attempt row `question_index` |
| `snapshotStatus` | activity row `snapshot_status` |

The `mapFrozenQuestionDetail` function in [`lib/classroom-activities/frozen-activity-question.server.js`](lib/classroom-activities/frozen-activity-question.server.js) already handles most of this. Phase 5 adds `questionKey` and `snapshotStatus` to its output.

### 11.7 Legacy fallback in the modal

For activities with `snapshot_status = 'legacy_missing'`:
- The modal must still render. It falls back to per-attempt `question_snapshot` for answered questions.
- For unanswered questions where no attempt row exists and `question_set` is empty, the modal must show a defined placeholder per question slot (exact placeholder wording is subject to owner approval; no Hebrew copy must be changed here without that approval).
- The modal must not silently omit questions or crash on a missing snapshot.

### 11.8 What does NOT change

- No new student-facing review screens.
- No new aggregate report pages.
- No changes to the data model for this section (data model changes are in Sections 3–7).
- No cross-context components (teacher modal ≠ parent modal ≠ school admin modal; they may share internal utility functions but must not share context or auth scope).

---

## Key files to change in Phases 2–5b

### Snapshot write path (Phases 2–4)

- [`lib/classroom-activities/classroom-activities-shared.server.js`](lib/classroom-activities/classroom-activities-shared.server.js) — add `normalizeAndFreezeQuestionSet`
- [`lib/teacher-server/teacher-activities.server.js`](lib/teacher-server/teacher-activities.server.js) — classroom create + answer write
- [`lib/teacher-server/student-activity.server.js`](lib/teacher-server/student-activity.server.js) — individual create
- [`lib/teacher-server/student-activity-play.server.js`](lib/teacher-server/student-activity-play.server.js) — individual answer write
- [`lib/parent-server/parent-activity.server.js`](lib/parent-server/parent-activity.server.js) — parent create + answer write (separate from teacher)
- New migration file (owner applies): columns per Section 7

### Reconstruction read path and worksheet (Phase 5)

- [`lib/classroom-activities/frozen-activity-question.server.js`](lib/classroom-activities/frozen-activity-question.server.js) — add `questionKey` and `snapshotStatus` to `mapFrozenQuestionDetail` output
- [`lib/worksheet-activities/worksheet-student.server.js`](lib/worksheet-activities/worksheet-student.server.js) — add `question_snapshot` write on submit

### Review modal / view button additions (Phase 5b — after discovery)

The exact files for Phase 5b are determined by the Section 1.9 discovery addendum. Candidates based on current codebase:

- `pages/teacher/class/[classId]/activities/[activityId]/monitor.js` — teacher classroom review (verify existing or add button)
- `components/teacher-portal/TeacherActivityStudentAnswersModal.jsx` — modal component for teacher classroom answers (verify data completeness or extend)
- `pages/api/teacher/activities/[activityId]/students/[studentId]/answers.js` — confirm returns question text + `snapshotStatus`
- `pages/api/teacher/student-activities/[activityId]/report.js` — confirm returns per-question data including question text
- `components/parent/ParentSentActivitiesPanel.jsx` — parent review panel (verify per-question data or extend)
- `pages/api/parent/activities/[activityId].js` — confirm returns per-question attempt data including question text
- School manager/admin pages — file paths to be identified during Section 1.9 discovery
