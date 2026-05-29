#!/usr/bin/env node
/**
 * Focused self-check for the 4-finding bundle fix in the diagnostic/report engine.
 * Pure in-memory verification — no DB, no network.
 *
 * Covers:
 * - Finding 2: _dailyBySubject is emitted from the aggregator and propagated by the
 *   classroom rollup merge.
 * - Finding 3: buildClassroomActivityRollupsByStudentId applies a submission-time
 *   date filter and exposes qualifyingActivityIds.
 * - Finding 1 + Finding 2C: filterReportByPermittedSubjects rebuilds parentFacing
 *   and recomputes dailyActivity from _dailyBySubject after the subject filter.
 */

import assert from "node:assert/strict";
import {
  buildClassroomActivityRollupsByStudentId,
  mergeClassroomActivityRollupIntoReportPayload,
} from "../../lib/teacher-server/classroom-activity-class-report.server.js";
import { filterReportByPermittedSubjects } from "../../lib/school-server/school-subjects.server.js";

const studentId = "11111111-1111-4111-8111-111111111111";

const inRangeFromIso = "2026-05-01T00:00:00.000Z";
const inRangeToExclusiveIso = "2026-06-01T00:00:00.000Z";

const activityInside = {
  id: "act-inside",
  subject: "math",
  topic: "addition",
  closed_at: "2026-05-10T12:00:00.000Z",
};

const activityLifecycleOutside = {
  id: "act-lifecycle-outside",
  subject: "geometry",
  topic: "shapes",
  closed_at: "2026-06-15T12:00:00.000Z",
  activated_at: "2026-04-01T12:00:00.000Z",
};

const activityLifecycleAndSubmitOutside = {
  id: "act-fully-outside",
  subject: "english",
  topic: "vocab",
  closed_at: "2026-07-01T12:00:00.000Z",
  activated_at: "2026-06-15T12:00:00.000Z",
};

const statuses = [
  {
    activity_id: activityInside.id,
    student_id: studentId,
    status: "submitted",
    submitted_at: "2026-05-10T12:00:00.000Z",
    answers_count: 4,
    correct_count: 3,
  },
  {
    activity_id: activityLifecycleOutside.id,
    student_id: studentId,
    status: "submitted",
    submitted_at: "2026-05-20T12:00:00.000Z",
    answers_count: 6,
    correct_count: 2,
  },
  {
    activity_id: activityLifecycleAndSubmitOutside.id,
    student_id: studentId,
    status: "submitted",
    submitted_at: "2026-06-20T12:00:00.000Z",
    answers_count: 8,
    correct_count: 8,
  },
];

const rollups = buildClassroomActivityRollupsByStudentId({
  activities: [activityInside, activityLifecycleOutside, activityLifecycleAndSubmitOutside],
  statuses,
  studentIds: [studentId],
  fromIso: inRangeFromIso,
  toIsoExclusive: inRangeToExclusiveIso,
});

assert.ok(rollups.qualifyingActivityIds, "qualifyingActivityIds attached to map");
assert.equal(
  rollups.qualifyingActivityIds.size,
  2,
  "two activities have status rows whose submitted_at falls inside the window"
);
assert.ok(rollups.qualifyingActivityIds.has(activityInside.id));
assert.ok(
  rollups.qualifyingActivityIds.has(activityLifecycleOutside.id),
  "lifecycle-outside activity is now included because submitted_at is in range"
);
assert.ok(
  !rollups.qualifyingActivityIds.has(activityLifecycleAndSubmitOutside.id),
  "activity with submitted_at outside the window is excluded"
);

const studentRollup = rollups.get(studentId);
assert.equal(studentRollup.answers, 4 + 6, "answers sum reflects only in-range submissions");
assert.equal(studentRollup.correct, 3 + 2);
assert.ok(studentRollup.dailyBySubject, "dailyBySubject is present on the rollup");
assert.equal(studentRollup.dailyBySubject["2026-05-10"].math.answers, 4);
assert.equal(studentRollup.dailyBySubject["2026-05-20"].geometry.answers, 6);

