/**
 * Phase 6 — מערכת בדיקות רחבה לדוחות הורים (ללא Jest).
 * הרצה: npm run test:parent-report-phase6
 * (הסקריפט ב-package.json מריץ אחריו גם scripts/parent-report-pages-ssr.mjs — ראו docs/PARENT_REPORT.md)
 */
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as diagnosticEngineModule from "../utils/diagnostic-engine-v2/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

async function importUtils(rel) {
  const m = await import(pathToFileURL(join(ROOT, rel)).href);
  return m.default && typeof m.default === "object" ? m.default : m;
}

const {
  buildDetailedParentReportFromBaseReport,
  buildTopicRecommendationFromV2UnitForPhaseTests,
} = await importUtils("utils/detailed-parent-report.js");
const { normalizeExecutiveSummary } = await importUtils("utils/parent-report-payload-normalize.js");
const { summarizeV2UnitsForSubjectForTests, collapseTopicRowsToCanonicalTopicEntityForTests } = await importUtils(
  "utils/parent-report-v2.js"
);
const { classifyParentRecommendationState } = await importUtils(
  "utils/parent-report-recommendation-consistency.js"
);
const { analyzeLearningPatterns, EXAMPLE_PATTERN_DIAGNOSTICS_PAYLOAD } = await importUtils(
  "utils/learning-patterns-analysis.js"
);
const { normalizeMistakeEvent } = await importUtils("utils/mistake-event.js");
const {
  computeRowDiagnosticSignals,
  enrichTopicMapsWithRowDiagnostics,
  attachEvidenceContractsV1ToTopicMaps,
} = await importUtils("utils/parent-report-row-diagnostics.js");
const { enrichTopicMapsWithRowTrends } = await importUtils("utils/parent-report-row-trend.js");
const { confidenceBadgeFromScore, sufficiencyBadgeFromLevel } = await importUtils("utils/topic-next-step-phase2.js");
const {
  applyAggressiveEvidenceCap,
  buildTopicRecommendationRecord,
  decideTopicNextStep,
  DEFAULT_TOPIC_NEXT_STEP_CONFIG,
} = await importUtils("utils/topic-next-step-engine.js");
const { buildNarrativeContractV1, validateNarrativeContractV1 } = await importUtils(
  "utils/contracts/narrative-contract-v1.js"
);
const { buildInterventionPlanPhase8 } = await importUtils("utils/parent-report-intervention-plan.js");
const { buildPracticeCalibration, buildPhase9RecommendationOverlay } = await importUtils("utils/topic-next-step-phase2.js");
const { buildMistakeIntelligencePhase9 } = await importUtils("utils/parent-report-mistake-intelligence.js");
const { buildLearningMemoryPhase9 } = await importUtils("utils/parent-report-learning-memory.js");
const { buildInterventionEffectivenessPhase10 } = await importUtils("utils/parent-report-intervention-effectiveness.js");
const { buildConfidenceAgingPhase10 } = await importUtils("utils/parent-report-confidence-aging.js");
const { buildSupportSequencingPhase11 } = await importUtils("utils/parent-report-support-sequencing.js");
const { buildAdviceDriftPhase11 } = await importUtils("utils/parent-report-advice-drift.js");
const {
  buildPhase10RecommendationOverlay,
  buildPhase11SequenceOverlay,
  buildPhase12ContinuationOverlay,
  buildPhase13NextCycleOverlay,
} = await importUtils("utils/topic-next-step-phase2.js");
const { buildRecommendationMemoryPhase12 } = await importUtils("utils/parent-report-recommendation-memory.js");
const { buildOutcomeTrackingPhase12 } = await importUtils("utils/parent-report-outcome-tracking.js");
const { buildDecisionGatesPhase13 } = await importUtils("utils/parent-report-decision-gates.js");
const { buildEvidenceTargetsPhase13 } = await importUtils("utils/parent-report-evidence-targets.js");
const { buildFoundationDependencyPhase14 } = await importUtils("utils/parent-report-foundation-dependency.js");
const { buildPhase14RecommendationOverlay } = await importUtils("utils/parent-report-foundation-ordering.js");
const {
  assertDetailedExecutiveLabels,
  assertSubjectProfileUiLabels,
} = await importUtils("utils/parent-report-label-contract.js");
const {
  activeRiskFlagLabelsHe,
  sanitizeEngineSnippetHe,
  truncateHe,
  gateStateLineHe,
  evidenceTargetLineHe,
  gateTriggerCompactLineHe,
  dependencyStateLineHe,
  topicFreshnessUnifiedLineHe,
  topicGatesEvidenceDecisionCompactLineHe,
  topicFoundationDependencyCompactLineHe,
  topicMemoryOutcomeContinuationCompactLineHe,
  topicSequencingRepeatCompactLineHe,
} = await importUtils("utils/parent-report-ui-explain-he.js");
const { PARENT_REPORT_SCENARIOS, FIXTURE_MATH_ROW_ADD_LEARN_G4_MED } = await import(
  pathToFileURL(join(ROOT, "tests/fixtures/parent-report-pipeline.mjs")).href
);
const { generateQuestion: genMath } = await importUtils("utils/math-question-generator.js");
const { getLevelConfig } = await importUtils("utils/math-storage.js");
const { generateQuestion: genGeo } = await importUtils("utils/geometry-question-generator.js");
const { generateQuestion: genHe } = await importUtils("utils/hebrew-question-generator.js");
const { getLevelConfig: getHebrewLevelConfig } = await importUtils("utils/hebrew-storage.js");
const runDiagnosticEngineV2 =
  diagnosticEngineModule.runDiagnosticEngineV2 ||
  diagnosticEngineModule.default?.runDiagnosticEngineV2;

const REQUIRED_DETAILED_TOP_KEYS = [
  "version",
  "generatedAt",
  "periodInfo",
  "executiveSummary",
  "overallSnapshot",
  "subjectProfiles",
  "crossSubjectInsights",
  "homePlan",
  "nextPeriodGoals",
  "dataIntegrityReport",
];

const REQUIRED_EXEC_KEYS = [
  "version",
  "topStrengthsAcrossHe",
  "topFocusAreasHe",
  "homeFocusHe",
  "majorTrendsHe",
  "mainHomeRecommendationHe",
  "cautionNoteHe",
  "overallConfidenceHe",
  "dominantCrossSubjectRisk",
  "dominantCrossSubjectRiskLabelHe",
  "dominantCrossSubjectSuccessPattern",
  "dominantCrossSubjectSuccessPatternLabelHe",
  "supportingSignals",
  "mixedSignalNoticeHe",
  "reportReadinessHe",
  "evidenceBalanceHe",
  "dominantCrossSubjectRootCause",
  "dominantCrossSubjectRootCauseLabelHe",
  "crossSubjectConclusionReadiness",
  "majorDiagnosticCautionsHe",
  "recommendedParentPriorityType",
  "parentPriorityLadder",
  "topImmediateParentActionHe",
  "secondPriorityActionHe",
  "monitoringOnlyAreasHe",
  "deferForNowAreasHe",
  "dominantCrossSubjectMistakePattern",
  "dominantCrossSubjectMistakePatternLabelHe",
  "crossSubjectLearningStage",
  "crossSubjectLearningStageLabelHe",
  "crossSubjectRetentionRisk",
  "crossSubjectTransferReadiness",
  "reviewBeforeAdvanceAreasHe",
  "transferReadyAreasHe",
  "crossSubjectResponseToIntervention",
  "crossSubjectResponseToInterventionLabelHe",
  "crossSubjectSupportAdjustmentNeed",
  "crossSubjectSupportAdjustmentNeedHe",
  "crossSubjectConclusionFreshness",
  "crossSubjectRecalibrationNeed",
  "crossSubjectRecalibrationNeedHe",
  "majorRecheckAreasHe",
  "areasWhereSupportCanBeReducedHe",
  "areasNeedingStrategyChangeHe",
  "crossSubjectSupportSequenceState",
  "crossSubjectSupportSequenceStateLabelHe",
  "crossSubjectStrategyRepetitionRisk",
  "crossSubjectStrategyFatigueRisk",
  "crossSubjectNextBestSequenceStep",
  "crossSubjectNextBestSequenceStepHe",
  "subjectsReadyForReleaseHe",
  "subjectsAtRiskOfSupportRepetitionHe",
  "subjectsNeedingSupportResetHe",
  "crossSubjectRecommendationMemoryState",
  "crossSubjectRecommendationMemoryStateLabelHe",
  "crossSubjectSupportHistoryDepth",
  "crossSubjectSupportHistoryDepthLabelHe",
  "crossSubjectExpectedVsObservedMatch",
  "crossSubjectExpectedVsObservedMatchHe",
  "crossSubjectContinuationDecision",
  "crossSubjectContinuationDecisionHe",
  "subjectsWithClearCarryoverHe",
  "subjectsNeedingFreshEvidenceHe",
  "subjectsWherePriorPathSeemsMisalignedHe",
  "crossSubjectGateState",
  "crossSubjectGateStateLabelHe",
  "crossSubjectNextCycleDecisionFocus",
  "crossSubjectNextCycleDecisionFocusHe",
  "crossSubjectEvidenceTargetType",
  "crossSubjectEvidenceTargetTypeLabelHe",
  "crossSubjectTargetObservationWindow",
  "crossSubjectTargetObservationWindowLabelHe",
  "subjectsNearReleaseButNotThereHe",
  "subjectsNeedingRecheckBeforeDecisionHe",
  "subjectsWithVisiblePivotTriggerHe",
  "crossSubjectDependencyState",
  "crossSubjectDependencyStateLabelHe",
  "crossSubjectLikelyFoundationalBlocker",
  "crossSubjectLikelyFoundationalBlockerLabelHe",
  "crossSubjectFoundationFirstPriority",
  "crossSubjectFoundationFirstPriorityHe",
  "subjectsLikelyShowingDownstreamSymptomsHe",
  "subjectsNeedingFoundationFirstHe",
  "subjectsSafeForLocalInterventionHe",
];

const REQUIRED_SUBJECT_PROFILE_KEYS = [
  "subject",
  "subjectLabelHe",
  "topStrengths",
  "topWeaknesses",
  "topicRecommendations",
  "dominantLearningRisk",
  "dominantSuccessPattern",
  "trendNarrativeHe",
  "confidenceSummaryHe",
  "recommendedHomeMethodHe",
  "whatNotToDoHe",
  "majorRiskFlagsAcrossRows",
  "dominantRootCause",
  "dominantRootCauseLabelHe",
  "secondaryRootCause",
  "rootCauseDistribution",
  "subjectDiagnosticRestraintHe",
  "subjectConclusionReadiness",
  "subjectInterventionPriorityHe",
  "subjectPriorityLevel",
  "subjectPriorityReasonHe",
  "subjectImmediateActionHe",
  "subjectDeferredActionHe",
  "subjectMonitoringOnly",
  "subjectDoNowHe",
  "subjectAvoidNowHe",
  "dominantMistakePattern",
  "dominantMistakePatternLabelHe",
  "mistakePatternDistribution",
  "subjectLearningStage",
  "subjectLearningStageLabelHe",
  "subjectRetentionRisk",
  "subjectTransferReadiness",
  "subjectMemoryNarrativeHe",
  "subjectReviewBeforeAdvanceHe",
  "subjectResponseToIntervention",
  "subjectResponseToInterventionLabelHe",
  "subjectSupportFit",
  "subjectSupportAdjustmentNeed",
  "subjectSupportAdjustmentNeedHe",
  "subjectConclusionFreshness",
  "subjectRecalibrationNeed",
  "subjectRecalibrationNeedHe",
  "subjectEffectivenessNarrativeHe",
  "subjectSupportSequenceState",
  "subjectSupportSequenceStateLabelHe",
  "subjectStrategyRepetitionRisk",
  "subjectStrategyFatigueRisk",
  "subjectNextBestSequenceStep",
  "subjectNextBestSequenceStepHe",
  "subjectAdviceNovelty",
  "subjectRecommendationRotationNeed",
  "subjectSequenceNarrativeHe",
  "subjectRecommendationMemoryState",
  "subjectPriorRecommendationSignature",
  "subjectSupportHistoryDepth",
  "subjectRecommendationCarryover",
  "subjectExpectedVsObservedMatch",
  "subjectFollowThroughSignal",
  "subjectContinuationDecision",
  "subjectContinuationDecisionHe",
  "subjectOutcomeNarrativeHe",
  "subjectGateState",
  "subjectGateStateLabelHe",
  "subjectGateReadiness",
  "subjectNextCycleDecisionFocus",
  "subjectNextCycleDecisionFocusHe",
  "subjectEvidenceTargetType",
  "subjectTargetObservationWindow",
  "subjectGateNarrativeHe",
  "subjectDependencyState",
  "subjectDependencyStateLabelHe",
  "subjectLikelyFoundationalBlocker",
  "subjectLikelyFoundationalBlockerLabelHe",
  "subjectDownstreamSymptomRisk",
  "subjectFoundationFirstPriority",
  "subjectFoundationFirstPriorityHe",
  "subjectDependencyNarrativeHe",
];

