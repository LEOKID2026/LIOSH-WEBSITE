# Math Scratchpad — Grade Mapping Plan

**Status:** Planning only. No implementation.  
**Date:** 2026-06-03

---

## Purpose

Define which scratchpad workspace types are available per grade, per operation, and per question kind.
The rule is strict: **only show a scratchpad tool when it is age-appropriate AND topic-appropriate.**
When no safe type exists, do not show the button at all.

---

## Scratchpad Type Catalog

### Type definitions

Each type below documents: what it shows, who can use it, what the child can do, what it must never do.

---

#### `object_counter`

- **Shows:** A configurable number of neutral movable objects (e.g. dots, squares — no fruit/emoji that implies counting)
- **Grades:** 1, 2
- **Operations:** addition (small), subtraction (small), compare, number_sense
- **Child can:** move objects, group them, mark/cross out objects
- **Must never:** count visible total, show computed result, auto-remove crossed objects from count
- **Risk level:** Low
- **Implementation complexity:** Low (drag-drop grid)

---

#### `movable_objects`

- **Shows:** Groups of neutral movable objects matching the numbers in the question (count only, not computed)
- **Grades:** 1, 2
- **Operations:** addition, subtraction, compare, word_problems (small numbers)
- **Child can:** drag objects between groups, arrange, mark
- **Must never:** auto-combine groups, show total, show "נשאר"
- **Risk level:** Low
- **Implementation complexity:** Low–Medium

---

#### `compare_groups`

- **Shows:** Two empty areas labeled "קבוצה א" / "קבוצה ב" with blank object slots
- **Grades:** 1, 2
- **Operations:** compare, number_sense
- **Child can:** place objects to compare quantities visually
- **Must never:** auto-highlight larger group, show difference
- **Risk level:** Low
- **Implementation complexity:** Low

---

#### `ten_frame`

- **Shows:** One or two blank 10-frame grids (2×5)
- **Grades:** 1, 2
- **Operations:** addition (≤20), subtraction (≤20), number_sense
- **Child can:** tap to fill cells, move filled cells
- **Must never:** auto-fill to 10, show total, highlight "missing to 10"
- **Risk level:** Low
- **Implementation complexity:** Low

---

#### `manual_number_line`

- **Shows:** A blank horizontal number line with unlabeled tick marks; child writes labels
- **Grades:** 1 (basic 0–20), 2 (0–100), 3 (extended)
- **Operations:** addition, subtraction, sequences, compare
- **Child can:** write numbers on ticks, draw jumps (arrow markup), mark positions
- **Must never:** auto-place jumps, show computed landing position, label jump size automatically
- **Risk level:** Low
- **Implementation complexity:** Medium (canvas or SVG with freehand annotation)

---

#### `base_ten_blocks`

- **Shows:** Visual representations of hundreds/tens/ones blocks (empty until child adds)
- **Grades:** 2, 3, 4
- **Operations:** addition (≤100, ≤1000), subtraction, place value (number_sense)
- **Child can:** drag in blocks, arrange, group visually
- **Must never:** combine/trade blocks automatically (e.g. 10 ones → 1 ten), show computed total
- **Risk level:** Medium (temptation to add auto-trade)
- **Implementation complexity:** Medium

---

#### `place_value_blocks`

- **Shows:** Column labels (אחדות, עשרות, מאות) with empty cell rows
- **Grades:** 2, 3, 4
- **Operations:** addition, subtraction, place value (number_sense), rounding (g4)
- **Child can:** write digits into cells manually
- **Must never:** carry digits automatically, validate cell contents, show sum
- **Risk level:** Medium
- **Implementation complexity:** Low (input grid)

---

#### `blank_place_value_table`

- **Shows:** A blank table with column headers (ones, tens, hundreds, thousands as appropriate for grade)
- **Grades:** 3, 4, 5
- **Operations:** addition, subtraction, multiplication, decimals, rounding
- **Child can:** write any digit in any cell manually
- **Must never:** auto-fill carry, auto-align decimal, validate
- **Risk level:** Low
- **Implementation complexity:** Low

---

#### `blank_vertical_addition`

- **Shows:** An empty vertical addition layout with operand rows and a result row separated by a line
- **Grades:** 4 (minimum — only when curriculum clearly teaches vertical addition)
- **Operations:** addition (large numbers)
- **Child can:** write digits in any cell
- **Must never:** auto-carry, auto-fill result row, validate column sums, highlight incorrect column
- **Risk level:** High (risk of appearing to "help" by providing structured layout)
- **Implementation complexity:** Low (pre-drawn grid)
- **Gate:** Only shown when `params.kind` confirms large-number vertical context

---

#### `blank_vertical_subtraction`

- **Shows:** Empty vertical subtraction layout
- **Grades:** 4 (minimum)
- **Operations:** subtraction (large numbers)
- **Child can:** write digits manually
- **Must never:** auto-borrow, auto-fill, validate
- **Risk level:** High
- **Implementation complexity:** Low
- **Gate:** Same as above

---

#### `blank_multiplication_array`

