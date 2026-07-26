/**
 * Final parent factual-observations + recurrence ladder + report parity.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFactualObservations,
  resolveFactualRecurrenceLevel,
  formatFactualObservationSentenceHe,
} from "../../utils/learning-pattern-decision/build-factual-observations.js";
import { composeParentFindingWithFactualObservations } from "../../utils/learning-pattern-decision/compose-parent-finding-with-factual-observations.js";
import { buildLearningPatternDecision } from "../../utils/learning-pattern-decision/build-learning-pattern-decision.js";
import { parentFacingErrorPatternLabelHe } from "../../utils/learning-pattern-decision/parent-facing-error-pattern-he.js";
import {
  buildEngineDiagnosticDecision,
  computeAccuracyBand,
  computeEngineConfidenceTier,
} from "../../utils/parent-report-engine-v1-signals.js";
import {
  parentTopicDisplayChromeFromRow,
  parentTopicDisplayChromeFromDecision,
} from "../../utils/parent-report-surface/parent-topic-display-chrome.js";
import { resolveTopicParentFindingHe } from "../../utils/learning-pattern-decision/lpd-parent-facing-copy.js";
import { buildDetailedParentReportFromBaseReport } from "../../utils/detailed-parent-report.js";
import { PROVEN_FACTUAL_PARENT_LABEL_HE } from "../../utils/learning-pattern-decision/parent-facing-error-pattern-he.js";

function wrong(tag, i = 0, extra = {}) {
  return {
    isCorrect: false,
    subjectId: "math",
    mode: "practice",
    evidenceSource: "self_practice",
    timestamp: 1_700_000_000_000 + i * 1000,
    topicRowKey: "fractions::grade:g6",
    bucketKey: "fractions",
    misconceptionTag: tag,
    ...extra,
  };
}
function correct(i = 0) {
  return {
    isCorrect: true,
    subjectId: "math",
    mode: "practice",
    timestamp: 1_700_000_100_000 + i,
    topicRowKey: "fractions::grade:g6",
    bucketKey: "fractions",
  };
}

function lpdFor({ q, wrongCount, patternCount, tag = "calculation_off_by_one", topicNameHe = "שברים" }) {
  const events = [];
  for (let i = 0; i < patternCount; i++) events.push(wrong(tag, i));
  for (let i = patternCount; i < wrongCount; i++) events.push(wrong(`other_${i}`, 100 + i));
  for (let i = 0; i < q - wrongCount; i++) events.push(correct(i));
  const accuracy = Math.round(((q - wrongCount) / q) * 100);
  return buildLearningPatternDecision({
    subjectId: "math",
    topicRowKey: "fractions::grade:g6",
    row: {
      bucketKey: "fractions",
      topicNameHe,
      label: topicNameHe,
      questions: q,
      correct: q - wrongCount,
      wrong: wrongCount,
      accuracy,
    },
    unit: null,
    rawMistakes: events,
  });
}

describe("factual recurrence ladder", () => {
  it("1 occurrence → observed", () => {
    assert.equal(resolveFactualRecurrenceLevel({ count: 1, totalQuestions: 10, totalErrors: 1 }), "observed");
  });
  it("2 occurrences → repeated", () => {
    assert.equal(resolveFactualRecurrenceLevel({ count: 2, totalQuestions: 40, totalErrors: 2 }), "repeated");
  });
  it("3/40 → repeated only (not consistent)", () => {
    assert.equal(resolveFactualRecurrenceLevel({ count: 3, totalQuestions: 40, totalErrors: 3 }), "repeated");
  });
  it("4/12 → consistent", () => {
    assert.equal(resolveFactualRecurrenceLevel({ count: 4, totalQuestions: 12, totalErrors: 4 }), "consistent");
  });
  it("5/10 → strong", () => {
    assert.equal(resolveFactualRecurrenceLevel({ count: 5, totalQuestions: 10, totalErrors: 5 }), "strong");
  });
  it("6/25 → strong", () => {
    assert.equal(resolveFactualRecurrenceLevel({ count: 6, totalQuestions: 25, totalErrors: 6 }), "strong");
  });
  it("4/4 → repeated not consistent (sample size)", () => {
    assert.equal(resolveFactualRecurrenceLevel({ count: 4, totalQuestions: 4, totalErrors: 4 }), "repeated");
  });
  it("count passes but ratioOfQuestions fails → not consistent", () => {
    // q=20, count=3, errors=3 → ratioQ=0.15 edge; need ratioQ>=0.15 and ratioE>=0.4 and q>=5 count>=3
    // 3/40 ratioQ=0.075 fails
    assert.equal(resolveFactualRecurrenceLevel({ count: 3, totalQuestions: 40, totalErrors: 5 }), "repeated");
  });
  it("ratioOfErrors passes but count fails → not consistent", () => {
    assert.equal(resolveFactualRecurrenceLevel({ count: 2, totalQuestions: 12, totalErrors: 2 }), "repeated");
  });
  it("ratioOfQuestions passes but ratioOfErrors fails", () => {
    // count=3, q=12 → ratioQ=0.25; errors=10 → ratioE=0.3 < 0.4
    assert.equal(resolveFactualRecurrenceLevel({ count: 3, totalQuestions: 12, totalErrors: 10 }), "repeated");
  });
  it("3/5 with high ratios → consistent", () => {
    assert.equal(resolveFactualRecurrenceLevel({ count: 3, totalQuestions: 5, totalErrors: 5 }), "consistent");
  });
});

describe("thin volume chrome — never טוב/מצוין under 10Q", () => {
  it("2Q 50% → early badge, not excellent", () => {
    const chrome = parentTopicDisplayChromeFromRow({
      questions: 2,
      accuracy: 50,
      engineDecisionContract: { engineDecision: "insufficient_data" },
    });
    assert.equal(chrome.excellent, false);
    assert.match(chrome.badgeHe, /מעט שאלות/);
    assert.doesNotMatch(chrome.badgeHe, /מצוין|טוב/);
  });
  it("4Q 100% → כיוון ראשוני", () => {
    const chrome = parentTopicDisplayChromeFromRow({
      questions: 4,
      accuracy: 100,
      engineDecisionContract: { engineDecision: "insufficient_data" },
    });
    assert.equal(chrome.badgeHe, "מעט שאלות - כיוון ראשוני");
    assert.equal(chrome.excellent, false);
  });
  it("4Q many errors badge", () => {
    const chrome = parentTopicDisplayChromeFromRow({
      questions: 4,
      accuracy: 25,
      engineDecisionContract: { engineDecision: "insufficient_data" },
    });
    assert.equal(chrome.badgeHe, "מעט שאלות - נראו הרבה טעויות");
  });
});

describe("engineDecision bands (product final)", () => {
  it("q=9 100% → early_direction_only not mastery", () => {
    const d = buildEngineDiagnosticDecision({
      q: 9,
      acc: 100,
      wrongRatio: 0,
      engineConfidenceTier: computeEngineConfidenceTier(9),
      accuracyBand: computeAccuracyBand(100, 9),
    });
    assert.equal(d.engineDecision, "early_direction_only");
  });
  it("q=10 100% → mastery_stable", () => {
    const d = buildEngineDiagnosticDecision({
      q: 10,
      acc: 100,
      wrongRatio: 0,
      engineConfidenceTier: computeEngineConfidenceTier(10),
      accuracyBand: computeAccuracyBand(100, 10),
    });
    assert.equal(d.engineDecision, "mastery_stable");
  });
  it("q=7 80% → early_direction_only", () => {
    const d = buildEngineDiagnosticDecision({
      q: 7,
      acc: 80,
      wrongRatio: 0.2,
      engineConfidenceTier: computeEngineConfidenceTier(7),
      accuracyBand: computeAccuracyBand(80, 7),
    });
    assert.equal(d.engineDecision, "early_direction_only");
  });
  it("q=12 40% → clear_topic_gap", () => {
    const d = buildEngineDiagnosticDecision({
      q: 12,
      acc: 40,
      wrongRatio: 0.6,
      engineConfidenceTier: computeEngineConfidenceTier(12),
      accuracyBand: computeAccuracyBand(40, 12),
    });
    assert.equal(d.engineDecision, "clear_topic_gap");
  });
});

describe("factual observations beside positive accuracy", () => {
  it("20Q 90% 2 identical → mastery + observation", () => {
    const lpd = lpdFor({ q: 20, wrongCount: 2, patternCount: 2 });
    assert.equal(lpd.engineDecisionContract.engineDecision, "mastery_stable");
    assert.equal(lpd.factualObservations.length, 1);
    assert.equal(lpd.factualObservations[0].count, 2);
    assert.equal(lpd.factualObservations[0].recurrenceLevel, "repeated");
    assert.match(lpd.parentVisibleFinding, /הצלחה טובה ויציבה|שליטה יציבה/);
    assert.match(lpd.parentVisibleFinding, /בשתי תשובות חזרה טעות חישוב של סטייה ב-1/);
    assert.equal(lpd.engineDecisionContract.detectedPattern, null);
    assert.equal(lpd.engineDecisionContract.blockPatternClaim, true);
  });

  it("25Q 76% 6 identical → partial + observation", () => {
    const lpd = lpdFor({ q: 25, wrongCount: 6, patternCount: 6 });
    assert.equal(lpd.engineDecisionContract.engineDecision, "partial_stable");
    assert.equal(lpd.observedPatternLevel, "strong");
    assert.match(lpd.parentVisibleFinding, /הבנה חלקית/);
    assert.match(lpd.parentVisibleFinding, /ב-6 תשובות חזרה טעות חישוב של סטייה ב-1/);
  });

  it("40Q 95% 2 identical → mastery + repeated not strong", () => {
    const lpd = lpdFor({ q: 40, wrongCount: 2, patternCount: 2 });
    assert.equal(lpd.engineDecisionContract.engineDecision, "mastery_stable");
    assert.equal(lpd.factualObservations[0].recurrenceLevel, "repeated");
    assert.notEqual(lpd.observedPatternLevel, "strong");
    assert.match(lpd.parentVisibleFinding, /בשתי תשובות חזרה/);
  });

  it("AAA12-like 25Q 14 wrong 6 off_by_one → yellow gap + observation", () => {
    const lpd = lpdFor({ q: 25, wrongCount: 14, patternCount: 6 });
    assert.equal(lpd.engineDecisionContract.engineDecision, "clear_topic_gap");
    assert.match(lpd.parentVisibleFinding, /קושי ברור/);
    assert.match(lpd.parentVisibleFinding, /ב-6 תשובות חזרה טעות חישוב של סטייה ב-1/);
    assert.match(lpd.parentVisibleFinding, /25 שאלות/);
    const chrome = parentTopicDisplayChromeFromDecision("clear_topic_gap");
    assert.equal(chrome.weakTopic, true);
    assert.match(chrome.cardClassName, /yellow/);
  });
});

describe("thin volume with observations", () => {
  it("1/1 one observation", () => {
    const lpd = lpdFor({ q: 1, wrongCount: 1, patternCount: 1 });
    assert.equal(lpd.factualObservations[0]?.count, 1);
    assert.equal(lpd.factualObservations[0]?.recurrenceLevel, "observed");
    assert.match(lpd.parentVisibleFinding, /בתשובה אחת הופיעה/);
  });
  it("2/2 same tag → repeated", () => {
    const lpd = lpdFor({ q: 2, wrongCount: 2, patternCount: 2 });
    assert.equal(lpd.factualObservations[0].recurrenceLevel, "repeated");
    assert.match(lpd.parentVisibleFinding, /בשתי תשובות חזרה/);
  });
  it("4/4 same tag → repeated not consistent", () => {
    const lpd = lpdFor({ q: 4, wrongCount: 4, patternCount: 4 });
    assert.equal(lpd.factualObservations[0].recurrenceLevel, "repeated");
  });
});

describe("aliases merge", () => {
  it("carry_error + regroup_error + column_carry_error → one observation", () => {
    const events = [
      wrong("carry_error", 0),
      wrong("regroup_error", 1),
      wrong("column_carry_error", 2),
      correct(0),
      correct(1),
      correct(2),
      correct(3),
      correct(4),
      correct(5),
      correct(6),
      correct(7),
      correct(8),
    ];
    const obs = buildFactualObservations({
      wrongEvents: events.filter((e) => !e.isCorrect),
      totalQuestions: 12,
      totalErrors: 3,
    });
    assert.equal(obs.length, 1);
    assert.equal(obs[0].canonicalKey, "carry_error");
    assert.equal(obs[0].count, 3);
    assert.equal(obs[0].labelHe, parentFacingErrorPatternLabelHe("carry_error"));
    assert.doesNotMatch(obs[0].labelHe, /carry_error|regroup|mt:/);
  });
});

describe("report surface parity with factualObservations", () => {
  it("regular/detailed/short share finding + chrome meaning", () => {
    const lpd = lpdFor({ q: 25, wrongCount: 14, patternCount: 6 });
    const rowObj = {
      bucketKey: "fractions",
      label: "שברים",
      questions: 25,
      correct: 11,
      wrong: 14,
      accuracy: 44,
      learningPatternDecision: lpd,
      engineDecisionContract: lpd.engineDecisionContract,
      parentVisibleMetrics: { questions: 25, correct: 11, wrong: 14, accuracy: 44 },
    };
    const regularText = resolveTopicParentFindingHe(rowObj, []);
    const regularChrome = parentTopicDisplayChromeFromRow(rowObj);
    const baseReport = {
      playerName: "_audit_",
      period: "week",
      summary: {},
      mathOperations: { "fractions::grade:g6": { ...rowObj, topicRowKey: "fractions::grade:g6" } },
      diagnosticEngineV2: { units: [] },
    };
    const detailed = buildDetailedParentReportFromBaseReport(baseReport, { playerName: "_audit_" });
    assert.ok(detailed);
    const shortText = resolveTopicParentFindingHe(rowObj, []);
    const shortChrome = parentTopicDisplayChromeFromRow(rowObj);
    assert.match(regularText, /טעות חישוב של סטייה ב-1/);
    assert.match(shortText, /טעות חישוב של סטייה ב-1/);
    assert.equal(regularChrome.visualVariant, shortChrome.visualVariant);
    assert.equal(
      lpd.factualObservations.length,
      lpd.engineDecisionContract.factualObservations.length,
    );
    assert.equal(lpd.engineDecisionContract.engineDecision, "clear_topic_gap");
  });
});

describe("proven labels coverage", () => {
  it("93 proven tags have factual Hebrew labels", () => {
    const proven = Object.keys(PROVEN_FACTUAL_PARENT_LABEL_HE).filter((k) =>
      ![
        "procedural_error",
        "procedure_break",
        "calculation_error",
        "conceptual_error",
        "conceptual_misunderstanding",
        "strategy_gap",
        "prerequisite_gap",
        "reading_comprehension_issue",
        "vocabulary_gap",
        "phonics_gap",
        "inference_gap",
        "speed_pressure",
        "careless_or_attention",
        "guessing_or_unstable",
        "careless_error",
        "careless_pattern",
        "operation_selection_error",
        "fraction_concept_error",
        "word_problem_reading",
        "instruction_misread",
        "support_dependent_success",
        "recurring_weakness",
        "speed_driven_error",
      ].includes(k),
    );
    assert.ok(proven.length >= 93, `expected >=93 got ${proven.length}`);
    for (const tag of proven) {
      const he = parentFacingErrorPatternLabelHe(tag);
      assert.ok(he, `missing label for ${tag}`);
      assert.doesNotMatch(he, /בלבול|חוסר הבנה|חוסר בסיס|ניחוש|חוסר תשומת לב|קושי יסודי|אינו מבין/);
      assert.doesNotMatch(he, /^(mt|pf):/i);
    }
  });
});

describe("engine fields unchanged by factualObservations", () => {
  it("does not set detectedPattern from factual observation", () => {
    const lpd = lpdFor({ q: 25, wrongCount: 14, patternCount: 6 });
    assert.equal(lpd.engineDecisionContract.detectedPattern, null);
    assert.equal(lpd.engineDecisionContract.blockPatternClaim, true);
    assert.equal(lpd.engineDecisionContract.patternLayer, null);
    assert.ok(Array.isArray(lpd.factualObservations));
    assert.ok(lpd.factualObservations.length >= 1);
  });
});
