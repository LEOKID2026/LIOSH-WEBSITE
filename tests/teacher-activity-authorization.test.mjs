import test from "node:test";
import assert from "node:assert/strict";
import { parseCreateActivityBody } from "../lib/teacher-server/teacher-activities.server.js";
import { normalizeGradeLevelToKey } from "../lib/learning-student-defaults.js";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";

function baseBody(overrides = {}) {
  return {
    title: "פעילות בדיקה",
    classId: CLASS_ID,
    subject: "math",
    topic: "addition",
    mode: "guided_practice",
    questionSelection: "same_exact",
    questionCount: 1,
    gradeLevel: "g3",
    questionSet: [
      {
        question: "2+2?",
        correctAnswer: "4",
        choices: ["3", "4", "5"],
      },
    ],
    ...overrides,
  };
}

test("parseCreateActivityBody accepts gradeLevel in payload", () => {
  const parsed = parseCreateActivityBody(baseBody({ gradeLevel: "g4" }));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.payload.gradeLevel, "g4");
});

test("discussion with 3 questions is accepted", () => {
  const qs = [
    { question: "Q1?", correctAnswer: "1", choices: ["1", "2"] },
    { question: "Q2?", correctAnswer: "2", choices: ["2", "3"] },
    { question: "Q3?", correctAnswer: "3", choices: ["3", "4"] },
  ];
  const parsed = parseCreateActivityBody(
    baseBody({
      mode: "discussion",
      questionCount: 3,
      questionSet: qs,
      answerRequired: true,
    })
  );
  assert.equal(parsed.ok, true);
  assert.equal(parsed.payload.questionCount, 3);
});

test("discussion with 0 questions is rejected", () => {
  const parsed = parseCreateActivityBody(
    baseBody({
      mode: "discussion",
      questionCount: 0,
      questionSet: [],
    })
  );
  assert.equal(parsed.ok, false);
});

test("discussion with 6 questions is rejected", () => {
  const qs = Array.from({ length: 6 }, (_, i) => ({
    question: `Q${i + 1}?`,
    correctAnswer: String(i + 1),
    choices: [String(i + 1), String(i + 2)],
  }));
  const parsed = parseCreateActivityBody(
    baseBody({
      mode: "discussion",
      questionCount: 6,
      questionSet: qs,
    })
  );
  assert.equal(parsed.ok, false);
  assert.match(String(parsed.message), /1 עד 5/);
});

test("explanation-only discussion sets answerRequired false", () => {
  const parsed = parseCreateActivityBody(
    baseBody({
      mode: "discussion",
      answerRequired: false,
    })
  );
  assert.equal(parsed.ok, true);
  assert.equal(parsed.payload.answerRequired, false);
});

test("discussion defaults answerRequired to true", () => {
  const parsed = parseCreateActivityBody(
    baseBody({
      mode: "discussion",
    })
  );
  assert.equal(parsed.ok, true);
  assert.equal(parsed.payload.answerRequired, true);
});

test("validation messages are Hebrew for invalid subject", () => {
  const parsed = parseCreateActivityBody(baseBody({ subject: "not_a_subject" }));
  assert.equal(parsed.ok, false);
  assert.equal(parsed.message, "מקצוע לא תקין");
});

test("grade authorization treats g3 and grade_3 as the same canonical key", () => {
  assert.equal(normalizeGradeLevelToKey("g3"), "g3");
  assert.equal(normalizeGradeLevelToKey("grade_3"), "g3");
  assert.equal(normalizeGradeLevelToKey("g3"), normalizeGradeLevelToKey("grade_3"));
});

test("grade authorization rejects truly different grades after normalization", () => {
  assert.notEqual(normalizeGradeLevelToKey("g4"), normalizeGradeLevelToKey("grade_3"));
});

test("missing gradeLevel normalizes to empty and fails class match", () => {
  assert.equal(normalizeGradeLevelToKey(""), "");
  assert.equal(normalizeGradeLevelToKey(null), "");
});