/** שדות מלאים לרשומת המלצת נושא (מנוע topic-next-step) — חוזה רגרסיה */
const REQUIRED_TOPIC_RECOMMENDATION_KEYS = [
  "subject",
  "topicRowKey",
  "displayName",
  "bucketKey",
  "modeKey",
  "questions",
  "accuracy",
  "wrong",
  "mistakeEventCount",
  "gradeKey",
  "levelKey",
  "currentMastery",
  "stability",
  "confidence",
  "masteryScore",
  "stabilityScore",
  "confidenceScore",
  "recencyScore",
  "evidenceStrength",
  "dataSufficiencyLevel",
  "dataSufficiencyLabelHe",
  "recommendationContextHe",
  "patternStabilityHe",
  "decisionTrace",
  "recommendationDecisionTrace",
  "trend",
  "behaviorProfile",
  "recommendedNextStep",
  "recommendedStepLabelHe",
  "recommendedStepReasonHe",
  "recommendedParentActionHe",
  "recommendedStudentActionHe",
  "recommendedEvidenceLevelHe",
  "recommendedWhyNowHe",
  "recommendationStabilityNoteHe",
  "isEarlySignalOnly",
  "needsPractice",
  "excellent",
  "confidenceBadge",
  "sufficiencyBadge",
  "diagnosticType",
  "riskFlags",
  "whyThisRecommendationHe",
  "whatCouldChangeThisHe",
  "recommendationStructuredTrace",
  "diagnosticRestraint",
  "conclusionStrength",
  "shouldAvoidStrongConclusion",
  "alternativeExplanations",
  "diagnosticCautionHe",
  "diagnosticConfidenceBand",
  "rootCause",
  "rootCauseLabelHe",
  "rootCauseConfidence",
  "rootCauseEvidence",
  "secondaryPossibleCause",
  "rootCauseNarrativeHe",
  "recommendationReasoningHe",
  "recommendedInterventionType",
  "recommendedEvidenceAction",
  "recommendedEvidenceActionHe",
  "whatWouldIncreaseConfidenceHe",
  "whyNotAStrongerConclusionHe",
  "interventionPlan",
  "interventionPlanHe",
  "interventionDurationBand",
  "interventionIntensity",
  "interventionFormat",
  "interventionGoal",
  "interventionSuccessSignalHe",
  "interventionStopSignalHe",
  "interventionParentEffort",
  "doNowHe",
  "avoidNowHe",
  "recommendedPracticeLoad",
  "recommendedSessionCount",
  "recommendedSessionLengthBand",
  "escalationThresholdHe",
  "deescalationThresholdHe",
  "practiceReadiness",
  "cautionLineHe",
  "mistakeIntelligence",
  "dominantMistakePattern",
  "dominantMistakePatternLabelHe",
  "mistakePatternConfidence",
  "mistakePatternEvidence",
  "secondaryMistakePattern",
  "mistakePatternNarrativeHe",
  "mistakeSpecificity",
  "mistakeRecurrenceLevel",
  "learningMemory",
  "learningStage",
  "learningStageLabelHe",
  "retentionRisk",
  "stabilizationState",
  "transferReadiness",
  "independenceProgress",
  "memoryNarrativeHe",
  "learningMemoryEvidence",
  "recommendedPracticeMode",
  "recommendedTransferStep",
  "reviewBeforeAdvanceHe",
  "mistakeFocusedActionHe",
  "memoryFocusedActionHe",
  "interventionEffectiveness",
  "responseToIntervention",
  "responseToInterventionLabelHe",
  "effectivenessConfidence",
  "effectivenessEvidence",
  "supportFit",
  "supportFitLabelHe",
  "supportAdjustmentNeed",
  "supportAdjustmentNeedHe",
  "interventionEffectNarrativeHe",
  "confidenceAging",
  "freshnessState",
  "freshnessStateLabelHe",
  "conclusionFreshness",
  "conclusionFreshnessLabelHe",
  "confidenceDecayApplied",
  "recalibrationNeed",
  "recalibrationNeedHe",
  "nextSupportAdjustment",
  "nextSupportAdjustmentHe",
  "continueWhatWorksHe",
  "changeBecauseHe",
  "recheckBeforeEscalationHe",
  "evidenceStillMissingHe",
  "supportSequencing",
  "supportSequenceState",
  "supportSequenceStateLabelHe",
  "priorSupportPattern",
  "priorSupportPatternLabelHe",
  "strategyRepetitionRisk",
  "strategyRepetitionRiskHe",
  "strategyFatigueRisk",
  "strategyFatigueRiskHe",
  "nextBestSequenceStep",
  "nextBestSequenceStepHe",
  "supportSequenceNarrativeHe",
  "adviceDrift",
  "adviceSimilarityLevel",
  "adviceSimilarityLevelHe",
  "adviceNovelty",
  "adviceNoveltyHe",
  "repeatAdviceWarning",
  "repeatAdviceWarningHe",
  "recommendationRotationNeed",
  "recommendationRotationNeedHe",
  "nextSupportSequenceAction",
  "nextSupportSequenceActionHe",
  "whyThisIsDifferentNowHe",
  "whyWeShouldNotRepeatSameSupportHe",
  "whatMustHappenBeforeReleaseHe",
  "whatSignalsSequenceSuccessHe",
  "recommendationMemory",
  "recommendationMemoryState",
  "recommendationMemoryStateLabelHe",
  "priorRecommendationSignature",
  "priorRecommendationSignatureLabelHe",
  "supportHistoryDepth",
  "supportHistoryDepthLabelHe",
  "recommendationCarryover",
  "recommendationCarryoverLabelHe",
  "memoryOfPriorSupportConfidence",
  "recommendationMemoryNarrativeHe",
  "outcomeTracking",
  "expectedOutcomeType",
  "expectedOutcomeTypeLabelHe",
  "observedOutcomeState",
  "observedOutcomeStateLabelHe",
  "expectedVsObservedMatch",
  "expectedVsObservedMatchHe",
  "followThroughSignal",
  "followThroughSignalHe",
  "outcomeTrackingConfidence",
  "outcomeTrackingNarrativeHe",
  "recommendationContinuationDecision",
  "recommendationContinuationDecisionHe",
  "outcomeBasedNextMove",
  "outcomeBasedNextMoveHe",
  "whyWeThinkThisPathWorkedHe",
  "whyWeThinkThisPathDidNotLandHe",
  "whatNeedsFreshEvidenceNowHe",
  "whatShouldCarryForwardHe",
  "decisionGates",
  "gateState",
  "gateStateLabelHe",
  "continueGate",
  "releaseGate",
  "pivotGate",
  "recheckGate",
  "advanceGate",
  "gateReadiness",
  "gateReadinessLabelHe",
  "gateNarrativeHe",
  "evidenceTargets",
  "targetEvidenceType",
  "targetEvidenceTypeLabelHe",
  "targetObservationWindow",
  "targetObservationWindowLabelHe",
  "targetSuccessSignalHe",
  "targetFailureSignalHe",
  "targetIndependenceSignalHe",
  "targetStabilitySignalHe",
  "targetFreshnessNeedHe",
  "evidenceTargetNarrativeHe",
  "nextCycleDecisionFocus",
  "nextCycleDecisionFocusHe",
  "whatWouldJustifyReleaseHe",
  "whatWouldJustifyAdvanceHe",
  "whatWouldTriggerPivotHe",
  "whatWouldTriggerRecheckHe",
  "whatEvidenceWeStillNeedHe",
  "foundationDependency",
  "dependencyState",
  "dependencyStateLabelHe",
  "likelyFoundationalBlocker",
  "likelyFoundationalBlockerLabelHe",
  "dependencyConfidence",
  "dependencyEvidence",
  "downstreamSymptomLikelihood",
  "downstreamSymptomLikelihoodHe",
  "localIssueLikelihood",
  "localIssueLikelihoodHe",
  "shouldTreatAsFoundationFirst",
  "foundationDependencyNarrativeHe",
  "interventionOrdering",
  "interventionOrderingHe",
  "whyThisMayBeSymptomNotCoreHe",
  "whyFoundationFirstHe",
  "whyLocalSupportFirstHe",
  "whatCanWaitUntilFoundationStabilizesHe",
  "foundationDecision",
  "foundationDecisionLabelHe",
  "nextCycleSupportLevel",
  "nextCycleSupportLevelHe",
  "foundationBeforeExpansion",
  "foundationBeforeExpansionHe",
  "contractsV1",
  "recommendationContractV1",
];

const REQUIRED_CROSS_RISK_FLAG_KEYS = [
  "falsePromotionRisk",
  "falseRemediationRisk",
  "speedOnlyRisk",
  "hintDependenceRisk",
  "insufficientEvidenceRisk",
  "recentTransitionRisk",
];

/**
 * TEST-ONLY: Build a minimal synthetic canonicalState for manually-constructed
 * test fixtures that don't go through the real engine pipeline.
 * Production code NEVER falls back to legacy fields — it requires canonicalState.
 */
function syntheticCanonicalState({
  subjectId,
  topicKey,
  displayName = "",
  actionState = "probe_only",
  family = null,
  readiness = "insufficient",
  confidenceLevel = "low",
  positiveAuthorityLevel = "none",
  allowed = false,
  cannotConcludeYet = false,
  questions = 0,
  correct = 0,
  stableMastery = false,
  taxonomyMatch = true,
}) {
  const resolvedFamily = family || actionState;
  const resolvedAllowed = allowed || (actionState === "maintain" || actionState === "expand_cautiously");
  return Object.freeze({
    topicStateId: `${subjectId}::${topicKey}`,
    stateHash: `test_${subjectId}_${topicKey}_${actionState}`,
    subjectId,
    topicKey,
    bucketKey: topicKey,
    displayName,
    evidence: {
      questions,
      correct,
      wrong: questions - correct,
      wrongEventCount: 0,
      recurrenceFull: false,
      taxonomyMatch,
      dataSufficiencyLevel: questions >= 20 ? "strong" : questions >= 10 ? "medium" : "low",
      confidence01: null,
      stableMastery,
      needsPractice: false,
      positiveAuthorityLevel,
    },
    decisionInputs: {
      priorityLevel: "P2",
      breadth: "moderate",
      counterEvidenceStrong: false,
      weakEvidence: false,
      hintInvalidates: false,
      narrowSample: questions < 10,
      hardDenyReason: null,
      taxonomyMismatchReason: taxonomyMatch ? null : "taxonomy_not_matched",
    },
    classification: {
      taxonomyId: null,
      classificationState: taxonomyMatch ? "classified" : "unclassified_no_taxonomy_match",
      classificationReasonCode: null,
    },
    assessment: {
      confidenceLevel,
      readiness,
      decisionTier: readiness === "ready" ? 3 : readiness === "emerging" ? 2 : 1,
      cannotConcludeYet,
      allowedClaimClass: readiness === "ready" ? "stable_pattern" : "descriptive_observation",
    },
    actionState,
    recommendation: {
      family: resolvedFamily,
      allowed: resolvedAllowed,
      intensityCap: resolvedAllowed ? "RI1" : "RI0",
      reasonCodes: [],
    },
    narrativeConstraints: {
      uncertaintyRequired: !resolvedAllowed,
      allowedSections: [],
      forbiddenPhrases: [],
    },
    renderFlags: {
      showAsStrength: actionState === "maintain" || actionState === "expand_cautiously",
      showAsWeakness: actionState === "intervene",
      showAsMonitoring: actionState === "probe_only" || actionState === "withhold",
      suppressActionText: actionState === "withhold",
    },
    _deprecated_positiveConclusionAllowed: actionState === "maintain" || actionState === "expand_cautiously",
  });
}

function assertDetailedPayloadShape(detailed, label) {
  assert.ok(detailed && typeof detailed === "object", `${label}: detailed missing`);
  for (const k of REQUIRED_DETAILED_TOP_KEYS) {
    assert.ok(k in detailed, `${label}: missing top key ${k}`);
  }
  const es = detailed.executiveSummary;
  assert.ok(es && typeof es === "object", `${label}: executiveSummary`);
  for (const k of REQUIRED_EXEC_KEYS) {
    assert.ok(k in es, `${label}: executiveSummary missing ${k}`);
  }
  const sup = es.supportingSignals;
  assert.ok(sup && typeof sup === "object", `${label}: supportingSignals`);
  assert.ok("crossRiskFlags" in sup, `${label}: supportingSignals.crossRiskFlags`);
  const cr = sup.crossRiskFlags;
  assert.ok(cr && typeof cr === "object", `${label}: crossRiskFlags object`);
  for (const k of REQUIRED_CROSS_RISK_FLAG_KEYS) {
    assert.ok(k in cr, `${label}: crossRiskFlags missing ${k}`);
  }
  assert.ok(Array.isArray(detailed.subjectProfiles), `${label}: subjectProfiles`);
  for (const sp of detailed.subjectProfiles) {
    for (const k of REQUIRED_SUBJECT_PROFILE_KEYS) {
      assert.ok(k in sp, `${label}: subject ${sp.subject} missing ${k}`);
    }
    for (const tr of sp.topicRecommendations || []) {
      assert.ok("displayName" in tr && "recommendedNextStep" in tr, `${label}: topic rec shape`);
    }
  }
}

function collectSubjectProfileKeyUnion() {
  const u = new Set();
  for (const [, factory] of Object.entries(PARENT_REPORT_SCENARIOS)) {
    const d = buildDetailedParentReportFromBaseReport(factory(), { period: "week" });
    for (const sp of d.subjectProfiles || []) {
      for (const key of Object.keys(sp)) u.add(key);
    }
  }
  return [...u].sort();
}

function runSubjectProfileKeyUnionAcrossScenarios() {
  const keys = collectSubjectProfileKeyUnion();
  assert.ok(keys.length >= REQUIRED_SUBJECT_PROFILE_KEYS.length, "subject profile key union non-empty");
  for (const [name, factory] of Object.entries(PARENT_REPORT_SCENARIOS)) {
    const d = buildDetailedParentReportFromBaseReport(factory(), { period: "week" });
    for (const sp of d.subjectProfiles || []) {
      for (const k of keys) {
        assert.ok(k in sp, `subject key union ${name}/${sp.subject}: missing ${k}`);
      }
    }
  }
}

function runTopicRecommendationRecordContract() {
  const d = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.one_dominant_subject(), { period: "week" });
  const tr = d.subjectProfiles.find((s) => s.subject === "math")?.topicRecommendations?.[0];
  assert.ok(tr, "topic recommendation row");
  for (const k of REQUIRED_TOPIC_RECOMMENDATION_KEYS) {
    assert.ok(k in tr, `topicRec missing ${k}`);
  }
}

function runAggressiveEvidenceCapContract() {
  const ctx = {
    displayName: "חיבור",
    questions: 22,
    accuracy: 91,
    mistakeEventCount: 0,
    levelLabel: "easy",
    gradeLabel: "g3",
    wrongRatio: 0.09,
  };
  const out = applyAggressiveEvidenceCap(
    {
      step: "advance_level",
      reasonHe: "בדיקה",
      parentHe: "p",
      studentHe: "s",
      recommendationDecisionTrace: [],
    },
    { suppressAggressiveStep: true },
    ctx,
    DEFAULT_TOPIC_NEXT_STEP_CONFIG
  );
  assert.equal(out.step, "maintain_and_strengthen");
  assert.equal(out.postCapApplied, true);
}

function runLabelContractsForAllGoldens() {
  for (const [name, factory] of Object.entries(PARENT_REPORT_SCENARIOS)) {
    const detailed = buildDetailedParentReportFromBaseReport(factory(), { period: "week" });
    assertDetailedExecutiveLabels(detailed);
    for (const sp of detailed.subjectProfiles || []) {
      assertSubjectProfileUiLabels(sp, `golden:${name}/${sp.subject}`);
    }
  }
}

function runExplicitNamedPhase6Scenarios() {
  const recent = PARENT_REPORT_SCENARIOS.recent_transition_recent_difficulty_increase();
  const kMath = FIXTURE_MATH_ROW_ADD_LEARN_G4_MED;
  const endMs = new Date(`${recent.endDate}T23:59:59.999Z`).getTime();
  const rec = buildTopicRecommendationRecord(
    "math",
    kMath,
    recent.mathOperations[kMath],
    recent.analysis.mathMistakesByOperation || {},
    undefined,
    endMs
  );
  assert.equal(rec.riskFlags.recentTransitionRisk, true, "recent transition scenario: risk flag");

  const dom = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.exec_summary_one_dominant_subject(), {
    period: "week",
  });
  assert.ok(
    dom.subjectProfiles.some((s) => s.subject === "math" && (s.topicRecommendations?.length || 0) > 0),
    "exec one dominant: math topic recs"
  );

  const hr = buildDetailedParentReportFromBaseReport(
    PARENT_REPORT_SCENARIOS.exec_summary_high_risk_and_strengths_coexist(),
    { period: "week" }
  );
  assert.ok(hr.executiveSummary.topStrengthsAcrossHe.length >= 1, "exec high risk: strengths exist");
  assert.ok(hr.executiveSummary.cautionNoteHe.length > 2, "exec high risk: caution");

  const mix = buildDetailedParentReportFromBaseReport(
    PARENT_REPORT_SCENARIOS.exec_summary_mixed_cross_subject_signals(),
    { period: "week" }
  );
  assert.ok(
    (mix.executiveSummary.topStrengthsAcrossHe?.length || 0) + (mix.executiveSummary.topFocusAreasHe?.length || 0) > 0,
    "exec mixed cross-subject: lists"
  );

  const noHome = buildDetailedParentReportFromBaseReport(
    PARENT_REPORT_SCENARIOS.exec_summary_no_recommended_home_method_he(),
    { period: "week" }
  );
  const mathSp = noHome.subjectProfiles.find((s) => s.subject === "math");
  assert.ok(mathSp, "no home: math profile");
  assert.ok(
    mathSp.recommendedHomeMethodHe == null || String(mathSp.recommendedHomeMethodHe).trim() === "",
    "no home: field absent or empty"
  );
  assertSubjectProfileUiLabels(mathSp, "exec_no_home/math");
}

function runGoldenFixtures() {
  for (const [name, factory] of Object.entries(PARENT_REPORT_SCENARIOS)) {
    const base = factory();
    const detailed = buildDetailedParentReportFromBaseReport(base, { playerName: base.playerName, period: "week" });
    assertDetailedPayloadShape(detailed, `golden:${name}`);
  }
}

