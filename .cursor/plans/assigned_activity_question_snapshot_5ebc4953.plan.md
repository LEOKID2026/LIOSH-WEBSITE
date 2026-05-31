---
name: Assigned Activity Question Snapshot
overview: Formalize the existing de-facto question freeze in assigned activities by adding stable per-question keys, a snapshot_status marker, canonical field shapes, and a worksheet answer snapshot — without touching free-practice flows, reports, UI, Hebrew copy, or any account relationships.
todos:
  - id: phase1
    content: "Phase 1: Owner reviews SQL plan (Section 7) and approves; owner runs migration on staging"
    status: pending
  - id: phase2
    content: "Phase 2: Teacher assigned activity snapshot write path (classroom + individual)"
    status: pending
  - id: phase3
    content: "Phase 3: Parent assigned activity snapshot write path (separate from teacher)"
    status: pending
  - id: phase4
    content: "Phase 4: Answer submission question_key reference validation"
    status: pending
  - id: phase5
    content: "Phase 5: Review/export reconstruction read path + worksheet_student_answers snapshot"
    status: pending
  - id: phase6
    content: "Phase 6: Full regression tests and owner sign-off"
    status: pending
isProject: false
---

# Assigned Activity Question Snapshot — Implementation Plan

## 0. Scope Boundaries and Acceptance Criteria

### Explicit out-of-scope items

The following are explicitly excluded from this plan and must not be touched during implementation:

- Free student learning flows (`public.answers`, `POST /api/learning/answer`, learning sessions)
- Per-session snapshots for non-assigned practice
- Report UI redesign or any new report behavior
- Hebrew copy changes
- UI/design changes
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

### 1.9 Key structural gaps identified

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

**Phase 5 — Reconstruction read path and worksheet snapshot gap**
- Scope: storage and data reconstruction only. Do not redesign report UI, report logic, or any reporting behavior.
- Update teacher answer detail API and teacher export to use `question_key` when available, falling back to positional index for legacy rows. The existing `mergeFrozenQuestionSources` in `frozen-activity-question.server.js` is the correct base for this.
- Update worksheet submit handler in `lib/worksheet-activities/worksheet-student.server.js` to write `question_snapshot` (copy of the `worksheet_questions` row at submit time) to `worksheet_student_answers`.
- Write tests from Section 8, items 7, 8.

**Phase 6 — Regression tests and final verification**
- Full regression run: all existing teacher portal, parent portal, and student activity tests.
- Verify the positive acceptance criterion: for every new assigned activity, all seven data points (question text, options, correct answer, student answer, correctness, order, `question_key`) are reconstructable from the DB without calling any question generator or bank.
- Verify the negative acceptance criterion: free-practice path (`POST /api/learning/answer` → `public.answers`) is completely untouched; no snapshot logic runs in that path.
- Verify isolation: teacher tables and parent tables contain no cross-account data.
- Performance check: no new N+1 queries introduced by snapshot reads.
- Owner sign-off before merge.

---

## Key files to change in Phases 2–5

- [`lib/classroom-activities/classroom-activities-shared.server.js`](lib/classroom-activities/classroom-activities-shared.server.js) — add `normalizeAndFreezeQuestionSet`
- [`lib/teacher-server/teacher-activities.server.js`](lib/teacher-server/teacher-activities.server.js) — classroom create + answer write
- [`lib/teacher-server/student-activity.server.js`](lib/teacher-server/student-activity.server.js) — individual create
- [`lib/teacher-server/student-activity-play.server.js`](lib/teacher-server/student-activity-play.server.js) — individual answer write
- [`lib/parent-server/parent-activity.server.js`](lib/parent-server/parent-activity.server.js) — parent create + answer write (separate from teacher)
- [`lib/classroom-activities/frozen-activity-question.server.js`](lib/classroom-activities/frozen-activity-question.server.js) — add `question_key` to `mapFrozenQuestionDetail` output (read path only)
- [`lib/worksheet-activities/worksheet-student.server.js`](lib/worksheet-activities/worksheet-student.server.js) — add `question_snapshot` write on submit
- New migration file (owner applies): columns per Section 7
