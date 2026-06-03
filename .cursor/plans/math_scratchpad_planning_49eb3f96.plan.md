---
name: Math Scratchpad Planning
overview: Full planning-only audit and design for a "דף טיוטה" math scratchpad workspace for grades 1–6. Five markdown documents created under docs/qa/. No code changes.
todos:
  - id: review-docs
    content: Owner reviews all 5 planning documents in docs/qa/
    status: pending
  - id: answer-open-questions
    content: Owner answers the 8 open questions in MATH_SCRATCHPAD_IMPLEMENTATION_PLAN_DRAFT.md
    status: pending
  - id: approve-phase2
    content: Owner explicitly approves Phase 2 MVP scope before any implementation begins
    status: pending
isProject: false
---

# Math Scratchpad — Planning Complete

## What was done

Five planning documents written to `docs/qa/`:

- [`MATH_SCRATCHPAD_EXISTING_SURFACE_AUDIT.md`](docs/qa/MATH_SCRATCHPAD_EXISTING_SURFACE_AUDIT.md) — maps every file the scratchpad touches or must avoid
- [`MATH_SCRATCHPAD_GRADE_MAPPING_PLAN.md`](docs/qa/MATH_SCRATCHPAD_GRADE_MAPPING_PLAN.md) — full type catalog + grade × operation tables
- [`MATH_SCRATCHPAD_NON_HINTING_RULES.md`](docs/qa/MATH_SCRATCHPAD_NON_HINTING_RULES.md) — universal forbidden behaviors + per-type test matrix
- [`MATH_SCRATCHPAD_INTEGRATION_RISK_AUDIT.md`](docs/qa/MATH_SCRATCHPAD_INTEGRATION_RISK_AUDIT.md) — 14 risks with P0/P1/P2 severity
- [`MATH_SCRATCHPAD_IMPLEMENTATION_PLAN_DRAFT.md`](docs/qa/MATH_SCRATCHPAD_IMPLEMENTATION_PLAN_DRAFT.md) — file structure, registry shape, React API, rollback, phase plan

---

## Key findings from codebase audit

### Generator and grade gating
- Source of truth: `utils/math-constants.js` (`GRADES[g1–g6].operations`)
- Six gating layers: config → generator → level-config → UI → activities → QA policy
- 100+ sub-kinds gated by `MATH_KIND_GRADE_SPAN` in `scripts/curriculum-spine-grade-bindings.mjs`

### Safe attach points
- Normal practice: sibling to `<StudentQuestionDisplay>` in `pages/learning/math-master.js`
- Assigned activity: inside `components/student/StudentActivityQuestionSurface.jsx`
- Step-by-step ("צעד צעד"): inline modal in `math-master.js` — scratchpad must auto-close when it opens

### Timer and rewards
- Timer: `utils/learning-time-credit/` system — scratchpad must never pause it
- Assigned activities already hardcode `timeSpentMs: 5000` (pre-existing quirk, not caused by scratchpad)
- Rewards (coins, missions): triggered only at session finish via API — scratchpad fires zero API calls

### Feature flag pattern
- Existing example: `utils/learning-time-credit/feature-flag.js` (`NEXT_PUBLIC_*` env var)
- Proposed: `NEXT_PUBLIC_MATH_SCRATCHPAD_V1=false` (default off)

---

## Scratchpad type catalog (18 types defined)

Full spec in [`MATH_SCRATCHPAD_GRADE_MAPPING_PLAN.md`](docs/qa/MATH_SCRATCHPAD_GRADE_MAPPING_PLAN.md).

MVP types (owner recommendation):
- Grade 1: `object_counter`, `movable_objects`, `ten_frame`
- Grade 2: `base_ten_blocks`, `manual_number_line`
- Grade 3–4: `blank_place_value_table`, `blank_vertical_addition/subtraction` (only where safe)

---

## Critical non-hinting rules (top 5)

1. Never display computed answer or intermediate result
2. Never auto-carry, auto-borrow, or auto-combine blocks
3. Never validate anything inside the scratchpad
4. Never transfer any value to the answer input
5. Never pause the timer

---

## Top P0 risks

- Timer accidentally paused by scratchpad focus/mount — mitigation: scratchpad is same-page DOM element
- Answer auto-transfer via shared state — mitigation: fully isolated local state
- Step-by-step modal conflict — mitigation: mutual exclusion (`if showSolution → close scratchpad`)
- Hebrew/math rendering broken — mitigation: scratchpad panel is a sibling, never inside `StudentQuestionDisplay`

---

## Phase plan

| Phase | Scope | Gate |
|-------|-------|------|
| 1 (done) | Planning documents | Owner review |
| 2 | MVP: g1–g4 basic tools, feature flag OFF | Owner approval |
| 3 | Fraction/decimal/percent/ratio tools | MVP QA pass |
| 4 | Analytics tracking (optional) | Product review |

---

## Open questions requiring owner decision (8 items)

Full list in [`MATH_SCRATCHPAD_IMPLEMENTATION_PLAN_DRAFT.md`](docs/qa/MATH_SCRATCHPAD_IMPLEMENTATION_PLAN_DRAFT.md#open-questions-for-owner). Most critical:

1. Assigned activities in Phase 2, or normal practice only?
2. Grade 1 multiplication — any scratchpad or none?
3. Step-by-step + scratchpad: auto-close (recommended) or coexist?
4. Mobile UX: bottom sheet or modal?