- **Shows:** A blank configurable grid (rows × columns) that child can fill in
- **Grades:** 3, 4
- **Operations:** multiplication
- **Child can:** set row/column count, fill cells, draw circles around groups
- **Must never:** count total filled cells, show product
- **Risk level:** Medium
- **Implementation complexity:** Medium

---

#### `blank_division_groups`

- **Shows:** A set of empty circles/containers for groups
- **Grades:** 3, 4
- **Operations:** division, division_with_remainder
- **Child can:** decide number of groups, drag objects into groups
- **Must never:** count objects per group, show quotient or remainder
- **Risk level:** Medium
- **Implementation complexity:** Medium

---

#### `blank_fraction_strips`

- **Shows:** One or more blank horizontal bars that child can divide manually
- **Grades:** 4, 5
- **Operations:** fractions
- **Child can:** tap to add dividers, shade sections
- **Must never:** auto-convert to common denominator, show decimal equivalent, validate fraction equality
- **Risk level:** Medium
- **Implementation complexity:** Medium

---

#### `blank_decimal_place_value_table`

- **Shows:** Place value table with decimal point marker (units, tenths, hundredths)
- **Grades:** 5, 6
- **Operations:** decimals
- **Child can:** write digits manually in each column
- **Must never:** auto-align decimal point, compute sum, validate
- **Risk level:** Low
- **Implementation complexity:** Low

---

#### `blank_percent_grid`

- **Shows:** A 10×10 blank grid (100 cells)
- **Grades:** 5, 6
- **Operations:** percentages
- **Child can:** shade cells to represent a percentage
- **Must never:** count shaded cells, show percentage value
- **Risk level:** Low
- **Implementation complexity:** Low

---

#### `blank_ratio_table`

- **Shows:** An empty 2-column table with labeled headers (e.g. "ילדים | ילדות")
- **Grades:** 6
- **Operations:** ratio, scale
- **Child can:** write values in any cell manually
- **Must never:** auto-scale values, compute missing cell, suggest multiplier
- **Risk level:** High (ratio tables are tempting to auto-complete)
- **Implementation complexity:** Low

---

#### `word_problem_notes`

- **Shows:** A blank lined area with optional "נתונים / לחשב" section labels
- **Grades:** 2, 3, 4, 5, 6
- **Operations:** word_problems
- **Child can:** write any text/numbers freely
- **Must never:** parse or analyze notes, extract numbers, validate
- **Risk level:** Low
- **Implementation complexity:** Low (textarea)

---

#### `free_math_notes`

- **Shows:** A blank grid or dot-paper workspace
- **Grades:** 3, 4, 5, 6
- **Operations:** any (fallback for complex questions)
- **Child can:** write freely, draw, calculate manually on paper-like surface
- **Must never:** interpret content, validate, suggest
- **Risk level:** Low
- **Implementation complexity:** Low (canvas or grid textarea)

---

## Grade-by-Grade Mapping

### Grade 1 — כיתה א׳

Vertical calculation: **never**.  
Fraction strips, decimal tables, ratio tables: **never**.

| Operation | Allowed scratchpad type(s) |
|-----------|---------------------------|
| addition (small, ≤20) | `object_counter`, `movable_objects`, `ten_frame`, `manual_number_line` (0–20) |
| subtraction (small, ≤20) | `object_counter`, `movable_objects`, `ten_frame` |
| compare | `compare_groups`, `object_counter` |
| number_sense | `object_counter`, `ten_frame` |
| word_problems | `movable_objects` (small numbers only) |
| multiplication | None (g1 multiplication ≤20 is conceptual — no safe tool yet) |
| mixed | Fallback to addition/subtraction tool only |

**Examples:**
- `3 + 2` → show `object_counter` with neutral dots. Child may move, mark, count. System shows nothing computed.
- `7 - 3` → show `movable_objects` with 7 dots. Child crosses out 3. System never shows "4" or "נשאר 4".
- `5 > 3` → show `compare_groups` with 5 slots and 3 slots.

---

### Grade 2 — כיתה ב׳

Vertical calculation: **avoid** unless curriculum evidence shows it is taught.  
Formal fractions: limited (fractions operation allowed in g2 but early/conceptual).

| Operation | Allowed scratchpad type(s) |
|-----------|---------------------------|
| addition (≤100) | `base_ten_blocks`, `manual_number_line` (0–100), `ten_frame` (≤20) |
| subtraction (≤100) | `base_ten_blocks`, `manual_number_line` |
| fractions | None for Phase 1 (g2 fractions are conceptual halves/quarters — no safe tool yet) |
| division | `blank_division_groups` (simple equal sharing) |
| compare | `compare_groups`, `object_counter` |
| number_sense | `place_value_blocks`, `ten_frame` |
| word_problems | `word_problem_notes`, `movable_objects` |
| sequences | `manual_number_line` |

**Examples:**
- `24 + 13` → show `base_ten_blocks`. Child arranges blocks for each number. System never auto-combines or shows "37".
- Jump by 10 from 34 → show `manual_number_line`. Child draws jumps. System never auto-labels landing.

---

### Grade 3 — כיתה ג׳