function runExecutiveSummaryRules() {
  const high = PARENT_REPORT_SCENARIOS.high_risk_despite_strengths();
  const dHigh = buildDetailedParentReportFromBaseReport(high, { period: "week" });
  const esHigh = dHigh.executiveSummary;
  const cross = esHigh.supportingSignals?.crossRiskFlags;
  const heavy = !!(cross?.falsePromotionRisk || cross?.hintDependenceRisk || cross?.recentTransitionRisk);
  if (heavy && esHigh.topStrengthsAcrossHe.length > 1) {
    assert.ok(
      esHigh.topStrengthsAcrossHe.length <= 2,
      "executive: strengths capped under global risk heavy"
    );
  }

  const mixed = PARENT_REPORT_SCENARIOS.mixed_signals_cross_subjects();
  const dMix = buildDetailedParentReportFromBaseReport(mixed, { period: "week" });
  assert.ok(typeof dMix.executiveSummary.mainHomeRecommendationHe === "string", "main home string");
  assert.ok(dMix.executiveSummary.cautionNoteHe.length > 0, "caution non-empty");

  const sparse = PARENT_REPORT_SCENARIOS.all_sparse();
  const dSp = buildDetailedParentReportFromBaseReport(sparse, { period: "week" });
  assert.ok(
    String(dSp.executiveSummary.overallConfidenceHe || "").length > 0,
    "overall confidence for sparse"
  );
  const labels = dSp.executiveSummary.dominantCrossSubjectRiskLabelHe;
  assert.ok(typeof labels === "string", "dominant risk label resolves");
}

function runThresholdBoundaries() {
  const endMs = Date.UTC(2026, 3, 10, 23, 59, 59);
  const rowLow = {
    bucketKey: "addition",
    displayName: "חיבור",
    questions: 4,
    correct: 3,
    wrong: 1,
    accuracy: 75,
    modeKey: "learning",
    lastSessionMs: endMs - 86400000,
  };
  const sigLow = computeRowDiagnosticSignals("math", FIXTURE_MATH_ROW_ADD_LEARN_G4_MED, rowLow, {}, endMs);
  assert.ok(sigLow.dataSufficiencyLevel === "low" || sigLow.dataSufficiencyLevel === "medium");

  assert.equal(confidenceBadgeFromScore(100), "high");
  assert.equal(confidenceBadgeFromScore(72), "high");
  assert.equal(confidenceBadgeFromScore(42), "medium");
  assert.equal(confidenceBadgeFromScore(41), "low");

  assert.equal(sufficiencyBadgeFromLevel("strong"), "high");
  assert.equal(sufficiencyBadgeFromLevel("medium"), "medium");
  assert.equal(sufficiencyBadgeFromLevel("low"), "low");

  const rowMed = {
    ...rowLow,
    questions: 11,
    correct: 8,
    wrong: 3,
  };
  const sigMed = computeRowDiagnosticSignals(
    "math",
    FIXTURE_MATH_ROW_ADD_LEARN_G4_MED,
    rowMed,
    { [FIXTURE_MATH_ROW_ADD_LEARN_G4_MED]: { count: 3 } },
    endMs
  );
  assert.ok(sigMed.dataSufficiencyLevel === "medium" || sigMed.dataSufficiencyLevel === "strong");
}

function runLegacyMistakeAndDiagnostics() {
  const legacyRaw = {
    operation: "addition",
    storedAt: "2026-04-05T10:00:00.000Z",
    wrong: 9,
    correct: 10,
    isCorrect: false,
  };
  const ev = normalizeMistakeEvent(legacyRaw, "math");
  assert.equal(ev.subject, "math");
  assert.ok(ev.bucketKey === "addition" || ev.topicOrOperation === "addition");

  const ex = EXAMPLE_PATTERN_DIAGNOSTICS_PAYLOAD;
  assert.equal(ex.version, 2);
  assert.ok(ex.subjects?.math?.topWeaknesses?.length >= 1);

  const v2 = analyzeLearningPatterns(
    {
      startDate: "2026-04-01",
      endDate: "2026-04-10",
      period: "week",
      playerName: "x",
      summary: {
        totalQuestions: 50,
        totalTimeMinutes: 60,
        overallAccuracy: 70,
        mathQuestions: 50,
        mathCorrect: 35,
        mathAccuracy: 70,
        geometryQuestions: 0,
        geometryCorrect: 0,
        geometryAccuracy: 0,
        englishQuestions: 0,
        englishCorrect: 0,
        englishAccuracy: 0,
        scienceQuestions: 0,
        scienceCorrect: 0,
        scienceAccuracy: 0,
        hebrewQuestions: 0,
        hebrewCorrect: 0,
        hebrewAccuracy: 0,
        moledetGeographyQuestions: 0,
        moledetGeographyCorrect: 0,
        moledetGeographyAccuracy: 0,
      },
      mathOperations: {
        [FIXTURE_MATH_ROW_ADD_LEARN_G4_MED]: {
          bucketKey: "addition",
          displayName: "חיבור",
          questions: 20,
          correct: 14,
          wrong: 6,
          accuracy: 70,
          needsPractice: true,
          modeKey: "learning",
          lastSessionMs: Date.UTC(2026, 3, 8),
          timeMinutes: 10,
        },
      },
      geometryTopics: {},
      englishTopics: {},
      scienceTopics: {},
      hebrewTopics: {},
      moledetGeographyTopics: {},
      analysis: {
        mathMistakesByOperation: { [FIXTURE_MATH_ROW_ADD_LEARN_G4_MED]: { count: 6 } },
        geometryMistakesByTopic: {},
        englishMistakesByTopic: {},
        scienceMistakesByTopic: {},
        hebrewMistakesByTopic: {},
        moledetGeographyMistakesByTopic: {},
        needsPractice: {},
        excellent: {},
        recommendations: [],
      },
      challenges: { daily: {}, weekly: {}, bySubject: {} },
      achievements: [],
      allItems: {},
      dailyActivity: [],
    },
    {
      math: Array.from({ length: 6 }, (_, i) => ({
        subject: "math",
        operation: "addition",
        grade: "ד׳",
        level: "medium",
        mode: "learning",
        isCorrect: false,
        timestamp: Date.UTC(2026, 3, 4) + i * 1000,
        patternFamily: "pf:leg",
        exerciseText: "x",
        correctAnswer: 1,
        userAnswer: 2,
      })),
    }
  );
  assert.ok(v2.subjects?.math?.hasAnySignal !== undefined);
}

function runGeneratorPropertyLoops() {
  const levelConfig = getLevelConfig("g3", "easy", "addition");
  for (let seed = 0; seed < 24; seed++) {
    const q = genMath(levelConfig, "addition", "g3", null);
    assert.ok(q && typeof q === "object", "math q object");
    assert.ok(String(q.question || q.text || "").trim().length > 0, "math non-empty stem");
    const ans = q.correctAnswer ?? q.answer;
    assert.ok(ans != null && String(ans).trim() !== "", "math has correct answer");
    if (Array.isArray(q.options) && q.options.length > 1) {
      const set = new Set(q.options.map((x) => String(x)));
      assert.ok(set.size === q.options.length, "math options unique");
    }
  }

  for (let i = 0; i < 16; i++) {
    const g = genGeo("g4", "medium", "perimeter");
    assert.ok(g && typeof g === "object");
    assert.ok(String(g.question || "").trim().length > 0);
    assert.ok(g.correctAnswer != null || g.answer != null);
  }

  const heLevel = getHebrewLevelConfig("g3", "easy");
  for (let i = 0; i < 16; i++) {
    const h = genHe(heLevel, "reading", "g3", null);
    assert.ok(h && typeof h === "object");
    assert.ok(String(h.question || "").trim().length > 0);
    assert.ok(h.correctAnswer != null || h.answer != null);
  }
}

function runContractAdditive() {
  const base = PARENT_REPORT_SCENARIOS.one_dominant_subject();
  const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
  assert.ok("summary" in base === false || base.summary, "base is v2-like");
  assert.ok(Array.isArray(detailed.subjectProfiles));
  const norm = normalizeExecutiveSummary({ executiveSummary: null });
  assert.equal(Array.isArray(norm.topStrengthsAcrossHe), true);
  assert.equal(norm.homeFocusHe, "");
  assert.ok(Array.isArray(norm.monitoringOnlyAreasHe));
  assert.ok(Array.isArray(norm.deferForNowAreasHe));
  assert.ok(norm.parentPriorityLadder && norm.parentPriorityLadder.version === 1);
  assert.ok(Array.isArray(norm.parentPriorityLadder.rankedSubjects));
  assert.ok(Array.isArray(norm.reviewBeforeAdvanceAreasHe));
  assert.ok(Array.isArray(norm.transferReadyAreasHe));
  assert.ok(typeof norm.dominantCrossSubjectMistakePatternLabelHe === "string");
}

function runUiResilienceHelpers() {
  const longWhy =
    "knowledge_gap " + "word ".repeat(80) + " fragile_success instruction_friction falsePromotionRisk";
  const s = sanitizeEngineSnippetHe(longWhy);
  assert.ok(!/\bknowledge_gap\b/.test(s), "sanitized ids");
  const t = truncateHe("א".repeat(200), 40);
  assert.ok(t.length <= 42, "truncate");
  const rf = { falsePromotionRisk: true, hintDependenceRisk: false, speedOnlyRisk: true };
  const labs = activeRiskFlagLabelsHe(rf, 10);
  assert.ok(labs.every((x) => typeof x === "string"));
  assert.ok(!labs.some((x) => /falsePromotionRisk/i.test(x)), "no raw keys in chips");
  assert.equal(gateStateLineHe({}), "");
  assert.equal(evidenceTargetLineHe(null), "");
  assert.equal(gateTriggerCompactLineHe({ topicEngineRowSignals: {} }), "");
  assert.equal(dependencyStateLineHe({}), "");
  assert.equal(topicFreshnessUnifiedLineHe({}), "");
  assert.equal(topicGatesEvidenceDecisionCompactLineHe(null), "");
  assert.equal(topicFoundationDependencyCompactLineHe({}), "");
}

function runQaCalibrationRedTeam() {
  const ctxRelease = {
    q: 18,
    evidenceStrength: "medium",
    conclusionStrength: "moderate",
    dataSufficiencyLevel: "medium",
    supportSequenceState: "sequence_ready_for_release",
    responseToIntervention: "independence_growing",
    expectedVsObservedMatch: "aligned",
    recommendationMemoryState: "light_memory",
    independenceProgress: "improving",
    trendDer: { independenceDirection: "up" },
    finalStep: "maintain_and_strengthen",
    displayName: "חיבור",
    freshnessState: "fresh",
    conclusionFreshness: "high",
    recalibrationNeed: "none",
    retentionRisk: "low",
    learningStage: "consolidating",
    rootCause: "knowledge_gap",
  };
  const gForm = buildDecisionGatesPhase13(ctxRelease);
  assert.ok(gForm.releaseGate === "forming" || gForm.releaseGate === "pending");

  const gBlockRoot = buildDecisionGatesPhase13({ ...ctxRelease, rootCause: "weak_independence" });
  assert.notEqual(
    gBlockRoot.releaseGate,
    "forming",
    "QA: weak_independence must not show release as forming"
  );

  const gBlockTransfer = buildDecisionGatesPhase13({ ...ctxRelease, transferReadiness: "limited" });
  assert.notEqual(gBlockTransfer.releaseGate, "forming", "QA: limited transfer must not form release");

  const gStaleRelease = buildDecisionGatesPhase13({
    ...ctxRelease,
    freshnessState: "stale",
    conclusionFreshness: "low",
  });
  assert.notEqual(gStaleRelease.releaseGate, "forming", "QA: stale evidence must not keep release forming");

  const staleMis = buildPhase12ContinuationOverlay({
    expectedVsObservedMatch: "misaligned",
    recommendationMemoryState: "usable_memory",
    freshnessState: "stale",
    conclusionFreshness: "low",
    followThroughSignal: "unclear",
    adviceSimilarityLevel: "some_overlap",
    recommendationRotationNeed: "fine",
    responseToIntervention: "mixed_response",
    nextSupportSequenceAction: "continue_with_tighter_target",
    supportSequenceState: "continuing_sequence",
    strategyRepetitionRisk: "medium",
    expectedOutcomeType: "accuracy_stability",
    observedOutcomeState: "no_clear_progress",
  });
  assert.equal(
    staleMis.recommendationContinuationDecision,
    "do_not_repeat_without_new_evidence",
    "QA: stale misaligned prefers evidence over pivot"
  );

  const lightMemRelease = buildPhase12ContinuationOverlay({
    expectedVsObservedMatch: "aligned",
    recommendationMemoryState: "light_memory",
    expectedOutcomeType: "release_readiness",
    responseToIntervention: "independence_growing",
    observedOutcomeState: "partial_progress",
    followThroughSignal: "possibly_followed",
    adviceSimilarityLevel: "some_overlap",
    recommendationRotationNeed: "fine",
    nextSupportSequenceAction: "begin_release_sequence",
    strategyRepetitionRisk: "low",
    freshnessState: "fresh",
    conclusionFreshness: "high",
  });
  assert.notEqual(
    lightMemRelease.recommendationContinuationDecision,
    "begin_controlled_release",
    "QA: light memory must not authorize controlled release continuation"
  );

  const speed = buildFoundationDependencyPhase14({
    q: 18,
    evidenceStrength: "medium",
    dataSufficiencyLevel: "medium",
    conclusionStrength: "moderate",
    rootCause: "speed_pressure",
    learningStage: "consolidating",
    retentionRisk: "low",
    mistakeRecurrenceLevel: "low",
    dominantMistakePattern: "speed_driven_error",
    independenceProgress: "improving",
    trendDer: { independenceDirection: "up", accuracyDirection: "flat" },
    responseToIntervention: "early_positive_response",
    expectedVsObservedMatch: "aligned",
    recommendationMemoryState: "light_memory",
    gateReadiness: "moderate",
    gateState: "continue_gate_active",
    targetEvidenceType: "accuracy_confirmation",
    displayName: "חיבור",
  });
  assert.equal(speed.dependencyState, "likely_local_issue");

  const dMixed = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.mixed_signals_cross_subjects(), {
    period: "week",
  });
  assert.ok(String(dMixed.executiveSummary.mainHomeRecommendationHe || "").length > 3);
  assert.ok(typeof dMixed.executiveSummary.crossSubjectDependencyState === "string");
}

