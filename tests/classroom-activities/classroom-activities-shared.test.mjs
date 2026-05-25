import test from "node:test";
import assert from "node:assert/strict";
import { stripQuestionSetForStudent } from "../../lib/classroom-activities/classroom-activities-shared.server.js";
import { isActivityPreviewSubjectSupported } from "../../lib/classroom-activities/classroom-activities-preview.js";

test("stripQuestionSetForStudent removes scoring fields", () => {
  const out = stripQuestionSetForStudent(
    [{ question: "2+2", correctAnswer: "4", correct_answer: "4" }],
    "guided_practice"
  );
  assert.equal(out[0].question, "2+2");
  assert.equal(out[0].correctAnswer, undefined);
  assert.equal(out[0].correct_answer, undefined);
});

test("quiz mode omits hint and explanation from start payload", () => {
  const out = stripQuestionSetForStudent(
    [
      {
        question: "Q?",
        correctAnswer: "1",
        hint: "secret hint",
        explanation: "secret explanation",
      },
    ],
    "quiz"
  );
  assert.equal(out[0].hint, undefined);
  assert.equal(out[0].explanation, undefined);
});

test("guided_practice may include hint and explanation", () => {
  const out = stripQuestionSetForStudent(
    [{ question: "Q?", hint: "h", explanation: "e", correctAnswer: "1" }],
    "guided_practice"
  );
  assert.equal(out[0].hint, "h");
  assert.equal(out[0].explanation, "e");
});

test("Phase A preview subjects are math and science only", () => {
  assert.equal(isActivityPreviewSubjectSupported("math"), true);
  assert.equal(isActivityPreviewSubjectSupported("science"), true);
  assert.equal(isActivityPreviewSubjectSupported("hebrew"), false);
  assert.equal(isActivityPreviewSubjectSupported("english"), false);
});
