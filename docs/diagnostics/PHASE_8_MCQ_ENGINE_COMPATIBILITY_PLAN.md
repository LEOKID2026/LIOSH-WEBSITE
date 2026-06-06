# Phase 8 — MCQ / Question-to-Engine Compatibility: Implementation Plan

**Project:** Diagnostic Truth Fix  
**Phase:** 8 — MCQ Engine Compatibility (question-to-engine contract)  
**Date:** 2026-06-06  
**Revision:** 1  
**Status:** PLAN ONLY — awaiting owner approval before implementation  
**Prerequisite:** Phase 7 implementation **ACCEPTED** (2026-06-06)

---

> **NO APPLICATION CODE CHANGES WERE MADE in this document.**  
> This file is audit + plan only. Do not implement until owner approves scope below.

---

## 1. Goal

Ensure every answer path can supply enough **structured question metadata** for the diagnostic engine to understand what was asked, what was shown, and what the learner selected — without rewriting all question banks or changing diagnostic conclusions in Phase 8.

Phase 8 is **capture + contract + audit only**. It prepares the data layer for future misconception clustering; it does **not** turn weak metadata into strong diagnosis.

### Product rules (owner-approved constraints)

| Rule | Meaning |
|------|---------|
| No UI/Hebrew/CSS | No report copy, labels, or visible UI changes |
| No coins/monthly changes | Coin/time/monthly modules untouched |
| No gameplay changes | Masters, timers, scoring, mode behavior unchanged |
| No diagnostic conclusion changes | `diagnosticAccuracy`, `positiveEvidence`, weakness ranking unchanged in Phase 8 |
| No full bank rewrite | Incremental tagging + unknown-safe fallbacks only |
| No Phase 9 | localStorage / single-truth work deferred |
| Phase 4–7 intact | Classification buckets, competitive context, positive evidence regressions must stay green |

---

## 2. Current-State Audit — Question Metadata at Answer Time

### 2.1 Persistence paths (where answers land)

| Source | Write path | Primary storage |
|--------|------------|-----------------|
| Free practice (6 masters) | `saveLearningAnswer` → `POST /api/learning/answer` | `answers.answer_payload` JSONB |
| Parent-assigned activities | `parent-activity.server.js` | `parent_activity_attempts` + `question_snapshot` |
| Teacher class activities | `teacher-activities.server.js` | `classroom_activity_attempts` + `question_snapshot` |
| Individual student activities | `student-activity-play.server.js` | same pattern |
| Worksheets | `worksheet-student.server.js` | worksheet attempt + `question_snapshot` |
| Book CTA practice | Same as masters (`mode=learning` / `practice`) | `answers.answer_payload` |
| Challenge / speed / marathon | Same free-practice path; `gameMode` in payload | `answers.answer_payload` |

Aggregation reads `answer_payload` (free practice) or `question_snapshot` + `selected_answer` (assigned). Phase 4–7 logic uses **classification fields** (`evidenceCategory`, `isDiagnosticEligible`) — not MCQ option metadata.

### 2.2 Field availability today — free practice (`answers.answer_payload`)

**File:** `pages/api/learning/answer.js` builds `answer_payload` from request body.

| Field | Persisted today? | Source today | Gap |
|-------|------------------|--------------|-----|
| `subject` | ✅ Yes | `body.subject` | — |
| `grade` | ✅ Partial | `registeredGradeLevel`, `contentGradeLevel`, `gradeLevel` | No explicit `questionGrade` separate from session |
| `topic` | ✅ Yes | `body.topic` | — |
| `subtopic` / `skillId` | ❌ No | Exists on **client** question `params` / pools | Not sent to server |
| `questionType` | ❌ No | Client infers `answerMode: choice/typed` for local mistakes only | Not in payload |
| `difficulty` | ❌ No | `params.difficulty`, `levelKey` on client | Not in payload |
| `generatorKind` | ❌ No | `params.kind` on client | Not in payload |
| `selectedAnswer` | ✅ Partial | `userAnswer` **string/number only** | Loses option index + object cell |
| `correctAnswer` | ✅ Partial | `expectedAnswer` string | Not linked to choice list |
| `allAnswerChoices` | ❌ No | Full `answers[]` / `options[]` on client at answer time | **Critical gap** |
| `distractorFamily` | ❌ No | Client `extractDiagnosticMetadataFromQuestion` + `distractorFamilyFromOptionCell` | Local mistakes only |
| `misconceptionTag` | ❌ No | Some pools use `expectedErrorTags` at question level | Not per-option, not persisted |
| `isDiagnosticEligible` | ✅ Yes | Phase 1 classification | — |
| `evidenceCategory` | ✅ Yes | Phase 1 classification | — |
| `answerLeakageRisk` | ❌ No | Derived implicitly via `afterStepByStep` / classification | No explicit leakage enum |

