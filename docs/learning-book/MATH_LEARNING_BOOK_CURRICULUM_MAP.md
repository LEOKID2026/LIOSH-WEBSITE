# Math Learning Book — Curriculum Map

**Status:** Documentation / mapping only. No code implemented. No SQL executed. No commits made.
**Date:** June 2026
**Sources:**
- `data/curriculum-spine/v1/skills.json` — 91 Math skill rows (primary source)
- `utils/math-constants.js` — per-grade allowed operations and number ranges
- `utils/math-question-generator.js` — runtime generator confirming active kinds
**Language:** English planning document.

---

## Important: Skill Count vs. Grade-Expanded Coverage

The curriculum spine contains **91 unique Math skills** (`subject: "math"`).

Many skills span multiple grades (e.g., `add_two` appears from Grade 1 through Grade 6).
**This does not mean one generic learning page serves all grades.**

A skill that spans Grades 1–6 requires **up to 6 separate grade-specific learning pages**,
each calibrated to the vocabulary, scope, and examples appropriate for that grade.

> **Rule:** For every `skill_id` × `grade` pair in scope, a separate learning page must be
> authored and approved before that combination can be shown to a student.

The tables below list all 91 skills. Each row shows the grade scope. Wide-span skills are
flagged in the "Notes" column with the number of page slots they represent.

---

## Geometry Note

Geometry is a **separate subject** (`subject: "geometry"`) in the curriculum spine.
It has 38 skill entries across topics: `area_and_shapes`, `angles_and_transformations`,
`volume`, and `pythagoras_and_diagonals`.

Geometry is **out of scope** for this Math Learning Book documentation package.
A separate `GEOMETRY_LEARNING_BOOK_*` document set should be created when geometry
learning pages are planned. Cross-references will be noted in the Grade 1 and Grade 2
sections where geometry skills overlap with the Math scope grade range.

---

## Page Type Vocabulary

| Code | Meaning |
|------|---------|
| `concept_foundation` | Introduces the core idea; what it means and why it exists |
| `visual_intuition` | Anchors the concept to a visual or concrete model (number line, blocks, diagrams) |
| `step_by_step_procedure` | Numbered procedure; how to execute the algorithm |
| `word_problem_strategy` | How to read, set up, and solve a word problem |
| `practice_bridge` | Connects the current skill to a previously learned one |
| `mixed` | Two or more of the above are combined on one page |
| `needs_review` | Scope or grade alignment is ambiguous; requires owner decision before authoring |

---

## Domain Summary

| Domain (topic key) | Unique skills | Grade range |
|--------------------|---------------|-------------|
| `number_sense_and_operations` | 32 | g1–g6 |
| `word_problems` | 14 | g1–g6 |
| `fractions` | 14 | g2–g6 |
| `division_and_number_theory` | 9 | g2–g6 |
| `decimals` | 8 | g3–g6 |
| `ratio_scale_and_powers` | 8 | g4–g6 |
| `multiplication` | 6 | g1–g4 |
| **Total** | **91** | **g1–g6** |

---

## Grade 1 — 19 Skills

Operations allowed per `utils/math-constants.js`: addition, subtraction, multiplication (×5),
compare, number_sense, word_problems (addition/subtraction only), mixed.

