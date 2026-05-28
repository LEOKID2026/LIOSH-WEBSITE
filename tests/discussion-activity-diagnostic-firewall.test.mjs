import test from "node:test";
import assert from "node:assert/strict";
import {
  buildClassroomActivityRollupsByStudentId,
  mergeClassroomActivityRollupIntoReportPayload,
} from "../lib/teacher-server/classroom-activity-class-report.server.js";
import {
  shouldRevealCorrectAnswerToStudent,
  ACTIVITY_MODES,
} from "../lib/classroom-activities/classroom-activities-shared.server.js";

const STUDENT_ID = "11111111-1111-1111-1111-111111111111";
const HOMEWORK_ACTIVITY_ID = "22222222-2222-2222-2222-222222222222";
const DISCUSSION_ACTIVITY_ID = "33333333-3333-3333-3333-333333333333";

test("ACTIVITY_MODES includes discussion", () => {
  assert.equal(ACTIVITY_MODES.has("discussion"), true);
});

test("shouldRevealCorrectAnswerToStudent hides answers for discussion mode", () => {
  assert.equal(shouldRevealCorrectAnswerToStudent("discussion"), false);
  assert.equal(shouldRevealCorrectAnswerToStudent("discussion", { submitted: true }), false);
});

test("rollup excludes discussion activity when not in activities list", () => {
  const homeworkOnly = buildClassroomActivityRollupsByStudentId({
    activities: [
      {
        id: HOMEWORK_ACTIVITY_ID,
        subject: "math",
        topic: "addition",
        status: "closed",
        created_at: "2026-01-15T10:00:00.000Z",
      },
    ],
    statuses: [
      {
        activity_id: HOMEWORK_ACTIVITY_ID,
        student_id: STUDENT_ID,
        status: "submitted",
        submitted_at: "2026-01-15T10:05:00.000Z",
        answers_count: 5,
        correct_count: 4,
      },
      {
        activity_id: DISCUSSION_ACTIVITY_ID,
        student_id: STUDENT_ID,
        status: "submitted",
        submitted_at: "2026-01-16T10:05:00.000Z",
        answers_count: 1,
        correct_count: 1,
      },
    ],
    studentIds: [STUDENT_ID],
  });

  const rollup = homeworkOnly.get(STUDENT_ID);
  assert.equal(rollup.answers, 5);
  assert.equal(rollup.correct, 4);
});

test("mergeClassroomActivityRollupIntoReportPayload is unchanged when discussion rollup is empty", () => {
  const payload = {
    summary: { totalSessions: 2, totalAnswers: 10, correctAnswers: 8, wrongAnswers: 2, accuracy: 80 },
    subjects: {
      math: { sessions: 2, answers: 10, correct: 8, wrong: 2, accuracy: 80, topics: {} },
    },
  };
  const baseline = JSON.parse(JSON.stringify(payload));

  mergeClassroomActivityRollupIntoReportPayload(payload, {
    sessions: 0,
    answers: 0,
    correct: 0,
    wrong: 0,
    subjects: {},
    daily: {},
    dailyBySubject: {},
  });

  assert.deepEqual(payload.summary, baseline.summary);
  assert.deepEqual(payload.subjects.math, baseline.subjects.math);
});

test("multi-question discussion (questionCount=3) does not appear in diagnostic rollup", () => {
  const rollups = buildClassroomActivityRollupsByStudentId({
    activities: [
      {
        id: HOMEWORK_ACTIVITY_ID,
        subject: "math",
        topic: "addition",
        mode: "homework",
        status: "closed",
        created_at: "2026-01-15T10:00:00.000Z",
      },
    ],
    statuses: [
      {
        activity_id: HOMEWORK_ACTIVITY_ID,
        student_id: STUDENT_ID,
        status: "submitted",
        submitted_at: "2026-01-15T10:05:00.000Z",
        answers_count: 5,
        correct_count: 4,
      },
      {
        activity_id: DISCUSSION_ACTIVITY_ID,
        student_id: STUDENT_ID,
        status: "submitted",
        submitted_at: "2026-01-16T10:05:00.000Z",
        answers_count: 3,
        correct_count: 2,
      },
    ],
    studentIds: [STUDENT_ID],
  });
  assert.equal(rollups.get(STUDENT_ID)?.answers, 5);
});

test("explanation-only discussion (answer_required=false) does not appear in diagnostic rollup", () => {
  const rollups = buildClassroomActivityRollupsByStudentId({
    activities: [
      {
        id: HOMEWORK_ACTIVITY_ID,
        subject: "math",
        topic: "addition",
        mode: "homework",
        status: "closed",
        created_at: "2026-01-15T10:00:00.000Z",
      },
    ],
    statuses: [
      {
        activity_id: HOMEWORK_ACTIVITY_ID,
        student_id: STUDENT_ID,
        status: "submitted",
        submitted_at: "2026-01-15T10:05:00.000Z",
        answers_count: 5,
        correct_count: 4,
      },
      {
        activity_id: DISCUSSION_ACTIVITY_ID,
        student_id: STUDENT_ID,
        status: "submitted",
        submitted_at: "2026-01-17T10:05:00.000Z",
        answers_count: 0,
        correct_count: 0,
      },
    ],
    studentIds: [STUDENT_ID],
  });
  assert.equal(rollups.get(STUDENT_ID)?.answers, 5);
});
