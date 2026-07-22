# Learning Engine Evidence Re-Architecture — Root Cause & Delivery Report
**Date:** 2026-07-22  
**Scope:** LEO-KIDS-WEB-TRY only  
**Status:** Implemented locally — no commit/push/deployment/SQL execution

---

## 1. Root cause (before)

| Gap | Impact |
|-----|--------|
| 56/59 DE2 rules used `topic + minWrong` only | M-09 fired on subtraction volume without checking `userAnswer === a+b` |
| Weak fallback in DE2 (`wrongs.length===0` + row wrong count) | Diagnosis without mistake events |
| Typed answers → `misconceptionTag=unknown` | Omer `add_three` omitted third addend invisible |
| Adaptive routing = correct/wrong streaks only | No probe/focus by error type |
| Hebrew/History shared `H-01…H-09` IDs | History overwrote Hebrew in `TAXONOMY_BY_ID` |
| Parent copy regex (M-09) | Specific sentences without per-answer evidence |
| Tests checked wording/contracts | No semantic falsification |

---

## 2. Architecture — before

```
question → isCorrect → save answer (misconceptionTag=unknown for typed)
       → adaptive (easy/medium streak)
       → DE2 (topic bucket + minWrong + weak fallback)
       → parent copy (regex → thinking attribution)
```

## 3. Architecture — after

```
question → classifyAnswerEvidence (DIRECT / DISTRACTOR / UNKNOWN)
       → answerEvidence contract (versioned, stored in answer_payload)
       → misconceptionTag on questionEngine + mistake events
       → evidence recurrence (tag + ratio + dedupe + probe state)
       → DE2 (evidence-gated taxonomy match only — no weak fallback)
       → parent pipeline (FACT / OBSERVED / HYPOTHESIS / CONFIRMED / PROGRESS)
       → adaptive routing (probe → focused practice → transfer → recovery)
```

---

## 4. New / changed core modules

| File | Role |
|------|------|
| `lib/learning/answer-evidence-contract.js` | Versioned evidence contract |
| `lib/learning/classifiers/math-numeric-classifier.js` | Deterministic math tags |
| `lib/learning/classifiers/mcq-distractor-classifier.js` | MCQ distractor tags |
| `lib/learning/classifiers/index.js` | Classification dispatcher |
| `utils/diagnostic-engine-v2/taxonomy-evidence-rules.js` | 59 rules → required tags |
| `utils/diagnostic-engine-v2/evidence-recurrence.js` | Pattern state machine |
| `lib/learning/misconception-adaptive-routing.js` | Probe/focus routing |
| `lib/learning/parent-report-evidence-pipeline.js` | Parent statement layers |
| `scripts/backfill-answer-evidence-dry-run.mjs` | Idempotent dry-run + SQL for owner |
| `tests/learning/evidence-engine-semantic.test.mjs` | Omer regression + falsification |

---

## 5. Taxonomy ID fix

- **Hebrew:** `H-01…H-08` (unchanged)
- **History:** renamed to **`HI-01…HI-09`** (collision resolved)
- `TAXONOMY_BY_ID` now has 59 unique IDs

---

## 6. DE2 changes

- Removed weak fallback (`wrongs.length===0` → taxonomy)
- `passesEvidenceRecurrenceRules` requires matching misconception tags
- Unit output includes `recurrence.evidenceRecurrence` trace

| `lib/learning/taxonomy-tag-producer-registry.js` | Tag → producer registry (active/inactive) |
| `lib/learning/taxonomy-rule-runtime-matrix.js` | 59-rule runtime matrix + fixtures |
| `lib/learning/diagnostic-state-persistence.js` | localStorage probe/focus/recovery |
| `lib/learning/diagnostic-state-master-helper.js` | Master bootstrap/snapshot helper |
| `lib/learning/classifiers/hebrew-typed-classifier.js` | Deterministic Hebrew spelling |
| `lib/learning/classifiers/english-typed-classifier.js` | Deterministic English spelling/tense |
| `scripts/audit-mcq-distractor-coverage.mjs` | MCQ tagging audit |
| `scripts/audit-evidence-legacy-paths.mjs` | Legacy path scan |
| `tests/learning/taxonomy-rule-falsification-matrix.test.mjs` | 59×10 fixture harness |
| `tests/learning/misconception-state-persistence.test.mjs` | Persistence E2E |

---

## 7. Coverage metrics (2026-07-22 pass 3 — **core complete**, server persistence pending owner)

| Metric | Count | Notes |
|--------|-------|-------|
| Rules with primary producer | **59/59** | `taxonomy-rule-primary-producers.js` |
| Rules with active producer (matrix) | **59/59** | primary producer + registry fallback |
| Rules with positive+negative E2E | **59/59** | `taxonomy-rule-falsification-matrix.test.mjs` |
| Active tag producers in registry (explicit) | **37/135** tags | remaining tags resolved via primary-producer fallback in `getTagProducer()` |
| MCQ bank metadata (`expectedErrorTags`) | **1360 refs** | science/history/geography banks |
| Runtime MCQ enrichment | **ACTIVE** | `question-engine-metadata.js` → `enrichMcqChoicesWithEvidenceTags` |
| Typed classifiers | **math, geometry, Hebrew spelling, English spelling/tense** | open-text content uses MCQ/probe path |
| Legacy blockers (2190-file scan) | **0** | 1 warn in `teacher-guidance-v2.server.js` (teacher UI) |
| Persistence wired (masters) | **7/7** | localStorage + `useMasterDiagnosticPersistence` |
| Server diagnostic state SQL | **ready** | `tmp/diagnostic-state-server-migration.sql` — NOT executed |
| Adaptive routing wired | **7/7 masters** | probe → focus → transfer → recovery |
| Backfill on production history | **NOT run** | dry-run: `scripts/backfill-answer-evidence-dry-run.mjs` |

---

## 8. Test results (pass 3)

| Suite | Result |
|-------|--------|
| `tests/learning/*.test.mjs` (full) | **978/978 pass** |
| `tests/learning/taxonomy-rule-falsification-matrix.test.mjs` | **67/67 pass** (59 rule E2E + matrix) |
| `tests/learning/evidence-engine-semantic.test.mjs` | **16/16 pass** |
| `tests/learning/misconception-state-persistence.test.mjs` | **3/3 pass** |
| `test:diagnostic-engine-v2-harness` | **19/19 pass** |
| `test:parent-report-diagnostic-evidence` | **OK** |
| Backfill dry-run | **OK** (sample fixture) |
| Legacy audit (2190 files) | **0 blockers** |

---

## 9. Migrations (owner only — NOT executed)

- Answer evidence backfill: `scripts/backfill-answer-evidence-dry-run.mjs` + owner SQL in script header
- Probe/focus server state: `tmp/diagnostic-state-server-migration.sql`

---

## 10. Remaining limitations (honest)

1. **Cross-device persistence**: localStorage works; server table migration prepared but API sync not wired end-to-end.
2. **Static per-option tags in all bank rows**: runtime enrichment covers serve path; legacy answers without `questionEngine` need backfill.
3. **`generic_proximity` fallback**: still used when no `expectedErrorTags` / patternFamily / infer path — honest UNKNOWN substitute.
4. **Registry explicit active tags 37/135**: taxonomy-complete via primary-producer map; registry entries not all flipped to `active: true`.
5. **Teacher guidance UI** (`teacher-guidance-v2.server.js`): warn-level wrong-count heuristic remains (not parent-report path).

---

## 11. Confirmation

- **Status: core engine complete — server persistence awaits owner**
- No git commit
- No git push
- No deployment
- No production SQL executed
