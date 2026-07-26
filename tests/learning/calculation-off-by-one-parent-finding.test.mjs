import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enrichParentFindingWithConsistentStrongTag } from "../../utils/learning-pattern-decision/enrich-parent-finding-with-factual-pattern.js";
import { resolveParentPatternLabelForDisplay } from "../../utils/learning-pattern-decision/parent-pattern-label.js";
import { buildLearningPatternDecision } from "../../utils/learning-pattern-decision/build-learning-pattern-decision.js";
import { parentTopicDisplayChromeFromRow } from "../../utils/parent-report-surface/parent-topic-display-chrome.js";

describe("calculation_off_by_one parent-safe finding", () => {
  it("maps mt:calculation_off_by_one to approved Hebrew without taxonomyId", () => {
    assert.equal(
      resolveParentPatternLabelForDisplay("mt:calculation_off_by_one", { taxonomyId: null }),
      "טעות חישוב של סטייה ב-1",
    );
    assert.equal(
      resolveParentPatternLabelForDisplay("calculation_off_by_one", { taxonomyId: null }),
      "טעות חישוב של סטייה ב-1",
    );
    assert.equal(resolveParentPatternLabelForDisplay("unknown"), "");
  });

  it("enriches clear_topic_gap finding when consistent+strong and taxonomyId null", () => {
    const before =
      "בנושא שברים נראה קושי ברור. 14 שגיאות מתוך 25 שאלות (44% דיוק). כדאי לחזור ולתרגל את הנושא לפני שממשיכים. מבוסס על 25 שאלות שנפתרו בנושא.";
    const after = enrichParentFindingWithConsistentStrongTag({
      finding: before,
      topicName: "שברים",
      questions: 25,
      engineDecision: "clear_topic_gap",
      observedPatternLevel: "consistent",
      evidenceStrength: "strong",
      taxonomyId: null,
      subjectId: "math",
      repeatedMistakePatterns: [
        {
          key: "mt:calculation_off_by_one",
          label: "unknown",
          count: 6,
          ratio: 0.42857142857142855,
        },
      ],
    });
    assert.match(after, /טעות חישוב של סטייה ב-1/);
    assert.match(after, /ב-6 תשובות חזרה/);
    assert.match(after, /25 שאלות/);
    assert.match(after, /קושי ברור/);
    assert.doesNotMatch(after, /שורש|אבחון|פסיכולוג|דידקט|למה הילד/);
    assert.equal(after.includes("unknown"), false);
  });

  it("surfaces factual observation even when pattern level is only observed", () => {
    const before =
      "בנושא שברים נראה קושי ברור. 14 שגיאות מתוך 25 שאלות (44% דיוק). כדאי לחזור ולתרגל את הנושא לפני שממשיכים. מבוסס על 25 שאלות שנפתרו בנושא.";
    const after = enrichParentFindingWithConsistentStrongTag({
      finding: before,
      topicName: "שברים",
      questions: 25,
      engineDecision: "clear_topic_gap",
      observedPatternLevel: "observed",
      evidenceStrength: "emerging",
      taxonomyId: null,
      repeatedMistakePatterns: [
        { key: "mt:calculation_off_by_one", label: "unknown", count: 6, ratio: 0.4 },
      ],
    });
    assert.match(after, /טעות חישוב של סטייה ב-1/);
    assert.match(after, /קושי ברור/);
  });

  it("full LPD path keeps engineDecision/ADC/taxonomy unchanged while surfacing pattern", () => {
    const events = [
      ...Array.from({ length: 6 }, () => ({
        isCorrect: false,
        subjectId: "math",
        topicRowKey: "fractions::grade:g6",
        bucketKey: "fractions",
        topicOrOperation: "fractions",
        misconceptionTag: "calculation_off_by_one",
        mode: "practice",
        evidenceSource: "self_practice",
        timestamp: 1_700_000_000_000,
      })),
      // 8 singleton mistakes — must not outrank the off-by-one cluster
      ...Array.from({ length: 8 }, (_, i) => ({
        isCorrect: false,
        subjectId: "math",
        topicRowKey: "fractions::grade:g6",
        bucketKey: "fractions",
        topicOrOperation: "fractions",
        misconceptionTag: `singleton_${i}`,
        mode: "practice",
        evidenceSource: "self_practice",
        timestamp: 1_700_000_000_100 + i,
      })),
    ];

    const unit = {
      subjectId: "math",
      topicRowKey: "fractions::grade:g6",
      displayName: "שברים",
      classification: {
        state: "unclassified_weak_evidence",
        reasonCode: "weak_taxonomy_fallback_blocked",
        taxonomyId: null,
      },
      taxonomy: { id: null },
      patternEvidence: null,
      canonicalState: {
        actionState: "intervene",
        recommendation: { allowed: true, intensityCap: "RI2", reasonCodes: [] },
      },
      confidence: { level: "high" },
      priority: { level: "high" },
    };

    const lpd = buildLearningPatternDecision({
      subjectId: "math",
      topicRowKey: "fractions::grade:g6",
      row: {
        displayName: "שברים",
        questions: 25,
        correct: 11,
        wrong: 14,
        accuracy: 44,
        bucketKey: "fractions",
      },
      unit,
      rawMistakes: events,
      startMs: 1_600_000_000_000,
      endMs: 1_800_000_000_000,
    });

    const contract = lpd.engineDecisionContract;
    assert.equal(contract.engineDecision, "clear_topic_gap");
    assert.equal(unit.taxonomy?.id ?? null, null);
    assert.ok(contract.actionDecisionContract);
    const adcActionBefore = String(contract.actionDecisionContract.action || "");
    assert.ok(adcActionBefore);

    assert.equal(lpd.observedPatternLevel, "consistent");
    assert.equal(lpd.evidenceStrength, "strong");
    assert.match(String(lpd.parentVisibleFinding || ""), /טעות חישוב של סטייה ב-1/);
    assert.match(String(lpd.parentVisibleFinding || ""), /ב-6 תשובות חזרה/);
    assert.match(String(lpd.parentVisibleFinding || ""), /25/);
    assert.doesNotMatch(String(lpd.parentVisibleFinding || ""), /שורש|אבחון|פסיכולוג/);

    assert.equal(lpd.engineDecisionContract.engineDecision, "clear_topic_gap");
    assert.equal(String(lpd.engineDecisionContract.actionDecisionContract.action || ""), adcActionBefore);

    const chrome = parentTopicDisplayChromeFromRow({
      questions: 25,
      accuracy: 44,
      engineDecisionContract: lpd.engineDecisionContract,
      learningPatternDecision: lpd,
      parentActionDecision: { state: "strengthening_needed" },
    });
    assert.equal(chrome.visualVariant, "remediate");
    assert.equal(chrome.weakTopic, true);

    assert.equal(lpd.engineDecisionContract.parentSafeFinding, lpd.parentVisibleFinding);
  });
});
