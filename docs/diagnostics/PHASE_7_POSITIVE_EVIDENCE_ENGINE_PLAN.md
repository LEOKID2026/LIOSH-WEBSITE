# Phase 7 — Positive Evidence Engine: Implementation Plan

**Project:** Diagnostic Truth Fix  
**Phase:** 7 — Positive Evidence Engine  
**Date:** 2026-06-06  
**Revision:** 1  
**Status:** PLAN ONLY — awaiting owner approval before implementation  
**Prerequisite:** Phase 6 implementation **ACCEPTED** (2026-06-06)

---

> **NO APPLICATION CODE CHANGES WERE MADE in this document.**  
> This file is audit + plan only. Do not implement until owner approves scope below.

---

## 1. Goal

Add a structured **positive-evidence layer** so reports can identify real strengths and positive learning behaviors — not only weaknesses — with explicit thresholds and explicit “not enough data” states.

### Product rules (owner-approved constraints)

| Rule | Meaning |
|------|---------|
| No fake praise | A signal is emitted only when its threshold is met |
| No generic compliments without evidence | No fallback “keep practicing” as a positive signal |
| Thresholds required | Every positive signal has documented minimum evidence |
| Explicit thin data | `not_enough_data` is a first-class signal/reason, not silence |
| No UI/Hebrew/CSS | Structured internal payload only in Phase 7 |
| No Hebrew report copy | English/machine IDs only; human copy deferred |
| No coins/monthly changes | Audit only; no reward logic changes |
| No Phase 8 | MCQ metadata / distractor work deferred |
| No gameplay changes | Masters, timers, modes unchanged |

---

## 2. Current-State Audit

### 2.1 Where parent/teacher reports detect strengths today

| Consumer | Location | Current strength logic | Evidence quality |
|----------|----------|------------------------|------------------|
| **Parent insights (Hebrew)** | `lib/parent-server/parent-report-parent-facing.server.js` | `rankSubjectsByAccuracy` + `STRONG_ACCURACY=80` + `MIN_SUBJECT_ANSWERS=5` → one generic Hebrew line; `detectImprovement(dailyActivity)` on **mixed** daily counts | Partial — uses `diagnosticAccuracy` for subjects but improvement uses all-mode `dailyActivity` |
| **Parent home recommendations** | Same file | Weak-topic driven; no structured positive block | Weakness-first |
| **Teacher guidance v1** | `lib/teacher-server/teacher-recommendations.server.js` | `rankStrongTopics(subjects)` — `diagnosticAnswers ≥ 3`, `diagnosticAccuracy ≥ 80` → `strengthsForTeacher` | Low bar (3 answers); no behavior signals |
| **Teacher guidance v2** | `lib/teacher-server/teacher-guidance-v2.server.js` | `strengthUnits` when topic `diagnosticAnswers ≥ 3` and `accuracy ≥ 80` | Same low bar; Hebrew labels only in units, no behavior taxonomy |
| **Class report** | `lib/teacher-server/teacher-class-report.server.js` | `weaknessTopics` only (Phase 6 fixed to `diagnosticWrong`); **no class-level strengths** | Weakness-only rollup |
| **School physical class report** | `lib/school-server/school-physical-class-report.server.js` | Reuses `aggregateClassReportFromStudentPayloads` + `buildClassTeacherGuidanceV2` | Inherits teacher class guidance; no school-specific positive layer |
| **Detailed parent report (patterns)** | `utils/learning-patterns-analysis.js` | Rich strength/weakness Hebrew synthesis (`topStrengths`, `stable_mastery`, etc.) from row-level report | **Parallel legacy path** — separate from aggregator payload; not threshold-gated to diagnostic buckets consistently |
| **Competitive context (Phase 6)** | `lib/learning/competitive-context.js` | `competitiveContext.signals` — fluency/resilience/endurance candidates | Structured but **not** wired into strength consumers yet |