function runInvariantHighVolumePerfectNoReducedComplexityWithoutExplicitContradiction() {
  assert.equal(typeof runDiagnosticEngineV2, "function", "runDiagnosticEngineV2 missing");
  const START = Date.UTC(2026, 3, 1, 0, 0, 0, 0);
  const END = Date.UTC(2026, 3, 14, 23, 59, 59, 999);
  const rowKey = "multiplication\u0001learning\u0001g3\u0001easy";
  const maps = {
    math: {
      [rowKey]: {
        displayName: "כפל — כיתה ג׳ — רמה קלה",
        questions: 21,
        correct: 21,
        wrong: 0,
        accuracy: 100,
        modeKey: "learning",
        lastSessionMs: END - 3600_000,
        needsPractice: false,
        confidence01: 0.9,
        dataSufficiencyLevel: "strong",
        isEarlySignalOnly: false,
        behaviorProfile: { version: 1, dominantType: "stable_mastery", signals: {}, decisionTrace: [] },
      },
    },
    geometry: {},
    english: {},
    science: {},
    hebrew: {},
    "moledet-geography": {},
  };
  const rawMistakesBySubject = {
    math: [],
    geometry: [],
    english: [],
    science: [],
    hebrew: [],
    "moledet-geography": [],
  };
  const diag = runDiagnosticEngineV2({ maps, rawMistakesBySubject, startMs: START, endMs: END });
  const u0 = diag.units?.[0];
  assert.ok(u0, "invariant: diagnosticEngineV2 must emit at least one unit for math fixture row");
  const traces = Array.isArray(u0.evidenceTrace) ? u0.evidenceTrace : [];
  const vol = traces.find((t) => String(t?.type || "") === "volume")?.value || {};
  const rowQuestions = Number(vol.questions) || 0;
  const rowAccuracy = Number(vol.accuracy) || 0;
  assert.ok(rowQuestions >= 21, "invariant fixture: expected high volume row (diag unit evidence)");
  assert.equal(Math.round(rowAccuracy), 100, "invariant fixture: expected 100% row (diag unit evidence)");

  const gc =
    u0.outputGating?.contractsV1 && typeof u0.outputGating.contractsV1 === "object"
      ? u0.outputGating.contractsV1
      : {};
  const decision = gc.decision && typeof gc.decision === "object" ? gc.decision : {};
  const recContract = gc.recommendation && typeof gc.recommendation === "object" ? gc.recommendation : {};
  const explicitContradiction =
    decision?.cannotConcludeYet === true ||
    (Array.isArray(recContract?.forbiddenBecause) &&
      recContract.forbiddenBecause.includes("cannot_conclude_yet"));

  const cs = u0.canonicalState;
  const gated = !!u0.outputGating?.cannotConcludeYet;
  const canonicalDecisionTier =
    Number(cs?.assessment?.decisionTier) || Number(decision?.decisionTier) || 0;
  const conclusionStrength = gated
    ? "withheld"
    : canonicalDecisionTier >= 3
      ? "strong"
      : canonicalDecisionTier >= 2
        ? "moderate"
        : "tentative";
  const narrativeContract = buildNarrativeContractV1({
    subjectId: u0.subjectId,
    topicKey: u0.topicRowKey,
    topicRowKey: u0.topicRowKey,
    displayName: String(u0.displayName || ""),
    questions: rowQuestions,
    accuracy: rowAccuracy,
    suppressAggressiveStep: gated,
    conclusionStrength,
    contractsV1: gc,
  });
  const narrativeValidation = validateNarrativeContractV1(narrativeContract);
  assert.ok(narrativeValidation.ok, `narrative contract invalid: ${narrativeValidation.errors?.join("; ")}`);
  const narrative = { wordingEnvelope: narrativeContract.wordingEnvelope };

  const row = maps.math[rowKey];
  const topicEngineRec = buildTopicRecommendationRecord(
    "math",
    rowKey,
    row,
    {},
    DEFAULT_TOPIC_NEXT_STEP_CONFIG,
    END
  );
  assert.ok(
    Array.isArray(topicEngineRec.recommendationDecisionTrace),
    "invariant: topic engine must expose recommendationDecisionTrace"
  );
  assert.ok(
    topicEngineRec.recommendationDecisionTrace.length >= 1,
    "invariant: topic engine must emit at least one recommendationDecisionTrace step"
  );

  const reducedActionRegex = /מורכבות מופחתת|להנמיך|פחות מורכב|אותה רמה נמוכה/u;
  const actionText = `${String(u0.intervention?.shortPracticeHe || "")} ${String(u0.intervention?.immediateActionHe || "")}`.trim();
  if (cs && (cs.actionState === "maintain" || cs.actionState === "expand_cautiously") && !explicitContradiction) {
    assert.ok(
      !["WE0", "WE1"].includes(String(narrative?.wordingEnvelope || "")),
      "invariant: strength actionState without explicit contradiction must not render WE0/WE1"
    );
    assert.ok(
      !reducedActionRegex.test(actionText),
      "invariant: strength actionState without explicit contradiction must not render reduced-complexity action"
    );
  }
}

/**
 * V2 detailed profile lists topicRecommendations only for diagnose_only / intervene units.
 * High-volume stable-mastery rows are maintain/expand — topicRecommendations must stay empty.
 */
function runPhase2EvidenceContractParityTopicRecommendationsV2() {
  const START = Date.UTC(2026, 3, 1, 0, 0, 0, 0);
  const END = Date.UTC(2026, 3, 14, 23, 59, 59, 999);
  const rowKey = FIXTURE_MATH_ROW_ADD_LEARN_G4_MED;
  const maps = {
    math: {
      [rowKey]: {
        displayName: "חיבור",
        questions: 16,
        correct: 3,
        wrong: 13,
        accuracy: 19,
        modeKey: "learning",
        lastSessionMs: END - 3600_000,
        needsPractice: true,
        behaviorProfile: { version: 1, dominantType: "knowledge_gap", signals: {}, decisionTrace: [] },
      },
    },
    geometry: {},
    english: {},
    science: {},
    hebrew: {},
    "moledet-geography": {},
  };
  const mistakesBySubjectCounts = {
    math: { [rowKey]: { count: 12 } },
    geometry: {},
    english: {},
    science: {},
    hebrew: {},
    "moledet-geography": {},
  };
  const rawMistakesBySubject = {
    math: [],
    geometry: [],
    english: [],
    science: [],
    hebrew: [],
    "moledet-geography": [],
  };
  enrichTopicMapsWithRowDiagnostics(maps, mistakesBySubjectCounts, END);
  const trackingSnapshots = { math: {}, geometry: {}, english: {}, science: {}, hebrew: {}, "moledet-geography": {} };
  enrichTopicMapsWithRowTrends(maps, trackingSnapshots, rawMistakesBySubject, START, END);
  attachEvidenceContractsV1ToTopicMaps(maps, START, END);
  const mapRow = maps.math[rowKey];
  assert.ok(mapRow?.contractsV1?.evidence, "phase2: map row must carry evidence contract after attach");

  const syntheticUnit = {
    blueprintRef: "phase2_fixture",
    engineVersion: "phase2_fixture",
    unitKey: `math::${rowKey}`,
    subjectId: "math",
    topicRowKey: rowKey,
    bucketKey: "addition",
    displayName: "חיבור",
    classification: { state: "classified", reasonCode: null, weakFallbackBlocked: false },
    evidenceTrace: [{ type: "volume", value: { questions: 16, correct: 3, wrong: 13, accuracy: 19 } }],
    taxonomy: { patternHe: "דפוס לבדיקה" },
    recurrence: {
      full: false,
      minWrongRequired: null,
      wrongEventCount: 12,
      rowWrongTotal: 13,
      wrongCountForRules: 12,
    },
    confidence: {
      level: "moderate",
      rowSignals: { confidence01: 0.45, dataSufficiencyLevel: "medium", isEarlySignalOnly: false },
    },
    priority: { level: "P3", breadth: "moderate" },
    competingHypotheses: { hypotheses: [] },
    strengthProfile: { tags: [] },
    outputGating: {
      diagnosisAllowed: true,
      confidenceOnly: false,
      probeOnly: false,
      interventionAllowed: true,
      cannotConcludeYet: false,
      humanReviewRecommended: false,
      reasons: [],
      positiveAuthorityEligible: false,
      positiveAuthorityLevel: "none",
      positiveConclusionAllowed: false,
      _deprecated_positiveConclusionAllowed: false,
      additiveCautionAllowed: false,
      positiveAuthorityReasonCodes: [],
    },
    diagnosis: {
      allowed: true,
      conditional: false,
      taxonomyId: "tid_fixture",
      lineHe: "שורת אבחון לבדיקה.",
      humanBoundaryStripped: null,
      forbiddenInferencesHe: [],
    },
    probe: null,
    intervention: {
      shortPracticeHe: "תרגול קצר לבדיקה.",
      immediateActionHe: "צעד מיידי לבדיקה.",
      avoidHe: "לא לדלג על הבסיס.",
    },
    explainability: { whyNotStrongerConclusionHe: [], cannotConcludeYetHe: [] },
  };
  syntheticUnit.canonicalState = syntheticCanonicalState({
    subjectId: "math",
    topicKey: "addition",
    displayName: "חיבור",
    actionState: "intervene",
    readiness: "forming",
    confidenceLevel: "moderate",
    questions: 16,
    correct: 3,
  });

  const base = {
    period: "week",
    playerName: "_phase2_evidence_parity_",
    startDate: "2026-04-01",
    endDate: "2026-04-14",
    summary: {
      totalQuestions: 16,
      totalTimeMinutes: 20,
      overallAccuracy: 19,
      mathQuestions: 16,
      mathCorrect: 3,
      mathAccuracy: 19,
    },
    mathOperations: maps.math,
    geometryTopics: {},
    englishTopics: {},
    scienceTopics: {},
    hebrewTopics: {},
    moledetGeographyTopics: {},
    diagnosticEngineV2: { units: [syntheticUnit] },
    dataIntegrityReport: { version: 1, issues: [] },
  };

  const trDirect = buildTopicRecommendationFromV2UnitForPhaseTests(syntheticUnit, base, "math");
  const trEvDirect = trDirect?.contractsV1?.evidence;
  assert.ok(trEvDirect, "phase2: direct builder must merge evidence contract");
  assert.equal(trEvDirect.questionCount, mapRow.contractsV1.evidence.questionCount);
  assert.equal(trEvDirect.evidenceBand, mapRow.contractsV1.evidence.evidenceBand);

  const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
  const mathP = detailed.subjectProfiles.find((s) => s.subject === "math");
  const tr = (mathP?.topicRecommendations || [])[0];
  assert.ok(tr, "phase2: first math topic recommendation must exist");
  const trEv = tr?.contractsV1?.evidence;
  assert.ok(trEv, "phase2: topicRecommendation must include merged evidence contract");
  assert.equal(trEv.questionCount, mapRow.contractsV1.evidence.questionCount);
  assert.equal(trEv.evidenceBand, mapRow.contractsV1.evidence.evidenceBand);
  assert.equal(
    tr?.contractsV1?.evidenceValidation?.ok,
    mapRow.contractsV1.evidenceValidation?.ok,
    "phase2: evidenceValidation parity"
  );
}

function runInvariantMaintainOnlyProfileEmptyTopicRecommendations() {
  assert.equal(typeof runDiagnosticEngineV2, "function", "runDiagnosticEngineV2 missing");
  const START = Date.UTC(2026, 3, 1, 0, 0, 0, 0);
  const END = Date.UTC(2026, 3, 14, 23, 59, 59, 999);
  const rowKey = "multiplication\u0001learning\u0001g3\u0001easy";
  const maps = {
    math: {
      [rowKey]: {
        displayName: "כפל — כיתה ג׳ — רמה קלה",
        questions: 21,
        correct: 21,
        wrong: 0,
        accuracy: 100,
        modeKey: "learning",
        lastSessionMs: END - 3600_000,
        needsPractice: false,
        confidence01: 0.9,
        dataSufficiencyLevel: "strong",
        isEarlySignalOnly: false,
        behaviorProfile: { version: 1, dominantType: "stable_mastery", signals: {}, decisionTrace: [] },
      },
    },
    geometry: {},
    english: {},
    science: {},
    hebrew: {},
    "moledet-geography": {},
  };
  const rawMistakesBySubject = {
    math: [],
    geometry: [],
    english: [],
    science: [],
    hebrew: [],
    "moledet-geography": [],
  };
  const diag = runDiagnosticEngineV2({ maps, rawMistakesBySubject, startMs: START, endMs: END });
  const base = {
    period: "week",
    playerName: "_phase5_invariant_maintain_empty_topics_",
    startDate: "2026-04-01",
    endDate: "2026-04-14",
    summary: {
      totalQuestions: 21,
      totalTimeMinutes: 10,
      overallAccuracy: 100,
      mathQuestions: 21,
      mathCorrect: 21,
      mathAccuracy: 100,
      geometryQuestions: 0,
      geometryCorrect: 0,
      geometryAccuracy: 0,
      englishQuestions: 0,
      englishCorrect: 0,
      englishAccuracy: 0,
      scienceQuestions: 0,
      scienceCorrect: 0,
      scienceAccuracy: 0,
      hebrewQuestions: 0,
      hebrewCorrect: 0,
      hebrewAccuracy: 0,
      moledetGeographyQuestions: 0,
      moledetGeographyCorrect: 0,
      moledetGeographyAccuracy: 0,
    },
    diagnosticEngineV2: diag,
  };
  const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
  const mathSp = detailed?.subjectProfiles?.find((s) => s.subject === "math");
  assert.ok(mathSp, "invariant: math subject profile must exist");
  const cs = diag.units?.[0]?.canonicalState;
  if (cs && (cs.actionState === "maintain" || cs.actionState === "expand_cautiously")) {
    const topicRecs = Array.isArray(mathSp.topicRecommendations) ? mathSp.topicRecommendations : [];
    assert.equal(
      topicRecs.length,
      0,
      "invariant: maintain-only profile must have empty topicRecommendations"
    );
  }
}

function runPhase15NarrativeCompactAndStack() {
  const gateDup = {
    topicEngineRowSignals: {
      gateNarrativeHe: "לפני החלטה: לאשר דיוק קצר בלי לחץ.",
      evidenceTargetNarrativeHe: "לאשר דיוק קצר בלי לחץ — זהה לשער.",
      nextCycleDecisionFocusHe: "להוכיח שהכיוון הנוכחי באמת עוזר",
    },
  };
  const gCompact = topicGatesEvidenceDecisionCompactLineHe(gateDup);
  assert.ok(gCompact.length > 5);
  assert.ok(gCompact.split(" · ").length <= 4, "phase15: gates compact bounded join count");

  const memOverlap = {
    topicEngineRowSignals: {
      recommendationMemoryNarrativeHe: "יש זיכרון חלש מהחלון הנוכחי.",
      outcomeTrackingNarrativeHe: "יש זיכרון חלש מהחלון הנוכחי — כפילות מכוונת לבדיקה.",
      recommendationContinuationDecisionHe: "להמשיך עם תצפית קצרה בלבד.",
    },
  };
  const moc = topicMemoryOutcomeContinuationCompactLineHe(memOverlap);
  assert.ok(!moc.includes(" · ") || moc.split(" · ").length <= 3, "phase15: memory/outcome merge");

  const seqRow = {
    topicEngineRowSignals: {
      nextSupportAdjustmentHe: "להתאים עומס לפי התגובה בשבוע הקרוב.",
      nextSupportSequenceActionHe: "להתאים עומס לפי התגובה בשבוע הקרוב.",
      supportSequenceNarrativeHe: "רצף ארוך מדי",
    },
  };
  const seqC = topicSequencingRepeatCompactLineHe(seqRow);
  assert.ok(seqC.length > 5, "phase15: sequencing compact returns primary flow line");

  const synth = {
    questions: 18,
    evidenceStrength: "medium",
    dataSufficiencyLevel: "medium",
    accuracy: 70,
    wrongRatio: 0.2,
    behaviorProfile: { dominantType: "knowledge_gap" },
    trend: { direction: "flat", confidence: "medium" },
    topicEngineRowSignals: {},
  };
  const rec = buildTopicRecommendationRecord("math", "add:1_2", synth, {}, DEFAULT_TOPIC_NEXT_STEP_CONFIG, Date.now());
  assert.ok(rec && typeof rec.whyThisRecommendationHe === "string");
  assert.ok(String(rec.dependencyState || "").length > 2);
  const why = String(rec.whyThisRecommendationHe);
  const wn = String(rec.whatEvidenceWeStillNeedHe || "").trim();
  if (wn.length > 18) {
    const probe = wn.slice(0, 28);
    assert.equal(why.indexOf(probe), why.lastIndexOf(probe), "phase15: no duplicate evidence-need snippet in why");
  }
  assert.ok(typeof rec.interventionOrdering === "string");

  const d = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.one_dominant_subject(), { period: "week" });
  const math = d.subjectProfiles.find((s) => s.subject === "math");
  const topics = math?.topicRecommendations;
  const firstTr =
    topics && typeof topics === "object"
      ? Object.values(topics).find((t) => t && typeof t === "object" && (t.whyThisRecommendationHe || t.topicEngineRowSignals))
      : null;
  if (firstTr) {
    const strip = [
      topicFreshnessUnifiedLineHe(firstTr),
      topicSequencingRepeatCompactLineHe(firstTr),
      topicMemoryOutcomeContinuationCompactLineHe(firstTr),
      topicGatesEvidenceDecisionCompactLineHe(firstTr),
      topicFoundationDependencyCompactLineHe(firstTr),
    ].filter(Boolean);
    assert.ok(Array.isArray(strip), "phase15: strip helpers accept detailed topic rec");
  }
}

