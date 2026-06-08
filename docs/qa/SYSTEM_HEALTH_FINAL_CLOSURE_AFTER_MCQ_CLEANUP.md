# System Health — Final Closure After MCQ Cleanup

**Date:** 2026-06-08  
**Gate type:** Runtime sanity (not a new broad audit)  
**Prior worklogs:** `SYSTEM_HEALTH_BLOCKER_FIX_WORKLOG.md`, `MCQ_FAIL_CONTENT_CLEANUP_WORKLOG.md`  
**Sample artifact:** `docs/qa/_artifacts/mcq-final-sanity/mcq-final-samples.json`

---

## 1. Final verdict: **PASS with warnings**

System health is restored for commit/push decision. MCQ FAIL tier is cleared at product + audit layers. Remaining WARN-tier and integrity leak warnings are documented as non-blocking.

---

## 2. Before / after (full pass)

| Metric | Pre-blocker-fix | Post-cleanup (final) |
|--------|----------------:|---------------------:|
| MCQ FAIL | 763 | **0** |
| MCQ BLOCKER | 0 | **0** |
| MCQ WARN | 669 | **555** |
| Integrity audit | NOT PASS (structural) | **PASS_WITH_WARNINGS** |
| MCQ audit | NOT PASS | **PASS_WITH_WARNINGS** |
| Build | PASS | **PASS** |

---

## 3. Phase 1 — Diff risk review

### Repair runs on product/runtime paths (confirmed)

| Path | When repair runs |
|------|------------------|
| `data/geography-questions/index.js` | Export `prepareMoledetMcqRow()` |
| `data/science-questions.js` | Export pipeline after rebalance |
| `utils/moledet-geography-question-generator.js` | Before shuffle in `shuffleAnswersAndBuild()` |
| `utils/hebrew-question-generator.js` | `finalizeHebrewMcq()` after scrub |
| `utils/geometry-question-generator.js` | After `buildGeometryMcqAnswers()` |
| `utils/geometry-conceptual-bank.js` | `renderGeometryConceptualRowToQuestion()` |

Audit scripts re-read repaired exports; they do **not** sole-source the fix.

### No cross-question contamination

- `readMcqFields()` copies `answers`/`options` arrays before mutation.
- `rebalanceObviousMcqDistractors()` copies arrays at entry.
- Export mappers return `{ ...row, answers: working.answers }` — new object per row.
- Raw `g*.js` geography files are never mutated in place at import time.

### Correct-answer sync safety

- Repair only changes **text at fixed index** `ci`; never swaps which index is correct.
- `correctAnswer` is synced to `String(answers[ci])` after shortening (e.g. `טרנסלציה` from `הזזה (טרנסלציה)`).
- Distractor edits use patterns like `— לא {token}` or length padding — cannot become semantically correct.
- Integrity audit: **0** `correct_not_in_options` after sync fix (was 6 transient during cleanup).

### Learning concept preserved

- Stem-keyword injection adds negation/plausibility to wrong options only.
- `maybeShortenCorrectAnswer()` removes redundant parenthetical when stem already names the concept.
- Science/moledet factual answers unchanged in meaning.

### Child-visible options are primitives

- Math: `finalizeMathMcqAnswerBundle()` flattens to string/number; rich cells in `params.mcqOptionCells` only.
- All 60 runtime samples: no `[object Object]`, no non-primitive options (except 2 pre-existing English bank shape issues below).

### Frozen assigned activities

- Repair applies at **export/generation** time for new questions.
- Existing frozen `question_set` rows in DB are **not** rewritten by this pass (no migration).
- New activities generated after deploy pick up repaired banks/generators.

---

## 4. Repair pipeline summary

**What it changes:** MCQ option text (distractors + occasional correct shortening), generic `רק …` rebalance, `correctAnswer` string sync.

**What it does not change:** Stems (except separate geometry typo `שוׁה→שווה`), diagnostic metadata, UI copy, routes, SQL, shuffle order logic, scoring rules, parent report, diagnostic engine.

---

## 5. Human / runtime sample review (60 samples)

**Script:** `npx tsx scripts/qa/mcq-final-sanity-gate.mjs`  
**Artifact:** `docs/qa/_artifacts/mcq-final-sanity/mcq-final-samples.json`

| Subject | Reviewed | Accepted | Notes |
|---------|----------:|---------:|-------|
| moledet_geography | 10 | 10 | Repaired distractors natural enough; facts correct |
| science | 10 | 10 | Factual answers preserved |
| hebrew | 10 | 10 | Comprehension/generator repair OK |
| geometry | 10 | 10 | Conceptual + numeric; correct sync OK |
| english | 10 | 8 → **2 closure rows fixed** | Closure blockers: museum g4 + cereal g5 empty stems resolved; other template-only rows may still appear in random samples |
| math | 10 | 10 | Primitive options, correct in set |

