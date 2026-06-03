# Math Scratchpad — Integration Risk Audit

**Status:** Planning only. No implementation.  
**Date:** 2026-06-03

---

## Purpose

Identify every integration risk before implementation is approved.
Each risk is classified by severity (P0/P1/P2) and likelihood.

---

## Risk Inventory

### R-01 — Timer is accidentally paused

**Severity:** P0  
**Likelihood:** Medium  
**Description:** If the scratchpad panel mounts/unmounts or receives focus in a way that triggers the `useLearningVisibilityClock` hook's tab-hidden logic, question time could be under-credited.  
**Affected files:** `utils/learning-time-credit/question-time-ledger.js`, `hooks/useLearningVisibilityClock.js`  
**Mitigation:** The scratchpad must not change the page's `visibilityState`. It is a DOM element on the same page — no new tab, no modal with focus-trap that intercepts the visibility API. Verify with a timer display during manual QA.  
**Required test:** Open scratchpad, spend 30s there, submit answer. Verify `timeSpentMs` in `answers` table includes scratchpad time.

---

### R-02 — Answer auto-transfer via shared state

**Severity:** P0  
**Likelihood:** Low (if implemented correctly) — High risk if implemented carelessly  
**Description:** If the scratchpad holds any state in the same React context or store as the answer input, a bug could cause a scratchpad value to populate the answer field.  
**Mitigation:** Scratchpad state must be fully isolated — local React state inside the scratchpad component only. No shared context with `handleAnswer`, `selectedAnswer`, or `userInput` state in `math-master.js`.  
**Required test:** For every scratchpad type, type a number in the scratchpad, then check the answer input field. It must be empty/unchanged.

---

### R-03 — Step-by-step modal ("צעד צעד") layout broken

**Severity:** P0  
**Likelihood:** Medium  
**Description:** The step-by-step explanation is an inline modal in `math-master.js`. If the scratchpad is also open as a panel or overlay, the two may conflict in z-index, layout, or state.  
**Affected file:** `pages/learning/math-master.js` (~line 4727 for explanation modal)  
**Mitigation:** Define explicit rule: scratchpad closes automatically when explanation modal opens. OR: scratchpad and explanation are mutually exclusive. Implement with a guard on `showSolution` state.  
**Required test:** Open scratchpad → click "הסבר מלא" → verify explanation appears correctly with no layout artifacts. Verify scratchpad state is preserved or cleanly reset.

---

### R-04 — Mixed Hebrew/math rendering broken

**Severity:** P0  
**Likelihood:** Low (if scratchpad is a separate panel) — Medium (if it injects into question display)  
**Description:** `MixedHebrewMathText.js` (470 lines) and `StudentQuestionDisplay.jsx` handle the RTL/LTR complexity of Hebrew + math rendering. Any DOM injection near these components could break BiDi rendering.  
**Mitigation:** The scratchpad panel must be a sibling element to `StudentQuestionDisplay`, not a child or wrapper. No CSS changes to the question display area.  
**Required test:** After adding scratchpad button, verify all existing math question types render identically (visual regression).

---

### R-05 — Answer submission called twice or from scratchpad

**Severity:** P0  
**Likelihood:** Low  
**Description:** If the scratchpad has any button that could be confused with a submit button, or if keyboard events (Enter) bubble from scratchpad to answer input.  
**Mitigation:** Scratchpad has no submit button. All keyboard events inside the scratchpad must be stopped from bubbling to the question input layer (`e.stopPropagation()`).  
**Required test:** Press Enter inside scratchpad workspace. Verify answer is not submitted.

---

### R-06 — Assigned activity `timeSpentMs: 5000` hardcode

**Severity:** P1  
**Likelihood:** Certain (pre-existing quirk)  
**Description:** The assigned activity page (`pages/student/activity/[activityId].js`) already hardcodes `timeSpentMs: 5000` for all answers regardless of actual time. The scratchpad does not worsen this, but it must not be blamed for it.  
**Mitigation:** Document this as a pre-existing issue. Phase 1 scratchpad does not change activity timing. Add comment to future implementation PR.  
**Required test:** Confirm activity timing behavior is identical before and after adding scratchpad UI.

---

### R-07 — Grade gating failure: wrong scratchpad for grade

**Severity:** P1  
**Likelihood:** Medium (if mapping is not enforced at runtime)  
**Description:** A grade 1 student should never see a vertical addition layout. A grade 5 student should never see a simple object counter. If the mapping lookup fails or falls through, the wrong tool appears.  
**Mitigation:** The mapping function must be pure and deterministic. An empty/unknown result must always return `null` (no button shown). Add explicit tests for every grade × operation boundary case.  
**Required test:** Grade 1 + addition → `object_counter` (never `blank_vertical_addition`). Grade 4 + large addition → `blank_vertical_addition`. Grade 6 + ratio → `blank_ratio_table`. Grade 1 + decimals → no button.

---

### R-08 — Scratchpad shown for non-math subjects

**Severity:** P1  
**Likelihood:** Low (if gated on subject)  
**Description:** The scratchpad button must only appear on math questions. Hebrew, English, science, geometry questions must not show it.  
**Mitigation:** Gate by subject identifier. Math-only. Geometry has its own visual tools already (diagram).  
**Required test:** Navigate to Hebrew practice, geometry, English. Verify no scratchpad button appears.

---

### R-09 — Coin/mission inflation via fast scratchpad close

