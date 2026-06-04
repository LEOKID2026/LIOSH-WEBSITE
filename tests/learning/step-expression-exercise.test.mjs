import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExpressionHighlightRanges,
  enrichExpressionStepMetadata,
} from "../../utils/learning-step-expression-exercise.js";

test("buildExpressionHighlightRanges finds numbers in text", () => {
  const ranges = buildExpressionHighlightRanges("3 < 7", ["leftNumber", "rightNumber"]);
  assert.ok(ranges.length >= 2);
});

test("enrichExpressionStepMetadata adds expressionLines", () => {
  const step = enrichExpressionStepMetadata({
    text: "3 < 7",
    highlights: ["leftNumber", "rightNumber"],
  });
  assert.ok(step.expressionLines?.length >= 2);
});