**Client already has rich helpers (not wired to server):**

- `utils/diagnostic-mistake-metadata.js` — `extractDiagnosticMetadataFromQuestion`, `computeMcqIndicesForQuestion`, `distractorFamilyFromOptionCell`
- `utils/mcq-option-cell.js` — supports `{ value, distractorFamily, errorTag }` option objects
- `utils/diagnostic-question-contract.js` — `mergeDiagnosticContractIntoParams`, `diagnosticSkillId`, `distractorFamily` on params

**Server `saveLearningAnswer` call (all 6 masters)** sends only: `subject`, `topic`, `prompt`, `expectedAnswer`, `userAnswer`, timing, `clientMeta` — see `pages/learning/math-master.js` `saveAnswerInParallel`, mirrored in geometry/hebrew/english/science/moledet masters.

### 2.3 Field availability — assigned activities

**Files:** `assigned-activity-snapshot.server.js` → `buildAttemptSnapshotFields`, activity record handlers.

| Field | Persisted today? | Notes |
|-------|------------------|-------|
| Full question object | ✅ Yes | `question_snapshot` copies frozen question at answer time |
| `skill_key` | ✅ Often | From activity row or question |
| `selected_answer` | ✅ String only | Max 1000 chars |
| `correct_answer` | ✅ String | Extracted via `extractCorrectAnswerFromQuestion` |
| `allAnswerChoices` | ⚠️ In snapshot if generator included `answers`/`options` | Not normalized; shape varies by subject |
| `distractorFamily` | ⚠️ If present on frozen question/params | Not extracted to attempt columns |
| Classification | ✅ Phase 1+ | Stored on `question_snapshot` in class/student paths |

Assigned activities are **ahead of free practice** for question freezing, but still lack a **normalized engine contract** and per-option selection metadata.

### 2.4 Per-subject generator audit (high level)

| Subject | Generator / bank | MCQ shape | `distractorFamily` today | `skillId` / subtopic |
|---------|------------------|-----------|--------------------------|----------------------|
| **Math** | `utils/math-question-generator.js` | `answers[]` numeric/string; `buildMathMcqAnswerList` returns **plain values** | ❌ None in generator | `params.kind`, `diagnosticSkillId` via contract merge (partial) |
| **Geometry** | `utils/geometry-question-generator.js` + `geometry-conceptual-bank.js` | MCQ + procedural | ✅ Named families in **conceptual bank** rows | `geometry-diagnostic-metadata-bridge.js` maps kinds → `diagnosticSkillId` |
| **Hebrew** | `utils/hebrew-question-generator.js` | `answers: string[]`, `correct: index` | ❌ Plain string options | Topic/operation keys; limited contract fields |
| **English** | `utils/english-question-generator.js` + grammar pools | MCQ options / sentence choice | ✅ Some templates (`grammar_forms`, `same_slot_forms`) | `skillId`, `patternFamily` in Phase B pools |
| **Science** | `data/science-questions*.js` | `type: "mcq"`, `options[]`, `correctIndex` | ❌ Per-option families; question-level `params.patternFamily`, `expectedErrorTags` | `params.diagnosticSkillId`, `subtype` enriched in metadata pass |
| **Moledet/Geography** | `utils/moledet-geography-question-generator.js` | `answers: string[]` | ❌ Plain strings | Topic from constants; book skill index separate |

**Stem leakage:** Existing tests for English Phase B grammar (`tests/classroom-activities/english-grammar-phase-b-stem-leak.test.mjs`). No unified `answerLeakageRisk` persistence across subjects.

### 2.5 What is missing today (summary)