**Conclusion:** Strength detection today is **ad hoc**, **threshold-inconsistent** (3 vs 5 vs 8 answers depending on file), and **mostly Hebrew string heuristics** rather than a shared evidence engine. Competitive and book behaviors are aggregated but not interpreted as positive evidence.

### 2.2 Available fields in aggregated payload (post Phase 6)

| Field | Where | Bucket / meaning | Usable for Phase 7? |
|-------|-------|------------------|---------------------|
| `summary.diagnosticAnswers` | `report-data-aggregate.server.js` | Independent diagnostic only (excludes competitive + learning) | **Yes** — primary mastery/improvement denominator |
| `summary.diagnosticAccuracy` | Same | Independent diagnostic accuracy | **Yes** — mastery/improvement numerator |
| `summary.learningAnswers` | Same | Learning / guided mode (incl. step-by-step rows) | **Yes** — self-directed / guided behavior |
| `summary.stepByStepCount` | Same | Answers with `afterStepByStep=true` | **Yes** — step-by-step learner (with follow-on success gate) |
| `subjects.*.topics.*.diagnosticAnswers` | Topic slices | Per-topic independent diagnostic | **Yes** — topic mastery / not_enough_data |
| `subjects.*.topics.*.diagnosticAccuracy` | Topic slices | Per-topic independent diagnostic | **Yes** |
| `subjects.*.topics.*.correctManyHintsAnswers` | Topic slices | Correct after many hints | **Yes** — persistence_candidate |
| `subjects.*.topics.*.stepByStepCount` | Topic slices | Per-topic step-by-step usage | **Yes** — step_by_step_learner |
| `subjects.*.topics.*.learningAnswers` | Topic slices | Per-topic learning mode | **Yes** — self_directed_learning |
| `subjects.*.topics.*.competitiveAnswers` | Topic slices | Competitive only | **Reference only** — never normal mastery |
| `learningActivity.bookReadingMinutes` | `mergeLearningActivityBookData` | Credited visible dwell (Phase 5) | **Yes** — book gates (not mastery alone) |
| `learningActivity.bookPagesRead` | Same | Pages meeting read threshold | **Yes** — supporting evidence |
| `learningActivity.postBookPracticeCount` | Same | Answers with `contextAfterBookReading=true` | **Yes** — post_book_practice |
| `learningActivity.bookSessionCount` | Same | Book sessions in range | Supporting |
| `competitiveContext` | Top-level (Phase 6) | Per-mode stats + `signals[]` | **Yes** — import competitive positive signals |
| `dailyActivity[]` | Top-level | **Mixed** all-mode `{ date, answers, correct, wrong }` | **Risky** — Phase 7 must add diagnostic-only daily rollup or recompute |
| `recentMistakes` | Top-level | Wrong answers (competitive excluded Phase 6) | **Yes** — weakness must remain visible alongside positives |
| `meta._rawActivityAccuracy` | Internal only | Mixed all modes | **Must not use** for positive claims |

### 2.3 What is missing today

| Gap | Impact |
|-----|--------|
| No `positiveEvidence` structured payload | Consumers cannot share one strength taxonomy |
| No `not_enough_data` per topic/subject | Thin data → either silence or over-confident Hebrew lines |
| No diagnostic-only `dailyActivity` | `detectImprovement` in parent insights uses mixed counts — can false-positive/negative |
| No post-book per-topic accuracy rollup | `postBookPracticeCount` is count-only; no accuracy gate for `post_book_improvement` |
| No step-by-step → independent success linkage | `stepByStepCount` alone does not prove later independent mastery |
| No `practice_mistakes` retry-success tracking | `retry_success` cannot be derived from current slices |
| No `diagnosticConfidence` on topic slices | Master plan requirement still absent |
| Competitive signals not in strength layer | `competitiveContext.signals` exist but no consumer treats them as positive evidence |
| Class/school reports lack positive rollup | Only `weaknessTopics` / risk signals |
| `learning-patterns-analysis.js` not aligned | Separate Hebrew strength engine may contradict diagnostic-truth payload |

---

