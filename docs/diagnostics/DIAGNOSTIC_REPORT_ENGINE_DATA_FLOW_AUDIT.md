# Diagnostic Report Engine — Data Flow Audit

**File:** `docs/diagnostics/DIAGNOSTIC_REPORT_ENGINE_DATA_FLOW_AUDIT.md`
**Date:** 2026-05-28
**Status:** Audit only. No code or product changes were made.
**Author:** Investigation performed via static codebase analysis.

---

## Explicit No-Change Declaration

> **No code, migration, schema, UI, Hebrew text, or product configuration was changed during this audit.**
> The sole output of this investigation is this document.

---

## 1. Executive Summary

The system contains a **structurally correct but architecturally asymmetric** data pipeline. The core issue is that the **parent-facing report and the teacher/class-facing reports read fundamentally different data sources** to compute the same activity counters and labels. A student who has completed 20 classroom activity assignments (homework, quiz, guided practice, live lesson) and answered 200 questions through those activities will **show as zero sessions / zero answers in the parent report** and will correctly receive `"פעילות נמוכה"` (low activity) — but not because the student is inactive. Rather, the parent report never reads classroom activity data at all.

Additionally, a second structural issue produces a **false "low activity" label from insufficient-data fallback**: if a student has between 1 and 2 answers in the learning sessions pipeline during the date window, `deriveStudentStatusBadgeFromSummary` returns `filterKey: "low_activity"` with badge `"אין מספיק נתונים"` — visually indistinguishable in dashboard filter chips from a genuinely inactive student.

A third issue exists in **date-range sensitivity**: the default report window is 30 days. Simulation data written more than 30 days ago is silently excluded. A student who had 200 answers three months ago looks like a new user with zero activity in the current window.

Three additional minor issues compound the above:
- Sessions whose `subject` field is not in `REPORT_AGG_SUBJECTS` are excluded from `totalSessions` without any warning.
- `mergeClassroomActivityRollupIntoReportPayload` has an early-exit guard `if (!rollup.answers) return` — so a student who started but did not complete any classroom activity still gets zero credit.
- `discussion` activity mode is correctly excluded from diagnostic rollups everywhere, but its absence may cause a class with many discussion sessions to look like a low-activity class if that is its dominant mode.

**No single root cause completely explains all cases.** The likely top candidate for the product concern described (student with ~20 sessions / ~200 answers showing low-activity label) is **Root Cause B: the data exists in `classroom_activity_student_status` but the parent report API does not read it**.

---

## 2. Current Data-Flow Map

```
User Action
    │
    ├── Student completes independent learning session
    │       │
    │       ├── POST /api/learning/session/start    → learning_sessions (INSERT)
    │       ├── POST /api/learning/answer            → answers (INSERT)
    │       └── POST /api/learning/session/finish    → learning_sessions (UPDATE)
    │
    └── Student completes teacher-assigned classroom activity
            │
            ├── Student opens activity               → classroom_activity_student_status (INSERT, status=in_progress)
            ├── Student submits answer               → classroom_activity_attempts (INSERT)
            │                                          classroom_activity_student_status.answers_count (INCREMENT)
            └── Student submits/finishes             → classroom_activity_student_status (UPDATE, status=submitted)


Report Consumers
    │
    ├── Parent Report API
    │   pages/api/parent/students/[studentId]/report-data.js
    │       │
    │       ├── reads: learning_sessions (via aggregateParentReportPayload)
    │       ├── reads: answers           (via aggregateParentReportPayload)
    │       └── ✗ DOES NOT read: classroom_activity_student_status
    │                             classroom_activities
    │                             classroom_activity_attempts
    │                             student_activities
    │
    ├── Teacher Student Report API
    │   pages/api/teacher/students/[studentId]/report-data.js
    │       │
    │       ├── reads: learning_sessions (via aggregateParentReportPayload)
    │       ├── reads: answers           (via aggregateParentReportPayload)
    │       └── reads: classroom_activity_student_status  (via loadClassroomActivityRollupForStudentReport)
    │                  classroom_activities                (merged via mergeClassroomActivityRollupIntoReportPayload)
    │
    ├── Teacher Class Report API
    │   pages/api/teacher/classes/[classId]/report-data.js
    │       │
    │       ├── reads: learning_sessions (via batchAggregateParentReportPayloadsForRoster)
    │       ├── reads: answers           (via batchAggregateParentReportPayloadsForRoster)
    │       └── reads: classroom_activity_student_status  (via loadClassroomActivityRollupsForClassReport)
    │                  classroom_activities                (merged per student)
    │
    └── School Physical Class Report API
        pages/api/school/classes/physical-report.js
            ├── reads: learning_sessions (batch)
            ├── reads: answers           (batch)
            └── reads: classroom_activity_student_status (via loadClassroomActivityRollupsForMultipleClassReports)
                       classroom_activities
```

**Critical asymmetry:** The parent report is the only consumer that never merges classroom activity data.

---

## 3. Per-Table / Per-Source Map