1. **No server-side question-engine contract** — metadata lives in client mistake buffers only.
2. **`allAnswerChoices` not persisted** for free practice — cannot verify presented options or read selected option’s `distractorFamily` later.
3. **`userAnswer` is lossy** — string value only; MCQ index and option object discarded.
4. **Math procedural MCQ has zero distractor tagging** — `buildMathMcqAnswerList` has no `distractorFamily` (master plan gap confirmed).
5. **No metadata completeness audit** — no `question-metadata-audit` utility for tests/tooling.
6. **`recentMistakes` lacks engine fields** — aggregator stores `userAnswer`, `expectedAnswer`, `mode`; no `distractorFamily` / `questionType` (Phase 8 may add fields **without** using them for conclusions).
7. **Assigned vs free practice shape drift** — two parallel shapes; no normalized contract.

---

## 3. Question Sources to Cover

Phase 8 must define the contract for **all** answer paths below. Implementation may be **staged** (see §8), but the contract applies uniformly.

| # | Source | Answer write entry | Phase 8 minimum |
|---|--------|-------------------|-----------------|
| 1 | Math free practice | `math-master.js` → `/api/learning/answer` | Capture + pilot distractor tags |
| 2 | Geometry free practice | `geometry-master.js` | Capture; pass through bank tags when present |
| 3 | Hebrew free practice | `hebrew-master.js` | Capture; `unknown` distractor families |
| 4 | English free practice | `english-master.js` | Capture; pass through existing tags |
| 5 | Science free practice | `science-master.js` | Capture; question-level tags only |
| 6 | Moledet/geography free practice | `moledet-geography-master.js` | Capture; `unknown` families |
| 7 | Parent-assigned activities | `parent-activity.server.js` | Normalize snapshot + selection metadata |
| 8 | Teacher/classroom assigned | `teacher-activities.server.js` | Same |
| 9 | Individual student assigned | `student-activity-play.server.js` | Same |
| 10 | Book CTA practice | Masters with `contextAfterBookReading` | Same as free practice capture |
| 11 | Challenge / speed / marathon | Masters competitive modes | Same capture; **no** mastery/diagnosis change |

---

## 4. MCQ Compatibility Analysis

### 4.1 Are all answer choices available at answer time?

| Source | At UI answer time | Persisted to DB |
|--------|-------------------|-----------------|
| Math MCQ | ✅ `currentQuestion.answers` | ❌ |
| Geometry MCQ | ✅ | ❌ |
| Hebrew MCQ | ✅ `answers[]` | ❌ |
| English MCQ | ✅ `options` / `answers` | ❌ |
| Science MCQ | ✅ `options` | ❌ |
| Moledet MCQ | ✅ | ❌ |
| Assigned | ✅ In frozen `question_snapshot` | ⚠️ Snapshot yes; normalized contract no |

### 4.2 Can the engine know which wrong option was selected?

| Capability | Today | After Phase 8 (proposed) |
|------------|-------|--------------------------|
| Match selection to option index | Client: `computeMcqIndicesForQuestion` | Server payload: `selectedAnswer.index` |
| Read selected option distractor | Client: `distractorFamilyFromOptionCell` | Server payload: `selectedAnswer.distractorFamily` or top-level `distractorFamily` |
| Distinguish proximity vs named misconception | ❌ Math untagged | Tag `generic_proximity` vs named families; `unknown` when absent |

### 4.3 Duplicate / equivalent options

| Risk | Current state | Phase 8 handling |
|------|---------------|------------------|
| Duplicate values in `answers[]` | Possible in generators | Contract audit flags `duplicate_choice_values`; store `metadataConfidence: partial` |
| Equivalent numeric forms (`2` vs `2.0`) | Matching uses strict equality in `computeMcqIndicesForQuestion` | Persist both display value and normalized value where feasible |

### 4.4 Answer leakage (stem / explanation / step-by-step)

| Leakage type | Detection today | Phase 8 proposal |
|--------------|-----------------|------------------|
| After step-by-step | `contextFlags.afterStepByStep` → not diagnostic (Phase 2) | `answerLeakageRisk: "step_by_step_shown"` |
| Explanation mid-question | Partial (`explanation_viewed` on assigned attempts) | `answerLeakageRisk: "explanation_shown"` when flag set |
| Passage visible (reading comp) | Not persisted | `answerLeakageRisk: "passage_visible"` when question marks reading context |
| Stem embeds correct answer | English Phase B tests only | Audit helper + `answerLeakageRisk: "stem_leak"` when detected at capture time |
| None | Default for cold MCQ | `answerLeakageRisk: "none"` |

**Phase 8 does not change eligibility rules** — leakage fields are **documentary** alongside existing classification.

### 4.5 Weak metadata safety (mandatory)

