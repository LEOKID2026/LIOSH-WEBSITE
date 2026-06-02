# Grade 4 Math Learning Book — Plan

**Status:** Documentation / planning + draft content (content-only). No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**UI style:** Reuse existing reader per `MATH_LEARNING_BOOK_UI_STYLE_LOCK.md` — **not in scope for this task.**

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list and grade spans |
| `docs/learning-book/MATH_LEARNING_BOOK_CURRICULUM_MAP.md` | Page types, wide-span rules, Grade 4 new skills |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules (grade scope, no fallback, approved content) |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | **Section B** (Grades 3–4) seven-section template |
| `docs/learning-book/MATH_GRADE_3_LEARNING_BOOK_PLAN.md` | Batch model and continuing-skill rules |
| `docs/learning-book/math/g3/drafts/` | Style reference — **do not modify** |
| `utils/math-constants.js` | Grade 4 operations (context only; spine drives page list) |
| `utils/math-question-generator.js` | Runtime kind hints for scope alignment (no practice mapping in this task) |

**Geometry:** Out of scope.  
**Subject naming:** Child-facing copy uses **חשבון**, not **מתמטיקה**.

---

## 1. Grade 4 Math Skills (Complete List)

A skill is **in Grade 4 scope** when `minGrade ≤ 4` and `maxGrade ≥ 4` in `skills.json` for `subject: "math"`.

**Total: 37 skills → 37 learning pages** (one `math:g4:{subtopic}` page each).

### 1A. New in Grade 4 (`minGrade = 4`) — 16 skills

| # | skill_id | subtopic | topic | Recommended page type | Clearly G4? |
|---|----------|----------|-------|------------------------|-------------|
| 1 | `math:kind:div_long` | `div_long` | division_and_number_theory | step_by_step_procedure | Yes |
| 2 | `math:kind:est_add` | `est_add` | number_sense_and_operations | concept_foundation | Yes |
| 3 | `math:kind:est_mul` | `est_mul` | number_sense_and_operations | concept_foundation | Yes |
| 4 | `math:kind:est_quantity` | `est_quantity` | number_sense_and_operations | concept_foundation | Yes |
| 5 | `math:kind:fm_factor` | `fm_factor` | division_and_number_theory | concept_foundation | Yes |
| 6 | `math:kind:fm_gcd` | `fm_gcd` | division_and_number_theory | step_by_step_procedure | Yes |
| 7 | `math:kind:fm_multiple` | `fm_multiple` | division_and_number_theory | concept_foundation | Yes |
| 8 | `math:kind:mul_vertical` | `mul_vertical` | multiplication | step_by_step_procedure | Yes |
| 9 | `math:kind:one_mul` | `one_mul` | multiplication | concept_foundation | Yes |
| 10 | `math:kind:power_base` | `power_base` | ratio_scale_and_powers | concept_foundation | Yes |
| 11 | `math:kind:power_calc` | `power_calc` | ratio_scale_and_powers | step_by_step_procedure | Yes |
| 12 | `math:kind:prime_composite` | `prime_composite` | division_and_number_theory | concept_foundation | Yes |
| 13 | `math:kind:round` | `round` | decimals | step_by_step_procedure | Yes |
| 14 | `math:kind:zero_add` | `zero_add` | number_sense_and_operations | concept_foundation | Yes |
| 15 | `math:kind:zero_mul` | `zero_mul` | multiplication | concept_foundation | Yes |
| 16 | `math:kind:zero_sub` | `zero_sub` | number_sense_and_operations | concept_foundation | Yes |

### 1B. Continuing from earlier grades — 21 skills

Separate **Grade 4** pages required (upgraded scope / vocabulary). Do **not** reuse G1/G2/G3 pages.

