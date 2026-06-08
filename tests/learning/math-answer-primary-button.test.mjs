import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const href = (rel) => pathToFileURL(join(root, rel)).href;

const {
  MATH_ANSWER_CHECK_LABEL,
  MATH_ANSWER_NEXT_LABEL,
  getMathPrimaryAnswerButtonState,
} = await import(href("utils/math-answer-primary-button.js"));

test("before check: בדוק, disabled without draft answer", () => {
  const state = getMathPrimaryAnswerButtonState({
    selectedAnswer: null,
    textAnswer: "  ",
  });
  assert.equal(state.label, MATH_ANSWER_CHECK_LABEL);
  assert.equal(state.action, "check");
  assert.equal(state.disabled, true);
});

test("before check: בדוק enabled with draft answer", () => {
  const state = getMathPrimaryAnswerButtonState({
    selectedAnswer: null,
    textAnswer: "12",
  });
  assert.equal(state.label, MATH_ANSWER_CHECK_LABEL);
  assert.equal(state.action, "check");
  assert.equal(state.disabled, false);
});

test("after check: שאלה הבאה replaces בדוק in same slot", () => {
  const state = getMathPrimaryAnswerButtonState({
    selectedAnswer: 7,
    textAnswer: "7",
  });
  assert.equal(state.label, MATH_ANSWER_NEXT_LABEL);
  assert.equal(state.action, "next");
  assert.equal(state.disabled, false);
});

test("after wrong comparison sign: next action without extra row state", () => {
  const state = getMathPrimaryAnswerButtonState({
    selectedAnswer: "<",
    textAnswer: "<",
  });
  assert.equal(state.label, MATH_ANSWER_NEXT_LABEL);
  assert.equal(state.action, "next");
});
