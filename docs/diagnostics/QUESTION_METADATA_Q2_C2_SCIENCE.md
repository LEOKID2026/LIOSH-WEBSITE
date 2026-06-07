# Question Metadata Q2-C2 — Science Implementation

**Date:** 2026-06-06  
**Status:** Implemented (Science only)  
**Prerequisite:** Q2-A contract, Q2-B normalizer, Q2-C1 math/geometry pattern

---

## Scope

Populate `params.canonicalMetadata` on every `SCIENCE_QUESTIONS` bank row at module load time. No report, evidence-quality, classification, or API changes.

---

## Implementation

| File | Role |
|------|------|
| `lib/learning/science-canonical-metadata.js` | `enrichScienceBankRowWithCanonicalMetadata()` |
| `data/science-questions.js` | `.map(enrichScienceBankRowWithCanonicalMetadata)` after pass-1 enrich |
| `tests/learning/science-canonical-metadata.test.mjs` | Unit + bank coverage tests |

---

## Field population

| Field | Science source |
|-------|----------------|
| `skillId` | `params.diagnosticSkillId` or `sci_{topic}_general` fallback |
| `subSkill` | `params.subtype` → `conceptTag` → `patternFamily` |
| `questionType` | `technical` default; `vocabulary` / `reading_comprehension` from error tags or long experiment stems |
| `problemClass` | `mixed` for `experiments` topic; `conceptual` for recall/understanding; omitted when unclear |
| `difficulty` | `params.difficulty` or row level |
| `difficultyDepth` | Q2-B map from `params.cognitiveLevel` / `probePower` |
| `requiresVisual` | `true` only when `diagram` / `imageUrl` / `visualAsset` present |
| `requiresAudio` | `false` (no audio items in bank) |
| `answerFormat` | `mcq` from row `type` |
| `metadataConfidence` | `high` / `medium` / `low` from field completeness |
| `possibleErrorPatterns` | `expectedErrorTags` + `expectedErrorTypes` |
| `diagnosticEligibleByMetadata` | QA hint only (`skillId` present) |

Legacy `params.diagnosticSkillId` and `params.subtype` are backfilled when missing before normalization.

---

## Before / after

| Metric | Before Q2-C2 | After Q2-C2 |
|--------|--------------|-------------|
| Bank rows with `params.canonicalMetadata` | 0 | 100% of `SCIENCE_QUESTIONS` |
| Bank rows with explicit `diagnosticSkillId` | ~subset (pass-1) | 100% (fallback `sci_{topic}_general`) |
| `problemClass` on science paths | 0 | All rows (or omitted when unclear) |
| Freeze `params` preservation | `params` only | `params.canonicalMetadata` included |

---

## Out of scope (unchanged)

- `activity-classification.js`
- `evidence-quality.js` / Q1 gating
- Report aggregate / public API
- English, Hebrew, Moledet, math/geometry (Q2-C1)
- subSkill consumption in reports

---

## Tests

```bash
node --test tests/learning/science-canonical-metadata.test.mjs
node --test tests/learning/evidence-quality-layer.test.mjs
node --test tests/learning/phase8-mcq-engine-contract.test.mjs
node scripts/tests/question-metadata-coverage-audit.mjs
```
