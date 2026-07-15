/**
 * E2E regression — Aaa7-style: step-by-step wrong retries must count in parent totals.
 * Run: node --test tests/learning/parent-report-step-by-step-parent-totals-e2e.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { aggregateReportPayloadFromActivityRows } from "../../lib/parent-server/report-data-aggregate.server.js";
import { buildReportInputFromDbData } from "../../lib/learning-supabase/report-data-adapter.js";
import { buildNormalizedSubjectPracticeFromApiPayload } from "../../lib/learning/normalized-subject-practice.js";
import { syncReportVisiblePracticeFromServer } from "../../lib/learning/report-visible-practice-sync.js";
import { buildLearningPatternDecision } from "../../utils/learning-pattern-decision/index.js";
import { buildParentReportV2FromAggregate } from "../../scripts/qa/lib/mass-virtual-students/report-v2-bridge.mjs";
import {
  INSUFFICIENT_SUBJECT_SUMMARY_RE,
} from "../../utils/learning-pattern-decision/subject-clear-weak-topic.js";
import { withholdSummaryCopyHe } from "../../utils/parent-report-language/subject-withhold-summary-he.js";
import { EVIDENCE_CATEGORIES } from "../../lib/learning/activity-classification.js";

const FROM = new Date("2026-07-04T00:00:00+03:00");
const TO = new Date("2026-07-04T23:59:59+03:00");
const META = { sessionsFilterField: "started_at", answersFilterField: "answered_at" };
const START_MS = Date.UTC(2026, 6, 4);
const END_MS = Date.UTC(2026, 6, 4, 23, 59, 59);

function student() {
  return { id: "stu-aaa7-e2e", full_name: "AAA7 E2E", grade_level: "g4", is_active: true };
}

function session() {
  return {
    id: "sess-aaa7-addition",
    student_id: "stu-aaa7-e2e",
    subject: "math",
    topic: "addition",
    started_at: "2026-07-04T18:00:00+03:00",
    created_at: "2026-07-04T18:00:00+03:00",
    ended_at: "2026-07-04T18:30:00+03:00",
    duration_seconds: 189,
    status: "completed",
    metadata: { mode: "practice" },
  };
}

function aaa7Answer(isCorrect, i) {
  const isWrongRetry = !isCorrect;
  return {
    id: `ans-aaa7-${i}`,
    student_id: "stu-aaa7-e2e",
    learning_session_id: session().id,
    question_id: `q-aaa7-${i}`,
    is_correct: isCorrect,
    answered_at: `2026-07-04T18:0${Math.min(5 + i, 9)}:00+03:00`,
    created_at: `2026-07-04T18:0${Math.min(5 + i, 9)}:00+03:00`,
    answer_payload: {
      subject: "math",
      topic: "addition",
      gameMode: "practice",
      isDiagnosticEligible: isWrongRetry ? false : true,
      evidenceCategory: isWrongRetry
        ? EVIDENCE_CATEGORIES.LEARNING_GUIDED
        : EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT,
      contextFlags: {
        afterStepByStep: isWrongRetry,
        contextAfterBookReading: false,
        hasHints: false,
        ...(isWrongRetry ? { stepByStepOverride: true } : {}),
      },
      clientMeta: { gameMode: "practice", source: "math-master" },
    },
  };
}

function buildFixturePayload() {
  const answers = [];
  for (let i = 0; i < 8; i++) answers.push(aaa7Answer(false, i));
  for (let i = 8; i < 10; i++) answers.push(aaa7Answer(true, i));
  return aggregateReportPayloadFromActivityRows(student(), [session()], answers, FROM, TO, META, []);
}

describe("parent report step-by-step parent totals e2e (Aaa7 regression)", () => {
  test("aggregate + UI sync + LPD - 10/2/8/20% across surfaces", async () => {
    const raw = buildFixturePayload();
    const topic = raw.subjects.math.topics.addition;
    const summary = raw.summary;

    assert.equal(topic.answers, 10, "aggregate topic answers");
    assert.equal(topic.correct, 2);
    assert.equal(topic.wrong, 8);
    assert.equal(topic.accuracy, 20);
    assert.equal(topic.diagnosticAnswers, 2, "diagnostic subset stays cold-probe only");
    assert.equal(topic.learningAnswers, 8, "step-by-step wrong retries in learning bucket");
    assert.equal(topic.diagnosticWrong, 0);

    assert.equal(summary.totalAnswers, 10);
    assert.equal(summary.correctAnswers, 2);
    assert.equal(summary.wrongAnswers, 8);
    assert.equal(summary.diagnosticAnswers, 2);
    assert.notEqual(summary.diagnosticAccuracy, 20, "diagnosticAccuracy is internal subset");

    const normalized = buildNormalizedSubjectPracticeFromApiPayload(raw);
    assert.equal(normalized.math.questions, 10);
    assert.equal(normalized.math.correct, 2);
    assert.equal(normalized.math.accuracy, 20);

    const dbInput = buildReportInputFromDbData(raw, { period: "custom", timezone: "Asia/Jerusalem" });
    const additionRows = Object.values(dbInput.subjects.math.topics || {}).filter(
      (t) => String(t.topicBaseKey || t.topicKey || "").includes("addition") || t.total > 0
    );
    assert.ok(additionRows.length > 0);
    const additionAdapter = additionRows.find((t) => t.total === 10) || additionRows[0];
    assert.equal(additionAdapter.total, 10);
    assert.equal(additionAdapter.correct, 2);
    assert.equal(additionAdapter.wrong, 8);

    const report = await buildParentReportV2FromAggregate(raw, {
      studentName: student().full_name,
      fromDate: FROM,
      toDate: TO,
    });
    syncReportVisiblePracticeFromServer(report, { apiPayload: raw, dbInput });

    assert.equal(report.summary.totalQuestions, 10, "summary card questions");
    assert.equal(report.summary.totalCorrect, 2);
    assert.equal(report.summary.overallAccuracy, 20);
    assert.equal(report.summary.mathQuestions, 10, "subject math summary");
    assert.equal(report.summary.mathCorrect, 2);
    assert.equal(report.summary.mathAccuracy, 20);

    const additionRow = report.mathOperations?.addition;
    assert.ok(additionRow, "topic row addition");
    assert.equal(additionRow.questions, 10);
    assert.equal(additionRow.correct, 2);
    assert.equal(additionRow.accuracy, 20);

    const lpd = buildLearningPatternDecision({
      subjectId: "math",
      topicRowKey: "addition",
      row: {
        bucketKey: "addition",
        displayName: "חיבור",
        questions: 10,
        correct: 2,
        wrong: 8,
        accuracy: 20,
      },
      rawMistakes: [],
      startMs: START_MS,
      endMs: END_MS,
    });
    assert.equal(lpd.practicedQuestions, 10);
    assert.equal(lpd.wrongCount, 8);
    assert.notEqual(lpd.topicStatus, "initial_data");
    assert.notEqual(lpd.findingType, "initial_topic_data");
    assert.notEqual(lpd.findingType, "no_clear_pattern");
    // Wording updated: "שגויות" (a bare adjective with no noun — not standalone-grammatical
    // Hebrew) was replaced with "שגיאות" (mistakes, a proper noun) in formatWrongOfQuestionsTextHe
    // per an explicit product-owner-mandated grammar fix. Old expectation asserted the
    // ungrammatical form; updated to match the corrected, currently-shipped wording.
    assert.match(String(lpd.parentVisibleFinding), /שגיאות/);
    assert.match(String(lpd.parentVisibleFinding), /8 שגיאות מתוך 10 שאלות/);

    const subjectLine = withholdSummaryCopyHe("subject", {
      subjectReportQuestions: 10,
      sumUnitQuestions: 10,
      reportSubjectAccuracy: 20,
      reportTotalQuestions: 10,
      subjectLabelHe: "מתמטיקה",
      clearWeakTopicLabelHe: "חיבור",
      clearWeakTopicQuestions: 10,
      clearWeakTopicAccuracy: 20,
    });
    assert.ok(!INSUFFICIENT_SUBJECT_SUMMARY_RE.test(subjectLine), subjectLine);
    assert.match(subjectLine, /חיבור/);
  });
});
