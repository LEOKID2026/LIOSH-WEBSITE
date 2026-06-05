import assert from "node:assert/strict";
import test from "node:test";
import {
  enrichAssignedActivityQuestionSetForStudent,
  inferAssignedActivityGradeKey,
  prepareAssignedActivityStudentPlayData,
} from "../../lib/classroom-activities/assigned-activity-play-metadata.server.js";

test("inferAssignedActivityGradeKey falls back to student profile grade", () => {
  assert.equal(
    inferAssignedActivityGradeKey(
      [{ question: "1+1", subject: "math", topic: "addition" }],
      { subject: "math", topic: "addition" },
      "g2"
    ),
    "g2"
  );
});

test("enrichAssignedActivityQuestionSetForStudent restores grade on stripped questions", () => {
  const activityMeta = {
    gradeLevel: "g2",
    difficultyLevel: "easy",
    subject: "math",
    topic: "addition",
  };
  const stripped = [{ index: 0, question: "3 + 4 = __", subject: "math", topic: "addition" }];
  const raw = [{ question: "3 + 4 = __", subject: "math", topic: "addition" }];

  const enriched = enrichAssignedActivityQuestionSetForStudent(stripped, raw, activityMeta);
  assert.equal(enriched[0].gradeLevel, "g2");
  assert.equal(enriched[0].grade, "g2");
  assert.equal(enriched[0].difficulty, "easy");
});

test("prepareAssignedActivityStudentPlayData exposes gradeLevel on activity payload", () => {
  const row = {
    id: "00000000-0000-4000-8000-000000000001",
    title: "חיבור",
    mode: "guided_practice",
    subject: "math",
    topic: "addition",
    difficulty_level: "easy",
    question_count: 1,
    status: "active",
    question_set: [
      {
        qk: "q1",
        question: "2 + 3 = __",
        subject: "math",
        topic: "addition",
        grade: "g2",
        difficulty: "easy",
        params: { kind: "add_two", a: 2, b: 3 },
      },
    ],
  };

  const { activity, questionSet } = prepareAssignedActivityStudentPlayData(
    row,
    row.question_set,
    "parent",
    "g2"
  );

  assert.equal(activity.gradeLevel, "g2");
  assert.equal(activity.subject, "math");
  assert.equal(activity.topic, "addition");
  assert.equal(questionSet[0].gradeLevel, "g2");
  assert.equal(questionSet[0].correctAnswer, undefined);
});