| skill_id | subtopic | topic | Grade scope | Needs learning page | Recommended page type | Notes |
|----------|----------|-------|-------------|---------------------|-----------------------|-------|
| `math:kind:add_second_decade` | `add_second_decade` | number_sense_and_operations | g1 only | Yes | `concept_foundation` + `visual_intuition` | Grade 1 only — sums in teens (11–19) |
| `math:kind:add_tens_only` | `add_tens_only` | number_sense_and_operations | g1 only | Yes | `visual_intuition` | Grade 1 only — adding whole tens (10+10, 20+30) |
| `math:kind:add_two` | `add_two` | number_sense_and_operations | **g1–g6** | Yes (per grade) | g1: `visual_intuition`; higher grades: `step_by_step_procedure` | **6 page slots** — explanation changes each grade |
| `math:kind:cmp` | `cmp` | number_sense_and_operations | **g1–g6** | Yes (per grade) | g1: `visual_intuition`; higher: `concept_foundation` | **6 page slots** — number range and vocabulary expand each grade |
| `math:kind:eq_add_simple` | `eq_add_simple` | number_sense_and_operations | g1 only | Yes | `concept_foundation` | Grade 1 only — missing addend, balancing simple number sentence |
| `math:kind:eq_sub_simple` | `eq_sub_simple` | number_sense_and_operations | g1 only | Yes | `concept_foundation` | Grade 1 only — missing subtrahend in simple sentence |
| `math:kind:mul` | `mul` | multiplication | **g1–g6** | Yes (per grade) | g1: `visual_intuition`; g2–g3: `concept_foundation`; g4+: `step_by_step_procedure` | **6 page slots** — g1 scope: products up to 5×4=20 only |
| `math:kind:ns_complement10` | `ns_complement10` | number_sense_and_operations | **g1–g4** | Yes (per grade) | g1–g2: `visual_intuition`; g3–g4: `practice_bridge` | **4 page slots** |
| `math:kind:ns_counting_backward` | `ns_counting_backward` | number_sense_and_operations | g1 only | Yes | `visual_intuition` | Grade 1 only — counting backward on number line |
| `math:kind:ns_counting_forward` | `ns_counting_forward` | number_sense_and_operations | g1 only | Yes | `visual_intuition` | Grade 1 only — counting forward on number line |
| `math:kind:ns_even_odd` | `ns_even_odd` | number_sense_and_operations | **g1–g4** | Yes (per grade) | g1: `concept_foundation`; g2+: `practice_bridge` | **4 page slots** — g1 introduces the concept; later grades reinforce |
| `math:kind:ns_neighbors` | `ns_neighbors` | number_sense_and_operations | **g1–g6** | Yes (per grade) | g1–g2: `visual_intuition`; g3+: `practice_bridge` | **6 page slots** — "one before, one after"; number range expands |
| `math:kind:ns_number_line` | `ns_number_line` | number_sense_and_operations | g1 only | Yes | `visual_intuition` | Grade 1 only — locating numbers on a number line |
| `math:kind:ns_place_tens_units` | `ns_place_tens_units` | number_sense_and_operations | **g1–g2** | Yes (per grade) | `concept_foundation` | **2 page slots** — tens and units place value |
| `math:kind:sub_two` | `sub_two` | number_sense_and_operations | **g1–g6** | Yes (per grade) | g1: `visual_intuition`; higher: `step_by_step_procedure` | **6 page slots** |
| `math:kind:wp_coins` | `wp_coins` | word_problems | **g1–g2** | Yes (per grade) | `word_problem_strategy` | **2 page slots** — coin-value word problems |
| `math:kind:wp_coins_spent` | `wp_coins_spent` | word_problems | **g1–g2** | Yes (per grade) | `word_problem_strategy` | **2 page slots** — spending / change word problems |
| `math:kind:wp_time_date` | `wp_time_date` | word_problems | **g1–g2** | Yes (per grade) | `word_problem_strategy` | **2 page slots** — calendar / date word problems |
| `math:kind:wp_time_days` | `wp_time_days` | word_problems | **g1–g2** | Yes (per grade) | `word_problem_strategy` | **2 page slots** — days-of-week / before-after word problems |

---

## Grade 2 — New Skills Introduced

Operations added in Grade 2: vertical addition/subtraction, division (basic), fractions
(½ and ¼), divisibility (2, 5, 10), word problems (all four operations).

Skills below are **new** in Grade 2. Skills from Grade 1 that continue into Grade 2 are
listed under Grade 1 above with the note "2 page slots" or "6 page slots".