Transition grade. Introduce structured tools but avoid forcing formal vertical algorithms unless topic-appropriate.

| Operation | Allowed scratchpad type(s) |
|-----------|---------------------------|
| addition (≤1000) | `blank_place_value_table`, `base_ten_blocks`, `manual_number_line` |
| subtraction (≤1000) | `blank_place_value_table`, `base_ten_blocks` |
| multiplication | `blank_multiplication_array` |
| division | `blank_division_groups` |
| division_with_remainder | `blank_division_groups` |
| sequences | `manual_number_line` |
| decimals | None for Phase 1 (g3 decimals are early — no safe tool yet) |
| divisibility | `free_math_notes` |
| order_of_operations | `free_math_notes` |
| word_problems | `word_problem_notes` |

**Examples:**
- `4 × 3` → show `blank_multiplication_array`. Child builds rows. System never counts total.
- `12 ÷ 3` → show `blank_division_groups` with 3 containers. Child distributes. System never shows quotient.

---

### Grade 4 — כיתה ד׳

Vertical calculation becomes appropriate for relevant operations.

| Operation | Allowed scratchpad type(s) |
|-----------|---------------------------|
| addition (large) | `blank_vertical_addition`, `blank_place_value_table` |
| subtraction (large) | `blank_vertical_subtraction`, `blank_place_value_table` |
| multiplication | `blank_multiplication_array`, `blank_place_value_table` |
| division | `blank_division_groups`, `free_math_notes` |
| fractions | `blank_fraction_strips` |
| rounding | `blank_place_value_table`, `manual_number_line` |
| estimation | `free_math_notes` |
| equations | `free_math_notes` |
| factors_multiples | `free_math_notes` |
| prime_composite | `free_math_notes` |
| word_problems | `word_problem_notes` |

**Vertical layout constraint:**
The system provides the empty structure only:

```
  456
+ 278
-----
```

The child fills all digits. Auto-carry, auto-fill, column validation: **never**.

---

### Grade 5 — כיתה ה׳

| Operation | Allowed scratchpad type(s) |
|-----------|---------------------------|
| fractions | `blank_fraction_strips` |
| decimals | `blank_decimal_place_value_table` |
| percentages | `blank_percent_grid` |
| addition (large) | `blank_vertical_addition` |
| subtraction (large) | `blank_vertical_subtraction` |
| estimation | `free_math_notes` |
| word_problems | `word_problem_notes` |
| mixed | `free_math_notes` |

**Constraint for decimals:** The table provides column labels (units, tenths, hundredths). The child writes digits. The system never aligns decimal or computes.

**Constraint for fractions:** The strips are blank. The child adds dividers. The system never converts to common denominator or shows decimal equivalent.

---

### Grade 6 — כיתה ו׳

| Operation | Allowed scratchpad type(s) |
|-----------|---------------------------|
| ratio | `blank_ratio_table` |
| scale | `blank_ratio_table`, `free_math_notes` |
| fractions | `blank_fraction_strips` |
| decimals | `blank_decimal_place_value_table` |
| percentages | `blank_percent_grid` |
| order_of_operations | `free_math_notes` |
| word_problems | `word_problem_notes` |
| equations | `free_math_notes` |
| mixed | `free_math_notes` |

**Ratio table constraint:**
Allowed — blank structure with headers only:
```
ילדים | ילדות
      |
      |
```
Never — auto-scale rows, fill missing cell, suggest multiplier.

---

## Mapping Function (Conceptual)

```
grade + operation + [optional: params.kind sub-category] → allowed scratchpad type(s)
```

Lookup order:
1. Check `GRADES[gradeKey].operations` — if operation not allowed for grade, no scratchpad at all.
2. Look up `SCRATCHPAD_MAP[gradeKey][operation]` — returns list of allowed types.
3. If list is empty or undefined → no button shown.
4. If multiple types → show the first/primary type by default; optionally allow child to switch.

**Fallback rule:** If no safe scratchpad type exists for this grade + operation combination, the button is hidden. Do not show `free_math_notes` as a universal fallback for early grades — it is only appropriate from grade 3+.

---

## MVP Scope (Phase 2, pending owner approval)

Priority order recommended by owner:

1. **Grade 1:** `object_counter`, `movable_objects`, `ten_frame`
2. **Grade 2:** `base_ten_blocks`, `manual_number_line`
3. **Grade 3–4:** `blank_place_value_table`, `blank_vertical_addition/subtraction` (only where safe)

Defer to Phase 3:
- `blank_multiplication_array`, `blank_division_groups`
- `blank_fraction_strips`, `blank_decimal_place_value_table`
- `blank_percent_grid`, `blank_ratio_table`

---

## Open Questions for Owner

1. For grade 2 fractions (halves/quarters): is any scratchpad tool safe, or defer entirely?
2. For grade 1 multiplication (≤20, conceptual): should `movable_objects` be offered or no scratchpad?
3. Should `free_math_notes` be available from grade 3 for all unsupported operations, or only explicit ones?
4. Should the child be able to switch between multiple scratchpad types for the same question?
