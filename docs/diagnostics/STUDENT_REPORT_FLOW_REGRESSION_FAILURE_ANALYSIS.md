# Student Report Flow Regression Failure Analysis

**Date:** 2026-05-29  
**Scope:** Audit-only — no product code changes  
**Failing test:** `scripts/tests/student-report-flow-regression.mjs` → `verifyParentFlow`

---

## Executive Verdict

**Test bug (broken test assumption)** — not a parent aggregation bug, not caused by the recent diagnostic truth fixes.

The regression helper `countLearningSessionAnswers` queries `answers.session_id`, but the schema and production aggregation path use `answers.learning_session_id`. Supabase returns `count: null` for the invalid column filter; the helper coerces that to `0`, while `aggregateParentReportPayload` correctly returns the real answer count.

---

## Exact Failing Assertion

| Field | Value |
|-------|-------|
| **File** | `scripts/tests/student-report-flow-regression.mjs` |
| **Function** | `verifyParentFlow` |
| **Lines** | 112–116 |
| **Assertion** | `assert.equal(summary.totalAnswers, ls.answers, "parent report answers must match learning_sessions/answers only")` |
| **Observed (2026-05-29 run)** | `12 !== 0` |
| **Earlier closure note** | `8 !== 0` (same root cause; demo data grew between runs) |

No stack trace beyond Node `AssertionError` — test exits at first failing assert in `verifyParentFlow` before later flows run.

---

## Student / Fixture Involved

| Field | Value |
|-------|-------|
| **Parent email** | `demofamily@leo-k.com` (`DEMO_PARENT_EMAIL`) |
| **Picked child** | נועה כהן |
| **Student ID** | `f1ee3d3d-77b5-48cd-96d2-f42eb60a3bea` |
| **Selection logic** | First active child of demo parent with a non-empty `full_name` |

---

## Date Range Used by Test

Computed in `main()`:

```javascript
const toDate = new Date();
toDate.setUTCHours(0, 0, 0, 0);
const fromDate = new Date(toDate);
fromDate.setUTCDate(fromDate.getUTCDate() - 29);
```

**Observed range (2026-05-29 run):**

| Bound | ISO date |
|-------|----------|
| `fromDate` (inclusive) | `2026-04-30` |
| `toDate` (inclusive) | `2026-05-29` |
| Exclusive upper bound | `2026-05-30T00:00:00.000Z` |

---

## Raw DB Counts

### `learning_sessions` (filter: `started_at` in range)

| Metric | Count |
|--------|-------|
| Sessions in range | **3** |

Sample session IDs (all `2026-05-29`):

- `b82d0b42-7383-4fdb-a804-977aea45495c`
- `3854cc84-7c2e-44dd-b7a4-8455d114423d`
- `5c5a9955-5373-4493-bf88-df00a84d4c74`

### `answers` — test helper path (broken)

```javascript
.in("session_id", sessionIds)  // ← wrong column
```

| Metric | Result |
|--------|--------|
| Count returned | `null` → coerced to **0** |
| Supabase error | empty string (invalid column reference) |

### `answers` — correct column

```javascript
.in("learning_session_id", sessionIds)
```

| Metric | Count |
|--------|-------|
| Answers linked to in-range sessions | **12** |

### `answers` — production aggregation filter

```javascript
.eq("student_id", studentId)
.gte("answered_at", "2026-04-30T00:00:00.000Z")
.lt("answered_at", "2026-05-30T00:00:00.000Z")
```

| Metric | Count |
|--------|-------|
| Answers by `answered_at` in range | **12** |

### Schema confirmation

`supabase/migrations/001_learning_core_foundation.sql` defines:

```sql
learning_session_id uuid references public.learning_sessions (id) ...
```

There is **no** `session_id` column on `answers`.

---

## `aggregateParentReportPayload` Output

For student `f1ee3d3d-77b5-48cd-96d2-f42eb60a3bea` in the same date range:

| Field | Value |
|-------|-------|
| `summary.totalAnswers` | **12** |
| `summary.totalSessions` | **3** |
| `meta.answerDateField` | `answered_at` |
| `meta.sessionDateField` | `started_at` |
| `meta.fallbackUsed` | `false` |

Production path (`lib/parent-server/report-data-aggregate.server.js`):

1. `fetchSessionsInRange` — filters sessions by `started_at`
2. `fetchAnswersInRange` — filters answers by `answered_at` (select includes `learning_session_id`)
3. `aggregateReportPayloadFromActivityRows` — joins answers via `answer.learning_session_id`

**Aggregation is internally consistent:** 12 answers, 3 sessions, all from real `answers` rows.

---

## Why Expected Count Is 12 but Helper Returns 0

| Source | totalAnswers |
|--------|--------------|
| `aggregateParentReportPayload` | **12** (correct) |
| Test helper `countLearningSessionAnswers` | **0** (wrong) |

**Not** “aggregate returns 0” — the opposite:

- Aggregate correctly counts 12 answers fetched by `student_id` + `answered_at`.
- Test helper silently under-counts because it filters on non-existent column `session_id`.
- Supabase returns `count: null`; helper uses `count ?? 0` → **0**.