## 3. Proposed Positive Evidence Signals

All signals are **machine-readable IDs** with structured `evidence` objects. No Hebrew copy in Phase 7.

### 3.1 Diagnostic mastery family (independent practice only)

| Signal ID | Meaning | Must NOT use |
|-----------|---------|--------------|
| `mastery_candidate` | Strong independent diagnostic performance in a topic or subject | `competitiveAccuracy`, `learningAnswers`, book minutes |
| `stable_mastery` | Mastery sustained across time / low drift | Single-session spikes, step-by-step-only success |
| `improvement_candidate` | Diagnostic accuracy trending up over multiple days | Mixed `dailyActivity`, competitive modes |
| `not_enough_data` | Explicit insufficient diagnostic evidence for claims | N/A — meta signal |

### 3.2 Learning-behavior family (positive but not mastery)

| Signal ID | Meaning | Must NOT use |
|-----------|---------|--------------|
| `persistence_candidate` | Kept going and succeeded after heavy hint use | Competitive or book-only activity |
| `self_directed_learning` | Learning-mode engagement followed by solid independent practice | Book reading alone |
| `step_by_step_learner` | Used step-by-step, then succeeded independently in same topic | Step-by-step count without later independent success |
| `post_book_practice` | Practiced after credited book reading | Book pages alone without practice |
| `post_book_improvement` | Post-book practice with good diagnostic accuracy | `mode=learning` CTA answers (non-diagnostic) |
| `retry_success` | Correct targeted retries after prior struggle in topic | First-attempt luck without prior wrongs |

### 3.3 Competitive family (import from Phase 6 — separate bucket)

| Signal ID | Source | Meaning |
|-----------|--------|---------|
| `speed_fluency_candidate` | `competitiveContext.signals` | Fast accurate retrieval under pressure |
| `challenge_resilience_candidate` | `competitiveContext.signals` | Challenge attempt with meaningful success |
| `marathon_endurance_candidate` | `competitiveContext.signals` | Sustained competitive effort |
| `marathon_consistency_candidate` | `competitiveContext.signals` (optional pass-through) | Stable accuracy under marathon load |

**Note:** `challenge_attempt` from Phase 6 is behavioral (attempted harder mode) but is **not** a mastery signal — include under `positiveEvidence.behaviors.competitive` only.

### 3.4 Signal emission rules (no fake praise)

1. If no signal threshold is met, emit **zero** positive signals for that scope (not a compliment placeholder).
2. If scope has activity but below diagnostic minimum, emit `not_enough_data` with counts and `required` threshold.
3. A topic may emit **both** `mastery_candidate` and `not_enough_data` at different scopes (e.g., subject sufficient, topic thin) — scopes must be explicit.
4. Weakness paths (`recentMistakes`, `weaknessTopics`, low `diagnosticAccuracy`) **remain** even when positive signals exist.

---

## 4. Thresholds (Conservative Proposal)

Aligned with master plan `diagnostic_truth_fix_plan_59fa56fa.plan.md` §Phase 7, tightened for diagnostic safety.

### 4.1 Global / confidence gates

| Gate | Threshold | Applies to |
|------|-----------|--------------|
| Topic diagnostic minimum | `diagnosticAnswers < 5` → `not_enough_data` | Any topic-level mastery/weakness claim |
| Subject diagnostic minimum | `diagnosticAnswers < 8` → `not_enough_data` | Subject-level mastery/improvement |
| Student summary minimum | `summary.diagnosticAnswers < 5` → student-level `not_enough_data` | Overall positive summary |

### 4.2 Per-signal thresholds

