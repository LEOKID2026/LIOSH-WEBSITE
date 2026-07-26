# Parent Engine — Final Closure Verification

**Date:** 2026-07-26  
**Scope:** LIOSH-CLEAN-MAIN-PUSH (read-only verification + one product exception fix)  
**Status:** NO commit / NO push / NO deploy

## Exception found and fixed during closure

`procedure_break` / `pf:procedure_break` could enter `factualObservations` via the shared label map although it was **not** among the 93 classifier-proven tags.

**Fix:** split `PROVEN_FACTUAL_PARENT_LABEL_HE` (93) from `LEGACY_PATTERN_FAMILY_LABEL_HE`; gate observations with `isApprovedFactualObservationTag()` / `FACTUAL_OBSERVATION_APPROVED_TAGS`.

After fix: `procedure_break_can_enter_factualObservations = false`.

---

## 1. Thin volume (q=1–4) — engineDecision × ADC

**Finding:** For all 10 requested cases, `engineDecision` is `insufficient_data` **before and after** (T0 policy unchanged for 1–4). ADC action stays `collect_more_evidence`, state surface `canonical:withhold`, `intervention=false`.

Product-visible changes at 1–4 are **chrome + factualObservations**, not ADC escalation.

| q | acc | ED before | ED after | ADC action before/after | badge | variant | facts |
|---|-----|-----------|----------|-------------------------|-------|---------|-------|
| 1 | 0% | insufficient_data | insufficient_data | collect_more_evidence | מעט שאלות - נראו הרבה טעויות | neutral | observed off-by-one |
| 1 | 100% | insufficient_data | insufficient_data | collect_more_evidence | מעט שאלות - כיוון ראשוני | neutral | none |
| 2 | 50% | insufficient_data | insufficient_data | collect_more_evidence | מעט שאלות - נראו כמה טעויות | neutral | observed |
| 2 | 100% | insufficient_data | insufficient_data | collect_more_evidence | מעט שאלות - כיוון ראשוני | neutral | none |
| 3 | 33% | insufficient_data | insufficient_data | collect_more_evidence | מעט שאלות - נראו הרבה טעויות | neutral | repeated |
| 3 | 67% | insufficient_data | insufficient_data | collect_more_evidence | מעט שאלות - נראו כמה טעויות | neutral | observed |
| 4 | 0% | insufficient_data | insufficient_data | collect_more_evidence | מעט שאלות - נראו הרבה טעויות | neutral | repeated (4) |
| 4 | 50% | insufficient_data | insufficient_data | collect_more_evidence | מעט שאלות - נראו כמה טעויות | neutral | repeated |
| 4 | 75% | insufficient_data | insufficient_data | collect_more_evidence | מעט שאלות - כיוון ראשוני | neutral | observed |
| 4 | 100% | insufficient_data | insufficient_data | collect_more_evidence | מעט שאלות - כיוון ראשוני | neutral | none |

Checks: no `mastery_stable` / `partial_stable` under 10Q; no badge/text "טוב"/"מצוין" at 1–4; observations present when errors exist; ADC not intervention.

Full matrix: `docs/audits/parent-engine-final-closure-verification.json` → `thinVolumeMatrix`.

---

## 2. 60 dossiers — diffs

Scanned **647** topic rows across 60 dossiers.

| Metric | Count |
|--------|------:|
| engineDecision changed | **0** |
| ADC action changed (null-authority recompute) | **0** |
| ADC state changed | **0** |
| Topics gaining new factualObservations (from approved tags in snapshot patterns) | **216** |
| Observations beside partial_stable | **12** |
| Observations beside mastery_stable | **13** |
| q&lt;5 engineDecision changed | **0** |

All 216 rows are observation/parent-text composition deltas explained by approved factual policy (snapshots predate `factualObservations`). No unexplained ADC shift.

CSV of rows: `docs/audits/parent-engine-dossier-engine-adc-diffs.csv`.

---

## 3. 93 labels map

Full CSV: `docs/audits/parent-engine-93-factual-labels-map.csv`  
(`internalKey`, `canonicalKey`, `labelHe`, `subject`, `classifierProof`, `aliasOf`, `approvedFactual`)

- **93/93** `approvedFactual=true`
- Forbidden causal words: none in proven labels
- Unique canonical keys after alias merge: **88**
- Unique canonical labels after alias merge: **88**

### Explicit answers

1. **`place_value_error` final label:** `ערך מקום שאינו תואם לתשובה הנכונה` (factual, not hypothesis)
2. **`pf:procedure_break` still in label lookup?** Yes — in **legacy** map for cluster sanitize only
3. **Can `procedure_break` enter factualObservations?** **No** (after allowlist gate)
4. Gate stop condition: satisfied (blocked)
5. **Unique canonical labels after alias merge:** **88** (not 93)

---

## 4. factualObservations report parity

Synthetic scenarios (regular / detailed / short via same `resolveTopicParentFindingHe` path):

