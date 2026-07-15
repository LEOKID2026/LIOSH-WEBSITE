import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAttemptSnapshotFields,
  buildFrozenActivityInsertFields,
  legacyQuestionUnavailableLabel,
  normalizeAndFreezeQuestionSet,
  normalizeSnapshotStatus,
  SNAPSHOT_STATUS_FROZEN,
  SNAPSHOT_STATUS_LEGACY_MISSING,
  validateAssignedActivityQuestionIndex,
} from "../../lib/classroom-activities/assigned-activity-snapshot.server.js";
import { mapTeacherActivityStudentAnswerDetail } from "../../lib/teacher-server/teacher-activities.server.js";

test("normalizeAndFreezeQuestionSet assigns qk and canonical fields", () => {
  const raw = [
    {
      prompt: "2 + 2 = ?",
      correctAnswer: "4",
      choices: ["3", "4"],
      subject: "math",
    },
  ];

  const frozen = normalizeAndFreezeQuestionSet(raw, {
    subject: "math",
    topic: "addition",
    gradeLevel: "g2",
    difficultyLevel: "easy",
    skillKey: "math_add",
  });

  assert.equal(frozen.length, 1);
  assert.match(String(frozen[0].qk), /^[0-9a-f-]{36}$/i);
  assert.equal(frozen[0].question, "2 + 2 = ?");
  assert.equal(frozen[0].correct_answer, "4");
  assert.deepEqual(frozen[0].choices, ["3", "4"]);
  assert.equal(frozen[0].question_index, 0);
  assert.equal(frozen[0].topic, "addition");
});

test("buildFrozenActivityInsertFields marks snapshot frozen", () => {
  const fields = buildFrozenActivityInsertFields(
    [{ question: "Q?", correct_answer: "1" }],
    { subject: "math", topic: "t" }
  );
  assert.equal(fields.snapshot_status, SNAPSHOT_STATUS_FROZEN);
  assert.ok(fields.snapshot_frozen_at);
  assert.equal(Array.isArray(fields.question_set), true);
  assert.ok(fields.question_set[0].qk);
});

test("buildAttemptSnapshotFields copies question_key from qk", () => {
  const fields = buildAttemptSnapshotFields(
    { qk: "abc-123", question: "Q", correct_answer: "1" },
    { skill_key: "skill_a" }
  );
  assert.equal(fields.question_key, "abc-123");
  assert.equal(fields.question_snapshot.question, "Q");
  assert.equal(fields.skill_key, "skill_a");
});

test("validateAssignedActivityQuestionIndex rejects out-of-range index", () => {
  const result = validateAssignedActivityQuestionIndex(1, 2, [
    { question: "a", correct_answer: "1" },
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.code, "question_index_out_of_range");
});

test("mapTeacherActivityStudentAnswerDetail includes questionKey and legacy placeholder", () => {
  const rows = mapTeacherActivityStudentAnswerDetail({
    questionSet: [],
    attempts: [
      {
        question_index: 0,
        question_key: "legacy-key",
        selected_answer: "x",
        correct_answer: "y",
        is_correct: false,
        question_snapshot: { question: "Legacy Q", choices: ["x", "y"], correct_answer: "y" },
      },
    ],
    questionCount: 1,
    snapshotStatus: SNAPSHOT_STATUS_LEGACY_MISSING,
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].question, "Legacy Q");
  assert.equal(rows[0].questionKey, "legacy-key");
  assert.equal(rows[0].snapshotStatus, SNAPSHOT_STATUS_LEGACY_MISSING);
});

test("mapTeacherActivityStudentAnswerDetail uses frozen question_set for unanswered slots", () => {
  const rows = mapTeacherActivityStudentAnswerDetail({
    questionSet: [
      {
        qk: "q1",
        question: "מהו Q1?",
        correct_answer: "א",
        choices: ["א", "ב"],
      },
      {
        qk: "q2",
        question: "מהו Q2?",
        correct_answer: "ג",
        choices: ["ג", "ד"],
      },
    ],
    attempts: [
      {
        question_index: 0,
        question_key: "q1",
        selected_answer: "א",
        correct_answer: "א",
        is_correct: true,
        question_snapshot: {},
      },
    ],
    questionCount: 2,
    snapshotStatus: SNAPSHOT_STATUS_FROZEN,
  });

  assert.equal(rows[0].questionKey, "q1");
  assert.equal(rows[1].question, "מהו Q2?");
  assert.equal(rows[1].selectedAnswer, null);
  assert.equal(rows[1].questionKey, "q2");
});

test("legacyQuestionUnavailableLabel is stable", () => {
  assert.equal(legacyQuestionUnavailableLabel(2), "שאלה 3 - לא זמינה");
});

test("normalizeSnapshotStatus defaults to legacy_missing", () => {
  assert.equal(normalizeSnapshotStatus(null), SNAPSHOT_STATUS_LEGACY_MISSING);
  assert.equal(normalizeSnapshotStatus("frozen"), SNAPSHOT_STATUS_FROZEN);
});
