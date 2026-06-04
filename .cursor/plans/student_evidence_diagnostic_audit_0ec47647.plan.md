---
name: Student Evidence Diagnostic Audit
overview: |
  Full audit-only plan. No code changes. No migrations. No commits. Produce complete current-state evidence tables across activity modes, time architecture, reward truth, diagnostic engine inputs, report consumers, and question-to-engine compatibility. Only after the audit is approved does a separate fix plan begin.
todos:
  - id: audit-t1
    content: "Time architecture audit: trace raw→credited→persisted path per activity mode"
    status: completed
  - id: audit-t2
    content: "Assigned activity timing audit: confirm or deny fixed-5000ms timeSpentMs bug"
    status: completed
  - id: audit-t3
    content: "Activity evidence matrix: every mode → answers table, mode tag, eligibility flags"
    status: completed
  - id: audit-t4
    content: "MCQ/question-to-engine compatibility audit: distractors, metadata, misconception mapping"
    status: completed
  - id: audit-t5
    content: "Diagnostic engine inputs audit: what it sees, what it cannot distinguish"
    status: completed
  - id: audit-t6
    content: "Reward truth audit: DB coins vs localStorage monthly progress vs parent rewards page"
    status: completed
  - id: audit-t7
    content: "Parent/guardian report audit: data sources, mode mixing, accuracy contamination"
    status: completed
  - id: audit-t8
    content: "Teacher/classroom/school report audit: same diagnostic data? same contamination?"
    status: completed
  - id: audit-t9
    content: "Learning book tracking audit: what is tracked, what is missing"
    status: completed
  - id: audit-t10
    content: "Positive evidence audit: can the engine/report currently detect strengths?"
    status: completed
isProject: false
---

# Student Activity Evidence, Diagnostic Truth & Rewards
# Full Audit — No Implementation

**Status:** Audit and planning only.
No code. No migrations. No commits. No cap values finalized.

---

## Part 0 — Scope and Constraints

### Fixed product decisions that govern this audit

1. No visible timer in normal learning/practice. Challenge/speed keep their timers.
2. Raw elapsed time must always be preserved. Credited/capped time is computed separately. The engine still needs to know about unusually long question times.
3. There is no separate parent reward system. Parent reward choice (`LEO_REWARD_CHOICE`) must be deprecated/removed, not migrated. Only child coins and monthly progress remain.
4. Learning mode and step-by-step are not diagnostic success, but they are positive learning behavior: persistence, self-learning, review before practice, improvement after learning. They must appear in the report under a separate category, not in success rate.
5. Book reading is not diagnostic. Independent practice launched from a book CTA may be diagnostic with a `contextAfterBookReading = true` flag, not by default.
6. Cap policy (credited time) is not finalized here. It depends on question/activity type (normal, hard, geometry/diagram, reading comprehension, marathon, book, draft-paper). Caps are an output of this audit, not an input.
7. Teacher/classroom/school reports are in scope if they consume the same diagnostic data layer.

---

## Part 1 — Codebase Map (Evidence Anchors)

### Core data tables (Supabase)

| Table | Purpose | Key columns |
|---|---|---|
| `learning_sessions` | Session container for all free-practice/master modes | `id`, `student_id`, `subject`, `topic`, `started_at`, `ended_at`, `duration_seconds`, `status`, `metadata` |
| `answers` | Per-question answers for free-practice sessions | `id`, `student_id`, `learning_session_id`, `question_id`, `is_correct`, `answer_payload` (JSONB), `answered_at` |
| `student_activity_attempts` | Per-question answers for assigned/classroom activities | `id`, `activity_id`, `student_id`, `question_index`, `skill_key`, `selected_answer`, `correct_answer`, `is_correct`, `time_spent_ms`, `hints_used`, `explanation_viewed`, `question_snapshot`, `answered_at` |
| `student_activity_status` | Overall status per student per assigned activity | `activity_id`, `student_id`, `status`, `answers_count`, `correct_count`, `score_pct`, `started_at`, `submitted_at` |
| `parent_assigned_activities` | Parent-assigned activity definitions | `subject`, `topic`, `subtopic`, `mode`, `difficulty_level` |
| `parent_activity_attempts` | Per-question answers for parent-assigned activities | `student_id`, `activity_id`, `question_index`, `skill_key`, `is_correct`, `time_spent_ms`, `hints_used`, `question_snapshot`, `answered_at` |
| `coin_transactions` | DB-authoritative coin ledger | `student_id`, `direction`, `amount`, `source_type`, `idempotency_key` |
| `student_learning_state` | Daily missions, challenges, challenges.daily | `student_id`, `challenges` (JSONB) |

### Key server-side files

