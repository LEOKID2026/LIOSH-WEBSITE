# Grade 5 Math Learning Book — Plan

**Status:** Documentation / planning + draft content (content-only). No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**UI style:** Reuse existing reader per `MATH_LEARNING_BOOK_UI_STYLE_LOCK.md` — **not in scope for this task.**

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list and grade spans |
| `docs/learning-book/MATH_LEARNING_BOOK_CURRICULUM_MAP.md` | Page types, wide-span rules, Grade 5 new skills |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules (grade scope, no fallback, approved content) |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Seven-section template; Grades 5–6 age band (`grades_5_6`) |
| `docs/learning-book/MATH_GRADE_4_LEARNING_BOOK_PLAN.md` | Batch model and continuing-skill rules |
| `docs/learning-book/math/g4/drafts/` | Style reference — **do not modify** |
| `utils/math-constants.js` | Grade 5 operations (context only; spine drives page list) |
| `utils/math-question-generator.js` | Runtime kind hints for scope alignment (no practice mapping in this task) |

**Geometry:** Out of scope.  
**Subject naming:** Child-facing copy uses **חשבון**, not **מתמטיקה**.

---

## 1. Grade 5 Math Skills (Complete List)

A skill is **in Grade 5 scope** when `subject: "math"` and `minGrade ≤ 5` and `maxGrade ≥ 5` in `skills.json`.

**Total: 40 skills → 40 learning pages** (one `math:g5:{subtopic}` page each).

### 1A. New in Grade 5 (`minGrade = 5`) — 15 skills

| # | skill_id | subtopic | topic | Recommended page type | Clearly G5? |
|---|----------|----------|-------|------------------------|-------------|
| 1 | `math:kind:div_two_digit` | `div_two_digit` | division_and_number_theory | step_by_step_procedure | Yes |
| 2 | `math:kind:eq_div` | `eq_div` | number_sense_and_operations | step_by_step_procedure | Yes |
| 3 | `math:kind:eq_mul` | `eq_mul` | number_sense_and_operations | step_by_step_procedure | Yes |
| 4 | `math:kind:frac_add_sub` | `frac_add_sub` | fractions | step_by_step_procedure | Yes |
| 5 | `math:kind:frac_expand` | `frac_expand` | fractions | step_by_step_procedure | Yes |
| 6 | `math:kind:frac_reduce` | `frac_reduce` | fractions | step_by_step_procedure | Yes |
| 7 | `math:kind:frac_to_mixed` | `frac_to_mixed` | fractions | step_by_step_procedure | Yes |
| 8 | `math:kind:mixed_to_frac` | `mixed_to_frac` | fractions | step_by_step_procedure | Yes |
| 9 | `math:kind:perc_discount` | `perc_discount` | fractions | word_problem_strategy | Yes |
| 10 | `math:kind:perc_part_of` | `perc_part_of` | fractions | step_by_step_procedure | Yes |
| 11 | `math:kind:wp_distance_time` | `wp_distance_time` | word_problems | word_problem_strategy | Yes |
| 12 | `math:kind:wp_multi_step` | `wp_multi_step` | word_problems | word_problem_strategy | Yes |
| 13 | `math:kind:wp_shop_discount` | `wp_shop_discount` | word_problems | word_problem_strategy | Yes |
| 14 | `math:kind:wp_unit_cm_to_m` | `wp_unit_cm_to_m` | word_problems | word_problem_strategy | Yes |
| 15 | `math:kind:wp_unit_g_to_kg` | `wp_unit_g_to_kg` | word_problems | word_problem_strategy | Yes |

### 1B. Continuing from earlier grades — 25 skills

Separate **Grade 5** pages required (upgraded scope / vocabulary). Do **not** reuse G1–G4 pages.

