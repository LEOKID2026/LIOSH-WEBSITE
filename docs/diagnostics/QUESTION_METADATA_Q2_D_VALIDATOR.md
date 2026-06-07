# Q2-D — Question Metadata Validator + Coverage Thresholds

**Status:** Implemented (read-only)  
**Prerequisite:** Q2-C1–C5 canonical metadata population complete  
**Companion:** `QUESTION_METADATA_CONTRACT.md`, `QUESTION_METADATA_CURRENT_COVERAGE_AUDIT.md`

## Purpose

Gate metadata quality before any Q2-E evidence-quality consumption. Validates coverage, field completeness, confidence honesty, non-diagnostic safety, and confirms reports/APIs do not consume `canonicalMetadata` yet.

## Files

| File | Role |
|------|------|
| `lib/learning/question-metadata-validator.js` | Core validation rules + orchestrator |
| `scripts/tests/question-metadata-validator.mjs` | CLI runner (exit 0/1) |
| `tests/learning/question-metadata-validator.test.mjs` | Unit + integration tests |

## Run

```bash
node scripts/tests/question-metadata-validator.mjs
node --test tests/learning/question-metadata-validator.test.mjs
```

## Per-subject coverage thresholds

| Subject | Phase | minTotal | minCoveragePct |
|---------|-------|----------|----------------|
| Math | Q2-C1 | 1 (generator sample) | 100% |
| Geometry | Q2-C1 | 1 (generator sample) | 100% |
| Science | Q2-C2 | 1000 bank rows | 100% |
| English | Q2-C3 | 1000 pool+generator | 100% |
| Hebrew | Q2-C4 | 50 pool+generator | 100% |
| Moledet | Q2-C5 | 3000 bank+freeze | 100% |

## Validator rules

### 1. Required fields (populated diagnostic rows)

- `contractVersion`, `subject`, `skillId`, `answerFormat`, `metadataConfidence`
- `topic` when derivable from context
- `subSkill` when derivable
- `diagnosticEligibleByMetadata` boolean only (QA/debug hint)
- **Forbidden on canonical block:** `isDiagnosticEligible`, `evidenceCategory`, `evidenceQuality`

### 2. Confidence quality

- `metadataConfidence: high` requires `subSkill` + (`possibleErrorPatterns` or explicit `diagnosticSkillId`)
- Fallback-only skill ids (`eng_*_general`, `heb_*`, `moledet_geo_*_general`, etc.) **must not** be `high`
- `heb_*` fallback ids must not be `high`

### 3. Presentation

- `requiresVisual: true` only when visual asset/shape present in source
- `requiresAudio` must not be `true` without explicit audio item
- `answerFormat` must match `answerMode` (`typing` → `text`, `choice` → `mcq`)

### 4. Non-diagnostic safety

- Metadata must not set `isDiagnosticEligible` / `evidenceCategory` for book, step-by-step, guided practice, discussion, review modes

### 5. No-consumption (pre Q2-E)

Scans report/evidence/API paths — any `canonicalMetadata` reference is a **FAIL** until Q2-E is approved.

### 6. Cross-context

No metadata scripts may merge/compare parent / private-teacher / school contexts.

## Out of scope

- No product behavior changes
- No evidence-quality or report aggregate consumption
- `activity-classification.js` remains sole authority for diagnostic eligibility