### 3.1 `learning_sessions`

| Attribute | Value |
|-----------|-------|
| Written by | `/api/learning/session/start` (INSERT), `/api/learning/session/finish` (UPDATE) |
| User flow | Student independently practices in learning app |
| Filter field | `started_at` (fallback: `created_at` if column missing) |
| Subject filter | Must be in `REPORT_AGG_SUBJECTS`; rows with other subjects silently dropped |
| Contributes to parent report | **Yes** |
| Contributes to teacher student report | **Yes** |
| Contributes to teacher class report | **Yes** |
| Contributes to school report | **Yes** |
| Contributes to activity labels | **Yes** — `totalSessions` in summary is derived from this table |
| Contributes to mastery/accuracy | Indirectly (sessions provide subject/topic context for answer attribution) |

### 3.2 `answers`

| Attribute | Value |
|-----------|-------|
| Written by | `/api/learning/answer` |
| User flow | Student independently practices in learning app |
| Filter field | `answered_at` (fallback: `created_at`) |
| Subject filter | `answer_payload.subject` must be in `REPORT_AGG_SUBJECTS`; falls back to parent session's subject |
| Contributes to parent report | **Yes** |
| Contributes to teacher student report | **Yes** |
| Contributes to teacher class report | **Yes** |
| Contributes to school report | **Yes** |
| Contributes to accuracy/mastery/strengths/weaknesses | **Yes** — all accuracy-based labels come from this table alone (in parent report) |

### 3.3 `classroom_activities`

| Attribute | Value |
|-----------|-------|
| Written by | Teacher portal — create/activate activity routes |
| User flow | Teacher creates and activates a homework/quiz/guided_practice/live_lesson/discussion for their class |
| Filter field | `closed_at` OR `activated_at` OR `created_at` (priority order in `activityTimestampIso`) |
| Date range applied | On status row's `submitted_at` first; fallback to activity timestamp |
| Mode filter | `.neq("mode", "discussion")` applied at DB query level in all classroom rollup loaders |
| Contributes to parent report | **No** |
| Contributes to teacher student report | **Yes** (via merge) |
| Contributes to teacher class report | **Yes** (via merge) |
| Contributes to school report | **Yes** (via merge) |
| Contributes to activity labels / accuracy | Only in teacher/school contexts after merge |

### 3.4 `classroom_activity_student_status`

| Attribute | Value |
|-----------|-------|
| Written by | Student submitting classroom activity; teacher activity monitor routes |
| Key columns | `activity_id`, `student_id`, `status`, `submitted_at`, `answers_count`, `correct_count` |
| Session counted | When `status` ∈ `{ submitted, timed_out, in_progress }` |
| Answer counted | `answers_count` column value |
| Contributes to parent report | **No** |
| Contributes to teacher student report | **Yes** (via merge into summary.totalSessions / totalAnswers) |
| Contributes to teacher class report | **Yes** |
| Contributes to school report | **Yes** |
| Contributes to accuracy | Yes — `correct_count / answers_count` feeds merged accuracy |
| Merge guard | `mergeClassroomActivityRollupIntoReportPayload` early-exits if `rollup.answers === 0` |

### 3.5 `classroom_activity_attempts`

| Attribute | Value |
|-----------|-------|
| Written by | Student play API during classroom activity |
| Contributes to any report builder | **Not directly** — report builders read `classroom_activity_student_status.answers_count`, not raw attempt rows |
| Contributes to parent report | No |
| Notes | Individual attempt rows exist but aggregated counts are in status table |

### 3.6 `student_activities` (private teacher individual activities)

| Attribute | Value |
|-----------|-------|
| Written by | Teacher-assigned individual activities (`lib/teacher-server/student-activity.server.js`) |
| User flow | Teacher assigns a private activity directly to one student |
| Contributes to parent report | **No** |
| Contributes to teacher student report | No — has its own separate report endpoint (`/api/teacher/student-activities/[activityId]/report.js`) |
| Contributes to teacher class report | **No** |
| Contributes to any aggregate | **No** — completely siloed from all summary/diagnostic pipelines |
| Notes | Migration 026 (`026_student_activities.sql`); `discussion` mode added in migration 037 |

### 3.7 `student_activity_status` / `student_activity_attempts`

| Attribute | Value |
|-----------|-------|
| Same isolation as parent | Both are read only by the individual activity report endpoint |
| Contributes to any aggregate | **No** |

---

## 4. Per-Report-Builder Map

### 4.1 Parent Report (`aggregateParentReportPayload`)

**File:** `lib/parent-server/report-data-aggregate.server.js`

```
Input:
  learning_sessions  (filtered by started_at in [from, to))
  answers            (filtered by answered_at in [from, to))

Output:
  summary.totalSessions    = count of sessions with subject in REPORT_AGG_SUBJECTS
  summary.totalAnswers     = count of answers with subject resolved
  summary.accuracy         = correctAnswers / totalAnswers * 100
  subjects[s].sessions     = sessions per subject
  subjects[s].answers      = answers per subject
  dailyActivity            = per-day sessions+answers rollup
  recentMistakes           = last 20 wrong answers

NOT included:
  classroom_activity_student_status
  classroom_activities
  student_activities
```

