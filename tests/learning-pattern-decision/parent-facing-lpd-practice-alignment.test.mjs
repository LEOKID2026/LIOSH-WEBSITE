/**
 * Parent-facing LPD must align with parent practice totals (not diagnostic-only subset).
 * Run: node --test tests/learning-pattern-decision/parent-facing-lpd-practice-alignment.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildLearningPatternDecision,
  buildLpdSafeTopicExplainSectionsHe,
  findForbiddenParentWords,
  guardParentFacingText,
  resolveOrBuildLpdOnRow,
  resolveParentExplainRowCopy,
} from "../../utils/learning-pattern-decision/index.js";
import { buildActivityGapParentInsightHe } from "../../utils/parent-report-engine-insights-he.js";
import { parentTopicTierFromUnit } from "../../utils/parent-report-surface/parent-topic-tier.js";
import { aggregateReportPayloadFromActivityRows } from "../../lib/parent-server/report-data-aggregate.server.js";
import { EVIDENCE_CATEGORIES } from "../../lib/learning/activity-classification.js";

const START = Date.UTC(2026, 6, 4);
const END = Date.UTC(2026, 6, 4, 23, 59, 59);

function mistake(patternFamily, i = 0) {
  return {
    bucketKey: "addition",
    mode: "practice",
    isCorrect: false,
    patternFamily,
    timestamp: START + i * 60_000,
  };
}

describe("parent-facing LPD practice alignment", () => {
  test("A - q=10 parent totals with sparse diagnostic mistakes: no initial_data, no forbidden copy", () => {
    const lpd = buildLearningPatternDecision({
      subjectId: "math",
      topicRowKey: "addition",
      row: { bucketKey: "addition", displayName: "חיבור", questions: 10, correct: 2, wrong: 8, accuracy: 20 },
      rawMistakes: [mistake("unknown"), mistake("unknown", 1)],
      startMs: START,
      endMs: END,
    });

    assert.equal(lpd.practicedQuestions, 10);
    assert.equal(lpd.wrongCount, 8);
    assert.notEqual(lpd.topicStatus, "initial_data");
    assert.notEqual(lpd.findingType, "initial_topic_data");
    assert.notEqual(lpd.topicStatus, "positive_observed");
    assert.ok(/טעויות|שגויות/u.test(String(lpd.parentVisibleFinding)));
    assert.ok(!String(lpd.parentVisibleFinding).toLowerCase().includes("unknown"));
    assert.equal(findForbiddenParentWords(lpd.parentVisibleFinding).length, 0);

    const row = {
      subjectId: "math",
      topicKey: "addition",
      label: "חיבור",
      questions: 10,
      correct: 2,
      wrong: 8,
      accuracy: 20,
      learningPatternDecision: {
        ...lpd,
        practicedQuestions: 2,
        wrongCount: 0,
        topicStatus: "initial_data",
        findingType: "initial_topic_data",
        parentVisibleFinding: "stale",
      },
    };
    const rebuilt = resolveOrBuildLpdOnRow(row);
    assert.equal(rebuilt.practicedQuestions, 10);
    assert.equal(rebuilt.wrongCount, 8);
    assert.notEqual(rebuilt.topicStatus, "initial_data");

    const sections = buildLpdSafeTopicExplainSectionsHe({ ...row, learningPatternDecision: rebuilt });
    assert.ok(sections);
    assert.match(sections.data, /10 שאלות/);
    assert.match(sections.data, /2 נכונות/);
    assert.ok(!sections.identified.includes("unknown"));
    assert.ok(!sections.identified.includes("רק 2"));
    assert.ok(!sections.meaning.includes("מוקדם לזהות"));
  });

  test("B - repeated pattern with unknown label → generic difficulty copy, no pattern name", () => {
    const lpd = buildLearningPatternDecision({
      subjectId: "math",
      topicRowKey: "addition",
      row: { bucketKey: "addition", displayName: "חיבור", questions: 10, correct: 2, wrong: 8, accuracy: 20 },
      rawMistakes: Array.from({ length: 8 }, (_, i) => mistake("unknown", i)),
      startMs: START,
      endMs: END,
    });

    assert.ok(!String(lpd.parentVisibleFinding).includes("unknown"));
    assert.ok(!String(lpd.parentVisibleFinding).includes("דפוס חוזר"));
    assert.match(lpd.parentVisibleFinding, /טעויות|שגויות/u);
  });

  test("C - activity gap diagnostic mismatch suppressed from parent insights", () => {
    const gap = buildActivityGapParentInsightHe({
      summary: { totalAnswers: 10, diagnosticAnswers: 2, totalSessions: 1 },
    });
    assert.equal(gap, null);
  });

  test("D - q=10 acc=20% tier is strengthen/clear_gap not low_evidence", () => {
    const tier = parentTopicTierFromUnit(
      { evidenceTrace: [{ type: "volume", value: { questions: 10, accuracy: 20 } }] },
      { questions: 10, accuracy: 20 },
    );
    assert.notEqual(tier, "low_evidence");
    assert.ok(tier === "clear_gap" || tier === "strengthen");
  });

  test("E - legacy learning_guided attempts count in aggregation + LPD uses parent totals", () => {
    const session = {
      id: "sess-lg",
      student_id: "stu",
      subject: "math",
      topic: "addition",
      started_at: "2026-07-04T10:00:00+03:00",
      created_at: "2026-07-04T10:00:00+03:00",
      ended_at: "2026-07-04T10:30:00+03:00",
      duration_seconds: 600,
      status: "completed",
      metadata: { mode: "learning" },
    };
    const answers = [
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `w-${i}`,
        student_id: "stu",
        learning_session_id: session.id,
        question_id: `q-w-${i}`,
        is_correct: false,
        answered_at: "2026-07-04T10:05:00+03:00",
        answer_payload: {
          subject: "math",
          topic: "addition",
          gameMode: "learning",
          isDiagnosticEligible: false,
          evidenceCategory: EVIDENCE_CATEGORIES.LEARNING_GUIDED,
          contextFlags: { afterStepByStep: false },
        },
      })),
      ...Array.from({ length: 2 }, (_, i) => ({
        id: `c-${i}`,
        student_id: "stu",
        learning_session_id: session.id,
        question_id: `q-c-${i}`,
        is_correct: true,
        answered_at: "2026-07-04T10:06:00+03:00",
        answer_payload: {
          subject: "math",
          topic: "addition",
          gameMode: "practice",
          isDiagnosticEligible: true,
          evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT,
          contextFlags: { afterStepByStep: false },
          clientMeta: { gameMode: "practice" },
        },
      })),
    ];
    const raw = aggregateReportPayloadFromActivityRows(
      { id: "stu", grade_level: "g2", is_active: true },
      [session],
      answers,
      new Date("2026-07-04T00:00:00+03:00"),
      new Date("2026-07-04T23:59:59+03:00"),
      { sessionsFilterField: "started_at", answersFilterField: "answered_at" },
      [],
    );
    const topic = raw.subjects.math.topics.addition;
    assert.equal(topic.answers, 10);
    assert.equal(topic.wrong, 8);

    const lpd = buildLearningPatternDecision({
      subjectId: "math",
      topicRowKey: "addition",
      row: {
        bucketKey: "addition",
        displayName: "חיבור",
        questions: topic.answers,
        correct: topic.correct,
        wrong: topic.wrong,
        accuracy: topic.accuracy,
      },
      rawMistakes: [],
      startMs: START,
      endMs: END,
    });
    assert.equal(lpd.practicedQuestions, 10);
    assert.equal(lpd.wrongCount, 8);
    assert.notEqual(lpd.topicStatus, "positive_observed");
  });

  test("F - q=1–2 remains initial_topic_data", () => {
    const lpd = buildLearningPatternDecision({
      subjectId: "math",
      topicRowKey: "addition",
      row: { bucketKey: "addition", displayName: "חיבור", questions: 2, correct: 1, wrong: 1, accuracy: 50 },
      rawMistakes: [],
      startMs: START,
      endMs: END,
    });
    assert.equal(lpd.topicStatus, "initial_data");
    assert.equal(lpd.findingType, "initial_topic_data");

    const copy = resolveParentExplainRowCopy({
      label: "חיבור",
      questions: 2,
      correct: 1,
      wrong: 1,
      accuracy: 50,
      learningPatternDecision: lpd,
    });
    assert.match(copy.explainSections.meaning, /מוקדם/);
    assert.equal(guardParentFacingText(copy.primaryFinding).length > 0, true);
  });

  test("G - q=10 acc=20% with wrong=0 on row still yields clear difficulty finding", () => {
    const row = {
      subjectId: "math",
      topicKey: "addition",
      label: "חיבור",
      displayName: "חיבור",
      questions: 10,
      correct: 2,
      wrong: 0,
      accuracy: 20,
      learningPatternDecision: {
        practicedQuestions: 10,
        correctCount: 2,
        wrongCount: 8,
        accuracy: 20,
        topicStatus: "no_clear_pattern",
        findingType: "none",
        parentVisibleFinding: "",
        parentWordingLevel: "no_parent_text",
      },
    };
    const rebuilt = resolveOrBuildLpdOnRow(row);
    assert.notEqual(rebuilt.topicStatus, "initial_data");
    assert.notEqual(rebuilt.topicStatus, "no_clear_pattern");
    assert.notEqual(rebuilt.topicStatus, "positive_observed");
    assert.match(rebuilt.parentVisibleFinding, /חזק|טעויות/);
    assert.ok(!rebuilt.parentVisibleFinding.includes("unknown"));

    const copy = resolveParentExplainRowCopy({ ...row, learningPatternDecision: rebuilt });
    const allText = [
      copy.primaryFinding,
      copy.explainSections?.identified,
      copy.explainSections?.data,
      copy.explainSections?.meaning,
      copy.explainSections?.action,
    ]
      .filter(Boolean)
      .join(" ");
    assert.ok(!/אין תמונה מספיק|מעט נתונים|עדיין מוקדם/u.test(allText));
    assert.match(allText, /חיבור/);
    assert.match(allText, /10/);
    assert.match(copy.explainSections.data, /8 שגויות/);
  });

  test("H - q=10 wrong=8 with real pattern label shows specific pattern", () => {
    const lpd = buildLearningPatternDecision({
      subjectId: "math",
      topicRowKey: "addition",
      row: { bucketKey: "addition", displayName: "חיבור", questions: 10, correct: 2, wrong: 8, accuracy: 20 },
      rawMistakes: Array.from({ length: 8 }, (_, i) => ({
        ...mistake("carry_error", i),
        patternFamily: "carry_error",
      })),
      startMs: START,
      endMs: END,
    });
    assert.match(lpd.parentVisibleFinding, /דפוס חוזר/);
    assert.match(lpd.parentVisibleFinding, /carry_error/);
    assert.ok(!String(lpd.parentVisibleFinding).includes("unknown"));
  });

  test("I - q=10 wrong=8 mixed patterns without usable label → general difficulty only", () => {
    const rawMistakes = [
      ...Array.from({ length: 4 }, (_, i) => mistake("unknown", i)),
      ...Array.from({ length: 4 }, (_, i) => mistake("pf:other", i + 4)),
    ];
    const lpd = buildLearningPatternDecision({
      subjectId: "math",
      topicRowKey: "addition",
      row: { bucketKey: "addition", displayName: "חיבור", questions: 10, correct: 2, wrong: 8, accuracy: 20 },
      rawMistakes,
      startMs: START,
      endMs: END,
    });
    assert.ok(!String(lpd.parentVisibleFinding).includes("unknown"));
    assert.ok(!String(lpd.parentVisibleFinding).includes("pf:"));
    assert.match(lpd.parentVisibleFinding, /טעויות|שגויות/u);
    assert.notEqual(lpd.topicStatus, "no_clear_pattern");
  });
});