| Signal ID | Minimum evidence | Notes |
|-----------|------------------|-------|
| `mastery_candidate` | Topic: `diagnosticAnswers ≥ 8` AND `diagnosticAccuracy ≥ 80%` | Subject-level: `≥ 10` answers, same accuracy |
| `stable_mastery` | `mastery_candidate` met AND diagnostic activity on `≥ 2` distinct days AND second-half diagnostic accuracy within `10%` of first-half OR both halves `≥ 75%` | Requires new diagnostic daily rollup |
| `improvement_candidate` | `≥ 4` distinct days with `diagnosticAnswers ≥ 1` each; second-half diagnostic accuracy > first-half by `≥ 8%` | Diagnostic-only daily buckets |
| `persistence_candidate` | Topic or subject: `diagnosticAnswers ≥ 5` AND `correctManyHintsAnswers ≥ 2` | Hints = existing aggregator field |
| `self_directed_learning` | `learningAnswers ≥ 15` (or `≥ 3` learning sessions) AND subsequent independent diagnostic answers `≥ 8` with `diagnosticAccuracy ≥ 70%` | “Subsequent” = same subject, practice/graded modes, not `afterStepByStep` |
| `post_book_practice` | `bookReadingMinutes ≥ 5` (credited) AND `postBookPracticeCount ≥ 3` | Book time from Phase 5 dwell policy |
| `post_book_improvement` | `≥ 5` answers with `contextAfterBookReading=true` AND accuracy `≥ 65%` on those answers only | Requires new post-book correct/total accumulator |
| `step_by_step_learner` | Topic: `stepByStepCount ≥ 3` AND `≥ 5` independent diagnostic answers in same topic with `diagnosticAccuracy ≥ 65%` where independent answers occur **after** first step-by-step use in range | Requires per-topic ordering flag in accumulator |
| `retry_success` | `≥ 3` correct `practice_mistakes` answers in topic where `diagnosticWrong ≥ 2` earlier in same range | Requires mode-aware per-topic retry accumulator |
| `speed_fluency_candidate` | Reuse Phase 6: `≥ 15` speed answers, `≥ 70%` | From `competitiveContext` |
| `challenge_resilience_candidate` | Reuse Phase 6: `≥ 10` challenge answers, `≥ 55%` | From `competitiveContext` |
| `marathon_endurance_candidate` | Reuse Phase 6: `≥ 30` marathon answers | From `competitiveContext` |
| `not_enough_data` | Below relevant minimum for scope | Always includes `{ diagnosticAnswers, required, scope }` |

### 4.3 Explicit non-claims (diagnostic safety)

| Activity | Cannot produce |
|----------|----------------|
| Book reading only | `mastery_candidate`, `stable_mastery` |
| `learning` / step-by-step only | `mastery_candidate` (may produce `step_by_step_learner` with follow-on gate) |
| Competitive modes | `mastery_candidate`, `improvement_candidate` (competitive signals only) |
| `practice_mistakes` alone | `mastery_candidate` (may produce `retry_success`) |
| `< 5` diagnostic answers in topic | Any mastery/improvement claim — only `not_enough_data` |

---

## 5. Payload Design

### 5.1 Top-level field (internal structured only)

Add **`positiveEvidence`** as a **top-level** sibling of `competitiveContext` (not inside `summary`).

```js
positiveEvidence: {
  version: "phase-7-positive-evidence-v1",
  student: {
    diagnosticAnswers: number,
    diagnosticAccuracy: number,
    confidence: "sufficient" | "insufficient",
    signals: Signal[],           // student-scope only
    notEnoughData: NotEnoughDataEntry[],
  },
  bySubject: {
    [subject]: {
      diagnosticAnswers: number,
      diagnosticAccuracy: number,
      confidence: "sufficient" | "insufficient",
      signals: Signal[],
      notEnoughData: NotEnoughDataEntry[],
    },
  },
  byTopic: [
    {
      subject: string,
      topic: string,
      diagnosticAnswers: number,
      diagnosticAccuracy: number,
      diagnosticConfidence: "sufficient" | "insufficient",  // topic slice mirror
      signals: Signal[],
      notEnoughData: NotEnoughDataEntry[],
    },
  ],
  behaviors: {
    book: { signals: Signal[] },
    learning: { signals: Signal[] },      // self_directed, step_by_step, persistence
    competitive: { signals: Signal[] },   // passthrough from competitiveContext.signals
    retry: { signals: Signal[] },
  },
  meta: {
    diagnosticDailyDays: number,          // count of days used for improvement
    thresholdsVersion: "2026-06-phase7",
  },
}
```