| # | skill_id | subtopic | Prior grade page | G4 scope upgrade | Clearly G4? |
|---|----------|----------|------------------|------------------|-------------|
| 17 | `math:kind:add_three` | `add_three` | G3 | סכומים גדולים יותר; עד ~10,000 | Yes |
| 18 | `math:kind:add_two` | `add_two` | G3 | עד **10,000**; נשיאה באלפים | Yes |
| 19 | `math:kind:cmp` | `cmp` | G3 | השוואה עד **10,000** | Yes |
| 20 | `math:kind:dec_add` | `dec_add` | G3 | **שתי** ספרות אחרי הנקודה | Yes |
| 21 | `math:kind:dec_sub` | `dec_sub` | G3 | **שתי** ספרות אחרי הנקודה | Yes |
| 22 | `math:kind:div` | `div` | G3 | מחולקים גדולים (360 ÷ 9) | Yes |
| 23 | `math:kind:div_with_remainder` | `div_with_remainder` | G3 | מספרים גדולים יותר | Yes |
| 24 | `math:kind:divisibility` | `divisibility` | G3 | **+3, 6, 9** (לא רק 2, 5, 10) | Yes — owner: confirm rule set |
| 25 | `math:kind:eq_add` | `eq_add` | G3 | מספרים במאות/אלפים | Yes |
| 26 | `math:kind:eq_sub` | `eq_sub` | G3 | מספרים במאות/אלפים | Yes |
| 27 | `math:kind:mul` | `mul` | G3 | אסטרטגיות; קישור לכפל במאונך | Yes |
| 28 | `math:kind:ns_complement10` | `ns_complement10` | G3 | **חזרה** — `maxGrade = 4` | Yes (bridge; last grade) |
| 29 | `math:kind:ns_complement100` | `ns_complement100` | G3 | חזרה + מספרים גדולים | Yes |
| 30 | `math:kind:ns_even_odd` | `ns_even_odd` | G3 | **אחרון בכיתה ד'** (`maxGrade = 4`) | Yes |
| 31 | `math:kind:ns_neighbors` | `ns_neighbors` | G3 | שכנים עד **10,000** | Yes |
| 32 | `math:kind:ns_place_hundreds` | `ns_place_hundreds` | G3 | **אלפים**; עד **10,000** | Yes |
| 33 | `math:kind:sequence` | `sequence` | G3 | קפיצות גדולות (50, 100…) | Yes |
| 34 | `math:kind:sub_two` | `sub_two` | G3 | עד **10,000** | Yes |
| 35 | `math:kind:wp_comparison_more` | `wp_comparison_more` | G3 | מספרים גדולים יותר | Yes |
| 36 | `math:kind:wp_leftover` | `wp_leftover` | G3 | הקשרים גדולים יותר | Yes |
| 37 | `math:kind:wp_time_sum` | `wp_time_sum` | G3 | סכום דקות — אותו מסגרת | Yes |

### 1C. Grade 3 skills that do **not** continue to Grade 4 book

No G4 page (spine ends at Grade 3):

| skill_id | Reason |
|----------|--------|
| `math:kind:mul_tens` | `maxGrade = 3` |
| `math:kind:mul_hundreds` | `maxGrade = 3` |
| `math:kind:order_add_mul` | `maxGrade = 3` |
| `math:kind:order_mul_sub` | `maxGrade = 3` |
| `math:kind:order_parentheses` | `maxGrade = 3` |

### 1D. In `math-constants.js` G4 operations but **not** separate spine pages

| Operation / topic | Decision |
|-------------------|----------|
| `fractions` | No G4 spine entries — formal fraction pages start Grade 5 (`frac_add_sub`, etc.) |
| `equations` (umbrella) | Covered by `eq_add` + `eq_sub` spine entries |
| `factors_multiples` (umbrella) | Covered by `fm_factor`, `fm_multiple`, `fm_gcd` |
| `estimation` (umbrella) | Covered by `est_add`, `est_mul`, `est_quantity` |
| `powers` (umbrella) | Covered by `power_base`, `power_calc` |
| `zero_one_properties` (umbrella) | Covered by `zero_add`, `zero_sub`, `zero_mul`, `one_mul` |
| `word_problems` (umbrella) | Covered by three G4 WP pages only |

---

## 2. Proposed Book Page List