| Metadata quality | Engine treatment in Phase 8 |
|------------------|----------------------------|
| Named `distractorFamily` on selected option | Store as-is; `metadataConfidence: full` for option-level |
| Question-level `expectedErrorTags` only | Store as `misconceptionTag` candidates; `metadataConfidence: partial` |
| `generic_proximity` | Store explicitly; **must not** infer specific misconception |
| No family / plain string options | `distractorFamily: "unknown"`; `metadataConfidence: minimal` |
| Missing `allAnswerChoices` for MCQ | `metadataConfidence: minimal`; audit warning |

**Rule D8-1:** Phase 8 **must not** create strong misconception diagnosis from `unknown` or `generic_proximity` alone.

---

## 5. Proposed Minimal Phase 8 Contract (Additive Only)

### 5.1 Nested payload block (recommended)

Add optional top-level key on `answer_payload` (and parallel block inside enriched `question_snapshot` for assigned attempts):

```js
questionEngine: {
  version: "phase-8-mcq-contract-v1",

  // Identity
  questionType: "mcq" | "numeric" | "open" | "text" | "audio" | "unknown",
  generatorKind: string | null,       // e.g. params.kind
  generatorSource: string | null,     // e.g. "math-master", "classroom_activity"
  skillId: string | null,             // diagnosticSkillId
  subtopic: string | null,            // params.subtype
  difficulty: string | null,          // levelKey / params.difficulty

  // MCQ payload (null for non-MCQ)
  allAnswerChoices: Array<{
    index: number,
    value: string | number,
    label?: string,
    distractorFamily?: string | null,
    misconceptionTag?: string | null,
  }> | null,

  selectedAnswer: {
    value: string | number,
    index?: number,
    distractorFamily?: string | null,
    misconceptionTag?: string | null,
  } | null,

  correctAnswer: {
    value: string | number,
    index?: number,
  } | null,

  // Resolved selection (convenience for aggregators)
  distractorFamily: string | null,    // from selected option, else "unknown"
  misconceptionTag: string | null,    // only when pedagogically named

  answerLeakageRisk:
    "none" | "step_by_step_shown" | "explanation_shown" | "passage_visible" | "stem_leak" | "unknown",

  metadataConfidence: "full" | "partial" | "minimal" | "unknown",
}
```

### 5.2 Normalization rules

1. **Additive only** — existing `subject`, `topic`, `userAnswer`, `expectedAnswer`, classification fields unchanged.
2. **Graceful legacy** — missing `questionEngine` on old rows: readers treat as `metadataConfidence: unknown`.
3. **String `userAnswer` preserved** — dual-write during transition; aggregators keep current behavior.
4. **Size cap** — `allAnswerChoices` max 8 options, values truncated to same limits as `userAnswer` (1000 chars).
5. **Competitive modes** — same contract captured; classification unchanged (Phase 6).
6. **Do not invent families** — if option has no tag, use `null` / `"unknown"`, not guessed labels.

### 5.3 Shared builder (reuse existing client logic)

**New:** `lib/learning/question-engine-metadata.js` (pure)

- `buildQuestionEngineMetadataFromQuestion(question, { selectedValue, questionType, leakageRisk, generatorSource })`
- Internally reuse `extractDiagnosticMetadataFromQuestion`, `computeMcqIndicesForQuestion`, `distractorFamilyFromOptionCell`, `mcqCellValue`
- `normalizeQuestionEnginePayload(raw)` — server-side sanitizer
- `auditQuestionEngineMetadata(qe)` — completeness + leakage checks

### 5.4 Incremental generator tagging (not full bank rewrite)

| Priority | Scope | Change |
|----------|-------|--------|
| P0 | Contract + persistence + all masters send metadata | No bank edits required (mostly `unknown`) |
| P1 | Math `buildMathMcqAnswerList` | Wrap outputs as `{ value, distractorFamily }`; tag known misconception templates; fallback `"generic_proximity"` |
| P1 | English generator / pools | Pass through existing `distractorFamily`; ensure options serialized in contract |
| P2 | Geometry conceptual bank | Already tagged — ensure options in contract include families |
| P2 | Science pools | Question-level tags only; per-option `unknown` unless pool adds option tags later |
| P3 | Hebrew / Moledet | Contract capture with `unknown`; optional pilot tags on 1–2 families only if owner approves expanded scope |

---

## 6. Diagnostic Safety Rules (Mandatory)