| File | Role |
|---|---|
| [`pages/api/learning/answer.js`](pages/api/learning/answer.js) | Writes `answers` rows for all free-practice |
| [`pages/api/learning/session/start.js`](pages/api/learning/session/start.js) | Creates `learning_sessions` row |
| [`pages/api/learning/session/finish.js`](pages/api/learning/session/finish.js) | Closes session; triggers coin award and mission update |
| [`pages/api/student/activities/[activityId]/answer.js`](pages/api/student/activities/[activityId]/answer.js) | Writes `student_activity_attempts` for individual assigned activities |
| [`lib/teacher-server/student-activity-play.server.js`](lib/teacher-server/student-activity-play.server.js) | Records individual activity answers, stores `time_spent_ms` from client |
| [`lib/parent-server/report-data-aggregate.server.js`](lib/parent-server/report-data-aggregate.server.js) | Core aggregation engine — sessions + answers + optionally parent_activity_attempts |
| [`lib/parent-server/parent-report-parent-facing.server.js`](lib/parent-server/parent-report-parent-facing.server.js) | Hebrew insights: `buildParentInsightsHe`, `buildHomeRecommendationsHe` |
| [`lib/guardian-server/guardian-report.server.js`](lib/guardian-server/guardian-report.server.js) | Guardian-facing report builder |
| [`lib/learning-supabase/learning-coin-award.server.js`](lib/learning-supabase/learning-coin-award.server.js) | Session coin awards |
| [`lib/learning-supabase/mission-progress.server.js`](lib/learning-supabase/mission-progress.server.js) | Daily mission progress |
| [`lib/learning-supabase/seed-db-report-local-storage.js`](lib/learning-supabase/seed-db-report-local-storage.js) | Seeds localStorage from DB for legacy rendering |
| [`lib/learning-supabase/parent-dashboard-report-bridge.js`](lib/learning-supabase/parent-dashboard-report-bridge.js) | Bridge: DB → temporary localStorage → `generateParentReportV2` |
| [`utils/progress-storage.js`](utils/progress-storage.js) | localStorage monthly progress / reward choice reads and writes |
| [`pages/parent/rewards.js`](pages/parent/rewards.js) | Parent rewards page — reads localStorage only |

### Mode allowlist (current)

From [`lib/learning-supabase/learning-activity.js`](lib/learning-supabase/learning-activity.js):
```
learning, practice, challenge, speed, marathon,
review, drill, graded, practice_mistakes, normal, mistakes
```

Missing from allowlist: `step_by_step`, `learning_book`, `learning_book_cta`, `parent_assigned`, `teacher_assigned`, `classroom_assigned`, `worksheet`

---

## Part 2 — Audit A: Time Architecture

### A1. What is currently tracked per path

| Path | Client raw time | Client sends to server | Server persists | Server validates? | Cap applied? |
|---|---|---|---|---|---|
| Free-practice session total | Client measures elapsed from start to finish | `durationSeconds` in `session/finish` body | `learning_sessions.duration_seconds` verbatim | **NO** | **NO** |
| Free-practice per-question | Client measures per question | `timeSpentMs` in `answer` body | `answers.answer_payload.timeSpentMs` verbatim | **NO** | **NO** — server normalizes max to 36,000,000ms (10 hours) |
| Individual assigned activity per-question | Client measures per question | `timeSpentMs` in student/activities/answer body | `student_activity_attempts.time_spent_ms` verbatim | **NO** | **NO** |
| Classroom activity per-question | same | same | same | **NO** | **NO** |
| Parent-assigned activity per-question | Client measures | `time_spent_ms` in attempt row | `parent_activity_attempts.time_spent_ms` | **NO** | **NO** |
| Learning book page dwell | **NOT TRACKED** | — | — | — | — |
| Challenge timer | Client (visible countdown) | sent as part of session duration | same session finish path | **NO** | **NO** |
| Speed timer | same | same | same | **NO** | **NO** |
| Marathon | same | same | same | **NO** | **NO** |
| localStorage session minutes | Client computes raw minutes | written to `LEO_PROGRESS_LOG` | localStorage only | **NO** | **NO** |

### A2. Known gaps in time architecture

1. **No server-side elapsed time calculation.** The server never computes start→end time from its own timestamps. It accepts the client claim verbatim.
2. **No tab-hidden exclusion.** If the browser tab is hidden (Page Visibility API), the client currently has no documented obligation to pause timing. Whether individual learning components do this must be verified in the client-side activity hooks.
3. **No idle detection.** If a student leaves a question open for 30 minutes, the raw `timeSpentMs` will be 30 minutes. The diagnostic engine would then see a "very slow" answer — which is misleading.
4. **No floor validation.** There is no check that `timeSpentMs >= 0` on the meaningful side — a client could send 0 for all questions and the engine sees "zero time" everywhere.
5. **`durationSeconds` vs. `timeSpentMs` sum discrepancy is not checked.** A session can report `durationSeconds = 300` (5 min total) but individual answers sum to `timeSpentMs = 1000000` (16 min total). These are not reconciled.
6. **Draft-paper/offline work time is not captured.** If a student does a geometry proof on paper and then enters the answer, the answer time is effectively the typing time, not the thinking time.
7. **Assigned activity timing — potential 5000ms fake data (UNCONFIRMED).** The concern is that some component may call the answer API with a hardcoded `timeSpentMs: 5000` instead of measuring real elapsed time. This must be confirmed by reading the client components.

### A3. Credit policy does not yet exist

