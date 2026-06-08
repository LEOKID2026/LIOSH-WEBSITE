import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const href = (rel) => pathToFileURL(join(root, rel)).href;

const { ensureMcqFourOptions, shouldEnforceFourMcqOptions, NORMAL_MCQ_OPTION_COUNT } = await import(
  href("utils/mcq-four-options.js")
).then((m) => (m.default?.ensureMcqFourOptions ? m.default : m));
const { buildMcqFromOptionPool, generateQuestion, getLevelForGrade } = await import(
  href("utils/english-question-generator.js")
).then((m) => (m.default?.generateQuestion ? m.default : m));
const { sanitizeQuestionForStudentDisplay } = await import(
  href("utils/student-question-stem-sanitizer.js")
).then((m) => (m.default?.sanitizeQuestionForStudentDisplay ? m.default : m));

test("buildMcqFromOptionPool pads three-option grammar pool to four", () => {
  const answers = buildMcqFromOptionPool("eat", ["eat", "eats", "eating"], 4);
  assert.equal(answers.length, 4);
  assert.ok(answers.includes("eat"));
  assert.equal(new Set(answers).size, 4);
});

test("ensureMcqFourOptions pads short MCQ rows", () => {
  const out = ensureMcqFourOptions(
    {
      question: "Choose: test",
      answers: ["have", "has", "having"],
      correctAnswer: "have",
      params: { answerMode: "choice", subject: "english" },
    },
    { subject: "english" }
  );
  assert.equal(out.answers.length, NORMAL_MCQ_OPTION_COUNT);
  assert.ok(out.answers.includes("have"));
});

test("english generator yields four sanitized MCQ options for g1 sentences", () => {
  const lc = getLevelForGrade("easy", "g1");
  const q = sanitizeQuestionForStudentDisplay(
    generateQuestion(lc, "sentences", "g1", null, "easy", null)
  );
  assert.equal(String(q.params?.answerMode || q.qType).toLowerCase(), "choice");
  assert.equal(q.answers.length, 4);
  assert.ok(q.answers.includes(String(q.correctAnswer)));
});

test("geometry variable-label MCQ is exempt from four-option enforcement", () => {
  const q = {
    question: '"מקבילות" מתאים לאיזה מספר?',
    answers: ["1", "2"],
    correctAnswer: "1",
    params: { kind: "parallel_perpendicular", answerMode: "choice" },
  };
  assert.equal(shouldEnforceFourMcqOptions(q), false);
});
