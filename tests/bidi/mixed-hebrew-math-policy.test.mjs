import assert from "node:assert/strict";
import test from "node:test";
import {
  isFullEquationLine,
  splitMixedHebrewMathRuns,
  detectMixedMathRenderIssues,
} from "../../lib/bidi/mixed-hebrew-math-runs.js";
import {
  parseStepExplanationThreeLines,
  splitLearningMixedHebrewMathRuns,
} from "../../utils/learning-mixed-hebrew-math-render.js";

test("place-value decomposition is one LTR math island", () => {
  const line = "1 מאה + 2 עשרות + 4 אחדות = 124";
  assert.equal(isFullEquationLine(line), true);
  const runs = splitMixedHebrewMathRuns(line);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].type, "math");
  assert.match(runs[0].value, /124/);
});

test("numeric decomposition line is one math island", () => {
  const runs = splitMixedHebrewMathRuns("100 + 20 + 4 = 124");
  assert.equal(runs.length, 1);
  assert.equal(runs[0].type, "math");
  assert.equal(runs[0].value, "100 + 20 + 4 = 124");
});

test("bullet prefix stays RTL prose, equation LTR", () => {
  const runs = splitMixedHebrewMathRuns("- 1 מאה + 2 עשרות + 4 אחדות = 124");
  assert.equal(runs[0].type, "prose");
  assert.match(runs[0].value, /^-/);
  assert.equal(runs[1].type, "math");
  assert.match(runs[1].value, /124/);
});

test("Hebrew label + equation splits correctly", () => {
  const runs = splitMixedHebrewMathRuns("עשרות: 30 + 20 = 50");
  assert.equal(runs[0].type, "prose");
  assert.match(runs[0].value, /עשרות/);
  assert.equal(runs[1].type, "math");
  assert.equal(runs[1].value, "30 + 20 = 50");
});

test("arrow carry keeps arrow inside math island", () => {
  const runs = splitMixedHebrewMathRuns("8 + 7 = 15 → 5, נשיאה 1");
  assert.equal(runs[0].type, "math");
  assert.match(runs[0].value, /→ 5/);
  assert.equal(runs[1].type, "prose");
  assert.match(runs[1].value, /נשיאה/);
});

test("pi approximation stays intact", () => {
  const runs = splitMixedHebrewMathRuns("π ≈ 3.14");
  assert.equal(runs.length, 1);
  assert.equal(runs[0].type, "math");
  assert.match(runs[0].value, /3\.14/);
});

test("label pi line keeps label RTL and math LTR", () => {
  const runs = splitMixedHebrewMathRuns("בשיעור: π ≈ 3.14");
  assert.equal(runs[0].type, "prose");
  assert.equal(runs[1].type, "math");
  assert.match(runs[1].value, /3\.14/);
});

test("decimal must not split in detection", () => {
  const issues = detectMixedMathRenderIssues("π ≈ 3.14");
  assert.equal(issues.includes("split-decimal"), false);
});

test("learning delegate matches shared splitter", () => {
  const sample = "58 + 37 = 95";
  assert.deepEqual(
    splitLearningMixedHebrewMathRuns(sample),
    splitMixedHebrewMathRuns(sample)
  );
});

test("parses addition step into three separate lines", () => {
  const blocks = parseStepExplanationThreeLines(
    "מחברים את ספרת המאות: 1 + 8 = 9. כותבים 9 בעמודת המאות."
  );
  assert.deepEqual(blocks, {
    instruction: "מחברים את ספרת המאות:",
    equation: "1 + 8 = 9",
    explanation: "כותבים 9 בעמודת המאות.",
  });
});

test("inline fallback keeps full equation before Hebrew explanation", () => {
  const runs = splitLearningMixedHebrewMathRuns(
    "6 + 2 = 8. כותבים 8 בעמודת המאות."
  );
  assert.equal(runs[0].type, "math");
  assert.equal(runs[0].value, "6 + 2 = 8");
});
