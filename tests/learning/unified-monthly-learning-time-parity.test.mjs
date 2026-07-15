/**
 * Unified monthly learning-time parity — student progress vs parent report.
 * Run: node --test tests/learning/unified-monthly-learning-time-parity.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  resolveSessionOrphanCreditedMs,
  creditedMsToRoundedMinutes,
  creditLearningUnitMs,
  LEARNING_UNIT_CREDIT_CAP_MS,
  extractCreditedMsFromAnswerPayload,
} from "../../lib/learning/learning-time-credit-policy.js";
import {
  addCalendarDaysYmd,
  israelInclusiveDateRangeToUtcBounds,
  creditedMinutesToDurationSeconds,
} from "../../lib/parent-server/attach-unified-learning-time.server.js";
import { getIsraelMonthBoundsForYearMonth } from "../../lib/learning-supabase/israel-calendar.server.js";
import { applyBridgeProvenanceToGeneratedReport } from "../../lib/learning-supabase/bridge-report-provenance.js";
import {
  buildRegularReportViewModel,
  rebuildSummaryFromFilteredReport,
} from "../../lib/parent-ui/parent-report-regular-display.js";

/**
 * Mirror of monthly-aggregate orphan rule (gap-only, no stored double-count).
 */
function sumOrphanMsForSessions(sessions, answerMsBySession) {
  let orphanMs = 0;
  for (const session of sessions) {
    const answerSum = answerMsBySession.get(session.id) || 0;
    const meta = session.metadata && typeof session.metadata === "object" ? session.metadata : {};
    const summary = meta.summary && typeof meta.summary === "object" ? meta.summary : {};
    let orphan = resolveSessionOrphanCreditedMs(answerSum, 0, session.duration_seconds);
    if (orphan <= 0 && answerSum <= 0) {
      const storedOrphan = Number(summary.orphanCreditedMs);
      if (Number.isFinite(storedOrphan) && storedOrphan > 0) {
        orphan = resolveSessionOrphanCreditedMs(0, Math.floor(storedOrphan), 0);
      }
    }
    orphanMs += orphan;
  }
  return orphanMs;
}

describe("unified monthly learning time - units and timezone", () => {
  test("no seconds/minutes confusion: ms → minutes → seconds round-trip", () => {
    const ms = 555.49 * 60_000;
    const minutes = creditedMsToRoundedMinutes(ms);
    assert.equal(minutes, 555.49);
    assert.equal(creditedMinutesToDurationSeconds(minutes), Math.round(555.49 * 60));
  });

  test("Israel month bounds match parent inclusive month range (no timezone skew)", () => {
    const month = getIsraelMonthBoundsForYearMonth("2026-07");
    const range = israelInclusiveDateRangeToUtcBounds("2026-07-01", "2026-07-31");
    assert.equal(range.startIso, month.startIso);
    assert.equal(range.endIso, month.endIso);
    assert.equal(addCalendarDaysYmd("2026-07-31", 1), "2026-08-01");
  });
});

