# System Health After Diagnostic & Question Changes — Owner Summary

**Generated:** 2026-06-08  
**Audit type:** Verification-only (no product fixes, no commit, no push)

---

## 1. Overall verdict: **NOT PASS**

The diagnostic engine **unit layer and parent-report sanitization are healthy** with flags OFF. **Question banks and MCQ quality have material issues** that block a clean launch readiness sign-off without targeted fixes.

| Phase | Verdict |
|-------|---------|
| Phase 1 — Diagnostic / parent report | **PASS with warnings** |
| Phase 2 — Question bank integrity | **NOT PASS** |
| Phase 3 — MCQ obvious-answer risk | **NOT PASS** |
| Phase 4 — Diagnostic handling design | **Audit complete** (no behavior change) |

---

## 2. Diagnostic engine verdict

**PASS with warnings**

- All 142 combined unit tests pass (Q1 evidence quality, truth consumers, Q2 consumption, Q2 validator).
- Q2-D read-only validator: 100% canonical metadata coverage all six subjects.
- Q2-A coverage audit: PASS.
- `activity-classification.js` remains SSOT; 36/36 classification tests pass.
- All three `DIAGNOSTIC_METADATA_*` flags default **OFF** (unset in `.env.local`).
- `npm run build`: **PASS** (warnings only, pre-existing scanner dependency note).

---

## 3. Parent report verdict

**PASS with warnings**

- Public API sanitization: **PASS** on all 12 Q1 verify scenarios (`stripChecks` all green).
- Internal fields do not leak (`_evidenceQuality`, `supportingEvidenceIds`, `sourceBreakdown`, rollups, etc.).
- Q1 simulation verify-only: **6/12 FAIL** — sufficiency/date-range/seed presence, **not** sanitization.
- Failure class: **environment/data** (Q1 seed stale or overlapped with Q2E April realistic/monthly data; documented in `PARENT_REPORT_Q2E_MONTHLY_SIMULATION_QA.md`).

---

## 4. Question bank integrity verdict

**NOT PASS**

**Command:** `npx tsx scripts/qa/system-health-question-bank-integrity-audit.mjs`  
**Artifact:** `docs/qa/_artifacts/question-bank-integrity/question-bank-integrity.json`  
**Report:** `docs/qa/QUESTION_BANK_INTEGRITY_AUDIT.md`

| Subject | Scanned | Structural fail | Leak risk | Missing metadata |
|---------|--------:|----------------:|----------:|-----------------:|
| science | 1,017 | 0 | 1,017 | 0 |
| english | 953 | 0 | 953 | 0 |
| moledet_geography | 4,046 | 0 | 4,046 | 0 |
| math (generated samples) | 1,422 | 19 | 1,083 | 0 |
| geometry (generated samples) | 792 | 0 | 583 | **792** |
| hebrew | 702 | 4 | 695 | 0 |

**Key findings:**

1. **Math generator (product):** 19/1,422 sampled cells have duplicate MCQ options (e.g. `multiplication`, `number_sense` paths).
2. **Geometry generator samples (product/audit gap):** 792/792 missing `canonicalMetadata` on raw generator output — Q2-D validator passes via separate attach path; audit flags raw pre-attach shape.
3. **Answer leak scan (mostly explanation field):** Science, moledet, english show 100% “leak risk” because **`explanation` text contains the correct answer** — valid for post-answer content but should confirm student never sees explanation during attempt.
4. **Hebrew:** 4 duplicate-option cases in rich pool.
5. **Static banks:** 5,530 rows; generators: 3,402 samples (6/cell).

---

## 5. MCQ obvious-answer verdict

**NOT PASS**

**Command:** `npx tsx scripts/qa/system-health-mcq-obvious-answer-risk-audit.mjs`  
**Artifact:** `docs/qa/_artifacts/mcq-obvious-answer-risk/mcq-obvious-answer-risk.json`  
**Report:** `docs/qa/MCQ_OBVIOUS_ANSWER_RISK_AUDIT.md` (includes Phase 4 diagnostic handling recommendation)

| Metric | Count |
|--------|------:|
| MCQ scanned | 8,932 |
| Questions flagged | 4,667 (52%) |
| BLOCKER | 0 |
| FAIL | 789 |
| WARN | 3,878 |

**By subject (flagged / total):**

| Subject | Flagged | FAIL highlights |
|---------|--------:|-----------------|
| moledet_geography | 3,100 / 4,046 | Length/format/stem clues; heavy G index pattern on static banks |
| science | 778 / 1,017 | 111 FAIL — length/format/stem |
| hebrew | 197 / 702 | 89 FAIL — generic distractors, stem clues |
| english | 348 / 953 | 12 FAIL — mostly format/grammar |
| geometry | 163 / 792 | Format/numeric clues |
| math | 81 / 1,422 | 9 FAIL — numeric plausibility |