| skill_id | subtopic | topic | Grade scope | Needs learning page | Recommended page type | Notes |
|----------|----------|-------|-------------|---------------------|-----------------------|-------|
| `math:kind:add_vertical` | `add_vertical` | number_sense_and_operations | g2 only | Yes | `step_by_step_procedure` | Grade 2 only — vertical layout, carrying/regrouping |
| `math:kind:sub_vertical` | `sub_vertical` | number_sense_and_operations | g2 only | Yes | `step_by_step_procedure` | Grade 2 only — vertical subtraction, borrowing |
| `math:kind:div` | `div` | division_and_number_theory | **g2–g6** | Yes (per grade) | g2: `concept_foundation`; g3+: `step_by_step_procedure` | **5 page slots** — introduced as inverse of multiplication in g2 |
| `math:kind:divisibility` | `divisibility` | division_and_number_theory | **g2–g4** | Yes (per grade) | g2–g3: `concept_foundation`; g4: `step_by_step_procedure` | **3 page slots** — divisors expand: 2,5,10 in g2; 3,6,9 added in g4 |
| `math:kind:frac_half` | `frac_half` | fractions | g2 only | Yes | `visual_intuition` | Grade 2 only — half of a whole |
| `math:kind:frac_half_reverse` | `frac_half_reverse` | fractions | g2 only | Yes | `visual_intuition` | Grade 2 only — finding the whole given a half |
| `math:kind:frac_quarter` | `frac_quarter` | fractions | g2 only | Yes | `visual_intuition` | Grade 2 only — quarter of a whole |
| `math:kind:frac_quarter_reverse` | `frac_quarter_reverse` | fractions | g2 only | Yes | `visual_intuition` | Grade 2 only — finding the whole given a quarter |
| `math:kind:ns_place_tens_units` | `ns_place_tens_units` | number_sense_and_operations | g1–g2 | (see Grade 1 table) | `concept_foundation` | Grade 2 page deepens to numbers up to 1,000 |
| `math:kind:wp_division_simple` | `wp_division_simple` | word_problems | g2 only | Yes | `word_problem_strategy` | Grade 2 only — sharing equally word problems |
| `math:kind:wp_groups_g2` | `wp_groups_g2` | word_problems | g2 only | Yes | `word_problem_strategy` | Grade 2 only — equal groups word problems (multiplication context) |

---

## Grade 3 — New Skills Introduced

Operations added in Grade 3: division with remainder, sequences, basic decimals (1 decimal
place), divisibility rules (2, 5, 10), order of operations with parentheses, multi-step
word problems.

