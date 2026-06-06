# Phase 6 — Competitive Context: Implementation Plan

**Project:** Diagnostic Truth Fix  
**Phase:** 6 — Competitive Context (`challenge`, `speed`, `marathon`)  
**Date:** 2026-06-06  
**Revision:** 1  
**Status:** PLAN ONLY — awaiting owner approval before implementation  
**Prerequisite:** Phase 5 post-SQL verification **PASS** (2026-06-06)

---

> **NO APPLICATION CODE CHANGES WERE MADE in this document.**  
> This file is audit + plan only. Do not implement until owner approves scope below.

---

## 1. Goal

Add correct interpretation for `challenge`, `speed`, and `marathon` as **contextual competitive evidence** — without treating them like normal independent practice and without letting competitive mistakes drive normal weakness logic.

### Product rules (owner-approved constraints)

| Rule | Meaning |
|------|---------|
| Not normal practice | Competitive modes must not be interpreted as cold diagnostic practice |
| No weakness from competitive alone | Do not rank competitive mistakes as normal topic/subject weakness |
| Separate from `diagnosticAccuracy` | Competitive stays in its own bucket (Phase 4); Phase 6 closes downstream leaks |
| Contextual evidence | `speed` = fluency/retrieval speed; `challenge` = difficulty tolerance; `marathon` = endurance |
| No coins/monthly changes | Audit only in Phase 6; no changes to coin or monthly persistence logic |
| No UI/Hebrew/CSS | Unless owner explicitly approves copy/components in a follow-up approval |
| No Phase 7 | Positive evidence engine thresholds/signals deferred |

---

## 2. Current-State Map (Audit)

### 2.1 Where competitive modes are started / generated

| Layer | Location | Behavior |
|-------|----------|----------|
| **UI mode picker** | All 6 masters: `math-master.js`, `geometry-master.js`, `science-master.js`, `hebrew-master.js`, `english-master.js`, `moledet-geography-master.js` | Mode strip includes `["learning", "challenge", "speed", "marathon"]` (+ practice where applicable) |
| **Mode constants** | `utils/*-constants.js` (e.g. `utils/math-constants.js` → `MODES`) | Hebrew display names for modes exist in constants (pre-existing; not Phase 6 scope) |
| **Game start** | Each master `startGame` / session bootstrap | `setLives(3)` for challenge; timers for challenge/speed; marathon = unlimited questions until exit |
| **Canonical report mode** | `utils/report-track-meta.js` → `reportModeFromGameState(mode, focusedPracticeMode)` | Returns `"challenge"`, `"speed"`, `"marathon"` unchanged; practice sub-modes mapped separately |
| **Classification** | `lib/learning/activity-classification.js` → `MODE_CLASSIFICATION_MAP` | All three → `evidenceCategory: "diagnostic_competitive"`, `isDiagnosticEligible: true` |

**Generation flow (per answer):**

```
Master UI (mode state)
  → startLearningSession({ mode: reportModeFromGameState(...) })
  → saveLearningAnswer({ ... clientMeta, gameMode in answer_payload via session })
  → pages/api/learning/answer.js → classifyActivityEvidence(sessionMode, ...)
  → answer_payload stores evidenceCategory + isDiagnosticEligible + contextFlags
```

### 2.2 What mode is stored in DB

| Table / field | Stored value |
|---------------|--------------|
| `learning_sessions.metadata.mode` | Normalized mode from `body.mode` at session start (`pages/api/learning/session/start.js`) |
| `learning_sessions.metadata.summary` | Finish summary including accuracy, counts (`pages/api/learning/session/finish.js`) |
| `answers.answer_payload.gameMode` | Session mode at answer time (from `sessionMeta.mode` in answer API) |
| `answers.answer_payload.evidenceCategory` | Phase 1+ stored classification (`diagnostic_competitive` for competitive modes) |
| `answers.answer_payload.isDiagnosticEligible` | `true` for competitive (eligible but separate bucket) |
| `answers.answer_payload.modeCounts` | Not per-row; aggregator builds `modeCounts` enum histogram |