The mismatch is entirely in the test oracle, not in parent aggregation.

---

## Did This Fail Before the Latest Fixes?

**Yes — latent test bug, now exposed by demo data.**

| Evidence | Finding |
|----------|---------|
| Git commit introducing test | `ac257d76` — helper already used `.in("session_id", sessionIds)` |
| `report-data-aggregate.server.js` in working diff | **Unchanged** by recent fixes |
| Recent fixes touched `verifyParentFlow`? | **No** — only added `verifyTeacherParentPreviewParity` later in file |
| Why it passed or was unnoticed earlier | When demo parent child had **0 answers**, both aggregate and broken helper returned 0 |
| Why it fails now | Recent demo activity (2026-05-29 math sessions) added **12 answers**, exposing the wrong column |

The count changed from 8 → 12 between runs because demo DB activity increased; the failure mechanism is unchanged.

---

## Did the Recent Diagnostic Truth Fixes Touch This Path?

| Fix | Touches `verifyParentFlow` / `aggregateParentReportPayload`? |
|-----|--------------------------------------------------------------|
| Remove classroom merge from `buildTeacherParentReportPreviewPayload` | **No** |
| Thin-data V2 guard in `buildStudentTeacherGuidanceV2` | **No** |

**Conclusion:** Failure is **not caused by the latest fixes**.

---

## Scoped Fix Confirmations (Re-run 2026-05-29)

| Check | Command / method | Result |
|-------|------------------|--------|
| Thin-data V2 guard | `node scripts/tests/teacher-guidance-v2-unit.mjs` | **PASS** (includes tests 3b, 3c) |
| Diagnostic truth unit tests | `node scripts/tests/diagnostic-report-truth-fix-unit.mjs` | **PASS** |
| Teacher parent preview parity | Focused live DB check (`aggregateParentReportPayload` vs `buildTeacherParentReportPreviewPayload`) | **PASS** |
| Teacher student report classroom path | `buildTeacherStudentReportPayload` with `classId` (school student) | **PASS** — path builds successfully; `reportAnswers >= baseAnswers` (0/0 in current 29-day window for school roster pick) |
| Full regression file | `node --env-file=.env.local scripts/tests/student-report-flow-regression.mjs` | **FAIL** at `verifyParentFlow` only |

---

## Final Classification

| Option | Verdict |
|--------|---------|
| Pre-existing stale/demo-data issue | Partially — demo data growth **triggered** exposure, but data is valid |
| **Broken test assumption** | **YES — root cause** |
| Real parent aggregation bug | **NO** |
| Caused by latest fix | **NO** |

---

## Proposed Fix — Not Implemented

**Minimal test correction** in `countLearningSessionAnswers` (`scripts/tests/student-report-flow-regression.mjs`):

```javascript
// Change:
.in("session_id", sessionIds);

// To:
.in("learning_session_id", sessionIds);
```

**Optional hardening (still test-only):**

- Assert Supabase query success: `if (error) throw error`
- Or align oracle with aggregation by counting answers via `answered_at` + `student_id` (same as `fetchAnswersInRange`)

**Do not change** `aggregateParentReportPayload` or parent report product code for this failure.

---

## Resolution (2026-05-29 — test-only fixes applied)

### Parent-flow oracle bug — fixed

- **Change:** `countLearningSessionAnswers` now filters `.in("learning_session_id", sessionIds)` instead of `.in("session_id", sessionIds)`.
- **Result:** `verifyParentFlow` **PASS** — aggregate and oracle both report 12 answers for demo child נועה כהן.

### School-managed brittle assertion — fixed

- **Problem:** `verifySchoolManagedFlow` unconditionally required `reportSummary.totalAnswers > 0` even when fixture had zero learning-session and zero classroom activity in the 29-day window.
- **Change:** Flow is now **data-driven** — checks source activity (`learningSessionAnswers`, `classroomAnswers`) before choosing assertions:
  - **With activity:** strong non-zero and merge-alignment checks
  - **Zero-data fixture:** asserts `reportSummary.totalAnswers === 0` and records `zeroDataFixture: true` in evidence
- **Result:** `verifySchoolManagedFlow` **PASS** (current fixture: אלון לוי, all source counts 0, report correctly 0).

### Full regression status

| Test | Result |
|------|--------|
| `node --env-file=.env.local scripts/tests/student-report-flow-regression.mjs` | **PASS** (all 5 flows) |
| `node scripts/tests/teacher-guidance-v2-unit.mjs` | **PASS** |
| `node scripts/tests/diagnostic-report-truth-fix-unit.mjs` | **PASS** |

### Final notes

- Parent-flow failure was a **test oracle bug** fixed by using `learning_session_id`.
- School-managed failure was a **stale/brittle demo-data assumption**; regression is now data-driven.
- **Parent aggregation remains correct** — no product code changes.
- No UI / Hebrew / SQL changes. No commit / push.

---

## Confirmations

| Constraint | Status |
|------------|--------|
| No product code changes | ✓ |
| No UI changes | ✓ |
| No Hebrew copy changes | ✓ |
| No SQL migrations | ✓ |
| No commit | ✓ |
| No push | ✓ |
