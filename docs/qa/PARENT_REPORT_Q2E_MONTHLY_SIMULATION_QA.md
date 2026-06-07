# Parent Report Q2-E Monthly Simulation QA

**Date:** 2026-06-07
**Window:** 2026-04-01 → 2026-04-30
**Seed tag:** `parent-report-q2e-monthly-v1`
**Status:** **PASS** (12/12)

## Summary

| Area | Result |
|------|--------|
| Students verified | 12/12 PASS |
| Flag modes | A default · B metadata · C suppression · D promotion |
| Public API sanitization | All modes, all students |
| Product code changes | None |

## Scenario table

| Student | Login | Grade | Scenario | Subject/Topic | Diag | Wrongs | Days | Expected Q1 | Actual Q1 | Pass |
|---------|-------|-------|----------|---------------|------|--------|------|-------------|-----------|------|
| AAA1 | `aaa1` | 1 | A_no_data | math/addition | 0 | 0 | 0 | no_data | no_data | PASS |
| AAA2 | `aaa2` | 1 | B_insufficient_data | math/addition | 4 | 1 | 1 | insufficient_data | insufficient_data | PASS |
| AAA3 | `aaa3` | 2 | C_preliminary_by_count | math/addition | 9 | 3 | 3 | preliminary_signal | preliminary_signal | PASS |
| AAA4 | `aaa4` | 2 | D_preliminary_no_recurrence | math/addition | 14 | 4 | 1 | preliminary_signal | preliminary_signal | PASS |
| AAA5 | `aaa5` | 3 | E_supported_diagnosis | math/multiplication | 14 | 5 | 3 | supported_diagnosis | supported_diagnosis | PASS |
| AAA6 | `aaa6` | 3 | F_parent_assigned | math/multiplication | 8 | 2 | 2 | preliminary_signal | preliminary_signal | PASS |
| AAA7 | `aaa7` | 4 | G_non_diagnostic_exclusion | math/multiplication | 0 | 0 | 0 | no_data | no_data | PASS |
| AAA8 | `aaa8` | 4 | H_questionType_contrast | math/fractions | 15 | 5 | 3 | supported_diagnosis | supported_diagnosis | PASS |
| AAA9 | `aaa9` | 5 | I_weak_metadata_suppression | math/fractions | 14 | 5 | 3 | supported_diagnosis | supported_diagnosis | PASS |
| AAA10 | `aaa10` | 5 | J_english_metadata | english/grammar | 8 | 2 | 2 | supported_diagnosis | supported_diagnosis | PASS |
| AAA11 | `aaa11` | 6 | K_hebrew_metadata | hebrew/reading_comprehension | 8 | 2 | 2 | supported_diagnosis | supported_diagnosis | PASS |
| AAA12 | `aaa12` | 6 | L_science_moledet | science/body | 8 | 2 | 2 | supported_diagnosis | supported_diagnosis | PASS |

## Manual inspection helpers

| Student | Report URL | Suggested mode | What to look for |
|---------|------------|----------------|------------------|
| AAA1 | `/learning/parent-report?studentId=fd3901da-66ce-46c7-a24c-b33df2141c04&from=2026-04-01&to=2026-04-30&source=parent` | Mode A | Empty month — generic encouragement only |
| AAA2 | `/learning/parent-report?studentId=6c4f6dc1-de43-4b86-abe7-4f041e9d3a8c&from=2026-04-01&to=2026-04-30&source=parent` | Mode A | Insufficient — no strong diagnosis |
| AAA3 | `/learning/parent-report?studentId=a5b644c4-7407-422f-bb23-a78a0a608a98&from=2026-04-01&to=2026-04-30&source=parent` | Mode A | Preliminary by count — low confidence |
| AAA4 | `/learning/parent-report?studentId=38e2dbcf-a927-419f-a2ed-b26c7100e656&from=2026-04-01&to=2026-04-30&source=parent` | Mode A | Preliminary — no recurrence across days |
| AAA5 | `/learning/parent-report?studentId=79c8f8c7-2494-439e-b867-93b096c8590b&from=2026-04-01&to=2026-04-30&source=parent` | Mode A | Supported math — strong insights allowed |
| AAA6 | `/learning/parent-report?studentId=b325272f-b554-4865-a827-6477773fb200&from=2026-04-01&to=2026-04-30&source=parent` | Mode A | Parent-assigned homework included |
| AAA7 | `/learning/parent-report?studentId=d8f6b184-80f2-4f2b-897e-cbbf557022e7&from=2026-04-01&to=2026-04-30&source=parent` | Mode A | Learning/book only — no diagnostic diagnosis |
| AAA8 | `/learning/parent-report?studentId=921e1c5d-4124-41cd-bad7-a16dbf0dfecc&from=2026-04-01&to=2026-04-30&source=parent` | Mode D | Technical stable vs word_problem weak — promotion trial |
| AAA9 | `/learning/parent-report?studentId=cd4ba8f0-fe4f-424d-8ed1-0c3acaf5f412&from=2026-04-01&to=2026-04-30&source=parent` | Mode C | Q1 supported but weak metadata — active suppression |
| AAA10 | `/learning/parent-report?studentId=dea2bbce-1712-4862-9de7-00b732672fbb&from=2026-04-01&to=2026-04-30&source=parent` | Mode B | English grammar/vocab — internal metadata only |
| AAA11 | `/learning/parent-report?studentId=5f3df0a3-4527-4f8b-97cf-6e8ec5624920&from=2026-04-01&to=2026-04-30&source=parent` | Mode B | Hebrew reading/vocab — no new copy |
| AAA12 | `/learning/parent-report?studentId=873c6971-06ed-4b31-9d76-616b4b623a52&from=2026-04-01&to=2026-04-30&source=parent` | Mode B | Science + Moledet — normal parent report |