### 5.2 `Signal` object shape

```js
{
  id: "mastery_candidate",           // enum from §3
  scope: "topic" | "subject" | "student" | "behavior",
  subject?: string,
  topic?: string,
  evidence: {
    diagnosticAnswers?: number,
    diagnosticAccuracy?: number,
    correctManyHintsAnswers?: number,
    bookReadingMinutes?: number,
    postBookPracticeCount?: number,
    stepByStepCount?: number,
    mode?: string,
    // ... only fields relevant to this signal
  },
  source: "aggregator" | "competitive_context",
}
```

### 5.3 `NotEnoughDataEntry` shape

```js
{
  id: "not_enough_data",
  scope: "topic" | "subject" | "student",
  subject?: string,
  topic?: string,
  diagnosticAnswers: number,
  required: number,
  reason: "below_diagnostic_minimum",
}
```

### 5.4 Topic slice addition (optional but recommended)

Add to each topic slice in aggregator output:

```js
diagnosticConfidence: "sufficient" | "insufficient"
```

Rule: `insufficient` when `diagnosticAnswers < 5`; otherwise `sufficient`. Does **not** change `diagnosticAccuracy` computation.

### 5.5 Strip / API contract

| Field | In `stripInternalReportPayloadFields` |
|-------|--------------------------------------|
| `positiveEvidence` | **Preserve** (like `competitiveContext`) |
| `diagnosticConfidence` on topics | **Preserve** |
| `meta._rawActivityAccuracy` | Continue stripping |

`meta.version` → `"phase-7-positive-evidence"` after implementation.

### 5.6 No Hebrew copy

Phase 7 emits IDs + numeric evidence only. Parent/teacher Hebrew surfaces **must not** be added until a separate UI/copy approval phase.

---

## 6. Consumer Plan (Later Phases — Not Phase 7 Implementation)

Phase 7 **wires payload + pass-through only**. Hebrew/UI consumption is documented here for sequencing.

| Consumer | Phase 7 action | Future use |
|----------|----------------|------------|
| **Parent report API** | `stripInternalReportPayloadFields` preserves `positiveEvidence` | `buildParentInsightsHe` reads signals instead of ad hoc `STRONG_ACCURACY` heuristics; map IDs → Hebrew in copy phase |
| **Guardian report** | Pass-through via `guardian-report.server.js` | Same as parent |
| **Teacher student report** | `teacher-report.server.js` + `report-data-adapter.js` pass-through | `teacher-guidance-v2` adds `positiveEvidence` block; `strengthUnits` derived from `mastery_candidate` / `stable_mastery` (higher bar) |
| **Teacher recommendations v1** | Pass-through | `strengthsForTeacher` uses `positiveEvidence.byTopic` not raw `rankStrongTopics` at 3 answers |
| **Class report** | `teacher-class-report.server.js` optional `strengthTopics` rollup from student payloads | Class-level “common strengths” — topics where `≥ N` students have `mastery_candidate` |
| **School physical class report** | Inherits class aggregation | School dashboard highlights cohort positive behaviors (book, persistence) without peer ranking |
| **Parent Copilot / insight packet** | Pass-through in sanitized payload | Contract reader can cite `positiveEvidence.signals[].id` as grounding |
| **learning-patterns-analysis.js** | **No change in Phase 7** | Later reconciliation: prefer aggregator `positiveEvidence` over row heuristics |

---

## 7. Diagnostic Safety Rules (Mandatory)

