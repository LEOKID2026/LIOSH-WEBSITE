# Grade 6 Math Learning Book — Plan

**Status:** Documentation / planning + draft content (content-only). No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**UI style:** Reuse existing reader per `MATH_LEARNING_BOOK_UI_STYLE_LOCK.md` — **not in scope for this task.**

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list and grade spans |
| `docs/learning-book/MATH_LEARNING_BOOK_CURRICULUM_MAP.md` | Page types, wide-span rules, Grade 6 new skills |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules (grade scope, no fallback, approved content) |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | **Section C** (Grades 5–6) seven-section template |
| `docs/learning-book/MATH_GRADE_4_LEARNING_BOOK_PLAN.md` | Batch model and continuing-skill rules |
| `docs/learning-book/math/g4/drafts/` | Style reference — **do not modify** |
| `utils/math-constants.js` | Grade 6 operations (context only; spine drives page list) |
| `utils/math-question-generator.js` | Runtime kind hints for scope alignment (no practice mapping in this task) |

**Geometry:** Out of scope (`subject: "geometry"`).  
**Subject naming:** Child-facing copy uses **חשבון**, not **מתמטיקה**.

---

## 1. Grade 6 Math Skills (Complete List)

A skill is **in Grade 6 scope** when `subject: "math"`, `minGrade ≤ 6`, and `maxGrade ≥ 6` in `skills.json`.

**Total: 44 skills → 44 learning pages** (one `math:g6:{subtopic}` page each).

### 1A. New in Grade 6 (`minGrade = 6`) — 14 skills

| # | skill_id | subtopic | topic | Recommended page type | Clearly G6? |
|---|----------|----------|-------|------------------------|-------------|
| 1 | `math:kind:dec_divide` | `dec_divide` | decimals | step_by_step_procedure | Yes |
| 2 | `math:kind:dec_divide_10_100` | `dec_divide_10_100` | decimals | step_by_step_procedure | Yes |
| 3 | `math:kind:dec_multiply` | `dec_multiply` | decimals | step_by_step_procedure | Yes |
| 4 | `math:kind:dec_multiply_10_100` | `dec_multiply_10_100` | decimals | step_by_step_procedure | Yes |
| 5 | `math:kind:dec_repeating` | `dec_repeating` | decimals | concept_foundation | Yes |
| 6 | `math:kind:frac_as_division` | `frac_as_division` | fractions | concept_foundation | Yes |
| 7 | `math:kind:frac_divide` | `frac_divide` | fractions | step_by_step_procedure | Yes |
| 8 | `math:kind:frac_multiply` | `frac_multiply` | fractions | step_by_step_procedure | Yes |
| 9 | `math:kind:ratio_find` | `ratio_find` | ratio_scale_and_powers | step_by_step_procedure | Yes |
| 10 | `math:kind:ratio_first` | `ratio_first` | ratio_scale_and_powers | concept_foundation | Yes |
| 11 | `math:kind:ratio_second` | `ratio_second` | ratio_scale_and_powers | step_by_step_procedure | Yes |
| 12 | `math:kind:scale_find` | `scale_find` | ratio_scale_and_powers | step_by_step_procedure | Yes |
| 13 | `math:kind:scale_map_to_real` | `scale_map_to_real` | ratio_scale_and_powers | step_by_step_procedure | Yes |
| 14 | `math:kind:scale_real_to_map` | `scale_real_to_map` | ratio_scale_and_powers | step_by_step_procedure | Yes |

### 1B. Continuing from earlier grades — 30 skills

Separate **Grade 6** pages required (upgraded scope / vocabulary). Do **not** reuse G1–G5 pages.

