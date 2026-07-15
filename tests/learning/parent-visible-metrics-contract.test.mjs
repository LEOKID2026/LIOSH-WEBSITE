/**
 * Parent-visible metrics contract — single canonical source for questions/correct/wrong/accuracy.
 * Run: node --test tests/learning/parent-visible-metrics-contract.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeParentVisibleMetrics,
  buildParentMetricsDataLineHe,
  isForbiddenZeroCorrectAllWrongCopy,
  buildLearningPatternDecision,
  buildLpdSafeTopicExplainSectionsHe,
  resolveParentExplainRowCopy,
} from "../../utils/learning-pattern-decision/index.js";
import { buildTopicRecommendationFromV2UnitForPhaseTests } from "../../utils/detailed-parent-report.js";
import { collectTopicEngineRowsFromReport } from "../../utils/parent-report-engine-insights-he.js";
import {
  shouldShowTrendV1Line,
  TREND_V1_PARENT_LINE_HE,
} from "../../utils/parent-report-topic-trend-v1.js";

const START = Date.UTC(2026, 6, 4);
const END = Date.UTC(2026, 6, 4, 23, 59, 59);

/** @param {import("../../utils/learning-pattern-decision/normalize-parent-practice-metrics.js").ParentVisibleMetrics} a @param {import("../../utils/learning-pattern-decision/normalize-parent-practice-metrics.js").ParentVisibleMetrics} b */
function assertMetricsEqual(a, b, label = "") {
  const prefix = label ? `${label}: ` : "";
  assert.equal(a.questions, b.questions, `${prefix}questions`);
  assert.equal(a.correct, b.correct, `${prefix}correct`);
  assert.equal(a.wrong, b.wrong, `${prefix}wrong`);
  assert.equal(a.accuracy, b.accuracy, `${prefix}accuracy`);
}

/** @param {Record<string, unknown>} raw @param {{ questions: number, correct: number, wrong: number, accuracy: number }} expected */
function assertSurfacesParity(raw, expected, opts = {}) {
  const {
    label = "topic",
    topicName = label,
    mapRow = null,
    v2Unit = null,
    baseReport = null,
    subjectId = "math",
  } = opts;

  const canonical = normalizeParentVisibleMetrics(raw, mapRow);
  assertMetricsEqual(canonical, expected, `${label}:normalize`);
  assert.equal(isForbiddenZeroCorrectAllWrongCopy(canonical), false, `${label}:forbidden copy`);

  const lpd = buildLearningPatternDecision({
    subjectId,
    topicRowKey: String(raw.topicRowKey || raw.topicKey || label),
    row: {
      displayName: topicName,
      questions: canonical.questions,
      correct: canonical.correct,
      wrong: canonical.wrong,
      accuracy: canonical.accuracy,
    },
    rawMistakes: [],
    startMs: START,
    endMs: END,
  });

  const explainRow = {
    label: topicName,
    displayName: topicName,
    questions: raw.questions,
    accuracy: raw.accuracy,
    correct: raw.correct,
    wrong: raw.wrong,
    parentVisibleMetrics: canonical,
    mapRow,
    learningPatternDecision: lpd,
  };

  const sections = buildLpdSafeTopicExplainSectionsHe(explainRow);
  assert.ok(sections?.data, `${label}: explain data line`);
  assert.ok(!sections.data.includes("0 נכונות"), `${label}: no fake zero correct`);
  if (canonical.questions > 4 && canonical.canShowCorrectWrongBreakdown) {
    assert.match(sections.data, new RegExp(`${canonical.correct} תשובות נכונות`), `${label}: correct in data`);
    if (canonical.wrong > 0) {
      assert.match(sections.data, new RegExp(`${canonical.wrong} תשובות שגויות`), `${label}: wrong in data`);
    }
  }

  const copy = resolveParentExplainRowCopy(explainRow);
  if (copy.explainSections?.data) {
    assert.ok(!copy.explainSections.data.includes("0 נכונות"), `${label}: resolve copy`);
  }

  if (v2Unit && baseReport) {
    const tr = buildTopicRecommendationFromV2UnitForPhaseTests(v2Unit, baseReport, subjectId);
    assertMetricsEqual(tr.parentVisibleMetrics, expected, `${label}:topicRecommendations`);
    assert.equal(tr.correct, expected.correct, `${label}:tr.correct`);
    assert.equal(tr.wrong, expected.wrong, `${label}:tr.wrong`);
  }
}