| skill_id | subtopic | topic | Grade scope | Needs learning page | Recommended page type | Notes |
|----------|----------|-------|-------------|---------------------|-----------------------|-------|
| `math:kind:add_three` | `add_three` | number_sense_and_operations | **g3–g6** | Yes (per grade) | `step_by_step_procedure` | **4 page slots** — adding three numbers; associativity |
| `math:kind:dec_add` | `dec_add` | decimals | **g3–g6** | Yes (per grade) | g3: `concept_foundation`; g4+: `step_by_step_procedure` | **4 page slots** — decimal addition; alignment emphasized in g3 |
| `math:kind:dec_sub` | `dec_sub` | decimals | **g3–g6** | Yes (per grade) | g3: `concept_foundation`; g4+: `step_by_step_procedure` | **4 page slots** |
| `math:kind:div_with_remainder` | `div_with_remainder` | division_and_number_theory | **g3–g6** | Yes (per grade) | g3–g4: `concept_foundation`; g5+: `practice_bridge` | **4 page slots** — remainder as a concept |
| `math:kind:eq_add` | `eq_add` | number_sense_and_operations | **g3–g6** | Yes (per grade) | g3: `concept_foundation`; g4+: `step_by_step_procedure` | **4 page slots** — solving equations with missing addend |
| `math:kind:eq_sub` | `eq_sub` | number_sense_and_operations | **g3–g6** | Yes (per grade) | g3–g4: `concept_foundation`; g5+: `step_by_step_procedure` | **4 page slots** |
| `math:kind:mul_hundreds` | `mul_hundreds` | multiplication | g3 only | Yes | `step_by_step_procedure` | Grade 3 only — multiplying by hundreds |
| `math:kind:mul_tens` | `mul_tens` | multiplication | g3 only | Yes | `step_by_step_procedure` | Grade 3 only — multiplying by tens |
| `math:kind:ns_complement100` | `ns_complement100` | number_sense_and_operations | **g3–g6** | Yes (per grade) | g3: `visual_intuition`; g4+: `practice_bridge` | **4 page slots** — pairs that sum to 100 |
| `math:kind:ns_place_hundreds` | `ns_place_hundreds` | number_sense_and_operations | **g3–g6** | Yes (per grade) | g3: `concept_foundation`; g4+: `practice_bridge` | **4 page slots** — hundreds place value; expands to millions in g4+ |
| `math:kind:order_add_mul` | `order_add_mul` | number_sense_and_operations | g3 only | Yes | `concept_foundation` | Grade 3 only — order of operations: × before + |
| `math:kind:order_mul_sub` | `order_mul_sub` | number_sense_and_operations | g3 only | Yes | `concept_foundation` | Grade 3 only — order of operations: × before − |
| `math:kind:order_parentheses` | `order_parentheses` | number_sense_and_operations | g3 only | Yes | `step_by_step_procedure` | Grade 3 only — parentheses change the order |
| `math:kind:sequence` | `sequence` | number_sense_and_operations | **g3–g6** | Yes (per grade) | g3–g4: `concept_foundation`; g5+: `word_problem_strategy` | **4 page slots** — arithmetic sequences; rule identification |
| `math:kind:wp_comparison_more` | `wp_comparison_more` | word_problems | **g3–g6** | Yes (per grade) | `word_problem_strategy` | **4 page slots** — "how many more / fewer" |
| `math:kind:wp_leftover` | `wp_leftover` | word_problems | **g3–g6** | Yes (per grade) | `word_problem_strategy` | **4 page slots** — leftover / remainder word problems |
| `math:kind:wp_time_sum` | `wp_time_sum` | word_problems | **g3–g6** | Yes (per grade) | `word_problem_strategy` | **4 page slots** — duration, total time word problems |

---

## Grade 4 — New Skills Introduced

Operations added in Grade 4: multi-digit vertical multiplication, long division, rounding,
divisibility by 3/6/9, prime/composite numbers, powers (exponents), zero/one properties,
equations (formal), factors and multiples, estimation.

| skill_id | subtopic | topic | Grade scope | Needs learning page | Recommended page type | Notes |
|----------|----------|-------|-------------|---------------------|-----------------------|-------|
| `math:kind:div_long` | `div_long` | division_and_number_theory | g4 only | Yes | `step_by_step_procedure` | Grade 4 only — long division algorithm |
| `math:kind:est_add` | `est_add` | number_sense_and_operations | **g4–g5** | Yes (per grade) | `concept_foundation` | **2 page slots** — estimation strategy for addition |
| `math:kind:est_mul` | `est_mul` | number_sense_and_operations | **g4–g5** | Yes (per grade) | `concept_foundation` | **2 page slots** — estimation strategy for multiplication |
| `math:kind:est_quantity` | `est_quantity` | number_sense_and_operations | **g4–g5** | Yes (per grade) | `concept_foundation` | **2 page slots** — estimating a quantity |
| `math:kind:fm_factor` | `fm_factor` | division_and_number_theory | **g4–g6** | Yes (per grade) | g4: `concept_foundation`; g5+: `practice_bridge` | **3 page slots** — finding factors of a number |
| `math:kind:fm_gcd` | `fm_gcd` | division_and_number_theory | **g4–g6** | Yes (per grade) | g4: `step_by_step_procedure`; g5+: `practice_bridge` | **3 page slots** — greatest common divisor |
| `math:kind:fm_multiple` | `fm_multiple` | division_and_number_theory | **g4–g6** | Yes (per grade) | g4: `concept_foundation`; g5+: `practice_bridge` | **3 page slots** — multiples of a number |
| `math:kind:mul_vertical` | `mul_vertical` | multiplication | g4 only | Yes | `step_by_step_procedure` | Grade 4 only — multi-digit vertical multiplication |
| `math:kind:one_mul` | `one_mul` | multiplication | g4 only | Yes | `concept_foundation` | Grade 4 only — multiplication by 1 identity property |
| `math:kind:power_base` | `power_base` | ratio_scale_and_powers | g4 only | Yes | `concept_foundation` | Grade 4 only — base and exponent notation |
| `math:kind:power_calc` | `power_calc` | ratio_scale_and_powers | g4 only | Yes | `step_by_step_procedure` | Grade 4 only — computing powers |
| `math:kind:prime_composite` | `prime_composite` | division_and_number_theory | g4 only | Yes | `concept_foundation` | Grade 4 only — prime vs. composite numbers |
| `math:kind:round` | `round` | decimals | **g4–g6** | Yes (per grade) | g4: `step_by_step_procedure`; g5+: `practice_bridge` | **3 page slots** — rounding to nearest 10/100/1000 |
| `math:kind:zero_add` | `zero_add` | number_sense_and_operations | g4 only | Yes | `concept_foundation` | Grade 4 only — zero as identity in addition |
| `math:kind:zero_mul` | `zero_mul` | multiplication | g4 only | Yes | `concept_foundation` | Grade 4 only — zero property of multiplication |
| `math:kind:zero_sub` | `zero_sub` | number_sense_and_operations | g4 only | Yes | `concept_foundation` | Grade 4 only — subtracting zero, subtracting from itself |

