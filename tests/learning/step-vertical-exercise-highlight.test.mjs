import assert from "node:assert/strict";
import test from "node:test";
import { buildAdditionOrSubtractionAnimation } from "../../utils/math-animations.js";
import {
  alignCarryToColumns,
  buildStepCellHighlightState,
  buildVerticalExerciseDigitLayout,
  getCarryHighlightColumns,
  parseCarryRowFromPre,
  resolveActiveColumnFromHighlights,
  resolveStepExerciseHighlight,
  shouldHighlightRowCell,
  supportsPlaceValueStepExerciseView,
} from "../../utils/learning-step-vertical-exercise.js";

test("supports place-value view for vertical add/sub only", () => {
  assert.equal(supportsPlaceValueStepExerciseView("addition", "addition", "+"), true);
  assert.equal(supportsPlaceValueStepExerciseView("subtraction", "subtraction", "−"), true);
  assert.equal(supportsPlaceValueStepExerciseView("multiplication", "multiplication", "×"), false);
  assert.equal(supportsPlaceValueStepExerciseView("addition", "decimals", "+"), true);
});

test("addition animation steps expose column highlights from metadata", () => {
  const steps = buildAdditionOrSubtractionAnimation(47, 38, 85, "addition");
  const unitsStep = steps.find((s) => s.title === "ספרת האחדות");
  assert.ok(unitsStep);
  assert.deepEqual(unitsStep.highlights, ["aCol0", "bCol0", "resultCol0"]);
  assert.equal(resolveActiveColumnFromHighlights(unitsStep.highlights), 0);
  assert.equal(shouldHighlightRowCell(unitsStep.highlights, "a", 0, 0), true);
  assert.equal(shouldHighlightRowCell(unitsStep.highlights, "a", 1, 0), false);
});

test("54+26 units step highlights only active column operands and outgoing carry", () => {
  const steps = buildAdditionOrSubtractionAnimation(54, 26, 80, "addition");
  const unitsStep = steps.find((s) => s.title === "ספרת האחדות");
  const layout = buildVerticalExerciseDigitLayout({
    topValue: 54,
    bottomValue: 26,
    answerValue: 80,
  });
  const meta = resolveStepExerciseHighlight(unitsStep, layout, unitsStep.pre);

  assert.equal(meta.activeColumn, 0);
  assert.deepEqual([...meta.carryHighlightColumns], [1]);

  layout.topDigits.forEach((digit, idx) => {
    const columnFromRight = layout.maxLen - idx - 1;
    const highlighted = shouldHighlightRowCell(
      unitsStep.highlights,
      "a",
      columnFromRight,
      meta.activeColumn
    );
    if (digit === "4") assert.equal(highlighted, true);
    if (digit === "5") assert.equal(highlighted, false);
  });

  layout.bottomDigits.forEach((digit, idx) => {
    const columnFromRight = layout.maxLen - idx - 1;
    const highlighted = shouldHighlightRowCell(
      unitsStep.highlights,
      "b",
      columnFromRight,
      meta.activeColumn
    );
    if (digit === "6") assert.equal(highlighted, true);
    if (digit === "2") assert.equal(highlighted, false);
  });

  assert.equal(
    shouldHighlightRowCell(unitsStep.highlights, "result", 0, meta.activeColumn),
    true
  );
  assert.equal(
    shouldHighlightRowCell(unitsStep.highlights, "result", 1, meta.activeColumn),
    false
  );
});

test("54+26 tens step highlights operands, incoming carry, and result", () => {
  const steps = buildAdditionOrSubtractionAnimation(54, 26, 80, "addition");
  const tensStep = steps.find((s) => s.title === "ספרת העשרות");
  const layout = buildVerticalExerciseDigitLayout({
    topValue: 54,
    bottomValue: 26,
    answerValue: 80,
  });
  const state = buildStepCellHighlightState(tensStep, layout, tensStep.pre);

  assert.equal(state.activeColumn, 1);
  assert.deepEqual([...state.carryHighlightColumns], [1]);
  assert.deepEqual(state.operandA, [true, false]);
  assert.deepEqual(state.operandB, [true, false]);
  assert.deepEqual(state.result, [true, false]);
  assert.deepEqual(state.carry, [true, false]);
});

test("68+56 align step highlights only real operand digits", () => {
  const steps = buildAdditionOrSubtractionAnimation(68, 56, 124, "addition");
  const alignStep = steps.find((s) => s.id === "place-value");
  const layout = buildVerticalExerciseDigitLayout({
    topValue: 68,
    bottomValue: 56,
    answerValue: 124,
  });
  const state = buildStepCellHighlightState(alignStep, layout, alignStep.pre);

  assert.deepEqual(state.operandA, [false, true, true]);
  assert.deepEqual(state.operandB, [false, true, true]);
  assert.deepEqual(state.result, [false, false, false]);
});

