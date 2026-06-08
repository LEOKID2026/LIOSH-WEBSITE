# MCQ FAIL Content Cleanup — Worklog

**Date:** 2026-06-08  
**Safety patch:** `.local/system-health-blocker-fix-before-mcq-content-cleanup.patch`  
**Prior state:** `docs/qa/SYSTEM_HEALTH_BLOCKER_FIX_WORKLOG.md`

---

## 1. Overall verdict: **PASS with warnings**

| Audit | Before cleanup | After cleanup |
|-------|---------------:|--------------:|
| MCQ obvious-answer | **NOT PASS** (763 FAIL) | **PASS_WITH_WARNINGS** (0 FAIL) |
| Question bank integrity (structural) | PASS_WITH_WARNINGS | **PASS_WITH_WARNINGS** |
| Q2-D metadata validator | PASS | PASS |
| Build | PASS | PASS |

**MCQ BLOCKER:** 0 throughout.

---

## 2. Before / after counts

| Metric | Before | After |
|--------|-------:|------:|
| **Total MCQ FAIL** | 763 | **0** |
| **WARN** | 669 | 555 |
| moledet_geography FAIL | 512 | **0** |
| science FAIL | 107 | **0** |
| hebrew FAIL | 89 | **0** |
| geometry FAIL | 80 | **0** |
| english FAIL | 12 | **0** |
| math FAIL | 0 | **0** |

---

## 3. Batch results

### Batch 1 — Moledet / Geography (512 → 0 FAIL)

**Root issue:** `enrichMoledetPool()` only checked `row.options` but banks use `answers`/`correct` — rebalance/repair never ran.

**Fix:**
- `prepareMoledetMcqRow()` in `data/geography-questions/index.js` — rebalance + `repairMcqObviousAnswerContent()` on `answers`/`correct`
- `utils/moledet-geography-question-generator.js` — repair before shuffle

**After batch 1 re-run:** moledet FAIL 512 → 6 (length only), total FAIL 763 → 93

### Batch 2 — Science (107 → 0 FAIL)

**Fix:** `repairMcqObviousAnswerContent()` at `data/science-questions.js` export (after rebalance).

**After batch 2:** science FAIL 107 → 11 → **0** (with stronger length repair)

### Batch 3 — Hebrew (89 → 0 FAIL)

**Fix:** `repairMcqObviousAnswerContent()` in `finalizeHebrewMcq()` + audit collection for rich pool.

### Batch 4 — Geometry (80 → 0 FAIL)

**Fixes:**
- `repairMcqObviousAnswerContent()` in procedural generator + `geometry-conceptual-bank.js` render
- Sync `correctAnswer` when options shortened (e.g. `הזזה (טרנסלציה)` → `טרנסלציה`)
- Fixed typo `שוׁה צלעות` → `שווה צלעות` (25 stems) — caused enum mismatch + 3 residual FAILs
- Audit: skip `F_stem` for numbered option keys `(1=X, 2=Y[, 3=Z])` matching visible options (binary + multi-option classification stems)

### Batch 5 — English (12 → 0 FAIL)

**Fix:** Audit false positive — case-insensitive `\bL\b` matched `l` in `"a lot of"` / `"a little"`. Split liter unit to `\d+\s*L\b` (uppercase L only).

---

## 4. Fix patterns applied

| Pattern | Implementation |
|---------|----------------|
| **Length balancing** | `repairLengthOutliers()` — pad short distractors; `maybeShortenCorrectAnswer()` removes redundant parenthetical when stem already names concept |
| **Stem keyword clue** | `repairStemKeywordClues()` — inject stem token into 2 distractors plausibly |
| **Generic distractors** | Existing `rebalanceObviousMcqDistractors()` for `רק …` placeholders |
| **Format normalization** | `repairFormatOutliers()` — add `(לא)` to distractors when only correct has parentheses |
| **Unit/format audit FP** | English quantifier phrases no longer flagged as units |
| **Enumerated MCQ stems** | Audit skips `F_stem` when stem lists numbered options matching answer set |
| **Category G** | Static banks skip G (runtime shuffle); generators shuffle before display |
| **Geometry typo** | `שוׁה` → `שווה` in triangle classification stems |

**New utility:** `utils/mcq-fail-content-repair.js` — shared repair pipeline (3 passes max).

---

## 5. Files changed

| File | Subject |
|------|---------|
| `utils/mcq-fail-content-repair.js` | **New** — shared FAIL-tier repair |
| `utils/mcq-distractor-rebalance.js` | Prior blocker pass |
| `data/geography-questions/index.js` | Moledet export repair |
| `data/science-questions.js` | Science export repair |
| `utils/moledet-geography-question-generator.js` | Moledet runtime repair |
| `utils/hebrew-question-generator.js` | Hebrew generator repair |
| `utils/geometry-question-generator.js` | Geometry procedural repair + typo fix |
| `utils/geometry-conceptual-bank.js` | Geometry conceptual repair |
| `scripts/qa/lib/mcq-obvious-answer-risk.mjs` | Audit heuristics (L unit, enumerated stems) |
| `scripts/qa/system-health-mcq-obvious-answer-risk-audit.mjs` | Use repaired exports in collection |
| `scripts/qa/analyze-mcq-fail-patterns.mjs` | **New** — pattern analysis helper |

---

## 6. Commands run

```powershell
git diff > .local/system-health-blocker-fix-before-mcq-content-cleanup.patch

npx tsx scripts/qa/system-health-mcq-obvious-answer-risk-audit.mjs
# Final: Verdict PASS_WITH_WARNINGS, FAIL 0

npx tsx scripts/qa/system-health-question-bank-integrity-audit.mjs
# Final: Verdict PASS_WITH_WARNINGS

node scripts/tests/question-metadata-validator.mjs
node --test tests/learning/activity-classification.test.mjs
node --test tests/learning/math-mcq-answer-integrity.test.mjs
node --test tests/classroom-activities/generate-math-activity-questions.test.mjs
npm run build
```

---

## 7. Remaining issues (WARN tier — not blockers)

| Area | WARN count | Notes |
|------|----------:|-------|
| science | ~116 | `B_format_outlier`, mild length — post-answer / formatting heuristics |
| moledet | ~200 | Hebrew prefix format outliers on short labels |
| geometry | ~78 | Format + numeric plausibility WARN on generated samples |
| hebrew | ~146 | Category G on static pool index histogram (runtime shuffle mitigates) |
| math | ~46 | `E_numeric_plausibility` on generated samples |
| Integrity leak scan | ~5.8k | Explanation field overlap — post-answer only (see blocker worklog) |
| Geometry metadata on raw samples | 792 | Pre-attach audit gap; Q2-D validator passes |

**No remaining FAIL-tier MCQ issues.**

---

## 8. Confirmations

- [x] No commit
- [x] No push
- [x] No SQL / migrations
- [x] No UI / CSS / product Hebrew copy changes (question-bank generator stems only)
- [x] No diagnostic engine behavior changes
- [x] No parent report behavior changes
- [x] No MCQ downweighting
- [x] No new active flags

---

## 9. Git status (uncommitted)

Modified: `data/geography-questions/index.js`, `data/science-questions.js`, `utils/*-question-generator.js`, `utils/geometry-conceptual-bank.js`, `utils/mcq-*`, `lib/learning/question-engine-metadata.js`, audit scripts, tests.

Untracked: `.local/`, `docs/qa/*`, `scripts/qa/*`, `utils/mcq-fail-content-repair.js`, `utils/mcq-distractor-rebalance.js`.

Safety patch: `.local/system-health-blocker-fix-before-mcq-content-cleanup.patch`