| Scenario | obsCount | textsIdentical | no internal key in text path |
|----------|----------|----------------|------------------------------|
| single | 1 | yes | labels only |
| two/three distinct | 3 | yes | labels only |
| alias merge (carry/regroup/column) | 1 (count 3) | yes | |
| beside mastery_stable | 1 | yes | |
| beside partial_stable | 1 | yes | |
| beside insufficient_data | 1 | yes | |
| unsafe tag | 0 | yes | |
| procedure_break blocked | 0 | yes | |

No observation loss on short path; EDC mirrors LPD `factualObservations`.

---

## 5. Recurrence ladder (exact)

| Case | Result |
|------|--------|
| 1/40 | observed |
| 2/40 | repeated |
| 3/40 | repeated |
| 3/5 (ratioE≥0.4, ratioQ≥0.15) | consistent |
| 3/5 (ratioE&lt;0.4) | repeated |
| 3/21 (ratioQ&lt;0.15) | repeated |
| 4/12 | consistent |
| 5/10 | strong |
| 6/25 | strong |
| 4/4 | repeated |

Note: `3/20` has ratioQ=0.15 exactly → **consistent** under `ratioQ≥0.15`. The policy row “כאשר ratioQ&lt;0.15” is verified with **3/21**.

Ladder affects `factualObservations.recurrenceLevel` / parent wording strength only — not taxonomyId / detectedPattern / patternLayer / classificationState.

---

## 6. Git inventory (worktree)

### `git status --short` / `git diff --name-status` / `git diff --stat`

See live output in session; summary:

**Production (modified):**
- `components/parent-report-short-contract-preview.jsx`
- `lib/parent-ui/parent-report-site-bright-theme.css.js`
- `pages/learning/parent-report.js`
- `pages/learning/parent-report-detailed.js`
- `pages/learning/parent-report-detailed.renderable.jsx`
- `utils/contracts/parent-product-contract-v1.js`
- `utils/learning-pattern-decision/build-learning-pattern-decision.js`
- `utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js`
- `utils/learning-pattern-decision/parent-facing-error-pattern-he.js`
- `utils/learning-pattern-decision/parent-report-ui-helpers.js`
- `utils/learning-pattern-decision/resolve-repeated-mistake-patterns.js`
- `utils/learning-pattern-decision/schema.js`
- `utils/parent-report-engine-v1-signals.js`

**Production (new):**
- `utils/learning-pattern-decision/build-factual-observations.js`
- `utils/learning-pattern-decision/compose-parent-finding-with-factual-observations.js`
- `utils/learning-pattern-decision/enrich-parent-finding-with-factual-pattern.js`
- `utils/learning-pattern-decision/enrich-parent-finding-legacy-label.js`
- `utils/parent-report-surface/parent-topic-display-chrome.js`

**Tests:** new factual/chrome/label-safety tests + alignment updates to existing LPD/EDC/subject tests

**Scripts:** `scripts/parent-engine-*.mjs` (audit/verification)

**Docs/audits:** `docs/audits/parent-engine-*` + PARENT-ENGINE-*.md

**Not included:** student data, simulation dossiers, DB, dirty root worktree junk, temp snapshots.

Tracked diff: **18 files changed, 497 insertions(+), 296 deletions(-)** (plus untracked new production/tests/scripts/docs listed above).

---

## 7. Focused regression results

| command | passed | failed | duration_ms |
|---------|-------:|-------:|------------:|
| factual-observations-final-closure | 29 | 0 | ~518 |
| calculation-off-by-one-parent-finding | 4 | 0 | ~350 |
| repeated-mistake-pattern-label-safety | 4 | 0 | ~347 |
| parent-topic-display-chrome | 5 | 0 | ~335 |
| parent-report-engine-decision-contract | 1 | 0 | ~340 |
| subject-engine-decision-contract | 1 | 0 | ~435 |
| action-decision-contract-p2 | 21 | 0 | ~332 |
| action-decision-contract-unit-p4 | 3 | 0 | ~287 |
| parent-output-final-closure-contract | 1 | 0 | ~444 |
| pattern-visibility-foundation | 1 | 0 | ~342 |
| scenarios | 1 | 0 | ~297 |
| parent-facing-lpd-practice-alignment | 9 | 0 | ~517 |
| parent-demo-report-parity | 9 | 0 | ~20954 |

**All focused commands: fail=0.**

---

## 8. Approval checklist

| Condition | Result |
|-----------|--------|
| No unexplained ADC change | **PASS** (0 ADC diffs on dossiers; thin volume ADC unchanged) |
| 60-dossier changes policy-explained | **PASS** (observations only) |
| 93/93 factual labels | **PASS** |
| `procedure_break` not shown as unapproved factual | **PASS** |
| `place_value_error` factual wording | **PASS** |
| No internal keys in parent observation text | **PASS** |
| factualObservations identical across 3 reports | **PASS** |
| 2/40 not strong | **PASS** |
| 6/25 strong | **PASS** |
| 4/4 factual + repeated | **PASS** |
| No taxonomy/DE2 classification/detectedPattern mutation by ladder | **PASS** |
| Focused tests pass | **PASS** |

### Verdict

**Ready for human approval to commit/push/deploy.**  
This report does **not** grant commit / push / deploy.