There is currently no `creditedSeconds` or `creditedTimeMs` field anywhere in the system. All downstream calculations (coins, missions, parent report duration, diagnostic time metrics) use raw client-reported values. A credit policy must be designed per activity type — this audit must gather the input needed to define it:

- What is a realistic maximum time for a normal arithmetic question?
- What is a realistic maximum time for a geometry diagram question (student may be drawing)?
- What is a realistic maximum time for a Hebrew reading comprehension question?
- What is a realistic maximum time for a marathon session overall?
- What is a realistic maximum time for a parent-assigned activity?

These questions are unanswered and must be answered before any cap is proposed.

---

## Part 3 — Audit B: Activity Evidence Matrix

### B1. Per-mode evidence table

| activityMode | Route/API | Saves answer? | Table | Mode tag stored? | How? | `timeSpentMs` stored? | `hintsUsed` stored? | `explanationViewed` stored? | `selectedAnswer` stored? | `correctAnswer` stored? | `allChoices` stored? | Coin eligible? | Mission eligible? | Parent report visible? | Guardian report visible? | Teacher report visible? | Diagnostic engine input? | successRateEligible (should be)? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `learning` | `api/learning/answer` | YES | `answers` | YES | `answer_payload.gameMode` | YES (raw, uncapped) | YES | **NO** | as `userAnswer` | as `expectedAnswer` | **NO** | YES | YES | YES | YES | YES | YES — **NOT FILTERED** | **NO** | RISK: contaminating success rate |
| `practice` | same | YES | same | YES | same | YES | YES | **NO** | same | same | **NO** | YES | YES | YES | YES | YES | YES — **NOT FILTERED** | YES | |
| `challenge` | same | YES | same | YES | same | YES | YES | **NO** | same | same | **NO** | YES | YES | YES | YES | YES | YES — NOT FILTERED | YES (with challenge context) | mode not surfaced distinctly in report |
| `speed` | same | YES | same | YES | same | YES | YES | **NO** | same | same | **NO** | YES | YES | YES | YES | YES | YES — NOT FILTERED | YES (fluency context) | |
| `marathon` | same | YES | same | YES | same | YES | YES | **NO** | same | same | **NO** | YES | YES | YES | YES | YES | YES — NOT FILTERED | YES (endurance context) | |
| `step_by_step` | same | YES (if session active) | same | **NO** — not in mode allowlist | falls back to session mode | YES | YES | **NO** | same | same | **NO** | YES | YES | YES | YES | YES | YES — **NOT FILTERED** | **NO** | CRITICAL: step-by-step not distinguishable |
| `learning_book` (reading) | **none** | **NO** | — | — | — | — | — | — | — | — | — | **NO** | **NO** | **NO** | **NO** | **NO** | **NO** | **NO** | CRITICAL GAP: no tracking |
| `learning_book_cta` | `api/learning/answer` | YES | `answers` | **NO** — not in allowlist | falls back to "learning" | YES | YES | **NO** | same | same | **NO** | YES | YES | YES | YES | YES | YES — NOT FILTERED | Conditional: YES with `contextAfterBookReading=true` | Not distinguishable from free learning today |
| `parent_assigned` | `api/student/activities/answer` or `parent_activity_attempts` | YES | `student_activity_attempts` or `parent_activity_attempts` | YES | from activity row `mode` | YES (raw, uncapped) | YES | YES (on `student_activity_attempts`) | YES | YES | **NO** | **NO** | **NO** | **conditional** (only if `includeParentActivities: true` in aggregation, which is currently OFF for guardian path) | **NOT INCLUDED** by default | dependent | **NO** by default | CRITICAL: invisible in guardian report |
| `teacher_assigned` / `classroom_assigned` | same | YES | `student_activity_attempts` | YES | from classroom activity row | YES | YES | YES | YES | YES | **NO** | **NO** | **NO** | teacher report only | **NOT INCLUDED** in guardian report | YES (teacher report) | **NO** in diagnostic engine | YES | completely separate path |
| `worksheet` | worksheet answer APIs | YES | worksheet-specific tables | N/A | N/A | unclear | unclear | unclear | YES (teacher grades) | YES (correct answer) | unclear | **NO** | **NO** | teacher report only | **NO** | YES (teacher report) | **NO** | **NO** | entirely separate path |
| `arcade` / board games | arcade answer APIs | board moves only, no subject questions | arcade tables | N/A | — | — | — | — | — | — | — | YES (arcade coins) | **NO** | **NO** | **NO** | **NO** | **NO** | **NO** | no subject questions in standard arcade |

### B2. Fields missing from `answers` table

The following fields exist on `student_activity_attempts` but NOT on `answers`:
- `selected_answer` as its own column (stored inside `answer_payload.userAnswer` only)
- `correct_answer` as its own column (stored inside `answer_payload.expectedAnswer` only)
- `explanation_viewed` boolean
- `activity_mode` as its own indexed column (stored inside `answer_payload.gameMode` only — not indexable without casting)
- `evidence_type` classification
- `context_after_book_reading` boolean
- `all_answer_choices` array

The following fields are missing from BOTH tables:
- Distractor-to-misconception mapping (no `wrongAnswerMeaning` or `misconceptionTag`)
- Generator kind / question source (only `question_id` fingerprint, not generator metadata)
- Whether question is diagnostic-eligible by content design