function runPhase5ContractIntegrityAndContradictions() {
  const d = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.mixed_signals_cross_subjects(), {
    period: "week",
  });
  const esText = [
    String(d.executiveSummary?.mainHomeRecommendationHe || ""),
    String(d.executiveSummary?.overallConfidenceHe || ""),
    String(d.executiveSummary?.reportReadinessHe || ""),
  ].join(" ");
  const overstated = /בטוח|בוודאות|חד[- ]?משמעית|יציב לחלוטין|מוכח/giu;

  for (const sp of d.subjectProfiles || []) {
    for (const tr of sp.topicRecommendations || []) {
      const c = tr?.contractsV1;
      assert.ok(c && typeof c === "object", `phase5/${sp.subject}: topic contractsV1 missing`);
      assert.ok(c.evidence && typeof c.evidence === "object", `phase5/${sp.subject}: evidence contract missing`);
      assert.ok(c.decision && typeof c.decision === "object", `phase5/${sp.subject}: decision contract missing`);
      assert.ok(c.readiness && typeof c.readiness === "object", `phase5/${sp.subject}: readiness contract missing`);
      assert.equal(typeof c.readiness.readiness, "string", `phase5/${sp.subject}: non-canonical readiness path`);
      assert.ok(c.confidence && typeof c.confidence === "object", `phase5/${sp.subject}: confidence contract missing`);
      assert.ok(c.recommendation && typeof c.recommendation === "object", `phase5/${sp.subject}: recommendation contract missing`);
      assert.ok(c.narrative && typeof c.narrative === "object", `phase5/${sp.subject}: narrative contract missing`);
      assert.ok(c.narrativeValidation?.ok === true, `phase5/${sp.subject}: narrative validation failed`);
      const hasRecAnchors = Array.isArray(c.recommendation.anchorEvidenceIds) && c.recommendation.anchorEvidenceIds.length > 0;
      if (c.recommendation.eligible) {
        assert.ok(hasRecAnchors, `phase5/${sp.subject}: eligible recommendation without anchors`);
      }
      const we = String(c.narrative.wordingEnvelope || "");
      if (we === "WE0" || we === "WE1") {
        assert.ok(!c.narrative.textSlots.action, `phase5/${sp.subject}: WE0/WE1 must not carry action slot`);
      }
      if ((we === "WE0" || we === "WE1") && overstated.test(esText)) {
        throw new Error(`phase5/${sp.subject}: executive wording overstated against restrained topic envelope`);
      }
    }
  }
}

function runReactServerSmoke() {
  const base = PARENT_REPORT_SCENARIOS.strong_executive_case();
  const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
  const es = detailed.executiveSummary;
  const long = "א".repeat(400);
  const html = renderToStaticMarkup(
    createElement(
      "div",
      { dir: "rtl", "data-testid": "exec-smoke" },
      createElement("p", null, es.mainHomeRecommendationHe || "—"),
      createElement("p", null, long),
      createElement(
        "ul",
        null,
        (es.topStrengthsAcrossHe || []).slice(0, 3).map((t, i) => createElement("li", { key: i }, t))
      )
    )
  );
  assert.ok(html.includes("data-testid") || html.includes("exec-smoke"));
  assert.ok(html.length > 50);
}

function runOutputQualityLockedRegression() {
  const base = PARENT_REPORT_SCENARIOS.one_dominant_subject();
  base.summary = {
    ...base.summary,
    totalQuestions: 21,
    totalTimeMinutes: 24,
    overallAccuracy: 100,
    mathQuestions: 21,
    mathCorrect: 21,
    mathAccuracy: 100,
  };
  base.mathOperations = {
    [FIXTURE_MATH_ROW_ADD_LEARN_G4_MED]: {
      bucketKey: "addition",
      displayName: "חיבור",
      questions: 21,
      correct: 21,
      wrong: 0,
      accuracy: 100,
      needsPractice: false,
      excellent: true,
      modeKey: "learning",
      gradeKey: "g4",
      levelKey: "medium",
      lastSessionMs: Date.UTC(2026, 3, 10, 12, 0, 0),
      timeMinutes: 24,
    },
  };
  const lockedUnit = {
    subjectId: "math",
    topicRowKey: FIXTURE_MATH_ROW_ADD_LEARN_G4_MED,
    displayName: "חיבור",
    diagnosis: { allowed: false, lineHe: "" },
    taxonomy: { patternHe: "דפוס הצלחה יציב" },
    recurrence: { wrongCountForRules: 0, totalQuestions: 21 },
    confidence: { level: "moderate", rowSignals: { dataSufficiencyLevel: "strong", isEarlySignalOnly: false } },
    priority: { level: "P2" },
    outputGating: {
      cannotConcludeYet: false,
      positiveConclusionAllowed: true,
      positiveAuthorityLevel: "very_good",
      additiveCautionAllowed: false,
    },
    evidenceTrace: [{ type: "volume", value: { questions: 21, correct: 21, wrong: 0, accuracy: 100 } }],
    intervention: {
      immediateActionHe: "להמשיך בשני תרגולים קצרים ולשמר את הדפוס.",
      shortPracticeHe: "תרגול קצר לשימור עקביות.",
      avoidHe: "לא להעמיס קפיצת רמה חדה באותו שבוע.",
    },
    probe: {
      objectiveHe: "לוודא שהעקביות נשמרת גם בסוגי שאלה דומים.",
      specificationHe: "לעקוב אחרי אותו נושא עוד סבב קצר.",
    },
  };
  lockedUnit.canonicalState = syntheticCanonicalState({
    subjectId: "math",
    topicKey: "addition",
    displayName: "חיבור",
    actionState: "maintain",
    readiness: "emerging",
    confidenceLevel: "moderate",
    positiveAuthorityLevel: "very_good",
    questions: 21,
    correct: 21,
    stableMastery: true,
  });
  base.diagnosticEngineV2 = {
    units: [lockedUnit],
  };
  const d = buildDetailedParentReportFromBaseReport(
    base,
    { period: "week" }
  );
  const es = d.executiveSummary || {};
  const trends = Array.isArray(es.majorTrendsHe) ? es.majorTrendsHe.join(" ") : "";
  assert.ok(
    !trends.includes("ב־0 מהם אפשר כבר לנסח כיוון"),
    "locked sample: executive trends must not claim 0 actionable topics under strong signal"
  );
  assert.ok(
    !String(es.overallConfidenceHe || "").includes("ב־0 מתוך 1"),
    "locked sample: overall confidence must not claim 0/1 under strong signal"
  );
  assert.ok((es.topStrengthsAcrossHe || []).length >= 1, "locked sample: must include at least one strength");
  assert.ok(
    !(d.overallSnapshot?.notableSubjectsHe || []).some((line) =>
      String(line || "").includes("אין עדיין מקצוע בולט")
    ),
    "locked sample: must not emit 'no notable subject' fallback"
  );
  const math = (d.subjectProfiles || []).find((s) => s.subject === "math");
  const strengths = new Set(
    [
      ...(Array.isArray(math?.topStrengths) ? math.topStrengths : []),
      ...(Array.isArray(math?.excellence) ? math.excellence : []),
      ...(Array.isArray(math?.maintain) ? math.maintain : []),
    ]
      .map((x) => String(x?.labelHe || "").trim())
      .filter(Boolean)
  );
  const weaknesses = new Set(
    (Array.isArray(math?.topWeaknesses) ? math.topWeaknesses : [])
      .map((x) => String(x?.labelHe || "").trim())
      .filter(Boolean)
  );
  const overlap = [...weaknesses].filter((w) => strengths.has(w));
  assert.equal(overlap.length, 0, "locked sample: topic cannot appear in both strength and weakness");

  const norm = normalizeExecutiveSummary(d);
  assert.equal(
    String(norm.crossSubjectSupportSequenceStateLabelHe || ""),
    "",
    "locked sample: deep cross-subject section must be suppressed for single active subject"
  );
  assert.equal(
    Array.isArray(norm.majorRecheckAreasHe) ? norm.majorRecheckAreasHe.length : 0,
    0,
    "locked sample: recheck list must be suppressed for single active subject"
  );
}

function runStrongPositiveRecommendationConsistencyCrossSurfaces() {
  const blockedFamilyRegex =
    /מורכבות מופחתת|להנמיך|פחות מורכב|אותה רמה נמוכה|איסוף אות|מעקב בלבד|חיזוק באותה רמה/u;
  const buildUnit = ({
    subjectId,
    topicRowKey,
    displayName,
    q,
    acc,
    positive = true,
    authority = "very_good",
    readiness = "ready",
    cannotConcludeYet = false,
    actionStateOverride = null,
  }) => {
    const derivedAction = actionStateOverride || (positive && readiness !== "insufficient" && readiness !== "cannot_conclude" ? "maintain" : "probe_only");
    const topicKey = topicRowKey.split("\u0001")[0] || topicRowKey;
    const unit = {
      subjectId,
      topicRowKey,
      displayName,
      diagnosis: { allowed: false, lineHe: "" },
      taxonomy: null,
      recurrence: { wrongCountForRules: 0, totalQuestions: q },
      confidence: { level: "high", rowSignals: { dataSufficiencyLevel: "strong", isEarlySignalOnly: false } },
      priority: { level: "P2" },
      outputGating: {
        cannotConcludeYet,
        positiveConclusionAllowed: positive,
        positiveAuthorityLevel: authority,
        additiveCautionAllowed: false,
        contractsV1: { readiness: { readiness } },
      },
      probe: {
        specificationHe: "משימה מקבילה באותו עקרון עם מורכבות מופחתת",
        objectiveHe: "להמשיך לאסוף אות",
      },
      intervention: {
        immediateActionHe: "",
        shortPracticeHe: "",
        avoidHe: "",
      },
      evidenceTrace: [{ type: "volume", value: { questions: q, correct: Math.round((q * acc) / 100), wrong: 0, accuracy: acc } }],
    };
    unit.canonicalState = syntheticCanonicalState({
      subjectId,
      topicKey,
      displayName,
      actionState: derivedAction,
      readiness,
      confidenceLevel: "high",
      positiveAuthorityLevel: authority,
      questions: q,
      correct: Math.round((q * acc) / 100),
      stableMastery: positive,
      cannotConcludeYet,
    });
    return unit;
  };

  const strongCases = [
    // locked original regression case
    {
      name: "locked-multiplication-21-100",
      unit: buildUnit({
        subjectId: "math",
        topicRowKey: "multiplication\u0001learning\u0001g4\u0001medium",
        displayName: "כפל",
        q: 21,
        acc: 100,
        authority: "excellent",
        readiness: "ready",
      }),
      summarySubject: "math",
      summaryQuestions: 21,
      summaryAccuracy: 100,
    },
    {
      name: "generalized-19-very-high",
      unit: buildUnit({
        subjectId: "math",
        topicRowKey: "fractions\u0001practice\u0001g4\u0001medium",
        displayName: "שברים",
        q: 19,
        acc: 95,
        authority: "very_good",
        readiness: "forming",
      }),
      summarySubject: "math",
      summaryQuestions: 19,
      summaryAccuracy: 95,
    },
    {
      name: "generalized-32-high",
      unit: buildUnit({
        subjectId: "math",
        topicRowKey: "division\u0001practice\u0001g4\u0001hard",
        displayName: "חילוק",
        q: 32,
        acc: 92,
        authority: "very_good",
        readiness: "ready",
      }),
      summarySubject: "math",
      summaryQuestions: 32,
      summaryAccuracy: 92,
    },
    {
      name: "generalized-other-subject-english",
      unit: buildUnit({
        subjectId: "english",
        topicRowKey: "vocabulary\u0001learning",
        displayName: "אוצר מילים",
        q: 24,
        acc: 93,
        authority: "excellent",
        readiness: "ready",
      }),
      summarySubject: "english",
      summaryQuestions: 24,
      summaryAccuracy: 93,
    },
  ];

  for (const c of strongCases) {
    const cls = classifyParentRecommendationState(c.unit);
    assert.equal(
      cls.classId,
      "strong_positive_actionable",
      `${c.name}: expected strong-positive class`
    );
    assert.ok(
      Array.isArray(cls.blockedFamilies) && cls.blockedFamilies.length >= 4,
      `${c.name}: blocked recommendation families must exist for strong-positive class`
    );
    const regularMapped = summarizeV2UnitsForSubjectForTests([c.unit]);
    assert.ok(
      !blockedFamilyRegex.test(String(regularMapped.parentActionHe || "")),
      `${c.name}: regular report parent action must not map to blocked families`
    );
    assert.ok(
      !blockedFamilyRegex.test(String(regularMapped.nextWeekGoalHe || "")),
      `${c.name}: regular report next goal must not map to blocked families`
    );
    assert.ok(
      !blockedFamilyRegex.test(String(regularMapped.recommendedHomeMethodHe || "")),
      `${c.name}: regular report home method must not map to blocked families`
    );

    const base = {
      period: "week",
      playerName: `_strong_cross_surface_${c.name}`,
      startDate: "2026-04-01",
      endDate: "2026-04-14",
      summary: {
        totalQuestions: c.summaryQuestions,
        totalTimeMinutes: 14,
        overallAccuracy: c.summaryAccuracy,
        mathQuestions: c.summarySubject === "math" ? c.summaryQuestions : 0,
        mathCorrect: c.summarySubject === "math" ? Math.round((c.summaryQuestions * c.summaryAccuracy) / 100) : 0,
        mathAccuracy: c.summarySubject === "math" ? c.summaryAccuracy : 0,
        geometryQuestions: 0,
        geometryCorrect: 0,
        geometryAccuracy: 0,
        englishQuestions: c.summarySubject === "english" ? c.summaryQuestions : 0,
        englishCorrect:
          c.summarySubject === "english" ? Math.round((c.summaryQuestions * c.summaryAccuracy) / 100) : 0,
        englishAccuracy: c.summarySubject === "english" ? c.summaryAccuracy : 0,
        scienceQuestions: 0,
        scienceCorrect: 0,
        scienceAccuracy: 0,
        hebrewQuestions: 0,
        hebrewCorrect: 0,
        hebrewAccuracy: 0,
        moledetGeographyQuestions: 0,
        moledetGeographyCorrect: 0,
        moledetGeographyAccuracy: 0,
      },
      diagnosticEngineV2: { units: [c.unit] },
    };
    const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
    const esAction = String(detailed?.executiveSummary?.mainHomeRecommendationHe || "");
    assert.ok(
      !blockedFamilyRegex.test(esAction),
      `${c.name}: detailed executive home action must avoid blocked families`
    );
    const homeItems = Array.isArray(detailed?.homePlan?.itemsHe) ? detailed.homePlan.itemsHe : [];
    const goalItems = Array.isArray(detailed?.nextPeriodGoals?.itemsHe) ? detailed.nextPeriodGoals.itemsHe : [];
    assert.ok(
      !homeItems.some((x) => blockedFamilyRegex.test(String(x || ""))),
      `${c.name}: detailed home plan must avoid blocked families`
    );
    assert.ok(
      !goalItems.some((x) => blockedFamilyRegex.test(String(x || ""))),
      `${c.name}: detailed next goals must avoid blocked families`
    );
  }

  // control: nearby case where readiness/evidence is not sufficient -> class must not trigger
  const controlUnit = buildUnit({
    subjectId: "math",
    topicRowKey: "algebra\u0001learning\u0001g4\u0001medium",
    displayName: "אלגברה",
    q: 17, // below strong-positive evidence floor
    acc: 94,
    authority: "very_good",
    readiness: "insufficient",
    positive: true,
  });
  const controlClass = classifyParentRecommendationState(controlUnit);
  assert.equal(controlClass.classId, "regular_flow", "control: strong-positive class must not trigger");
  const controlMapped = summarizeV2UnitsForSubjectForTests([controlUnit]);
  assert.equal(
    controlMapped.parentActionHe,
    null,
    "control: probe_only unit must not produce parentActionHe (oracle rule: probe_only → null)"
  );
}

