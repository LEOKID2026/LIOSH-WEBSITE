# Math Scratchpad — Existing Surface Audit

**Status:** Planning only. No implementation.  
**Date:** 2026-06-03

---

## Purpose

Before designing the scratchpad, map every surface where a scratchpad button could appear,
every system that question timing or answer submission touches, and every place
that could be broken by a new UI element near the question.

---

## 1. Math Question Generator Stack

### Source of truth for grade/topic gating

| File | Role |
|------|------|
| `utils/math-constants.js` | `GRADES[g1–g6].operations` — the canonical list of allowed operations per grade |
| `utils/math-storage.js` | `getLevelConfig` — strips operations not in grade before handing to generator |
| `utils/math-question-generator.js` | Main generator; branches on `gradeKey`, `operation`, `params.kind` |
| `utils/math-grade-topic-policy.js` | QA policy mirror; `MUST_NOT_EXPOSE_OPS` per grade |
| `scripts/curriculum-spine-grade-bindings.mjs` | `MATH_KIND_GRADE_SPAN` — 100+ sub-kinds with `minGrade/maxGrade` |
| `utils/math-question-metadata.js` | Metadata attached to each generated question |
| `utils/math-explanations.js` | Step-by-step explanation builders |

### Grade × operation matrix (from `GRADES` in `math-constants.js`)

| Grade key | Allowed operations (excluding `mixed`) |
|-----------|----------------------------------------|
| g1 | addition, subtraction, multiplication (≤20), compare, number_sense, word_problems |
| g2 | + division, fractions, compare, number_sense, word_problems |
| g3 | + division_with_remainder, sequences, decimals, divisibility, order_of_operations, word_problems |
| g4 | + rounding, prime_composite, powers, zero_one_properties, equations, factors_multiples, estimation, word_problems |
| g5 | + percentages, estimation, word_problems |
| g6 | + ratio, scale |

### Grade gating layers

- **Layer A — Config:** `GRADES[gN].operations` in `math-constants.js`
- **Layer B — Generator:** `allowedOps` filtered + per-grade extra rules inside `generateQuestion()`
- **Layer C — Level config:** `getLevelConfig` deletes unsupported op blocks
- **Layer D — UI:** `math-master.js` resets `operation` when grade changes
- **Layer E — Activities:** `normalizeMathActivityTopic` rejects unlisted topics
- **Layer F — QA:** `math-grade-topic-policy.js` + E2E tests in `math-topic-visibility.spec.ts`

---

## 2. Student-Facing Question Display Surfaces

### 2a. Normal practice (subject masters)

| File | Role |
|------|------|
| `pages/learning/math-master.js` | Primary math practice UI; handles question generation, answer, timer, step-by-step |
| `components/learning/StudentQuestionDisplay.jsx` | Presentational question component (RTL lead + LTR body) |
| `utils/student-question-display.js` | `resolveStudentQuestionDisplayParts` — splits/normalizes question text |
| `utils/student-question-stem-sanitizer.js` | Sanitizes stems before display |
| `utils/learning-question-font.js` | Equation font sizing |

The scratchpad button would appear **near** `StudentQuestionDisplay` inside `math-master.js`.

### 2b. Assigned activity display

| File | Role |
|------|------|
| `pages/student/activity/[activityId].js` | Unified play page for all scopes |
| `components/student/StudentAssignedActivityQuestionStage.jsx` | Geometry diagram + question surface |
| `components/student/StudentActivityQuestionSurface.jsx` | Wraps `StudentQuestionDisplay` + vertical math toggle |
| `components/student/StudentAssignedActivityShell.jsx` | Activity page chrome |

The scratchpad button in activities would appear inside `StudentActivityQuestionSurface` or `StudentAssignedActivityQuestionStage`.

### 2c. Step-by-step learning window ("צעד צעד")

There is **no separate component file**. The step-by-step UI is an inline modal inside `pages/learning/math-master.js`:

- State: `showSolution`, `animationStep`, `autoPlay`
- Content: built by `utils/math-explanations.js` (`buildStepExplanation`, `buildAnimationForOperation`)
- Opened by: "📘 הסבר מלא" button after answering in learning mode

**Risk:** The scratchpad must not interfere with this modal (z-index, state, layout).

---

## 3. Answer Submission Flow

### Three separate pipelines

#### Pipeline A — Normal practice (masters)

1. `handleAnswer` in `math-master.js` calls `compareMathLearnerAnswer` (`utils/answer-compare.js`)
2. Immediate UX feedback, streak update, optional step-by-step modal
3. Async persist: `saveAnswerInParallel` → `POST /api/learning/answer` → `answers` table
4. Session lifecycle: `POST /api/learning/session/start` / `finish`

#### Pipeline B — Assigned activities

1. `POST /api/student/activities/:id/start` — loads question set
2. `submitAnswer` → `POST .../answer` → `recordStudentActivityAnswer` (server validation)
3. Scope routing: class → `classroom_activity_attempts`, parent → `parent_activity_attempts`, individual → `student_activity_*`
4. `POST .../submit` → final score

#### Pipeline C — Worksheets

`pages/student/worksheet/[worksheetId].js` → `POST /api/student/worksheet-activities/:id/submit`

