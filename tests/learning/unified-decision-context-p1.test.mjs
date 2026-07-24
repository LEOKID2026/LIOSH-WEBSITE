import test from "node:test";
import assert from "node:assert/strict";

import {
  buildUnifiedDecisionContext,
  reconcileEngineDecisionWithContext,
} from "../../utils/learning-pattern-decision/build-unified-decision-context.js";
import { buildSubjectEngineDecisionContract } from "../../utils/learning-pattern-decision/build-subject-engine-decision-contract.js";
import { mapEngineRecommendedAction } from "../../utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js";

function row(overrides = {}) {
  return {
    questions: 20,
    correct: 12,
    wrong: 8,
    accuracy: 60,
    modeKey: "practice",
    gradeRelation: "same",
    registeredGradeKey: "g4",
    contentGradeKey: "g4",
    behaviorProfile: {
      dominantType: "knowledge_gap",
      signals: {
        hintRate: 0,
        hintKnownCount: 8,
        medianResponseMsWrong: 12_000,
      },
    },
    trend: {
      accuracyDirection: "flat",
      confidence: 0.8,
      windows: {
        currentPeriod: { accuracy: 60, sessionCount: 2 },
        previousComparablePeriod: { accuracy: 60, sessionCount: 2 },
        recentShortWindow: { accuracy: 60, sessionCount: 2 },
      },
    },
    topicEngineRowSignals: { riskFlags: {} },
    ...overrides,
  };
}

function unit(overrides = {}) {
  return {
    subjectId: "math",
    bucketKey: "addition",
    diagnosis: { allowed: false },
    recurrence: { full: false },
    gradeEvidence: {
      gradeRelation: "same",
      registeredGradeKey: "g4",
      contentGradeKey: "g4",
    },
    canonicalState: {
      actionState: "probe_only",
      recommendation: { allowed: false, intensityCap: "RI0", family: "probe_only" },
    },
    ...overrides,
  };
}

function v3(overrides = {}) {
  return {
    v3Rollup: {
      evidenceStrength: "strong",
      confidence: "medium",
      diagnosisStage: "enough_for_working_hypothesis",
      recommendedNextStep: "practice_more",
      contradictorySignals: false,
      avgTimeMs: 12_000,
      slowCount: 0,
      fastWrongCount: 0,
      gradeRelation: "same_as_registered_grade",
      foundationRisk: false,
      enrichmentSignal: false,
      caveatNeeded: false,
      ...overrides,
    },
  };
}

function mistakes(count = 8) {
  return Array.from({ length: count }, (_, index) => ({
    isCorrect: false,
    timestamp: Date.UTC(2026, 6, 1 + (index % 3)),
    sessionId: `p1-session-${index % 2}`,
    mode: "practice",
    hintUsed: false,
    afterStepByStep: false,
    metadata: {
      metadataSource: "question_metadata_normalizer",
      possibleErrorPatterns: ["addition_repeated"],
    },
    possibleErrorPatterns: ["addition_repeated"],
    expectedErrorTags: ["addition_repeated"],
  }));
}

test("P1 trend differential changes decision/priority but not canonical action eligibility", () => {
  const improving = buildUnifiedDecisionContext({
    row: row({
      accuracy: 75,
      trend: {
        accuracyDirection: "up",
        confidence: 0.8,
        windows: {
          currentPeriod: { accuracy: 75, sessionCount: 2 },
          previousComparablePeriod: { accuracy: 55, sessionCount: 2 },
          recentShortWindow: { accuracy: 82, sessionCount: 2 },
        },
      },
    }),
    unit: unit(),
    v3Enrichment: v3(),
    eligibleMistakes: mistakes(),
  });
  const declining = buildUnifiedDecisionContext({
    row: row({
      accuracy: 75,
      trend: {
        accuracyDirection: "down",
        confidence: 0.8,
        windows: {
          currentPeriod: { accuracy: 75, sessionCount: 2 },
          previousComparablePeriod: { accuracy: 88, sessionCount: 2 },
          recentShortWindow: { accuracy: 60, sessionCount: 2 },
        },
      },
    }),
    unit: unit(),
    v3Enrichment: v3(),
    eligibleMistakes: mistakes(),
  });
  assert.ok(declining.reconciler.priorityAdjustment > improving.reconciler.priorityAdjustment);
  assert.equal(
    reconcileEngineDecisionWithContext("partial_stable", declining).engineDecision,
    "topic_needs_strengthening",
  );
  assert.equal(improving.evidenceEligibility.action, false);
  assert.equal(declining.evidenceEligibility.action, false);
});

