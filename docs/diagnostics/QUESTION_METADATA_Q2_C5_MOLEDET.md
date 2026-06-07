# Q2-C5 — Moledet/Geography canonical metadata population

**Status:** Implemented (additive only)  
**Scope:** Static geography banks + `generateQuestion()` + assigned-activity freeze  
**Contract:** [`QUESTION_METADATA_CONTRACT.md`](./QUESTION_METADATA_CONTRACT.md)

## Goal

Attach safe `params.canonicalMetadata` to all geography bank rows and generator output. Preserve full diagnostic `params` (including `canonicalMetadata`) through assigned-activity freeze — previously only `{ subtype, cognitiveLevel }` survived.

## Files

| File | Role |
|------|------|
| `lib/learning/moledet-geography-canonical-metadata.js` | Resolver, bank enrich, generator attach, freeze params builder |
| `data/geography-questions/index.js` | Enriches all grade pools at export |
| `utils/moledet-geography-question-generator.js` | `attachCanonicalMetadataToMoledetQuestion` on live output |
| `lib/classroom-activities/generate-activity-questions-client.js` | `frozenMoledetItemFromBankRow` → full `params` via `buildMoledetFrozenParamsFromBankRow` |
| `tests/learning/moledet-geography-canonical-metadata.test.mjs` | Unit + bank + freeze coverage |

## Freeze preservation (why touched)

**Problem:** `frozenMoledetItemFromBankRow` dropped `diagnosticSkillId`, `patternFamily`, `expectedErrorTags`, and any future `canonicalMetadata`.

**Fix:** Build full `params` from bank row + bridge + canonical enrich (mirrors Science `frozenScienceItemFromBankRow`).

**What did NOT change:** Question text, choices, correct answer, scoring, UI, or `normalizeAndFreezeQuestionSet` logic.

## Skill ID resolution (conservative)

1. Keep explicit `skillId` / `diagnosticSkillId` (e.g. `moledet_geo_homeland`).
2. Fallbacks:
   - `moledet_geo_{topic}_{subtopicId}`
   - `moledet_geo_{topic}_{subtype}`
   - `moledet_geo_{topic}_general`
3. `empty_pool` → low confidence, not diagnostic-eligible.

## questionType mapping

| Signal | questionType |
|--------|----------------|
| `mapUrl` / `diagram` / `shape` / `requiresVisual` | `visual` |
| `vocabulary_confusion` in error tags | `vocabulary` |
| `reading_comprehension_error`, `map_reading_error` | `reading_comprehension` |
| `maps` topic (text map literacy) | `reading_comprehension` |
| `cognitiveLevel: recall` | `technical` |
| Unclear | omitted |

**Note:** Banks are text-only today — `requiresVisual` stays `false` unless asset fields exist.

## Out of scope (unchanged)

- `activity-classification.js` remains sole authority for `isDiagnosticEligible` / `evidenceCategory`
- No evidence-quality or report aggregate consumption
- No SQL, UI, telemetry, or public API shape changes

## Tests

```bash
node --test tests/learning/moledet-geography-canonical-metadata.test.mjs
node --test tests/learning/question-metadata-normalizer.test.mjs
node --test tests/learning/evidence-quality-layer.test.mjs
node --test tests/learning/phase8-mcq-engine-contract.test.mjs
npm run build
node scripts/tests/question-metadata-coverage-audit.mjs
```
