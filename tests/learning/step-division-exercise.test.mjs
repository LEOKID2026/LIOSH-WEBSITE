import assert from "node:assert/strict";
import test from "node:test";
import {
  computeDivisionSteps,
  enrichDivisionStepMetadata,
  resolveDivisionHighlightKeys,
} from "../../utils/learning-step-division-exercise.js";

test("computeDivisionSteps matches long division algorithm", () => {
  const steps = computeDivisionSteps(94, 3);
  assert.equal(steps.length, 2);
  assert.equal(steps[0].qDig, 3);
  assert.equal(steps[1].qDig, 1);
});

test("enrichDivisionStepMetadata sets longDivision view", () => {
  const step = enrichDivisionStepMetadata({ type: "division", id: "place-value" });
  assert.equal(step.exerciseView, "longDivision");
});

test("resolveDivisionHighlightKeys maps legacy keys", () => {
  const keys = resolveDivisionHighlightKeys(["bAll", "result0", "product0"], 2);
  assert.ok(keys.divisorAll);
  assert.ok(keys.quotientCols.has(0));
});
