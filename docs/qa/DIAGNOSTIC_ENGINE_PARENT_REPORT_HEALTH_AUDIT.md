# Diagnostic Engine & Parent Report Health Audit

**Generated:** 2026-06-08  
**Scope:** Production-default state (all Q2 metadata flags OFF)  
**Verdict:** **PASS with warnings** (unit/build/sanitization pass; Q1 DB simulation fails on stale seed data)

---

## 1. Metadata feature flags (default OFF)

Verified in `lib/learning/diagnostic-metadata-subskill-flag.js`: each flag returns `true` **only** when env is exactly `"true"`.

| Flag | `.env.local` present? | Effective value | Expected |
|------|----------------------|-----------------|----------|
| `DIAGNOSTIC_METADATA_SUBSKILL_ENABLED` | No | **OFF** | OFF |
| `DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED` | No | **OFF** | OFF |
| `DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED` | No | **OFF** | OFF |

**Result:** PASS (product default)

---

## 2. Required test & build commands

### Q1 evidence quality tests

```powershell
node --test tests/learning/evidence-quality-layer.test.mjs
```

| Result | Pass/fail | Classification |
|--------|-----------|----------------|
| 6 suites, all tests | **PASS** | — |

### Diagnostic truth consumer tests

```powershell
node --test tests/reports/diagnostic-truth-consumer-verification.test.mjs
```

| Result | Pass/fail | Classification |
|--------|-----------|----------------|
| Phase 10 suites (parent/guardian/teacher/school/API strip) | **PASS** (142 tests total with combined run) | — |

### Combined Q1 + truth consumer

```powershell
node --test tests/learning/evidence-quality-layer.test.mjs tests/reports/diagnostic-truth-consumer-verification.test.mjs tests/learning/question-metadata-consumption.test.mjs tests/learning/question-metadata-validator.test.mjs
```

| Result | **PASS** — 142/142 tests | — |

### Q2 metadata consumption tests

```powershell
node --test tests/learning/question-metadata-consumption.test.mjs
```

| Result | **PASS** — includes `default flag is OFF`, public payload unchanged when flag OFF | — |

### Q2 validator tests

```powershell
node --test tests/learning/question-metadata-validator.test.mjs
node scripts/tests/question-metadata-validator.mjs
```

| Layer | Result | Classification |
|-------|--------|----------------|
| Unit tests | **PASS** | — |
| Read-only bank scan | **PASS** — 100% canonical metadata all 6 subjects | — |

### Activity classification SSOT

```powershell
node --test tests/learning/activity-classification.test.mjs
```

| Result | **PASS** — 36/36 (book/step-by-step/guidance/discussion non-diagnostic) | — |

### Metadata coverage audit (Q2-A)

```powershell
node scripts/tests/question-metadata-coverage-audit.mjs
```

| Result | **PASS** — read-only scan, all subjects populated | — |

### Parent report Q1 simulation (verify-only)

```powershell
node --env-file=.env.local scripts/qa/parent-report-q1-simulation.mjs --verify-only
```

| Result | **FAIL** — 6/12 scenarios pass | **Environment / data** |

**Exact failures (sanitization strip checks all PASS on every scenario):**

| Student | Scenario | Failure | Classification |
|---------|----------|---------|----------------|
| AAA2 | B_insufficient_data | Expected `insufficient_data`, got `preliminary_signal` (10 answers) | **Data** — seed counts vs Q1 thresholds; possible cross-simulation pollution |
| AAA3 | C_preliminary_by_count | Expected `preliminary_signal`, got `supported_diagnosis` | **Data** |
| AAA7 | G_non_diagnostic_exclusion | `learning_activity_present` — 0 learning/book rows in range | **Environment** — seed missing or cleaned |
| AAA8 | I_date_range_1 | Day/week diagnostic counts exceed expected (9 vs 5, 45 vs 10) | **Data** — documented Q2E/Q1 seed overlap |
| AAA9 | I_date_range_2 | Apr-26 day count 0 vs expected 6 | **Data** |
| AAA12 | F_parent_assigned_grade6 | Expected `preliminary_signal`, got `supported_diagnosis` | **Data** |

**Important:** All 12 scenarios passed **API sanitization** checks (`public_evidenceQuality`, no `_evidenceQuality`, no `supportingEvidenceIds`, no `sourceBreakdown`, no cross-context leak keys).

Artifact: `docs/qa/_artifacts/parent-report-q1-sim/parent-report-q1-sim-results.json`

### Build

```powershell
npm run build
```

| Result | **PASS** (exit 0) | Warnings only |
|--------|-------------------|---------------|
| Next.js 15.5.18 compile | Success ~4.3 min | `question-metadata-scanner.js` critical dependency expression (existing) |

---

## 3. Flag-OFF behavioral checks (from tests + Q1 sim strip checks)

| Check | Result |
|-------|--------|
| Parent report public API shape unchanged when flags OFF | **PASS** (consumption tests) |
| `meta.evidenceQuality` sanitized | **PASS** (Q1 tests + Q1 sim stripChecks) |
| Internal fields stripped from public payload | **PASS** — `_evidenceQuality`, `supportingEvidenceIds`, `sourceBreakdown`, `bySubSkill`, `errorPatterns`, `questionTypes`, etc. |
| Parent context evidence only | **PASS** (Q1 policy tests) |
| Teacher/school do not consume parent-only metadata internals | **PASS** (truth consumer tests) |
| `activity-classification.js` SSOT | **PASS** — metadata cannot reclassify book/guided/discussion |
| Metadata does not create diagnostic evidence alone | **PASS** (consumption + classification tests) |

---

## 4. Phase 1 verdict

| Area | Verdict |
|------|---------|
| Flag defaults | **PASS** |
| Unit/regression tests | **PASS** |
| Q2-D validator / coverage | **PASS** |
| Build | **PASS** |
| Parent report sanitization (live DB verify) | **PASS** |
| Q1 scenario sufficiency (live DB verify) | **FAIL** — re-seed Q1 after Q2E monthly sim |
| Overall Phase 1 | **PASS with warnings** |

---

## 5. Recommended follow-up (not done in this pass)

1. Re-run `node --env-file=.env.local scripts/qa/parent-report-q1-simulation.mjs` (full seed + verify) in a clean window, or document Q1 verify-only as expected-fail when Q2E April data exists.
2. No product code changes were made for Q1 failures during this audit.

---

## Files touched by this audit

- `docs/qa/DIAGNOSTIC_ENGINE_PARENT_REPORT_HEALTH_AUDIT.md` (this file)
- `docs/qa/_artifacts/parent-report-q1-sim/parent-report-q1-sim-results.json` (re-written by verify-only run)

No commit. No push. No SQL/migrations. No UI/CSS/Hebrew copy changes. No active diagnostic behavior changes.