| # | skill_id | subtopic | Prior grade page | G6 scope upgrade | Clearly G6? |
|---|----------|----------|------------------|------------------|-------------|
| 15 | `math:kind:add_three` | `add_three` | G5 | סכומים עד ~200,000 | Yes |
| 16 | `math:kind:add_two` | `add_two` | G5 | עד **200,000** | Yes |
| 17 | `math:kind:cmp` | `cmp` | G5 | השוואה עד **200,000** | Yes |
| 18 | `math:kind:dec_add` | `dec_add` | G5 | שתי ספרות אחרי הנקודה; הקשרים גדולים | Yes |
| 19 | `math:kind:dec_sub` | `dec_sub` | G5 | שתי ספרות אחרי הנקודה | Yes |
| 20 | `math:kind:div` | `div` | G5 | מחולקים עד 20,000; מחלק עד 12 | Yes |
| 21 | `math:kind:div_with_remainder` | `div_with_remainder` | G5 | מספרים גדולים יותר | Yes |
| 22 | `math:kind:eq_add` | `eq_add` | G5 | מספרים עד 200,000 | Yes |
| 23 | `math:kind:eq_div` | `eq_div` | G5 | משוואות חילוק — **G6 page slot** | Yes |
| 24 | `math:kind:eq_mul` | `eq_mul` | G5 | משוואות כפל — **G6 page slot** | Yes |
| 25 | `math:kind:eq_sub` | `eq_sub` | G5 | מספרים עד 200,000 | Yes |
| 26 | `math:kind:fm_factor` | `fm_factor` | G5 | מספרים עד ~5,000 | Yes |
| 27 | `math:kind:fm_gcd` | `fm_gcd` | G5 | מ.א.ח — מספרים גדולים יותר | Yes |
| 28 | `math:kind:fm_multiple` | `fm_multiple` | G5 | כפולות — חזרה | Yes |
| 29 | `math:kind:mul` | `mul` | G5 | כפל עד 500×500; אסטרטגיות | Yes |
| 30 | `math:kind:ns_complement100` | `ns_complement100` | G5 | חזרה — בסיס לחישוב מהיר | Yes |
| 31 | `math:kind:ns_neighbors` | `ns_neighbors` | G5 | שכנים עד **200,000** | Yes |
| 32 | `math:kind:ns_place_hundreds` | `ns_place_hundreds` | G5 | **מאות אלפים**; עד **200,000** | Yes |
| 33 | `math:kind:perc_discount` | `perc_discount` | G5 | הנחה — **G6 page slot** | Yes |
| 34 | `math:kind:perc_part_of` | `perc_part_of` | G5 | אחוז מכמות — **G6 page slot** | Yes |
| 35 | `math:kind:round` | `round` | G5 | עיגול — **אחרון בכיתה ו'** (`maxGrade = 6`) | Yes |
| 36 | `math:kind:sequence` | `sequence` | G5 | קפיצות גדולות; מספרים עד 200,000 | Needs owner review (sequence type) |
| 37 | `math:kind:sub_two` | `sub_two` | G5 | עד **200,000** | Yes |
| 38 | `math:kind:wp_comparison_more` | `wp_comparison_more` | G5 | מספרים גדולים יותר | Yes |
| 39 | `math:kind:wp_distance_time` | `wp_distance_time` | G5 | מרחק/זמן/מהירות — **G6 page slot** | Yes |
| 40 | `math:kind:wp_leftover` | `wp_leftover` | G5 | הקשרים גדולים יותר | Yes |
| 41 | `math:kind:wp_shop_discount` | `wp_shop_discount` | G5 | מבצע בחנות — **G6 page slot** | Yes |
| 42 | `math:kind:wp_time_sum` | `wp_time_sum` | G5 | סכום שעות ודקות | Yes |
| 43 | `math:kind:wp_unit_cm_to_m` | `wp_unit_cm_to_m` | G5 | המרת ס״מ↔מ' — **G6 page slot** | Yes |
| 44 | `math:kind:wp_unit_g_to_kg` | `wp_unit_g_to_kg` | G5 | המרת גרם↔ק״ג — **G6 page slot** | Yes |

### 1C. Math skills excluded from Grade 6 book (and why)

