# Parent Engine Audit Completion

Generated: 2026-07-26 (completion pass)  
Mode: **READ-ONLY** — no code / threshold / taxonomy / classifier changes  
Worktree: `LIOSH-CLEAN-MAIN-PUSH`

---

## Files delivered

| File | Purpose |
|---|---|
| `parent-engine-active-tag-path-audit.csv` | 120 active tags × subject/topic/classifier path |
| `parent-engine-threshold-visibility-matrix.csv` | Explicit hide/show cases (incl. positive accuracy) |
| `parent-engine-report-surface-parity.csv` | regular / detailed / short real builders |
| `parent-safe-label-quality-audit.csv` | 194 tags label quality statuses |
| `parent-engine-audit-completion.json` | Machine-readable summary |
| `PARENT-ENGINE-AUDIT-COMPLETION.md` | This document |

Script: `scripts/parent-engine-audit-completion.mjs`

---

## Final counts (answers to §ו)

1. **Active tags proven via real classifier: 93 / 120 PASS**  
   - 82 via `REAL_RUNTIME` (`classifyRealRuntimeScenario` / `classifyAnswerEvidence`)  
   - 11 via supplemental TEPs (same classifiers, fixtures from runtime-matrix + diagnostic-eval)  
   - **Not injected** — `tagProducedByClassifierNotInjected=yes` only on PASS rows.

2. **Failed producing expected tag: 0 FAIL**

3. **NO_VALID_FIXTURE: 27**  
   `omitted_step`, `multi_step_failure`, `wrong_final_step`, `operand_reversal`, `reverse_direction`, `percentage_base_error`, `equation_sign_error`, `inverse_operation_error`, `rounding_direction_error`, `column_arithmetic_error`, `number_sense_error`, `fact_error`, `denominator_only_compare`, `fraction_compare_error`, `decimal_place_error`, `volume_perimeter_confusion`, `height_base_confusion`, `parallelogram_area_error`, `formula_error`, `triangle_area_error`, `formula_selection_error`, `rectangle_diagonal`, `square_perimeter_compute`, `circle_perimeter_compute`, `rotation_direction_error`, `writing_pattern_error`, `writing_error`

4. **Connected to taxonomy (PASS + taxonomyId): 92**

5. **Can reach parent as precise finding**
   - **Factual enrich path (no DE2 taxonomy required):** only **2** active PASS tags have parent-safe short labels that enrich today: `place_value_error`, `calculation_off_by_one`.
   - **DE2 `patternHe` available on taxonomy row:** **92** PASS tags have `enginePrimaryLabel` — can become primary parent copy **only if** DE2 classifies (`classificationState=classified`) and `blockPatternClaim=false`.
   - Under current enrich gate + missing labels, most classified-but-unmapped tags still surface as **generic topic difficulty**.

6. **Need new / rewritten label (active): 119**  
   Label-quality statuses across 194 tags:  
   - `approved_factual`: 1 (`calculation_off_by_one`)  
   - `needs_rewrite`: 23 (causal / clinical / “ייתכן…” claims)  
   - `no_safe_label_possible`: 113  
   - `inactive`: 37  
   - `duplicate_alias`: 20  

7. **Always remain general (active, no safe factual label): 113**

8. **Report surface meaning conflicts: 0**  
   Across 8 representative states, `resolveTopicParentFindingHe` + `parentTopicDisplayChromeFromRow` + `buildDetailedParentReportFromBaseReport` produced matching meaning/badge/variant for regular / detailed / short.

9. **Hidden because accuracy is positive (engine knows pattern, parent does not see it):**  
   - `2of40`, `3of40` → strong pattern, `mastery_stable`  
   - `2of12`, `3of12`, `6of25`, `acc_70_89_q25` → consistent pattern, `partial_stable`  
   - `acc_90plus_q20`, `acc_90plus_q40_2err` → consistent/strong, `mastery_stable`  

10. **Strong only because ratio-among-errors is high while share of questions is tiny:**  
    - `2of40` (2/40 = 5% of questions, 100% of errors → `strong`)  
    - `3of40`  
    - `acc_90plus_q40_2err`  

---

## Product-policy cases (existing behavior, proven)

| Case | q / wrongs / acc | Pattern level | engineDecision | Shown specifically? |
|---|---|---|---|---|
| 6 identical / 25Q / 76% | 25 / 6 / 76% | consistent + strong evidence | `partial_stable` | **No** — enrich blocked by positive band |
| 2 identical / 20Q / 90% | 20 / 2 / 90% | consistent + strong evidence | `mastery_stable` | **No** |
| 2 identical / 40Q | 40 / 2 / 95% | **strong** (100% of errors) | `mastery_stable` | **No**; ratioOfQuestions=0.05 |
| 4 identical / 4Q | 4 / 4 / 0% | observed | `insufficient_data` | **No** type/count |
| 4 identical / 12Q / 67% | 12 / 4 / 67% | consistent | `topic_needs_strengthening` | **Yes** (mapped label) |

---

## Subjects covered in path audit

math, geometry, hebrew, english, science, moledet-geography / moledet_geography, history  

(Note: geography+moledet remain one DE2 subject; REAL_RUNTIME sometimes stamps `moledet_geography`.)

---

## What this completion adds vs the first matrix

- First matrix: thresholds only, almost all `mt:calculation_off_by_one` / `audit_topic`.  
- This pass: **real classifiers**, subject/topic/grade columns, taxonomy linkage, hide/show reasons, three-report builders, label quality statuses (active / alias / rewrite / none).

---

## Stop

No code changes. No commit / push / deploy / DB writes.  
Await product policy decisions before any concentrated fix.