const homePayload = {
  range: { from: "2026-05-01", to: "2026-05-31" },
  summary: {
    totalSessions: 1,
    totalAnswers: 2,
    correctAnswers: 1,
    wrongAnswers: 1,
    accuracy: 50,
  },
  subjects: {
    math: { sessions: 1, answers: 2, correct: 1, wrong: 1, topics: {} },
    geometry: { sessions: 0, answers: 0, correct: 0, wrong: 0, topics: {} },
    english: { sessions: 0, answers: 0, correct: 0, wrong: 0, topics: {} },
    hebrew: { sessions: 0, answers: 0, correct: 0, wrong: 0, topics: {} },
    science: { sessions: 0, answers: 0, correct: 0, wrong: 0, topics: {} },
    moledet_geography: { sessions: 0, answers: 0, correct: 0, wrong: 0, topics: {} },
  },
  dailyActivity: [
    {
      date: "2026-05-05",
      sessions: 1,
      answers: 2,
      correct: 1,
      wrong: 1,
      durationSeconds: 60,
    },
  ],
  _dailyBySubject: {
    "2026-05-05": {
      math: { sessions: 1, answers: 2, correct: 1, wrong: 1, durationSeconds: 60 },
    },
  },
  recentMistakes: [],
  parentFacing: {
    insights: ["stale insight referencing geometry"],
    homeRecommendations: ["stale geometry recommendation"],
    teacherMessages: [{ id: "msg-keep", body: "must remain" }],
  },
};

mergeClassroomActivityRollupIntoReportPayload(homePayload, studentRollup);

assert.equal(homePayload.subjects.math.answers, 2 + 4);
assert.equal(homePayload.subjects.geometry.answers, 0 + 6);
assert.ok(homePayload._dailyBySubject, "_dailyBySubject merged into payload");
assert.equal(homePayload._dailyBySubject["2026-05-10"].math.answers, 4);
assert.equal(homePayload._dailyBySubject["2026-05-20"].geometry.answers, 6);
assert.equal(homePayload._dailyBySubject["2026-05-05"].math.answers, 2);

const filteredForMath = filterReportByPermittedSubjects(homePayload, new Set(["math"]));

assert.deepEqual(
  Object.keys(filteredForMath.subjects).sort(),
  ["math"],
  "only the math subject remains after the filter"
);
assert.equal(
  filteredForMath.summary.totalAnswers,
  filteredForMath.subjects.math.answers,
  "summary reflects only the visible math subject"
);

const dailyAnswers = filteredForMath.dailyActivity.reduce(
  (sum, row) => sum + Number(row.answers || 0),
  0
);
assert.equal(
  dailyAnswers,
  filteredForMath.subjects.math.answers,
  "dailyActivity totals reconcile with the visible math subject (Finding 2)"
);
assert.ok(
  !filteredForMath.dailyActivity.some((row) => row.date === "2026-05-20"),
  "geometry-only day is excluded after subject filter"
);

assert.ok(
  filteredForMath.parentFacing,
  "parentFacing preserved after filter"
);
assert.deepEqual(
  filteredForMath.parentFacing.teacherMessages,
  [{ id: "msg-keep", body: "must remain" }],
  "teacherMessages are preserved (Finding 1)"
);
assert.notEqual(
  filteredForMath.parentFacing.insights[0],
  "stale insight referencing geometry",
  "insights were rebuilt from the filtered payload (Finding 1)"
);
assert.equal(
  Object.prototype.hasOwnProperty.call(filteredForMath, "_dailyBySubject"),
  false,
  "_dailyBySubject is stripped from filtered payload (no scope leak in API JSON)"
);

const emptyPerm = filterReportByPermittedSubjects(homePayload, new Set());
assert.deepEqual(Object.keys(emptyPerm.subjects), [], "empty permission yields no subjects");
assert.equal(emptyPerm.summary.totalAnswers, 0, "summary zeroed under empty permission");
assert.equal(
  emptyPerm.dailyActivity.length,
  0,
  "dailyActivity empty when no subjects are permitted"
);
assert.ok(emptyPerm.parentFacing, "parentFacing still present under empty permission");
assert.deepEqual(
  emptyPerm.parentFacing.teacherMessages,
  [{ id: "msg-keep", body: "must remain" }],
  "teacherMessages preserved under empty permission"
);
assert.equal(
  Object.prototype.hasOwnProperty.call(emptyPerm, "_dailyBySubject"),
  false,
  "_dailyBySubject is stripped from empty-permission payload"
);

const unfiltered = filterReportByPermittedSubjects(homePayload, null);
assert.equal(
  unfiltered.subjects.math.answers,
  homePayload.subjects.math.answers,
  "null permission is a no-op for subject filtering (admin / private teacher bypass)"
);
assert.equal(
  Object.prototype.hasOwnProperty.call(unfiltered, "_dailyBySubject"),
  false,
  "_dailyBySubject is stripped from unrestricted payload before client response"
);

console.log("diagnostic-report-bundle-self-check: ok");