**The scratchpad must not touch any of these submission paths.**

---

## 4. Timer and Time Credit System

| File | Role |
|------|------|
| `utils/learning-time-credit/question-time-ledger.js` | Per-question visibility-aware time ledger |
| `utils/learning-time-credit/master-integration.js` | `beginMasterQuestionLedger`, `finalizeMasterQuestionLedger` |
| `utils/learning-time-credit/compute-credited-ms.js` | Credit caps per topic |
| `utils/learning-time-credit/constants.js` | Tier caps |
| `utils/learning-time-credit/feature-flag.js` | `NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1` env flag |
| `hooks/useLearningVisibilityClock.js` | Tab visibility → ledger (pauses when tab hidden) |
| `utils/math-time-tracking.js` | Per-topic seconds in localStorage |

**Critical note on assigned activities:** The client currently hardcodes `timeSpentMs: 5000` for all assigned activity answers. This is a pre-existing quirk. The scratchpad must not worsen this.

**Scratchpad timer rule:** The scratchpad must never pause the existing timer. Time inside the scratchpad workspace must count as part of question time. No new timer logic is needed for Phase 1.

---

## 5. Reward System

| Reward | Trigger file | Notes |
|--------|-------------|-------|
| In-session streak | `math-master.js` (`handleAnswer`) | local state only |
| Daily subject streak | `utils/daily-streak.js` | localStorage |
| Monthly minutes | `utils/progress-storage.js` (`addSessionProgress`) | on session end |
| Session coins | `pages/api/learning/session/finish.js` → `lib/learning-supabase/learning-coin-award.server.js` | |
| Daily missions | `lib/learning-supabase/mission-progress.server.js` | |
| Monthly persistence coins | `lib/learning-supabase/monthly-persistence-reward.server.js` | batch job |

Assigned activities and worksheets do **not** go through the session coin/mission pipeline.

**Scratchpad impact:** Zero. The scratchpad does not generate answers, does not validate, does not call any API. Rewards are unaffected.

---

## 6. Parent and Teacher Reports

| Report | Source data | File |
|--------|-------------|------|
| Parent practice report | `learning_sessions` + `answers` (Supabase) + localStorage topic time | `lib/parent-server/report-data-aggregate.server.js`, `utils/parent-report-v2.js` |
| Parent activity report | `parent_activity_attempts` | same aggregate |
| Teacher class activity report | `classroom_activity_attempts` | `lib/teacher-server/classroom-activity-class-report.server.js` |
| Teacher individual | `student_activity_attempts` | teacher views |
| Diagnostic engine | `answers` + `learning_sessions` | `docs/qa/DIAGNOSTIC_REPORT_ENGINE_*` |

**Scratchpad impact:** Zero in Phase 1. No new database writes. No new columns. No new labels.

---

## 7. Mixed Hebrew/Math Rendering Components

| File | Role |
|------|------|
| `components/learning-book/MixedHebrewMathText.js` | Mixed RTL Hebrew + LTR math rendering (470 lines) |
| `lib/learning-book/book-visible-text-render.js` | Book-specific text rendering (276 lines) |
| `components/learning/StudentQuestionDisplay.jsx` | Question display with RTL/LTR split |
| `utils/student-question-display.js` | `resolveStudentQuestionDisplayParts` |

These components handle the RTL/LTR complexity. The scratchpad workspace is a separate UI panel and must **not** reuse or wrap these components for its own internal content.

---

## 8. Feature Flag System

Existing pattern (from `utils/learning-time-credit/feature-flag.js`):

```js
export function isFeatureEnabled() {
  if (typeof process !== "undefined" && process.env) {
    return process.env.NEXT_PUBLIC_FEATURE_NAME === "true";
  }
  return false;
}
```

The scratchpad should follow this exact pattern with `NEXT_PUBLIC_MATH_SCRATCHPAD_V1`.
Default must be `false` (off) until QA approval.

---

## 9. Learning Book Practice Wiring

| File | Role |
|------|------|
| `lib/learning-book/resolve-math-g1-practice-target.js` | Maps book page → operation key for grade 1 |
| … (g2–g6) | Same pattern for each grade |

These files connect learning book pages to the generator. The scratchpad mapping must use the same `operation` key as a lookup key when determining which scratchpad type to show.

---

## 10. Safe Attachment Points Summary

| Surface | Safe attach point | Risk level |
|---------|------------------|------------|
| Normal practice (`math-master.js`) | Near `<StudentQuestionDisplay>` (~line 4445) | Low — UI only |
| Assigned activity | Inside `StudentActivityQuestionSurface.jsx` | Medium — must not affect submit flow |
| Step-by-step modal | Must NOT appear inside modal | High — keep completely separate |
| Worksheet | Out of scope for Phase 1 | — |
| Geometry | Out of scope for Phase 1 | — |

---

## Open Questions for Owner

1. Should the scratchpad appear in assigned activities (Phase 1) or only in normal practice first?
2. Should the scratchpad be visible during the step-by-step explanation modal, or hidden?
3. Is there a mobile layout constraint for the scratchpad panel (side panel vs. modal)?
