/**
 * P0 mixed evidence fixture — only self_practice + parent_assigned count toward report/diagnostic.
 * Run: node --test tests/learning/parent-report-mixed-evidence-fixture.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { aggregateReportPayloadFromActivityRows } from "../../lib/parent-server/report-data-aggregate.server.js";

const FROM = new Date("2026-01-01");
const TO = new Date("2026-01-31");
const META = { sessionsFilterField: "started_at", answersFilterField: "answered_at" };

function student() {
  return { id: "stu-mix", full_name: "Mix Student", grade_level: "g3", is_active: true };
}

function classifiedAnswer(sessionId, subject, topic, isCorrect, eligible, category, extra = {}) {
  return {
    id: `ans-${Math.random().toString(36).slice(2)}`,
    student_id: "stu-mix",
    learning_session_id: sessionId,
    question_id: `q-${Math.random().toString(36).slice(2)}`,
    is_correct: isCorrect,
    answered_at: "2026-01-12T10:00:00Z",
    created_at: "2026-01-12T10:00:00Z",
    answer_payload: {
      subject,
      topic,
      gameMode: extra.gameMode || "practice",
      isDiagnosticEligible: eligible,
      evidenceCategory: category,
      contextFlags: {
        afterStepByStep: false,
        contextAfterBookReading: false,
        hasHints: false,
        ...(extra.contextFlags || {}),
      },
      ...extra.payloadExtra,
    },
  };
}

function parentAttempt(isCorrect, mode = "homework") {
  return {
    id: `par-${Math.random().toString(36).slice(2)}`,
    student_id: "stu-mix",
    activity_id: "par-act-mix",
    question_index: 0,
    skill_key: "algebra",
    is_correct: isCorrect,
    time_spent_ms: 8000,
    hints_used: 0,
    answered_at: "2026-01-12T11:00:00Z",
    question_snapshot: {
      grade: "g3",
      contextFlags: { afterStepByStep: false },
    },
    parent_assigned_activities: {
      subject: "math",
      topic: "algebra",
      mode,
      difficulty_level: "medium",
    },
  };
}

describe("P0 mixed evidence fixture", () => {
  test("only self practice + parent assigned affect totals; passive/game/book/step-by-step excluded", () => {
    const sessions = [
      {
        id: "sess-practice",
        student_id: "stu-mix",
        subject: "math",
        topic: "algebra",
        started_at: "2026-01-12T09:00:00Z",
        created_at: "2026-01-12T09:00:00Z",
        ended_at: "2026-01-12T09:30:00Z",
        duration_seconds: 600,
        status: "completed",
        metadata: { mode: "practice" },
      },
      {
        id: "sess-learning-passive",
        student_id: "stu-mix",
        subject: "math",
        topic: "algebra",
        started_at: "2026-01-12T09:35:00Z",
        created_at: "2026-01-12T09:35:00Z",
        ended_at: "2026-01-12T10:00:00Z",
        duration_seconds: 900,
        status: "completed",
        metadata: { mode: "learning" },
      },
      {
        id: "sess-challenge-passive",
        student_id: "stu-mix",
        subject: "math",
        topic: "algebra",
        started_at: "2026-01-12T10:05:00Z",
        created_at: "2026-01-12T10:05:00Z",
        ended_at: "2026-01-12T10:20:00Z",
        duration_seconds: 400,
        status: "completed",
        metadata: { mode: "challenge" },
      },
    ];

    const answers = [
      // COUNT: self practice (3)
      classifiedAnswer("sess-practice", "math", "algebra", true, true, "diagnostic_independent", {
        gameMode: "practice",
      }),
      classifiedAnswer("sess-practice", "math", "algebra", true, true, "diagnostic_independent", {
        gameMode: "practice",
      }),
      classifiedAnswer("sess-practice", "math", "algebra", false, true, "diagnostic_independent", {
        gameMode: "practice",
      }),
      // EXCLUDE: learning mode (2)
      classifiedAnswer("sess-learning-passive", "math", "algebra", true, false, "learning_guided", {
        gameMode: "learning",
      }),
      classifiedAnswer("sess-learning-passive", "math", "algebra", true, false, "learning_guided", {
        gameMode: "learning",
      }),
      // EXCLUDE: step-by-step (2)
      classifiedAnswer("sess-practice", "math", "algebra", false, false, "learning_guided", {
        gameMode: "practice",
        contextFlags: { afterStepByStep: true, stepByStepOverride: true },
      }),
      classifiedAnswer("sess-practice", "math", "algebra", true, false, "learning_guided", {
        gameMode: "practice",
        contextFlags: { afterStepByStep: true, stepByStepOverride: true },
      }),
      // EXCLUDE: book follow-up (1)
      classifiedAnswer("sess-practice", "math", "algebra", true, true, "diagnostic_independent", {
        gameMode: "practice",
        contextFlags: { contextAfterBookReading: true },
      }),
      // EXCLUDE: games (3)
      classifiedAnswer("sess-challenge-passive", "math", "algebra", true, true, "diagnostic_competitive", {
        gameMode: "challenge",
      }),
      classifiedAnswer("sess-challenge-passive", "math", "algebra", false, true, "diagnostic_competitive", {
        gameMode: "speed",
      }),
      classifiedAnswer("sess-challenge-passive", "math", "algebra", false, true, "diagnostic_competitive", {
        gameMode: "marathon",
      }),
    ];

    const parentAttempts = [
      parentAttempt(true, "homework"),
      parentAttempt(false, "quiz"),
    ];

    const result = aggregateReportPayloadFromActivityRows(
      student(),
      sessions,
      answers,
      FROM,
      TO,
      META,
      parentAttempts
    );

    const math = result.subjects.math;
    const summary = result.summary;

    assert.equal(summary.totalAnswers, 9, "totalAnswers = 3 practice + 2 learning + 2 step-by-step + 2 parent");
    assert.equal(math.answers, 9, "subject answers include learning attempts for parent visibility");
    assert.equal(summary.diagnosticAnswers, 5, "diagnostic bucket = 3 self + 2 parent only");
    assert.equal(math.correct, 6, "2+2+1 self/practice/learning/step + 1 parent");
    assert.equal(math.wrong, 3, "1 self + 1 step-by-step + 1 parent");
    assert.equal(summary.learningAnswers, 4, "learning + step-by-step in learning bucket");
    assert.equal(summary.competitiveAnswers, 0, "game modes excluded");
    assert.equal(summary.stepByStepCount, 2, "step-by-step attempts tracked in learning bucket");

    // Passive session duration must not inflate practice session count/duration
    assert.equal(summary.totalSessions, 1, "only practice session counts toward sessions");
    assert.equal(summary.totalDurationSeconds, 616, "practice session 600s + parent credited 16s");

    assert.equal(math.correct, 6);
    assert.equal(math.wrong, 3);
  });
});
