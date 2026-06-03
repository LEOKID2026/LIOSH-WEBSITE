# Math Scratchpad — Non-Hinting Rules and Test Matrix

**Status:** Planning only. No implementation.  
**Date:** 2026-06-03

---

## Core Rule

The scratchpad is a **workspace**, not a tutor.

The child uses it the same way they might use paper, fingers, counters, blocks, or a number line.

The system:
- provides a blank or object-populated surface
- allows the child to interact with that surface
- never interprets, validates, or responds to what the child does on it

---

## Universal Forbidden Behaviors (all types, all grades)

These are absolute prohibitions. No scratchpad type may ever do any of the following.

| # | Forbidden behavior | Why |
|---|-------------------|-----|
| 1 | Display computed answer | Solves the question for the child |
| 2 | Display intermediate computed result | Guides the child toward the answer |
| 3 | Validate intermediate input (correct/incorrect feedback) | Hints at the correct next step |
| 4 | Auto-fill any digit in any cell | Removes the child's work |
| 5 | Auto-carry (vertical addition) | Solves the carrying step |
| 6 | Auto-borrow (vertical subtraction) | Solves the borrowing step |
| 7 | Auto-combine blocks (10 ones → 1 ten) | Solves regrouping |
| 8 | Suggest the next operation or step | Tutoring behavior |
| 9 | Highlight the correct next action | Hints |
| 10 | Show "נשאר" (remaining) after marking objects | Reveals the answer |
| 11 | Show "סה״כ" or total count dynamically | Computes answer |
| 12 | Auto-scale ratio rows | Solves the ratio |
| 13 | Fill missing cell in any table | Solves the problem |
| 14 | Suggest multiplier or common factor | Hints at method |
| 15 | Convert fractions to common denominator automatically | Solves a step |
| 16 | Show decimal equivalent of fraction automatically | Computes |
| 17 | Transfer scratchpad answer to final answer input | Submits for the child |
| 18 | Copy any value from scratchpad to answer box | Even if "helpful" |
| 19 | Change question score based on scratchpad steps | Rewrites scoring logic |
| 20 | Pause or stop the question timer | Gives fake time advantage |

---

## Allowed Behaviors (all types)

| Allowed | Notes |
|---------|-------|
| Show neutral objects matching a number in the question | Number of objects = number in question (e.g. `7 - 3` → show 7 objects), never computed total |
| Allow dragging, moving, marking objects | Child-driven only |
| Allow crossing out objects | Marking only; does not reduce visible count or show remainder |
| Allow writing digits in empty cells | Input only; no validation |
| Allow dividing strips/grids manually | Child adds dividers; no auto-spacing |
| Allow shading grid cells | Child-driven; no count shown |
| Show blank structural layout (vertical, table, strips) | Structure only; no pre-filled values |
| Show column/row labels in Hebrew | Grade-appropriate labels only |
| Preserve scratchpad state during the current question | Until the question changes or session ends |
| Allow free text/drawing in notes area | Totally free; never parsed |

---

## Type-by-Type Non-Hinting Checklist

### `object_counter` / `movable_objects`

- [ ] Objects shown = number(s) in question? (e.g. for `7 - 3`, show 7 objects — never 4)
- [ ] No running count displayed anywhere?
- [ ] Crossing out an object does not reduce a visible counter?
- [ ] Moving objects between groups does not update a group total?
- [ ] No label "נשאר", "סה״כ", "תוצאה"?

### `ten_frame`