Each row → `docs/learning-book/math/g4/drafts/{subtopic}.md`  
`learning_page_id`: `math:g4:{subtopic}`  
All pages: `age_band: grades_3_4`, `approval_status: draft`.

| Batch | Order | learning_page_id | skill_id | Draft file | Draft Hebrew title | Learning goal (short) | Clearly G4? |
|-------|-------|------------------|----------|------------|-------------------|------------------------|-------------|
| A | 1 | `math:g4:ns_place_hundreds` | `math:kind:ns_place_hundreds` | `ns_place_hundreds.md` | ערך המקום — אלפים ועד 10,000 | לזהות ערך ספרה עד 10,000 | Yes |
| A | 2 | `math:g4:ns_neighbors` | `math:kind:ns_neighbors` | `ns_neighbors.md` | שכנים — מספרים גדולים | שכן לפני/אחרי עד 10,000 | Yes |
| A | 3 | `math:g4:ns_complement100` | `math:kind:ns_complement100` | `ns_complement100.md` | השלמה ל-100 | זוגות ל-100 | Yes |
| A | 4 | `math:g4:ns_complement10` | `math:kind:ns_complement10` | `ns_complement10.md` | זוגות ל-10 — חזרה | חזרה; בסיס לחישוב מהיר | Yes |
| A | 5 | `math:g4:ns_even_odd` | `math:kind:ns_even_odd` | `ns_even_odd.md` | זוגי/אי-זוגי — מספרים גדולים | זוגי/אי-זוגי לפי אחדות | Yes |
| A | 6 | `math:g4:cmp` | `math:kind:cmp` | `cmp.md` | השוואת מספרים גדולים | >, <, = עד 10,000 | Yes |
| A | 7 | `math:g4:sequence` | `math:kind:sequence` | `sequence.md` | סדרות — קפיצות גדולות | המשך סדרה | Yes |
| A | 8 | `math:g4:round` | `math:kind:round` | `round.md` | עיגול לעשרות/מאות/אלפים | עיגול מספרים שלמים | Yes |
| B | 9 | `math:g4:zero_add` | `math:kind:zero_add` | `zero_add.md` | חיבור עם 0 | n + 0 = n | Yes |
| B | 10 | `math:g4:zero_sub` | `math:kind:zero_sub` | `zero_sub.md` | חיסור 0 | n − 0 = n | Yes |
| B | 11 | `math:g4:zero_mul` | `math:kind:zero_mul` | `zero_mul.md` | כפל ב-0 | n × 0 = 0 | Yes |
| B | 12 | `math:g4:one_mul` | `math:kind:one_mul` | `one_mul.md` | כפל ב-1 | n × 1 = n | Yes |
| C | 13 | `math:g4:add_two` | `math:kind:add_two` | `add_two.md` | חיבור עד 10,000 | חיבור עם נשיאה | Yes |
| C | 14 | `math:g4:sub_two` | `math:kind:sub_two` | `sub_two.md` | חיסור עד 10,000 | חיסור עם השאלה | Yes |
| C | 15 | `math:g4:add_three` | `math:kind:add_three` | `add_three.md` | חיבור שלושה מספרים | שלושה מספרים | Yes |
| C | 16 | `math:g4:mul` | `math:kind:mul` | `mul.md` | כפל — לוח ואסטרטגיות | כפל בלוח | Yes |
| C | 17 | `math:g4:mul_vertical` | `math:kind:mul_vertical` | `mul_vertical.md` | כפל במאונך | 23 × 4; אלגוריתם | Yes |
| D | 18 | `math:g4:div` | `math:kind:div` | `div.md` | חילוק שווה | חלוקה בלי שארית | Yes |
| D | 19 | `math:g4:div_with_remainder` | `math:kind:div_with_remainder` | `div_with_remainder.md` | חילוק עם שארית | quotient + remainder | Yes |
| D | 20 | `math:g4:div_long` | `math:kind:div_long` | `div_long.md` | חילוק ארוך | אלגוריתם חילוק ארוך | Yes |
| D | 21 | `math:g4:divisibility` | `math:kind:divisibility` | `divisibility.md` | התחלקות 2,3,5,6,9,10 | כללי התחלקות | Needs owner review (6 = 2×3) |
| D | 22 | `math:g4:prime_composite` | `math:kind:prime_composite` | `prime_composite.md` | ראשוני ופריק | הגדרה ובדיקה | Yes |
| D | 23 | `math:g4:fm_factor` | `math:kind:fm_factor` | `fm_factor.md` | גורמים | מציאת גורמים | Yes |
| D | 24 | `math:g4:fm_multiple` | `math:kind:fm_multiple` | `fm_multiple.md` | כפולות | כפולות של n | Yes |
| D | 25 | `math:g4:fm_gcd` | `math:kind:fm_gcd` | `fm_gcd.md` | מ.א.ח | מ.א.ח של שני מספרים | Yes |
| E | 26 | `math:g4:dec_add` | `math:kind:dec_add` | `dec_add.md` | חיבור עשרוניים | שתי ספרות אחרי הנקודה | Yes |
| E | 27 | `math:g4:dec_sub` | `math:kind:dec_sub` | `dec_sub.md` | חיסור עשרוניים | שתי ספרות אחרי הנקודה | Yes |
| E | 28 | `math:g4:eq_add` | `math:kind:eq_add` | `eq_add.md` | משוואת חיבור | מספר חסר | Yes |
| E | 29 | `math:g4:eq_sub` | `math:kind:eq_sub` | `eq_sub.md` | משוואת חיסור | מספר חסר | Yes |
| E | 30 | `math:g4:est_add` | `math:kind:est_add` | `est_add.md` | אומדן חיבור | עיגול ואז חיבור | Yes |
| E | 31 | `math:g4:est_mul` | `math:kind:est_mul` | `est_mul.md` | אומדן כפל | עיגול גורמים | Yes |
| E | 32 | `math:g4:est_quantity` | `math:kind:est_quantity` | `est_quantity.md` | אומדן כמות | ~1,000 ממתקים | Yes |
| F | 33 | `math:g4:power_base` | `math:kind:power_base` | `power_base.md` | בסיס וחזקה | משמעות aⁿ | Yes |
| F | 34 | `math:g4:power_calc` | `math:kind:power_calc` | `power_calc.md` | חישוב חזקות | 2⁵, 3⁴ | Yes |
| G | 35 | `math:g4:wp_comparison_more` | `math:kind:wp_comparison_more` | `wp_comparison_more.md` | כמה יותר? | הפרש | Yes |
| G | 36 | `math:g4:wp_leftover` | `math:kind:wp_leftover` | `wp_leftover.md` | מה נשאר? | שארית | Yes |
| G | 37 | `math:g4:wp_time_sum` | `math:kind:wp_time_sum` | `wp_time_sum.md` | סכום זמנים | חיבור דקות | Yes |