### 2.3 How Phase 4 routes competitive answers today

**File:** `lib/parent-server/report-data-aggregate.server.js`

| Bucket | Routing rule | Fields updated |
|--------|--------------|----------------|
| **Independent diagnostic** | `isDiagnosticEligible && evidenceCategory !== diagnostic_competitive` | `diagnosticAnswers`, `diagnosticCorrect`, `diagnosticWrong`, `diagnosticAccuracy` |
| **Competitive** | `evidenceCategory === diagnostic_competitive` | `competitiveAnswers`, `competitiveCorrect`, `competitiveAccuracy` |
| **Learning** | `!isDiagnosticEligible` | `learningAnswers`, `stepByStepCount` |

**Confirmed:** `challenge` / `speed` / `marathon` answers increment `competitiveAnswers`, **not** `diagnosticAnswers` (see `tests/learning/phase4-aggregate-filter.test.mjs`).

**Also still updated for ALL answers (including competitive):**

- Raw slice metrics via `applyAnswerMetricsToSlice`: `answers`, `correct`, `wrong`, `accuracy` (legacy/internal mix)
- `modeCounts[mode]` histogram on subject/topic slices
- Fluency side-metrics (`wrongFastAnswers`, `correctSlowAnswers`, etc.) — not gated by bucket

### 2.4 Report / insight consumers of `competitiveAccuracy`

| Consumer | Reads `competitiveAccuracy`? | Notes |
|----------|------------------------------|-------|
| `aggregateParentReportPayload` output | **Emits** `summary.competitive*` + `subjects.*.competitive*` | Present in payload |
| `stripInternalReportPayloadFields` | **Preserves** competitive fields | Only strips raw `accuracy` + `_rawActivityAccuracy` |
| `lib/parent-server/parent-report-parent-facing.server.js` | **No** | Uses `diagnosticAccuracy`, `diagnosticAnswers`, `recentMistakes` |
| `lib/teacher-server/teacher-guidance-v2.server.js` | **No** | Topic weakness uses `diagnosticAnswers` gate; mistakes from `recentMistakes` |
| `lib/teacher-server/teacher-recommendations.server.js` | **No** | Uses `recentMistakes` for recommendations |
| `lib/teacher-server/teacher-class-report.server.js` | **No** | Class `weaknessTopics` built from `topic.wrong` (raw) |
| `lib/teacher-server/classroom-activity-class-report.server.js` | **Partial** | Merges `competitiveAnswers` for assigned classroom activities |
| `lib/learning-supabase/report-data-adapter.js` | **No** | Passes through payload; sanitizes `recentMistakes` only |
| Parent Copilot / insight packet | **No competitive-specific logic found** | Uses aggregated report payload |

**Gap:** Competitive data is **aggregated but not interpreted**. No consumer applies speed/challenge/marathon semantics.

### 2.5 Weakness ranking contamination (current leaks)

| Path | Issue | Severity |
|------|-------|----------|
| **`recentMistakes`** (`report-data-aggregate.server.js` ~L863) | Every wrong answer pushed — **includes competitive modes**; stores `mode` but insight builders **do not filter** | **High** |
| **`buildParentInsightsHe`** | `topMistakeSubjects(recentMistakes)` → "יש טעויות חוזרות ב…" without mode filter | **High** |
| **`teacher-guidance-v2`** | `wrongEventsForTopic(recentMistakes, …)` drives recurrence/taxonomy for weakness units — **no competitive filter** | **High** |
| **`teacher-class-report`** | `weaknessTopics` uses `topic.wrong` (raw), not `diagnosticWrong` | **Medium** |
| **`rankWeakTopics` (parent)** | Uses `diagnosticAnswers` + `diagnosticAccuracy` | **Low risk** — competitive excluded from diagnostic counts |
| **`rankSubjectsByAccuracy` (parent)** | Uses `diagnosticAccuracy` | **Low risk** |

**Conclusion:** Phase 4 fixed `diagnosticAccuracy` isolation, but **mistake/weakness pipelines still treat competitive wrong answers as normal practice mistakes**.

### 2.6 Coins / monthly progress (audit only)

