import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveRepeatedMistakePatterns } from "../../utils/learning-pattern-decision/resolve-repeated-mistake-patterns.js";
import { enrichParentFindingWithConsistentStrongTag } from "../../utils/learning-pattern-decision/enrich-parent-finding-with-factual-pattern.js";
import { buildLearningPatternDecision } from "../../utils/learning-pattern-decision/build-learning-pattern-decision.js";
import { mistakePatternClusterKey } from "../../utils/mistake-event.js";

function practiceEvent(overrides) {
  return {
    isCorrect: false,
    subjectId: "math",
    mode: "practice",
    evidenceSource: "self_practice",
    timestamp: 1_700_000_000_000,
    ...overrides,
  };
}

describe("repeated-mistake pattern label safety", () => {
  it("mt:calculation_off_by_one keeps key and approved Hebrew label; parent finding includes it", () => {
    const events = Array.from({ length: 6 }, () =>
      practiceEvent({
        topicRowKey: "fractions::grade:g6",
        bucketKey: "fractions",
        misconceptionTag: "calculation_off_by_one",
      }),
    );
    // pad with singletons so cluster qualifies by ratio among wrongs
    for (let i = 0; i < 2; i++) {
      events.push(
        practiceEvent({
          topicRowKey: "fractions::grade:g6",
          bucketKey: "fractions",
          misconceptionTag: `singleton_${i}`,
          timestamp: 1_700_000_000_100 + i,
        }),
      );
    }
    assert.equal(mistakePatternClusterKey(events[0]), "mt:calculation_off_by_one");
    const patterns = resolveRepeatedMistakePatterns(events);
    const top = patterns.find((p) => p.key === "mt:calculation_off_by_one");
    assert.ok(top);
    assert.equal(top.key, "mt:calculation_off_by_one");
    assert.equal(top.label, "טעות חישוב של סטייה ב-1");
    assert.equal(String(top.label).includes("mt:"), false);
    assert.equal(String(top.label).includes("calculation_off_by_one"), false);

    const finding = enrichParentFindingWithConsistentStrongTag({
      finding:
        "בנושא שברים נראה קושי ברור. 14 שגיאות מתוך 25 שאלות (44% דיוק). כדאי לחזור ולתרגל את הנושא לפני שממשיכים. מבוסס על 25 שאלות שנפתרו בנושא.",
      topicName: "שברים",
      questions: 25,
      engineDecision: "clear_topic_gap",
      observedPatternLevel: "consistent",
      evidenceStrength: "strong",
      repeatedMistakePatterns: [top],
    });
    assert.match(finding, /טעות חישוב של סטייה ב-1/);
    assert.doesNotMatch(finding, /mt:|calculation_off_by_one/);
  });

  it("pf:procedure_break has cluster label but does NOT enter factualObservations (not in 93 proven)", () => {
    const events = Array.from({ length: 4 }, () =>
      practiceEvent({
        topicRowKey: "decimals::grade:g5",
        bucketKey: "decimals",
        patternFamily: "procedure_break",
      }),
    );
    assert.equal(mistakePatternClusterKey(events[0]), "pf:procedure_break");
    const patterns = resolveRepeatedMistakePatterns(events);
    const top = patterns.find((p) => p.key === "pf:procedure_break");
    assert.ok(top);
    assert.equal(top.key, "pf:procedure_break");
    // Cluster label may resolve; factualObservations must stay empty for this tag.
    assert.equal(String(top.label).includes("pf:"), false);
    assert.equal(String(top.label).includes("procedure_break"), false);

    const finding = enrichParentFindingWithConsistentStrongTag({
      finding: "בנושא עשרוניים יש חלק שדורש חיזוק (12 שאלות, 67% דיוק). כדאי חיזוק ממוקד. מבוסס על 12 שאלות שנפתרו בנושא.",
      topicName: "עשרוניים",
      questions: 12,
      engineDecision: "topic_needs_strengthening",
      observedPatternLevel: "consistent",
      evidenceStrength: "strong",
      repeatedMistakePatterns: [top],
    });
    // Must NOT inject unproven procedure_break into parent factual copy.
    assert.equal(finding.includes("סדר פעולות"), false);
    assert.doesNotMatch(finding, /pf:|procedure_break/);
  });

  it("unmapped mt:measure_confusion keeps key internally, label unknown, parent text stays generic", () => {
    const events = Array.from({ length: 5 }, () =>
      practiceEvent({
        subjectId: "geometry",
        topicRowKey: "area::grade:g5",
        bucketKey: "area",
        misconceptionTag: "measure_confusion",
      }),
    );
    assert.equal(mistakePatternClusterKey(events[0]), "mt:measure_confusion");
    const patterns = resolveRepeatedMistakePatterns(events);
    const top = patterns.find((p) => p.key === "mt:measure_confusion");
    assert.ok(top);
    assert.equal(top.key, "mt:measure_confusion");
    assert.equal(top.label, "unknown");
    assert.equal(String(top.label).includes("mt:"), false);
    assert.equal(String(top.label).includes("measure_confusion"), false);

    const before =
      "בנושא שטח יש חלק שדורש חיזוק (15 שאלות, 60% דיוק). כדאי חיזוק ממוקד. מבוסס על 15 שאלות שנפתרו בנושא.";
    const finding = enrichParentFindingWithConsistentStrongTag({
      finding: before,
      topicName: "שטח",
      questions: 15,
      engineDecision: "topic_needs_strengthening",
      observedPatternLevel: "consistent",
      evidenceStrength: "strong",
      repeatedMistakePatterns: [top],
    });
    assert.equal(finding, before);
    assert.doesNotMatch(finding, /mt:|measure_confusion/);
  });

  it("full LPD path: engine fields unchanged while off-by-one parent text is enriched", () => {
    const events = [
      ...Array.from({ length: 6 }, () =>
        practiceEvent({
          topicRowKey: "fractions::grade:g6",
          bucketKey: "fractions",
          misconceptionTag: "calculation_off_by_one",
        }),
      ),
      ...Array.from({ length: 8 }, (_, i) =>
        practiceEvent({
          topicRowKey: "fractions::grade:g6",
          bucketKey: "fractions",
          misconceptionTag: `singleton_${i}`,
          timestamp: 1_700_000_000_100 + i,
        }),
      ),
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
    const edc = lpd.engineDecisionContract;
    const top = (lpd.detectedPatterns || []).find((p) => p.key === "mt:calculation_off_by_one");
    assert.ok(top);
    assert.equal(top.label, "טעות חישוב של סטייה ב-1");
    assert.equal(edc.detectedPattern, null);
    assert.equal(edc.blockPatternClaim, true);
    assert.equal(unit.taxonomy?.id ?? null, null);
    assert.equal(edc.patternLayer ?? null, null);
    assert.equal(unit.classification?.state, "unclassified_weak_evidence");
    assert.equal(edc.engineDecision, "clear_topic_gap");
    assert.ok(edc.actionDecisionContract?.action);
    assert.match(String(lpd.parentVisibleFinding || ""), /טעות חישוב של סטייה ב-1/);
    assert.doesNotMatch(String(lpd.parentVisibleFinding || ""), /mt:|calculation_off_by_one/);
  });
});
