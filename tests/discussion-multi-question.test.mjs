import test from "node:test";
import assert from "node:assert/strict";
import { parseCreateActivityBody } from "../lib/teacher-server/teacher-activities.server.js";
import {
  ACTIVITY_MODES,
  shouldRevealCorrectAnswerToStudent,
} from "../lib/classroom-activities/classroom-activities-shared.server.js";
import {
  buildClassroomActivityRollupsByStudentId,
} from "../lib/teacher-server/classroom-activity-class-report.server.js";

const CLASS_ID = "22222222-2222-4222-8222-222222222222";
const STUDENT_ID = "33333333-3333-4333-8333-333333333333";

function discussionBody(count, answerRequired = true) {
  const questionSet = Array.from({ length: count }, (_, i) => ({
    question: `שאלה ${i + 1}?`,
    correctAnswer: String(i + 1),
    choices: [String(i + 1), String(i + 2)],
  }));
  return {
    title: "דיון",
    classId: CLASS_ID,
    subject: "math",
    topic: "addition",
    mode: "discussion",
    questionSelection: "same_exact",
    questionCount: count,
    questionSet,
    answerRequired,
  };
}

test("create normal discussion with 1 question - server accepts", () => {
  const parsed = parseCreateActivityBody(discussionBody(1));
  assert.equal(parsed.ok, true);
});

test("create normal discussion with 3 questions - server accepts", () => {
  const parsed = parseCreateActivityBody(discussionBody(3));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.payload.questionCount, 3);
});

test("create normal discussion with 5 questions - server accepts", () => {
  const parsed = parseCreateActivityBody(discussionBody(5));
  assert.equal(parsed.ok, true);
});

test("server rejects discussion with 0 questions", () => {
  const parsed = parseCreateActivityBody(discussionBody(0));
  assert.equal(parsed.ok, false);
});

test("server rejects discussion with 6 questions", () => {
  const parsed = parseCreateActivityBody(discussionBody(6));
  assert.equal(parsed.ok, false);
});

test("create explanation-only discussion (answerRequired=false) - server accepts", () => {
  const parsed = parseCreateActivityBody(discussionBody(2, false));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.payload.answerRequired, false);
});

test("parseCreateActivityBody answerRequired=false sets answer_required false", () => {
  const parsed = parseCreateActivityBody(discussionBody(1, false));
  assert.equal(parsed.payload.answerRequired, false);
});

test("parseCreateActivityBody answerRequired missing defaults to true", () => {
  const body = discussionBody(1);
  delete body.answerRequired;
  const parsed = parseCreateActivityBody(body);
  assert.equal(parsed.payload.answerRequired, true);
});

test("multi-question discussion excluded from diagnostic rollup", () => {
  const discussionId = "44444444-4444-4444-8444-444444444444";
  const homeworkId = "55555555-5555-4555-8555-555555555555";
  const rollups = buildClassroomActivityRollupsByStudentId({
    activities: [
      {
        id: homeworkId,
        subject: "math",
        topic: "addition",
        mode: "homework",
        status: "closed",
        created_at: "2026-01-01T10:00:00.000Z",
      },
    ],
    statuses: [
      {
        activity_id: homeworkId,
        student_id: STUDENT_ID,
        status: "submitted",
        submitted_at: "2026-01-01T10:05:00.000Z",
        answers_count: 5,
        correct_count: 4,
      },
      {
        activity_id: discussionId,
        student_id: STUDENT_ID,
        status: "submitted",
        submitted_at: "2026-01-02T10:05:00.000Z",
        answers_count: 3,
        correct_count: 2,
      },
    ],
    studentIds: [STUDENT_ID],
  });
  assert.equal(rollups.get(STUDENT_ID)?.answers, 5);
});

test("explanation-only discussion excluded from diagnostic rollup", () => {
  assert.equal(ACTIVITY_MODES.has("discussion"), true);
  assert.equal(shouldRevealCorrectAnswerToStudent("discussion"), false);
});

test("normal discussion - student must submit answer - enforced via answerRequired default", () => {
  const parsed = parseCreateActivityBody(discussionBody(1));
  assert.equal(parsed.payload.answerRequired, true);
});