| System | Competitive mode handling | Phase 6 action |
|--------|-------------------------|----------------|
| **`learning-coin-award.server.js`** | `awardLearningSessionCoins` — no mode check; uses `durationSeconds` + session `accuracy` from finish body | **Audit only** — confirm no zero-coin path for challenge/speed/marathon |
| **`monthly-persistence-reward.server.js`** | Queries `learning_sessions.duration_seconds` only; **no mode filter** | **Audit only** — competitive sessions count same as practice |
| **Time credit tiers** | `utils/learning-time-credit/classify-question-tier.js`: `challenge`/`speed` → `legacy_game` (120s cap); `marathon` → `default` (300s) | Document only; no change |

**Conclusion:** Coins/monthly do not penalize competitive modes today. Phase 6 must **not** change this behavior.

### 2.7 Missing pieces vs master plan

| Planned (Diagnostic Truth Fix plan) | Current state |
|-------------------------------------|---------------|
| `subjects[subject].byMode.speed.*` per-mode competitive breakdown | **Not implemented** — only aggregate `competitive*` + `modeCounts` |
| `detectCompetitiveSignals()` in parent insights | **Not implemented** |
| Competitive insights in Hebrew parent copy | **Not implemented** (and blocked without UI/Hebrew approval) |
| Exclude competitive from weakness | **Not implemented** |

---

## 3. Gaps Phase 6 Must Close

1. **Weakness isolation** — competitive wrong answers must not feed `recentMistakes` weakness paths (or must be explicitly excluded by all consumers).
2. **Structured competitive context** — payload must expose per-mode competitive stats usable by reports/insights without reading raw mixed `accuracy`.
3. **Interpretation hooks** — internal signal IDs for speed/challenge/marathon (fluency, resilience, endurance) attached to payload; Hebrew surfacing deferred unless approved.
4. **Class weakness rollup** — `teacher-class-report` should use diagnostic/competitive-aware fields, not raw `topic.wrong`.
5. **Verification tests** — lock competitive/non-competitive separation and weakness exclusion.

---

## 4. Proposed Minimal Implementation (Post-Approval)

### 4.1 Aggregator (`report-data-aggregate.server.js`)

**Add** `competitiveContext` object (top-level or under `summary`):

```js
competitiveContext: {
  totalAnswers, totalCorrect, overallAccuracy,  // mirror summary competitive*
  byMode: {
    challenge: { answers, correct, accuracy, avgTimeMs? },
    speed:     { answers, correct, accuracy, avgTimeMs?, wrongFastCount? },
    marathon:  { answers, correct, accuracy, sessionCount? },
  },
  signals: [  // machine-readable, English ids — no Hebrew in Phase 6 unless approved
    { id: "speed_fluency_candidate", mode: "speed", ... },
    { id: "challenge_attempt", mode: "challenge", ... },
    { id: "marathon_endurance_candidate", mode: "marathon", ... },
  ],
}
```

**Change** `recentMistakes` collection:

- **Option A (recommended):** Do not push competitive-mode wrong answers into `recentMistakes`.
- **Option B:** Push with `evidenceCategory: "diagnostic_competitive"` and filter in all consumers.

**Change** class-report inputs (via cleaner topic fields):

- Ensure topic slices expose `diagnosticWrong` as canonical weakness input; document that `wrong` is legacy mixed.

**Do not change:** `diagnosticAccuracy` formulas, Phase 1 classification, coin/monthly modules.

### 4.2 Insight builders (logic only; Hebrew gated)

| File | Change |
|------|--------|
| `parent-report-parent-facing.server.js` | Exclude competitive mistakes from weakness heuristics; optionally read `competitiveContext.signals` — **no new Hebrew strings without approval** |
| `teacher-guidance-v2.server.js` | Filter `wrongEventsForTopic` to independent diagnostic only; add non-Hebrew `competitiveContext` block in teacher guidance JSON |
| `teacher-recommendations.server.js` | Same `recentMistakes` filter |
| `teacher-class-report.server.js` | Build `weaknessTopics` from `diagnosticWrong` (fallback rules documented) |

