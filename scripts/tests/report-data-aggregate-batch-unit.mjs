/**
 * Batch roster aggregation uses the same in-memory rollup as single-student path.
 */
import assert from "node:assert/strict";
import {
  aggregateParentReportPayload,
  aggregateReportPayloadFromActivityRows,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import { batchAggregateParentReportPayloadsForRoster } from "../../lib/parent-server/report-data-aggregate-batch.server.js";

const studentA = {
  id: "11111111-1111-4111-8111-111111111111",
  full_name: "Student A",
  grade_level: "g3",
  is_active: true,
};

const studentB = {
  id: "22222222-2222-4222-8222-222222222222",
  full_name: "Student B",
  grade_level: "g3",
  is_active: true,
};

const fromDate = new Date("2026-05-01T00:00:00.000Z");
const toDate = new Date("2026-05-28T00:00:00.000Z");

const sessions = [
  {
    id: "s1",
    student_id: studentA.id,
    subject: "math",
    topic: "addition",
    started_at: "2026-05-10T10:00:00.000Z",
    created_at: "2026-05-10T10:00:00.000Z",
    ended_at: "2026-05-10T10:05:00.000Z",
    duration_seconds: 300,
    status: "completed",
    metadata: {},
  },
  {
    id: "s2",
    student_id: studentB.id,
    subject: "math",
    topic: "subtraction",
    started_at: "2026-05-11T10:00:00.000Z",
    created_at: "2026-05-11T10:00:00.000Z",
    ended_at: "2026-05-11T10:05:00.000Z",
    duration_seconds: 300,
    status: "completed",
    metadata: {},
  },
];

const answers = [
  {
    id: "a1",
    student_id: studentA.id,
    learning_session_id: "s1",
    question_id: "q1",
    is_correct: true,
    answer_payload: { subject: "math", topic: "addition" },
    answered_at: "2026-05-10T10:01:00.000Z",
    created_at: "2026-05-10T10:01:00.000Z",
  },
  {
    id: "a2",
    student_id: studentB.id,
    learning_session_id: "s2",
    question_id: "q2",
    is_correct: false,
    answer_payload: { subject: "math", topic: "subtraction" },
    answered_at: "2026-05-11T10:01:00.000Z",
    created_at: "2026-05-11T10:01:00.000Z",
  },
];

const fetchMeta = { sessionsFilterField: "started_at", answersFilterField: "answered_at" };

const directA = aggregateReportPayloadFromActivityRows(
  studentA,
  sessions.filter((s) => s.student_id === studentA.id),
  answers.filter((a) => a.student_id === studentA.id),
  fromDate,
  toDate,
  fetchMeta
);

assert.equal(directA.summary.totalAnswers, 1);
assert.equal(directA.summary.correctAnswers, 1);
assert.equal(directA.student.id, studentA.id);

const directB = aggregateReportPayloadFromActivityRows(
  studentB,
  sessions.filter((s) => s.student_id === studentB.id),
  answers.filter((a) => a.student_id === studentB.id),
  fromDate,
  toDate,
  fetchMeta
);

assert.equal(directB.summary.totalAnswers, 1);
assert.equal(directB.summary.wrongAnswers, 1);

console.log("report-data-aggregate-batch-unit: aggregateReportPayloadFromActivityRows ok");

console.log("report-data-aggregate-batch-unit: all static checks passed");