| skill_id | Grade scope | Reason |
|----------|-------------|--------|
| `math:kind:est_add` | g4–g5 | `maxGrade = 5` — estimation not in G6 spine |
| `math:kind:est_mul` | g4–g5 | same |
| `math:kind:est_quantity` | g4–g5 | same |
| `math:kind:frac_add_sub` | g5 only | Grade 5 only — no G6 page slot |
| `math:kind:frac_reduce` | g5 only | Grade 5 only |
| `math:kind:frac_expand` | g5 only | Grade 5 only |
| `math:kind:frac_to_mixed` | g5 only | Grade 5 only |
| `math:kind:mixed_to_frac` | g5 only | Grade 5 only |
| `math:kind:div_two_digit` | g5 only | Grade 5 only — two-digit divisor |
| `math:kind:wp_multi_step` | g5 only | Grade 5 only — owner may want G6 bridge page later |
| `math:kind:power_base` | g4 only | Powers not continuing to G6 in spine |
| `math:kind:power_calc` | g4 only | same |
| `math:kind:div_long` | g4 only | Long division algorithm ends G4 |
| `math:kind:divisibility` | g2–g4 | Ends G4 |
| `math:kind:ns_complement10` | g1–g4 | Ends G4 |
| `math:kind:ns_even_odd` | g1–g4 | Ends G4 |
| All g1–g3-only skills | various | `maxGrade < 6` |

### 1D. In `math-constants.js` G6 operations but not separate spine pages

| Operation / topic | Decision |
|-------------------|----------|
| `fractions` (umbrella) | G6 new pages: `frac_multiply`, `frac_divide`, `frac_as_division`; G5 pages cover add/sub/reduce |
| `percentages` (umbrella) | Covered by `perc_part_of`, `perc_discount` |
| `ratio` / `scale` (umbrella) | Covered by six ratio/scale spine entries |
| `equations` (umbrella) | Covered by `eq_add`, `eq_sub`, `eq_mul`, `eq_div` |
| `factors_multiples` (umbrella) | Covered by `fm_factor`, `fm_multiple`, `fm_gcd` |
| `word_problems` (umbrella) | Covered by seven G6 WP pages |

---

## 2. Proposed Book Page List

Each row → `docs/learning-book/math/g6/drafts/{subtopic}.md`  
`learning_page_id`: `math:g6:{subtopic}`  
All pages: `age_band: grades_5_6`, `approval_status: draft`.

