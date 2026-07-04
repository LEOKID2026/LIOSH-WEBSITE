/**
 * Regression: parent report must count wrong self-practice attempts (not 100% when many mistakes).
 * Run: node --test tests/learning/parent-report-wrong-attempts-aggregate.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { aggregateReportPayloadFromActivityRows } from "../../lib/parent-server/report-data-aggregate.server.js";
import { buildReportInputFromDbData } from "../../lib/learning-supabase/report-data-adapter.js";
import { effectivePracticeMetrics } from "../../lib/learning/report-practice-counts.js";
import { buildLearningPatternDecision } from "../../utils/learning-pattern-decision/index.js";
import { EVIDENCE_CATEGORIES } from "../../lib/learning/activity-classification.js";

const FROM = new Date("2026-07-04T00:00:00+03:00");
const TO = new Date("2026-07-04T23:59:59+03:00");
const META = { sessionsFilterField: "started_at", answersFilterField: "answered_at" };

function student() {
  return { id: "stu-wrong", full_name: "Wrong Attempts", grade_level: "g2", is_active: true };
}

function practiceSession(id = "sess-addition") {
  return {
    id,
    student_id: "stu-wrong",
    subject: "math",
    topic: "addition",
    started_at: "2026-07-04T10:00:00+03:00",
    created_at: "2026-07-04T10:00:00+03:00",
    ended_at: "2026-07-04T10:20:00+03:00",
    duration_seconds: 600,
    status: "completed",
    metadata: { mode: "learning" },
  };
}

function answerRow(sessionId, isCorrect, extra = {}) {
  return {
    id: `ans-${Math.random().toString(36).slice(2)}`,
    student_id: "stu-wrong",
    learning_session_id: sessionId,
    question_id: extra.questionId || `q-${Math.random().toString(36).slice(2)}`,
    is_correct: isCorrect,
    answered_at: extra.answeredAt || "2026-07-04T10:05:00+03:00",
    created_at: extra.answeredAt || "2026-07-04T10:05:00+03:00",
    answer_payload: {
      subject: "math",
      topic: "addition",
      gameMode: extra.gameMode || "practice",
      isDiagnosticEligible: extra.isDiagnosticEligible ?? true,
      evidenceCategory: extra.evidenceCategory || EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT,
      contextFlags: {
        afterStepByStep: false,
        contextAfterBookReading: false,
        hasHints: false,
        ...(extra.contextFlags || {}),
      },
      clientMeta: {
        gameMode: extra.gameMode || "practice",
        ...(extra.clientMeta || {}),
      },
    },
  };
}

describe("parent report wrong attempts aggregation", () => {
  test("10 addition attempts (2 correct, 8 wrong) → 20% accuracy in adapter + LPD not positive_observed", () => {
    const session = practiceSession();
    const answers = [];
    for (let i = 0; i < 8; i++) {
      answers.push(answerRow(session.id, false, { gameMode: "practice" }));
    }
    for (let i = 0; i < 2; i++) {
      answers.push(answerRow(session.id, true, { gameMode: "practice" }));
    }

    const raw = aggregateReportPayloadFromActivityRows(
      student(),
      [session],
      answers,
      FROM,
      TO,
      META,
      []
    );

    const topic = raw.subjects.math.topics.addition;
    assert.equal(topic.answers, 10);
    assert.equal(topic.correct, 2);
    assert.equal(topic.wrong, 8);
    assert.equal(topic.accuracy, 20);

    const metrics = effectivePracticeMetrics(topic);
    assert.equal(metrics.answers, 10);
    assert.equal(metrics.correct, 2);
    assert.equal(metrics.wrong, 8);

    const dbInput = buildReportInputFromDbData(raw, { period: "custom", timezone: "Asia/Jerusalem" });
    const adapterTopics = Object.values(dbInput.subjects.math.topics || {});
    assert.ok(adapterTopics.length > 0, "adapter topic rows expected");
    const adapterMetrics = effectivePracticeMetrics(adapterTopics[0]);
    assert.equal(adapterMetrics.wrong, 8);
    assert.notEqual(adapterMetrics.answers > 0 && adapterMetrics.wrong === 0 ? 100 : 20, 100);

    const lpd = buildLearningPatternDecision({
      subjectId: "math",
      topicRowKey: "addition",
      row: {
        questions: metrics.answers,
        correct: metrics.correct,
        wrong: metrics.wrong,
        accuracy: 20,
      },
      diagnosticMistakes: raw.diagnosticMistakes.filter((m) => m.topic === "addition"),
      periodStartMs: FROM.getTime(),
      periodEndMs: TO.getTime(),
    });
    assert.notEqual(lpd.topicStatus, "positive_observed");
    assert.ok(metrics.wrong > 0);
    assert.notEqual(metrics.answers > 0 && metrics.wrong === 0 ? 100 : 20, 100);
  });

  test("learning-mode wrong attempts count for parent totals when session started as learning", () => {
    const session = practiceSession();
    const answers = [
      ...Array.from({ length: 8 }, () =>
        answerRow(session.id, false, {
          gameMode: "learning",
          isDiagnosticEligible: false,
          evidenceCategory: EVIDENCE_CATEGORIES.LEARNING_GUIDED,
        })
      ),
      ...Array.from({ length: 2 }, () =>
        answerRow(session.id, true, {
          gameMode: "practice",
          isDiagnosticEligible: true,
          evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT,
        })
      ),
    ];

    const raw = aggregateReportPayloadFromActivityRows(
      student(),
      [session],
      answers,
      FROM,
      TO,
      META,
      []
    );

    const topic = raw.subjects.math.topics.addition;
    assert.equal(topic.answers, 10);
    assert.equal(topic.wrong, 8);
    assert.equal(topic.correct, 2);
    assert.equal(topic.accuracy, 20);
    assert.equal(topic.diagnosticAnswers, 2);
    assert.equal(topic.diagnosticWrong, 0);
  });

  test("retry wrong → wrong → correct keeps all three attempts", () => {
    const session = practiceSession();
    const qid = "same-question-fingerprint";
    const answers = [
      answerRow(session.id, false, { questionId: qid, gameMode: "practice" }),
      answerRow(session.id, false, { questionId: qid, gameMode: "practice", answeredAt: "2026-07-04T10:06:00+03:00" }),
      answerRow(session.id, true, { questionId: qid, gameMode: "practice", answeredAt: "2026-07-04T10:07:00+03:00" }),
    ];

    const raw = aggregateReportPayloadFromActivityRows(
      student(),
      [session],
      answers,
      FROM,
      TO,
      META,
      []
    );

    const topic = raw.subjects.math.topics.addition;
    assert.equal(topic.answers, 3);
    assert.equal(topic.wrong, 2);
    assert.equal(topic.correct, 1);
  });
});
