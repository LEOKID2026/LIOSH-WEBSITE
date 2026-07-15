import assert from "node:assert/strict";
import test from "node:test";
import { splitMixedHebrewMathRuns } from "../../lib/bidi/mixed-hebrew-math-runs.js";
import {
  simulateBookLineBidiRuns,
  detectBookLineBidiBreakage,
} from "../../lib/learning-book/simulate-book-bidi-runs.js";
import { assertNotForbiddenLearningMath } from "../../lib/learning-book/learning-math-line-templates.js";

/**
 * Broad golden coverage for the math-learning content model, using the owner's
 * exact Expected + Forbidden lists. Every line is pushed through the real render
 * pipeline (splitMixedHebrewMathRuns / simulate-book-bidi-runs) and asserted to:
 *   - separate prose (RTL) from math (LTR),
 *   - keep equations/operators in their authored order (no flips, no gluing),
 *   - never emit a forbidden glued/reversed combination.
 */

function mathRun(runs) {
  return runs.find((r) => r.type === "math")?.value;
}
function proseJoined(runs) {
  return runs.filter((r) => r.type === "prose").map((r) => r.value).join(" ");
}

// --- Owner "Expected" list -------------------------------------------------

/** Pure-math lines: the whole line is a single LTR math island, unchanged. */
const PURE_MATH = [
  "20 + 10 = 30",
  "7 + 3 = 10",
  "10 + 3 = 13",
  "7 + 6 = 13",
  "34 + 25 = 59",
  "30 + 20 = 50",
  "4 + 5 = 9",
  "50 + 9 = 59",
  "52 - 27 = 25",
  "6 + 6 + 6 + 6 = 24",
  "4 × 6 = 24",
  "12 < 18",
  "18 > 12",
  "15 = 15",
  "100 + 20 + 4 = 124",
  "400 + 0 + 5 = 405",
  "π ≈ 3.14",
  "A = πr²",
  "12 ס״מ",
  "24 סמ״ר",
  "3/4",
];

/** Decomposition written result-first: must canonicalize to addends-first. */
const CANONICAL_FLIP = [
  { input: "124 = 100 + 20 + 4", math: "100 + 20 + 4 = 124" },
  { input: "405 = 400 + 0 + 5", math: "400 + 0 + 5 = 405" },
  { input: "58 = 50 + 8", math: "50 + 8 = 58" },
  { input: "68 = 60 + 8", math: "60 + 8 = 68" },
];

/** Hebrew prose + math: math isolated LTR, the Hebrew kept as RTL prose. */
const MIXED = [
  { input: "20 = 2 מקלי עשרת", math: "20 = 2", prose: "מקלי עשרת" },
  { input: "10 = מקל עשרת אחד", math: "10 =", prose: "מקל עשרת אחד" },
  { input: "10% מתוך 490", math: "10%", prose: "מתוך 490" },
];

/** Prose-dominant lines: must render with isolated numbers, never glued. */
const PROSE_LINES = [
  "איזה מספר נמצא 3 צעדים ימינה מ-2?",
  "2 מקלי עשרת ועוד מקל עשרת אחד = 3 מקלי עשרת",
];

// --- Owner "Forbidden" list ------------------------------------------------

/** Glued / reversed combinations that must never appear in any rendered run. */
const FORBIDDEN_SUBSTRINGS = [
  "5030 + 20",
  "3020 + 10",
  "4060 - 20",
  "5950 + 9",
  "4440 + 4",
  "2552 - 27",
  "246 + 6 + 6",
  "137 + 6",
  "24זוגי",
  "10 + 133",
  "? = 20 + 10",
  "124 = 100 + 20 + 4",
  "405 = 400 + 0 + 5",
  "58 = 50 + 8",
  "37 = 30 + 7",
  "68 = 60 + 8",
  "24 = 20 + 4",
  "80 + 5 + 1 = 95",
];

const ALL_EXPECTED = [
  ...PURE_MATH,
  ...CANONICAL_FLIP.map((c) => c.input),
  ...MIXED.map((m) => m.input),
  ...PROSE_LINES,
];

// --- Tests -----------------------------------------------------------------

for (const line of PURE_MATH) {
  test(`pure math is one LTR island, unchanged: ${line}`, () => {
    const runs = splitMixedHebrewMathRuns(line);
    assert.equal(mathRun(runs), line);
    assert.equal(detectBookLineBidiBreakage(line), null);
  });
}

for (const { input, math } of CANONICAL_FLIP) {
  test(`decomposition canonicalizes to addends-first: ${input}`, () => {
    const runs = splitMixedHebrewMathRuns(input);
    assert.equal(mathRun(runs), math);
    assert.equal(detectBookLineBidiBreakage(input), null);
  });
}

for (const { input, math, prose } of MIXED) {
  test(`prose/math separated: ${input}`, () => {
    const runs = splitMixedHebrewMathRuns(input);
    assert.equal(mathRun(runs), math);
    assert.ok(
      proseJoined(runs).includes(prose),
      `expected prose "${prose}" in ${JSON.stringify(proseJoined(runs))}`
    );
    assert.equal(detectBookLineBidiBreakage(input), null);
  });
}

for (const line of PROSE_LINES) {
  test(`prose-dominant line has no BiDi breakage: ${line}`, () => {
    assert.equal(detectBookLineBidiBreakage(line), null);
  });
}

test("comparison operators never flip", () => {
  assert.equal(mathRun(splitMixedHebrewMathRuns("12 < 18")), "12 < 18");
  assert.equal(mathRun(splitMixedHebrewMathRuns("18 > 12")), "18 > 12");
});

test("no Expected line ever renders a forbidden glued/reversed combination", () => {
  for (const line of ALL_EXPECTED) {
    const visible = simulateBookLineBidiRuns(line)
      .map((r) => r.value)
      .join(" ");
    for (const bad of FORBIDDEN_SUBSTRINGS) {
      assert.ok(
        !visible.includes(bad),
        `forbidden "${bad}" appeared while rendering "${line}" → ${visible}`
      );
    }
  }
});

test("no Expected line traps a non-place-value Hebrew phrase in an LTR run", () => {
  for (const line of ALL_EXPECTED) {
    for (const run of simulateBookLineBidiRuns(line)) {
      if (run.dir !== "ltr") continue;
      const hebrewPhrase = /[\u0590-\u05FF]+\s+[\u0590-\u05FF]+/u.test(run.value);
      assert.ok(
        !hebrewPhrase,
        `LTR run "${run.value}" from "${line}" traps a Hebrew phrase`
      );
    }
  }
});

test("forbidden glued combinations are rejected by the policy guard", () => {
  for (const bad of FORBIDDEN_SUBSTRINGS) {
    if (/^\d/.test(bad) === false) continue; // skip "? = …" non-numeric lead
    assert.throws(
      () => assertNotForbiddenLearningMath(bad),
      /forbidden/,
      `expected policy to reject "${bad}"`
    );
  }
});