function minimalV2Unit(topicRowKey, questions, accuracy) {
  return {
    topicRowKey,
    subjectId: "math",
    displayName: topicRowKey,
    evidenceTrace: [{ type: "volume", value: { questions, accuracy } }],
    confidence: { level: "moderate", rowSignals: { dataSufficiencyLevel: "strong" } },
    priority: { level: "medium", score: 50 },
    outputGating: { cannotConcludeYet: false },
  };
}

describe("parent visible metrics contract", () => {
  test("A - q=206 accuracy=52 counts missing: derive 107/99, never 0/206", () => {
    const expected = { questions: 206, correct: 107, wrong: 99, accuracy: 52 };
    const metrics = normalizeParentVisibleMetrics({ questions: 206, accuracy: 52 });
    assertMetricsEqual(metrics, expected);
    assert.equal(metrics.source, "derived_accuracy");
    assert.equal(isForbiddenZeroCorrectAllWrongCopy(metrics), false);

    const dataLine = buildParentMetricsDataLineHe(metrics, "שברים");
    assert.ok(!dataLine.includes("0 נכונות"));
    assert.ok(!dataLine.includes("206 שגויות"));
    assert.match(dataLine, /107 תשובות נכונות/);
    assert.match(dataLine, /99 תשובות שגויות/);
  });

  test("B - q=206 correct=107 wrong=99 accuracy=52: consistent aggregate path", () => {
    const expected = { questions: 206, correct: 107, wrong: 99, accuracy: 52 };
    const mapRow = {
      questions: 206,
      correct: 107,
      wrong: 99,
      accuracy: 52,
      contractsV1: { evidence: { questionCount: 206, accuracyPct: 52 } },
    };
    const topicRowKey = "fractions::grade:g3";
    const v2Unit = minimalV2Unit(topicRowKey, 206, 52);
    const baseReport = { mathOperations: { [topicRowKey]: mapRow } };

    assertSurfacesParity(
      { questions: 206, accuracy: 52, topicRowKey },
      expected,
      {
        label: "fractions",
        topicName: "שברים",
        mapRow,
        v2Unit,
        baseReport,
      },
    );
  });

  test("C - q=32 correct=22 wrong=10 accuracy=69: consistent aggregate path", () => {
    const expected = { questions: 32, correct: 22, wrong: 10, accuracy: 69 };
    const mapRow = { questions: 32, correct: 22, wrong: 10, accuracy: 69 };
    const topicRowKey = "multiplication::grade:g2";
    const v2Unit = minimalV2Unit(topicRowKey, 32, 69);
    const baseReport = { mathOperations: { [topicRowKey]: mapRow } };

    assertSurfacesParity(
      { questions: 32, accuracy: 69, topicRowKey },
      expected,
      {
        label: "multiplication",
        topicName: "כפל",
        mapRow,
        v2Unit,
        baseReport,
      },
    );
  });

  test("D - Aaa7 addition 10/2/8/20%: consistent across surfaces", () => {
    const expected = { questions: 10, correct: 2, wrong: 8, accuracy: 20 };
    const mapRow = { questions: 10, correct: 2, wrong: 8, accuracy: 20 };
    const topicRowKey = "addition::grade:g2";
    const v2Unit = minimalV2Unit(topicRowKey, 10, 20);
    const baseReport = { mathOperations: { [topicRowKey]: mapRow } };

    assertSurfacesParity(
      { questions: 10, accuracy: 20, topicRowKey },
      expected,
      {
        label: "addition",
        topicName: "חיבור",
        mapRow,
        v2Unit,
        baseReport,
      },
    );
  });

  test("E - q=2: initial_data wording but metrics stay consistent", () => {
    const expected = { questions: 2, correct: 1, wrong: 1, accuracy: 50 };
    const metrics = normalizeParentVisibleMetrics({ questions: 2, correct: 1, wrong: 1, accuracy: 50 });
    assertMetricsEqual(metrics, expected);

    const lpd = buildLearningPatternDecision({
      subjectId: "math",
      topicRowKey: "addition",
      row: { displayName: "חיבור", ...expected },
      rawMistakes: [],
      startMs: START,
      endMs: END,
    });
    assert.equal(lpd.topicStatus, "initial_data");

    const copy = resolveParentExplainRowCopy({
      label: "חיבור",
      ...expected,
      learningPatternDecision: lpd,
    });
    assert.match(copy.explainSections?.meaning || "", /מוקדם/);
    assert.match(copy.explainSections?.data || "", /2 שאלות/);
  });

  test("F - cross-surface parity via collectTopicEngineRowsFromReport", () => {
    const topicRowKey = "fractions::grade:g3";
    const metrics = normalizeParentVisibleMetrics({ questions: 206, accuracy: 52 });
    const report = {
      mathOperations: {
        [topicRowKey]: {
          questions: 206,
          accuracy: 52,
          displayName: "שברים",
          parentVisibleMetrics: metrics,
          correct: metrics.correct,
          wrong: metrics.wrong,
        },
      },
    };
    const rows = collectTopicEngineRowsFromReport(report);
    assert.equal(rows.length, 1);
    assertMetricsEqual(rows[0].parentVisibleMetrics, {
      questions: 206,
      correct: 107,
      wrong: 99,
      accuracy: 52,
    });
    assert.equal(rows[0].correct, 107);
    assert.equal(rows[0].wrong, 99);
  });

  test("G - negative guard: forbidden 0 correct / all wrong when accuracy > 0", () => {
    const broken = { questions: 206, correct: 0, wrong: 206, accuracy: 52 };
    assert.equal(isForbiddenZeroCorrectAllWrongCopy(broken), true);

    const fixed = normalizeParentVisibleMetrics({ questions: 206, accuracy: 52 });
    assert.equal(isForbiddenZeroCorrectAllWrongCopy(fixed), false);

    const lpd = buildLearningPatternDecision({
      subjectId: "math",
      topicRowKey: "fractions",
      row: {
        displayName: "שברים",
        questions: fixed.questions,
        correct: fixed.correct,
        wrong: fixed.wrong,
        accuracy: fixed.accuracy,
      },
      rawMistakes: [],
      startMs: START,
      endMs: END,
    });

    const sections = buildLpdSafeTopicExplainSectionsHe({
      label: "שברים",
      questions: 206,
      accuracy: 52,
      parentVisibleMetrics: fixed,
      learningPatternDecision: lpd,
    });

    assert.ok(sections?.data);
    assert.ok(!sections.data.includes("0 נכונות ו-206 שגויות"));
    assert.ok(!sections.data.includes("0 נכונות"));
  });

  test("H - trendV1 only on practiced topics with displayable direction", () => {
    const improving = {
      ok: true,
      direction: "improving",
      parentLineHe: TREND_V1_PARENT_LINE_HE.improving,
    };
    const insufficient = {
      ok: true,
      direction: "insufficient_data",
      parentLineHe: TREND_V1_PARENT_LINE_HE.insufficient_data,
    };

    assert.equal(shouldShowTrendV1Line(improving), true);
    assert.equal(shouldShowTrendV1Line(insufficient), false);

    const report = {
      mathOperations: {
        addition: {
          questions: 12,
          correct: 9,
          wrong: 3,
          accuracy: 75,
          displayName: "חיבור",
          trendV1: improving,
        },
        subtraction: {
          questions: 0,
          correct: 0,
          wrong: 0,
          accuracy: 0,
          displayName: "חיסור",
          trendV1: insufficient,
        },
      },
    };

    const rows = collectTopicEngineRowsFromReport(report);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].topicKey, "addition");
    assert.equal(shouldShowTrendV1Line(rows[0].trendV1), true);
    assert.equal(rows[0].trendV1?.direction, "improving");
  });
});