**Severity:** P1  
**Likelihood:** Low  
**Description:** If a student opens and closes the scratchpad repeatedly in quick succession, and if any event triggers a mission or coin check, rewards could be inflated.  
**Mitigation:** The scratchpad fires zero API calls. No events propagate to mission or coin logic. Scratchpad is purely local state.  
**Required test:** Open/close scratchpad 20 times in one session. Verify coin count and mission progress are unchanged.

---

### R-10 — Parent/teacher report shows unexpected data

**Severity:** P1  
**Likelihood:** Low (if no new writes)  
**Description:** If any scratchpad interaction accidentally writes to `answers`, `learning_sessions`, or activity tables, reports could show distorted data.  
**Mitigation:** Phase 1 scratchpad writes nothing to the database. No API calls from scratchpad.  
**Required test:** Complete a practice session with scratchpad open. Check `answers` and `learning_sessions` tables for unexpected rows or changed values.

---

### R-11 — Mobile layout: scratchpad covers question text

**Severity:** P1  
**Likelihood:** High on small screens  
**Description:** On mobile (especially phone screens), a scratchpad panel that opens below or beside the question could push the question text off-screen.  
**Mitigation:** Design the scratchpad as a collapsible bottom sheet on mobile, or as a modal that shows the question text in a sticky header.  
**Required test:** Open scratchpad on 375px-wide viewport. Verify question is still readable. Verify answer input is still accessible.

---

### R-12 — RTL scratchpad layout mirrors unexpectedly

**Severity:** P2  
**Likelihood:** Medium  
**Description:** Hebrew UI is RTL. Some scratchpad tools (number lines, vertical layouts) are inherently LTR math tools. CSS `direction: rtl` applied at page level could mirror them incorrectly.  
**Mitigation:** Scratchpad internal canvas/grid must explicitly set `direction: ltr` for mathematical content (number lines, vertical calculations). Hebrew labels stay RTL.  
**Required test:** Verify vertical layout columns appear in correct order (hundreds | tens | ones, left to right). Verify number line runs left to right.

---

### R-13 — Scratchpad state persists across questions

**Severity:** P2  
**Likelihood:** Medium (if state not cleared on question change)  
**Description:** If the scratchpad is not cleared when the question changes, the child might see stale objects or digits from the previous question — which could be misleading.  
**Mitigation:** Clear scratchpad state on every new question (when question key changes). This is the safe default for Phase 1.  
**Required test:** Answer a question. Observe new question loads. Verify scratchpad is blank.

---

### R-14 — Feature flag not respected after hot reload

**Severity:** P2  
**Likelihood:** Low  
**Description:** `NEXT_PUBLIC_MATH_SCRATCHPAD_V1` is a build-time env var in Next.js. If the flag is changed without rebuilding, the old value may persist.  
**Mitigation:** Document that flag changes require a rebuild. Add a runtime fallback check.

---

## Risk Summary Table

| Risk | Severity | Likelihood | Mitigation complexity |
|------|----------|------------|----------------------|
| R-01 Timer pause | P0 | Medium | Low |
| R-02 Answer auto-transfer | P0 | Low/High | Low (isolation) |
| R-03 Step-by-step conflict | P0 | Medium | Low (mutual exclusion) |
| R-04 Hebrew/math rendering | P0 | Low/Medium | Low (sibling DOM) |
| R-05 Double submit | P0 | Low | Low (stopPropagation) |
| R-06 Activity timer hardcode | P1 | Certain | None (pre-existing) |
| R-07 Grade gating failure | P1 | Medium | Medium (test matrix) |
| R-08 Non-math subjects | P1 | Low | Low (subject gate) |
| R-09 Coin inflation | P1 | Low | Low (no API calls) |
| R-10 Report pollution | P1 | Low | Low (no DB writes) |
| R-11 Mobile layout | P1 | High | Medium (responsive design) |
| R-12 RTL direction | P2 | Medium | Low (explicit ltr) |
| R-13 Stale state | P2 | Medium | Low (clear on question change) |
| R-14 Feature flag | P2 | Low | Low (documentation) |

---

## Timing and Reports Impact (Phase 1 Guarantee)

Phase 1 must guarantee all of the following:

- Scratchpad open = zero change to `timeSpentMs` logic
- Scratchpad close = zero change to `timeSpentMs` logic
- Scratchpad interaction = zero API calls
- Scratchpad interaction = zero database writes
- `answers` table = identical before and after adding scratchpad UI
- `learning_sessions` table = identical
- `classroom_activity_attempts` = identical
- `parent_activity_attempts` = identical
- Coin award logic = identical
- Mission progress logic = identical
- Parent report = identical
- Teacher report = identical
- Diagnostic engine input = identical

This guarantee must be verified by:
1. Manual QA session comparison (with/without scratchpad open)
2. Database audit of `answers` and `learning_sessions` rows for unexpected changes

---

## Surfaces That Must Be Protected (Regression Checklist Entry Points)

| Surface | Risk | Test approach |
|---------|------|---------------|
| Normal math practice (math-master) | R-01, R-02, R-03, R-04, R-05 | Manual QA + unit test |
| Assigned activities (teacher class) | R-06, R-07, R-08 | Manual QA |
| Parent-assigned activities | R-06, R-08 | Manual QA |
| Teacher-individual activities | R-06, R-08 | Manual QA |
| Step-by-step explanation modal | R-03 | Manual QA |
| Hebrew practice (no scratchpad) | R-08 | Manual QA |
| Parent report page | R-10 | DB audit + visual check |
| Teacher report / class report | R-10 | DB audit + visual check |
| Mobile layout (375px) | R-11 | Browser DevTools |
| RTL layout | R-12 | Visual QA |
| Grade 1 (no vertical) | R-07 | Automated unit test |