### 4.3 New shared helper (recommended)

**File:** `lib/learning/competitive-context.js` (new, pure functions)

- `isCompetitiveGameMode(mode)` → `challenge|speed|marathon`
- `accumulateCompetitiveByMode(slice, mode, isCorrect, timeMs)`
- `deriveCompetitiveSignals(byMode)` → signal IDs + thresholds (aligned with master plan §Phase 6, deferred Hebrew to Phase 7/approval)

### 4.4 Classification

**No change expected** to `activity-classification.js` unless audit finds misclassified rows. Competitive modes already map to `diagnostic_competitive`.

---

## 5. Exact Files Likely to Modify

### New files

| File | Purpose |
|------|---------|
| `lib/learning/competitive-context.js` | Pure helpers: mode checks, per-mode accumulation, signal derivation |
| `tests/learning/phase6-competitive-context.test.mjs` | Phase 6 test gate |

### Modified files

| File | Change |
|------|--------|
| `lib/parent-server/report-data-aggregate.server.js` | `competitiveContext` branch; `recentMistakes` competitive exclusion; per-mode competitive stats |
| `lib/parent-server/parent-report-parent-facing.server.js` | Weakness heuristics skip competitive mistakes |
| `lib/teacher-server/teacher-guidance-v2.server.js` | Weakness/recurrence skips competitive; attach competitive context |
| `lib/teacher-server/teacher-recommendations.server.js` | Mistake-based recommendations skip competitive |
| `lib/teacher-server/teacher-class-report.server.js` | `weaknessTopics` uses diagnostic-aware wrong counts |
| `lib/learning-supabase/report-data-adapter.js` | Pass through `competitiveContext` if present |
| `tests/learning/phase4-aggregate-filter.test.mjs` | Regression: competitive still isolated from `diagnosticAccuracy` |

### Files explicitly NOT modified (Phase 6)

| File | Reason |
|------|--------|
| `lib/learning-supabase/monthly-persistence-reward.server.js` | Coins/monthly out of scope |
| `lib/learning-supabase/learning-coin-award.server.js` | Audit/test only |
| `pages/learning/*-master.js` | No gameplay/UI changes |
| `lib/learning/activity-classification.js` | Phase 1 matrix already correct |
| Phase 7 positive evidence modules | Deferred |

---

## 6. Diagnostic Safety Rules (Mandatory)

| ID | Rule |
|----|------|
| D6-1 | `challenge`/`speed`/`marathon` answers **never** increment `diagnosticAnswers` / `diagnosticCorrect` / `diagnosticWrong` |
| D6-2 | `diagnosticAccuracy` **unchanged** when only competitive activity occurs |
| D6-3 | Competitive wrong answers **must not** appear in `recentMistakes` used for weakness (or must be filtered at every consumer) |
| D6-4 | Topic/subject weakness ranking **must not** use raw `topic.wrong` if it includes competitive wrongs |
| D6-5 | `competitiveAccuracy` **must not** be blended into `diagnosticAccuracy` in any human-facing consumer |
| D6-6 | `evidenceCategory=diagnostic_competitive` rows **must not** enter independent diagnostic weakness taxonomy |
| D6-7 | Phase 4 tests remain green — Phase 6 is additive + leak-fix only |

---

## 7. Interpretation Thresholds (for `competitiveContext.signals`)

Aligned with master plan; used for **structured signals only** (not weakness):

| Mode | Signal ID | Minimum evidence | Meaning |
|------|-----------|------------------|---------|
| `speed` | `speed_fluency_candidate` | ≥ 15 answers, accuracy ≥ 70% | Fast accurate retrieval under pressure |
| `challenge` | `challenge_attempt` | ≥ 1 session / ≥ 5 answers | Attempted harder content |
| `challenge` | `challenge_resilience_candidate` | ≥ 10 answers, accuracy ≥ 55% | Succeeded at challenge level |
| `marathon` | `marathon_endurance_candidate` | ≥ 30 answers in range | Sustained effort |
| `marathon` | `marathon_consistency_candidate` | ≥ 20 answers, accuracy drift < 15% | Stable under sustained load |

