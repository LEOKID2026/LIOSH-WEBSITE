# Math Scratchpad — Implementation Plan Draft

**Status:** Planning only. No implementation.  
**Date:** 2026-06-03  
**Owner approval required before any Phase 2 work begins.**

---

## Phase Overview

| Phase | Name | Status |
|-------|------|--------|
| Phase 1 | Planning and audit | Current (this document) |
| Phase 2 | MVP behind feature flag | Pending owner approval |
| Phase 3 | Expanded math tools | Pending MVP QA |
| Phase 4 | Analytics/reporting decision | Pending product review |

---

## Phase 2 — MVP Scope (proposed, pending approval)

### MVP inclusions (owner recommendation)

- Grade 1: `object_counter`, `movable_objects`, `ten_frame`
- Grade 2: `base_ten_blocks`, `manual_number_line`
- Grade 3–4: `blank_place_value_table`, `blank_vertical_addition`, `blank_vertical_subtraction` (only for operations where grade mapping confirms safety)

### MVP exclusions (deferred to Phase 3)

- `blank_multiplication_array`, `blank_division_groups`
- `blank_fraction_strips`, `blank_decimal_place_value_table`
- `blank_percent_grid`, `blank_ratio_table`
- `word_problem_notes` for early grades
- `free_math_notes` below grade 3

### Feature flag for MVP

```
NEXT_PUBLIC_MATH_SCRATCHPAD_V1=false   (default — off until QA approval)
```

Same pattern as `utils/learning-time-credit/feature-flag.js`:

```js
// utils/math-scratchpad/feature-flag.js
export function isMathScratchpadV1Enabled() {
  if (typeof process !== "undefined" && process.env) {
    return process.env.NEXT_PUBLIC_MATH_SCRATCHPAD_V1 === "true";
  }
  return false;
}
```

---

## Recommended File Structure

```
utils/
  math-scratchpad/
    feature-flag.js          — NEXT_PUBLIC_MATH_SCRATCHPAD_V1 check
    scratchpad-registry.js   — grade × operation → type mapping
    scratchpad-constants.js  — type name constants

components/
  math-scratchpad/
    MathScratchpadButton.jsx      — button that opens the scratchpad
    MathScratchpadPanel.jsx       — container (panel or bottom sheet)
    types/
      ObjectCounter.jsx
      MovableObjects.jsx
      TenFrame.jsx
      ManualNumberLine.jsx
      BaseTenBlocks.jsx
      PlaceValueTable.jsx
      BlankVerticalLayout.jsx
      BlankMultiplicationArray.jsx
      BlankDivisionGroups.jsx
      BlankFractionStrips.jsx
      BlankDecimalPlaceValueTable.jsx
      BlankPercentGrid.jsx
      BlankRatioTable.jsx
      WordProblemNotes.jsx
      FreeMathNotes.jsx

docs/
  qa/
    MATH_SCRATCHPAD_EXISTING_SURFACE_AUDIT.md   ✓ (this session)
    MATH_SCRATCHPAD_GRADE_MAPPING_PLAN.md       ✓ (this session)
    MATH_SCRATCHPAD_NON_HINTING_RULES.md        ✓ (this session)
    MATH_SCRATCHPAD_INTEGRATION_RISK_AUDIT.md   ✓ (this session)
    MATH_SCRATCHPAD_IMPLEMENTATION_PLAN_DRAFT.md ✓ (this document)
```

---

## Scratchpad Registry / Config Shape (proposed)

