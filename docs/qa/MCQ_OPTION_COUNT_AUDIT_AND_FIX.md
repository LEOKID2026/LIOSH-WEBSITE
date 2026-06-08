# MCQ Option Count Audit and Fix

**Date:** 2026-06-08  
**Gate script:** `npx tsx scripts/qa/system-health-mcq-option-count-audit.mjs`  
**Artifact:** `docs/qa/_artifacts/mcq-option-count/mcq-option-count.json`

---

## Product rule

Normal MCQ questions must expose exactly **4** unique, display-safe child-visible options after runtime generation, repair, normalization, and student strip — unless the row is an explicit geometry label/index MCQ type (stem-linked 2–6 label keys).

---

## Phase 1 — Baseline (pre-fix discovery)

Initial owner report: some subjects/topics showed **2 or 3** choices in the student UI.

Root causes identified:

| Source | Issue |
|--------|--------|
| `utils/english-question-generator.js` | `GRADE_PROFILES` used `choiceCount: 2` (g1) and `3` (g2); `buildMcqFromOptionPool` capped at pool size |
| English sentence/grammar pools | Many static rows ship 3 options only |
| `utils/hebrew-question-generator.js` | `finalizeHebrewMcq` could shrink binary stems to 2 options |
| `utils/geometry-conceptual-bank.js` | Binary/conceptual rows kept 2–3 options |
| `lib/classroom-activities/generate-activity-questions-client.js` | Math activity payload omitted `choices`; moledet validator referenced `params` before init |

First audit pass (partial fixes): **6192/6200** enforced-MCQ rows at 4 options; **8** failures (math strip without choices, moledet bug, invalid audit grade/topic combos).

---

## Phase 2 — Fixes applied

### Core utility

- **`utils/mcq-four-options.js`** (new): `ensureMcqFourOptions()`, `shouldEnforceFourMcqOptions()`, geometry label exemptions.

### Runtime wiring

- **`utils/student-question-stem-sanitizer.js`**: enforce four options on choice MCQs at sanitize time (all generators that call `sanitizeQuestionForStudentDisplay`).
- **`utils/english-question-generator.js`**: all grades `choiceCount: 4`; `buildMcqFromOptionPool` pads to 4 with plausible grammar/tense distractors; runtime target always 4.
- **`utils/hebrew-question-generator.js`**: `ensureMcqFourOptions` in `finalizeHebrewMcq`.
- **`utils/geometry-conceptual-bank.js`**: shuffle/pad conceptual rows to 4 (binary rows included).
- **`lib/classroom-activities/generate-activity-questions-client.js`**: math activities include `choices` from generator answers; `frozenMcqChoicesValid()` requires 4 for enforced MCQs; moledet params bug fixed.

---

## Phase 3 — Regression gate

**Script:** `scripts/qa/system-health-mcq-option-count-audit.mjs`  
**Shared helpers:** `scripts/qa/lib/mcq-option-count.mjs`  
**Tests:** `tests/learning/mcq-four-options-integrity.test.mjs`

Fails when any enforced MCQ has fewer than 4 options, duplicates, missing correct answer, or non-primitive options.

---

## After fix — audit results

| Metric | Before (owner report / first pass) | After fix |
|--------|-----------------------------------:|----------:|
| Total scanned | — | **6212** |
| Exactly 4 options (enforced MCQs) | many 2/3 in UI | **6212 pass** |
| 2 options | present (English g1, geometry labels exempt) | **0** (enforced) |
| 3 options | present (English g2, sentence pools) | **0** (enforced) |
| Duplicate options | — | **0** |
| Correct missing | — | **0** |
| Audit verdict | NOT PASS | **PASS** |

### By subject (after)

| Subject | Scanned | Fail | 2-opt | 3-opt |
|---------|--------:|-----:|------:|------:|
| english | 1664 | 0 | 0 | 0 |
| moledet_geography | 3511 | 0 | 0 | 0 |
| science | 1022 | 0 | 0 | 0 |
| math / hebrew / geometry (activity strip samples) | 15 | 0 | 0 | 0 |

---

## Phase 5 — Manual runtime samples (assigned activity strip path)

5 samples per subject via `generateActivityQuestionSetClient` + `stripQuestionSetForStudent`:

| Subject | Samples | 4 options | Duplicates | Correct stripped | Verdict |
|---------|--------:|----------:|-----------:|-----------------:|---------|
| math | 5 | yes | none | yes | PASS |
| science | 5 | yes | none | yes | PASS |
| hebrew | 5 | yes | none | yes | PASS |
| geometry | 5 | yes* | none | yes | PASS |
| english | 5 | yes | none | yes | PASS |
| moledet_geography | 5 | yes | none | yes | PASS |

\*Geometry label/index MCQs (e.g. parallel/perpendicular) remain explicit 2-option product types and are audit-exempt.

---

## Commands

```powershell
npx tsx scripts/qa/system-health-mcq-option-count-audit.mjs
npx tsx scripts/qa/system-health-question-bank-integrity-audit.mjs
npx tsx scripts/qa/system-health-mcq-obvious-answer-risk-audit.mjs
node scripts/tests/question-metadata-validator.mjs
node scripts/tests/question-metadata-coverage-audit.mjs
node --test tests/learning/activity-classification.test.mjs
node --test tests/learning/math-mcq-answer-integrity.test.mjs
node --test tests/learning/mcq-four-options-integrity.test.mjs
node --test tests/classroom-activities/generate-math-activity-questions.test.mjs
npm run build
```

---

## Explicit confirmations

- No diagnostic engine behavior changes
- No parent report behavior changes
- No UI/CSS/routes/SQL/flags changes
- **No commit / no push**