function runParentReportOutputStabilizationGoldenMatrix() {
  const goldenCaseIds = ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10"];
  assert.ok(
    goldenCaseIds.length >= 8 && goldenCaseIds.length <= 12,
    "stabilization sprint requires locked golden set sized 8-12"
  );

  // G6: math rows split by mode/level collapse into one canonical pedagogical topic.
  const mathCollapsed = collapseTopicRowsToCanonicalTopicEntityForTests("math", {
    "addition\u0001learning\u0001g4\u0001easy": {
      bucketKey: "addition",
      displayName: "חיבור",
      questions: 8,
      correct: 7,
      wrong: 1,
      timeMinutes: 10,
      modeKey: "learning",
      gradeKey: "g4",
      levelKey: "easy",
      lastSessionMs: Date.UTC(2026, 3, 10, 11, 0, 0),
    },
    "addition\u0001practice\u0001g4\u0001medium": {
      bucketKey: "addition",
      displayName: "חיבור",
      questions: 9,
      correct: 8,
      wrong: 1,
      timeMinutes: 12,
      modeKey: "practice",
      gradeKey: "g4",
      levelKey: "medium",
      lastSessionMs: Date.UTC(2026, 3, 10, 12, 0, 0),
    },
    "addition\u0001speed\u0001g4\u0001hard": {
      bucketKey: "addition",
      displayName: "חיבור",
      questions: 5,
      correct: 4,
      wrong: 1,
      timeMinutes: 5,
      modeKey: "speed",
      gradeKey: "g4",
      levelKey: "hard",
      lastSessionMs: Date.UTC(2026, 3, 10, 13, 0, 0),
    },
  });
  assert.equal(Object.keys(mathCollapsed).length, 1, "G6: math topic must collapse to canonical single entity");
  const g6 = mathCollapsed["addition::grade:g4"] || mathCollapsed.addition;
  assert.equal(Number(g6?.questions) || 0, 22, "G6: merged questions must be summed");
  assert.ok(
    Array.isArray(g6?.parentTopicSubSignals?.modeBreakdown) && g6.parentTopicSubSignals.modeBreakdown.length >= 2,
    "G6: mode split must survive only as sub-signal"
  );

  // G7: non-math rows split by mode collapse into one topic entity.
  const englishCollapsed = collapseTopicRowsToCanonicalTopicEntityForTests("english", {
    "vocabulary\u0001learning": {
      bucketKey: "vocabulary",
      displayName: "אוצר מילים",
      questions: 11,
      correct: 10,
      wrong: 1,
      timeMinutes: 9,
      modeKey: "learning",
      lastSessionMs: Date.UTC(2026, 3, 9, 11, 0, 0),
    },
    "vocabulary\u0001practice": {
      bucketKey: "vocabulary",
      displayName: "אוצר מילים",
      questions: 7,
      correct: 6,
      wrong: 1,
      timeMinutes: 6,
      modeKey: "practice",
      lastSessionMs: Date.UTC(2026, 3, 9, 12, 0, 0),
    },
  });
  assert.equal(Object.keys(englishCollapsed).length, 1, "G7: non-math topic must collapse by pedagogical bucket");
  assert.equal(Number(englishCollapsed.vocabulary?.questions) || 0, 18, "G7: non-math merged questions must be summed");

  const mathMixedGrades = collapseTopicRowsToCanonicalTopicEntityForTests("math", {
    "fractions\u0001learning\u0001g4\u0001easy": {
      bucketKey: "fractions",
      displayName: "שברים",
      questions: 10,
      correct: 8,
      wrong: 2,
      gradeKey: "g4",
      levelKey: "easy",
      modeKey: "learning",
    },
    "fractions\u0001learning\u0001g5\u0001easy": {
      bucketKey: "fractions",
      displayName: "שברים",
      questions: 6,
      correct: 3,
      wrong: 3,
      gradeKey: "g5",
      levelKey: "easy",
      modeKey: "learning",
    },
  });
  assert.equal(Object.keys(mathMixedGrades).length, 2, "G6b: different practice grades must not merge");
  assert.ok(mathMixedGrades["fractions::grade:g4"], "G6b: grade 4 row must exist");
  assert.ok(mathMixedGrades["fractions::grade:g5"], "G6b: grade 5 row must exist");
  assert.equal(Number(mathMixedGrades["fractions::grade:g4"]?.questions) || 0, 10);
  assert.equal(Number(mathMixedGrades["fractions::grade:g5"]?.questions) || 0, 6);

  // G8: different pedagogical topics must stay separate.
  const noOverMerge = collapseTopicRowsToCanonicalTopicEntityForTests("math", {
    "addition\u0001learning\u0001g4\u0001easy": {
      bucketKey: "addition",
      displayName: "חיבור",
      questions: 10,
      correct: 8,
      wrong: 2,
      timeMinutes: 8,
      modeKey: "learning",
      gradeKey: "g4",
      levelKey: "easy",
    },
    "subtraction\u0001learning\u0001g4\u0001easy": {
      bucketKey: "subtraction",
      displayName: "חיסור",
      questions: 10,
      correct: 8,
      wrong: 2,
      timeMinutes: 8,
      modeKey: "learning",
      gradeKey: "g4",
      levelKey: "easy",
    },
  });
  assert.equal(Object.keys(noOverMerge).length, 2, "G8: canonical merge must not collapse different topics");

  // G9: sparse data must suppress deep cross-subject padding.
  const sparseDetailed = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.all_sparse(), { period: "week" });
  const sparseNorm = normalizeExecutiveSummary(sparseDetailed);
  assert.equal(
    String(sparseNorm.crossSubjectConclusionReadiness || ""),
    "",
    "G9: sparse report must suppress deep cross-subject readiness block"
  );
  assert.equal(
    Array.isArray(sparseNorm.majorDiagnosticCautionsHe) ? sparseNorm.majorDiagnosticCautionsHe.length : 0,
    0,
    "G9: sparse report must suppress deep diagnostic caution list"
  );

  // G10: one active subject must not render deep cross-subject template padding.
  const oneDominant = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.one_dominant_subject(), {
    period: "week",
  });
  const oneNorm = normalizeExecutiveSummary(oneDominant);
  assert.equal(
    String(oneNorm.crossSubjectConclusionReadiness || ""),
    "",
    "G10: single active subject must suppress deep cross-subject readiness"
  );
}

function runPhase9MistakeMemoryAndExecutive() {
  const sparse = buildMistakeIntelligencePhase9({
    rootCause: "insufficient_evidence",
    behaviorType: "undetermined",
    riskFlags: {},
    trendDer: { trendConfOk: false, unclearTrend: true },
    q: 4,
    accuracy: 80,
    wrongRatio: 0.1,
    mistakeEventCount: 0,
    evidenceStrength: "low",
    dataSufficiencyLevel: "low",
    conclusionStrength: "tentative",
    displayName: "נושא",
  });
  assert.equal(sparse.dominantMistakePattern, "insufficient_mistake_evidence");

  const speed = buildMistakeIntelligencePhase9({
    rootCause: "speed_pressure",
    behaviorType: "speed_pressure",
    riskFlags: { speedOnlyRisk: true },
    trendDer: { trendConfOk: true, fragileProgressPattern: false, independenceDeteriorating: false },
    q: 18,
    accuracy: 72,
    wrongRatio: 0.18,
    mistakeEventCount: 4,
    evidenceStrength: "medium",
    dataSufficiencyLevel: "medium",
    conclusionStrength: "moderate",
    modeKey: "speed",
    displayName: "חיבור",
  });
  assert.equal(speed.dominantMistakePattern, "speed_driven_error");

  const instr = buildMistakeIntelligencePhase9({
    rootCause: "instruction_friction",
    behaviorType: "instruction_friction",
    riskFlags: { hintDependenceRisk: true },
    trendDer: { trendConfOk: true },
    q: 16,
    accuracy: 55,
    wrongRatio: 0.28,
    mistakeEventCount: 5,
    evidenceStrength: "medium",
    dataSufficiencyLevel: "medium",
    conclusionStrength: "moderate",
    displayName: "מילים",
  });
  assert.equal(instr.dominantMistakePattern, "instruction_misread");

  const memFrag = buildLearningMemoryPhase9({
    trendDer: {
      trendConfOk: true,
      fragileProgressPattern: true,
      positiveAccuracy: true,
      independenceDeteriorating: true,
      negativeAccuracy: false,
    },
    behaviorType: "fragile_success",
    riskFlags: { hintDependenceRisk: true },
    q: 16,
    accuracy: 78,
    wrongRatio: 0.12,
    conclusionStrength: "moderate",
    diagnosticRestraintLevel: "mixed",
    trend: null,
  });
  assert.equal(memFrag.learningStage, "fragile_retention");

  const memStable = buildLearningMemoryPhase9({
    trendDer: {
      trendConfOk: true,
      fragileProgressPattern: false,
      independenceDeteriorating: false,
      positiveAccuracy: false,
      negativeAccuracy: false,
    },
    behaviorType: "stable_mastery",
    riskFlags: {},
    q: 22,
    accuracy: 88,
    wrongRatio: 0.06,
    conclusionStrength: "strong",
    diagnosticRestraintLevel: "confirmed",
    trend: null,
  });
  assert.ok(["stable_control", "transfer_emerging", "partial_stabilization"].includes(memStable.learningStage));

  const ov = buildPhase9RecommendationOverlay({
    dominantMistakePattern: "concept_confusion",
    learningStage: "partial_stabilization",
    retentionRisk: "moderate",
    transferReadiness: "limited",
    rootCause: "knowledge_gap",
    finalStep: "remediate_same_level",
    riskFlags: {},
  });
  assert.equal(ov.recommendedPracticeMode, "error_reduction_loop");

  const d = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.one_dominant_subject(), { period: "week" });
  assert.ok("dominantCrossSubjectMistakePattern" in d.executiveSummary);
  const mathSp = d.subjectProfiles.find((s) => s.subject === "math");
  assert.ok(mathSp?.dominantMistakePattern, "subject dominant mistake");
  const tr0 = mathSp?.topicRecommendations?.[0];
  assert.ok(tr0?.learningStage, "topic learningStage");
  assert.ok(tr0?.recommendedPracticeMode, "topic recommendedPracticeMode");
}

function runPhase10EffectivenessConfidenceAndExecutive() {
  const weak = buildInterventionEffectivenessPhase10({
    trendDer: { trendConfOk: false, positiveAccuracy: false },
    learningStage: "early_acquisition",
    independenceProgress: "flat",
    mistakeRecurrenceLevel: "unclear",
    dominantMistakePattern: "insufficient_mistake_evidence",
    retentionRisk: "low",
    riskFlags: {},
    q: 5,
    accuracy: 70,
    wrongRatio: 0.2,
    evidenceStrength: "low",
    dataSufficiencyLevel: "low",
    conclusionStrength: "tentative",
    displayName: "נושא",
  });
  assert.equal(weak.responseToIntervention, "not_enough_evidence");

  const stalled = buildInterventionEffectivenessPhase10({
    trendDer: { trendConfOk: true, positiveAccuracy: false, negativeAccuracy: false },
    learningStage: "partial_stabilization",
    independenceProgress: "flat",
    mistakeRecurrenceLevel: "persistent",
    dominantMistakePattern: "concept_confusion",
    retentionRisk: "moderate",
    riskFlags: {},
    q: 20,
    accuracy: 65,
    wrongRatio: 0.22,
    evidenceStrength: "medium",
    dataSufficiencyLevel: "medium",
    conclusionStrength: "moderate",
    displayName: "חיבור",
  });
  assert.equal(stalled.responseToIntervention, "stalled_response");

  const over = buildInterventionEffectivenessPhase10({
    trendDer: { trendConfOk: true, positiveAccuracy: true, independenceDirection: "flat" },
    learningStage: "fragile_retention",
    independenceProgress: "flat",
    mistakeRecurrenceLevel: "repeating",
    dominantMistakePattern: "support_dependent_success",
    retentionRisk: "moderate",
    riskFlags: { hintDependenceRisk: true },
    q: 22,
    accuracy: 82,
    wrongRatio: 0.12,
    evidenceStrength: "strong",
    dataSufficiencyLevel: "strong",
    conclusionStrength: "moderate",
    displayName: "חיבור",
  });
  assert.equal(over.responseToIntervention, "over_supported_progress");

  const ind = buildInterventionEffectivenessPhase10({
    trendDer: {
      trendConfOk: true,
      positiveAccuracy: true,
      independenceDirection: "up",
    },
    learningStage: "stable_control",
    independenceProgress: "improving",
    mistakeRecurrenceLevel: "repeating",
    dominantMistakePattern: "careless_flip",
    retentionRisk: "low",
    riskFlags: {},
    q: 22,
    accuracy: 74,
    wrongRatio: 0.14,
    evidenceStrength: "strong",
    dataSufficiencyLevel: "strong",
    conclusionStrength: "strong",
    displayName: "חיבור",
  });
  assert.equal(ind.responseToIntervention, "independence_growing");

  const fresh = buildConfidenceAgingPhase10({
    recencyScore: 88,
    q: 18,
    evidenceStrength: "strong",
    dataSufficiencyLevel: "strong",
    conclusionStrength: "strong",
    retentionRisk: "low",
  });
  assert.equal(fresh.freshnessState, "fresh");
  assert.equal(fresh.recalibrationNeed, "none");

  const stale = buildConfidenceAgingPhase10({
    recencyScore: 22,
    q: 16,
    evidenceStrength: "low",
    dataSufficiencyLevel: "medium",
    conclusionStrength: "strong",
    retentionRisk: "low",
  });
  assert.ok(stale.freshnessState === "stale" || stale.conclusionFreshness === "expired");
  assert.ok(stale.recalibrationNeed === "structured_recheck" || stale.recalibrationNeed === "light_review");

  const p10 = buildPhase10RecommendationOverlay({
    responseToIntervention: "stalled_response",
    supportFit: "partial_fit",
    supportAdjustmentNeed: "tighten_focus",
    recalibrationNeed: "none",
    conclusionFreshness: "high",
    freshnessState: "fresh",
    finalStep: "maintain_and_strengthen",
    rootCause: "knowledge_gap",
    recommendedPracticeMode: "error_reduction_loop",
  });
  assert.equal(p10.nextSupportAdjustment, "continue_and_tighten_focus");

  const p10Weak = buildPhase10RecommendationOverlay({
    responseToIntervention: "not_enough_evidence",
    supportFit: "unknown",
    supportAdjustmentNeed: "monitor_only",
    recalibrationNeed: "structured_recheck",
    conclusionFreshness: "expired",
    freshnessState: "stale",
    finalStep: "advance_level",
    rootCause: "knowledge_gap",
    recommendedPracticeMode: "observe_only",
  });
  assert.equal(p10Weak.nextSupportAdjustment, "recheck_before_advancing");

  const d = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.one_dominant_subject(), { period: "week" });
  assert.ok(typeof d.executiveSummary.crossSubjectResponseToIntervention === "string");
  assert.ok(String(d.executiveSummary.crossSubjectResponseToInterventionLabelHe || "").length > 4);
  assert.ok(Array.isArray(d.executiveSummary.majorRecheckAreasHe));
  const tr = d.subjectProfiles.find((s) => s.subject === "math")?.topicRecommendations?.[0];
  assert.ok(tr && typeof tr.responseToIntervention === "string", "topic rec phase10 rti");
  assert.ok(typeof tr.nextSupportAdjustmentHe === "string" && tr.nextSupportAdjustmentHe.length > 3);
}