```js
// utils/math-scratchpad/scratchpad-registry.js (proposed — not yet created)

export const SCRATCHPAD_MAP = {
  g1: {
    addition:     ["object_counter", "movable_objects", "ten_frame", "manual_number_line"],
    subtraction:  ["object_counter", "movable_objects", "ten_frame"],
    compare:      ["compare_groups", "object_counter"],
    number_sense: ["object_counter", "ten_frame"],
    word_problems:["movable_objects"],
    multiplication: [],   // no safe tool for g1 multiplication in Phase 1
    mixed:        ["object_counter"],
  },
  g2: {
    addition:     ["base_ten_blocks", "manual_number_line", "ten_frame"],
    subtraction:  ["base_ten_blocks", "manual_number_line"],
    division:     ["blank_division_groups"],
    fractions:    [],     // defer — g2 fractions are conceptual only
    compare:      ["compare_groups"],
    number_sense: ["place_value_blocks", "ten_frame"],
    word_problems:["word_problem_notes", "movable_objects"],
    sequences:    ["manual_number_line"],
    mixed:        ["base_ten_blocks"],
  },
  g3: {
    addition:        ["blank_place_value_table", "base_ten_blocks", "manual_number_line"],
    subtraction:     ["blank_place_value_table", "base_ten_blocks"],
    multiplication:  ["blank_multiplication_array"],
    division:        ["blank_division_groups"],
    division_with_remainder: ["blank_division_groups"],
    sequences:       ["manual_number_line"],
    decimals:        [],  // defer — g3 decimals are early
    divisibility:    ["free_math_notes"],
    order_of_operations: ["free_math_notes"],
    word_problems:   ["word_problem_notes"],
    mixed:           ["free_math_notes"],
  },
  g4: {
    addition:        ["blank_vertical_addition", "blank_place_value_table"],
    subtraction:     ["blank_vertical_subtraction", "blank_place_value_table"],
    multiplication:  ["blank_multiplication_array", "blank_place_value_table"],
    division:        ["blank_division_groups", "free_math_notes"],
    fractions:       ["blank_fraction_strips"],
    rounding:        ["blank_place_value_table", "manual_number_line"],
    estimation:      ["free_math_notes"],
    equations:       ["free_math_notes"],
    factors_multiples: ["free_math_notes"],
    prime_composite: ["free_math_notes"],
    word_problems:   ["word_problem_notes"],
    mixed:           ["free_math_notes"],
  },
  g5: {
    fractions:       ["blank_fraction_strips"],
    decimals:        ["blank_decimal_place_value_table"],
    percentages:     ["blank_percent_grid"],
    addition:        ["blank_vertical_addition"],
    subtraction:     ["blank_vertical_subtraction"],
    estimation:      ["free_math_notes"],
    word_problems:   ["word_problem_notes"],
    mixed:           ["free_math_notes"],
  },
  g6: {
    ratio:           ["blank_ratio_table"],
    scale:           ["blank_ratio_table", "free_math_notes"],
    fractions:       ["blank_fraction_strips"],
    decimals:        ["blank_decimal_place_value_table"],
    percentages:     ["blank_percent_grid"],
    order_of_operations: ["free_math_notes"],
    word_problems:   ["word_problem_notes"],
    equations:       ["free_math_notes"],
    mixed:           ["free_math_notes"],
  },
};

/**
 * Returns the primary scratchpad type for a given grade and operation.
 * Returns null if no safe type exists (button must be hidden).
 */
export function getScratchpadType(gradeKey, operation) {
  const gradeMap = SCRATCHPAD_MAP[gradeKey];
  if (!gradeMap) return null;
  const types = gradeMap[operation];
  if (!types || types.length === 0) return null;
  return types[0]; // primary type; future: let child switch
}
```

---

## Proposed React Component Structure

### `MathScratchpadButton`

```
Props:
  gradeKey: string     — e.g. "g1"
  operation: string    — e.g. "addition"
  questionKey: string  — unique key for current question (to reset state on change)

Behavior:
  - Calls getScratchpadType(gradeKey, operation)
  - If null: renders nothing (no button)
  - If type found: renders "דף טיוטה" button
  - On click: opens MathScratchpadPanel
  - Does NOT interact with answer state, timer, or any API
```

### `MathScratchpadPanel`

