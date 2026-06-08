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

const { getLearningPrimaryAnswerButtonState } = await import(
  href("utils/learning-answer-primary-button.js")
);

function assertLabelMatchesAction(state) {
  if (state.action === "check") {
    assert.equal(state.label, MATH_ANSWER_CHECK_LABEL);
  } else if (state.action === "next") {
    assert.equal(state.label, MATH_ANSWER_NEXT_LABEL);
  } else {
    assert.fail(`unexpected action: ${state.action}`);
  }
}

test("before check: visible label בדוק, action check, disabled without draft", () => {
  const state = getMathPrimaryAnswerButtonState({
    selectedAnswer: null,
    textAnswer: "  ",
  });
  assertLabelMatchesAction(state);
  assert.equal(state.action, "check");
  assert.equal(state.disabled, true);
});

test("before check: visible label בדוק, action check, enabled with draft", () => {
  const state = getMathPrimaryAnswerButtonState({
    selectedAnswer: null,
    textAnswer: "12",
  });
  assertLabelMatchesAction(state);
  assert.equal(state.action, "check");
  assert.equal(state.disabled, false);
});

test("after wrong answer: visible label שאלה הבאה, action next", () => {
  const state = getMathPrimaryAnswerButtonState({
    selectedAnswer: 7,
    textAnswer: "7",
  });
  assertLabelMatchesAction(state);
  assert.equal(state.action, "next");
  assert.equal(state.disabled, false);
  assert.notEqual(state.label, MATH_ANSWER_CHECK_LABEL);
});

test("after wrong comparison sign: label and action both next", () => {
  const state = getMathPrimaryAnswerButtonState({
    selectedAnswer: "<",
    textAnswer: "<",
  });
  assertLabelMatchesAction(state);
  assert.equal(state.action, "next");
  assert.equal(state.label, MATH_ANSWER_NEXT_LABEL);
});

test("after correct answer with feedback: label שאלה הבאה when answer locked", () => {
  const state = getMathPrimaryAnswerButtonState({
    selectedAnswer: "42",
    textAnswer: "",
  });
  assertLabelMatchesAction(state);
  assert.equal(state.action, "next");
});

test("disabled empty input: label remains בדוק for check state", () => {
  const state = getMathPrimaryAnswerButtonState({
    selectedAnswer: null,
    textAnswer: "",
  });
  assert.equal(state.label, MATH_ANSWER_CHECK_LABEL);
  assert.equal(state.action, "check");
  assert.equal(state.disabled, true);
});

test("embedded mobile submit must use state.label (not hardcoded בדוק)", () => {
  const answered = getMathPrimaryAnswerButtonState({
    selectedAnswer: "5",
    textAnswer: "5",
  });
  const draft = getMathPrimaryAnswerButtonState({
    selectedAnswer: null,
    textAnswer: "5",
  });
  assert.equal(draft.label, MATH_ANSWER_CHECK_LABEL);
  assert.equal(answered.label, MATH_ANSWER_NEXT_LABEL);
  assert.notEqual(answered.label, draft.label);
});

test("learning alias exports same visible labels", () => {
  const mathState = getMathPrimaryAnswerButtonState({
    selectedAnswer: "9",
    textAnswer: "9",
  });
  const learningState = getLearningPrimaryAnswerButtonState({
    selectedAnswer: "9",
    textAnswer: "9",
  });
  assert.deepEqual(learningState, mathState);
});