- [ ] Frame starts empty (or pre-populated only with question's first operand, never both)?
- [ ] Filling cells does not show a running total?
- [ ] No highlighting of "missing to 10" or "complete the ten"?
- [ ] No auto-fill of second operand?

### `manual_number_line`

- [ ] Tick marks are unlabeled initially?
- [ ] Child writes all labels manually?
- [ ] No auto-placement of start/end position based on operands?
- [ ] Drawing a jump does not label the jump size or landing position automatically?
- [ ] No animation that "reveals" the answer position?

### `base_ten_blocks`

- [ ] Blocks are inert — dragging does not trigger automatic trading?
- [ ] No counter showing total value of all blocks?
- [ ] Adding a block to a column does not recompute a sum?
- [ ] No "10 ones = 1 ten" animation triggered automatically?

### `place_value_blocks` / `blank_place_value_table`

- [ ] All cells start empty?
- [ ] Writing in one cell does not auto-populate adjacent cells?
- [ ] No carry arrow or carry digit shown automatically?
- [ ] No column sum computed or displayed?

### `blank_vertical_addition` / `blank_vertical_subtraction`

- [ ] All result cells start blank?
- [ ] Writing in a cell does not trigger validation (green/red)?
- [ ] No carry digit auto-placed above a column?
- [ ] No borrow marker auto-placed?
- [ ] No "start with ones" suggestion or highlighting?
- [ ] Structure (lines, row labels) shown, but no guidance arrows?

### `blank_multiplication_array`

- [ ] Grid is blank; child sets row/column count manually?
- [ ] Filling cells does not show running cell count?
- [ ] Total product never displayed?
- [ ] No row-sum or column-sum sidebar?

### `blank_division_groups`

- [ ] Group containers are empty; child decides count?
- [ ] Distributing objects does not show per-group count?
- [ ] Quotient and remainder never displayed?

### `blank_fraction_strips`

- [ ] Strip starts undivided?
- [ ] Child adds dividers manually?
- [ ] No auto-spacing of sections to equal sizes?
- [ ] No label on sections (e.g. no "1/3" auto-shown)?
- [ ] No conversion to common denominator?
- [ ] No decimal equivalent shown?

### `blank_decimal_place_value_table`

- [ ] Decimal point marker shown but all digit cells empty?
- [ ] No auto-alignment of decimal when digits are typed?
- [ ] No sum computed?

### `blank_percent_grid`

- [ ] All 100 cells start unshaded?
- [ ] Shading cells does not show running count or percentage?

### `blank_ratio_table`

- [ ] All value cells start empty?
- [ ] Writing first row does not auto-populate second row?
- [ ] No suggested multiplier shown?
- [ ] No computed missing value?

### `word_problem_notes` / `free_math_notes`

- [ ] Content is never parsed or analyzed?
- [ ] No numbers extracted from notes?
- [ ] No suggestion based on what child writes?

---

## Grade-Level Gate Checks

| Check | Requirement |
|-------|-------------|
| Grade 1 vertical calculation | Must never appear. Button hidden for all addition/subtraction in g1. |
| Grade 2 vertical calculation | Must not appear unless explicit curriculum evidence. Defer to owner decision. |
| Grade 1–2 ratio/percent/decimal tools | Must never appear. |
| Grade 1–2 fraction strips | Must not appear unless fractions are explicitly supported and safe. |
| Unsupported operation for grade | Button hidden entirely. No fallback scratchpad shown. |
| Operation not in `GRADES[gN].operations` | Button must not appear, regardless of question content. |

---

## Answer Transfer Gate

This is the most critical safety check.

| Check | Requirement |
|-------|-------------|
| Scratchpad has no "submit" button | There is only one submit path: the normal answer input |
| Clicking "submit" in scratchpad | Impossible — there is no such button |
| Closing scratchpad copies any value | Forbidden — close returns to blank answer state |
| Scratchpad value appears in answer input | Never, under any circumstance |
| Any API call made from scratchpad interaction | None — scratchpad is purely client-side local state |

---

## Timer Gate

| Check | Requirement |
|-------|-------------|
| Opening scratchpad pauses timer | Forbidden — timer continues normally |
| Closing scratchpad restarts timer | Not applicable — timer is never paused |
| `timeSpentMs` sent to server excludes scratchpad time | Forbidden — all time counts as question time |
| Scratchpad open state changes answer timing logic | Forbidden |

---

## Scoring and Report Gate

| Check | Requirement |
|-------|-------------|
| Correct answer after using scratchpad = same score as without | Yes — scratchpad use is invisible to scoring |
| Wrong answer after using scratchpad = same score as without | Yes |
| Report shows scratchpad usage by default | No — not in Phase 1 |
| Diagnostic engine receives scratchpad data | No — not in Phase 1 |
| Coins/missions affected by scratchpad usage | No |

---

## Regression Checks: "צעד צעד" (Step-by-Step)

The existing step-by-step explanation modal must not be broken.

| Check | Requirement |
|-------|-------------|
| Scratchpad and step-by-step can be open simultaneously | Define explicit behavior — recommendation: close scratchpad when explanation opens |
| Scratchpad z-index conflicts with step-by-step modal | Must not overlap — test all breakpoints |
| Mixed Hebrew/math rendering in explanation not affected | `MixedHebrewMathText` and `StudentQuestionDisplay` are untouched |
| Explanation modal animations still play correctly | `animationSteps` state in `math-master.js` unaffected |
| "הסבר מלא" button still appears and works | Not hidden or displaced by scratchpad button |

---

## Mobile and RTL Checks

| Check | Requirement |
|-------|-------------|
| Scratchpad button visible on mobile (small screen) | Must not be hidden or clipped |
| Scratchpad panel usable on mobile | Must not require hover; must support touch drag |
| RTL layout preserved in question display | `StudentQuestionDisplay` RTL unchanged |
| Scratchpad opens below or beside question (not over it) | Question text must remain visible when scratchpad is open |
| Hebrew column labels in scratchpad render correctly | RTL labels in correct direction |