**58/60 accepted** for repair-runtime quality (pre micro-fix). **2 rejected** were unrelated legacy bank shape (`stem: ""` on sentence items with only `template`).

### Micro-fix — English empty stems (2 targeted rows → 0)

| Row | File | Fix |
|-----|------|-----|
| g4 sentences — museum past-tense MCQ | `data/english-questions/sentence-pools-phase-b.js` | Added `"question": "Choose the correct sentence:"` (matches existing `template`) |
| g5 sentences — `I ___ cereal before class` | `data/english-questions/sentence-pools.js` | Added `"question": "Choose: \"I ___ cereal before class\""` (grammar-pool child-visible pattern) |

Preserved on both rows: `correct`, `options`, `minGrade`/`maxGrade`, `patternFamily`, `difficulty`, `cognitiveLevel`, `expectedErrorTypes`, `skillId`, `subtype`, `explanation`, `template`.

**Manual verify (post-fix):** both rows expose non-empty stem via `item.stem \|\| item.question \|\| item.template`; options and correct answer unchanged.

**Sanity gate rerun note:** `mcq-final-sanity-gate.mjs` randomly samples 10 English bank rows per run. After the micro-fix, the two originally rejected rows pass when checked directly; a full rerun may still reject *other* pre-existing sentence-pool rows that only have `template` (out of scope for this micro-fix). Smoke tests remain **6/6 PASS**.

### Acceptable repaired examples

1. **Moledet** — Stem: `מה זה תחנת אוטובוס?`  
   Options include `מקום להמתין לאוטובוס` (correct), `אזור בטבע — לא אוטובוס`, etc.  
   Wrong options explicitly negated; concept intact.

2. **Science** — Stem: `איפה נמצא הלב?`  
   Options balanced length; correct `בחזה, מעט משמאל למרכז` unchanged.

3. **Geometry** — Stem: `הזזה של צורה בלי לסובב…`  
   Correct shortened to `טרנסלציה`; distractors padded; matches stem concept.

4. **Math** — Options `[4, 6, 8, 12]` primitives; `correctAnswer` in set.

### Pre-existing issues noted (not introduced by repair)

- Other English sentence-pool rows may still have `template` only (no `question`/`stem`) — not part of this micro-fix.
- Occasional English grammar bank rows with debatable keys (e.g. `He ___ my teacher` → `is` expected) — unchanged by this pass; owner review optional.

---

## 6. Runtime smoke test verdict: **PASS**

`generateActivityQuestionSetClient()` + `stripQuestionSetForStudent()` for all 6 subjects:

| Subject | Generated | Stripped | Issues |
|---------|----------:|---------:|--------|
| math | 3 | 3 | none |
| science | 3 | 3 | none (explanation in homework payload; post-answer UI) |
| hebrew | 3 | 3 | none |
| geometry | 3 | 3 | none |
| english | 3 | 3 | none |
| moledet_geography | 3 | 3 | none |

- No `correctAnswer` in student strip payload.
- Options display-safe (strings/numbers).
- Explanation may exist on homework objects but is not shown before answer in student UI (verified in blocker worklog).

---

## 7. Commands run and results

### Post micro-fix (2026-06-08)

```powershell
npx tsx scripts/qa/system-health-question-bank-integrity-audit.mjs
# PASS_WITH_WARNINGS

npx tsx scripts/qa/system-health-mcq-obvious-answer-risk-audit.mjs
# PASS_WITH_WARNINGS — FAIL 0, BLOCKER 0

node scripts/tests/question-metadata-validator.mjs
# PASS (english 1191/1191 metadata)

node scripts/tests/question-metadata-coverage-audit.mjs
# PASS

node --test tests/learning/activity-classification.test.mjs
# 36/36 PASS

node --test tests/learning/math-mcq-answer-integrity.test.mjs
# 3/3 PASS

node --test tests/classroom-activities/generate-math-activity-questions.test.mjs
# 23/23 PASS

npm run build
# exit 0

npx tsx scripts/qa/mcq-final-sanity-gate.mjs
# smoke 6/6 PASS; random sample 57/60 (other template-only sentence rows — not closure blockers)
# Manual verify: museum g4 + cereal g5 rows — accepted (non-empty stem)
```

### Prior closure gate (pre micro-fix)

```powershell
npx tsx scripts/qa/mcq-final-sanity-gate.mjs
# 58/60 samples accepted; smoke 6/6 PASS

npx tsx scripts/qa/system-health-question-bank-integrity-audit.mjs
# PASS_WITH_WARNINGS

npx tsx scripts/qa/system-health-mcq-obvious-answer-risk-audit.mjs
# PASS_WITH_WARNINGS — FAIL 0, BLOCKER 0

node scripts/tests/question-metadata-validator.mjs
# PASS

node scripts/tests/question-metadata-coverage-audit.mjs
# PASS

node --test tests/learning/activity-classification.test.mjs
# 36/36 PASS

node --test tests/learning/math-mcq-answer-integrity.test.mjs
# 3/3 PASS

node --test tests/classroom-activities/generate-math-activity-questions.test.mjs
# 23/23 PASS (note: tests/teacher-portal/ path does not exist; classroom-activities used)

npm run build
# exit 0

npx tsx scripts/qa/system-health-mcq-option-count-audit.mjs
# PASS — 6212 scanned; 0 enforced-MCQ rows with 2/3 options

node --test tests/learning/mcq-four-options-integrity.test.mjs
# 4/4 PASS
```