| ID | Rule |
|----|------|
| D7-1 | Positive evidence **must not** modify `diagnosticAccuracy`, `diagnosticAnswers`, or `diagnosticCorrect/Wrong` |
| D7-2 | `mastery_candidate` / `stable_mastery` use **independent diagnostic** counts only (`evidenceCategory !== diagnostic_competitive`, not `afterStepByStep`) |
| D7-3 | Competitive success **must not** produce mastery signals — only `behaviors.competitive` passthrough |
| D7-4 | Book reading **must not** alone produce mastery — only `post_book_*` behavior signals with practice gates |
| D7-5 | Step-by-step usage **must not** alone produce mastery — requires later independent diagnostic success in same topic |
| D7-6 | `not_enough_data` **must** be emitted when below minimum — never substitute a positive signal |
| D7-7 | Real weaknesses **remain visible**: low `diagnosticAccuracy`, `recentMistakes`, `weaknessTopics` unchanged by positive layer |
| D7-8 | Improvement uses **diagnostic-only daily** rollup — not mixed `dailyActivity` |
| D7-9 | Phase 4/5/6 tests remain green — Phase 7 is additive |
| D7-10 | No consumer may use `accuracy`, `_rawActivityAccuracy`, or `competitiveAccuracy` for mastery claims |

---

## 8. Files Likely to Modify

### New files

| File | Purpose |
|------|---------|
| `lib/learning/positive-evidence.js` | Pure helpers: threshold constants, signal derivation, `buildPositiveEvidence()` |
| `tests/learning/phase7-positive-evidence.test.mjs` | Phase 7 test gate |

### Modified files

| File | Change |
|------|--------|
| `lib/parent-server/report-data-aggregate.server.js` | Diagnostic daily rollup; post-book / retry / step-by-step ordering accumulators; `positiveEvidence` top-level; `diagnosticConfidence` on topic slices; `meta.version` bump |
| `lib/learning-supabase/report-data-adapter.js` | Pass through `positiveEvidence` |
| `lib/teacher-server/teacher-guidance-v2.server.js` | Attach `positiveEvidence` on guidance base object (pass-through, no Hebrew) |
| `lib/guardian-server/guardian-report.server.js` | Verify pass-through after strip (likely no logic change) |
| `lib/teacher-server/teacher-report.server.js` | Verify pass-through (likely no logic change) |
| `tests/learning/phase4-aggregate-filter.test.mjs` | Regression + `meta.version` assertion update |
| `tests/learning/phase5-book-tracking.test.mjs` | Regression — book branch unchanged |
| `tests/learning/phase6-competitive-context.test.mjs` | Regression — competitive isolation unchanged |

### Files explicitly NOT modified (Phase 7)

| File | Reason |
|------|--------|
| `lib/parent-server/parent-report-parent-facing.server.js` | No Hebrew/UI changes |
| `utils/learning-patterns-analysis.js` | Parallel legacy path; reconciliation deferred |
| `lib/learning/activity-classification.js` | No blocker; classification matrix sufficient |
| `lib/learning-supabase/monthly-persistence-reward.server.js` | Coins/monthly out of scope |
| `lib/learning-supabase/learning-coin-award.server.js` | Coins/monthly out of scope |
| `pages/learning/*-master.js` | No gameplay changes |
| `lib/learning/competitive-context.js` | Reuse signals; do not duplicate thresholds |
| School/parent UI pages + CSS | Out of scope |
| Phase 8 MCQ / distractor modules | Deferred |

---

## 9. Tests Required (Phase 7 Gate)