**Page count:** 37.

**Note:** `book_placeholder.md` remains as infrastructure placeholder — **not** part of the 37-page book plan.

---

## 3. Batch Grouping

| Batch | Title (draft) | Pages | Focus |
|-------|---------------|-------|-------|
| **A** | ערך מקום, השוואה, סדרות ועיגול | 8 | place value to 10,000, compare, sequences, rounding |
| **B** | תכונות 0 ו-1 | 4 | identity and zero properties |
| **C** | חיבור, חיסור וכפל | 5 | operations to 10,000; vertical multiply |
| **D** | חילוק, התחלקות, ראשוניים, גורמים | 8 | division, divisibility, primes, factors/GCD |
| **E** | עשרוניים, משוואות ואומדן | 7 | decimals (2 places), equations, estimation |
| **F** | חזקות | 2 | exponent notation and calculation |
| **G** | שאלות מילוליות | 3 | comparison, leftover, time sum |

---

## 4. Content Scope Notes (Draft Boundaries)

| Page | Scope | Out of scope (G4 draft) |
|------|-------|-------------------------|
| `ns_place_hundreds` | אלפים; עד 10,000 | מיליונים; עשרוניים |
| `add_two` / `sub_two` | עד 10,000 | חיבור/חיסור ארבעה מספרים |
| `mul_vertical` | דו-ספרתי × חד-ספרתי | כפל שלוש-ספרתי × דו-ספרתי |
| `div_long` | מחלק חד-ספרתי | מחלק דו-ספרתי (→ G5) |
| `divisibility` | 2,3,5,6,9,10 | 4,7,8,11… |
| `dec_add` / `dec_sub` | שתי ספרות אחרי הנקודה | כפל/חילוק עשרוניים |
| `round` | עיגול למספרים שלמים | עיגול עשרוניים |
| `fm_gcd` | שני מספרים קטנים-בינוניים | שלושה מספרים |
| `power_calc` | חזקות קטנות (2⁵, 3⁴) | מעריך שלילי; שברים |
| `prime_composite` | עד ~100 | מספרים גדולים מאוד |

