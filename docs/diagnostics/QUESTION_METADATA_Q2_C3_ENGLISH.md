# Q2-C3 — English canonical metadata population

**Status:** Implemented (additive only)  
**Scope:** English pools + `generateQuestion()` output  
**Contract:** [`QUESTION_METADATA_CONTRACT.md`](./QUESTION_METADATA_CONTRACT.md)

## Goal

Attach safe `params.canonicalMetadata` (and pool-level `row.canonicalMetadata` for static rows) using existing English fields. No product, report, evidence-quality, or classification behavior changes.

## Files

| File | Role |
|------|------|
| `lib/learning/english-canonical-metadata.js` | Resolver, pool enrich, generator attach |
| `data/english-questions/index.js` | Enriches `GRAMMAR_POOLS`, `SENTENCE_POOLS`, `TRANSLATION_POOLS` at export |
| `utils/english-question-generator.js` | `attachCanonicalMetadataToEnglishQuestion` on every `generateQuestion()` return |
| `tests/learning/english-canonical-metadata.test.mjs` | Unit + bank + freeze coverage |
| `scripts/tests/question-metadata-coverage-audit.mjs` | English runtime samples |

## Skill ID resolution (conservative)

1. Keep explicit `diagnosticSkillId` / row `skillId` when present (e.g. `en_grammar_be_present`).
2. Fallbacks (deterministic only):
   - `eng_grammar_{subtype}`
   - `eng_vocabulary_{listKey}`
   - `eng_translation_{englishPoolKey}`
   - `eng_sentences_{subtype}`
   - `eng_{topic}_general` when no better signal exists
3. `english_empty_pool` → low confidence, `diagnosticEligibleByMetadata: false`.

## Canonical fields populated

| Field | Source |
|-------|--------|
| `skillId` | explicit id or fallback above |
| `subSkill` | `subtype`, `patternFamily`, `listKey`, or `englishPoolKey` |
| `questionType` | topic map (`grammar`, `vocabulary`, `translation`; `writing` → `translation`) |
| `problemClass` | `conceptual` / `mixed` / omitted (conservative) |
| `difficulty` | row `difficulty`, `levelKey`, normalizer band |
| `difficultyDepth` | normalizer when `cognitiveLevel` present |
| `requiresVisual` | only when image/diagram/`requiresVisual` |
| `requiresAudio` | always `false` |
| `answerFormat` | `mcq` vs `text` from `qType` / `answerMode` |
| `metadataConfidence` | `high`/`medium`/`low` — never inflated for sparse rows |
| `possibleErrorPatterns` | from `expectedErrorTags` / `expectedErrorTypes` / `distractorFamily` |
| `diagnosticEligibleByMetadata` | QA/debug hint only |

## Out of scope (unchanged)

- `activity-classification.js` remains sole authority for `isDiagnosticEligible` / `evidenceCategory`
- No evidence-quality or report aggregate consumption
- No Hebrew / Moledet / Math / Geometry / Science changes in this phase
- No SQL, UI, telemetry, or public API shape changes

## Tests

```bash
node --test tests/learning/english-canonical-metadata.test.mjs
node --test tests/learning/question-metadata-normalizer.test.mjs
node --test tests/learning/evidence-quality-layer.test.mjs
node --test tests/learning/phase8-mcq-engine-contract.test.mjs
npm run build
node scripts/tests/question-metadata-coverage-audit.mjs
```