| ID | Rule |
|----|------|
| D8-1 | Phase 8 **must not** change `diagnosticAccuracy`, `positiveEvidence`, or `competitiveContext` formulas |
| D8-2 | Phase 8 **must not** add new weakness/mastery **conclusions** in parent/teacher reports |
| D8-3 | `distractorFamily: "unknown"` or missing → no misconception inference |
| D8-4 | `generic_proximity` → stored but **not** treated as named misconception |
| D8-5 | `answerLeakageRisk !== "none"` → documentary only; eligibility still governed by Phase 1–2 classification |
| D8-6 | `allAnswerChoices` absence → `metadataConfidence` downgraded; no strong diagnosis |
| D8-7 | Phase 4/5/6/7 test suites remain green |
| D8-8 | Legacy plain-string `userAnswer` rows continue to aggregate without error |

### 6.1 Optional additive fields on `recentMistakes` (storage only)

Phase 8 may add to aggregator mistake entries when present in `answer_payload.questionEngine`:

- `distractorFamily`
- `questionType`
- `skillId`
- `metadataConfidence`

**Explicitly out of scope for Phase 8:** clustering mistakes by family in `buildParentInsightsHe` or teacher guidance.

---

## 7. Implementation Scope Proposal

### 7.1 Workstreams

| Stream | Description |
|--------|-------------|
| **A — Contract + audit** | `question-engine-metadata.js`, audit tests |
| **B — API persistence** | `/api/learning/answer` accept/sanitize `questionEngine` |
| **C — Client capture** | All 6 masters pass metadata via `saveLearningAnswer` |
| **D — Assigned activities** | Enrich `question_snapshot` + attempt payload with normalized contract |
| **E — Generator pilot tagging** | Math MCQ list + English pass-through (minimal diffs) |
| **F — Aggregator storage** | Pass-through fields on `recentMistakes` only (no new insights) |

### 7.2 Files likely to modify

#### New files

| File | Purpose |
|------|---------|
| `lib/learning/question-engine-metadata.js` | Build, normalize, audit contract |
| `tests/learning/phase8-mcq-engine-contract.test.mjs` | Phase 8 test gate |

#### Metadata capture (client)

| File | Change |
|------|--------|
| `pages/learning/math-master.js` | Build + send `questionEngine` on save |
| `pages/learning/geometry-master.js` | Same |
| `pages/learning/hebrew-master.js` | Same |
| `pages/learning/english-master.js` | Same |
| `pages/learning/science-master.js` | Same |
| `pages/learning/moledet-geography-master.js` | Same |

#### Answer payload persistence (server)

| File | Change |
|------|--------|
| `pages/api/learning/answer.js` | Accept `questionEngine`; `normalizeQuestionEnginePayload` |
| `lib/parent-server/report-data-aggregate.server.js` | Optional `recentMistakes` field pass-through |
| `lib/parent-server/parent-activity.server.js` | Contract on parent attempts |
| `lib/teacher-server/teacher-activities.server.js` | Contract on class attempts |
| `lib/teacher-server/student-activity-play.server.js` | Contract on individual attempts |
| `lib/classroom-activities/assigned-activity-snapshot.server.js` | Helper to merge contract into snapshot |

#### Generator / source tagging (minimal pilot)

| File | Change |
|------|--------|
| `utils/math-question-generator.js` | `buildMathMcqAnswerList` → option objects + `generic_proximity` / named tags (pilot ops only) |
| `utils/mcq-option-cell.js` | No breaking changes; may add `normalizeOptionCellForContract` |
| `utils/english-question-generator.js` | Ensure options expose families in contract serialization |
| `utils/geometry-conceptual-bank.js` | Read-only pass-through in tests; optional normalize helper |

#### Explicitly NOT modified (Phase 8)

| File | Reason |
|------|--------|
| `lib/parent-server/parent-report-parent-facing.server.js` | No diagnostic conclusion / Hebrew changes |
| `lib/teacher-server/teacher-guidance-v2.server.js` | No new insight logic |
| `lib/learning/positive-evidence.js` | Phase 7 frozen |
| `lib/learning/activity-classification.js` | Unless direct blocker (none expected) |
| `lib/learning-supabase/monthly-persistence-reward.server.js` | Coins/monthly out of scope |
| `lib/learning-supabase/learning-coin-award.server.js` | Coins/monthly out of scope |
| `data/science-questions*.js` (bulk) | No full bank rewrite |
| `utils/hebrew-question-generator.js` (bulk) | Capture-only unless owner expands pilot |