---

## Part 4 — Audit C: Assigned Activity Timing

### C1. UNCONFIRMED — requires client component inspection

The concern is that some student-facing activity component may send a hardcoded or minimal `timeSpentMs` (e.g. 5000ms = 5 seconds) instead of real elapsed time. This must be verified by reading:

- `components/classroom-activities/student-activity-question-ui.client.js`
- `components/classroom-activities/student-activity-layout.client.js`
- Any hook or helper in `components/classroom-activities/` that calls the answer API

**What to verify:**
1. Is there a `questionStartTime` recorded when each question is displayed?
2. Is `Date.now() - questionStartTime` passed as `timeSpentMs` when the answer is submitted?
3. Is there any default/fallback value like `timeSpentMs: 5000` or `timeSpentMs: null`?
4. For parent-assigned activities specifically, what does the component send?

**If fixed-5000ms is confirmed:** This is fake data and must be classified as a top blocker — not Phase 9. Every time metric in reports for assigned activities would be meaningless (5 seconds per question regardless of actual effort). This would also make "slow answer" detection useless for assigned activities.

### C2. Assigned activity time path (server side — confirmed)

Server in `student-activity-play.server.js`:
```js
time_spent_ms: input.timeSpentMs ?? null,
```
No floor, no cap, no server-side measurement. Whatever the client sends (or `null`) is stored verbatim.

---

## Part 5 — Audit D: MCQ / Question-to-Engine Compatibility

This audit runs in parallel with the activity/time audit.

### D1. Required metadata per question (current state vs needed)

| Metadata field | Present in `answers.answer_payload`? | Present in `student_activity_attempts.question_snapshot`? | Required for diagnosis? |
|---|---|---|---|
| `questionId` / fingerprint | YES | YES (`question_key`) | YES |
| `subject` | YES | via activity row | YES |
| `topic` | YES | via activity row | YES |
| `subtopic` / `skill_key` | only in some generators via `clientMeta` | YES (`skill_key` column) | YES |
| `generatorKind` / question source | **NO** | **NO** | YES |
| `difficulty` / level | in session metadata only | `difficulty_level` via activity row | YES |
| `questionType` (MCQ, open, numeric) | **NO** | inferred from `question_snapshot` | YES |
| `allAnswerChoices` (MCQ options) | **NO** | in `question_snapshot` if present | YES for MCQ diagnosis |
| `correctAnswer` | as `expectedAnswer` text | as `correct_answer` column | YES |
| `selectedAnswer` | as `userAnswer` text | as `selected_answer` column | YES |
| `distractor rationale` / `misconceptionTag` per wrong choice | **NO** | **NO** | CRITICAL for diagnosis |
| `diagnostic taxonomy mapping` | **NO** | **NO** | YES |
| `isLearningExposed` (was answer shown before this attempt) | **NO** | `explanation_viewed` (partial) | YES |
| `isStepByStep` context | **NO** | **NO** | YES |
| `contextAfterBookReading` | **NO** | **NO** | YES |
| `isTimed` (speed/challenge pressure) | only via mode tag | only via activity mode | YES |

### D2. MCQ distractor quality audit (must be performed per subject/grade/generator)

The following questions must be answered for each question source:

1. Are answer choices distinct and unambiguous?
2. Is there exactly one correct answer?
3. Are distractors plausible (not obviously wrong)?
4. Does each wrong answer correspond to a specific, nameable misconception?
5. Can the engine, upon receiving `selectedAnswer = wrongChoice[i]`, infer a specific error pattern?
6. Is the correct answer leaked in the question stem or explanation shown before answering?
7. Are numeric choices formatted consistently (avoiding formatting clues)?
8. Are Hebrew RTL and LTR content stable (no rendering artifacts in choice display)?
9. Does choice ordering bias the answer (first/last bias)?
10. Are there duplicate or equivalent choices?
11. Is "all of the above" or open-ended phrasing present in ways that break diagnosis?

**Question sources to audit:**

| Source | Subject | Grade | Format | Distractor mapping present? | Audit status |
|---|---|---|---|---|---|
| Math generators (free practice) | math | g1–g6 | numeric, MCQ | UNKNOWN — must inspect | PENDING |
| Geometry generators | geometry | g1–g6 | MCQ, diagram | UNKNOWN | PENDING |
| Hebrew practice generators | hebrew | g1–g6 | MCQ, text-match | UNKNOWN | PENDING |
| English practice pools | english | g1–g6 | MCQ | UNKNOWN | PENDING |
| Science pools | science | g1–g6 | MCQ | UNKNOWN | PENDING |
| Moledet/geography pools | moledet_geography | g5–g6 | MCQ | UNKNOWN | PENDING |
| Assigned activity question banks | all subjects | varies | MCQ | UNKNOWN | PENDING |
| Learning book CTA questions | all subjects | varies | MCQ, open | UNKNOWN | PENDING |
| Classroom activity generators | all subjects | varies | MCQ | UNKNOWN | PENDING |
| Worksheet questions | all subjects | varies | MCQ, open | UNKNOWN | PENDING |