test("P1 timing differential identifies supported speed-only pattern", () => {
  const normal = buildUnifiedDecisionContext({
    row: row(),
    unit: unit(),
    v3Enrichment: v3(),
    eligibleMistakes: mistakes(),
  });
  const fast = buildUnifiedDecisionContext({
    row: row({ topicEngineRowSignals: { riskFlags: { speedOnlyRisk: true } } }),
    unit: unit(),
    v3Enrichment: v3({ avgTimeMs: 1_500, fastWrongCount: 5 }),
    eligibleMistakes: mistakes(),
  });
  assert.ok(fast.reconciler.priorityAdjustment > normal.reconciler.priorityAdjustment);
  assert.equal(
    reconcileEngineDecisionWithContext("topic_needs_strengthening", fast).engineDecision,
    "speed_pressure_pattern",
  );
  assert.equal(fast.evidenceEligibility.action, false);
});

test("P1 guided success cannot equal independent mastery", () => {
  const independent = buildUnifiedDecisionContext({
    row: row({ accuracy: 95, correct: 19, wrong: 1 }),
    unit: unit(),
    v3Enrichment: v3({ recommendedNextStep: "maintain" }),
    eligibleMistakes: mistakes(1),
  });
  const guided = buildUnifiedDecisionContext({
    row: row({
      accuracy: 95,
      correct: 19,
      wrong: 1,
      behaviorProfile: {
        dominantType: "stable_mastery",
        signals: { hintRate: 0.75, hintKnownCount: 8, medianResponseMsWrong: 12_000 },
      },
    }),
    unit: unit(),
    v3Enrichment: v3({ recommendedNextStep: "maintain" }),
    eligibleMistakes: mistakes(1),
  });
  assert.equal(independent.signals.assistance.evidenceMode, "independent");
  assert.equal(guided.signals.assistance.evidenceMode, "guided");
  assert.equal(
    reconcileEngineDecisionWithContext("mastery_stable", guided).engineDecision,
    "partial_stable",
  );
});

test("P1 grade differential separates foundation risk from above-grade caveat", () => {
  const foundation = buildUnifiedDecisionContext({
    row: row({ gradeRelation: "lower", contentGradeKey: "g2" }),
    unit: unit({
      gradeEvidence: { gradeRelation: "lower", registeredGradeKey: "g4", contentGradeKey: "g2" },
    }),
    v3Enrichment: v3({
      gradeRelation: "below_registered_grade",
      foundationRisk: true,
      recommendedNextStep: "strengthen_prerequisite",
    }),
    eligibleMistakes: mistakes(),
  });
  const above = buildUnifiedDecisionContext({
    row: row({ gradeRelation: "higher", contentGradeKey: "g6" }),
    unit: unit({
      gradeEvidence: { gradeRelation: "higher", registeredGradeKey: "g4", contentGradeKey: "g6" },
    }),
    v3Enrichment: v3({
      gradeRelation: "above_registered_grade",
      caveatNeeded: true,
      recommendedNextStep: "give_probe_questions",
    }),
    eligibleMistakes: mistakes(),
  });
  assert.ok(foundation.reconciler.priorityAdjustment > above.reconciler.priorityAdjustment);
  assert.equal(
    reconcileEngineDecisionWithContext("clear_topic_gap", above).engineDecision,
    "early_direction_only",
  );
});

test("P1 repeated taxonomy pattern and subskill safety are evidence-gated", () => {
  const supported = buildUnifiedDecisionContext({
    row: row(),
    unit: unit({
      taxonomy: { id: "M-01", subskillHe: "חיבור בסיסי", patternHe: "דפוס חיבור חוזר" },
      recurrence: { full: true },
    }),
    v3Enrichment: v3(),
    eligibleMistakes: mistakes(),
  });
  const random = buildUnifiedDecisionContext({
    row: row(),
    unit: unit(),
    v3Enrichment: v3(),
    eligibleMistakes: mistakes(),
  });
  assert.equal(supported.signals.pattern.eligible, true);
  assert.equal(random.signals.pattern.eligible, false);
  assert.ok(supported.reconciler.priorityAdjustment > random.reconciler.priorityAdjustment);
  assert.equal(supported.signals.subskill.safe, true);
});