---

## Grade 5 — New Skills Introduced

Operations added in Grade 5: fraction add/subtract, fraction reduce/expand, mixed numbers,
fractions as division, two-digit divisor long division, percentages, multi-step word problems,
unit conversions.

| skill_id | subtopic | topic | Grade scope | Needs learning page | Recommended page type | Notes |
|----------|----------|-------|-------------|---------------------|-----------------------|-------|
| `math:kind:div_two_digit` | `div_two_digit` | division_and_number_theory | g5 only | Yes | `step_by_step_procedure` | Grade 5 only — dividing by a two-digit divisor |
| `math:kind:eq_div` | `eq_div` | number_sense_and_operations | **g5–g6** | Yes (per grade) | `step_by_step_procedure` | **2 page slots** — equations involving division |
| `math:kind:eq_mul` | `eq_mul` | number_sense_and_operations | **g5–g6** | Yes (per grade) | `step_by_step_procedure` | **2 page slots** — equations involving multiplication |
| `math:kind:frac_add_sub` | `frac_add_sub` | fractions | g5 only | Yes | `step_by_step_procedure` | Grade 5 only — adding and subtracting fractions (common denominator) |
| `math:kind:frac_expand` | `frac_expand` | fractions | g5 only | Yes | `step_by_step_procedure` | Grade 5 only — expanding a fraction (multiplying numerator/denominator) |
| `math:kind:frac_reduce` | `frac_reduce` | fractions | g5 only | Yes | `step_by_step_procedure` | Grade 5 only — reducing a fraction to lowest terms |
| `math:kind:frac_to_mixed` | `frac_to_mixed` | fractions | g5 only | Yes | `step_by_step_procedure` | Grade 5 only — improper fraction to mixed number |
| `math:kind:mixed_to_frac` | `mixed_to_frac` | fractions | g5 only | Yes | `step_by_step_procedure` | Grade 5 only — mixed number to improper fraction |
| `math:kind:perc_discount` | `perc_discount` | fractions | **g5–g6** | Yes (per grade) | `word_problem_strategy` | **2 page slots** — discount calculation |
| `math:kind:perc_part_of` | `perc_part_of` | fractions | **g5–g6** | Yes (per grade) | `step_by_step_procedure` | **2 page slots** — percent of a quantity |
| `math:kind:wp_distance_time` | `wp_distance_time` | word_problems | **g5–g6** | Yes (per grade) | `word_problem_strategy` | **2 page slots** — speed, distance, time |
| `math:kind:wp_multi_step` | `wp_multi_step` | word_problems | g5 only | Yes | `word_problem_strategy` | Grade 5 only — multi-step word problems |
| `math:kind:wp_shop_discount` | `wp_shop_discount` | word_problems | **g5–g6** | Yes (per grade) | `word_problem_strategy` | **2 page slots** — sale/discount word problems |
| `math:kind:wp_unit_cm_to_m` | `wp_unit_cm_to_m` | word_problems | **g5–g6** | Yes (per grade) | `word_problem_strategy` | **2 page slots** — unit conversion: cm ↔ m |
| `math:kind:wp_unit_g_to_kg` | `wp_unit_g_to_kg` | word_problems | **g5–g6** | Yes (per grade) | `word_problem_strategy` | **2 page slots** — unit conversion: g ↔ kg |