**Note:** Hebrew insight sentences that surface these to parents/teachers require **separate owner approval** (UI/Hebrew boundary).

---

## 8. Tests Required (Phase 6 Gate)

| Category | Test |
|----------|------|
| **Aggregator isolation** | 15 challenge @ 45% → `competitiveAccuracy=45%`, `diagnosticAccuracy` unchanged |
| **recentMistakes** | Competitive wrong answers excluded (or filtered) — parent `topMistakeSubjects` empty for competitive-only play |
| **Weak topic ranking** | Competitive-only topic → not in `rankWeakTopics` results |
| **competitiveContext** | `byMode.challenge.answers=15` after 15 challenge answers |
| **Class weakness** | `weaknessTopics` not inflated by competitive `topic.wrong` |
| **Teacher guidance** | No weakness unit generated from competitive-only `recentMistakes` |
| **Coins audit** | `awardLearningSessionCoins(challenge session, 120s)` → not skipped for mode (feature flag on) |
| **Monthly audit** | `monthly-persistence-reward` still queries `learning_sessions` only |
| **Regression Phase 4** | Existing `phase4-aggregate-filter.test.mjs` passes |
| **Regression Phase 5** | Book `learningActivity` branch unaffected |

---

## 9. Out of Scope (Phase 6)

- Phase 7 positive evidence engine (full mastery/improvement thresholds)
- Phase 8 MCQ engine
- Phase 9 coins/monthly single-truth / localStorage authority
- Phase 10 all-consumer verification pass
- New Hebrew UI labels, report components, or CSS
- Changing competitive mode gameplay (timers, lives, scoring)
- Changing coin formulas or monthly milestone math
- Reclassifying competitive modes as non-diagnostic (`isDiagnosticEligible: false`) — they remain eligible but **contextually framed**, separate bucket
- Parent Copilot prompt changes (unless owner adds explicit approval)

---

## 10. Implementation Order (After Approval)

1. `lib/learning/competitive-context.js` + unit tests
2. Aggregator: per-mode competitive accumulation + `competitiveContext` + `recentMistakes` fix
3. Insight builders: weakness exclusion filters
4. Class report: diagnostic-aware weakness rollup
5. `phase6-competitive-context.test.mjs` + Phase 4/5 regression
6. `npm run build`
7. Implementation report for owner (no commit until requested)

---

## 11. Owner Approval Checklist

Before implementation, confirm:

- [ ] `recentMistakes` strategy: **exclude competitive** (Option A) vs tag+filter (Option B)
- [ ] `competitiveContext` payload shape and placement (`summary` vs top-level)
- [ ] Whether any **Hebrew insight copy** for competitive signals is in scope (default: **no** — structured signals only)
- [ ] Signal thresholds in §7 acceptable as-is
- [ ] Class `weaknessTopics` migration to `diagnosticWrong` approved

---

## 12. Certification

**NO APPLICATION CODE CHANGES WERE MADE** in this Phase 6 planning document.

Phase 5 is closed. Phase 6 implementation may proceed only after owner approval of this plan.

---

## Appendix A — Key Code References

| Topic | Path |
|-------|------|
| Mode classification | `lib/learning/activity-classification.js` |
| Phase 4 competitive routing | `lib/parent-server/report-data-aggregate.server.js` → `applyClassificationToSlice` |
| `recentMistakes` push | `lib/parent-server/report-data-aggregate.server.js` (~L863) |
| Parent weakness insights | `lib/parent-server/parent-report-parent-facing.server.js` |
| Teacher weakness/recurrence | `lib/teacher-server/teacher-guidance-v2.server.js` → `wrongEventsForTopic` |
| Class weakness rollup | `lib/teacher-server/teacher-class-report.server.js` |
| Session mode persistence | `pages/api/learning/session/start.js`, `finish.js` |
| Answer classification persist | `pages/api/learning/answer.js` |
| Time credit tiers | `utils/learning-time-credit/classify-question-tier.js` |
| Phase 4 competitive tests | `tests/learning/phase4-aggregate-filter.test.mjs` |