| # | skill_id | subtopic | Prior grade page | G5 scope upgrade | Clearly G5? |
|---|----------|----------|------------------|------------------|-------------|
| 16 | `math:kind:add_three` | `add_three` | G4 | סכומים עד ~100,000 | Yes |
| 17 | `math:kind:add_two` | `add_two` | G4 | עד **100,000**; עשרות אלפים | Yes |
| 18 | `math:kind:cmp` | `cmp` | G4 | השוואה עד **100,000** | Yes |
| 19 | `math:kind:dec_add` | `dec_add` | G4 | עשרוניים; מספרים גדולים יותר בהקשר | Yes |
| 20 | `math:kind:dec_sub` | `dec_sub` | G4 | עשרוניים; אותו יישור | Yes |
| 21 | `math:kind:div` | `div` | G4 | מחולקים גדולים (8,400 ÷ 12) | Yes |
| 22 | `math:kind:div_with_remainder` | `div_with_remainder` | G4 | שארית במספרים גדולים | Yes |
| 23 | `math:kind:eq_add` | `eq_add` | G4 | משוואות באלפים | Yes |
| 24 | `math:kind:eq_sub` | `eq_sub` | G4 | משוואות באלפים | Yes |
| 25 | `math:kind:est_add` | `est_add` | G4 | אומדן לאלפים; **אחרון בכיתה ה׳** (`maxGrade = 5`) | Yes |
| 26 | `math:kind:est_mul` | `est_mul` | G4 | אומדן כפל; **אחרון בכיתה ה׳** | Yes |
| 27 | `math:kind:est_quantity` | `est_quantity` | G4 | אומדן כמות; **אחרון בכיתה ה׳** | Yes |
| 28 | `math:kind:fm_factor` | `fm_factor` | G4 | גורמים — מספרים גדולים יותר | Yes |
| 29 | `math:kind:fm_gcd` | `fm_gcd` | G4 | מ.א.ח — practice_bridge | Yes |
| 30 | `math:kind:fm_multiple` | `fm_multiple` | G4 | כפולות — practice_bridge | Yes |
| 31 | `math:kind:mul` | `mul` | G4 | כפל דו-ספרתי (25 × 36) | Yes |
| 32 | `math:kind:ns_complement100` | `ns_complement100` | G4 | חזרה; בסיס לחישוב | Yes |
| 33 | `math:kind:ns_neighbors` | `ns_neighbors` | G4 | שכנים עד **100,000** | Yes |
| 34 | `math:kind:ns_place_hundreds` | `ns_place_hundreds` | G4 | **עשרות אלפים**; עד **100,000** | Yes |
| 35 | `math:kind:round` | `round` | G4 | עיגול לעשרות אלפים | Yes |
| 36 | `math:kind:sequence` | `sequence` | G4 | קפיצות 500/1,000; g5+ word_problem_strategy | Yes |
| 37 | `math:kind:sub_two` | `sub_two` | G4 | עד **100,000** | Yes |
| 38 | `math:kind:wp_comparison_more` | `wp_comparison_more` | G4 | מספרים באלפים | Yes |
| 39 | `math:kind:wp_leftover` | `wp_leftover` | G4 | שארית — הקשרים גדולים | Yes |
| 40 | `math:kind:wp_time_sum` | `wp_time_sum` | G4 | שעות + דקות (1:25 + 0:45) | Needs owner review (time notation) |

### 1C. Grade 4 skills that do **not** continue to Grade 5 book

No G5 page (`maxGrade < 5` or not in G5 filter):

| skill_id | Reason |
|----------|--------|
| `math:kind:div_long` | `maxGrade = 4` — replaced by `div_two_digit` in G5 |
| `math:kind:divisibility` | `maxGrade = 4` |
| `math:kind:mul_vertical` | `maxGrade = 4` |
| `math:kind:prime_composite` | `maxGrade = 4` |
| `math:kind:power_base` | `maxGrade = 4` |
| `math:kind:power_calc` | `maxGrade = 4` |
| `math:kind:zero_add` / `zero_sub` / `zero_mul` | `maxGrade = 4` |
| `math:kind:one_mul` | `maxGrade = 4` |
| `math:kind:ns_complement10` | `maxGrade = 4` |
| `math:kind:ns_even_odd` | `maxGrade = 4` |
| `math:kind:est_*` | Continue to G5 but **end** at G5 (`maxGrade = 5`) — not in G6 book |

### 1D. In `math-constants.js` G5 operations but **not** separate spine pages