---

## Grade 6 — New Skills Introduced

Operations added in Grade 6: fraction multiplication, fraction division, fractions as division,
ratio, scale (map), repeating decimals, decimal multiply/divide.

| skill_id | subtopic | topic | Grade scope | Needs learning page | Recommended page type | Notes |
|----------|----------|-------|-------------|---------------------|-----------------------|-------|
| `math:kind:dec_divide` | `dec_divide` | decimals | g6 only | Yes | `step_by_step_procedure` | Grade 6 only — dividing decimal numbers |
| `math:kind:dec_divide_10_100` | `dec_divide_10_100` | decimals | g6 only | Yes | `step_by_step_procedure` | Grade 6 only — dividing a decimal by 10 or 100 |
| `math:kind:dec_multiply` | `dec_multiply` | decimals | g6 only | Yes | `step_by_step_procedure` | Grade 6 only — multiplying decimal numbers |
| `math:kind:dec_multiply_10_100` | `dec_multiply_10_100` | decimals | g6 only | Yes | `step_by_step_procedure` | Grade 6 only — multiplying a decimal by 10 or 100 |
| `math:kind:dec_repeating` | `dec_repeating` | decimals | g6 only | Yes | `concept_foundation` | Grade 6 only — repeating (periodic) decimals |
| `math:kind:frac_as_division` | `frac_as_division` | fractions | g6 only | Yes | `concept_foundation` | Grade 6 only — a fraction as a division operation |
| `math:kind:frac_divide` | `frac_divide` | fractions | g6 only | Yes | `step_by_step_procedure` | Grade 6 only — dividing fractions |
| `math:kind:frac_multiply` | `frac_multiply` | fractions | g6 only | Yes | `step_by_step_procedure` | Grade 6 only — multiplying fractions |
| `math:kind:ratio_find` | `ratio_find` | ratio_scale_and_powers | g6 only | Yes | `step_by_step_procedure` | Grade 6 only — finding an unknown in a ratio |
| `math:kind:ratio_first` | `ratio_first` | ratio_scale_and_powers | g6 only | Yes | `concept_foundation` | Grade 6 only — writing and reading a ratio |
| `math:kind:ratio_second` | `ratio_second` | ratio_scale_and_powers | g6 only | Yes | `step_by_step_procedure` | Grade 6 only — ratio of two given quantities |
| `math:kind:scale_find` | `scale_find` | ratio_scale_and_powers | g6 only | Yes | `step_by_step_procedure` | Grade 6 only — finding a missing measurement using scale |
| `math:kind:scale_map_to_real` | `scale_map_to_real` | ratio_scale_and_powers | g6 only | Yes | `step_by_step_procedure` | Grade 6 only — converting map distance to real distance |
| `math:kind:scale_real_to_map` | `scale_real_to_map` | ratio_scale_and_powers | g6 only | Yes | `step_by_step_procedure` | Grade 6 only — converting real distance to map distance |

---

## Wide-Span Skills — Grade-by-Grade Page Slot Summary

These skills span 3 or more grades and require a dedicated learning page for each grade.