function runPhase11SequencingAndDrift() {
  const d = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.one_dominant_subject(), { period: "week" });
  const tr = d.subjectProfiles.find((s) => s.subject === "math")?.topicRecommendations?.[0];
  assert.ok(tr && typeof tr.supportSequenceState === "string");
  assert.ok(typeof tr.nextSupportSequenceAction === "string");
  assert.ok(typeof d.executiveSummary.crossSubjectSupportSequenceState === "string");
  assert.ok(String(d.executiveSummary.crossSubjectSupportSequenceStateLabelHe || "").length > 3);
  assert.ok(Array.isArray(d.executiveSummary.subjectsReadyForReleaseHe));
  const mathSp = d.subjectProfiles.find((s) => s.subject === "math");
  assert.ok(typeof mathSp?.subjectSupportSequenceState === "string");
  assert.ok(String(mathSp?.subjectSequenceNarrativeHe || "").length > 4);

  const seqWeak = buildSupportSequencingPhase11({
    q: 6,
    accuracy: 70,
    wrongRatio: 0.2,
    evidenceStrength: "low",
    dataSufficiencyLevel: "low",
    conclusionStrength: "tentative",
    recommendedPracticeMode: "observe_only",
    recommendedInterventionType: "monitor_before_escalation",
    interventionFormat: "observation_block",
    responseToIntervention: "not_enough_evidence",
    supportAdjustmentNeed: "monitor_only",
    learningStage: "insufficient_longitudinal_evidence",
    independenceProgress: "flat",
    mistakeRecurrenceLevel: "unclear",
    trendDer: { trendConfOk: false },
    trend: null,
    displayName: "נושא",
  });
  assert.equal(seqWeak.supportSequenceState, "insufficient_sequence_evidence");

  const seqGuided = buildSupportSequencingPhase11({
    q: 20,
    accuracy: 68,
    wrongRatio: 0.22,
    evidenceStrength: "medium",
    dataSufficiencyLevel: "medium",
    conclusionStrength: "moderate",
    recommendedPracticeMode: "slow_guided_accuracy",
    recommendedInterventionType: "stabilize_accuracy",
    interventionFormat: "guided_practice",
    responseToIntervention: "stalled_response",
    supportAdjustmentNeed: "tighten_focus",
    learningStage: "partial_stabilization",
    independenceProgress: "flat",
    mistakeRecurrenceLevel: "persistent",
    trendDer: { trendConfOk: true, positiveAccuracy: false, independenceDirection: "flat" },
    trend: {
      windows: { previousComparablePeriod: { accuracy: 70 }, currentPeriod: { accuracy: 69 } },
    },
    displayName: "חיבור",
  });
  assert.ok(
    seqGuided.strategyRepetitionRisk === "high" || seqGuided.supportSequenceState === "sequence_stalled",
    "guided persistent should surface repetition or stall"
  );

  const drift = buildAdviceDriftPhase11({
    ...seqGuided,
    rootCause: "knowledge_gap",
    recommendedInterventionType: "stabilize_accuracy",
    recommendedPracticeMode: "slow_guided_accuracy",
  });
  assert.ok(typeof drift.adviceSimilarityLevel === "string");

  const p11 = buildPhase11SequenceOverlay({
    ...seqGuided,
    ...drift,
    responseToIntervention: "stalled_response",
    nextSupportAdjustment: "continue_and_tighten_focus",
    conclusionFreshness: "medium",
    freshnessState: "fresh",
    recalibrationNeed: "none",
    displayName: "חיבור",
  });
  assert.ok(typeof p11.nextSupportSequenceAction === "string" && p11.nextSupportSequenceAction.length > 3);

  const earlyRow = {
    bucketKey: "addition",
    displayName: "חיבור",
    questions: 14,
    correct: 11,
    wrong: 3,
    accuracy: 78,
    modeKey: "learning",
    evidenceStrength: "medium",
    dataSufficiencyLevel: "medium",
    trend: {
      version: 1,
      accuracyDirection: "up",
      independenceDirection: "flat",
      fluencyDirection: "flat",
      confidence: 0.55,
      windows: { currentPeriod: { accuracy: 78 }, recentShortWindow: { accuracy: 72 } },
    },
    behaviorProfile: { version: 1, dominantType: "knowledge_gap", signals: {}, decisionTrace: [] },
  };
  const endMsEarly = Date.UTC(2026, 3, 10, 23, 59, 59);
  const sigEarly = computeRowDiagnosticSignals(
    "math",
    FIXTURE_MATH_ROW_ADD_LEARN_G4_MED,
    earlyRow,
    { [FIXTURE_MATH_ROW_ADD_LEARN_G4_MED]: { count: 3 } },
    endMsEarly
  );
  const decEarly = decideTopicNextStep({ ...earlyRow, ...sigEarly }, 3, DEFAULT_TOPIC_NEXT_STEP_CONFIG);
  assert.ok(typeof decEarly.responseToIntervention === "string" && decEarly.responseToIntervention.length > 2);
}

function runPhase12MemoryAndOutcome() {
  const memWeak = buildRecommendationMemoryPhase12({
    q: 6,
    evidenceStrength: "low",
    dataSufficiencyLevel: "low",
    conclusionStrength: "tentative",
    trend: null,
    trendDer: {},
    priorSupportPattern: "unknown",
    recommendedPracticeMode: "observe_only",
    interventionFormat: "observation_block",
    responseToIntervention: "not_enough_evidence",
    displayName: "נושא",
  });
  assert.equal(memWeak.recommendationMemoryState, "no_memory");

  const memMulti = buildRecommendationMemoryPhase12({
    q: 20,
    evidenceStrength: "strong",
    dataSufficiencyLevel: "strong",
    conclusionStrength: "moderate",
    trend: {
      windows: {
        previousComparablePeriod: { accuracy: 72 },
        currentPeriod: { accuracy: 74 },
        recentShortWindow: { accuracy: 73 },
      },
    },
    trendDer: { trendConfOk: true },
    priorSupportPattern: "guided_repeat",
    recommendedPracticeMode: "slow_guided_accuracy",
    interventionFormat: "guided_practice",
    responseToIntervention: "stalled_response",
    displayName: "חיבור",
  });
  assert.ok(
    memMulti.supportHistoryDepth === "multi_window" || memMulti.recommendationMemoryState === "usable_memory",
    "multi-window trend should deepen memory signal"
  );

  const outMis = buildOutcomeTrackingPhase12({
    ...memMulti,
    responseToIntervention: "stalled_response",
    independenceProgress: "flat",
    mistakeRecurrenceLevel: "persistent",
    trendDer: { trendConfOk: true, positiveAccuracy: false },
    displayName: "חיבור",
  });
  assert.ok(typeof outMis.expectedVsObservedMatch === "string");

  const p12 = buildPhase12ContinuationOverlay({
    ...memMulti,
    ...outMis,
    adviceSimilarityLevel: "mostly_repeated",
    recommendationRotationNeed: "meaningful_rotation",
    nextSupportSequenceAction: "pause_repeat_and_switch",
    supportSequenceState: "sequence_stalled",
    strategyRepetitionRisk: "high",
  });
  assert.ok(typeof p12.recommendationContinuationDecision === "string" && p12.recommendationContinuationDecision.length > 3);
  assert.ok(typeof p12.outcomeBasedNextMove === "string");

  const d = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.one_dominant_subject(), { period: "week" });
  const tr = d.subjectProfiles.find((s) => s.subject === "math")?.topicRecommendations?.[0];
  assert.ok(tr && typeof tr.recommendationMemoryState === "string");
  assert.ok(typeof tr.recommendationContinuationDecision === "string");
  assert.ok(typeof tr.expectedVsObservedMatch === "string");
  assert.ok(typeof d.executiveSummary.crossSubjectRecommendationMemoryState === "string");
  assert.ok(String(d.executiveSummary.crossSubjectContinuationDecisionHe || "").length > 4);
  assert.ok(Array.isArray(d.executiveSummary.subjectsNeedingFreshEvidenceHe));
  const mathSp = d.subjectProfiles.find((s) => s.subject === "math");
  assert.ok(typeof mathSp?.subjectContinuationDecision === "string");
  assert.ok(String(mathSp?.subjectOutcomeNarrativeHe || "").length > 8);
}

function runPhase13DecisionsAndEvidenceTargets() {
  const baseWeak = {
    q: 6,
    evidenceStrength: "low",
    dataSufficiencyLevel: "low",
    conclusionStrength: "tentative",
    rootCause: "knowledge_gap",
    retentionRisk: "low",
    learningStage: "stable_mastery",
    freshnessState: "fresh",
    conclusionFreshness: "medium",
    recalibrationNeed: "none",
    supportSequenceState: "insufficient_sequence_evidence",
    responseToIntervention: "not_enough_evidence",
    expectedVsObservedMatch: "not_enough_evidence",
    recommendationMemoryState: "no_memory",
    independenceProgress: "flat",
    trendDer: {},
    finalStep: "maintain_and_strengthen",
    displayName: "נושא",
  };
  const gWeak = buildDecisionGatesPhase13(baseWeak);
  assert.equal(gWeak.gateState, "gates_not_ready");
  const tWeak = buildEvidenceTargetsPhase13(baseWeak);
  assert.equal(tWeak.targetEvidenceType, "response_confirmation");

  const gPivot = buildDecisionGatesPhase13({
    ...baseWeak,
    q: 20,
    evidenceStrength: "strong",
    conclusionStrength: "moderate",
    dataSufficiencyLevel: "strong",
    expectedVsObservedMatch: "misaligned",
    recommendationMemoryState: "usable_memory",
    responseToIntervention: "mixed_response",
  });
  assert.equal(gPivot.pivotGate, "forming");
  assert.equal(gPivot.gateState, "pivot_gate_visible");

  const ctxHighAccNoSeq = {
    q: 22,
    evidenceStrength: "strong",
    conclusionStrength: "strong",
    dataSufficiencyLevel: "strong",
    supportSequenceState: "single_support_episode",
    responseToIntervention: "early_positive_response",
    expectedVsObservedMatch: "aligned",
    recommendationMemoryState: "light_memory",
    independenceProgress: "improving",
    trendDer: { independenceDirection: "up" },
    finalStep: "maintain_and_strengthen",
    displayName: "חיבור",
    freshnessState: "fresh",
    conclusionFreshness: "high",
    recalibrationNeed: "none",
    retentionRisk: "low",
    learningStage: "consolidating",
  };
  const gNoRelease = buildDecisionGatesPhase13(ctxHighAccNoSeq);
  assert.equal(gNoRelease.releaseGate, "off", "release needs sequence/independence pathway, not accuracy alone");

  const gReleaseForming = buildDecisionGatesPhase13({
    ...ctxHighAccNoSeq,
    supportSequenceState: "sequence_ready_for_release",
    q: 18,
    trendDer: { independenceDirection: "up" },
  });
  assert.ok(
    gReleaseForming.releaseGate === "forming" || gReleaseForming.releaseGate === "pending",
    "sequence_ready + independence can open release track"
  );

  const gRecheck = buildDecisionGatesPhase13({
    q: 18,
    evidenceStrength: "medium",
    conclusionStrength: "moderate",
    dataSufficiencyLevel: "medium",
    rootCause: "knowledge_gap",
    retentionRisk: "low",
    learningStage: "consolidating",
    freshnessState: "stale",
    conclusionFreshness: "low",
    recalibrationNeed: "structured_recheck",
    supportSequenceState: "continuing_sequence",
    responseToIntervention: "early_positive_response",
    expectedVsObservedMatch: "partly_aligned",
    recommendationMemoryState: "light_memory",
    independenceProgress: "flat",
    trendDer: {},
    finalStep: "maintain_and_strengthen",
    displayName: "חיבור",
  });
  assert.equal(gRecheck.recheckGate, "forming");
  assert.equal(gRecheck.gateState, "recheck_gate_visible");

  const targSpeed = buildEvidenceTargetsPhase13({
    rootCause: "speed_pressure",
    freshnessState: "fresh",
    conclusionFreshness: "high",
    recommendationMemoryState: "usable_memory",
    expectedVsObservedMatch: "aligned",
    responseToIntervention: "early_positive_response",
    mistakeRecurrenceLevel: "low",
    learningStage: "consolidating",
  });
  assert.equal(targSpeed.targetEvidenceType, "accuracy_confirmation");

  const targStale = buildEvidenceTargetsPhase13({
    rootCause: "knowledge_gap",
    freshnessState: "stale",
    conclusionFreshness: "low",
    recommendationMemoryState: "usable_memory",
    expectedVsObservedMatch: "aligned",
    responseToIntervention: "early_positive_response",
    mistakeRecurrenceLevel: "low",
    learningStage: "consolidating",
  });
  assert.equal(targStale.targetEvidenceType, "fresh_data_needed");
  assert.equal(targStale.targetObservationWindow, "needs_fresh_baseline");

  const overlayStab = buildPhase13NextCycleOverlay({
    gateState: "continue_gate_active",
    releaseGate: "off",
    pivotGate: "off",
    recheckGate: "off",
    advanceGate: "blocked",
    learningStage: "fragile_retention",
    expectedVsObservedMatch: "aligned",
    recommendationMemoryState: "usable_memory",
    responseToIntervention: "early_positive_response",
    freshnessState: "fresh",
    conclusionFreshness: "high",
    recalibrationNeed: "none",
    trendDer: {},
    independenceProgress: "flat",
    targetSuccessSignalHe: "בדיקה",
    targetObservationWindowLabelHe: "חלון קצר",
  });
  assert.equal(overlayStab.nextCycleDecisionFocus, "stabilize_before_advance");

  const evP = buildEvidenceTargetsPhase13(gPivot);
  const ov = buildPhase13NextCycleOverlay({ ...gPivot, ...evP });
  assert.ok(String(ov.nextCycleDecisionFocusHe || "").length > 4);

  const dSparse = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.all_sparse(), { period: "week" });
  const esSparse = dSparse.executiveSummary;
  assert.ok(typeof esSparse.crossSubjectGateState === "string");
  assert.ok(Array.isArray(esSparse.subjectsNearReleaseButNotThereHe));
  const mathSparse = dSparse.subjectProfiles.find((s) => s.subject === "math");
  assert.ok(typeof mathSparse?.subjectGateState === "string");
  assert.ok(typeof mathSparse?.subjectNextCycleDecisionFocus === "string");

  const mixed = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.mixed_signals_cross_subjects(), {
    period: "week",
  });
  assert.ok(String(mixed.executiveSummary.crossSubjectNextCycleDecisionFocus || "").length > 2);
  assert.ok(Array.isArray(mixed.executiveSummary.subjectsNeedingRecheckBeforeDecisionHe));

  const n = normalizeExecutiveSummary({});
  assert.ok("crossSubjectGateState" in n && "subjectsWithVisiblePivotTriggerHe" in n);

  const rowUi = {
    topicEngineRowSignals: {
      gateNarrativeHe: "ב«חיבור»: מיקוד סבב.",
      evidenceTargetNarrativeHe: "יעד ראיה.",
      recheckGate: "forming",
      whatWouldTriggerRecheckHe: "סבב קצר לפני החלטה.",
    },
  };
  assert.ok(gateStateLineHe(rowUi).length > 0);
  assert.ok(evidenceTargetLineHe(rowUi).length > 0);
  assert.ok(gateTriggerCompactLineHe(rowUi).length > 0);
}

