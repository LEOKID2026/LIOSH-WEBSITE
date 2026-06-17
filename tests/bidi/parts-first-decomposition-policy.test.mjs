import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalizePlaceValueDecomposition,
  isForbiddenTotalFirstDecomposition,
  isPlaceValueDecompositionEquation,
} from "../../lib/learning-book/place-value-equation-order.js";
import {
  assertNotForbiddenLearningMath,
  FORBIDDEN_LEARNING_MATH_STRINGS,
} from "../../lib/learning-book/learning-math-line-templates.js";
import { splitMixedHebrewMathRuns } from "../../lib/bidi/mixed-hebrew-math-runs.js";

/** Owner policy: learning example decomposition rows are parts-first. */
const PARTS_FIRST_CASES = [
  { input: "58 = 50 + 8", expected: "50 + 8 = 58" },
  { input: "37 = 30 + 7", expected: "30 + 7 = 37" },
  { input: "68 = 60 + 8", expected: "60 + 8 = 68" },
  { input: "24 = 20 + 4", expected: "20 + 4 = 24" },
  { input: "124 = 100 + 20 + 4", expected: "100 + 20 + 4 = 124" },
  { input: "405 = 400 + 0 + 5", expected: "400 + 0 + 5 = 405" },
  { input: "3,125 = 3,000 + 100 + 20 + 5", expected: "3,000 + 100 + 20 + 5 = 3,125" },
  { input: "73,205 = 70,000 + 3,000 + 200 + 5", expected: "70,000 + 3,000 + 200 + 5 = 73,205" },
];

const TOTAL_FIRST_FORBIDDEN = [
  "58 = 50 + 8",
  "37 = 30 + 7",
  "68 = 60 + 8",
  "24 = 20 + 4",
  "124 = 100 + 20 + 4",
  "405 = 400 + 0 + 5",
];

test("policy: decomposition equations in learning examples must be parts-first", () => {
  for (const { input, expected } of PARTS_FIRST_CASES) {
    assert.equal(
      canonicalizePlaceValueDecomposition(input),
      expected,
      `canonicalize ${input}`
    );
    assert.equal(isPlaceValueDecompositionEquation(input), true);
    assert.equal(isForbiddenTotalFirstDecomposition(expected), false);
    assert.equal(isForbiddenTotalFirstDecomposition(input), true);
  }
});

test("policy: math runs never emit total-first decomposition", () => {
  for (const { input, expected } of PARTS_FIRST_CASES) {
    const runs = splitMixedHebrewMathRuns(input);
    const math = runs.filter((r) => r.type === "math").map((r) => r.value).join("");
    assert.equal(math, expected, `math run for ${input}`);
    assert.equal(isForbiddenTotalFirstDecomposition(math), false);
  }
});

test("policy: forbidden total-first decomposition strings are blocked", () => {
  for (const bad of TOTAL_FIRST_FORBIDDEN) {
    assert.throws(
      () => assertNotForbiddenLearningMath(bad),
      /forbidden learning math string/,
      `expected forbidden: ${bad}`
    );
    assert.ok(
      FORBIDDEN_LEARNING_MATH_STRINGS.includes(bad),
      `FORBIDDEN_LEARNING_MATH_STRINGS must include ${bad}`
    );
  }
});
