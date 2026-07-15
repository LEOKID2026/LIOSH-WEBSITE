/**
 * Phase 6 — Competitive context test gate
 * Run: node --test tests/learning/phase6-competitive-context.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  buildCompetitiveContext,
  createCompetitiveByModeAccumulator,
  accumulateCompetitiveByModeEntry,
  deriveCompetitiveSignals,
  shouldExcludeFromRecentMistakes,
  isCompetitiveGameMode,
  COMPETITIVE_SIGNAL_IDS,
} from "../../lib/learning/competitive-context.js";

import {
  aggregateReportPayloadFromActivityRows,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";

import { buildParentInsightsHe } from "../../lib/parent-server/parent-report-parent-facing.server.js";
import { aggregateClassReportFromStudentPayloads } from "../../lib/teacher-server/teacher-class-report.server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FROM_DATE = new Date("2026-01-01T00:00:00.000Z");
const TO_DATE = new Date("2026-01-31T00:00:00.000Z");
const FETCH_META = { sessionsFilterField: "started_at", answersFilterField: "answered_at" };

function makeStudent(id = "stu-c6") {
  return { id, full_name: "Competitive Student", grade_level: "g3", is_active: true };
}

function makeSession(id, subject, topic = "algebra", mode = "practice") {
  return {
    id,
    student_id: "stu-c6",
    subject,
    topic,
    started_at: "2026-01-10T10:00:00Z",
    ended_at: "2026-01-10T10:30:00Z",
    duration_seconds: 300,
    status: "completed",
    metadata: { mode },
  };
}

function makeCompetitiveAnswer(sessionId, subject, topic, isCorrect, mode) {
  return {
    id: `ans-${Math.random().toString(36).slice(2)}`,
    student_id: "stu-c6",
    learning_session_id: sessionId,
    question_id: `q-${Math.random().toString(36).slice(2)}`,
    is_correct: isCorrect,
    answered_at: "2026-01-10T10:05:00Z",
    answer_payload: {
      subject,
      topic,
      gameMode: mode,
      isDiagnosticEligible: true,
      evidenceCategory: "diagnostic_competitive",
      contextFlags: { afterStepByStep: false, contextAfterBookReading: false, hasHints: false },
    },
  };
}

function makeDiagnosticAnswer(sessionId, subject, topic, isCorrect) {
  return {
    id: `ans-${Math.random().toString(36).slice(2)}`,
    student_id: "stu-c6",
    learning_session_id: sessionId,
    question_id: `q-${Math.random().toString(36).slice(2)}`,
    is_correct: isCorrect,
    answered_at: "2026-01-10T10:06:00Z",
    answer_payload: {
      subject,
      topic,
      gameMode: "practice",
      isDiagnosticEligible: true,
      evidenceCategory: "diagnostic_independent",
      contextFlags: { afterStepByStep: false, contextAfterBookReading: false, hasHints: false },
    },
  };
}

describe("Phase 6 - competitive-context helpers", () => {
  test("isCompetitiveGameMode recognizes challenge speed marathon", () => {
    assert.equal(isCompetitiveGameMode("challenge"), true);
    assert.equal(isCompetitiveGameMode("speed"), true);
    assert.equal(isCompetitiveGameMode("marathon"), true);
    assert.equal(isCompetitiveGameMode("practice"), false);
  });

  test("shouldExcludeFromRecentMistakes for competitive rows", () => {
    assert.equal(
      shouldExcludeFromRecentMistakes({
        evidenceCategory: "diagnostic_competitive",
        resolvedMode: "challenge",
      }),
      true
    );
    assert.equal(
      shouldExcludeFromRecentMistakes({
        evidenceCategory: "diagnostic_independent",
        resolvedMode: "practice",
      }),
      false
    );
  });

  test("deriveCompetitiveSignals thresholds", () => {
    const signals = deriveCompetitiveSignals(
      {
        challenge: { answers: 12, correct: 7, accuracy: 58.33, sessionCount: 1 },
        speed: { answers: 16, correct: 12, accuracy: 75 },
        marathon: { answers: 32, correct: 20, accuracy: 62.5 },
      },
      Array(10)
        .fill(true)
        .concat(Array(2).fill(false))
        .concat(Array(10).fill(true))
        .concat(Array(2).fill(false))
    );
    const ids = signals.map((s) => s.id);
    assert.ok(ids.includes(COMPETITIVE_SIGNAL_IDS.CHALLENGE_ATTEMPT));
    assert.ok(ids.includes(COMPETITIVE_SIGNAL_IDS.CHALLENGE_RESILIENCE));
    assert.ok(ids.includes(COMPETITIVE_SIGNAL_IDS.SPEED_FLUENCY));
    assert.ok(ids.includes(COMPETITIVE_SIGNAL_IDS.MARATHON_ENDURANCE));
    assert.ok(ids.includes(COMPETITIVE_SIGNAL_IDS.MARATHON_CONSISTENCY));
  });
});

describe("Phase 6 - aggregator competitiveContext + recentMistakes", () => {
  test("15 challenge @ 45% → competitiveAccuracy=45%, diagnosticAccuracy unchanged", () => {
    const session = makeSession("sess-ch", "math", "algebra", "challenge");
    const answers = Array.from({ length: 15 }, (_, i) =>
      makeCompetitiveAnswer("sess-ch", "math", "algebra", i < 7, "challenge")
    );
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      answers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );
    assert.equal(result.summary.competitiveAnswers, 15);
    assert.equal(result.summary.competitiveCorrect, 7);
    assert.equal(result.summary.competitiveAccuracy, 46.67);
    assert.equal(result.summary.diagnosticAnswers, 0);
    assert.equal(result.summary.diagnosticAccuracy, 0);
    assert.equal(result.competitiveContext.byMode.challenge.answers, 15);
    assert.equal(result.competitiveContext.totalAnswers, 15);
  });

  test("competitive wrong answers excluded from recentMistakes (Option A)", () => {
    const session = makeSession("sess-sp", "math", "algebra", "speed");
    const answers = Array.from({ length: 8 }, () =>
      makeCompetitiveAnswer("sess-sp", "math", "algebra", false, "speed")
    );
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      answers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );
    assert.equal(result.recentMistakes.length, 0);
    const insights = buildParentInsightsHe(result);
    assert.ok(!insights.some((line) => line.includes("טעויות חוזרות")));
  });

  test("diagnostic mistakes still appear in recentMistakes", () => {
    const session = makeSession("sess-pr", "math", "algebra", "practice");
    const answers = [makeDiagnosticAnswer("sess-pr", "math", "algebra", false)];
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      answers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );
    assert.equal(result.recentMistakes.length, 1);
    assert.equal(result.recentMistakes[0].mode, "practice");
  });

  test("competitiveContext is top-level not inside summary", () => {
    const session = makeSession("sess-m", "math", "algebra", "marathon");
    const answers = [makeCompetitiveAnswer("sess-m", "math", "algebra", true, "marathon")];
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      answers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );
    assert.ok(result.competitiveContext);
    assert.equal(result.summary.competitiveContext, undefined);
    assert.equal(result.competitiveContext.byMode.marathon.answers, 1);
  });

  test("mixed diagnostic + competitive keeps diagnostic isolation", () => {
    const s1 = makeSession("sess-mix-d", "math", "algebra", "practice");
    const s2 = makeSession("sess-mix-c", "math", "algebra", "challenge");
    const answers = [
      ...Array.from({ length: 5 }, () => makeDiagnosticAnswer("sess-mix-d", "math", "algebra", true)),
      ...Array.from({ length: 5 }, () => makeDiagnosticAnswer("sess-mix-d", "math", "algebra", false)),
      ...Array.from({ length: 10 }, () =>
        makeCompetitiveAnswer("sess-mix-c", "math", "algebra", false, "challenge")
      ),
    ];
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [s1, s2],
      answers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );
    assert.equal(result.summary.diagnosticAnswers, 10);
    assert.equal(result.summary.diagnosticCorrect, 5);
    assert.equal(result.summary.diagnosticAccuracy, 50);
    assert.equal(result.summary.competitiveAnswers, 10);
    assert.equal(result.recentMistakes.length, 5);
    assert.ok(result.recentMistakes.every((m) => m.mode === "practice"));
  });
});

describe("Phase 6 - class weakness diagnostic-aware", () => {
  test("weaknessTopics ignore competitive-only topic.wrong", () => {
    const competitiveOnlyPayload = aggregateReportPayloadFromActivityRows(
      makeStudent("stu-a"),
      [makeSession("s-a", "math", "algebra", "challenge")],
      Array.from({ length: 6 }, () =>
        makeCompetitiveAnswer("s-a", "math", "algebra", false, "challenge")
      ),
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );
    const classReport = aggregateClassReportFromStudentPayloads([
      {
        studentId: "stu-a",
        studentFullName: "A",
        studentFullNameMasked: "A",
        payload: competitiveOnlyPayload,
      },
    ]);
    assert.equal(classReport.weaknessTopics.length, 0);
  });

  test("weaknessTopics include diagnostic wrong topics", () => {
    const diagnosticPayload = aggregateReportPayloadFromActivityRows(
      makeStudent("stu-b"),
      [makeSession("s-b", "math", "algebra", "practice")],
      [
        makeDiagnosticAnswer("s-b", "math", "algebra", false),
        makeDiagnosticAnswer("s-b", "math", "algebra", false),
      ],
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );
    const classReport = aggregateClassReportFromStudentPayloads([
      {
        studentId: "stu-b",
        studentFullName: "B",
        studentFullNameMasked: "B",
        payload: diagnosticPayload,
      },
    ]);
    assert.ok(classReport.weaknessTopics.length >= 1);
    assert.ok(classReport.weaknessTopics[0].wrong >= 2);
  });
});

describe("Phase 6 - coins/monthly audit (no changes)", () => {
  test("learning-coin-award has no mode-based skip for competitive modes", () => {
    const path = join(__dirname, "../../lib/learning-supabase/learning-coin-award.server.js");
    const src = readFileSync(path, "utf8");
    assert.match(src, /calculateSessionCoins/);
    assert.doesNotMatch(src, /challenge|speed|marathon/);
  });

  test("monthly-persistence-reward queries learning_sessions only", () => {
    const path = join(__dirname, "../../lib/learning-supabase/monthly-persistence-reward.server.js");
    const src = readFileSync(path, "utf8");
    assert.match(src, /\.from\("learning_sessions"\)/);
    assert.doesNotMatch(src, /book_reading_sessions|book_page_visits/);
  });
});

describe("Phase 6 - strip + regression guards", () => {
  test("stripInternalReportPayloadFields preserves competitiveContext", () => {
    const session = makeSession("sess-strip", "math", "algebra", "speed");
    const answers = [makeCompetitiveAnswer("sess-strip", "math", "algebra", true, "speed")];
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      answers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );
    const stripped = stripInternalReportPayloadFields(result);
    assert.ok(stripped.competitiveContext);
    assert.equal(stripped.meta._rawActivityAccuracy, undefined);
  });
});