**Diagnostic labels computed downstream (client-side in parent-report-v2.js):**
- `needsPractice` if topic accuracy < 70%
- `subjectMonitoringOnly` from `learning-patterns-analysis.js`
- Diagnostic confidence, canonical state from `diagnostic-engine-v2/`

**Activity labels (teacher dashboard, not parent UI):**
- Computed by `deriveStudentStatusBadgeFromSummary(summary, guidanceSeverityTier)` in `lib/teacher-portal/student-learning-status.js`
- This function is NOT called from the parent report pipeline at all — it's called from teacher dashboard UI code

### 4.2 Teacher Student Report (`buildTeacherStudentReportPayload`)

**File:** `lib/teacher-server/teacher-report.server.js`

```
Input:
  aggregateParentReportPayload  (same as parent: learning_sessions + answers)
  +
  loadClassroomRollupForTeacherStudentReport
    → classroom_activities   (mode != 'discussion', status != 'archived')
    → classroom_activity_student_status

Merge:
  mergeClassroomActivityRollupIntoReportPayload:
    summary.totalSessions += rollup.sessions
    summary.totalAnswers  += rollup.answers
    summary.correctAnswers += rollup.correct
    summary.accuracy recomputed

Guidance:
  buildStudentTeacherGuidanceV2 → buildStudentTeacherGuidance
    uses summary.totalAnswers / totalSessions / accuracy
    uses dailyActivity (merged) for last-active-date
```

**Activity label source:** `deriveStudentStatusBadgeFromSummary` called from teacher dashboard UI with merged summary.

### 4.3 Teacher Class Report (`buildTeacherClassReportPayload`)

**File:** `lib/teacher-server/teacher-class-report.server.js`

```
For each student in roster:
  1. aggregateReportPayloadFromActivityRows  (learning_sessions + answers)
  2. mergeClassroomActivityRollupIntoReportPayload

Then:
  aggregateClassReportFromStudentPayloads  →  cohortSummary, weaknessTopics, attentionList

Attention logic (per student, post-merge):
  answers == 0 AND sessions == 0  → attentionScore += 3, reason: "no_activity_in_range"
  accuracy < 65% AND answers >= 3 → attentionScore += 2 (or 3 if < 50%)
  recentMistakes >= 5             → attentionScore += 2

Activity label for class:
  deriveClassGuidanceSeverityTier(cohortAccuracy)
    null accuracy → "class_monitor"
    acc <= 49     → "critical_class"
    acc <= 64     → "class_needs_reinforcement"
    acc <= 74     → "class_monitor"
    acc > 74      → "class_on_track"
```

### 4.4 School / Physical Class Report

**File:** `lib/school-server/school-physical-class-report.server.js`

Similar to teacher class report but with additional subject scoping via `school_teacher_subjects` and `REPORT_AGG_SUBJECTS` filtering. Calls `loadClassroomActivityRollupsForMultipleClassReports`.

---

## 5. Per-Student Comparison Table

The following three hypothetical student profiles illustrate the divergence. These are derived from the described product concern and the code logic — not live DB queries.

### Student A: High Classroom Activity, Zero Independent Sessions (Illustrative)

> Represents the concern: "student with ~20 sessions and ~200 answers showing low activity"