describe("unified monthly learning time - books/activities/visits rules", () => {
  test("orphan gap does not double-count answers already credited", () => {
    const sessions = [
      {
        id: "s1",
        duration_seconds: 406,
        metadata: { summary: { orphanCreditedMs: 406000 } },
      },
    ];
    const answerMsBySession = new Map([["s1", 403412]]);
    const legacyStoredWouldAdd = 406000;
    const fixed = sumOrphanMsForSessions(sessions, answerMsBySession);
    assert.ok(fixed < 10_000);
    assert.notEqual(fixed, legacyStoredWouldAdd);
    const total = 403412 + fixed;
    assert.ok(Math.abs(total - 406000) <= 1);
  });

  test("books and activities included in unified minutes sum formula", () => {
    const answersMs = 120_000;
    const bookMs = 180_000;
    const parentMinutes = 10;
    const orphanMs = 60_000;
    const totalMs = answersMs + Math.round(parentMinutes * 60_000) + bookMs + orphanMs;
    assert.equal(creditedMsToRoundedMinutes(totalMs), 16);
  });

  test("repeat visits credit again; duplicate same visit does not", () => {
    const visitA = creditLearningUnitMs(900_000);
    const visitB = creditLearningUnitMs(900_000);
    assert.equal(visitA + visitB, LEARNING_UNIT_CREDIT_CAP_MS * 2);
    const sameTokenOnce = creditLearningUnitMs(120_000);
    assert.equal(sameTokenOnce, 120_000);
    assert.equal(creditedMsToRoundedMinutes(sameTokenOnce), 2);
  });

  test("month boundary: July-only range excludes August start instant", () => {
    const july = getIsraelMonthBoundsForYearMonth("2026-07");
    const aug = getIsraelMonthBoundsForYearMonth("2026-08");
    assert.equal(july.endIso, aug.startIso);
    const tsInJuly = "2026-07-31T20:59:59.000Z";
    const tsAug = aug.startIso;
    assert.ok(tsInJuly >= july.startIso && tsInJuly < july.endIso);
    assert.ok(!(tsAug >= july.startIso && tsAug < july.endIso));
  });

  test("extractCreditedMsFromAnswerPayload stays in ms (not seconds mistaken as minutes)", () => {
    const ms = extractCreditedMsFromAnswerPayload({ creditedTimeMs: 120000 });
    assert.equal(ms, 120000);
    assert.equal(creditedMsToRoundedMinutes(ms), 2);
  });
});

describe("unified monthly learning time - parent report display preserves aggregate", () => {
  test("bridge prefers creditedLearningMinutes from unified source", () => {
    const report = {
      summary: { totalTimeMinutes: 31, totalQuestions: 10, totalCorrect: 5, totalWrong: 5 },
    };
    const apiPayload = {
      summary: {
        totalAnswers: 10,
        correctAnswers: 5,
        wrongAnswers: 5,
        creditedLearningMinutes: 555.49,
        learningTimeSource: "unified_credited",
        totalDurationSeconds: Math.round(555.49 * 60),
      },
      subjects: {},
    };
    applyBridgeProvenanceToGeneratedReport(report, { subjects: {} }, apiPayload);
    assert.equal(report.summary.totalTimeMinutes, 555.49);
    assert.equal(report.summary.learningTimeSource, "unified_credited");
  });

  test("rebuildSummaryFromFilteredReport keeps authoritative unified minutes", () => {
    const summary = rebuildSummaryFromFilteredReport({
      summary: {
        totalTimeMinutes: 555.49,
        creditedLearningMinutes: 555.49,
        learningTimeSource: "unified_credited",
      },
      mathOperations: {
        addition: { questions: 4, correct: 2, timeMinutes: 31 },
      },
      geometryTopics: {},
      englishTopics: {},
      scienceTopics: {},
      historyTopics: {},
      hebrewTopics: {},
      moledetGeographyTopics: {},
    });
    assert.equal(summary.totalTimeMinutes, 555.49);
    assert.equal(summary.learningTimeSource, "unified_credited");
  });

  test("buildRegularReportViewModel keeps same totalMinutes for student/parent parity field", () => {
    const vm = buildRegularReportViewModel({
      summary: {
        totalTimeMinutes: 555.49,
        creditedLearningMinutes: 555.49,
        learningTimeSource: "unified_credited",
        totalQuestions: 4,
        totalCorrect: 2,
        registeredGradeLevel: "grade5",
      },
      mathOperations: {
        addition: { questions: 4, correct: 2, timeMinutes: 31, gradeKey: "grade5" },
      },
      geometryTopics: {},
      englishTopics: {},
      scienceTopics: {},
      historyTopics: {},
      hebrewTopics: {},
      moledetGeographyTopics: {},
    });
    assert.ok(vm);
    assert.equal(vm.report.summary.totalTimeMinutes, 555.49);
  });
});