| Category | Test |
|----------|------|
| **No praise on thin data** | Topic with 2 diagnostic answers → `not_enough_data` emitted, **no** `mastery_candidate` |
| **Mastery threshold** | Topic 9/10 diagnostic correct (independent) → `mastery_candidate` with evidence |
| **Mastery blocked** | Topic 9/10 competitive correct only → **no** `mastery_candidate` |
| **Stable mastery** | Mastery + 2+ diagnostic days + stable halves → `stable_mastery` |
| **Improvement threshold** | 4+ days diagnostic daily; second half +8% → `improvement_candidate` |
| **Improvement safety** | Mixed-mode daily improvement without diagnostic rollup → **no** `improvement_candidate` |
| **Book reading positive** | `bookReadingMinutes ≥ 5` + `postBookPracticeCount ≥ 3` → `post_book_practice`; book alone → **no** mastery |
| **Post-book improvement** | 5+ `contextAfterBookReading` answers at 65%+ → `post_book_improvement` |
| **Step-by-step gate** | `stepByStepCount ≥ 3` without independent success → **no** `step_by_step_learner` |
| **Step-by-step success** | Step-by-step then `≥ 5` independent diagnostic at 65%+ in topic → `step_by_step_learner` |
| **Retry success** | `practice_mistakes` correct after `diagnosticWrong ≥ 2` → `retry_success` |
| **Persistence** | `correctManyHintsAnswers ≥ 2` with `≥ 5` diagnostic answers → `persistence_candidate` |
| **Competitive separate** | `competitiveContext` speed signal → appears under `positiveEvidence.behaviors.competitive`, not mastery |
| **Weakness still visible** | Topic with `mastery_candidate` AND `diagnosticWrong ≥ 1` → weaknesses unchanged in `recentMistakes` / topic slices |
| **Payload placement** | `positiveEvidence` top-level; not inside `summary` |
| **Strip contract** | `stripInternalReportPayloadFields` preserves `positiveEvidence` |
| **Regression Phase 4/5/6** | Existing test files pass |
| **Build** | `npm run build` passes |

---

## 10. Implementation Order (After Approval)

1. `lib/learning/positive-evidence.js` — thresholds + pure `derivePositiveSignals()` / `buildPositiveEvidence()`
2. Aggregator accumulators — diagnostic daily, post-book accuracy, retry, step-by-step ordering
3. Aggregator — emit `positiveEvidence` + `diagnosticConfidence` on topics
4. Pass-through — adapter, teacher-guidance-v2 (structured field only)
5. `tests/learning/phase7-positive-evidence.test.mjs` + Phase 4/5/6 regression
6. `npm run build`
7. Implementation report for owner (no commit until requested)

---

## 11. Out of Scope (Phase 7)

- Phase 8 MCQ metadata / distractor families
- Phase 9 coins/monthly single-truth
- Phase 10 all-consumer verification + Hebrew copy rollout
- New Hebrew insight strings, UI components, CSS
- Rewriting `buildParentInsightsHe` or `learning-patterns-analysis.js`
- Class `strengthTopics` rollup (optional follow-up within Phase 7+ if owner expands scope)
- Changing `activity-classification.js` or gameplay
- Parent Copilot prompt / LLM grounding changes

---

## 12. Owner Approval Checklist

Before implementation, confirm:

- [ ] Signal ID list in §3 acceptable (including `stable_mastery` vs `mastery_candidate` split)
- [ ] Threshold table in §4 acceptable (especially topic min 5 / mastery min 8)
- [ ] `positiveEvidence` top-level payload shape in §5 acceptable
- [ ] `diagnosticConfidence` on topic slices approved
- [ ] Diagnostic-only daily rollup for improvement approved (small aggregator addition)
- [ ] Competitive signals: passthrough from `competitiveContext` only (no re-derivation)
- [ ] Explicit exclusion: no Hebrew/UI work in Phase 7

---

## 13. References

| Document | Relevance |
|----------|-----------|
| `.cursor/plans/diagnostic_truth_fix_plan_59fa56fa.plan.md` §Phase 7 | Master thresholds and signal list |
| `docs/diagnostics/PHASE_6_COMPETITIVE_CONTEXT_PLAN.md` | Competitive signal passthrough pattern |
| `docs/diagnostics/PHASE_5_LEARNING_BOOK_TRACKING_ARCHITECTURE_AUDIT.md` §5.5 | Post-book classification semantics |
| `lib/learning/competitive-context.js` | Phase 6 competitive signal IDs |
| `lib/parent-server/report-data-aggregate.server.js` | Aggregation source of truth |
| `tests/learning/phase6-competitive-context.test.mjs` | Regression baseline |

---

*End of Phase 7 plan — implementation blocked until owner approval.*