| Operation / topic | Decision |
|-------------------|----------|
| `fractions` (umbrella) | Covered by `frac_reduce`, `frac_expand`, `frac_add_sub`, `mixed_to_frac`, `frac_to_mixed` |
| `percentages` (umbrella) | Covered by `perc_part_of`, `perc_discount` |
| `equations` (umbrella) | Covered by `eq_add`, `eq_sub`, `eq_mul`, `eq_div` |
| `factors_multiples` (umbrella) | Covered by `fm_factor`, `fm_multiple`, `fm_gcd` |
| `estimation` (umbrella) | Covered by `est_add`, `est_mul`, `est_quantity` (last grade: G5) |
| `word_problems` (umbrella) | Covered by eight G5 WP pages |
| `negatives` | `allowNegatives: true` in constants — **not** a separate spine skill; out of draft scope unless owner adds |

---

## 2. Proposed Book Page List

Each row → `docs/learning-book/math/g5/drafts/{subtopic}.md`  
`learning_page_id`: `math:g5:{subtopic}`  
All pages: `age_band: grades_5_6`, `approval_status: draft`.

| Batch | Order | learning_page_id | skill_id | Draft file | Draft Hebrew title | Learning goal (short) | Clearly G5? |
|-------|-------|------------------|----------|------------|-------------------|------------------------|-------------|
| A | 1 | `math:g5:ns_place_hundreds` | `math:kind:ns_place_hundreds` | `ns_place_hundreds.md` | ערך המקום — עד 100,000 | עשרות אלפים; 48,726 | Yes |
| A | 2 | `math:g5:ns_neighbors` | `math:kind:ns_neighbors` | `ns_neighbors.md` | שכנים — עד 100,000 | שכן לפני/אחרי | Yes |
| A | 3 | `math:g5:ns_complement100` | `math:kind:ns_complement100` | `ns_complement100.md` | השלמה ל-100 | זוגות ל-100 | Yes |
| A | 4 | `math:g5:cmp` | `math:kind:cmp` | `cmp.md` | השוואה — עד 100,000 | >, <, = | Yes |
| A | 5 | `math:g5:sequence` | `math:kind:sequence` | `sequence.md` | סדרות — קפיצות גדולות | המשך סדרה | Yes |
| A | 6 | `math:g5:round` | `math:kind:round` | `round.md` | עיגול — עשרות אלפים | עיגול 38,750 | Yes |
| B | 7 | `math:g5:add_two` | `math:kind:add_two` | `add_two.md` | חיבור — עד 100,000 | נשיאה | Yes |
| B | 8 | `math:g5:sub_two` | `math:kind:sub_two` | `sub_two.md` | חיסור — עד 100,000 | השאלה | Yes |
| B | 9 | `math:g5:add_three` | `math:kind:add_three` | `add_three.md` | חיבור שלושה מספרים | שלושה מספרים | Yes |
| B | 10 | `math:g5:mul` | `math:kind:mul` | `mul.md` | כפל — אסטרטגיות | 25 × 36 | Yes |
| C | 11 | `math:g5:div` | `math:kind:div` | `div.md` | חילוק | חלוקה שווה | Yes |
| C | 12 | `math:g5:div_with_remainder` | `math:kind:div_with_remainder` | `div_with_remainder.md` | חילוק עם שארית | quotient + remainder | Yes |
| C | 13 | `math:g5:div_two_digit` | `math:kind:div_two_digit` | `div_two_digit.md` | חילוק דו-ספרתי | 2,450 ÷ 35 | Yes |
| D | 14 | `math:g5:frac_reduce` | `math:kind:frac_reduce` | `frac_reduce.md` | צמצום שבר | מ.א.ח | Yes |
| D | 15 | `math:g5:frac_expand` | `math:kind:frac_expand` | `frac_expand.md` | הרחבת שבר | מכנה משותף | Yes |
| D | 16 | `math:g5:frac_add_sub` | `math:kind:frac_add_sub` | `frac_add_sub.md` | חיבור/חיסור שברים | מכנה משותף | Yes |
| D | 17 | `math:g5:mixed_to_frac` | `math:kind:mixed_to_frac` | `mixed_to_frac.md` | מעורב → שבר | 2 1/3 | Yes |
| D | 18 | `math:g5:frac_to_mixed` | `math:kind:frac_to_mixed` | `frac_to_mixed.md` | שבר → מעורב | 7/3 | Yes |
| E | 19 | `math:g5:dec_add` | `math:kind:dec_add` | `dec_add.md` | חיבור עשרוניים | יישור נקודות | Yes |
| E | 20 | `math:g5:dec_sub` | `math:kind:dec_sub` | `dec_sub.md` | חיסור עשרוניים | יישור | Yes |
| E | 21 | `math:g5:eq_add` | `math:kind:eq_add` | `eq_add.md` | משוואת חיבור | מספר חסר | Yes |
| E | 22 | `math:g5:eq_sub` | `math:kind:eq_sub` | `eq_sub.md` | משוואת חיסור | מספר חסר | Yes |
| E | 23 | `math:g5:eq_mul` | `math:kind:eq_mul` | `eq_mul.md` | משוואת כפל | גורם חסר | Yes |
| E | 24 | `math:g5:eq_div` | `math:kind:eq_div` | `eq_div.md` | משוואת חילוק | מחלק חסר | Yes |
| F | 25 | `math:g5:fm_factor` | `math:kind:fm_factor` | `fm_factor.md` | גורמים | גורמים של 36 | Yes |
| F | 26 | `math:g5:fm_multiple` | `math:kind:fm_multiple` | `fm_multiple.md` | כפולות | כפולות של 7 | Yes |
| F | 27 | `math:g5:fm_gcd` | `math:kind:fm_gcd` | `fm_gcd.md` | המחלק המשותף הגדול ביותר (מ.א.ח) | 30 ו-45 | Yes |
| F | 28 | `math:g5:est_add` | `math:kind:est_add` | `est_add.md` | אומדן חיבור | ≈; אחרון G5 | Yes |
| F | 29 | `math:g5:est_mul` | `math:kind:est_mul` | `est_mul.md` | אומדן כפל | ≈ | Yes |
| F | 30 | `math:g5:est_quantity` | `math:kind:est_quantity` | `est_quantity.md` | אומדן כמות | ~12,000 | Yes |
| G | 31 | `math:g5:perc_part_of` | `math:kind:perc_part_of` | `perc_part_of.md` | אחוז מכמות | 25% מ-80 | Yes |
| G | 32 | `math:g5:perc_discount` | `math:kind:perc_discount` | `perc_discount.md` | הנחה באחוזים | 20% מ-150 | Yes |
| H | 33 | `math:g5:wp_comparison_more` | `math:kind:wp_comparison_more` | `wp_comparison_more.md` | כמה יותר? | הפרש | Yes |
| H | 34 | `math:g5:wp_leftover` | `math:kind:wp_leftover` | `wp_leftover.md` | מה נשאר? | שארית | Yes |
| H | 35 | `math:g5:wp_time_sum` | `math:kind:wp_time_sum` | `wp_time_sum.md` | סכום זמנים | 1:25 + 0:45 | Yes (hours:minutes approved) |
| H | 36 | `math:g5:wp_multi_step` | `math:kind:wp_multi_step` | `wp_multi_step.md` | שאלה מרובת שלבים | 2+ שלבים | Yes |
| H | 37 | `math:g5:wp_distance_time` | `math:kind:wp_distance_time` | `wp_distance_time.md` | מרחק וזמן | מהירות × זמן | Yes |
| H | 38 | `math:g5:wp_shop_discount` | `math:kind:wp_shop_discount` | `wp_shop_discount.md` | קניות והנחה | 15% הנחה | Yes |
| H | 39 | `math:g5:wp_unit_cm_to_m` | `math:kind:wp_unit_cm_to_m` | `wp_unit_cm_to_m.md` | ס״מ ↔ מטר | 250 ס״מ | Yes |
| H | 40 | `math:g5:wp_unit_g_to_kg` | `math:kind:wp_unit_g_to_kg` | `wp_unit_g_to_kg.md` | גרם ↔ ק״ג | 3,500 גרם | Yes |