---

## 8. Tests Required (Phase 8 Gate)

| Category | Test |
|----------|------|
| **MCQ choices persisted** | Master save → `answer_payload.questionEngine.allAnswerChoices.length >= 2` for MCQ fixture |
| **Selected/correct preserved** | `selectedAnswer.value` + `correctAnswer.value` match user selection and expected |
| **No stem leak (sample)** | `auditQuestionEngineMetadata` flags fixture with stem containing correct answer |
| **Unknown distractor safe** | Plain-string options → `distractorFamily: "unknown"` or null; `metadataConfidence: minimal` |
| **Generic proximity** | Math proximity distractor → `generic_proximity`; audit marks non-named misconception |
| **No diagnosticAccuracy change** | Same fixture before/after Phase 8 → identical `diagnosticAccuracy` / buckets |
| **positiveEvidence unchanged** | Phase 7 signals identical for same inputs |
| **Legacy graceful** | Row without `questionEngine` still aggregates; `recentMistakes` works |
| **Assigned snapshot** | Class activity attempt stores contract block on `question_snapshot` |
| **Competitive regression** | Speed/challenge answer payload includes contract; competitive isolation unchanged |
| **Regression Phase 4/5/6/7** | All existing test files pass |
| **Build** | `npm run build` passes |

---

## 9. Implementation Order (After Approval)

1. `lib/learning/question-engine-metadata.js` + unit tests (audit + normalize)
2. `pages/api/learning/answer.js` persistence + normalization
3. Shared master helper (thin wrapper) + wire 6 masters (capture-only, mostly `unknown` families)
4. Assigned activity paths — snapshot enrichment
5. Math `buildMathMcqAnswerList` pilot tagging + English pass-through test
6. Aggregator `recentMistakes` optional field pass-through (storage only)
7. `phase8-mcq-engine-contract.test.mjs` + Phase 4–7 regression + build
8. Implementation report for owner

---

## 10. Out of Scope (Phase 8)

- Phase 9 coins/monthly/localStorage single truth
- Phase 10 all-consumer verification + Hebrew copy rollout
- Rewriting all question banks or adding distractor tags everywhere
- Parent/teacher misconception clustering UI
- Changing `diagnosticAccuracy` or `positiveEvidence` logic
- MCQ anti-cheat enforcement (contract enables future verification only)
- Worksheet UI changes
- Parent Copilot prompt changes

---

## 11. Owner Approval Checklist

Before implementation, confirm:

- [ ] **Payload shape:** nested `questionEngine` block on `answer_payload` (vs flat fields)
- [ ] **Dual-write:** keep legacy `userAnswer` / `expectedAnswer` strings alongside contract (recommended: yes)
- [ ] **`allAnswerChoices` persistence:** enabled for all MCQ free practice (recommended: yes, max 8 options)
- [ ] **Generator pilot scope:** math `buildMathMcqAnswerList` + english pass-through only for tagging (vs broader)
- [ ] **`recentMistakes` enrichment:** storage-only pass-through in Phase 8 (recommended: yes, no new insights)
- [ ] **`answerLeakageRisk` enum** as proposed in §5.1
- [ ] **`distractorFamily: "unknown"`** as explicit sentinel (vs null only)
- [ ] **Assigned activities:** normalize at answer time from frozen question (recommended) vs snapshot backfill job (defer)
- [ ] **Science/Hebrew/Moledet:** capture-only in Phase 8 (no bulk pool tagging) unless expanded pilot approved

---

## 12. References

| Document / path | Relevance |
|-----------------|-----------|
| `.cursor/plans/diagnostic_truth_fix_plan_59fa56fa.plan.md` §Phase 8 | Master field list |
| `pages/api/learning/answer.js` | Current free-practice payload |
| `utils/diagnostic-mistake-metadata.js` | Existing client extraction |
| `utils/diagnostic-question-contract.js` | Phase 3C diagnostic contract on params |
| `utils/mcq-option-cell.js` | Option object shape |
| `lib/classroom-activities/assigned-activity-snapshot.server.js` | Assigned question freeze |
| `docs/diagnostics/PHASE_7_POSITIVE_EVIDENCE_ENGINE_PLAN.md` | Prior phase boundary |

---

*End of Phase 8 plan — implementation blocked until owner approval.*