**Audit caveat:** Category **G (option pattern clue)** inflates on static bank rows where `correctIndex` is fixed in source JSON — runtime shuffle may mitigate; human review required.

**Phase 4:** No existing runtime field for obvious-answer quality. Recommended future additive internal field `questionQuality.mcqObviousnessRisk` behind a new default-OFF flag — see MCQ audit doc section “Diagnostic handling recommendation”. **No active behavior changed.**

---

## 6. Top blockers

1. **789 MCQ FAIL-severity obvious-answer risks** — especially moledet/science/hebrew (human review + question fixes required).
2. **Math generator duplicate MCQ options** — 19 sampled failures (product).
3. **Mass explanation-field answer overlap** in static science/moledet banks — confirm UX isolation; may still affect assigned snapshots if explanation stored in question payload visible to audit.

---

## 7. Top warnings

1. **Q1 parent-report simulation 6/12 fail** — re-seed Q1 data; not a sanitization regression.
2. **Geometry generated samples lack raw canonicalMetadata** — attach path may be fine at runtime; align generator output or audit hook.
3. **3,878 MCQ WARN** — length/format outliers across banks.
4. **Build warning** — dynamic import in `question-metadata-scanner.js` (pre-existing).
5. **Category G pool-index heuristic** — may over-report on unshuffled bank source rows.

---

## 8. Exact commands run

```powershell
# Phase 1
node --test tests/learning/evidence-quality-layer.test.mjs tests/reports/diagnostic-truth-consumer-verification.test.mjs tests/learning/question-metadata-consumption.test.mjs tests/learning/question-metadata-validator.test.mjs
node --test tests/learning/activity-classification.test.mjs
node scripts/tests/question-metadata-validator.mjs
node scripts/tests/question-metadata-coverage-audit.mjs
node --env-file=.env.local scripts/qa/parent-report-q1-simulation.mjs --verify-only
npm run build

# Phase 2
npx tsx scripts/qa/system-health-question-bank-integrity-audit.mjs

# Phase 3 + 4
npx tsx scripts/qa/system-health-mcq-obvious-answer-risk-audit.mjs
```

---

## 9. Files changed during audit

**New audit scripts (verification tooling only):**

- `scripts/qa/system-health-question-bank-integrity-audit.mjs`
- `scripts/qa/system-health-mcq-obvious-answer-risk-audit.mjs`
- `scripts/qa/lib/mcq-obvious-answer-risk.mjs`

**New/updated reports & artifacts:**

- `docs/qa/DIAGNOSTIC_ENGINE_PARENT_REPORT_HEALTH_AUDIT.md`
- `docs/qa/QUESTION_BANK_INTEGRITY_AUDIT.md`
- `docs/qa/MCQ_OBVIOUS_ANSWER_RISK_AUDIT.md`
- `docs/qa/SYSTEM_HEALTH_AFTER_DIAGNOSTIC_AND_QUESTION_CHANGES_SUMMARY.md` (this file)
- `docs/qa/_artifacts/question-bank-integrity/question-bank-integrity.json`
- `docs/qa/_artifacts/mcq-obvious-answer-risk/mcq-obvious-answer-risk.json`
- `docs/qa/_artifacts/parent-report-q1-sim/parent-report-q1-sim-results.json` (updated by verify-only run)

---

## 10. Confirmation

| Constraint | Status |
|------------|--------|
| No git commit | ✓ |
| No git push | ✓ |
| No SQL / migrations | ✓ |
| No UI / CSS / Hebrew copy changes | ✓ |
| No active diagnostic behavior changes | ✓ |
| No question rewrites in this pass | ✓ |

---

## 11. Recommended next steps

1. **Fix blockers only:** math duplicate-option generator paths; top FAIL MCQ items in moledet/science/hebrew (use JSON artifact for file/id references).
2. **Re-seed and re-run** `parent-report-q1-simulation.mjs` (full seed + verify) when Q2E data is not polluting AAA students.
3. **Re-run focused audits:**
   - `npx tsx scripts/qa/system-health-question-bank-integrity-audit.mjs`
   - `npx tsx scripts/qa/system-health-mcq-obvious-answer-risk-audit.mjs`
4. **Only after blockers clear:** decide broader question-bank quality improvement (WARN tier, explanation-field policy, geometry metadata attach alignment).
5. **Do not enable** MCQ quality downweight in diagnostic engine until bank fixes land and owner approves new default-OFF flag (Phase 4 design).

---

## Related documents

- [Diagnostic Engine Parent Report Health Audit](./DIAGNOSTIC_ENGINE_PARENT_REPORT_HEALTH_AUDIT.md)
- [Question Bank Integrity Audit](./QUESTION_BANK_INTEGRITY_AUDIT.md)
- [MCQ Obvious Answer Risk Audit](./MCQ_OBVIOUS_ANSWER_RISK_AUDIT.md)