| Batch | Order | learning_page_id | skill_id | Draft file | Draft Hebrew title | Learning goal (short) | Clearly G6? |
|-------|-------|------------------|----------|------------|-------------------|------------------------|-------------|
| A | 1 | `math:g6:ns_place_hundreds` | `math:kind:ns_place_hundreds` | `ns_place_hundreds.md` | ערך המקום — עד 200,000 | מאות אלפים; עד 200,000 | Yes |
| A | 2 | `math:g6:ns_neighbors` | `math:kind:ns_neighbors` | `ns_neighbors.md` | שכנים — מספרים גדולים | שכן לפני/אחרי עד 200,000 | Yes |
| A | 3 | `math:g6:ns_complement100` | `math:kind:ns_complement100` | `ns_complement100.md` | השלמה ל-100 | זוגות ל-100 | Yes |
| A | 4 | `math:g6:cmp` | `math:kind:cmp` | `cmp.md` | השוואת מספרים גדולים | >, <, = עד 200,000 | Yes |
| A | 5 | `math:g6:sequence` | `math:kind:sequence` | `sequence.md` | סדרות — קפיצות גדולות | המשך סדרה | Needs owner review |
| A | 6 | `math:g6:round` | `math:kind:round` | `round.md` | עיגול — עשרות/מאות/אלפים | עיגול שלמים | Yes |
| B | 7 | `math:g6:add_two` | `math:kind:add_two` | `add_two.md` | חיבור עד 200,000 | חיבור עם נשיאה | Yes |
| B | 8 | `math:g6:sub_two` | `math:kind:sub_two` | `sub_two.md` | חיסור עד 200,000 | חיסור עם השאלה | Yes |
| B | 9 | `math:g6:add_three` | `math:kind:add_three` | `add_three.md` | חיבור שלושה מספרים | שלושה מספרים | Yes |
| B | 10 | `math:g6:mul` | `math:kind:mul` | `mul.md` | כפל — אסטרטגיות | כפל גדול | Yes |
| B | 11 | `math:g6:div` | `math:kind:div` | `div.md` | חילוק שווה | חלוקה בלי שארית | Yes |
| B | 12 | `math:g6:div_with_remainder` | `math:kind:div_with_remainder` | `div_with_remainder.md` | חילוק עם שארית | quotient + remainder | Yes |
| C | 13 | `math:g6:fm_factor` | `math:kind:fm_factor` | `fm_factor.md` | גורמים | מציאת גורמים | Yes |
| C | 14 | `math:g6:fm_multiple` | `math:kind:fm_multiple` | `fm_multiple.md` | כפולות | כפולות של n | Yes |
| C | 15 | `math:g6:fm_gcd` | `math:kind:fm_gcd` | `fm_gcd.md` | מ.א.ח | מ.א.ח של שני מספרים | Yes |
| D | 16 | `math:g6:eq_add` | `math:kind:eq_add` | `eq_add.md` | משוואת חיבור | מספר חסר | Yes |
| D | 17 | `math:g6:eq_sub` | `math:kind:eq_sub` | `eq_sub.md` | משוואת חיסור | מספר חסר | Yes |
| D | 18 | `math:g6:eq_mul` | `math:kind:eq_mul` | `eq_mul.md` | משוואת כפל | גורם חסר | Yes |
| D | 19 | `math:g6:eq_div` | `math:kind:eq_div` | `eq_div.md` | משוואת חילוק | מחלק/מחולק חסר | Yes |
| E | 20 | `math:g6:dec_add` | `math:kind:dec_add` | `dec_add.md` | חיבור עשרוניים | שתי ספרות אחרי הנקודה | Yes |
| E | 21 | `math:g6:dec_sub` | `math:kind:dec_sub` | `dec_sub.md` | חיסור עשרוניים | שתי ספרות אחרי הנקודה | Yes |
| E | 22 | `math:g6:dec_multiply` | `math:kind:dec_multiply` | `dec_multiply.md` | כפל עשרוניים | כפל עשרוניים | Yes |
| E | 23 | `math:g6:dec_multiply_10_100` | `math:kind:dec_multiply_10_100` | `dec_multiply_10_100.md` | כפל ב-10/100 | הזזת נקודה | Yes |
| E | 24 | `math:g6:dec_divide` | `math:kind:dec_divide` | `dec_divide.md` | חילוק עשרוניים | חילוק עשרוניים | Yes |
| E | 25 | `math:g6:dec_divide_10_100` | `math:kind:dec_divide_10_100` | `dec_divide_10_100.md` | חילוק ב-10/100 | הזזת נקודה | Yes |
| E | 26 | `math:g6:dec_repeating` | `math:kind:dec_repeating` | `dec_repeating.md` | עשרוניים מחזוריים | 1/3 = 0.333… | Yes |
| F | 27 | `math:g6:frac_as_division` | `math:kind:frac_as_division` | `frac_as_division.md` | שבר כחילוק | a/b = a÷b | Yes |
| F | 28 | `math:g6:frac_multiply` | `math:kind:frac_multiply` | `frac_multiply.md` | כפל שברים | מונה×מונה | Yes |
| F | 29 | `math:g6:frac_divide` | `math:kind:frac_divide` | `frac_divide.md` | חילוק שברים | כפל בהופכי | Yes |
| G | 30 | `math:g6:ratio_first` | `math:kind:ratio_first` | `ratio_first.md` | יחס — מושג | כתיבה a:b | Yes |
| G | 31 | `math:g6:ratio_second` | `math:kind:ratio_second` | `ratio_second.md` | יחס מנתונים | מציאת יחס | Yes |
| G | 32 | `math:g6:ratio_find` | `math:kind:ratio_find` | `ratio_find.md` | כמות חסרה ביחס | חלוקה לפי יחס | Yes |
| G | 33 | `math:g6:scale_find` | `math:kind:scale_find` | `scale_find.md` | קנה מידה | 1:50,000 | Yes |
| G | 34 | `math:g6:scale_map_to_real` | `math:kind:scale_map_to_real` | `scale_map_to_real.md` | מפה→מציאות | כפל | Yes |
| G | 35 | `math:g6:scale_real_to_map` | `math:kind:scale_real_to_map` | `scale_real_to_map.md` | מציאות→מפה | חילוק | Yes |
| H | 36 | `math:g6:perc_part_of` | `math:kind:perc_part_of` | `perc_part_of.md` | אחוז מכמות | 40% מ-250 | Yes |
| H | 37 | `math:g6:perc_discount` | `math:kind:perc_discount` | `perc_discount.md` | הנחה באחוזים | מחיר אחרי הנחה | Yes |
| I | 38 | `math:g6:wp_comparison_more` | `math:kind:wp_comparison_more` | `wp_comparison_more.md` | כמה יותר? | הפרש | Yes |
| I | 39 | `math:g6:wp_leftover` | `math:kind:wp_leftover` | `wp_leftover.md` | מה נשאר? | שארית | Yes |
| I | 40 | `math:g6:wp_time_sum` | `math:kind:wp_time_sum` | `wp_time_sum.md` | סכום זמנים | חיבור שעות | Yes |
| I | 41 | `math:g6:wp_distance_time` | `math:kind:wp_distance_time` | `wp_distance_time.md` | מרחק וזמן | מהירות×זמן | Yes |
| I | 42 | `math:g6:wp_shop_discount` | `math:kind:wp_shop_discount` | `wp_shop_discount.md` | מבצע בחנות | הנחה + מחיר | Yes |
| I | 43 | `math:g6:wp_unit_cm_to_m` | `math:kind:wp_unit_cm_to_m` | `wp_unit_cm_to_m.md` | ס״מ ↔ מטר | 100 ס״מ = 1 מ' | Yes |
| I | 44 | `math:g6:wp_unit_g_to_kg` | `math:kind:wp_unit_g_to_kg` | `wp_unit_g_to_kg.md` | גרם ↔ ק״ג | 1,000 ג = 1 ק״ג | Yes |