**Page count:** 40.

**Note:** `book_placeholder.md` remains as infrastructure placeholder — **not** part of the 40-page book plan.

---

## 3. Batch Grouping

| Batch | Title (draft) | Pages | Focus |
|-------|---------------|-------|-------|
| **A** | ערך מקום, השוואה, סדרות ועיגול | 6 | place value to 100,000, compare, sequences, rounding |
| **B** | חיבור, חיסור וכפל | 4 | operations to 100,000 |
| **C** | חילוק | 3 | division, remainder, two-digit divisor |
| **D** | שברים | 5 | reduce, expand, add/sub, mixed ↔ improper |
| **E** | עשרוניים ומשוואות | 6 | decimals, four equation types |
| **F** | גורמים, כפולות, מ.א.ח ואומדן | 6 | FM + estimation (last grade for est) |
| **G** | אחוזים | 2 | percent of quantity, discount |
| **H** | שאלות מילוליות | 8 | WP including multi-step, units, speed |

---

## 4. Content Scope Notes (Draft Boundaries)

| Page | Scope | Out of scope (G5 draft) |
|------|-------|-------------------------|
| `ns_place_hundreds` | עד 100,000; עשרות אלפים | מיליונים |
| `add_two` / `sub_two` | עד 100,000 | שליליים |
| `div_two_digit` | מחלק דו-ספרתי | חילוק שברים |
| `frac_add_sub` | מכנה משותף נתון | מכנה שונה (הרחבה נפרדת) |
| `perc_part_of` | אחוזים שלמים פשוטים | שברים כאחוזים מורכבים |
| `eq_mul` / `eq_div` | מספר שלם | משוואות עם שני חסרים |
| `est_*` | אומדן בערך | חישוב מדויק חובה |
| `wp_distance_time` | מהירות קבועה × זמן | המרת יחידות מהירות |