test("68+56 units step highlights 8, 6, 4 and carry above tens only", () => {
  const steps = buildAdditionOrSubtractionAnimation(68, 56, 124, "addition");
  const unitsStep = steps.find((s) => s.title === "ספרת האחדות");
  const layout = buildVerticalExerciseDigitLayout({
    topValue: 68,
    bottomValue: 56,
    answerValue: 124,
  });
  const state = buildStepCellHighlightState(unitsStep, layout, unitsStep.pre);

  assert.deepEqual(state.operandA, [false, false, true]);
  assert.deepEqual(state.operandB, [false, false, true]);
  assert.deepEqual(state.result, [false, false, true]);
  assert.deepEqual(state.carry, [false, true, false]);
});

test("highlight state resets between units and tens steps with no sticky cells", () => {
  const steps = buildAdditionOrSubtractionAnimation(54, 26, 80, "addition");
  const layout = buildVerticalExerciseDigitLayout({
    topValue: 54,
    bottomValue: 26,
    answerValue: 80,
  });
  const unitsStep = steps.find((s) => s.title === "ספרת האחדות");
  const tensStep = steps.find((s) => s.title === "ספרת העשרות");
  const units = buildStepCellHighlightState(unitsStep, layout, unitsStep.pre);
  const tens = buildStepCellHighlightState(tensStep, layout, tensStep.pre);

  assert.deepEqual(units.operandA, [false, true]);
  assert.deepEqual(units.operandB, [false, true]);
  assert.deepEqual(units.result, [false, true]);
  assert.deepEqual(tens.operandA, [true, false]);
  assert.deepEqual(tens.operandB, [true, false]);
  assert.deepEqual(tens.result, [true, false]);

  for (let idx = 0; idx < layout.maxLen; idx++) {
    assert.equal(
      units.operandA[idx] && tens.operandA[idx],
      false,
      `operand A cell ${idx} must not stay highlighted across steps`
    );
    assert.equal(
      units.operandB[idx] && tens.operandB[idx],
      false,
      `operand B cell ${idx} must not stay highlighted across steps`
    );
    assert.equal(
      units.result[idx] && tens.result[idx],
      false,
      `result cell ${idx} must not stay highlighted across steps`
    );
  }
});

test("6234+8164 hundreds and next column use different highlight columns", () => {
  const steps = buildAdditionOrSubtractionAnimation(6234, 8164, 14398, "addition");
  const layout = buildVerticalExerciseDigitLayout({
    topValue: 6234,
    bottomValue: 8164,
    answerValue: 14398,
  });
  const hundredsStep = steps[3];
  const nextColumnStep = steps[4];
  const hundreds = buildStepCellHighlightState(hundredsStep, layout, hundredsStep.pre);
  const nextColumn = buildStepCellHighlightState(nextColumnStep, layout, nextColumnStep.pre);

  assert.equal(hundreds.activeColumn, 2);
  assert.equal(nextColumn.activeColumn, 3);
  assert.deepEqual(hundreds.operandA, [false, false, true, false, false]);
  assert.deepEqual(nextColumn.operandA, [false, true, false, false, false]);

  for (let idx = 0; idx < layout.maxLen; idx++) {
    assert.equal(
      hundreds.operandA[idx] && nextColumn.operandA[idx],
      false,
      `step 4 and 5 must not share operand A highlight at ${idx}`
    );
  }
});

test("parses carry row from vertical snapshot pre", () => {
  const steps = buildAdditionOrSubtractionAnimation(99, 1, 100, "addition");
  const tensStep = steps.find((s) => s.title === "ספרת העשרות");
  assert.ok(tensStep?.pre);
  const carryLine = parseCarryRowFromPre(tensStep.pre);
  assert.ok(carryLine);
  const aligned = alignCarryToColumns(carryLine, 3);
  assert.equal(aligned.filter((d) => d === "1").length >= 1, true);
});

test("carry highlight columns distinguish incoming and outgoing carry", () => {
  const carryDigits = ["1", " "];
  const incoming = getCarryHighlightColumns(1, {}, carryDigits, 2);
  assert.deepEqual([...incoming], [1]);
  const outgoing = getCarryHighlightColumns(0, { carry: true }, carryDigits, 2);
  assert.deepEqual([...outgoing], [1]);
});

test("resolveStepExerciseHighlight bundles layout metadata", () => {
  const steps = buildAdditionOrSubtractionAnimation(27, 15, 42, "addition");
  const tensStep = steps.find((s) => s.title === "ספרת העשרות");
  const layout = { maxLen: 2 };
  const meta = resolveStepExerciseHighlight(tensStep, layout, tensStep.pre);
  assert.equal(meta.activeColumn, 1);
  assert.equal(meta.activeColumnLabel, "עשרות");
  assert.equal(shouldHighlightRowCell(meta.highlights, "result", 1, meta.activeColumn), true);
});