**Page count:** 44.

---

## 3. Batch Grouping

| Batch | Title (draft) | Pages | Focus |
|-------|---------------|-------|-------|
| **A** | ערך מקום, השוואה, סדרות ועיגול | 6 | place value to 200,000, compare, sequences, rounding |
| **B** | חיבור, חיסור, כפל וחילוק | 6 | operations to 200,000 |
| **C** | גורמים, כפולות ומ.א.ח | 3 | factors, multiples, GCD |
| **D** | משוואות | 4 | eq_add/sub/mul/div |
| **E** | מספרים עשרוניים | 7 | decimal add/sub/multiply/divide + repeating |
| **F** | שברים | 3 | fraction as division, multiply, divide |
| **G** | יחס וקנה מידה | 6 | ratio and map scale |
| **H** | אחוזים | 2 | percent of quantity, discount |
| **I** | שאלות מילוליות | 7 | WP comparison, leftover, time, distance, shop, units |

---

## 4. Content Scope Notes (Draft Boundaries)

| Page | Scope | Out of scope (G6 draft) |
|------|-------|-------------------------|
| `ns_place_hundreds` | מאות אלפים; עד 200,000 | מיליונים |
| `add_two` / `sub_two` | עד 200,000 | שליליים (unless owner adds) |
| `mul` | אסטרטגיות; עד 500×500 | כפל במאונך ארוך (→ G4 `mul_vertical`) |
| `div` | מחלק עד 12 | מחלק דו-ספרתי |
| `dec_multiply` / `dec_divide` | שתי ספרות אחרי הנקודה | שלוש ספרות |
| `frac_multiply` / `frac_divide` | מכנים עד ~20 | מixed numbers (→ G5) |
| `ratio_*` / `scale_*` | יחסים שלמים; קנה מידה 1:n | שברים ביחס |
| `dec_repeating` | 1/3, 2/3, 1/6 | הוכחות פורמליות |
| `wp_distance_time` | מרחק = מהירות × זמן | המרות יחידות מורכבות |