## Flag modes

Set locally before starting dev server (do not change Vercel/production):

```env
# Mode A — production default
DIAGNOSTIC_METADATA_SUBSKILL_ENABLED=false
DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED=false
DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED=false

# Mode B — metadata internal
DIAGNOSTIC_METADATA_SUBSKILL_ENABLED=true

# Mode C — + active suppression
DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED=true

# Mode D — + promotion trial
DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED=true
```

## Regression commands (post-seed)

| Command | Result |
|---------|--------|
| `question-metadata-consumption.test.mjs` | 88/88 PASS |
| `question-metadata-validator.mjs` | PASS |
| `evidence-quality-layer.test.mjs` | 14/14 PASS |
| `diagnostic-truth-consumer-verification.test.mjs` | 24/24 PASS |
| `question-metadata-coverage-audit.mjs` | PASS |
| `parent-report-q1-simulation.mjs --verify-only` | **Expected fail after monthly seed** — Q1 narrow windows superseded by April monthly dataset; re-run Q1 seed to restore |

## Public API sanitization

All 12 students × 4 flag modes (48 snapshots): public payload checks pass for `_evidenceQuality`, metadata internals, `_canonicalMeta`, rollups, and cross-context leak keys.

## Metadata mode highlights

| Student | Mode B (internal) | Mode C (suppression) | Mode D (promotion) |
|---------|-------------------|----------------------|---------------------|
| AAA1 | bySubSkill=false shadow=true | appliedGating=false | promotionDecisions=0 |
| AAA2 | bySubSkill=true shadow=true | appliedGating=false | promotionDecisions=0 |
| AAA3 | bySubSkill=true shadow=true | appliedGating=false | promotionDecisions=0 |
| AAA4 | bySubSkill=true shadow=true | appliedGating=false | promotionDecisions=0 |
| AAA5 | bySubSkill=true shadow=true | appliedGating=true | promotionDecisions=0 |
| AAA6 | bySubSkill=true shadow=true | appliedGating=false | promotionDecisions=0 |
| AAA7 | bySubSkill=false shadow=true | appliedGating=false | promotionDecisions=0 |
| AAA8 | bySubSkill=true shadow=true | appliedGating=true | promotionDecisions=0 |
| AAA9 | bySubSkill=true shadow=true | appliedGating=true | promotionDecisions=0 |
| AAA10 | bySubSkill=true shadow=true | appliedGating=true | promotionDecisions=1 |
| AAA11 | bySubSkill=true shadow=true | appliedGating=false | promotionDecisions=0 |
| AAA12 | bySubSkill=true shadow=true | appliedGating=true | promotionDecisions=1 |


```bash
node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-simulation.mjs
node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-simulation.mjs --verify-only
node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-simulation.mjs --clean-only
```

Results JSON: `docs/qa/_artifacts/parent-report-q2e-monthly/parent-report-q2e-monthly-results.json`

Screenshots: skipped (not requested)

## Cleanup note

Seed+clean removes both `parent-report-q2e-monthly-v1` and legacy `parent-report-q1-sim-v1` tagged rows to avoid April window double-counting.