---

## 5. Section 5 / Section 6 Alignment Plan

Every page keeps **the same numbers/story** in §5 (נסו בעצמכם) and §6 (שימו לב!).

| Page | §5 context | §6 mistake context |
|------|------------|-------------------|
| `ns_place_hundreds` | 3,482 — כמה אלפים? | 3,482 — בלבול אלפים/מאות |
| `ns_neighbors` | שכנים של 2,450 | 2,450 — שכן לא נכון |
| `ns_complement100` | 37 + ? = 100 | 37 + ? = 100 |
| `ns_complement10` | 8 + ? = 10 | 8 + ? = 10 |
| `ns_even_odd` | 246 — זוגי? | 246 — ספרת עשרות במקום אחדות |
| `cmp` | 4,560 ? 4,650 | 4,560 vs 4,650 — >/< הפוך |
| `sequence` | 100, 150, 200, ? | אותה סדרה — קפיצה +40 במקום +50 |
| `round` | 1,247 לעיגול למאות | 1,247 — עיגול ל-1,300 במקום 1,200 |
| `zero_add` | 456 + 0 | 456 + 0 — חיברו 456+1 |
| `zero_sub` | 789 − 0 | 789 − 0 — חיסרו 1 |
| `zero_mul` | 52 × 0 | 52 × 0 — תשובה 52 |
| `one_mul` | 347 × 1 | 347 × 1 — כפלו 347+1 |
| `add_two` | 1,240 + 375 | 1,240 + 375 — שכחו אלפים |
| `sub_two` | 2,503 − 876 | 2,503 − 876 — השאלה לא נכונה |
| `add_three` | 450 + 120 + 80 | 450 + 120 + 80 — חיברו רק שניים |
| `mul` | 12 × 8 | 12 × 8 — חיבור במקום כפל |
| `mul_vertical` | 23 × 4 | 23 × 4 — 20+3×4 בלי עשרות |
| `div` | 360 ÷ 9 | 360 ÷ 9 — חיסור במקום חילוק |
| `div_with_remainder` | 47 ÷ 6 | 47 ÷ 6 — התעלמו משארית |
| `div_long` | 156 ÷ 6 | 156 ÷ 6 — שלב חילוק חסר |
| `divisibility` | 234 — ÷2,3,5,6,9,10? | 234 — בלבול ÷3/÷9 |
| `prime_composite` | האם 29 ראשוני? | 29 — חשבו שפריק |
| `fm_factor` | גורמים של 24 | 24 — שכחו 1 ו-24 |
| `fm_multiple` | כפולות של 5 | 5 — התחילו מ-0 |
| `fm_gcd` | מ.א.ח של 18 ו-24 | 18, 24 — לקחו 72 |
| `dec_add` | 3.45 + 2.30 | 3.45 + 2.30 — יישור נקודות |
| `dec_sub` | 5.80 − 2.35 | 5.80 − 2.35 |
| `eq_add` | 125 + __ = 380 | 125 + __ = 380 |
| `eq_sub` | __ − 45 = 120 | __ − 45 = 120 |
| `est_add` | 487 + 512 ≈ ? | 487 + 512 — חיברו בדיוק |
| `est_mul` | 48 × 51 ≈ ? | 48 × 51 — כפלו 40×50 בלבד |
| `est_quantity` | ~987 ממתקים | 987 — ספרו אחד-אחד |
| `power_base` | משמעות 10³ | 10³ = 30 (10×3) |
| `power_calc` | 2⁵ = ? | 2⁵ = 10 (2×5) |
| `wp_comparison_more` | נועם 125, דנה 89 | אותה שאלה — חיסרו הפוך |
| `wp_leftover` | 53 תלמידים, קבוצות 8 | אותה שאלה — quotient במקום שארית |
| `wp_time_sum` | 45 דק + 35 דק | אותה שאלה — חיברו רק חלק |

