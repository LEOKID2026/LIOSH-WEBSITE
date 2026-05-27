import assert from "node:assert/strict";
import {
  aggregateClassReportFromStudentPayloads,
} from "../../lib/teacher-server/teacher-class-report.server.js";
import {
  buildClassroomActivityRollupsByStudentId,
  mergeClassroomActivityRollupIntoReportPayload,
} from "../../lib/teacher-server/classroom-activity-class-report.server.js";

const studentA = "11111111-1111-4111-8111-111111111111";
const studentB = "22222222-2222-4222-8222-222222222222";
const activityOne = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const activityTwo = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const activities = [
  {
    id: activityOne,
    subject: "geometry",
    topic: "shapes",
    closed_at: "2026-05-10T12:00:00.000Z",
  },
  {
    id: activityTwo,
    subject: "geometry",
    topic: "angles",
    closed_at: "2026-05-12T12:00:00.000Z",
  },
];

const statuses = [
  {
    activity_id: activityOne,
    student_id: studentA,
    status: "submitted",
    submitted_at: "2026-05-10T12:00:00.000Z",
    answers_count: 10,
    correct_count: 8,
  },
  {
    activity_id: activityTwo,
    student_id: studentA,
    status: "submitted",
    submitted_at: "2026-05-12T12:00:00.000Z",
    answers_count: 10,
    correct_count: 7,
  },
  {
    activity_id: activityOne,
    student_id: studentB,
    status: "submitted",
    submitted_at: "2026-05-10T12:00:00.000Z",
    answers_count: 10,
    correct_count: 6,
  },
];

const rollups = buildClassroomActivityRollupsByStudentId({
  activities,
  statuses,
  studentIds: [studentA, studentB],
});

assert.equal(rollups.get(studentA)?.answers, 20);
assert.equal(rollups.get(studentA)?.correct, 15);
assert.equal(rollups.get(studentB)?.answers, 10);

const emptyLearningPayload = {
  range: { from: "2026-05-01", to: "2026-05-18" },
  summary: {
    totalSessions: 0,
    totalAnswers: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    accuracy: 0,
  },
  subjects: {
    geometry: { sessions: 0, answers: 0, correct: 0, wrong: 0, topics: {} },
  },
  dailyActivity: [],
  recentMistakes: [],
};

const mergedPayload = mergeClassroomActivityRollupIntoReportPayload(
  structuredClone(emptyLearningPayload),
  rollups.get(studentA)
);
assert.equal(mergedPayload.summary.totalAnswers, 20);
assert.equal(mergedPayload.summary.correctAnswers, 15);
assert.equal(mergedPayload.summary.studentsWithActivity, undefined);
assert.equal(mergedPayload.summary.accuracy, 75);
assert.equal(mergedPayload.subjects.geometry.answers, 20);
assert.equal(
  mergedPayload.subjects.geometry.topics.shapes?.lastAnswerAt,
  "2026-05-10T12:00:00.000Z",
  "classroom merge stamps topic activity time for parent-report seed"
);

const studentPayloads = [
  {
    studentId: studentA,
    studentFullName: "Student A",
    studentFullNameMasked: "S*** A",
    membershipId: "mem-a",
    payload: structuredClone(emptyLearningPayload),
  },
  {
    studentId: studentB,
    studentFullName: "Student B",
    studentFullNameMasked: "S*** B",
    membershipId: "mem-b",
    payload: structuredClone(emptyLearningPayload),
  },
];

mergeClassroomActivityRollupIntoReportPayload(studentPayloads[0].payload, rollups.get(studentA));
mergeClassroomActivityRollupIntoReportPayload(studentPayloads[1].payload, rollups.get(studentB));

const aggregated = aggregateClassReportFromStudentPayloads(studentPayloads);
assert.equal(aggregated.cohortSummary.studentsWithActivity, 2, "both students have classroom activity");
assert.equal(aggregated.cohortSummary.totalAnswers, 30);
assert.equal(aggregated.cohortSummary.correctAnswers, 21);
assert.equal(aggregated.cohortSummary.accuracy, 70);
assert.equal(aggregated.subjects.geometry.answers, 30);

const zeroDirectLinkPayloads = [
  {
    studentId: studentA,
    studentFullNameMasked: "S*** A",
    payload: {
      summary: { totalSessions: 0, totalAnswers: 0, correctAnswers: 0, wrongAnswers: 0, accuracy: 0 },
      subjects: {},
      dailyActivity: [],
      recentMistakes: [],
    },
  },
];
mergeClassroomActivityRollupIntoReportPayload(
  zeroDirectLinkPayloads[0].payload,
  rollups.get(studentA)
);
const schoolManagedAgg = aggregateClassReportFromStudentPayloads(zeroDirectLinkPayloads);
assert.ok(schoolManagedAgg.cohortSummary.studentsWithActivity > 0, "teacher_students=0 path still counts activity");
assert.ok(schoolManagedAgg.cohortSummary.totalAnswers > 0);

console.log("teacher-class-report-aggregation-unit: ok");
