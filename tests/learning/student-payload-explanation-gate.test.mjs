import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const href = (rel) => pathToFileURL(join(root, rel)).href;

const { stripQuestionSetForStudent } = await import(
  href("lib/classroom-activities/classroom-activities-shared.server.js")
).then((m) => (m.default?.stripQuestionSetForStudent ? m.default : m));

test("quiz strip removes correct answer and may keep explanation off pre-attempt path", () => {
  const stripped = stripQuestionSetForStudent(
    [
      {
        question: "מה תפקיד הלב?",
        choices: ["a", "b", "c", "d"],
        correctAnswer: "b",
        explanation: "הלב מזרים דם - b",
      },
    ],
    "quiz"
  );
  assert.equal(stripped[0].correctAnswer, undefined);
  assert.equal(stripped[0].explanation, undefined);
  assert.deepEqual(stripped[0].choices, ["a", "b", "c", "d"]);
});

test("homework strip removes correct answer but may include explanation", () => {
  const stripped = stripQuestionSetForStudent(
    [
      {
        question: "מה תפקיד הלב?",
        choices: ["a", "b", "c", "d"],
        correctAnswer: "b",
        explanation: "הלב מזרים דם - b",
      },
    ],
    "homework"
  );
  assert.equal(stripped[0].correctAnswer, undefined);
  assert.ok(stripped[0].explanation);
});
