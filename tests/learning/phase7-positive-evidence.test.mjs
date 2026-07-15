/**
 * Phase 7 — Positive evidence engine test gate
 * Run: node --test tests/learning/phase7-positive-evidence.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  buildPositiveEvidence,
  createPositiveEvidenceAccumulator,
  accumulatePositiveEvidenceEntry,
  POSITIVE_SIGNAL_IDS,
  POSITIVE_EVIDENCE_THRESHOLDS,
} from "../../lib/learning/positive-evidence.js";

import {
  aggregateReportPayloadFromActivityRows,
  mergeLearningActivityBookData,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FROM_DATE = new Date("2026-01-01T00:00:00.000Z");
const TO_DATE = new Date("2026-01-31T00:00:00.000Z");
const FETCH_META = { sessionsFilterField: "started_at", answersFilterField: "answered_at" };

function makeStudent(id = "stu-p7") {
  return { id, full_name: "Positive Evidence Student", grade_level: "g3", is_active: true };
}

function makeSession(id, subject, topic = "algebra", mode = "practice") {
  return {
    id,
    student_id: "stu-p7",
    subject,
    topic,
    started_at: "2026-01-10T10:00:00Z",
    ended_at: "2026-01-10T10:30:00Z",
    duration_seconds: 300,
    status: "completed",
    metadata: { mode },
  };
}

function makeDiagnosticAnswer(sessionId, subject, topic, isCorrect, extra = {}) {
  return {
    id: `ans-${Math.random().toString(36).slice(2)}`,
    student_id: "stu-p7",
    learning_session_id: sessionId,
    question_id: `q-${Math.random().toString(36).slice(2)}`,
    is_correct: isCorrect,
    answered_at: extra.answeredAt || "2026-01-10T10:05:00Z",
    answer_payload: {
      subject,
      topic,
      gameMode: extra.mode || "practice",
      isDiagnosticEligible:
        extra.isDiagnosticEligible !== undefined ? extra.isDiagnosticEligible : true,
      evidenceCategory: extra.evidenceCategory || "diagnostic_independent",
      contextFlags: {
        afterStepByStep: extra.afterStepByStep === true,
        contextAfterBookReading: extra.contextAfterBookReading === true,
        hasHints: false,
      },
      hintsUsed: extra.hintsUsed,
      ...extra.payloadExtra,
    },
  };
}

function topicEntry(positiveEvidence, subject, topic) {
  return positiveEvidence.byTopic.find((t) => t.subject === subject && t.topic === topic);
}

function hasSignal(signals, id) {
  return signals.some((s) => s.id === id);
}

describe("Phase 7 - positive-evidence helpers", () => {
  test("improvement uses diagnostic-only daily rollup", () => {
    const acc = createPositiveEvidenceAccumulator();
    const days = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"];
    for (const [i, day] of days.entries()) {
      accumulatePositiveEvidenceEntry(acc, {
        subject: "math",
        topic: "algebra",
        dayKey: day,
        answerIso: `${day}T10:00:00Z`,
        isCorrect: i < 2,
        resolvedMode: "practice",
        isDiagnosticEligible: true,
        evidenceCategory: "diagnostic_independent",
        afterStepByStep: false,
        contextAfterBookReading: false,
        isManyHints: false,
      });
      accumulatePositiveEvidenceEntry(acc, {
        subject: "math",
        topic: "algebra",
        dayKey: day,
        answerIso: `${day}T10:01:00Z`,
        isCorrect: true,
        resolvedMode: "learning",
        isDiagnosticEligible: false,
        evidenceCategory: "learning_guided",
        afterStepByStep: false,
        contextAfterBookReading: false,
        isManyHints: false,
      });
    }

    const subjects = {
      math: {
        diagnosticAnswers: 4,
        diagnosticAccuracy: 50,
        diagnosticCorrect: 2,
        topics: {},
      },
    };
    const pe = buildPositiveEvidence(
      subjects,
      { diagnosticAnswers: 4, diagnosticAccuracy: 50 },
      acc,
      null
    );
    assert.equal(hasSignal(pe.student.signals, POSITIVE_SIGNAL_IDS.IMPROVEMENT_CANDIDATE), false);

    for (const day of ["2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08"]) {
      for (let i = 0; i < 2; i++) {
        accumulatePositiveEvidenceEntry(acc, {
          subject: "math",
          topic: "algebra",
          dayKey: day,
          answerIso: `${day}T10:0${i}:00Z`,
          isCorrect: true,
          resolvedMode: "practice",
          isDiagnosticEligible: true,
          evidenceCategory: "diagnostic_independent",
          afterStepByStep: false,
          contextAfterBookReading: false,
          isManyHints: false,
        });
      }
    }

    const pe2 = buildPositiveEvidence(
      { math: { diagnosticAnswers: 12, diagnosticAccuracy: 75, topics: {} } },
      { diagnosticAnswers: 12, diagnosticAccuracy: 75 },
      acc,
      null
    );
    assert.equal(hasSignal(pe2.student.signals, POSITIVE_SIGNAL_IDS.IMPROVEMENT_CANDIDATE), true);
  });
});

describe("Phase 7 - aggregator positiveEvidence", () => {
  test("no praise on thin topic data", () => {
    const session = makeSession("s1", "math", "algebra");
    const answers = [
      makeDiagnosticAnswer("s1", "math", "algebra", true),
      makeDiagnosticAnswer("s1", "math", "algebra", false),
    ];
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      answers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );

    const topic = result.subjects.math.topics.algebra;
    assert.equal(topic.diagnosticConfidence, "insufficient");
    const entry = topicEntry(result.positiveEvidence, "math", "algebra");
    assert.ok(entry);
    assert.equal(hasSignal(entry.signals, POSITIVE_SIGNAL_IDS.MASTERY_CANDIDATE), false);
    assert.equal(entry.notEnoughData[0].id, POSITIVE_SIGNAL_IDS.NOT_ENOUGH_DATA);
    assert.equal(entry.notEnoughData[0].diagnosticAnswers, 2);
  });

  test("mastery_candidate at topic threshold", () => {
    const session = makeSession("s1", "math", "algebra");
    const answers = [];
    for (let i = 0; i < 8; i++) {
      answers.push(makeDiagnosticAnswer("s1", "math", "algebra", i < 7));
    }
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      answers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );

    const entry = topicEntry(result.positiveEvidence, "math", "algebra");
    assert.equal(hasSignal(entry.signals, POSITIVE_SIGNAL_IDS.MASTERY_CANDIDATE), true);
    assert.equal(result.subjects.math.topics.algebra.diagnosticConfidence, "sufficient");
  });

  test("competitive success does not produce mastery_candidate", () => {
    const session = makeSession("s1", "math", "algebra", "challenge");
    const answers = Array.from({ length: 10 }, (_, i) =>
      makeDiagnosticAnswer("s1", "math", "algebra", i < 9, {
        mode: "challenge",
        evidenceCategory: "diagnostic_competitive",
      })
    );
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      answers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );

    const entry = topicEntry(result.positiveEvidence, "math", "algebra");
    assert.equal(hasSignal(entry?.signals || [], POSITIVE_SIGNAL_IDS.MASTERY_CANDIDATE), false);
    assert.equal(result.summary.diagnosticAnswers, 0);
  });

  test("post_book_practice via mergeLearningActivityBookData", () => {
    const session = makeSession("s1", "math", "algebra");
    const answers = Array.from({ length: 5 }, () =>
      makeDiagnosticAnswer("s1", "math", "algebra", true, { contextAfterBookReading: true })
    );
    const base = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      answers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );
    const merged = mergeLearningActivityBookData(
      base,
      [
        {
          subject: "math",
          credited_dwell_ms: 360_000,
          page_read: true,
        },
      ],
      [{ id: "bs1" }],
      answers
    );

    const bookSignals = merged.positiveEvidence.behaviors.book.signals;
    assert.equal(hasSignal(bookSignals, POSITIVE_SIGNAL_IDS.POST_BOOK_PRACTICE), true);
    assert.equal(hasSignal(bookSignals, POSITIVE_SIGNAL_IDS.POST_BOOK_IMPROVEMENT), true);
  });

  test("step_by_step_learner only after independent success", () => {
    const session = makeSession("s1", "math", "algebra", "learning");
    const answers = [];
    for (let i = 0; i < 3; i++) {
      answers.push(
        makeDiagnosticAnswer("s1", "math", "algebra", true, {
          afterStepByStep: true,
          mode: "learning",
          isDiagnosticEligible: false,
          evidenceCategory: "learning_guided",
          answeredAt: `2026-01-10T10:0${i}:00Z`,
        })
      );
    }
    const base = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      answers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );
    let entry = topicEntry(base.positiveEvidence, "math", "algebra");
    assert.equal(hasSignal(entry.signals, POSITIVE_SIGNAL_IDS.STEP_BY_STEP_LEARNER), false);

    for (let i = 0; i < 5; i++) {
      answers.push(
        makeDiagnosticAnswer("s1", "math", "algebra", true, {
          answeredAt: `2026-01-10T11:0${i}:00Z`,
        })
      );
    }
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      answers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );
    entry = topicEntry(result.positiveEvidence, "math", "algebra");
    assert.equal(hasSignal(entry.signals, POSITIVE_SIGNAL_IDS.STEP_BY_STEP_LEARNER), true);
  });

  test("retry_success when practice_mistakes correct after prior wrongs", () => {
    const session = makeSession("s1", "math", "algebra");
    const answers = [
      makeDiagnosticAnswer("s1", "math", "algebra", false, { answeredAt: "2026-01-10T09:00:00Z" }),
      makeDiagnosticAnswer("s1", "math", "algebra", false, { answeredAt: "2026-01-10T09:01:00Z" }),
      makeDiagnosticAnswer("s1", "math", "algebra", true, {
        mode: "practice_mistakes",
        evidenceCategory: "diagnostic_guided",
        answeredAt: "2026-01-10T10:00:00Z",
      }),
      makeDiagnosticAnswer("s1", "math", "algebra", true, {
        mode: "practice_mistakes",
        evidenceCategory: "diagnostic_guided",
        answeredAt: "2026-01-10T10:01:00Z",
      }),
      makeDiagnosticAnswer("s1", "math", "algebra", true, {
        mode: "practice_mistakes",
        evidenceCategory: "diagnostic_guided",
        answeredAt: "2026-01-10T10:02:00Z",
      }),
    ];
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      answers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );
    const entry = topicEntry(result.positiveEvidence, "math", "algebra");
    assert.equal(hasSignal(entry.signals, POSITIVE_SIGNAL_IDS.RETRY_SUCCESS), true);
    assert.equal(
      hasSignal(result.positiveEvidence.behaviors.retry.signals, POSITIVE_SIGNAL_IDS.RETRY_SUCCESS),
      true
    );
  });

  test("competitive signals passthrough not mastery", () => {
    const session = makeSession("s1", "math", "algebra", "speed");
    const answers = Array.from({ length: 16 }, (_, i) =>
      makeDiagnosticAnswer("s1", "math", "algebra", i < 12, {
        mode: "speed",
        evidenceCategory: "diagnostic_competitive",
      })
    );
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      answers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );

    const comp = result.positiveEvidence.behaviors.competitive.signals;
    assert.equal(hasSignal(comp, POSITIVE_SIGNAL_IDS.SPEED_FLUENCY_CANDIDATE), true);
    assert.equal(comp[0].source, "competitive_context");
    const entry = topicEntry(result.positiveEvidence, "math", "algebra");
    assert.equal(hasSignal(entry?.signals || [], POSITIVE_SIGNAL_IDS.MASTERY_CANDIDATE), false);
  });

  test("weakness remains visible with mastery signal", () => {
    const session = makeSession("s1", "math", "algebra");
    const answers = [];
    for (let i = 0; i < 8; i++) {
      answers.push(makeDiagnosticAnswer("s1", "math", "algebra", i !== 7));
    }
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      answers,
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );

    const entry = topicEntry(result.positiveEvidence, "math", "algebra");
    assert.equal(hasSignal(entry.signals, POSITIVE_SIGNAL_IDS.MASTERY_CANDIDATE), true);
    assert.equal(result.subjects.math.topics.algebra.diagnosticWrong, 1);
    assert.equal(result.recentMistakes.length, 1);
  });

  test("positiveEvidence is top-level not inside summary", () => {
    const session = makeSession("s1", "math", "algebra");
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      [makeDiagnosticAnswer("s1", "math", "algebra", true)],
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );
    assert.ok(result.positiveEvidence);
    assert.equal(result.summary.positiveEvidence, undefined);
    assert.equal(result.meta.version, "phase-8-mcq-engine-contract");
  });

  test("stripInternalReportPayloadFields preserves positiveEvidence", () => {
    const session = makeSession("s1", "math", "algebra");
    const result = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      [makeDiagnosticAnswer("s1", "math", "algebra", true)],
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );
    const stripped = stripInternalReportPayloadFields(result);
    assert.ok(stripped.positiveEvidence);
    assert.equal(stripped._positiveEvidenceAcc, undefined);
  });
});

describe("Phase 7 - scope guards", () => {
  test("no coins/monthly changes", () => {
    const coinPath = join(__dirname, "../../lib/learning-supabase/learning-coin-award.server.js");
    const monthlyPath = join(
      __dirname,
      "../../lib/learning-supabase/monthly-persistence-reward.server.js"
    );
    const coinSrc = readFileSync(coinPath, "utf8");
    const monthlySrc = readFileSync(monthlyPath, "utf8");
    assert.doesNotMatch(coinSrc, /positiveEvidence/);
    assert.doesNotMatch(monthlySrc, /positiveEvidence/);
  });

  test("persistence_candidate threshold", () => {
    const acc = createPositiveEvidenceAccumulator();
    for (let i = 0; i < 5; i++) {
      accumulatePositiveEvidenceEntry(acc, {
        subject: "math",
        topic: "algebra",
        dayKey: "2026-01-10",
        answerIso: `2026-01-10T10:0${i}:00Z`,
        isCorrect: true,
        resolvedMode: "practice",
        isDiagnosticEligible: true,
        evidenceCategory: "diagnostic_independent",
        afterStepByStep: false,
        contextAfterBookReading: false,
        isManyHints: i < 2,
      });
    }
    const subjects = {
      math: {
        diagnosticAnswers: 5,
        diagnosticAccuracy: 100,
        correctManyHintsAnswers: 2,
        topics: {
          algebra: {
            diagnosticAnswers: 5,
            diagnosticAccuracy: 100,
            correctManyHintsAnswers: 2,
            stepByStepCount: 0,
            diagnosticWrong: 0,
          },
        },
      },
    };
    const pe = buildPositiveEvidence(
      subjects,
      { diagnosticAnswers: 5, diagnosticAccuracy: 100 },
      acc,
      null
    );
    assert.equal(
      hasSignal(pe.bySubject.math.signals, POSITIVE_SIGNAL_IDS.PERSISTENCE_CANDIDATE),
      true
    );
    assert.equal(
      POSITIVE_EVIDENCE_THRESHOLDS.PERSISTENCE_MIN_MANY_HINTS,
      2
    );
  });
});