---

## 5. Section 5 / Section 6 Alignment Plan

Every page keeps **the same numbers/story** in §5 (נסו בעצמכם) and §6 (שימו לב!).

| Page | §5 context | §6 mistake context |
|------|------------|-------------------|
| `ns_place_hundreds` | 48,726 — עשרות אלפים? | 48,726 — בלבול ספרות |
| `ns_neighbors` | שכנים של 45,600 | 45,600 — שכן שגוי |
| `ns_complement100` | 37 + ? = 100 | 37 + ? = 100 |
| `cmp` | 52,400 ? 52,390 | 52,400 vs 52,390 |
| `sequence` | 1,000, 1,500, 2,000, ? | אותה סדרה — קפיצה שגויה |
| `round` | 38,750 לעשרות אלפים | 38,750 — ספרה לא נכונה |
| `add_two` | 24,680 + 5,415 | 24,680 + 5,415 — שכחו עשרות אלפים |
| `sub_two` | 50,000 − 12,375 | 50,000 − 12,375 — השאלה |
| `add_three` | 2,000 + 1,500 + 800 | אותם שלושה מספרים |
| `mul` | 25 × 36 | 25 × 36 — חיבור במקום כפל |
| `div` | 8,400 ÷ 12 | 8,400 ÷ 12 |
| `div_with_remainder` | 1,247 ÷ 8 | 1,247 ÷ 8 — שארית |
| `div_two_digit` | 2,450 ÷ 35 | 2,450 ÷ 35 — מחלק 30 |
| `frac_reduce` | 12/18 | 12/18 — לא צמצמו |
| `frac_expand` | 2/3 → /12 | 2/3, מכנה 12 |
| `frac_add_sub` | 3/8 + 2/8 | 3/8 + 2/8 — חיברו מכנים |
| `mixed_to_frac` | 2 1/3 | 2 1/3 |
| `frac_to_mixed` | 7/3 | 7/3 |
| `dec_add` | 12.45 + 3.60 | 12.45 + 3.60 — יישור |
| `dec_sub` | 8.70 − 2.35 | 8.70 − 2.35 |
| `eq_add` | 3,250 + __ = 8,400 | 3,250 + __ = 8,400 |
| `eq_sub` | __ − 1,875 = 4,200 | __ − 1,875 = 4,200 |
| `eq_mul` | __ × 12 = 480 | __ × 12 = 480 |
| `eq_div` | 2,400 ÷ __ = 60 | 2,400 ÷ __ = 60 |
| `fm_factor` | גורמים של 36 | 36 |
| `fm_multiple` | כפולות של 7 | 7 |
| `fm_gcd` | מ.א.ח של 30 ו-45 | 30, 45 |
| `est_add` | 3,487 + 2,512 ≈ ? | 3,487 + 2,512 — חישוב מדויק |
| `est_mul` | 48 × 52 ≈ ? | 48 × 52 |
| `est_quantity` | ~12,000 ספרים | 12,000 |
| `perc_part_of` | 25% מ-80 | 25%, 80 |
| `perc_discount` | 20% מ-150 | 20%, 150 |
| `wp_comparison_more` | 3,200 לעומת 2,850 | 3,200, 2,850 |
| `wp_leftover` | 127, קבוצות 15 | 127, 15 |
| `wp_time_sum` | 1:25 + 0:45 | 1:25, 0:45 |
| `wp_multi_step` | 450, 120, 80 | אותה שאלה |
| `wp_distance_time` | 60 קמ״ש, 3 שעות | 60, 3 |
| `wp_shop_discount` | 200 ₪, 15% | 200, 15% |
| `wp_unit_cm_to_m` | 250 ס״מ | 250, cm |
| `wp_unit_g_to_kg` | 3,500 גרם | 3,500, g |

