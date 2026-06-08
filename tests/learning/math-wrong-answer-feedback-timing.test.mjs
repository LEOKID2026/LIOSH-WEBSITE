import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const href = (rel) => pathToFileURL(join(root, rel)).href;

const {
  MATH_CORRECT_ANSWER_ADVANCE_MS,
  MATH_WRONG_ANSWER_FEEDBACK_MS,
  shouldPauseWrongAnswerAutoAdvance,
} = await import(href("utils/math-wrong-answer-feedback-timing.js"));

const { LEARNING_WRONG_ANSWER_FEEDBACK_MS } = await import(
  href("utils/learning-wrong-answer-feedback-timing.js")
);

test("shared learning wrong-answer delay is 7 seconds", () => {
  assert.equal(LEARNING_WRONG_ANSWER_FEEDBACK_MS, 7000);
  assert.equal(MATH_WRONG_ANSWER_FEEDBACK_MS, LEARNING_WRONG_ANSWER_FEEDBACK_MS);
});

test("wrong-answer feedback delay is at least 6 seconds", () => {
  assert.ok(MATH_WRONG_ANSWER_FEEDBACK_MS >= 6000);
  assert.ok(MATH_WRONG_ANSWER_FEEDBACK_MS <= 8000);
});

test("correct-answer advance delay remains 1 second", () => {
  assert.equal(MATH_CORRECT_ANSWER_ADVANCE_MS, 1000);
});

test("explanation modal open pauses wrong-answer auto-advance", () => {
  assert.equal(shouldPauseWrongAnswerAutoAdvance({ showSolution: true }), true);
  assert.equal(shouldPauseWrongAnswerAutoAdvance({ showPreviousSolution: true }), true);
  assert.equal(
    shouldPauseWrongAnswerAutoAdvance({ showSolution: false, showPreviousSolution: false }),
    false
  );
});