---

## 5. Section 5 / Section 6 Alignment Plan

Every page keeps **the same numbers/story** in §5 (נסו בעצמכם) and §6 (שימו לב!).

| Page | §5 context | §6 mistake context |
|------|------------|-------------------|
| `ns_place_hundreds` | 125,480 — ערך ספרה | 125,480 — בלבול מקום |
| `ns_neighbors` | שכנים של 48,650 | 48,650 — ±10 במקום ±1 |
| `ns_complement100` | 63 + ? = 100 | 63 + ? = 100 |
| `cmp` | 185,420 ? 185,240 | 185,420 vs 185,240 |
| `sequence` | 500, 550, 600, ?, ? | 500, 550, 600 — קפיצה +50 |
| `round` | 47,832 לאלפים | 47,832 — ספרת החלטה |
| `add_two` | 12,450 + 3,875 | 12,450 + 3,875 — נשיאה |
| `sub_two` | 50,200 − 18,475 | 50,200 − 18,475 — השאלה |
| `add_three` | 1,200 + 350 + 450 | 1,200 + 350 + 450 — שכחת מספר |
| `mul` | 24 × 15 | 24 × 15 — טעות ב×5 |
| `div` | 1,440 ÷ 12 | 1,440 ÷ 12 — בלבול מנה/מחלק |
| `div_with_remainder` | 850 ÷ 7 | 850 ÷ 7 — שארית ≥ מחלק |
| `fm_factor` | גורמים של 36 | 36 — חסר 1/36 |
| `fm_multiple` | כפולות של 8 | 8 — מתחילים מ-0 |
| `fm_gcd` | מ.א.ח 30, 45 | 30, 45 — לא הגדול |
| `eq_add` | 2,450 + ? = 4,030 | 2,450 + ? = 4,030 |
| `eq_sub` | 5,000 − ? = 3,725 | 5,000 − ? = 3,725 |
| `eq_mul` | 48 × ? = 576 | 48 × ? = 576 |
| `eq_div` | 96 ÷ ? = 8 | 96 ÷ ? = 8 |
| `dec_add` | 2.45 + 1.30 | 2.45 + 1.30 — יישור |
| `dec_sub` | 5.80 − 2.35 | 5.80 − 2.35 |
| `dec_multiply` | 1.5 × 2.4 | 1.5 × 2.4 — נקודה |
| `dec_multiply_10_100` | 3.25 × 10 | 3.25 × 10 — כיוון |
| `dec_divide` | 4.8 ÷ 1.2 | 4.8 ÷ 1.2 |
| `dec_divide_10_100` | 45.6 ÷ 10 | 45.6 ÷ 10 |
| `dec_repeating` | 1/3 כעשרוני | 1/3 — 0.33 |
| `frac_as_division` | 3/4 כעשרוני | 3/4 — 4÷3 |
| `frac_multiply` | 2/3 × 3/4 | 2/3 × 3/4 — חיבור |
| `frac_divide` | 1/2 ÷ 1/4 | 1/2 ÷ 1/4 — הופכי |
| `ratio_first` | 6:4 → 3:2 | 3:2 — סדר |
| `ratio_second` | 12:8 → 3:2 | 12, 8 — צמצום |
| `ratio_find` | יחס 2:5, סך 35 | 2:5, 35 |
| `scale_find` | 1:50,000, 2 ס״מ | 1:50,000 |
| `scale_map_to_real` | 4 ס״מ, 1:25,000 | 4, 1:25,000 |
| `scale_real_to_map` | 2 ק״מ, 1:50,000 | 2, 1:50,000 |
| `perc_part_of` | 40% מ-250 | 40%, 250 |
| `perc_discount` | 20% על 180 | 20%, 180 |
| `wp_comparison_more` | 12,450 vs 9,875 | 12,450, 9,875 |
| `wp_leftover` | 850, 6 בארגז | 850, 6 |
| `wp_time_sum` | 2:25 + 1:40 | 2:25, 1:40 |
| `wp_distance_time` | 60 קמ״ש, 2 שעות | 60, 2 |
| `wp_shop_discount` | 150, 15% | 150, 15% |
| `wp_unit_cm_to_m` | 350 ס״מ | 350, 100 |
| `wp_unit_g_to_kg` | 2,500 גרם | 2,500, 1,000 |