test("P1 unsafe subskill remains blocked at low volume", () => {
  const context = buildUnifiedDecisionContext({
    row: row({ questions: 4, correct: 1, wrong: 3, accuracy: 25 }),
    unit: unit({
      taxonomy: { id: "M-01", subskillHe: "חיבור בסיסי", patternHe: "דפוס חיבור חוזר" },
      recurrence: { full: true },
    }),
    v3Enrichment: v3({ evidenceStrength: "thin" }),
    eligibleMistakes: mistakes(3),
  });
  assert.equal(context.signals.subskill.safe, false);
  assert.ok(context.signals.subskill.safety.blockReasons.includes("low_q"));
  assert.equal(context.evidenceEligibility.subskill, false);
});

test("P1 session consistency changes priority only with repeated evidence", () => {
  const crossSession = buildUnifiedDecisionContext({
    row: row(),
    unit: unit({
      taxonomy: { id: "M-01", subskillHe: "חיבור בסיסי", patternHe: "דפוס חיבור חוזר" },
      recurrence: { full: true },
    }),
    v3Enrichment: v3(),
    eligibleMistakes: mistakes(),
  });
  const singleSession = buildUnifiedDecisionContext({
    row: row({
      trend: {
        accuracyDirection: "flat",
        confidence: 0.8,
        windows: {
          currentPeriod: { accuracy: 60, sessionCount: 1 },
          previousComparablePeriod: { accuracy: 60, sessionCount: 0 },
          recentShortWindow: { accuracy: 60, sessionCount: 1 },
        },
      },
    }),
    unit: unit({
      taxonomy: { id: "M-01", subskillHe: "חיבור בסיסי", patternHe: "דפוס חיבור חוזר" },
      recurrence: { full: true },
    }),
    v3Enrichment: v3(),
    eligibleMistakes: mistakes(),
  });
  assert.ok(crossSession.reconciler.priorityAdjustment > singleSession.reconciler.priorityAdjustment);
});

test("P1 V3 next step changes priority, never action authority", () => {
  const practice = buildUnifiedDecisionContext({
    row: row(),
    unit: unit(),
    v3Enrichment: v3({ recommendedNextStep: "practice_more" }),
    eligibleMistakes: mistakes(),
  });
  const probe = buildUnifiedDecisionContext({
    row: row(),
    unit: unit(),
    v3Enrichment: v3({ recommendedNextStep: "give_probe_questions" }),
    eligibleMistakes: mistakes(),
  });
  assert.ok(practice.reconciler.priorityAdjustment > probe.reconciler.priorityAdjustment);
  assert.equal(practice.authority.actionEligible, false);
  assert.equal(probe.authority.actionEligible, false);
});

test("P1 real-path risk flags are reconciled conservatively", () => {
  const base = buildUnifiedDecisionContext({
    row: row(),
    unit: unit(),
    v3Enrichment: v3(),
    eligibleMistakes: mistakes(),
  });
  const guarded = buildUnifiedDecisionContext({
    row: row({
      topicEngineRowSignals: {
        riskFlags: { falseRemediationRisk: true, insufficientEvidenceRisk: true },
      },
    }),
    unit: unit(),
    v3Enrichment: v3(),
    eligibleMistakes: mistakes(),
  });
  assert.ok(guarded.reconciler.priorityAdjustment < base.reconciler.priorityAdjustment);
  assert.equal(guarded.authority.actionEligible, false);
});

test("P1 contradictory signals use explicit reconciler and preserve RI0", () => {
  const context = buildUnifiedDecisionContext({
    row: row(),
    unit: unit(),
    v3Enrichment: v3({ contradictorySignals: true }),
    eligibleMistakes: mistakes(),
  });
  const decision = reconcileEngineDecisionWithContext("clear_topic_gap", context);
  assert.equal(decision.engineDecision, "early_direction_only");
  assert.ok(context.reconciler.conflicts.includes("v3:contradictory_evidence"));
  assert.equal(context.authority.intensityCap, "RI0");
  assert.equal(context.authority.actionEligible, false);
});

