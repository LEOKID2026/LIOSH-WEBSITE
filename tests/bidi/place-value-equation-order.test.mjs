import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalizePlaceValueDecomposition,
  canonicalizePlaceValueDecompositionBody,
  isPlaceValueDecompositionEquation,
  parseCanonicalPlaceValueEquation,
  assertPlaceValueDisplayOrder,
} from "../../lib/learning-book/place-value-equation-order.js";
import { splitMixedHebrewMathRuns } from "../../lib/bidi/mixed-hebrew-math-runs.js";
import { classifyBookLine } from "../../lib/learning-book/book-line-classifier.js";
import { flattenMixedHebrewMathVisibleText } from "../../lib/learning-book/book-visible-text-render.js";

const CASES = [
  {
    input: "124 = 100 + 20 + 4",
    expected: "100 + 20 + 4 = 124",
  },
  {
    input: "- 124 = 100 + 20 + 4",
    expected: "- 100 + 20 + 4 = 124",
  },
  {
    input: "405 = 400 + 0 + 5",
    expected: "400 + 0 + 5 = 405",
  },
  {
    input: "7,056 = 7,000 + 0 + 50 + 6",
    expected: "7,000 + 0 + 50 + 6 = 7,056",
  },
  {
    input: "100 + 20 + 4 = 124",
    expected: "100 + 20 + 4 = 124",
  },
  {
    input: "58 = 50 + 8",
    expected: "50 + 8 = 58",
  },
  {
    input: "68 = 60 + 8",
    expected: "60 + 8 = 68",
  },
];

for (const { input, expected } of CASES) {
  test(`canonicalize place value: ${input}`, () => {
    assert.equal(canonicalizePlaceValueDecomposition(input), expected);
    assert.equal(isPlaceValueDecompositionEquation(input.replace(/^[-•*]\s+/, "")), true);
  });
}

test("forbidden reversed display string in math run", () => {
  const cases = [
    { raw: "124 = 100 + 20 + 4", forbidden: /^124\s*=\s*100/, expected: /100 \+ 20 \+ 4 = 124/ },
    { raw: "- 124 = 100 + 20 + 4", forbidden: /^124\s*=\s*100/, expected: /100 \+ 20 \+ 4 = 124/ },
    { raw: "58 = 50 + 8", forbidden: /^58\s*=\s*50/, expected: /50 \+ 8 = 58/ },
    { raw: "68 = 60 + 8", forbidden: /^68\s*=\s*60/, expected: /60 \+ 8 = 68/ },
  ];
  for (const { raw, forbidden, expected } of cases) {
    const runs = splitMixedHebrewMathRuns(raw);
    const math = runs.filter((r) => r.type === "math").map((r) => r.value).join("");
    assert.doesNotMatch(math, forbidden);
    assert.match(math, expected);
  }
});

test("general equations stay unchanged", () => {
  const samples = [
    ["58 + 37 = 95", "58 + 37 = 95"],
    ["30 + 20 = 50", "30 + 20 = 50"],
    ["π ≈ 3.14", "π ≈ 3.14"],
  ];
  for (const [input, expected] of samples) {
    const math = splitMixedHebrewMathRuns(input).find((r) => r.type === "math")?.value;
    assert.equal(math, expected);
  }
  const carry = splitMixedHebrewMathRuns("8 + 7 = 15 → 5, נשיאה 1");
  assert.equal(carry[0].value, "8 + 7 = 15 → 5");
});

test("classifier routes g2 place value bullet line", () => {
  assert.equal(
    classifyBookLine("- 124 = 100 + 20 + 4"),
    "place_value_equation"
  );
  const parsed = parseCanonicalPlaceValueEquation("- 124 = 100 + 20 + 4");
  assert.deepEqual(parsed, {
    terms: ["100", "20", "4"],
    total: "124",
  });
});

test("visible flatten preserves canonical order", () => {
  const flat = flattenMixedHebrewMathVisibleText("- 124 = 100 + 20 + 4");
  assertPlaceValueDisplayOrder(flat, "100 + 20 + 4 = 124");
});

test("owner expected strings exact order", () => {
  const expected = [
    "100 + 20 + 4 = 124",
    "400 + 0 + 5 = 405",
    "30 + 20 = 50",
    "50 + 9 = 59",
    "π ≈ 3.14",
  ];
  for (const line of expected) {
    const runs = splitMixedHebrewMathRuns(line);
    const math = runs.find((r) => r.type === "math")?.value;
    assert.equal(math, line);
  }
});