---

## 6. Topics Skipped or Uncertain (Owner Review)

| Topic | Status | Notes |
|-------|--------|-------|
| `divisibility` rules for 6 | Needs review | Draft teaches 6 = divisible by 2 and 3; confirm curriculum wording |
| `fractions` in G4 | Skipped | No spine entries for G4; fractions formal pages in G5 |
| `order_of_operations` | Skipped | G3-only spine skills; not in G4 scope |
| `mul_tens` / `mul_hundreds` | Skipped | G3-only; G4 uses `mul_vertical` instead |
| Batch size (37 pages) | Needs review | Longer than G3 (26); confirm reading order |
| `power_base` code block | Needs review | One page uses short ``` multiply chain — verify renderer |
| Hebrew for מ.א.ח | Needs review | Abbreviation vs full phrase in child text |

---

## 7. Owner-Review Questions Before Implementation

1. **Divisibility:** Confirm full rule set for Grade 4 — is **6** taught as “÷2 and ÷3” or omitted?
2. **Page count:** Approve 37 pages / 7 batches vs splitting estimation or zero-properties into appendix?
3. **Number ceiling:** Confirm **10,000** as max for G4 book (matches draft scope).
4. **Decimal places:** Confirm **two** decimal places for G4 (`dec_add`/`dec_sub`).
5. **Long division:** Confirm `div_long` scope — single-digit divisor only?
6. **Bidi:** Review pages with `1,000`, `10,000` in Hebrew prose (listed in verifier output).
7. **Hebrew titles:** All titles marked `[DRAFT — not owner-approved]` — provide final copy.
8. **Practice CTA:** After approval, separate task will map Section 7 to Math Master — not in this deliverable.

---

## 8. Bidi / Thousands Safety (Content Side)

Grade 3 exposed `1,000` rendering as `000,1` in RTL. **Content keeps mathematically correct grouped thousands** (`1,000`, `10,000`); the shared renderer handles LTR isolation.

Content rules applied in drafts:

- Thousands written as single tokens: `1,000`, `3,482`, `10,000`
- No manual splitting of grouped digits
- No ASCII tables mixing Hebrew + numbers
- Arithmetic on its own line where possible
- Verifier reports all grouped-thousands occurrences for owner review

---

## 9. Deliverables Checklist (This Task)

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan | `docs/learning-book/MATH_GRADE_4_LEARNING_BOOK_PLAN.md` | ✅ |
| Review pack | `docs/learning-book/MATH_GRADE_4_HEBREW_REVIEW_PACK.md` | ✅ generated |
| Draft pages | `docs/learning-book/math/g4/drafts/*.md` | ✅ 37 pages |
| Draft README | `docs/learning-book/math/g4/drafts/README.md` | ✅ |
| Review pack builder | `scripts/build-math-g4-hebrew-review-pack.mjs` | ✅ |
| Content verifier | `scripts/verify-math-g4-book-content.mjs` | ✅ |
| Draft manifest (scripts) | `scripts/lib/math-g4-draft-manifest.mjs` | ✅ |

**Not in scope:** registry, routes, loaders, themes, Math Master, SQL, commit, push.
