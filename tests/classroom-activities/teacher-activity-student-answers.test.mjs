import test from "node:test";
import assert from "node:assert/strict";
import { mapTeacherActivityStudentAnswerDetail } from "../../lib/teacher-server/teacher-activities.server.js";

test("mapTeacherActivityStudentAnswerDetail merges attempts with frozen question set", () => {
  const questionSet = [
    {
      question: "מהו Q1?",
      correctAnswer: "א",
      choices: ["א", "ב"],
      subject: "science",
    },
    {
      question: "מהו Q2?",
      correctAnswer: "ג",
      choices: ["ג", "ד"],
      subject: "science",
    },
  ];
  const attempts = [
    {
      question_index: 0,
      selected_answer: "א",
      correct_answer: "א",
      is_correct: true,
      answered_at: "2026-05-25T12:00:00.000Z",
      question_snapshot: { question: "מהו Q1?", choices: ["א", "ב"], subject: "science" },
    },
    {
      question_index: 1,
      selected_answer: "ד",
      correct_answer: "ג",
      is_correct: false,
      answered_at: "2026-05-25T12:01:00.000Z",
      question_snapshot: { question: "מהו Q2?", choices: ["ג", "ד"], subject: "science" },
    },
  ];

  const rows = mapTeacherActivityStudentAnswerDetail({
    questionSet,
    attempts,
    questionCount: 2,
  });

  assert.equal(rows.length, 2);
  assert.equal(rows[0].question, "מהו Q1?");
  assert.equal(rows[0].selectedAnswer, "א");
  assert.equal(rows[0].correctAnswer, "א");
  assert.equal(rows[0].isCorrect, true);
  assert.deepEqual(rows[0].choices, ["א", "ב"]);
  assert.equal(rows[1].isCorrect, false);
  assert.equal(rows[1].selectedAnswer, "ד");
  assert.equal(rows[1].correctAnswer, "ג");
});

test("mapTeacherActivityStudentAnswerDetail includes unanswered slots from frozen set", () => {
  const questionSet = [{ question: "שאלה 1", correctAnswer: "5", subject: "math" }];
  const rows = mapTeacherActivityStudentAnswerDetail({
    questionSet,
    attempts: [],
    questionCount: 1,
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].selectedAnswer, null);
  assert.equal(rows[0].correctAnswer, "5");
  assert.equal(rows[0].isCorrect, null);
});