---

## 6. Topics Skipped or Uncertain

| Topic | Status | Notes |
|-------|--------|-------|
| `sequence` (g3–g6) | **Needs owner review** | Spine does not specify arithmetic vs geometric per grade; G6 draft uses arithmetic +50 only |
| `wp_multi_step` | **Skipped** | g5 only in spine; G6 relies on other WP pages |
| G5 fraction skills | **Not in G6 book** | `frac_add_sub`, `frac_reduce`, etc. are g5-only — assumed in G5 book |
| Negative numbers | **Uncertain** | `allowNegatives: true` in G6 constants but no spine skill — not authored |
| Powers | **Excluded** | `power_base`/`power_calc` end at G4 |
| Estimation | **Excluded** | `est_*` end at G5 |

---

## 7. Owner-Review Questions Before Implementation

1. **`sequence` in G6:** Should pages include geometric sequences, or only arithmetic (as drafted)?
2. **Negative numbers:** Should any G6 pages introduce negatives, or stay with `min: 0` per `math-constants.js`?
3. **`wp_multi_step`:** Should a G6 bridge page be added even though spine is g5-only?
4. **Fraction prerequisite:** G6 assumes G5 fraction add/sub/reduce was learned — confirm cross-grade references are acceptable in §2 text only.
5. **Scale notation:** Is `1:50,000` the preferred classroom notation for Hebrew schools?
6. **Hebrew titles:** All 44 titles marked `[DRAFT — not owner-approved]` — batch review or domain-by-domain?

---

## 8. Bidi-Risk Notes

| Risk area | Pages affected | Mitigation in content |
|-----------|----------------|----------------------|
| Grouped thousands | 18 pages (see verifier output) | Full tokens: `125,480`, `200,000`, `1,000` — never split |
| Decimals + Hebrew | `dec_*` (7 pages) | Dot decimal; no ASCII vertical layouts |
| Fractions | `frac_*`, `dec_repeating` | Slash notation `2/3`; avoid stacked fractions in markdown |
| Ratios | `ratio_*` | Colon notation `3:2` |
| Percentages | `perc_*`, `wp_shop_discount` | `40%` as single token before Hebrew |
| Scale | `scale_*` | `1:50,000` kept as one LTR token |
| Time | `wp_time_sum` | `2:25` format — colon may need renderer isolation |
| Unit conversion | `wp_unit_g_to_kg` | `1,000` grouped thousands |

**Verifier command:** `node scripts/verify-math-g6-book-content.mjs` reports all grouped-thousands occurrences for UI review.

---

## 9. Deliverables Checklist

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan (this document) | `docs/learning-book/MATH_GRADE_6_LEARNING_BOOK_PLAN.md` | ✅ |
| Hebrew review pack | `docs/learning-book/MATH_GRADE_6_HEBREW_REVIEW_PACK.md` | ✅ generated |
| Draft pages (44) | `docs/learning-book/math/g6/drafts/*.md` | ✅ |
| Drafts README | `docs/learning-book/math/g6/drafts/README.md` | ✅ |
| Review pack builder | `scripts/build-math-g6-hebrew-review-pack.mjs` | ✅ |
| Content verifier | `scripts/verify-math-g6-book-content.mjs` | ✅ |
| Draft manifest | `scripts/lib/math-g6-draft-manifest.mjs` | ✅ |
| Draft generator (maintenance) | `scripts/generate-math-g6-drafts.mjs` | ✅ |

---

## 10. Explicit Stop Rule

Until owner approves content:

- ❌ No runtime registry (`math-g6-registry.js`), routes, loaders, SQL, commit, push, or deploy
- ❌ No practice CTA resolver or fake `forceKind` mappings
- ✅ Documentation and draft markdown only
