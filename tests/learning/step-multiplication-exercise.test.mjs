import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMultiplicationHighlightState,
  buildMultiplicationLayout,
  enrichMultiplicationStepMetadata,
  parseMultiplicationPre,
} from "../../utils/learning-step-multiplication-exercise.js";

test("enrichMultiplicationStepMetadata sets column highlights for row mul step", () => {
  const step = enrichMultiplicationStepMetadata({
    id: "row-1-mul-2",
    highlights: ["aAll", "bAll"],
  });
  assert.deepEqual(step.highlights, ["aCol2", "bCol1"]);
  assert.equal(step.activeColumn, 2);
});

test("buildMultiplicationHighlightState highlights active multiplier column", () => {
  const pre = "  23\n×  45\n------\n 115\n  92\n------\n1035";
  const parsed = parseMultiplicationPre(pre);
  const layout = buildMultiplicationLayout(parsed);
  const step = enrichMultiplicationStepMetadata({ id: "row-0-start", highlights: [] });
  const hl = buildMultiplicationHighlightState(step, layout);
  assert.ok(Array.isArray(hl.top));
  assert.ok(Array.isArray(hl.bottom));
});