test("P1 signal priority is consumed by subject sorting after core ranks", () => {
  const topic = (topicKey, signalPriorityAdjustment) => ({
    topicRowKey: topicKey,
    displayName: topicKey,
    questions: 20,
    correct: 10,
    wrong: 10,
    accuracy: 50,
    engineDecisionContract: {
      topic: topicKey,
      questions: 20,
      correct: 10,
      wrong: 10,
      accuracy: 50,
      engineDecision: "topic_needs_strengthening",
      evidenceStrength: "strong",
      severity: "moderate",
      recommendedAction: "remediate_same_level",
      parentSafeFinding: `finding:${topicKey}`,
      signalPriorityAdjustment,
      signalPriorityReasons: [`test:${signalPriorityAdjustment}`],
    },
  });
  const low = topic("a", -1);
  const high = topic("b", 2);
  const ordered = buildSubjectEngineDecisionContract("math", [low, high]);
  const permuted = buildSubjectEngineDecisionContract("math", [high, low]);
  assert.deepEqual(ordered.priorityTopics.map((item) => item.topicKey), ["b", "a"]);
  assert.deepEqual(permuted.priorityTopics.map((item) => item.topicKey), ["b", "a"]);
});

test("P1 may downgrade a canonical-open action but cannot increase authority", () => {
  const openCanonical = {
    actionState: "intervene",
    recommendation: { allowed: true, intensityCap: "RI2", family: "intervene" },
  };
  const sameGrade = buildUnifiedDecisionContext({
    row: row(),
    unit: unit({ canonicalState: openCanonical }),
    v3Enrichment: v3(),
    eligibleMistakes: mistakes(),
  });
  const aboveGrade = buildUnifiedDecisionContext({
    row: row({ gradeRelation: "higher", contentGradeKey: "g6" }),
    unit: unit({
      canonicalState: openCanonical,
      gradeEvidence: { gradeRelation: "higher", registeredGradeKey: "g4", contentGradeKey: "g6" },
    }),
    v3Enrichment: v3({
      gradeRelation: "above_registered_grade",
      caveatNeeded: true,
      recommendedNextStep: "give_probe_questions",
    }),
    eligibleMistakes: mistakes(),
  });
  const sameDecision = reconcileEngineDecisionWithContext("clear_topic_gap", sameGrade);
  const aboveDecision = reconcileEngineDecisionWithContext("clear_topic_gap", aboveGrade);
  const authority = {
    canonicalPresent: true,
    recommendationAllowed: true,
    intensityCap: "RI2",
  };
  assert.equal(
    mapEngineRecommendedAction("intervene", sameDecision.engineDecision, row(), authority),
    "remediate_same_level",
  );
  assert.equal(aboveDecision.engineDecision, "early_direction_only");
  assert.equal(
    mapEngineRecommendedAction("intervene", aboveDecision.engineDecision, row(), authority),
    "watch",
  );
  assert.equal(aboveGrade.authority.intensityCap, "RI2");
});

test("P1 consumes the real precomputed diagnostic path when it agrees with DE2", () => {
  const context = buildUnifiedDecisionContext({
    row: row({
      topicEngineRowSignals: {
        riskFlags: {},
        diagnosticType: "knowledge_gap",
        rootCause: "operation_selection",
        conclusionStrength: "supported",
        shouldAvoidStrongConclusion: false,
        engineDiagnosticDecision: {
          taxonomyMatchId: "M-01",
          subskillCandidateTechnical: {
            taxonomyId: "M-01",
            labelHe: "בחירת פעולת חיבור",
          },
          subskillSafety: {
            contractVersion: 3,
            safeToShowSubskill: true,
            blockReasons: [],
          },
        },
      },
    }),
    unit: unit({
      taxonomy: { id: "M-01", subskillHe: "חיבור בסיסי", patternHe: "דפוס חיבור חוזר" },
      recurrence: { full: true },
    }),
    v3Enrichment: v3(),
    eligibleMistakes: mistakes(),
  });
  assert.equal(
    context.signals.subskill.source,
    "row.topicEngineRowSignals.engineDiagnosticDecision+de2.taxonomy",
  );
  assert.equal(context.signals.subskill.candidate.labelHe, "בחירת פעולת חיבור");
  assert.equal(context.signals.upstreamDiagnostic.rootCause, "operation_selection");
  assert.equal(context.signals.upstreamDiagnostic.producedBeforeDe2, true);
});