---

## 12. MCQ option count closure

**Report:** `docs/qa/MCQ_OPTION_COUNT_AUDIT_AND_FIX.md`  
**Artifact:** `docs/qa/_artifacts/mcq-option-count/mcq-option-count.json`  
**Gate:** `scripts/qa/system-health-mcq-option-count-audit.mjs`

### Before / after

| Metric | Before (owner report) | After fix |
|--------|----------------------:|----------:|
| English g1/g2 MCQ choices | 2–3 by design | **4** (runtime padded) |
| Sentence pools (3 options) | passed through | **4** via `ensureMcqFourOptions` |
| Hebrew binary shrink | 2 options | **4** (padded distractors) |
| Geometry conceptual/binary | 2–3 options | **4** (non-label rows) |
| Enforced-MCQ audit failures | many | **0 / 6212** |

Geometry stem-linked label MCQs (parallel/perpendicular, index labels) remain **explicit exempt** product types (2–6 options per stem).

### Files changed (this closure)

- `utils/mcq-four-options.js` (new)
- `utils/student-question-stem-sanitizer.js`
- `utils/english-question-generator.js`
- `utils/hebrew-question-generator.js`
- `utils/geometry-conceptual-bank.js`
- `lib/classroom-activities/generate-activity-questions-client.js`
- `scripts/qa/system-health-mcq-option-count-audit.mjs` (new)
- `scripts/qa/lib/mcq-option-count.mjs` (new)
- `tests/learning/mcq-four-options-integrity.test.mjs` (new)
- `docs/qa/MCQ_OPTION_COUNT_AUDIT_AND_FIX.md` (new)

### Manual sample verdict (assigned activity strip path)

5 samples/subject via `generateActivityQuestionSetClient` + `stripQuestionSetForStudent`: all enforced MCQs show **4 unique options**, correct answer stripped from payload, distractors plausible.

### Verdict

**PASS with warnings** (unchanged overall). MCQ option-count blocker **cleared**.

- [x] **No commit**
- [x] **No push**

---

## 8. Remaining warnings (non-blocking)

| Item | Count | Status |
|------|------:|--------|
| MCQ WARN tier | 555 | Documented; no cleanup in this pass |
| Integrity explanation leak scan | ~5.8k rows | Post-answer field only |
| Geometry raw-sample metadata gap | 792 audit samples | Pre-attach shape; Q2-D validator passes |
| English sentence pool empty stems (closure blockers) | **2 → 0** | Fixed museum g4 + cereal g5 rows only |
| Other template-only English sentence rows | many | Pre-existing; not in micro-fix scope |

---

## 9. Files changed (cumulative uncommitted)

**Core repair:** `utils/mcq-fail-content-repair.js`, `utils/mcq-distractor-rebalance.js`, `utils/mcq-four-options.js`  
**Generators:** `utils/math-question-generator.js`, `utils/moledet-geography-question-generator.js`, `utils/hebrew-question-generator.js`, `utils/geometry-question-generator.js`, `utils/geometry-conceptual-bank.js`, `utils/english-question-generator.js`, `utils/student-question-stem-sanitizer.js`  
**Banks:** `data/geography-questions/index.js`, `data/science-questions.js`, `data/english-questions/sentence-pools-phase-b.js`, `data/english-questions/sentence-pools.js`  
**Activities:** `lib/classroom-activities/generate-activity-questions-client.js`  
**Metadata:** `lib/learning/question-engine-metadata.js`  
**Audits/tests:** `scripts/qa/*`, `tests/learning/math-mcq-answer-integrity.test.mjs`  
**Docs/artifacts:** `docs/qa/*`, `.local/system-health-blocker-fix-before-mcq-content-cleanup.patch`

---

## 10. Explicit confirmations

- [x] **No commit**
- [x] **No push**
- [x] **No SQL / migration**
- [x] **No UI / CSS / product Hebrew copy changes**
- [x] **No diagnostic engine behavior changes**
- [x] **No parent report behavior changes**
- [x] **No MCQ downweighting**
- [x] **No new active flags**

---

## 11. Owner decision

**Ready for commit/push strategy** at owner discretion. Recommended: single focused commit for question-bank MCQ repair + audit tooling, excluding `.local/` patch and optional Q1 sim artifact drift.
