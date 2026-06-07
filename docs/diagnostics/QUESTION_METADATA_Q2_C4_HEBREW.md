# Q2-C4 — Hebrew canonical metadata population

**Status:** Implemented (additive only)  
**Scope:** `HEBREW_RICH_POOL` + `generateQuestion()` output  
**Contract:** [`QUESTION_METADATA_CONTRACT.md`](./QUESTION_METADATA_CONTRACT.md)

## Goal

Attach safe `params.canonicalMetadata` (and `row.canonicalMetadata` on rich pool rows) using existing Hebrew fields. Conservative skill-id policy — no invented fine-grained ids where source data is weak.

## Files

| File | Role |
|------|------|
| `lib/learning/hebrew-canonical-metadata.js` | Resolver, pool enrich, generator attach |
| `utils/hebrew-rich-question-bank.js` | Canonical enrich after diagnostic enrich pass |
| `utils/hebrew-question-generator.js` | `attachCanonicalMetadataToHebrewQuestion` on all return paths |
| `tests/learning/hebrew-canonical-metadata.test.mjs` | Unit + bank + freeze coverage |
| `scripts/tests/question-metadata-coverage-audit.mjs` | Hebrew runtime samples |

## Skill ID resolution (conservative)

1. Keep explicit `diagnosticSkillId` from enrich pass (e.g. `he_comp_explicit_detail`, `he_vocab_synonym`, `he_gram_gender_number`).
2. Fallbacks (deterministic only):
   - `heb_{topic}_{subtopicId}` (dots sanitized to underscores)
   - `heb_{topic}_{subtype}`
   - `heb_{topic}_general` when no better signal
3. `empty_pool` / `no_questions` → low confidence, `diagnosticEligibleByMetadata: false`.

## questionType mapping

| Signal | questionType |
|--------|----------------|
| `comprehension`, `reading`, `passage_*` | `reading_comprehension` |
| `vocabulary`, synonym/antonym/context patterns | `vocabulary` |
| `grammar`, agreement/tense patterns | `grammar` |
| `spelling` | `technical` |
| Unclear (e.g. free writing) | omitted |

## Out of scope (unchanged)

- `activity-classification.js` remains sole authority for `isDiagnosticEligible` / `evidenceCategory`
- No evidence-quality or report aggregate consumption
- Legacy inline pools in generator file: metadata at generation time only (no static export hook)
- No SQL, UI, telemetry, or public API shape changes

## Tests

```bash
node --test tests/learning/hebrew-canonical-metadata.test.mjs
node --test tests/learning/question-metadata-normalizer.test.mjs
node --test tests/learning/evidence-quality-layer.test.mjs
node --test tests/learning/phase8-mcq-engine-contract.test.mjs
npm run build
node scripts/tests/question-metadata-coverage-audit.mjs
```