### D3. Learning vs diagnostic question reuse

Current state: The same question generators appear to be used for both learning mode (where the student can see step-by-step explanation) and practice/diagnostic mode. This creates a contamination risk — a student who answered in learning mode and saw the explanation, then encounters the same question in practice mode, would appear to have mastered the skill when they may simply have memorized the answer from the explanation.

**Must confirm:**
- Does the system generate new question instances per session (randomized parameters)?
- Does the system reuse frozen question IDs across modes for the same student?
- Is there a "recently-seen question" exclusion for diagnostic sessions?

---

## Part 6 — Audit E: Rewards Truth

### E1. Two separate reward systems — confirmed

**System 1: DB Coins (new)**

| Property | Current State |
|---|---|
| Source of truth | `coin_transactions` table (Supabase) |
| Session coins | 10 base + 0–10 accuracy bonus per completed session, 300/day cap |
| Mission coins | 20 per completed daily mission |
| Monthly persistence rewards | separate `monthly-persistence-reward.server.js` |
| Feature flag | `ENABLE_SESSION_COIN_AWARDS=true` — if absent/false, no coins awarded |
| Mode differentiation | **NONE** — same formula for learning, challenge, speed, marathon |
| Activity type differentiation | **NONE** — assigned activities do not award session coins at all (they don't go through `session/finish`) |
| Time used for coin formula | raw client-reported `durationSeconds` — no cap, no credit policy |
| Accuracy used for coin formula | summary-level `accuracy` from session finish body — client-reported |

**System 2: localStorage Monthly Progress (old)**

| Property | Current State |
|---|---|
| Source of truth | `localStorage` keys `LEO_MONTHLY_PROGRESS`, `LEO_PROGRESS_LOG` |
| Authority | Fully client-side — any JavaScript can write to it |
| Written by | `addSessionProgress()` in `utils/progress-storage.js` |
| Namespacing | Per-student if `studentId` provided; global `LEO_*` keys if not |
| Used by | `pages/parent/rewards.js` — the parent rewards page |
| Synced to DB | **NEVER** |
| Survives browser clear | **NO** |
| Multi-device | **NO** |
| Reward choice | `LEO_REWARD_CHOICE` in localStorage — no DB record exists |

### E2. Parent rewards page — confirmed localStorage-only

`pages/parent/rewards.js`:
- `useEffect` calls `loadMonthlyProgress()` which reads `localStorage`
- Calls `loadProgressLog()` which reads `localStorage`
- Calls `loadRewardChoice()` which reads `localStorage`
- `handleSave()` calls `saveRewardChoice()` which writes to `localStorage` only
- **No API calls to DB whatsoever**

**Consequence:** A parent viewing the rewards page from a different device, after a browser clear, or after a reinstall sees zero progress even if the child has done substantial work.

### E3. Product decision confirmation

Per corrected product decision: **there is no separate parent reward system.** `LEO_REWARD_CHOICE`, the reward selection UI, and the "persistence reward" framing must be deprecated/removed. Only child coins and monthly progress remain. This means:

- `pages/parent/rewards.js` must be deprecated (route removed or converted to read-only coin/progress display)
- `saveRewardChoice()` and `loadRewardChoice()` must be deprecated
- `LEO_REWARD_CHOICE` localStorage key must be deprecated
- The `REWARD_OPTIONS` data file is no longer needed
- Monthly progress and minutes should still be visible to parents but sourced from DB, not localStorage

### E4. Coin formula risks

- Formula does not distinguish mode: a marathon session with 100 easy questions earns the same as a hard challenge session with 5 difficult questions
- Formula does not distinguish grade: grade-1 arithmetic and grade-6 algebra sessions earn the same
- Formula uses client-reported accuracy — a student who sends `accuracy: 100` earns maximum coins with no server verification
- Assigned activities (which may represent stronger diagnostic evidence) earn ZERO coins

---

## Part 7 — Audit F: Diagnostic Engine Inputs

### F1. What the engine actually receives

The aggregation in `report-data-aggregate.server.js` → `aggregateReportPayloadFromActivityRows()` processes:

**From `learning_sessions`:**
- `subject`, `topic`, `duration_seconds`, `status`, `metadata.mode`, `metadata.level`
- Session timestamps for activity tracking

**From `answers`:**
- `is_correct`, `answer_payload.subject`, `answer_payload.topic`
- `answer_payload.gameMode` (mode from session metadata, propagated to answer)
- `answer_payload.hintsUsed`, `answer_payload.timeSpentMs`
- `answer_payload.clientMeta.diagnosticProbe` (if client sent it — opt-in)
- `answer_payload.clientMeta.gameMode` or `clientMeta.mode`

**From `parent_activity_attempts` (only if `includeParentActivities: true`):**
- `is_correct`, `time_spent_ms`, `hints_used`, `answered_at`
- Subject/topic from joined `parent_assigned_activities`
- Mode from `parent_assigned_activities.mode`

### F2. What the engine cannot currently distinguish

| Distinction | Can engine distinguish? | Why not? |
|---|---|---|
| Answered after viewing step-by-step explanation | **NO** | `explanation_viewed` field not in `answers` table; no flag in answer payload |
| Answered in learning mode (saw answer context) vs independently | **PARTIAL** — `gameMode = "learning"` present | But engine does not filter it — learning mode counts in accuracy |
| Answered after book reading | **NO** | No `contextAfterBookReading` flag anywhere |
| Answered in challenge vs speed vs marathon | YES — via mode tag | But these are not interpreted differently in accuracy calculation |
| Answered with many hints vs without hints | **PARTIAL** — `hintsUsed` count present | But "was explanation shown" is separate from "hints used" |
| Answered correctly but very slowly | **PARTIAL** — `timeSpentMs` present | But raw uncapped — "slow" may mean tab was left open, not genuine difficulty |
| Abandoned/idle (left without answering) | **NO** | No abandonment or idle event |
| Assigned activity answer vs free-practice answer | **NO** — different table | Default aggregation excludes `student_activity_attempts` entirely |
| Question with diagnostic skill mapping vs generic question | **PARTIAL** — only if `clientMeta.diagnosticProbe` sent | Most answers likely have no probe data |
| Which specific wrong answer was selected (for misconception inference) | **PARTIAL** — `userAnswer` text stored | But no misconception mapping to interpret the wrong answer |
| Answer to a question where correct answer was leaked in explanation before | **NO** | No leakage flag |

### F3. Diagnostic probe architecture

The existing diagnostic probe system requires the client to send:
```json
{
  "clientMeta": {
    "diagnosticProbe": {
      "isDiagnosticProbeAttempt": true,
      "probeId": "...",
      "subjectId": "...",
      "topicId": "...",
      "diagnosticSkillId": "...",
      "outcomeStatus": "supported|weakened|uncertain",
      "expectedErrorTags": [...],
      "inferredTags": [...]
    }
  }
}
```

This is entirely client-driven and opt-in. If the client does not send this structure, the answer contributes to raw accuracy stats but leaves no diagnostic skill trace in `probeEvidence`. The question sources (generators, banks) must be audited to confirm whether and when they send this data.

---

## Part 8 — Audit G: Parent/Guardian Report

### G1. Report generation chain

```
DB query (learning_sessions + answers + optionally parent_activity_attempts)
  ↓ aggregateReportPayloadFromActivityRows()
  ↓ attachStudentLearningAccountToParentReportPayload()
  ↓ sanitizeReportPayloadForGuardian()  [strips coins/gamification keys]
  ↓ enrichPayloadWithParentFacing()
      ↓ buildParentInsightsHe()
      ↓ buildHomeRecommendationsHe()
  ↓ [client side] runParentReportGenerationFromApiBody()
      ↓ buildReportInputFromDbData()
      ↓ seedLocalStorageFromDbReportInput()  [temporary localStorage seed]
      ↓ generateParentReportV2()  [legacy function, reads localStorage]
      ↓ buildDetailedParentReportFromBaseReport()
```

The parent report still depends on `generateParentReportV2()` and `buildDetailedParentReportFromBaseReport()` which were originally written to read from localStorage. They are currently being fed by temporarily seeding localStorage from DB data. This is fragile — any race condition, navigation, or concurrent tab could corrupt the seed.

### G2. What the report currently shows vs what it should show

| Report section | Currently shown | Should show | Gap |
|---|---|---|---|
| Overall accuracy | ALL answers (learning + practice + challenge + speed + marathon) combined | Separate: diagnostic accuracy (independent) vs learning activity | CRITICAL: learning inflates accuracy |
| Per-topic accuracy | Same — all modes combined | Same separation | CRITICAL |
| Step-by-step answers | Included in accuracy | Shown as "review/learning behavior" — not in accuracy | CRITICAL |
| Learning book reading | Not shown at all | Shown as "reading and self-study time" | MISSING |
| Book CTA practice | Shown as "learning" mode answers in accuracy | Shown with `contextAfterBookReading` flag if independently answered | GAP |
| Marathon performance | Included in accuracy with no context | Shown as endurance/consistency evidence | GAP |
| Challenge performance | Included in accuracy with no context | Shown with challenge difficulty context | GAP |
| Speed performance | Included in accuracy | Shown as fluency evidence | GAP |
| Strengths / stable mastery | **NOT SHOWN** | Topics with ≥80% accuracy and sufficient data | MISSING |
| Improvement over time | YES — `detectImprovement()` present | Present — but only binary (yes/no), not per-topic | PARTIAL |
| Persistence despite difficulty | **NOT SHOWN** | Shown when student keeps trying a hard topic | MISSING |
| Assigned activity answers | **NOT INCLUDED** in guardian report path | Should be included with `activityType = "assigned"` label | CRITICAL |
| Insufficient data warning | **NOT SHOWN** | When fewer than N answers in a topic, show "not enough data" | MISSING |
| Mode breakdown | In raw data (`modeCounts`) but not surfaced to parent | Parent-facing mode split: how much was challenge vs learning vs practice | GAP |
| Diagnostic insights | Only if `clientMeta.diagnosticProbe` sent by client | Should work even without explicit probe data | PARTIAL |

### G3. localStorage dependency risks in report

- `generateParentReportV2` reads `mleo_time_tracking`, `mleo_math_master_progress`, etc. from `localStorage`
- These are seeded from DB in `seedLocalStorageFromDbReportInput()` before the function runs
- After the function runs, the old values are restored (`restoreMleoReportKeys`)
- Risk: if `generateParentReportV2` or `buildDetailedParentReportFromBaseReport` has async operations, the restore may run before the function completes
- Risk: two simultaneous report renders (e.g. two parent browser tabs) would stomp each other's localStorage seeds
- Risk: if the seed fails silently, `generateParentReportV2` reads stale/wrong data and produces a misleading report

### G4. What accuracy the parent sees today

The "accuracy" shown to a parent today is computed from ALL answers, regardless of:
- Whether the student was in learning mode (saw explanation during the session)
- Whether the student used step-by-step (viewed the solution before answering)
- Whether the student used hints
- Whether the question is the same one they practiced in learning mode earlier

A student who spends all their time in learning mode (doing many questions with explanations shown) will appear to have high accuracy. This is not a truthful diagnostic signal — it is a guided-practice signal.

---

## Part 9 — Audit H: Teacher, Classroom, and School Reports

### H1. Teacher report data path

Teacher reports use the same `aggregateParentReportPayload()` function (via `aggregateReportPayloadFromActivityRows()`) plus a class-level roster aggregation. If the per-student data is contaminated (learning mode in accuracy), the teacher report is equally contaminated.

Key files:
- `lib/teacher-server/teacher-report.server.js`
- `lib/teacher-server/classroom-activity-class-report.server.js`
- `lib/teacher-server/roster-report-student-entries.server.js`
- `pages/teacher/class/[classId]/activities/[activityId]/report.js`
- `pages/teacher/student/[studentId]/parent-report.js`

**Must confirm:**
1. Does `teacher-report.server.js` call the same aggregation function as the parent report?
2. Does the classroom activity report use `student_activity_attempts` data (which the parent report excludes)?
3. Does the teacher-facing student report at `/teacher/student/[studentId]/parent-report` include assigned activity data?
4. Does the teacher see `modeCounts` data that the parent cannot see?
5. Do teacher reports include any diagnostic eligibility filtering?

### H2. School/portal report path

- `lib/school-server/school-physical-class-report.server.js`
- `lib/school-server/school-reports.server.js`
- These produce class-level and school-level aggregations

**Must confirm:**
1. Do school reports aggregate from the same `learning_sessions` + `answers` tables?
2. Are school reports subject to the same mode-contamination issues?
3. Do school managers see per-student diagnostic data or only aggregate counts?

### H3. Worksheet report path

- `lib/teacher-server/worksheet-report.server.js`
- `pages/teacher/worksheets/[worksheetId]/report.js`

Worksheets have their own answer path. It must be confirmed whether worksheet answers feed the main diagnostic engine or are entirely separate.

### H4. Report consumer matrix

| Report | Primary data source | Includes assigned activity answers? | Mode filtering? | Diagnostic eligibility filter? | Known contamination? |
|---|---|---|---|---|---|
| Guardian/parent report | `learning_sessions` + `answers` (assigned excluded by default) | **NO** | **NO** | **NO** | YES — learning mode in accuracy |
| Teacher student report | same as parent report (likely) | TBD | **NO** (likely) | **NO** | TBD |
| Classroom activity report | `student_activity_attempts` + `student_activity_status` | YES (it's the source) | N/A | **NO** | TBD |
| Worksheet report | worksheet-specific tables | N/A | N/A | **NO** | TBD |
| School roster report | aggregated from per-student data | TBD | TBD | **NO** | TBD |

---

## Part 10 — Audit I: Learning Books

### I1. Current book tracking state

Book reading (`pages/learning/book/[subject]/[grade]/[pageId].js`) is a content-display page. Based on the codebase:

- No `learning_sessions` row is created when a student opens a book
- No page-dwell timer is tracked server-side
- No event is fired when a student navigates between pages
- The book registries (`lib/learning-book/math-g1-registry.js` etc.) are pure content indexes — no tracking hooks
- Book content renders markdown pages with no analytics calls

**Consequence:** Book reading is entirely invisible to:
- The diagnostic engine
- The parent report
- The teacher report
- The coin/mission system
- Monthly progress

### I2. What should be tracked (design, not implementation)

The following would be needed to make book reading visible:
- A `learning_book` session type when a student opens a book chapter
- Page-dwell tracking (start time on page, navigate away or close)
- Tab-hidden exclusion (Page Visibility API) so idle time is not credited
- Fast page-flip detection (student skipping pages in <2 seconds each would not count as reading)
- A connection between book reading and subsequent practice (session started within N minutes after book close = `contextAfterBookReading`)
- Book reading must NOT contribute to diagnostic success rate (covered by evidence type classification)
- Book reading SHOULD contribute to: learning time, persistence, parent report "self-study" section

---

## Part 11 — Audit J: Positive Evidence

### J1. What the current engine/report detects for positive outcomes

From `parent-report-parent-facing.server.js`:

| Signal | Currently detected? | How? | Limitations |
|---|---|---|---|
| Subject with highest accuracy | YES | `rankSubjectsByAccuracy()` — picks highest from `subjectRows` | Only surfaces in insights if accuracy ≥ STRONG_ACCURACY (80%) |
| Improvement over time | YES | `detectImprovement()` — splits daily activity in half, checks if second half accuracy is ≥8 points higher | Only binary; requires ≥4 daily activity records |
| Recent inactivity | YES | `daysSince(lastDate) >= INACTIVITY_DAYS (7)` | |
| Weak subject | YES | identifies lowest-accuracy subject | |
| Weak topic | YES | identifies lowest-accuracy topic | |
| Repeating mistakes | YES | `topMistakeSubjects()` | |
| Stable mastery (topic consistently correct over time) | **NO** | — | — |
| Persistence (student keeps trying despite mistakes) | **NO** | — | — |
| Success after prior learning/review | **NO** | — | — |
| Good challenge performance | **NO** | — | — |
| Good speed/fluency performance | **NO** | — | — |
| Marathon endurance | **NO** | — | — |
| Broad subject coverage | **NO** | — | — |
| "Not enough data" honest signal | **NO** — if data is thin, no warning is shown | — | Misleading: thin data silence ≠ "doing fine" |

### J2. Classification of learning/step-by-step for positive evidence

Per corrected product decision:

- Learning mode and step-by-step are NOT diagnostic success
- But they ARE positive learning behaviors:
  - Persistence (choosing to study, even in guided mode)
  - Self-directed review (returning to learning mode for a topic the student found hard)
  - Improvement pattern: student was in learning mode, then switched to practice and improved
  - Volume of guided engagement (many hints used = engaged, not disengaged)
- The report must show learning mode activity separately from diagnostic accuracy
- A student who spends all time in learning mode should not appear to have high diagnostic mastery, but SHOULD appear as "actively engaged in guided learning"

### J3. Classification of book reading for positive evidence

Per corrected product decision:

- Book reading is NOT diagnostic
- But it IS positive:
  - Self-study / reading engagement
  - Learning before practice (if book reading preceded a practice session)
  - Breadth of engagement
- Practice launched from a book CTA with `contextAfterBookReading = true`:
  - May be diagnostic if the practice was independent (no hints, no explanations opened)
  - Should be shown in report as "practice after reading"

---

## Part 12 — Summary of Open Questions (Audit Blockers)

The following must be answered before a fix plan is written:

1. **Fixed-5000ms bug (CRITICAL).** Do any assigned activity client components send hardcoded `timeSpentMs: 5000` or similar? Must read: `components/classroom-activities/student-activity-question-ui.client.js`, `student-activity-layout.client.js`.

2. **Tab-hidden exclusion in client.** Do any learning master components use the Page Visibility API to pause timing? Must read the timing hooks in each master component.

3. **Diagnostic probe coverage.** What percentage of current answers in the DB have `clientMeta.diagnosticProbe` populated? Can this be estimated from recent answer counts vs probe evidence counts?

4. **Learning mode frequency.** What is the distribution of `answer_payload.gameMode` in the `answers` table? How many answers are `"learning"` vs `"practice"` vs `"challenge"` etc.?

5. **Question ID stability.** Are `question_id` / `questionFingerprint` values stable across sessions (same question = same fingerprint), or regenerated each time? If regenerated, the engine cannot track a student's history on a specific question.

6. **Distractor mapping.** Do any current question generators include misconception/distractor metadata? Or are all distractors random?

7. **`generateParentReportV2` async risk.** Is `generateParentReportV2` or `buildDetailedParentReportFromBaseReport` synchronous? If asynchronous, the localStorage backup/restore in `runParentReportGenerationFromApiBody` has a race condition.

8. **Teacher report data source.** Does `/teacher/student/[studentId]/parent-report.js` use the same aggregation as the guardian report, or a different one?

9. **Coin award feature flag.** Is `ENABLE_SESSION_COIN_AWARDS=true` active in production? If not, no coins are being awarded at all from learning sessions — the coin system exists but may be dormant.

10. **Credit policy design inputs.** Before proposing time caps per activity type, the following must be collected from domain knowledge: typical completion times for each question type by grade level, expected maximum time for draft-paper geometry work, expected time for reading comprehension questions.

---

## Part 13 — Next Steps (After Audit Approval)

Once this audit is approved and all open questions in Part 12 are answered, a separate fix plan will be produced covering:

1. Server-side credited time computation (preserving raw, adding credited field)
2. Deprecation of `LEO_REWARD_CHOICE` and parent rewards page conversion
3. Addition of `activity_mode`, `evidence_type`, `explanation_viewed` to `answers` schema
4. Exclusion of `learning` and `step_by_step` from `diagnosticAccuracy` metric
5. Inclusion of assigned activity answers in guardian report
6. Learning book session tracking
7. `contextAfterBookReading` flag on answers from book CTAs
8. Mode-contextual interpretation in parent report (marathon/challenge/speed shown distinctly)
9. Positive evidence detection additions
10. MCQ distractor-to-misconception mapping design
11. All report consumers updated in sync

**No fix plan is written until this audit document is fully complete and approved.**