```
Props:
  type: string         — scratchpad type name
  questionText: string — displayed as reference (read-only copy of question)
  onClose: () => void

Behavior:
  - Shows question text in read-only sticky header
  - Renders the appropriate scratchpad type component
  - Preserves internal state until questionKey changes
  - On close: calls onClose, returns to question
  - Never calls any API
  - Never modifies parent answer state
  - stopPropagation on all keyboard events
```

### Safe integration point in `math-master.js`

The button is added **alongside** `<StudentQuestionDisplay>`, as a sibling — never inside it:

```jsx
{/* Existing: */}
<StudentQuestionDisplay ... />

{/* New (gated by feature flag and grade/operation mapping): */}
{isMathScratchpadV1Enabled() && (
  <MathScratchpadButton
    gradeKey={grade}
    operation={operation}
    questionKey={currentQuestion?.id}
  />
)}
```

The step-by-step modal guard:
```jsx
// When showSolution becomes true, close any open scratchpad
useEffect(() => {
  if (showSolution) setScratchpadOpen(false);
}, [showSolution]);
```

---

## Integration Rules for Implementation

1. **No shared state** — scratchpad state lives only in `MathScratchpadPanel` local state
2. **No API calls** — zero network requests from any scratchpad component
3. **No timer modification** — do not touch `questionStartTime`, ledger, or `useLearningVisibilityClock`
4. **No answer state touch** — do not access or modify `selectedAnswer`, `userInput`, or `handleAnswer`
5. **stopPropagation** — all keyboard events (Enter, Escape) inside scratchpad must not bubble
6. **Clear on question change** — scratchpad resets when `questionKey` prop changes
7. **Sibling DOM placement** — scratchpad panel is always a sibling of `StudentQuestionDisplay`, never inside it
8. **Feature flag default OFF** — `NEXT_PUBLIC_MATH_SCRATCHPAD_V1=false` in all environments until QA

---

## QA Checklist (Pre-Launch for Phase 2)

### Automated tests to add

- [ ] Unit test: `getScratchpadType("g1", "addition")` returns `"object_counter"`
- [ ] Unit test: `getScratchpadType("g1", "decimals")` returns `null`
- [ ] Unit test: `getScratchpadType("g1", "addition")` never returns any vertical type
- [ ] Unit test: `getScratchpadType("g4", "addition")` returns `"blank_vertical_addition"`
- [ ] Unit test: `getScratchpadType("g6", "ratio")` returns `"blank_ratio_table"`
- [ ] Unit test: For every g1 operation, verify no vertical type returned
- [ ] Unit test: For operations not in `GRADES[gN].operations`, verify `null` returned

### Manual QA checklist

- [ ] Grade 1 addition: scratchpad opens with `object_counter`; closing does not affect answer input
- [ ] Grade 1 subtraction: cross out objects; "נשאר" never appears
- [ ] Grade 2 addition: base_ten_blocks shown; combining blocks does not compute sum
- [ ] Grade 4 large addition: vertical layout shown; carrying a digit does not auto-populate
- [ ] Timer: open scratchpad for 30s, submit answer — `timeSpentMs` includes scratchpad time
- [ ] Step-by-step: open scratchpad, click explanation — scratchpad closes, explanation appears normally
- [ ] Assigned activity: verify scratchpad button appears (if Phase 2 includes activities) — submit answer is unchanged
- [ ] Parent report: run practice session with scratchpad open — report unchanged
- [ ] Mobile 375px: question readable when scratchpad open
- [ ] RTL: number line runs left-to-right; vertical layout columns in correct order
- [ ] Hebrew practice page: no scratchpad button appears
- [ ] No API calls from scratchpad: verify in Network tab

---

## Manual QA Regression Checklist (Existing Surfaces)

These must be verified unchanged after any Phase 2 implementation:

