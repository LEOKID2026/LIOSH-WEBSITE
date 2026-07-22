/**
 * Phase 4 — Aggregate Filter test gate
 *
 * Mandatory before Phase 5.
 * Tests that diagnosticAccuracy is the sole visible accuracy in all report payloads,
 * that learning/step-by-step/competitive answers are bucketed correctly, and that
 * raw accuracy never leaks into human-facing API responses.
 *
 * Run with: node --test tests/learning/phase4-aggregate-filter.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  aggregateReportPayloadFromActivityRows,
  mergeLearningActivityBookData,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";

import {
  buildClassroomActivityRollupsByStudentId,
  mergeClassroomActivityRollupIntoReportPayload,
} from "../../lib/teacher-server/classroom-activity-class-report.server.js";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeStudent(id = "stu-001", grade = "g3") {
  return { id, full_name: "Test Student", grade_level: grade, is_active: true };
}

function makeSession(id, subject, topic = "algebra", mode = "practice") {
  return {
    id,
    student_id: "stu-001",
    subject,
    topic,
    started_at: "2026-01-10T10:00:00Z",
    created_at: "2026-01-10T10:00:00Z",
    ended_at: "2026-01-10T10:30:00Z",
    duration_seconds: 300,
    status: "completed",
    metadata: { mode },
  };
}

function makeAnswer(sessionId, subject, topic, isCorrect, mode, extraPayload = {}) {
  return {
    id: `ans-${Math.random().toString(36).slice(2)}`,
    student_id: "stu-001",
    learning_session_id: sessionId,
    question_id: `q-${Math.random().toString(36).slice(2)}`,
    is_correct: isCorrect,
    answered_at: "2026-01-10T10:05:00Z",
    created_at: "2026-01-10T10:05:00Z",
    answer_payload: {
      subject,
      topic,
      gameMode: mode,
      ...extraPayload,
    },
  };
}

function makeClassifiedAnswer(sessionId, subject, topic, isCorrect, isDiagnosticEligible, evidenceCategory, extraPayload = {}) {
  return {
    id: `ans-${Math.random().toString(36).slice(2)}`,
    student_id: "stu-001",
    learning_session_id: sessionId,
    question_id: `q-${Math.random().toString(36).slice(2)}`,
    is_correct: isCorrect,
    answered_at: "2026-01-10T10:05:00Z",
    created_at: "2026-01-10T10:05:00Z",
    answer_payload: {
      subject,
      topic,
      isDiagnosticEligible,
      evidenceCategory,
      contextFlags: { afterStepByStep: false, contextAfterBookReading: false, hasHints: false },
      ...extraPayload,
    },
  };
}

const FROM_DATE = new Date("2026-01-01");
const TO_DATE = new Date("2026-01-31");
const FETCH_META = { sessionsFilterField: "started_at", answersFilterField: "answered_at" };

// ── Test 1: learning answers at 100% + practice at 40% ──────────────────────

describe("Phase 4 - diagnostic bucket separation", () => {
  test("10 learning-mode answers at 100% + 5 practice at 40% → diagnosticAccuracy=40%, learningAnswers=10", () => {
    const session = makeSession("sess-1", "math", "algebra", "learning");
    const sessions = [session];

    const learningAnswers = Array.from({ length: 10 }, (_, i) =>
      makeClassifiedAnswer("sess-1", "math", "algebra", true, false, "learning_guided")
    );
    const practiceAnswers = [
      makeClassifiedAnswer("sess-1", "math", "algebra", true, true, "diagnostic_independent"),
      makeClassifiedAnswer("sess-1", "math", "algebra", true, true, "diagnostic_independent"),
      makeClassifiedAnswer("sess-1", "math", "algebra", false, true, "diagnostic_independent"),
      makeClassifiedAnswer("sess-1", "math", "algebra", false, true, "diagnostic_independent"),
      makeClassifiedAnswer("sess-1", "math", "algebra", false, true, "diagnostic_independent"),
    ];
    const answers = [...learningAnswers, ...practiceAnswers];

    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      sessions,
      answers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );

    const mathSubj = result.subjects.math;
    assert.equal(mathSubj.diagnosticAnswers, 5, "diagnosticAnswers should be 5 (only practice)");
    assert.equal(mathSubj.diagnosticCorrect, 2, "diagnosticCorrect should be 2");
    assert.equal(mathSubj.diagnosticAccuracy, 40, "diagnosticAccuracy should be 40%");
    assert.equal(mathSubj.answers, 15, "parent totals include learning_guided + practice");
    assert.equal(mathSubj.learningAnswers, 10, "learning bucket tracks non-diagnostic attempts");

    const summary = result.summary;
    assert.equal(summary.diagnosticAnswers, 5, "summary.diagnosticAnswers should be 5");
    assert.equal(summary.diagnosticAccuracy, 40, "summary.diagnosticAccuracy should be 40%");
    assert.equal(summary.totalAnswers, 15, "summary parent practice totals");
    assert.equal(summary.learningAnswers, 10, "summary learning bucket");
  });

  test("5 challenge answers at 40% (2/5 correct) → competitiveAccuracy=40%, diagnosticAnswers unaffected", () => {
    const session = makeSession("sess-2", "math", "algebra", "challenge");
    const practiceAnswer = makeClassifiedAnswer("sess-2", "math", "algebra", true, true, "diagnostic_independent");
    const challengeAnswers = [
      makeClassifiedAnswer("sess-2", "math", "algebra", true, true, "diagnostic_competitive"),
      makeClassifiedAnswer("sess-2", "math", "algebra", true, true, "diagnostic_competitive"),
      makeClassifiedAnswer("sess-2", "math", "algebra", false, true, "diagnostic_competitive"),
      makeClassifiedAnswer("sess-2", "math", "algebra", false, true, "diagnostic_competitive"),
      makeClassifiedAnswer("sess-2", "math", "algebra", false, true, "diagnostic_competitive"),
    ];
    const answers = [practiceAnswer, ...challengeAnswers];

    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      answers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );

    const mathSubj = result.subjects.math;
    assert.equal(mathSubj.competitiveAnswers, 5, "challenge answers go to competitive bucket");
    assert.equal(mathSubj.competitiveCorrect, 2, "2/5 challenge answers correct");
    assert.equal(mathSubj.competitiveAccuracy, 40, "competitiveAccuracy should be 40%");
    assert.equal(mathSubj.diagnosticAnswers, 1, "diagnosticAnswers should be 1 (only practice)");
    assert.equal(mathSubj.diagnosticAccuracy, 100, "diagnosticAccuracy should be 100% (practice only)");
    assert.equal(mathSubj.answers, 1, "parent practice totals exclude competitive game attempts");

    const summary = result.summary;
    assert.equal(summary.competitiveAnswers, 5, "summary.competitiveAnswers should be 5");
    assert.equal(summary.competitiveCorrect, 2, "summary.competitiveCorrect should be 2");
    assert.equal(summary.competitiveAccuracy, 40, "summary.competitiveAccuracy should be 40%");
    assert.equal(summary.diagnosticAnswers, 1, "summary.diagnosticAnswers should be 1");
  });

  test("afterStepByStep=true answers do not appear in diagnosticAnswers", () => {
    const session = makeSession("sess-3", "math", "algebra", "practice");
    const stepByStepAnswer = makeClassifiedAnswer(
      "sess-3", "math", "algebra", true, false, "learning_guided",
      { contextFlags: { afterStepByStep: true, contextAfterBookReading: false, hasHints: false, stepByStepOverride: true } }
    );
    const normalPractice = makeClassifiedAnswer("sess-3", "math", "algebra", true, true, "diagnostic_independent");

    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      [stepByStepAnswer, normalPractice],
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );

    const mathSubj = result.subjects.math;
    assert.equal(mathSubj.diagnosticAnswers, 1, "only 1 diagnostic answer (normal practice)");
    assert.equal(mathSubj.answers, 2, "step-by-step retries count in parent totals");
    assert.equal(mathSubj.learningAnswers, 1, "step-by-step in learning bucket, not diagnostic");
    assert.equal(mathSubj.stepByStepCount, 1, "stepByStepCount tracks guided retries");
    assert.equal(mathSubj.diagnosticAccuracy, 100, "diagnosticAccuracy should be 100% (normal practice only)");
  });

  test("unclassified legacy answers fall into learningAnswers (not diagnostic)", () => {
    const session = makeSession("sess-4", "math", "algebra", "unknown");
    const legacyAnswer = makeAnswer("sess-4", "math", "algebra", true, "unknown_mode");

    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      [legacyAnswer],
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );

    const mathSubj = result.subjects.math;
    assert.equal(mathSubj.diagnosticAnswers, 0, "unclassified should not be counted");
    assert.equal(mathSubj.learningAnswers, 0, "unclassified is excluded from report evidence");
    assert.equal(mathSubj.answers, 0, "unclassified legacy answers are not counted");
    assert.equal(mathSubj.diagnosticAccuracy, 0, "no diagnostic answers → diagnosticAccuracy=0");
  });

  test("legacy mode-based classification: practice mode → diagnostic", () => {
    const session = makeSession("sess-5", "math", "algebra", "practice");
    const practiceAnswer = makeAnswer("sess-5", "math", "algebra", false, "practice");

    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      [practiceAnswer],
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );

    const mathSubj = result.subjects.math;
    assert.equal(mathSubj.diagnosticAnswers, 1, "practice mode → diagnostic");
    assert.equal(mathSubj.diagnosticCorrect, 0, "wrong answer");
    assert.equal(mathSubj.diagnosticAccuracy, 0, "0%");
  });

  test("legacy mode-based classification: learning mode → not diagnostic", () => {
    const session = makeSession("sess-6", "math", "algebra", "learning");
    const learningAnswer = makeAnswer("sess-6", "math", "algebra", true, "learning");

    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      [learningAnswer],
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );

    const mathSubj = result.subjects.math;
    assert.equal(mathSubj.diagnosticAnswers, 0, "learning mode → not diagnostic");
    assert.equal(mathSubj.learningAnswers, 1, "learning mode bucket");
    assert.equal(mathSubj.answers, 1, "classified learning_guided counts in parent totals");
  });
});

// ── Test 2: stripInternalReportPayloadFields ─────────────────────────────────

describe("Phase 4 - _rawActivityAccuracy not in human-facing responses", () => {
  test("stripInternalReportPayloadFields removes raw accuracy from subjects and summary", () => {
    const payload = {
      summary: { totalAnswers: 10, accuracy: 70, diagnosticAccuracy: 60 },
      subjects: {
        math: {
          answers: 10, correct: 7, wrong: 3,
          accuracy: 70,
          diagnosticAccuracy: 60,
          diagnosticAnswers: 5,
          diagnosticCorrect: 3,
          topics: {
            algebra: {
              answers: 10, correct: 7, wrong: 3,
              accuracy: 70,
              diagnosticAccuracy: 60,
              byContentGrade: {
                g3: { answers: 5, correct: 3, accuracy: 60, diagnosticAccuracy: 60 },
              },
            },
          },
        },
      },
      _dailyBySubject: { "2026-01-10": { math: { answers: 5 } } },
      meta: { _rawActivityAccuracy: 70 },
    };

    const stripped = stripInternalReportPayloadFields(payload);

    assert.equal(stripped._dailyBySubject, undefined, "_dailyBySubject should be stripped");
    assert.equal(stripped.summary.accuracy, undefined, "summary.accuracy should be stripped");
    assert.equal(stripped.summary.diagnosticAccuracy, 60, "summary.diagnosticAccuracy preserved");
    assert.equal(stripped.subjects.math.accuracy, undefined, "subject accuracy stripped");
    assert.equal(stripped.subjects.math.diagnosticAccuracy, 60, "diagnosticAccuracy preserved in subject");
    assert.equal(stripped.subjects.math.topics.algebra.accuracy, undefined, "topic accuracy stripped");
    assert.equal(stripped.subjects.math.topics.algebra.diagnosticAccuracy, 60, "topic diagnosticAccuracy preserved");
    assert.equal(
      stripped.subjects.math.topics.algebra.byContentGrade?.g3?.accuracy,
      undefined,
      "grade slice accuracy stripped"
    );
    assert.equal(
      stripped.subjects.math.topics.algebra.byContentGrade?.g3?.diagnosticAccuracy,
      60,
      "grade slice diagnosticAccuracy preserved"
    );

    // meta._rawActivityAccuracy must be REMOVED from the public stripped payload
    assert.equal(
      Object.prototype.hasOwnProperty.call(stripped.meta, "_rawActivityAccuracy"),
      false,
      "meta._rawActivityAccuracy must be absent from stripped public payload"
    );

    // Confirm _rawActivityAccuracy does NOT exist at top-level or in subjects
    assert.equal(Object.prototype.hasOwnProperty.call(stripped, "_rawActivityAccuracy"), false);
    assert.equal(
      Object.prototype.hasOwnProperty.call(stripped.subjects.math, "_rawActivityAccuracy"),
      false
    );
  });

  test("aggregator puts _rawActivityAccuracy only in meta, not in subjects", () => {
    const session = makeSession("sess-7", "math", "algebra", "practice");
    const answer = makeClassifiedAnswer("sess-7", "math", "algebra", true, true, "diagnostic_independent");

    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      [answer],
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );

    assert.ok(result.meta._rawActivityAccuracy !== undefined, "_rawActivityAccuracy should be in meta");
    assert.equal(
      Object.prototype.hasOwnProperty.call(result, "_rawActivityAccuracy"),
      false,
      "_rawActivityAccuracy NOT at top level"
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(result.subjects.math, "_rawActivityAccuracy"),
      false,
      "_rawActivityAccuracy NOT in subjects.math"
    );
    assert.ok(result.summary.diagnosticAccuracy !== undefined, "summary.diagnosticAccuracy present");
    assert.ok(result.subjects.math.diagnosticAccuracy !== undefined, "subjects.math.diagnosticAccuracy present");
  });
});

// ── Test 3: Classroom rollup classification ───────────────────────────────────

describe("Phase 4 - classroom rollup classification by mode", () => {
  test("quiz mode activity → diagnosticAnswers, not learningAnswers", () => {
    const activities = [
      { id: "act-1", subject: "math", topic: "algebra", class_id: "cls-1",
        mode: "quiz", status: "active",
        closed_at: null, activated_at: "2026-01-10T08:00:00Z", created_at: "2026-01-10T08:00:00Z" },
    ];
    const statuses = [
      { activity_id: "act-1", student_id: "stu-001", status: "submitted",
        submitted_at: "2026-01-10T10:00:00Z", answers_count: 5, correct_count: 2 },
    ];

    const rollupMap = buildClassroomActivityRollupsByStudentId({
      activities, statuses, studentIds: ["stu-001"],
    });

    const rollup = rollupMap.get("stu-001");
    assert.equal(rollup.diagnosticAnswers, 5, "quiz → 5 diagnostic answers");
    assert.equal(rollup.diagnosticCorrect, 2, "quiz → 2 correct diagnostic");
    assert.equal(rollup.learningAnswers, 0, "quiz → 0 learning answers");
    assert.equal(rollup.subjects.math.diagnosticAnswers, 5, "subject diagnostic answers");
    assert.equal(rollup.subjects.math.topics.algebra.diagnosticAnswers, 5, "topic diagnostic answers");
  });

  test("guided_practice mode activity → learningAnswers, not diagnosticAnswers", () => {
    const activities = [
      { id: "act-2", subject: "math", topic: "algebra", class_id: "cls-1",
        mode: "guided_practice", status: "active",
        closed_at: null, activated_at: "2026-01-10T08:00:00Z", created_at: "2026-01-10T08:00:00Z" },
    ];
    const statuses = [
      { activity_id: "act-2", student_id: "stu-001", status: "submitted",
        submitted_at: "2026-01-10T10:00:00Z", answers_count: 4, correct_count: 4 },
    ];

    const rollupMap = buildClassroomActivityRollupsByStudentId({
      activities, statuses, studentIds: ["stu-001"],
    });

    const rollup = rollupMap.get("stu-001");
    assert.equal(rollup.diagnosticAnswers, 0, "guided_practice → 0 diagnostic answers");
    assert.equal(rollup.learningAnswers, 4, "guided_practice → 4 learning answers");
  });

  test("mergeClassroomActivityRollupIntoReportPayload merges diagnostic fields", () => {
    const activities = [
      { id: "act-3", subject: "math", topic: "algebra", class_id: "cls-1",
        mode: "quiz", status: "active",
        closed_at: null, activated_at: "2026-01-10T08:00:00Z", created_at: "2026-01-10T08:00:00Z" },
    ];
    const statuses = [
      { activity_id: "act-3", student_id: "stu-001", status: "submitted",
        submitted_at: "2026-01-10T10:00:00Z", answers_count: 10, correct_count: 7 },
    ];
    const rollupMap = buildClassroomActivityRollupsByStudentId({
      activities, statuses, studentIds: ["stu-001"],
    });
    const rollup = rollupMap.get("stu-001");

    // Simulate a base payload from aggregateReportPayloadFromActivityRows
    const baseSession = makeSession("sess-8", "math", "algebra");
    const freeAnswer = makeClassifiedAnswer("sess-8", "math", "algebra", true, true, "diagnostic_independent");
    const basePayload = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [baseSession],
      [freeAnswer],
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );

    // Before merge: 1 diagnostic answer from free practice
    assert.equal(basePayload.subjects.math.diagnosticAnswers, 1);

    // Merge classroom rollup
    mergeClassroomActivityRollupIntoReportPayload(basePayload, rollup);

    // After merge: 1 (free) + 10 (quiz classroom) = 11 diagnostic answers
    assert.equal(basePayload.subjects.math.diagnosticAnswers, 11, "merged: 11 diagnostic answers");
    assert.equal(basePayload.subjects.math.diagnosticCorrect, 8, "merged: 8 correct");
    assert.ok(
      Math.abs(basePayload.subjects.math.diagnosticAccuracy - (8/11)*100) < 0.1,
      "diagnosticAccuracy correctly computed after merge"
    );
    assert.equal(basePayload.summary.diagnosticAnswers, 11, "summary diagnostic answers after merge");
  });
});

// ── Test 4: per-topic diagnostic accuracy ─────────────────────────────────────

describe("Phase 4 - per-topic diagnosticAccuracy", () => {
  test("topics get diagnosticAccuracy computed separately from raw accuracy", () => {
    const session = makeSession("sess-9", "math", "algebra", "mixed");
    const answers = [
      // 2 learning-mode (not diagnostic)
      makeClassifiedAnswer("sess-9", "math", "algebra", true, false, "learning_guided"),
      makeClassifiedAnswer("sess-9", "math", "algebra", true, false, "learning_guided"),
      // 3 practice-mode (diagnostic), 1/3 correct
      makeClassifiedAnswer("sess-9", "math", "algebra", true, true, "diagnostic_independent"),
      makeClassifiedAnswer("sess-9", "math", "algebra", false, true, "diagnostic_independent"),
      makeClassifiedAnswer("sess-9", "math", "algebra", false, true, "diagnostic_independent"),
    ];

    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      answers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );

    const algebraTopic = result.subjects.math.topics.algebra;
    assert.ok(algebraTopic, "algebra topic should exist");
    assert.equal(algebraTopic.answers, 5, "parent totals include learning_guided + diagnostic");
    assert.equal(algebraTopic.diagnosticAnswers, 3, "3 diagnostic answers");
    assert.equal(algebraTopic.diagnosticCorrect, 1, "1 correct diagnostic");
    assert.ok(
      Math.abs(algebraTopic.diagnosticAccuracy - (1/3)*100) < 0.1,
      "topic diagnosticAccuracy ≈ 33.33%"
    );
    assert.equal(algebraTopic.learningAnswers, 2, "learning bucket for guided attempts");
  });
});

// ── Test 5: parent activity attempts included in guardian report ──────────────

describe("Phase 4 - parent activity attempts classification", () => {
  test("parent activity attempt with quiz mode → diagnostic bucket", () => {
    const parentAttempt = {
      id: "par-att-1",
      student_id: "stu-001",
      activity_id: "par-act-1",
      question_index: 0,
      skill_key: "algebra",
      is_correct: true,
      time_spent_ms: 10000,
      hints_used: 0,
      answered_at: "2026-01-10T11:00:00Z",
      question_snapshot: {
        isDiagnosticEligible: true,
        evidenceCategory: "diagnostic_independent",
        contextFlags: { afterStepByStep: false, contextAfterBookReading: false, hasHints: false },
      },
      parent_assigned_activities: {
        subject: "math",
        topic: "algebra",
        subtopic: null,
        mode: "quiz",
        difficulty_level: "medium",
      },
    };

    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [],
      [],
      FROM_DATE,
      TO_DATE,
      FETCH_META,
      [parentAttempt]
    );

    const mathSubj = result.subjects.math;
    assert.equal(mathSubj.diagnosticAnswers, 1, "parent quiz attempt → 1 diagnostic answer");
    assert.equal(mathSubj.diagnosticCorrect, 1, "correct");
    assert.equal(mathSubj.diagnosticAccuracy, 100, "100% accuracy");
    assert.equal(mathSubj.learningAnswers, 0, "not in learning bucket");
  });

  test("parent activity attempt with guided_practice mode → diagnostic bucket", () => {
    const parentAttempt = {
      id: "par-att-2",
      student_id: "stu-001",
      activity_id: "par-act-2",
      question_index: 0,
      skill_key: "algebra",
      is_correct: true,
      time_spent_ms: 10000,
      hints_used: 0,
      answered_at: "2026-01-10T11:00:00Z",
      question_snapshot: {
        creditedTimeMs: 8000,
        isDiagnosticEligible: false,
        evidenceCategory: "learning_guided",
        contextFlags: { afterStepByStep: false, contextAfterBookReading: false, hasHints: false },
      },
      parent_assigned_activities: {
        subject: "math",
        topic: "algebra",
        subtopic: null,
        mode: "guided_practice",
        difficulty_level: "medium",
      },
    };

    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [],
      [],
      FROM_DATE,
      TO_DATE,
      FETCH_META,
      [parentAttempt]
    );

    const mathSubj = result.subjects.math;
    assert.equal(mathSubj.diagnosticAnswers, 1, "parent guided_practice → diagnostic");
    assert.equal(mathSubj.learningAnswers, 0, "parent guided_practice → not learning-only");
    assert.equal(mathSubj.durationSeconds, 8, "credited time adds to subject duration");
  });
});

// ── Test 6: meta version and structure ───────────────────────────────────────

describe("Phase 4 - payload meta and version", () => {
  test("result.meta.version is phase-8-mcq-engine-contract", () => {
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [],
      [],
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );

    assert.equal(result.meta.version, "phase-8-mcq-engine-contract");
    // _rawActivityAccuracy lives in the unstripped internal result only
    assert.ok(
      Object.prototype.hasOwnProperty.call(result.meta, "_rawActivityAccuracy"),
      "_rawActivityAccuracy present in unstripped aggregator output (internal audit use)"
    );
    // After stripping, it must be absent from the public payload
    const strippedResult = stripInternalReportPayloadFields(result);
    assert.equal(
      Object.prototype.hasOwnProperty.call(strippedResult.meta, "_rawActivityAccuracy"),
      false,
      "_rawActivityAccuracy absent from stripped public payload"
    );
  });

  test("empty report has zeros for all diagnostic fields, not undefined", () => {
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [],
      [],
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );

    assert.equal(typeof result.summary.diagnosticAnswers, "number");
    assert.equal(result.summary.diagnosticAnswers, 0);
    assert.equal(result.summary.diagnosticAccuracy, 0);
    assert.equal(result.summary.competitiveAnswers, 0);
    assert.equal(result.summary.learningAnswers, 0);
    assert.equal(result.summary.stepByStepCount, 0);

    for (const subj of Object.values(result.subjects)) {
      assert.equal(typeof subj.diagnosticAnswers, "number");
      assert.equal(subj.diagnosticAnswers, 0);
      assert.equal(typeof subj.diagnosticAccuracy, "number");
      assert.equal(subj.diagnosticAccuracy, 0);
    }
  });
});

// ── Test 7: speed and marathon competitive classification ─────────────────────

describe("Phase 4 - speed and marathon are competitive", () => {
  test("speed and marathon answers go to competitive bucket", () => {
    const session = makeSession("sess-10", "math", "algebra", "speed");
    const speedAnswers = [
      makeAnswer("sess-10", "math", "algebra", true, "speed"),
      makeAnswer("sess-10", "math", "algebra", false, "speed"),
    ];
    const marathonAnswers = [
      makeAnswer("sess-10", "math", "algebra", true, "marathon"),
      makeAnswer("sess-10", "math", "algebra", true, "marathon"),
      makeAnswer("sess-10", "math", "algebra", false, "marathon"),
    ];

    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      [...speedAnswers, ...marathonAnswers],
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );

    const mathSubj = result.subjects.math;
    assert.equal(mathSubj.competitiveAnswers, 5, "speed/marathon answers go to competitive bucket");
    assert.equal(mathSubj.competitiveCorrect, 3, "3/5 speed+marathon answers correct");
    assert.equal(mathSubj.competitiveAccuracy, 60, "competitiveAccuracy should be 60%");
    assert.equal(mathSubj.answers, 0, "parent practice totals exclude competitive game attempts");
    assert.equal(mathSubj.diagnosticAnswers, 0, "speed/marathon do NOT contaminate diagnosticAnswers");
    assert.equal(mathSubj.diagnosticAccuracy, 0, "no diagnostic answers → diagnosticAccuracy=0");

    const summary = result.summary;
    assert.equal(summary.competitiveAnswers, 5);
    assert.equal(summary.competitiveCorrect, 3);
    assert.equal(summary.competitiveAccuracy, 60);
    assert.equal(summary.diagnosticAnswers, 0);
  });
});

// ── Test 8: stripInternalReportPayloadFields idempotency ─────────────────────

describe("Phase 4 - stripInternalReportPayloadFields contract", () => {
  test("stripping is idempotent (applying twice gives same result)", () => {
    const session = makeSession("sess-11", "math", "algebra", "practice");
    const answer = makeClassifiedAnswer("sess-11", "math", "algebra", true, true, "diagnostic_independent");
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(), [session], [answer], FROM_DATE, TO_DATE, FETCH_META
    );
    const stripped1 = stripInternalReportPayloadFields(result);
    const stripped2 = stripInternalReportPayloadFields(stripped1);

    assert.deepEqual(stripped1, stripped2, "stripping twice gives same result");
    assert.equal(stripped1.subjects.math.accuracy, undefined, "accuracy stripped");
    assert.equal(stripped1.subjects.math.diagnosticAccuracy, 100, "diagnosticAccuracy=100%");
  });

  test("subject diagnostic fields are NOT stripped (only raw accuracy)", () => {
    const session = makeSession("sess-12", "math", "algebra", "practice");
    const answer = makeClassifiedAnswer("sess-12", "math", "algebra", false, true, "diagnostic_independent");
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(), [session], [answer], FROM_DATE, TO_DATE, FETCH_META
    );
    const stripped = stripInternalReportPayloadFields(result);

    assert.equal(stripped.subjects.math.diagnosticAnswers, 1, "diagnosticAnswers preserved");
    assert.equal(stripped.subjects.math.diagnosticCorrect, 0, "diagnosticCorrect preserved");
    assert.equal(stripped.subjects.math.diagnosticWrong, 1, "diagnosticWrong preserved");
    assert.equal(stripped.subjects.math.diagnosticAccuracy, 0, "diagnosticAccuracy preserved");
    assert.equal(stripped.subjects.math.competitiveAnswers, 0, "competitiveAnswers preserved");
    assert.equal(stripped.subjects.math.learningAnswers, 0, "learningAnswers preserved");
  });
});

// ── Phase 5 regression: book rows excluded from diagnostic buckets ───────────

describe("Phase 4/5 - book data does not affect diagnosticAccuracy", () => {
  test("mergeLearningActivityBookData leaves diagnostic summary unchanged", () => {
    const session = makeSession("sess-book-reg", "math", "algebra", "practice");
    const answer = makeClassifiedAnswer(
      "sess-book-reg",
      "math",
      "algebra",
      true,
      true,
      "diagnostic_independent"
    );
    const base = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      [answer],
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );
    const merged = mergeLearningActivityBookData(
      base,
      [{ subject: "math", credited_dwell_ms: 300_000, page_read: true }],
      [{ id: "brs-1" }],
      []
    );
    assert.equal(merged.summary.diagnosticAnswers, 1);
    assert.equal(merged.summary.diagnosticAccuracy, 100);
    assert.ok(merged.learningActivity.bookReadingMinutes > 0);
    assert.equal(merged.subjects.math.diagnosticAnswers, 1);
  });
});