function runPhase14FoundationDependencyAndOrdering() {
  const speedCtx = {
    q: 18,
    evidenceStrength: "medium",
    dataSufficiencyLevel: "medium",
    conclusionStrength: "moderate",
    rootCause: "speed_pressure",
    learningStage: "consolidating",
    retentionRisk: "low",
    mistakeRecurrenceLevel: "low",
    dominantMistakePattern: "speed_driven_error",
    independenceProgress: "improving",
    trendDer: { independenceDirection: "up", accuracyDirection: "flat" },
    responseToIntervention: "early_positive_response",
    expectedVsObservedMatch: "aligned",
    recommendationMemoryState: "light_memory",
    gateReadiness: "moderate",
    gateState: "continue_gate_active",
    targetEvidenceType: "accuracy_confirmation",
    displayName: "חיבור",
  };
  const speed = buildFoundationDependencyPhase14(speedCtx);
  assert.equal(speed.dependencyState, "likely_local_issue");
  assert.equal(speed.likelyFoundationalBlocker, "unknown");

  const fragile = buildFoundationDependencyPhase14({
    ...speedCtx,
    rootCause: "knowledge_gap",
    learningStage: "fragile_retention",
    retentionRisk: "high",
    mistakeRecurrenceLevel: "persistent",
    gateReadiness: "high",
  });
  assert.equal(fragile.dependencyState, "likely_foundational_block");
  assert.ok(fragile.shouldTreatAsFoundationFirst);

  const ov = buildPhase14RecommendationOverlay({
    ...fragile,
    releaseGate: "off",
    advanceGate: "forming",
    nextCycleDecisionFocus: "stabilize_before_advance",
    targetEvidenceType: "retention_confirmation",
    targetObservationWindowLabelHe: "בשני סבבים קצרים",
    targetSuccessSignalHe: "בדיקה",
  });
  assert.ok(ov.foundationBeforeExpansion === true || String(ov.foundationBeforeExpansionHe || "").length > 5);
  assert.ok(
    ov.interventionOrdering === "foundation_first" || ov.interventionOrdering === "gather_dependency_evidence_first"
  );

  const localOv = buildPhase14RecommendationOverlay({
    ...speed,
    gateState: "continue_gate_active",
    releaseGate: "off",
    nextCycleDecisionFocus: "prove_current_direction",
  });
  assert.equal(localOv.interventionOrdering, "local_support_first");

  const d = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.one_dominant_subject(), { period: "week" });
  assert.ok(typeof d.executiveSummary.crossSubjectDependencyState === "string");
  assert.ok(Array.isArray(d.executiveSummary.subjectsSafeForLocalInterventionHe));
  const mathSp = d.subjectProfiles.find((s) => s.subject === "math");
  assert.ok(typeof mathSp?.subjectDependencyState === "string");
  assert.ok(typeof mathSp?.subjectDependencyNarrativeHe === "string");

  const n = normalizeExecutiveSummary({});
  assert.ok("crossSubjectDependencyState" in n && "subjectsNeedingFoundationFirstHe" in n);
}

function runPhase8InterventionPriorityAndCalibration() {
  const sparseObs = buildInterventionPlanPhase8({
    rootCause: "insufficient_evidence",
    conclusionStrength: "tentative",
    shouldAvoidStrongConclusion: true,
    recommendedInterventionType: "monitor_before_escalation",
    finalStep: "maintain_and_strengthen",
    q: 6,
    accuracy: 80,
    dataSufficiencyLevel: "low",
    evidenceStrength: "low",
    displayName: "חיבור",
  });
  assert.equal(sparseObs.interventionFormat, "observation_block");
  assert.equal(sparseObs.interventionIntensity, "light");
  assert.ok(String(sparseObs.avoidNowHe).length > 8);

  const speed = buildInterventionPlanPhase8({
    rootCause: "speed_pressure",
    conclusionStrength: "strong",
    shouldAvoidStrongConclusion: false,
    recommendedInterventionType: "reduce_time_pressure",
    finalStep: "maintain_and_strengthen",
    q: 18,
    accuracy: 72,
    dataSufficiencyLevel: "medium",
    evidenceStrength: "medium",
    displayName: "חיבור",
  });
  assert.notEqual(sparseObs.interventionPlanHe, speed.interventionPlanHe);
  assert.ok(String(speed.avoidNowHe).includes("מהירות") || String(speed.doNowHe).includes("טיימר"));

  const weakInd = buildInterventionPlanPhase8({
    rootCause: "weak_independence",
    conclusionStrength: "moderate",
    shouldAvoidStrongConclusion: false,
    recommendedInterventionType: "guided_to_independent_transition",
    finalStep: "maintain_and_strengthen",
    q: 16,
    accuracy: 78,
    dataSufficiencyLevel: "medium",
    evidenceStrength: "medium",
    displayName: "חלוקה",
  });
  assert.equal(weakInd.interventionFormat, "mixed");

  const friction = buildInterventionPlanPhase8({
    rootCause: "instruction_friction",
    conclusionStrength: "moderate",
    shouldAvoidStrongConclusion: false,
    recommendedInterventionType: "clarify_instruction_pattern",
    finalStep: "maintain_and_strengthen",
    q: 14,
    accuracy: 76,
    displayName: "מילים",
  });
  assert.equal(friction.interventionIntensity, "light");
  assert.equal(friction.interventionDurationBand, "very_short");

  const gap = buildInterventionPlanPhase8({
    rootCause: "knowledge_gap",
    conclusionStrength: "strong",
    shouldAvoidStrongConclusion: false,
    recommendedInterventionType: "target_core_skill_gap",
    finalStep: "remediate_same_level",
    q: 22,
    accuracy: 68,
    dataSufficiencyLevel: "strong",
    evidenceStrength: "strong",
    displayName: "חיבור",
  });
  assert.equal(gap.interventionGoal, "core_skill_gap");
  assert.ok(gap.interventionFormat === "guided_practice");

  const gapCapped = buildInterventionPlanPhase8({
    rootCause: "knowledge_gap",
    conclusionStrength: "withheld",
    shouldAvoidStrongConclusion: true,
    recommendedInterventionType: "monitor_before_escalation",
    finalStep: "maintain_and_strengthen",
    q: 20,
    accuracy: 65,
    dataSufficiencyLevel: "medium",
    evidenceStrength: "medium",
    displayName: "חיבור",
  });
  assert.ok(gapCapped.interventionFormat !== "guided_practice" || gapCapped.interventionIntensity !== "targeted");

  const mixedReport = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.mixed_signals_cross_subjects(), {
    period: "week",
  });
  const urgentSubjects = (mixedReport.subjectProfiles || []).filter((s) => s.subjectPriorityLevel === "immediate");
  assert.ok(urgentSubjects.length <= 2, "phase8: at most two immediate subject priorities");
  assert.ok(mixedReport.executiveSummary.parentPriorityLadder?.rankedSubjects?.length >= 1);
  assert.ok(Array.isArray(mixedReport.executiveSummary.monitoringOnlyAreasHe));

  const oneDom = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.one_dominant_subject(), {
    period: "week",
  });
  const tr0 = oneDom.subjectProfiles.find((s) => s.subject === "math")?.topicRecommendations?.[0];
  assert.ok(tr0?.interventionPlan && typeof tr0.interventionPlan === "object");
  assert.equal(typeof tr0.doNowHe, "string");
  assert.equal(typeof tr0.avoidNowHe, "string");
  assert.ok(typeof tr0.recommendedPracticeLoad === "string" && tr0.recommendedPracticeLoad.length > 1);

  const strong = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.strong_executive_case(), {
    period: "week",
  });
  const mathStrong = strong.subjectProfiles.find((s) => s.subject === "math");
  const mathStrongTopicRecs = Array.isArray(mathStrong?.topicRecommendations) ? mathStrong.topicRecommendations : [];
  const mainActionables = mathStrongTopicRecs.filter((t) => t?.isMainActionable === true);
  assert.ok(mainActionables.length <= 1, "phase8: at most one main actionable topic per subject");
  if (mathStrongTopicRecs.length >= 2) {
    assert.equal(mathStrongTopicRecs[0].actionableRole, "primary");
    assert.equal(mathStrongTopicRecs[1].actionableRole, "secondary");
    const maxScore = Math.max(...mathStrongTopicRecs.map((t) => Number(t?._priorityScore) || 0));
    assert.equal(Number(mathStrongTopicRecs[0]?._priorityScore) || 0, maxScore);
  }
  const trHi =
    mathStrong?.topicRecommendations?.find((t) => (Number(t.accuracy) || 0) >= 88 && (Number(t.questions) || 0) >= 18) ||
    mathStrong?.topicRecommendations?.[0];
  if (trHi) {
    assert.ok(
      trHi.recommendedPracticeLoad === "minimal" || trHi.recommendedSessionLengthBand === "very_short",
      "phase8: strong row should stay light at home"
    );
  }

  // Thin evidence binding: sparse evidence must not produce strong action.
  const sparseUnit = {
    subjectId: "math",
    topicRowKey: "addition\u0001learning",
    displayName: "חיבור",
    intervention: { immediateActionHe: "תרגול" },
    confidence: { level: "low", rowSignals: { dataSufficiencyLevel: "low", isEarlySignalOnly: true } },
    outputGating: { cannotConcludeYet: false, additiveCautionAllowed: false, contractsV1: {} },
    priority: { level: "P4", score: 999 },
    recurrence: { totalQuestions: 3, wrongCountForRules: 2 },
    evidenceTrace: [{ type: "volume", value: { questions: 3, correct: 2, accuracy: 67, wrong: 1 } }],
    canonicalState: { assessment: { readiness: "insufficient", confidenceLevel: "low", decisionTier: 1 } },
  };
  const sparseBase = {
    mathOperations: {
      "addition\u0001learning": {
        contractsV1: { evidence: { questionCount: 3, accuracyPct: 67 }, evidenceValidation: { ok: true, errors: [] } },
      },
    },
  };
  const sparseTr = buildTopicRecommendationFromV2UnitForPhaseTests(sparseUnit, sparseBase, "math");
  assert.equal(sparseTr.recommendedNextStep, "maintain_and_strengthen");
  assert.equal(sparseTr.thinEvidenceDowngraded, true);

  const calSparse = buildPracticeCalibration({
    rootCause: "insufficient_evidence",
    conclusionStrength: "withheld",
    shouldAvoidStrongConclusion: true,
    diagnosticRestraintLevel: "insufficient",
    q: 5,
    accuracy: 70,
    evidenceStrength: "low",
    dataSufficiencyLevel: "low",
    interventionIntensity: "light",
  });
  assert.equal(calSparse.recommendedPracticeLoad, "minimal");

  const calGap = buildPracticeCalibration({
    rootCause: "knowledge_gap",
    conclusionStrength: "strong",
    shouldAvoidStrongConclusion: false,
    diagnosticRestraintLevel: "clear",
    q: 24,
    accuracy: 68,
    evidenceStrength: "strong",
    dataSufficiencyLevel: "strong",
    interventionIntensity: "targeted",
  });
  assert.ok(calGap.recommendedPracticeLoad === "moderate" || calGap.recommendedPracticeLoad === "light");
}

function runTopicRecGoldenRow() {
  const endMs = Date.UTC(2026, 3, 10, 23, 59, 59);
  const row = {
    bucketKey: "addition",
    displayName: "חיבור",
    questions: 16,
    correct: 12,
    wrong: 4,
    accuracy: 75,
    modeKey: "learning",
    lastSessionMs: endMs - 86400000,
  };
  const signals = computeRowDiagnosticSignals(
    "math",
    FIXTURE_MATH_ROW_ADD_LEARN_G4_MED,
    row,
    { [FIXTURE_MATH_ROW_ADD_LEARN_G4_MED]: { count: 4 } },
    endMs
  );
  const rec = buildTopicRecommendationRecord(
    "math",
    FIXTURE_MATH_ROW_ADD_LEARN_G4_MED,
    { ...row, ...signals },
    { [FIXTURE_MATH_ROW_ADD_LEARN_G4_MED]: { count: 4 } },
    undefined,
    endMs
  );
  assert.ok(typeof rec.whyThisRecommendationHe === "string");
  assert.ok(rec.riskFlags && typeof rec.riskFlags === "object");
  assert.ok(Array.isArray(rec.decisionTrace));
  assert.ok("rootCause" in rec && rec.rootCause, "topic rec: rootCause");
  assert.ok("conclusionStrength" in rec, "topic rec: conclusionStrength");
  assert.ok(typeof rec.recommendationReasoningHe === "string", "topic rec: recommendationReasoningHe");
  assert.ok(rec.interventionPlan && typeof rec.interventionPlan === "object", "topic rec: interventionPlan");
  assert.ok(typeof rec.doNowHe === "string");
  assert.ok(typeof rec.avoidNowHe === "string");
  assert.ok(typeof rec.escalationThresholdHe === "string");
  assert.ok(typeof rec.dominantMistakePattern === "string" && rec.dominantMistakePattern.length > 1);
  assert.ok(typeof rec.learningStage === "string" && rec.learningStage.length > 1);
  assert.ok(typeof rec.recommendedPracticeMode === "string");
}

function runPhase7CrossSubjectScenario() {
  const d = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.phase7_cross_subject_sparse_mixed(), {
    period: "week",
  });
  assert.ok(d.executiveSummary.dominantCrossSubjectRootCause, "phase7 exec dominantCrossSubjectRootCause");
  assert.ok(
    String(d.executiveSummary.dominantCrossSubjectRootCauseLabelHe || "").length > 2,
    "phase7 exec root cause label"
  );
  assert.ok(["ready", "partial", "not_ready"].includes(d.executiveSummary.crossSubjectConclusionReadiness));
  assert.ok(Array.isArray(d.executiveSummary.majorDiagnosticCautionsHe));
  assert.ok(typeof d.executiveSummary.recommendedParentPriorityType === "string");
  const mathP = d.subjectProfiles.find((s) => s.subject === "math");
  const geoP = d.subjectProfiles.find((s) => s.subject === "geometry");
  assert.ok(mathP?.dominantRootCause, "phase7 math dominantRootCause");
  assert.ok(geoP?.dominantRootCause, "phase7 geometry dominantRootCause");
}

function main() {
  runGoldenFixtures();
  runSubjectProfileKeyUnionAcrossScenarios();
  runTopicRecommendationRecordContract();
  runAggressiveEvidenceCapContract();
  runLabelContractsForAllGoldens();
  runExplicitNamedPhase6Scenarios();
  runExecutiveSummaryRules();
  runThresholdBoundaries();
  runLegacyMistakeAndDiagnostics();
  runGeneratorPropertyLoops();
  runContractAdditive();
  runUiResilienceHelpers();
  runTopicRecGoldenRow();
  runPhase7CrossSubjectScenario();
  runPhase8InterventionPriorityAndCalibration();
  runPhase9MistakeMemoryAndExecutive();
  runPhase10EffectivenessConfidenceAndExecutive();
  runPhase11SequencingAndDrift();
  runPhase12MemoryAndOutcome();
  runPhase13DecisionsAndEvidenceTargets();
  runPhase14FoundationDependencyAndOrdering();
  runPhase15NarrativeCompactAndStack();
  runInvariantHighVolumePerfectNoReducedComplexityWithoutExplicitContradiction();
  runInvariantMaintainOnlyProfileEmptyTopicRecommendations();
  runPhase2EvidenceContractParityTopicRecommendationsV2();
  runPhase5ContractIntegrityAndContradictions();
  runQaCalibrationRedTeam();
  runReactServerSmoke();
  runOutputQualityLockedRegression();
  runStrongPositiveRecommendationConsistencyCrossSurfaces();
  runParentReportOutputStabilizationGoldenMatrix();

  const reportDir = join(ROOT, "reports", "parent-report-phase6");
  try {
    mkdirSync(reportDir, { recursive: true });
  } catch {
    /* exists */
  }
  const snapshot = {};
  for (const [name, factory] of Object.entries(PARENT_REPORT_SCENARIOS)) {
    const base = factory();
    const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
    snapshot[name] = {
      executiveKeys: Object.keys(detailed.executiveSummary || {}).sort(),
      subjectCount: detailed.subjectProfiles.length,
      totalQuestions: detailed.overallSnapshot?.totalQuestions,
    };
  }
  writeFileSync(join(reportDir, "golden-snapshot.json"), JSON.stringify(snapshot, null, 2), "utf8");

  console.log("parent-report phase6 suite: OK");
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