- [ ] Normal math practice: answer submission works as before
- [ ] Assigned class activity: answer submission, score, report unchanged
- [ ] Parent-assigned activity: unchanged
- [ ] Teacher-individual activity: unchanged
- [ ] Step-by-step explanation modal: animations play, steps correct
- [ ] Mixed Hebrew/math rendering: all question types render identically
- [ ] Parent report page: no new labels, no changed values
- [ ] Teacher class report: unchanged
- [ ] Activity export: unchanged
- [ ] Daily missions: unchanged
- [ ] Coins: unchanged
- [ ] Daily streak: unchanged
- [ ] Diagnostic engine: no changed inputs

---

## Rollback Plan

If any regression is found after Phase 2 deployment:

1. Set `NEXT_PUBLIC_MATH_SCRATCHPAD_V1=false` in environment
2. Rebuild and redeploy — scratchpad button disappears from all surfaces
3. No database migrations to revert (Phase 1/2 writes nothing to DB)
4. No data cleanup required

Rollback time: < 10 minutes (env var change + rebuild)

---

## Phase-by-Phase Rollout

### Phase 1 (current) — Planning only

- All five planning documents created
- No code changes
- Owner reviews and approves or adjusts

### Phase 2 — MVP behind feature flag

**Gate:** Owner explicit approval of this plan.

Scope:
- `utils/math-scratchpad/feature-flag.js`
- `utils/math-scratchpad/scratchpad-registry.js`
- `components/math-scratchpad/MathScratchpadButton.jsx`
- `components/math-scratchpad/MathScratchpadPanel.jsx`
- Grade 1 types: `ObjectCounter`, `MovableObjects`, `TenFrame`
- Grade 2 types: `BaseTenBlocks`, `ManualNumberLine`
- Grade 3–4 types: `BlankPlaceValueTable`, `BlankVerticalLayout`
- Integration into `math-master.js` (sibling placement, feature flag gate)
- Full QA checklist above
- Feature flag OFF by default

### Phase 3 — Expanded tools

**Gate:** Phase 2 QA passed, owner review.

Adds:
- `BlankMultiplicationArray`, `BlankDivisionGroups`
- `BlankFractionStrips`, `BlankDecimalPlaceValueTable`
- `BlankPercentGrid`, `BlankRatioTable`
- Integration into assigned activity surface (if approved)

### Phase 4 — Analytics decision

**Gate:** Explicit product review and owner approval.

Possible additions (not automatic):
- `scratchpadOpened: boolean` in `answers.clientMeta`
- `scratchpadType: string` in `answers.clientMeta`
- `timeWithScratchpadOpenMs: number` in `answers.clientMeta`

What must never be tracked without explicit approval:
- Detailed content of scratchpad (what child wrote/drew)
- Step-by-step scratchpad navigation
- Object positions

---

## Open Questions for Owner

1. **Assigned activities in Phase 2?** Should the scratchpad button appear in assigned activity play page (`pages/student/activity/[activityId].js`) in the MVP, or only in normal practice (`math-master.js`) first?

2. **Grade 1 multiplication?** The grade 1 curriculum includes multiplication ≤20 (conceptual). Should any scratchpad appear for g1 multiplication (e.g. `movable_objects` in groups), or no button?

3. **Grade 2 fractions?** Grade 2 includes early/conceptual fractions (halves, quarters). Should a simple shaded-shape tool be offered, or no scratchpad for g2 fractions in Phase 1?

4. **Scratchpad and step-by-step:** When the explanation modal opens, should the scratchpad automatically close (recommended), or should both be visible simultaneously?

5. **Mobile UX:** Should the scratchpad open as a bottom sheet on mobile, or as a full modal? The bottom sheet keeps the question visible; the modal is simpler to implement.

6. **Multiple types per question:** Should the child be able to switch between allowed scratchpad types for the same question (e.g. switch from `object_counter` to `ten_frame`), or see only one type?

7. **`free_math_notes` as grade 3+ fallback?** Should `free_math_notes` be shown for any unsupported operation in grades 3–6, or only for explicitly mapped operations?

8. **Worksheets:** Out of scope for Phase 1 and 2. Confirm this is correct.