| skill_id | Domain | Grades | Page slots needed |
|----------|--------|--------|-------------------|
| `math:kind:add_two` | number_sense_and_operations | g1–g6 | 6 |
| `math:kind:cmp` | number_sense_and_operations | g1–g6 | 6 |
| `math:kind:mul` | multiplication | g1–g6 | 6 |
| `math:kind:ns_neighbors` | number_sense_and_operations | g1–g6 | 6 |
| `math:kind:sub_two` | number_sense_and_operations | g1–g6 | 6 |
| `math:kind:div` | division_and_number_theory | g2–g6 | 5 |
| `math:kind:add_three` | number_sense_and_operations | g3–g6 | 4 |
| `math:kind:dec_add` | decimals | g3–g6 | 4 |
| `math:kind:dec_sub` | decimals | g3–g6 | 4 |
| `math:kind:div_with_remainder` | division_and_number_theory | g3–g6 | 4 |
| `math:kind:eq_add` | number_sense_and_operations | g3–g6 | 4 |
| `math:kind:eq_sub` | number_sense_and_operations | g3–g6 | 4 |
| `math:kind:ns_complement100` | number_sense_and_operations | g3–g6 | 4 |
| `math:kind:ns_place_hundreds` | number_sense_and_operations | g3–g6 | 4 |
| `math:kind:sequence` | number_sense_and_operations | g3–g6 | 4 |
| `math:kind:wp_comparison_more` | word_problems | g3–g6 | 4 |
| `math:kind:wp_leftover` | word_problems | g3–g6 | 4 |
| `math:kind:wp_time_sum` | word_problems | g3–g6 | 4 |
| `math:kind:ns_complement10` | number_sense_and_operations | g1–g4 | 4 |
| `math:kind:ns_even_odd` | number_sense_and_operations | g1–g4 | 4 |
| `math:kind:divisibility` | division_and_number_theory | g2–g4 | 3 |
| `math:kind:fm_factor` | division_and_number_theory | g4–g6 | 3 |
| `math:kind:fm_gcd` | division_and_number_theory | g4–g6 | 3 |
| `math:kind:fm_multiple` | division_and_number_theory | g4–g6 | 3 |
| `math:kind:round` | decimals | g4–g6 | 3 |

---

## Gaps and Ambiguous Mappings

| Issue | Detail |
|-------|--------|
| No `math-g*-content-map.js` files | Unlike Hebrew (which has `data/hebrew-g1-content-map.js` through `data/hebrew-g6-content-map.js`), Math has no per-grade content-map files with subtopic weights. The spine `skills.json` is the only static catalog. The `SUBTOPIC_DIAGNOSTIC_LAYER_MASTER_PLAN.md` noted this same gap. |
| `sequence` covers g3–g6 broadly | The sequence skill spans 4 grades. The description in the spine does not specify what types of sequences (arithmetic, geometric, mixed) are in scope per grade. Owner clarification recommended before authoring pages for g5–g6. |
| `divisibility` rule expansion | The spine shows `divisibility` as g2–g4, but `math-constants.js` shows that divisors 3, 6, 9 are only added in Grade 4. The Grade 2–3 page should cover 2, 5, 10 only. Grade 4 page should cover 2, 3, 5, 6, 9, 10. This must be explicit in the page content. |
| `mul` in Grade 1 | The spine shows `mul` spanning g1–g6, but `math-constants.js` restricts Grade 1 multiplication to factors up to 5 (products ≤ 20). The Grade 1 learning page must not show the full multiplication table. |
| `cmp` across all grades | Comparison (`cmp`) spans g1–g6. The same operator (< > =) appears at every grade, but number ranges grow dramatically (10 in g1 → 200,000 in g6). Each grade's page must reflect the appropriate range and vocabulary. |
| Estimation skills in g4–g5 only | `est_add`, `est_mul`, `est_quantity` are listed g4–g5 in the spine. They do not continue to g6. This appears intentional (estimation is consolidated into applied skills by g6) but worth confirming. |
| `order_add_mul`, `order_mul_sub`, `order_parentheses` are g3 only | All three order-of-operations subtopics are scoped to Grade 3. If order of operations is implicitly used in higher grades (which it is, in complex expressions), there is no explicit skill ID for it in g4+. Future phases may need to add spine entries if learning pages are warranted. |
| `wp_multi_step` is g5 only | Multi-step word problems appear only under g5. Grade 6 may rely on the same logic through `wp_distance_time` and `wp_shop_discount`. Owner may want to evaluate whether a g6 `wp_multi_step` page is needed. |