| Metric | Raw DB | Parent Report | Teacher Student Report | Teacher Dashboard Badge |
|--------|--------|--------------|----------------------|------------------------|
| `learning_sessions` rows in window | 0 | 0 | 0 | — |
| `answers` rows in window | 0 | 0 | 0 | — |
| `classroom_activity_student_status` rows | 20 activities, 200 answers | **NOT READ** | 200 answers merged | merged |
| `summary.totalSessions` (post-merge) | — | **0** | ~20 | ~20 |
| `summary.totalAnswers` (post-merge) | — | **0** | ~200 | ~200 |
| `summary.accuracy` | — | **0** (no data) | e.g. 72% | e.g. 72% |
| Parent report label | — | **"פעילות נמוכה"** | N/A | — |
| Teacher badge | — | — | "במעקב" (if 65-74%) | "במעקב" |
| Root cause | — | **B** (data exists, parent doesn't read it) | Correct | Correct |

**Finding:** The parent report will show `"פעילות נמוכה"` even though the student is genuinely active through classroom activities. The teacher dashboard shows a realistic label. The two surfaces are inconsistent for the same student.

### Student B: Mix of Sessions and Classroom Activity — Old Data (Illustrative)

> Represents date-range exclusion scenario

| Metric | All-time DB | In 30-day window | Parent Report | Teacher Student Report |
|--------|-------------|-----------------|--------------|----------------------|
| `learning_sessions` total | 15 | 0 (all > 30 days ago) | 0 | 0 |
| `answers` total | 150 | 0 | 0 | 0 |
| `classroom_activity_student_status` | 5 activities, 50 answers | 3 activities, 30 answers | NOT READ | 30 answers merged |
| `summary.totalAnswers` | — | — | **0** | **30** |
| Parent report badge | — | — | **"פעילות נמוכה"** | N/A |
| Root cause | — | — | **C** (date range excludes all independent data) + **B** (classroom data not read) | Partial |

**Finding:** Even the teacher report is incomplete here — it shows 30 answers from classroom activities but misses the 150 historical independent answers. The parent report shows nothing. Both surfaces undercount a genuinely experienced student if the default 30-day window is used.

### Student C: Genuine Low Activity (1–2 Answers in Window)

> Represents the "insufficient data" badge bug

| Metric | Value |
|--------|-------|
| `learning_sessions` in window | 1 |
| `answers` in window | 2 |
| `totalAnswers` | 2 |
| `accuracy` | 50% (1/2 correct) |
| `deriveStudentStatusBadgeFromSummary` path | answers < 3 → fallback branch |
| Badge returned | `"אין מספיק נתונים"` |
| `filterKey` | **`"low_activity"`** |
| Dashboard chip | Student appears in "פעילות נמוכה" filter bucket |
| Root cause | **F** — threshold confusion: 1–2 answers maps to `low_activity` filter key, not a separate `"insufficient_data"` bucket |

**Finding:** A student with 1 session and 2 answers is technically active, but the dashboard `filterKey: "low_activity"` treats them the same as a student with 0 sessions and 0 answers. The Hebrew badge is different ("אין מספיק נתונים" vs. "פעילות נמוכה") but both share the same filter bucket.

### Class C: Class with Many Classroom Sessions but Low Independent Sessions (Illustrative)

| Metric | Raw | Class Report | Root Cause |
|--------|-----|-------------|------------|
| Students with `learning_sessions` in window | 2/20 | — | — |
| Students with classroom activity submissions | 18/20 | — | — |
| `cohortSummary.studentsWithActivity` | — | 18 (after merge) | Correct |
| `cohortSummary.totalAnswers` | — | e.g. 3600 (18×200) | Correct after merge |
| `cohortSummary.accuracy` | — | e.g. 70% | Correct |
| Class health signal | — | `"class_monitor"` | Determined by accuracy tier |
| Teacher class badge | — | "במעקב" | — |
| Parent report for each student | — | "פעילות נמוכה" (if no independent sessions) | **B** |

---

## 6. Per-Mode Diagnostic Behavior Matrix

| Mode | Written to | Counted in `learning_sessions` | Counted in `classroom_activity_student_status` | Parent Report | Teacher Report | Class Report | Diagnostic (mastery/accuracy) | Discussion Firewall |
|------|-----------|-------------------------------|-----------------------------------------------|--------------|---------------|-------------|-------------------------------|---------------------|
| `homework` | `classroom_activities` + `classroom_activity_student_status` | No | Yes | **No** | Yes | Yes | Yes (in teacher/school context) | N/A |
| `quiz` | same | No | Yes | **No** | Yes | Yes | Yes | N/A |
| `guided_practice` | same | No | Yes | **No** | Yes | Yes | Yes | N/A |
| `live_lesson` | same | No | Yes | **No** | Yes | Yes | Yes | N/A |
| `discussion` | `classroom_activities` + `classroom_activity_student_status` | No | Yes (DB row exists) | **No** | **Excluded** | **Excluded** | **Excluded** | `.neq("mode","discussion")` at query level |
| (independent learning) | `learning_sessions` + `answers` | Yes | No | **Yes** | Yes | Yes | Yes | N/A |

### Discussion Mode — Detailed Verification

- `loadClassroomActivityRollupsForClassReport` (line 345): `.neq("mode", "discussion")`
- `loadClassroomActivityRollupsForMultipleClassReports` (line 443 and 582): `.neq("mode", "discussion")`
- `loadClassroomRollupsForMemberClassIdsBatch` (line 677): `.neq("mode", "discussion")`
- `buildClassroomActivityRollupsByStudentId`: only processes activities that appear in the passed `activities` array (which already excluded discussion)
- `shouldRevealCorrectAnswerToStudent("discussion")` → `false`

**Verdict:** `discussion` mode is correctly non-diagnostic. It cannot influence parent report diagnostics, teacher guidance accuracy tiers, mastery scores, strengths, weaknesses, or recommendations. The firewall is enforced at the DB query level and verified by `tests/discussion-activity-diagnostic-firewall.test.mjs`.

**Important product note:** A class that primarily uses `discussion` activities will have its classroom rollup show fewer sessions/answers than its actual engagement level. This is by design for the diagnostic pipeline. However, if the teacher/school dashboard shows activity volume (not just accuracy), discussion-mode activity is not counted. This may make a highly engaged discussion-based class look like a low-activity class in volume metrics.

---

## 7. Label / Threshold Logic Audit

### 7.1 Student Activity Badge (`deriveStudentStatusBadgeFromSummary`)

**File:** `lib/teacher-portal/student-learning-status.js`

```
Inputs: summary.totalAnswers, summary.totalSessions, summary.accuracy, guidanceSeverityTier

Decision tree (in order):
  1. answers == 0 AND sessions == 0
     → badge: "פעילות נמוכה", filterKey: "low_activity", sortRank: 4

  2. guidanceSeverityTier == "critical"
     → badge: "דורש התערבות", filterKey: "struggling", sortRank: 5

  3. guidanceSeverityTier == "needs_reinforcement"
     → badge: "צריך חיזוק", filterKey: "struggling", sortRank: 4

  4. guidanceSeverityTier == "monitor"
     → badge: "במעקב", filterKey: "watch", sortRank: 3

  5. guidanceSeverityTier == "on_track"
     → badge: "חזק" (if accuracy >= 90) or "תקין"

  6. answers >= 3 AND accuracy != null
     → accuracy < 50  → "דורש התערבות"
     → accuracy < 65  → "צריך חיזוק"
     → accuracy < 75  → "במעקב"
     → accuracy >= 90 → "חזק"
     → else           → "תקין"

  FALLBACK (answers 1-2, or no guidance tier):
     → badge: "אין מספיק נתונים", filterKey: "low_activity", sortRank: 6
```

**Bug surface:** Branch 1 ("low activity") and the fallback ("insufficient data") both map to `filterKey: "low_activity"`. In the teacher dashboard filter chip "פעילות נמוכה", both types of students are lumped together. A student with 2 answers looks indistinguishable from a student with 0.

### 7.2 Guidance Severity Tier (`deriveStudentGuidanceSeverityTier`)

**File:** `lib/teacher-server/teacher-recommendations.server.js`

```
Input: overall accuracy percentage

acc <= 49  → "critical"
acc <= 64  → "needs_reinforcement"
acc <= 74  → "monitor"
acc > 74   → "on_track"
not finite → "monitor"  ← note: null/undefined accuracy defaults to "monitor" tier
```

**Risk:** When `totalAnswers = 0` (or < 5), accuracy is 0. `deriveStudentGuidanceSeverityTier(0)` returns `"critical"`. However, `buildStudentTeacherGuidance` checks `insufficientData = totalAnswers < 5 AND totalSessions < 2` and short-circuits before calling this function. So if the guard fires, `guidanceSeverityTier` is `undefined` in the returned object — and `deriveStudentStatusBadgeFromSummary` falls through to branch 6 (insufficient data), not branch 1.

**But:** If a student has 0 answers and 2+ sessions, the guard does NOT fire (`totalSessions >= 2` means sufficient). Then `accuracy = null` (since `accuracy = totalAnswers > 0 ? ... : null`). `deriveStudentGuidanceSeverityTier(null)` → `"monitor"`. So the badge is "במעקב" for a student with 0 answers but 2+ sessions. This may be misleading.

### 7.3 Inactivity Risk Signal

```
INACTIVITY_DAYS_THRESHOLD = 7

If lastActivityDate is more than 7 days ago:
  → riskSignals.push("inactive_recent_days")
  → if guidanceSeverityTier == "monitor": upgrade to "needs_reinforcement"
```

This means a student with 74% accuracy (borderline monitor/on-track) who has not studied in 8 days is **upgraded to "needs_reinforcement"**, producing badge "צריך חיזוק". This may produce a seemingly harsh label for a student with decent accuracy who was on a short break.

### 7.4 Class Activity Label

```
cohortAccuracy null → "class_monitor" (not enough data)
cohortAccuracy <= 49 → "critical_class"
cohortAccuracy <= 64 → "class_needs_reinforcement"
cohortAccuracy <= 74 → "class_monitor"
cohortAccuracy > 74 → "class_on_track"
```

A class where only classroom activities have been done and `learning_sessions` are zero: after the merge, `cohortAccuracy` is derived from merged data. This is correct. If no activities exist for the class in the window, `cohortAccuracy = 0` (from 0/0 = 0 in `aggregateClassReportFromStudentPayloads` line 171). But then `studentsWithActivity = 0`. `buildClassTeacherGuidance` checks `if (totalAnswers < 10 AND studentsWithActivity === 0)` → returns `insufficientData: true`. So a completely inactive class is protected by this guard.

### 7.5 Parent Report — `needsPractice` Threshold

**File:** `utils/parent-report-v2.js` (computed from adapted data)

```
needsPractice: topic.accuracy < 70 (when topic.questions > 0)
```

This is computed client-side on the adapted payload (reads from localStorage / API response). It does **not** directly produce a label visible in the teacher dashboard — it feeds the detailed parent report only.

---

## 8. Date-Range Audit

### 8.1 Default Range

| Consumer | Default |
|----------|---------|
| Parent API | 30 days (`DEFAULT_RANGE_DAYS = 30`) |
| Teacher student report | 30 days (`DEFAULT_RANGE_DAYS = 30` in `teacher-report.server.js`) |
| Teacher class report | 30 days (same constant) |
| Parent UI (bridge) | 7 days ("week") or 30 days ("month") via `computeReportRangeForParentApi` |

### 8.2 Range Construction

```javascript
// Both parent and teacher APIs:
toDate = today (UTC midnight)
fromDate = toDate - (DEFAULT_RANGE_DAYS - 1) days

// For sessions (learning_sessions):
fromIso = `${from}T00:00:00.000Z`
toIsoExclusive = `${to + 1 day}T00:00:00.000Z`
filter: started_at >= fromIso AND started_at < toIsoExclusive

// For answers:
filter: answered_at >= fromIso AND answered_at < toIsoExclusive

// For classroom activity statuses:
referenceIso = submitted_at OR activity.closed_at OR activity.activated_at OR activity.created_at
filter: referenceIso >= fromIso AND referenceIso < toIsoExclusive
```

### 8.3 Timestamp Priorities and Risks

| Table | Primary field | Fallback field | Risk |
|-------|--------------|----------------|------|
| `learning_sessions` | `started_at` | `created_at` | If `started_at` column is missing (schema migration lag), uses `created_at`. Sessions that were created but never started appear in the window but may have misleading dates. |
| `answers` | `answered_at` | `created_at` | Same risk. If `answered_at` is null (e.g. server error during write), falls back to creation time. |
| `classroom_activities` | `closed_at` | `activated_at` → `created_at` | A classroom activity that was never closed has its date determined by when it was activated or created. If the teacher activates the activity in one period but students submit much later, the activity may appear inside or outside the window inconsistently depending on whether per-student `submitted_at` or activity-level timestamp is used. |
| `classroom_activity_student_status` | `submitted_at` | activity-level timestamp | If `submitted_at` is null (student started but never submitted), the activity's own timestamp is used. This means an unsubmitted in-progress activity may appear in the window if the activity was activated in the window, even if no submission occurred. |

### 8.4 Timezone Handling

All date boundaries are constructed in UTC (`T00:00:00.000Z`). The `parseIsoDateParam` function parses YYYY-MM-DD as UTC midnight. The UI calls the API with local-timezone dates (e.g., if the parent is UTC+3, "today" from their perspective is already yesterday in UTC). This means a student who studied at 11pm local time on the last day of the window may have their activity outside the UTC window.

**Timezone risk:** For Israeli users (UTC+3), any activity between 10pm–midnight local time falls on the next UTC day. If the report window ends at UTC midnight "today", those answers are excluded until the next day's report is generated.

### 8.5 Simulation Data Age Risk

If the simulation ran more than 30 days ago, **all simulated sessions and answers fall outside the default window**. The reports will show zero activity for those students even though the DB contains hundreds of rows. This is the most likely explanation for the "20 sessions / 200 answers but low activity label" scenario if the simulation data is stale.

---

## 9. Teacher Activity Modes — Diagnostic vs. Non-Diagnostic

| Mode | DB table | Excluded from diagnostic | Counted in parent report | Counted in teacher report |
|------|---------|--------------------------|-------------------------|--------------------------|
| `homework` | `classroom_activities` | No | **No** | Yes |
| `quiz` | `classroom_activities` | No | **No** | Yes |
| `guided_practice` | `classroom_activities` | No | **No** | Yes |
| `live_lesson` | `classroom_activities` | No | **No** | Yes |
| `discussion` | `classroom_activities` | **Yes (firewall)** | **No** | **No** |
| Independent (free play) | `learning_sessions` + `answers` | No | Yes | Yes |

**Product rule confirmed:** `discussion` is correctly non-diagnostic in all report surfaces. It does not affect strengths, weaknesses, mastery, recommendations, or activity labels. The firewall is enforced via `.neq("mode", "discussion")` in every classroom activity DB query.

**Important gap for all non-discussion modes:** Even `homework`, `quiz`, `guided_practice`, and `live_lesson` modes are **not visible in the parent report**. The parent report only reads `learning_sessions` and `answers`. All classroom-assigned diagnostic content is invisible to parents unless they look at the teacher-provided view.

---

## 10. Root-Cause Candidates Ranked by Evidence

### Rank 1 — **B: Raw data exists but parent report API does not read it** ★★★★★

**Evidence:**
- `pages/api/parent/students/[studentId]/report-data.js` calls only `aggregateParentReportPayload` + `attachStudentLearningAccountToParentReportPayload` + `enrichPayloadWithParentFacing`. No call to any classroom activity loading function.
- `teacher-report.server.js` calls `mergeClassroomActivityRollupIntoReportPayload` — parent API does not.
- This is the only report path where the asymmetry is structurally guaranteed.
- A student with all activity through classroom assignments and zero independent sessions will always show `totalSessions=0`, `totalAnswers=0` in the parent report, producing `"פעילות נמוכה"`.

### Rank 2 — **C: Report builder reads data but date range drops it** ★★★★

**Evidence:**
- Default window is 30 days. Simulation data may be older.
- `started_at` fallback to `created_at` may cause session/answer rows to have different effective timestamps.
- Even if classroom data exists within the window, if independent session data is all historical, parent report still shows zero.

### Rank 3 — **F: Label threshold is misleading / filterKey merging** ★★★

**Evidence:**
- `filterKey: "low_activity"` is used for BOTH `answers===0 AND sessions===0` (genuinely inactive) AND `answers in [1,2]` (insufficient data). Teacher dashboard filter chip "פעילות נמוכה" captures both groups.
- A student with 2 answers appears in the same bucket as a student with 0.

### Rank 4 — **H: Simulation data written through different path than real users** ★★★

**Evidence:**
- Simulation scripts use teacher portal flows to create classroom activities. Real user independent learning flows write to `learning_sessions`/`answers`.
- If the simulation only creates classroom activity data (not independent session data), the parent report will always show zero because it only reads `learning_sessions`/`answers`.
- The two data paths are separate by design, but the simulation may over-represent one path.

### Rank 5 — **E: Diagnostic engine uses different counters than visible report** ★★

**Evidence:**
- `buildStudentTeacherGuidance` uses `summary.totalAnswers` and `summary.totalSessions` from the merged payload. If the merge didn't run (parent context), these counters are lower.
- `deriveStudentGuidanceSeverityTier` receives overall `accuracy` which is recomputed after merge. Before merge (parent-only), accuracy may be 0 or null.
- `insufficientData` guard threshold (`totalAnswers < 5 AND totalSessions < 2`) may fire for the merged payload differently than for the pre-merge payload.

### Rank 6 — **G: Hebrew/UI label does not match actual computed metric** ★★

**Evidence:**
- "פעילות נמוכה" and "אין מספיק נתונים" map to the same `filterKey: "low_activity"`. This is a UI-level label/metric mismatch.
- A teacher filtering by "פעילות נמוכה" sees students who are genuinely inactive AND students who have minimal but non-zero activity.

### Rank 7 — **D: Report builder reads data but subject filter removes it** ★

**Evidence:**
- Sessions/answers without a recognized subject are excluded from `totalSessions`/`totalAnswers` in `aggregateReportPayloadFromActivityRows`.
- If simulation creates sessions with subject `null` or `"unknown"`, they are silently dropped.
- Less likely to be the primary cause but possible for misconfigured simulation runs.

### Rank 8 — **A: Raw data missing** ★

**Evidence:**
- Data physically exists in the DB (simulation creates it). The issue is not data absence but data routing.

---

## 11. Risks

### Risk 1 — Parent Trust Erosion (HIGH)
If a parent sees "פעילות נמוכה" for a child who has completed 20 homework assignments and 200 quiz answers through classroom activities, they may incorrectly believe their child is not engaged. This breaks the core trust loop of the product.

### Risk 2 — Teacher/Parent Inconsistency (HIGH)
Teacher sees the student as "במעקב" (watch, 72% accuracy), parent sees "פעילות נמוכה" (no data). Teacher may receive inquiries from parents who distrust the system.

### Risk 3 — Stale Simulation Data Creates False Urgency (MEDIUM)
Running QA/monitoring against simulation data that is >30 days old produces a 100% false-positive "low activity" class. Any automated alerts or monitoring based on report labels would fire incorrectly.

### Risk 4 — "אין מספיק נתונים" Hidden in Low-Activity Bucket (MEDIUM)
Students with 1–2 answers who are genuinely beginning users are counted as "low activity" in dashboard filters, which may inflate the apparent size of the low-activity cohort and lead to incorrect prioritization.

### Risk 5 — Discussion-Heavy Classes Appear Low-Volume (LOW)
A class that primarily uses `discussion` mode shows lower answer/session counts in teacher analytics. Volume-based metrics will underrepresent engagement. Discussion is correctly excluded from accuracy diagnostics, but this creates a separate volume-reporting gap.

### Risk 6 — Inactivity Escalation at 7-Day Boundary (LOW)
A student at 74% accuracy (borderline) who takes a 7-day break is automatically escalated from `"monitor"` to `"needs_reinforcement"`. This may be appropriate pedagogically but can create misleading alerts for students on scheduled breaks (weekends, holidays).

### Risk 7 — Timezone Boundary for Late-Night Sessions (LOW)
Israeli students studying between 10pm–midnight local time may have their sessions excluded from the same-day report when viewing in UTC-based windows. The session appears the following UTC day.

---

## 12. Product Decisions Required

1. **Should the parent report include classroom activity data?**
   - Currently: No. The parent report reads only `learning_sessions` + `answers`.
   - Option A: Merge classroom activity rollup into parent report (same merge path as teacher report).
   - Option B: Keep parent report as independent-learning-only; add a separate "classroom summary" section to parent report.
   - Option C: Document as intentional product design: parent sees independent learning; teacher sees classroom work.
   - **This decision is the most impactful. It directly resolves Rank 1 root cause.**

2. **Should `"אין מספיק נתונים"` and `"פעילות נמוכה"` share the same `filterKey`?**
   - Currently: both map to `filterKey: "low_activity"`.
   - Proposal: introduce a separate `filterKey: "insufficient_data"` for the 1–2 answers case.

3. **Should the inactivity escalation threshold (7 days) account for known school calendar?**
   - Currently: a student inactive for 7 days is always escalated regardless of whether there was a weekend or holiday.
   - Proposal: make the threshold configurable or add a calendar-aware grace period.

4. **Should the discussion mode volume be shown separately in teacher dashboard?**
   - Currently: discussion activity sessions are fully invisible in all analytics.
   - Proposal: show "discussion sessions: X" as a separate non-diagnostic counter in teacher dashboard.

5. **Should simulation data always be written with dates in the current window?**
   - Currently: simulation scripts may produce historical data.
   - Proposal: QA/simulation scripts should default to producing data timestamped within the last 7 days to match the default report window.

---

## 13. Recommended Next Steps

The following are investigation steps only. No implementation is recommended in this document.

1. **Verify root cause B is live in production:** Check a specific student in the DB who has rows in `classroom_activity_student_status` but zero rows in `learning_sessions`. Call the parent API for that student and confirm `totalAnswers = 0`. This will confirm or deny root cause B with certainty.

2. **Check simulation timestamp distribution:** Query the simulation student IDs and find min/max `started_at` in `learning_sessions` and `submitted_at` in `classroom_activity_student_status`. Determine what fraction of simulation data falls within the last 30 days.

3. **Check for null/unknown subjects in simulation sessions:** Query `learning_sessions WHERE student_id IN (...sim students...) AND subject NOT IN ('math','geometry','english','hebrew','science','moledet_geography')`. If rows exist, they are silently excluded from reports.

4. **Review the parent report API decision boundary explicitly:** Confirm with product whether the asymmetry (parent sees only independent learning, not classroom work) is intentional product design or an oversight.

5. **Cross-check a specific student's data across all surfaces:** Pick one simulation student with high `classroom_activity_student_status.answers_count` totals. Compare the raw DB totals with the parent API response and the teacher report API response. Document the exact diff.

6. **Confirm `filterKey` behavior in teacher dashboard UI:** Verify that the "פעילות נמוכה" filter chip includes students with `filterKey: "low_activity"` from both the zero-activity path and the insufficient-data fallback path.

---

## 14. Files Inspected

The following files were statically analyzed. No files were modified.

| File | Why Inspected |
|------|---------------|
| `lib/teacher-portal/student-learning-status.js` | Canonical "low activity" label logic and thresholds |
| `lib/teacher-server/teacher-recommendations.server.js` | Guidance tier thresholds, risk signals, inactivity logic |
| `lib/parent-server/report-data-aggregate.server.js` | Core aggregation: session/answer fetch, summary computation |
| `lib/teacher-server/teacher-report.server.js` | Teacher student report pipeline, classroom merge call |
| `lib/teacher-server/teacher-class-report.server.js` | Teacher class report pipeline, attention scoring |
| `lib/teacher-server/classroom-activity-class-report.server.js` | Classroom merge functions, discussion exclusion, rollup builder |
| `pages/api/parent/students/[studentId]/report-data.js` | Parent API entry point — confirmed no classroom merge |
| `pages/api/teacher/students/[studentId]/report-data.js` | Teacher student API entry point |
| `supabase/migrations/024_classroom_activities.sql` | Schema: classroom_activities, classroom_activity_student_status |
| `supabase/migrations/026_student_activities.sql` | Schema: student_activities (individual) |
| `supabase/migrations/037_discussion_activity_mode.sql` | Discussion mode extension |
| `scripts/teacher-portal/run-teacher-classroom-daily-simulation.mjs` | Simulation entry point (data write path) |
| `lib/parent-server/report-data-aggregate-batch.server.js` | Batch aggregation for class rosters |
| `lib/teacher-server/roster-report-student-entries.server.js` | Roster loading |
| `lib/school-server/school-physical-class-report.server.js` | School-level report (confirmed uses same merge path) |
| `utils/parent-report-v2.js` | Client-side parent report builder |
| `utils/learning-patterns-analysis.js` | `subjectMonitoringOnly` logic |
| `utils/diagnostic-engine-v2/confidence-policy.js` | Confidence thresholds |
| `lib/parent-server/parent-report-parent-facing.server.js` | Parent-facing enrichment |
| `lib/learning-supabase/parent-dashboard-report-bridge.js` | Client bridge, date range helper |
| `tests/discussion-activity-diagnostic-firewall.test.mjs` | Discussion firewall verification test |

---

## 15. Explicit No-Change Confirmation

> **This audit document is the complete and sole output of this investigation.**
>
> No source code files were modified.
> No SQL migrations were created or run.
> No schema changes were applied.
> No Hebrew text or UI strings were changed.
> No API routes were altered.
> No commits were created.
> No pushes were made.
>
> All findings in this document are based on static analysis of the codebase as it exists at the time of this audit (2026-05-28).