---

## 6. Topics Skipped or Uncertain (Owner Review)

| Topic | Status | Notes |
|-------|--------|-------|
| `wp_time_sum` time notation | **Owner approved** | Keep `1:25` + `0:45` (hours:minutes); verifier flags Bidi risk at runtime |
| `sequence` types | Needs review | Spine spans g3–g6; G5 uses large arithmetic steps only |
| `negatives` in G5 constants | Skipped | `allowNegatives: true` but no spine skill — no dedicated page |
| `frac_add_sub` different denominators | Deferred | Expansion taught on `frac_expand`; add/sub drafts use common denominator |
| Page count (40) | Needs review | Longer than G4 (37); confirm reading order |
| Hebrew מ.א.ח | Needs review | Abbreviation vs full phrase |
| `perc_*` vs `wp_shop_discount` | Needs review | Overlap intentional — concept vs word problem |

---

## 7. Owner-Review Questions Before Implementation

1. **Number ceiling:** Confirm **100,000** as max for G5 whole-number book (matches `math-constants.js` g5 ranges).
2. **Time format:** Approve `1:25` notation in `wp_time_sum` or switch to total minutes only?
3. **Estimation:** Confirm `est_*` pages end at G5 (`maxGrade = 5`) — no G6 estimation pages planned.
4. **Fractions:** Confirm G5 does not teach multiply/divide fractions (G6 spine skills).
5. **Two-digit division:** Confirm `div_two_digit` replaces `div_long` narrative for G5.
6. **Bidi:** Review pages with `100,000`, `48,726`, `1,000` in Hebrew prose (verifier lists all).
7. **Hebrew titles:** All titles marked `[DRAFT — not owner-approved]` — provide final copy.
8. **Practice CTA:** After approval, separate task maps Section 7 to Math Master — not in this deliverable.

---

## 8. Bidi / Thousands Safety (Content Side)

Grade 3 exposed `1,000` rendering as `000,1` in RTL. **Content keeps mathematically correct grouped thousands** (`1,000`, `10,000`, `100,000`); the shared renderer handles LTR isolation.

Content rules applied in drafts:

- Thousands written as single tokens: `1,000`, `48,726`, `100,000`
- No manual splitting of grouped digits
- No ASCII tables mixing Hebrew + numbers
- Fractions and decimals on their own lines where possible
- Percent signs adjacent to numbers (`25%`, `15%`) — verify renderer
- Verifier reports all grouped-thousands occurrences for owner review

---

## 9. Deliverables Checklist (This Task)

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan | `docs/learning-book/MATH_GRADE_5_LEARNING_BOOK_PLAN.md` | ✅ |
| Review pack | `docs/learning-book/MATH_GRADE_5_HEBREW_REVIEW_PACK.md` | ✅ generated |
| Draft pages | `docs/learning-book/math/g5/drafts/*.md` | ✅ 40 pages |
| Draft README | `docs/learning-book/math/g5/drafts/README.md` | ✅ |
| Review pack builder | `scripts/build-math-g5-hebrew-review-pack.mjs` | ✅ |
| Content verifier | `scripts/verify-math-g5-book-content.mjs` | ✅ |
| Draft manifest (scripts) | `scripts/lib/math-g5-draft-manifest.mjs` | ✅ |
| Draft content + generator (scripts) | `scripts/lib/math-g5-draft-content.mjs`, `scripts/gen-math-g5-drafts.mjs` | ✅ |

**Not in scope:** registry, routes, loaders, themes, Math Master, SQL, commit, push.  
**Not modified:** G1, G2, G3, G4 draft folders or their scripts.
