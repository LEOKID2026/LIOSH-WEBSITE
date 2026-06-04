import assert from "node:assert/strict";
import test from "node:test";
import {
  parseStepExplanationThreeLines,
  splitLearningMixedHebrewMathRuns,
} from "../utils/learning-mixed-hebrew-math-render.js";

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

test("parses carry addition step", () => {
  const blocks = parseStepExplanationThreeLines(
    "מחברים את ספרת העשרות: 4 + 5 + 1 = 10. כותבים 0 בעמודת העשרות ומעבירים 1 לעמודה הבאה."
  );
  assert.equal(blocks?.equation, "4 + 5 + 1 = 10");
  assert.equal(blocks?.instruction, "מחברים את ספרת העשרות:");
  assert.match(blocks?.explanation || "", /^כותבים 0/);
});

test("parses alternate column-addition wording", () => {
  const blocks = parseStepExplanationThreeLines(
    "מחברים בעמודת המאות: 6 + 2 = 8. כותבים 8 בעמודת המאות."
  );
  assert.equal(blocks?.equation, "6 + 2 = 8");
  assert.equal(blocks?.explanation, "כותבים 8 בעמודת המאות.");
});

test("parses subtraction step with וכותבים connector", () => {
  const blocks = parseStepExplanationThreeLines(
    "כעת מחשבים בעמודת האחדות: 5 - 3 = 2 וכותבים 2 בעמודה זו."
  );
  assert.equal(blocks?.equation, "5 - 3 = 2");
  assert.equal(blocks?.explanation, "כותבים 2 בעמודה זו.");
});

test("inline fallback still keeps full equation before Hebrew explanation", () => {
  const runs = splitLearningMixedHebrewMathRuns(
    "6 + 2 = 8. כותבים 8 בעמודת המאות."
  );
  assert.equal(runs[0].type, "math");
  assert.equal(runs[0].value, "6 + 2 = 8");
});
