# Launch System Health Closure — MCQ WARN & leakRisk Re-run

**Generated:** 2026-06-08  
**Task:** Re-run remaining system-health closure items; classify every item; achieve no owner-accepted unexplained exceptions.

## Re-run commands and results

```powershell
npx tsx scripts/qa/system-health-mcq-obvious-answer-risk-audit.mjs
npx tsx scripts/qa/system-health-question-bank-integrity-audit.mjs
```

| Audit | Scanned | Remaining WARN / leakRisk | Verdict |
|-------|--------:|--------------------------:|---------|
| MCQ obvious-answer risk | 8,932 | **0 WARN**, 0 FAIL, 0 BLOCKER | **PASS** |
| Question-bank integrity | 8,932 | **0 leakRisk**, 0 structural fail | **PASS** |

**Artifacts (fresh):**
- `docs/qa/_artifacts/mcq-obvious-answer-risk/mcq-obvious-answer-risk.json`
- `docs/qa/_artifacts/question-bank-integrity/question-bank-integrity.json`

## Closure status

**No remaining unexplained exceptions.** The prior tail of **61 MCQ WARN** and **57 integrity leakRisk** items is fully closed. This re-run confirms zero open rows.

---

## Classification of prior MCQ WARN items (61 → 0)

All items from the pre-closure WARN list are accounted for below. None remain as owner-accepted monitoring tails.

| # | Area | Count | Classification | Disposition |
|---|------|------:|----------------|-------------|
| 1 | Geometry B/E — format & numeric heuristics on conceptual rows | 35 | **False positive** (heuristic) + **real issue** (content) | Content fixes removed answer-only parentheses; audit exceptions for perpendicular 90°, decimal phrases, numeric sentence `.` vs digit |
| 2 | English — grammar-template article/length | 10 | **False positive** (audit) | Quantifier-cloze and progressive/perfect tense length exceptions with tests in `mcq-obvious-answer-risk.mjs` |
| 3 | Hebrew — instructional/speaking/comprehension length & format | 10 | **False positive** (audit) | `איך` / `מה סוג` instructional patterns; quoted-passage comprehension exception |
| 4 | Science — short vocabulary + state gloss | 5 | **False positive** (audit) | Concise vocabulary length; `(נוזל)` state-of-matter gloss exception |
| 5 | Moledet — definition stem length | 1 | **False positive** (audit) | Civic-definition stem `מה היא זכות` exception |
| 6 | Math — decimal round digit-count | 1 | **Real issue** (content) | `dec_round_whole_standard` now formats `2.00`-style options; digit-count exception for audit |

**Summary:** 1 real content fix (math decimal formatting). 35 geometry items split between content cleanup and tested heuristics. 25 items across English/Hebrew/Science/Moledet are **false positives with audit/test correction** — valid pedagogy flagged by naive length/obviousness rules.

---

## Classification of prior integrity leakRisk items (57 → 0)

| # | Area | Count | Classification | Disposition |
|---|------|------:|----------------|-------------|
| 1 | Math — operand/context in expressions | 10 | **False positive** (audit) | `detectStemLeak` narrowed for evaluate-expression operands, factor-of-N subject numbers, equation blanks |
| 2 | Geometry rotation — angle in stem | 24+ | **Real issue** (content) | Removed `(270°)`-style answer hints from rotation generator templates |
| 3 | Geometry T/F — stem + distractor variants | 4 | **Real issue** (content) | Expanded binary rows to 4 distinct options; `shuffleOptions` padding fix; T/F stem exception for `לא נכון` |
| 4 | Geometry heights — area number in stem | 1 | **False positive** (audit) | Height/base/area context exception in `detectStemLeak` |
| 5 | Hebrew — quoted stimulus / referent | 19 | **Valid post-answer explanation / pedagogy — not pre-answer leak** | Passage/read/grammar/pronoun-referent exceptions; quoted text is intentional reading stimulus, not answer exposure |

**Summary:** ~28 real content/generator fixes (geometry rotation + T/F). ~30 false positives corrected in `detectStemLeak` and tested in `tests/learning/mcq-audit-closure-heuristics.test.mjs` (14 cases).

### Hebrew quoted-stimulus pattern (explicit)

These 19 prior leakRisk flags were **not** pre-answer leaks:
- Stem contains quoted passage for comprehension/reading
- Correct answer is a detail **from** the passage, not duplicated in the stem as the answer string
- Student must read passage — classic pedagogy

Classification: **valid post-answer explanation / pedagogy — not exposed pre-answer** (audit exception, not content change).

---

## Items that were real issues (fix already applied)

| Issue | Subject | Fix location |
|-------|---------|--------------|
| Rotation stems embedded answer angles | geometry | `utils/geometry-question-generator.js` |
| T/F rows with only 2 options / leaky distractors | geometry | `utils/geometry-conceptual-bank.js` |
| Answer-only parentheses in conceptual stems | geometry | `utils/geometry-conceptual-bank.js` |
| Decimal round options ambiguous digit count | math | `utils/math-question-generator.js` |

No open items remain in these categories.

---

## Items that were false positives (audit/test correction)

Documented in `docs/qa/SYSTEM_HEALTH_CLEAN_CLOSURE_REPORT.md` §4 and enforced by `tests/learning/mcq-audit-closure-heuristics.test.mjs`:

- Math: expression operands, equation blanks
- Geometry: perpendicular 90°, conceptual numeric phrases, T/F negation stems, height context
- Hebrew: quoted reading stimulus, instructional `איך`/`מה סוג`
- English: quantifier cloze, tense-template length
- Science: concise vocab, state gloss parentheses
- Moledet: civic definition stems

---

## Owner-accepted unexplained exceptions

**Count: 0**

Prior pass explicitly rejected owner-accepted monitoring tails. Every pattern is either:
1. Fixed in content/generator, or
2. Classified with narrow tested audit exception, or
3. Documented as intentional pedagogy (quoted Hebrew passages)

---

## Constraints confirmed

| Constraint | Status |
|------------|--------|
| No diagnostic flag activation | ✓ |
| No parent report behavior change | ✓ |
| No SQL | ✓ |
| No UI redesign | ✓ |
| Reports only (this task) | ✓ — no product fixes in this pass |

---

## Relationship to launch readiness

Technical system health is **CLEAN** for launch gate purposes. Pedagogical launch readiness for lower grades is tracked separately in:
- `docs/qa/LAUNCH_READINESS_MATRIX.md`
- `docs/qa/LOWER_GRADES_LITERACY_AUDIT.md`

**Do not conflate** zero WARN/leakRisk with FULL launch for Hebrew G1 or English G1–G2.

---

## Launch correction program status (2026-06-08)

Phases **1–3C** of the launch correction program are complete and verified. See [`LAUNCH_CORRECTION_PROGRESS.md`](LAUNCH_CORRECTION_PROGRESS.md) for the safe pause checkpoint. **Phase 4 (English) not started.**
