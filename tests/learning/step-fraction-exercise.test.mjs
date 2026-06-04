import assert from "node:assert/strict";
import test from "node:test";
import {
  highlightFractionLine,
  parseFractionPreLines,
} from "../../utils/learning-step-fraction-exercise.js";

test("parseFractionPreLines strips bidi markers", () => {
  const lines = parseFractionPreLines("\u20661/4 + 2/4\u2069");
  assert.equal(lines[0], "1/4 + 2/4");
});

test("highlightFractionLine marks fraction1", () => {
  const segments = highlightFractionLine("1/4 + 2/4", ["fraction1"]);
  const highlighted = segments.filter((s) => s.highlighted).map((s) => s.text);
  assert.ok(highlighted.some((t) => t === "1/4"));
});
