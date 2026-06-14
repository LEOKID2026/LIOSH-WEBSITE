/**
 * נרמול payload לדוח מקיף — אל UI ולבדיקות (שלב 6).
 * לא משנה מנוע; רק ברירות מחדל בטוחות כשחסרים שדות.
 */

export function normalizeExecutiveSummary(payload) {
  const es = payload?.executiveSummary;
  const d = es && typeof es === "object" ? es : {};
  const cautions = Array.isArray(d.majorDiagnosticCautionsHe)
    ? d.majorDiagnosticCautionsHe.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  const coverage = Array.isArray(payload?.overallSnapshot?.subjectCoverage)
    ? payload.overallSnapshot.subjectCoverage
    : [];
  const activeSubjects = coverage.filter((row) => (Number(row?.questionCount) || 0) > 0).length;
  const suppressDeepCrossSubject = activeSubjects <= 1;
  const windowTotalQuestions =
    Number(payload?.overallSnapshot?.totalQuestions) ||
    Number(d.windowTotalQuestions) ||
    0;
  const normalized = {
    windowTotalQuestions,
    topStrengthsAcrossHe: Array.isArray(d.topStrengthsAcrossHe) ? d.topStrengthsAcrossHe : [],
    topFocusAreasHe: Array.isArray(d.topFocusAreasHe) ? d.topFocusAreasHe : [],
    homeFocusHe: typeof d.homeFocusHe === "string" ? d.homeFocusHe : "",
    majorTrendsHe: Array.isArray(d.majorTrendsHe) ? d.majorTrendsHe : [],
    mainHomeRecommendationHe: typeof d.mainHomeRecommendationHe === "string" ? d.mainHomeRecommendationHe : "",
    cautionNoteHe: typeof d.cautionNoteHe === "string" ? d.cautionNoteHe : "",
    overallConfidenceHe: typeof d.overallConfidenceHe === "string" ? d.overallConfidenceHe : "",
    mixedSignalNoticeHe: d.mixedSignalNoticeHe ? String(d.mixedSignalNoticeHe) : "",
    reportReadinessHe: typeof d.reportReadinessHe === "string" ? d.reportReadinessHe : "",
    evidenceBalanceHe: typeof d.evidenceBalanceHe === "string" ? d.evidenceBalanceHe : "",
    dominantCrossSubjectRiskLabelHe:
      typeof d.dominantCrossSubjectRiskLabelHe === "string" ? d.dominantCrossSubjectRiskLabelHe : "",
    dominantCrossSubjectSuccessPatternLabelHe:
      typeof d.dominantCrossSubjectSuccessPatternLabelHe === "string"
        ? d.dominantCrossSubjectSuccessPatternLabelHe
        : "",
    dominantCrossSubjectRootCauseLabelHe:
      typeof d.dominantCrossSubjectRootCauseLabelHe === "string" ? d.dominantCrossSubjectRootCauseLabelHe : "",
    crossSubjectConclusionReadiness: typeof d.crossSubjectConclusionReadiness === "string" ? d.crossSubjectConclusionReadiness : "",
    majorDiagnosticCautionsHe: cautions,
    recommendedParentPriorityType:
      typeof d.recommendedParentPriorityType === "string" ? d.recommendedParentPriorityType : "",
    topImmediateParentActionHe: typeof d.topImmediateParentActionHe === "string" ? d.topImmediateParentActionHe : "",
    secondPriorityActionHe: typeof d.secondPriorityActionHe === "string" ? d.secondPriorityActionHe : "",
    monitoringOnlyAreasHe: Array.isArray(d.monitoringOnlyAreasHe) ? d.monitoringOnlyAreasHe : [],
    deferForNowAreasHe: Array.isArray(d.deferForNowAreasHe) ? d.deferForNowAreasHe : [],
    parentPriorityLadder:
      d.parentPriorityLadder && typeof d.parentPriorityLadder === "object" ? d.parentPriorityLadder : { version: 1, rankedSubjects: [] },
    dominantCrossSubjectMistakePattern:
      typeof d.dominantCrossSubjectMistakePattern === "string" ? d.dominantCrossSubjectMistakePattern : "",
    dominantCrossSubjectMistakePatternLabelHe:
      typeof d.dominantCrossSubjectMistakePatternLabelHe === "string" ? d.dominantCrossSubjectMistakePatternLabelHe : "",
    crossSubjectLearningStage: typeof d.crossSubjectLearningStage === "string" ? d.crossSubjectLearningStage : "",
    crossSubjectLearningStageLabelHe:
      typeof d.crossSubjectLearningStageLabelHe === "string" ? d.crossSubjectLearningStageLabelHe : "",
    crossSubjectRetentionRisk: typeof d.crossSubjectRetentionRisk === "string" ? d.crossSubjectRetentionRisk : "",
    crossSubjectTransferReadiness: typeof d.crossSubjectTransferReadiness === "string" ? d.crossSubjectTransferReadiness : "",
    reviewBeforeAdvanceAreasHe: Array.isArray(d.reviewBeforeAdvanceAreasHe) ? d.reviewBeforeAdvanceAreasHe : [],
    transferReadyAreasHe: Array.isArray(d.transferReadyAreasHe) ? d.transferReadyAreasHe : [],
    crossSubjectResponseToIntervention:
      typeof d.crossSubjectResponseToIntervention === "string" ? d.crossSubjectResponseToIntervention : "",
    crossSubjectResponseToInterventionLabelHe:
      typeof d.crossSubjectResponseToInterventionLabelHe === "string" ? d.crossSubjectResponseToInterventionLabelHe : "",
    crossSubjectSupportAdjustmentNeed:
      typeof d.crossSubjectSupportAdjustmentNeed === "string" ? d.crossSubjectSupportAdjustmentNeed : "",
    crossSubjectSupportAdjustmentNeedHe:
      typeof d.crossSubjectSupportAdjustmentNeedHe === "string" ? d.crossSubjectSupportAdjustmentNeedHe : "",
    crossSubjectConclusionFreshness:
      typeof d.crossSubjectConclusionFreshness === "string" ? d.crossSubjectConclusionFreshness : "",
    crossSubjectRecalibrationNeed: typeof d.crossSubjectRecalibrationNeed === "string" ? d.crossSubjectRecalibrationNeed : "",
    crossSubjectRecalibrationNeedHe:
      typeof d.crossSubjectRecalibrationNeedHe === "string" ? d.crossSubjectRecalibrationNeedHe : "",
    majorRecheckAreasHe: Array.isArray(d.majorRecheckAreasHe) ? d.majorRecheckAreasHe : [],
    areasWhereSupportCanBeReducedHe: Array.isArray(d.areasWhereSupportCanBeReducedHe) ? d.areasWhereSupportCanBeReducedHe : [],
    areasNeedingStrategyChangeHe: Array.isArray(d.areasNeedingStrategyChangeHe) ? d.areasNeedingStrategyChangeHe : [],
    crossSubjectSupportSequenceState:
      typeof d.crossSubjectSupportSequenceState === "string" ? d.crossSubjectSupportSequenceState : "",
    crossSubjectSupportSequenceStateLabelHe:
      typeof d.crossSubjectSupportSequenceStateLabelHe === "string" ? d.crossSubjectSupportSequenceStateLabelHe : "",
    crossSubjectStrategyRepetitionRisk:
      typeof d.crossSubjectStrategyRepetitionRisk === "string" ? d.crossSubjectStrategyRepetitionRisk : "",
    crossSubjectStrategyFatigueRisk:
      typeof d.crossSubjectStrategyFatigueRisk === "string" ? d.crossSubjectStrategyFatigueRisk : "",
    crossSubjectNextBestSequenceStep:
      typeof d.crossSubjectNextBestSequenceStep === "string" ? d.crossSubjectNextBestSequenceStep : "",
    crossSubjectNextBestSequenceStepHe:
      typeof d.crossSubjectNextBestSequenceStepHe === "string" ? d.crossSubjectNextBestSequenceStepHe : "",
    subjectsReadyForReleaseHe: Array.isArray(d.subjectsReadyForReleaseHe) ? d.subjectsReadyForReleaseHe : [],
    subjectsAtRiskOfSupportRepetitionHe: Array.isArray(d.subjectsAtRiskOfSupportRepetitionHe)
      ? d.subjectsAtRiskOfSupportRepetitionHe
      : [],
    subjectsNeedingSupportResetHe: Array.isArray(d.subjectsNeedingSupportResetHe) ? d.subjectsNeedingSupportResetHe : [],
    crossSubjectRecommendationMemoryState:
      typeof d.crossSubjectRecommendationMemoryState === "string" ? d.crossSubjectRecommendationMemoryState : "",
    crossSubjectRecommendationMemoryStateLabelHe:
      typeof d.crossSubjectRecommendationMemoryStateLabelHe === "string" ? d.crossSubjectRecommendationMemoryStateLabelHe : "",
    crossSubjectSupportHistoryDepth: typeof d.crossSubjectSupportHistoryDepth === "string" ? d.crossSubjectSupportHistoryDepth : "",
    crossSubjectSupportHistoryDepthLabelHe:
      typeof d.crossSubjectSupportHistoryDepthLabelHe === "string" ? d.crossSubjectSupportHistoryDepthLabelHe : "",
    crossSubjectExpectedVsObservedMatch:
      typeof d.crossSubjectExpectedVsObservedMatch === "string" ? d.crossSubjectExpectedVsObservedMatch : "",
    crossSubjectExpectedVsObservedMatchHe:
      typeof d.crossSubjectExpectedVsObservedMatchHe === "string" ? d.crossSubjectExpectedVsObservedMatchHe : "",
    crossSubjectContinuationDecision:
      typeof d.crossSubjectContinuationDecision === "string" ? d.crossSubjectContinuationDecision : "",
    crossSubjectContinuationDecisionHe:
      typeof d.crossSubjectContinuationDecisionHe === "string" ? d.crossSubjectContinuationDecisionHe : "",
    subjectsWithClearCarryoverHe: Array.isArray(d.subjectsWithClearCarryoverHe) ? d.subjectsWithClearCarryoverHe : [],
    subjectsNeedingFreshEvidenceHe: Array.isArray(d.subjectsNeedingFreshEvidenceHe) ? d.subjectsNeedingFreshEvidenceHe : [],
    subjectsWherePriorPathSeemsMisalignedHe: Array.isArray(d.subjectsWherePriorPathSeemsMisalignedHe)
      ? d.subjectsWherePriorPathSeemsMisalignedHe
      : [],
    crossSubjectGateState: typeof d.crossSubjectGateState === "string" ? d.crossSubjectGateState : "",
    crossSubjectGateStateLabelHe: typeof d.crossSubjectGateStateLabelHe === "string" ? d.crossSubjectGateStateLabelHe : "",
    crossSubjectNextCycleDecisionFocus:
      typeof d.crossSubjectNextCycleDecisionFocus === "string" ? d.crossSubjectNextCycleDecisionFocus : "",
    crossSubjectNextCycleDecisionFocusHe:
      typeof d.crossSubjectNextCycleDecisionFocusHe === "string" ? d.crossSubjectNextCycleDecisionFocusHe : "",
    crossSubjectEvidenceTargetType: typeof d.crossSubjectEvidenceTargetType === "string" ? d.crossSubjectEvidenceTargetType : "",
    crossSubjectEvidenceTargetTypeLabelHe:
      typeof d.crossSubjectEvidenceTargetTypeLabelHe === "string" ? d.crossSubjectEvidenceTargetTypeLabelHe : "",
    crossSubjectTargetObservationWindow:
      typeof d.crossSubjectTargetObservationWindow === "string" ? d.crossSubjectTargetObservationWindow : "",
    crossSubjectTargetObservationWindowLabelHe:
      typeof d.crossSubjectTargetObservationWindowLabelHe === "string" ? d.crossSubjectTargetObservationWindowLabelHe : "",
    subjectsNearReleaseButNotThereHe: Array.isArray(d.subjectsNearReleaseButNotThereHe)
      ? d.subjectsNearReleaseButNotThereHe
      : [],
    subjectsNeedingRecheckBeforeDecisionHe: Array.isArray(d.subjectsNeedingRecheckBeforeDecisionHe)
      ? d.subjectsNeedingRecheckBeforeDecisionHe
      : [],
    subjectsWithVisiblePivotTriggerHe: Array.isArray(d.subjectsWithVisiblePivotTriggerHe)
      ? d.subjectsWithVisiblePivotTriggerHe
      : [],
    crossSubjectDependencyState: typeof d.crossSubjectDependencyState === "string" ? d.crossSubjectDependencyState : "",
    crossSubjectDependencyStateLabelHe:
      typeof d.crossSubjectDependencyStateLabelHe === "string" ? d.crossSubjectDependencyStateLabelHe : "",
    crossSubjectLikelyFoundationalBlocker:
      typeof d.crossSubjectLikelyFoundationalBlocker === "string" ? d.crossSubjectLikelyFoundationalBlocker : "",
    crossSubjectLikelyFoundationalBlockerLabelHe:
      typeof d.crossSubjectLikelyFoundationalBlockerLabelHe === "string"
        ? d.crossSubjectLikelyFoundationalBlockerLabelHe
        : "",
    crossSubjectFoundationFirstPriority: !!d.crossSubjectFoundationFirstPriority,
    crossSubjectFoundationFirstPriorityHe:
      typeof d.crossSubjectFoundationFirstPriorityHe === "string" ? d.crossSubjectFoundationFirstPriorityHe : "",
    subjectsLikelyShowingDownstreamSymptomsHe: Array.isArray(d.subjectsLikelyShowingDownstreamSymptomsHe)
      ? d.subjectsLikelyShowingDownstreamSymptomsHe
      : [],
    subjectsNeedingFoundationFirstHe: Array.isArray(d.subjectsNeedingFoundationFirstHe)
      ? d.subjectsNeedingFoundationFirstHe
      : [],
    subjectsSafeForLocalInterventionHe: Array.isArray(d.subjectsSafeForLocalInterventionHe)
      ? d.subjectsSafeForLocalInterventionHe
      : [],
  };
  if (!suppressDeepCrossSubject) return normalized;
  return {
    ...normalized,
    majorDiagnosticCautionsHe: [],
    crossSubjectConclusionReadiness: "",
    recommendedParentPriorityType: "",
    topImmediateParentActionHe: "",
    secondPriorityActionHe: "",
    monitoringOnlyAreasHe: [],
    deferForNowAreasHe: [],
    dominantCrossSubjectMistakePattern: "",
    dominantCrossSubjectMistakePatternLabelHe: "",
    crossSubjectLearningStage: "",
    crossSubjectLearningStageLabelHe: "",
    crossSubjectRetentionRisk: "",
    crossSubjectTransferReadiness: "",
    reviewBeforeAdvanceAreasHe: [],
    transferReadyAreasHe: [],
    crossSubjectResponseToIntervention: "",
    crossSubjectResponseToInterventionLabelHe: "",
    crossSubjectSupportAdjustmentNeed: "",
    crossSubjectSupportAdjustmentNeedHe: "",
    crossSubjectConclusionFreshness: "",
    crossSubjectRecalibrationNeed: "",
    crossSubjectRecalibrationNeedHe: "",
    majorRecheckAreasHe: [],
    areasWhereSupportCanBeReducedHe: [],
    areasNeedingStrategyChangeHe: [],
    crossSubjectSupportSequenceState: "",
    crossSubjectSupportSequenceStateLabelHe: "",
    crossSubjectStrategyRepetitionRisk: "",
    crossSubjectStrategyFatigueRisk: "",
    crossSubjectNextBestSequenceStep: "",
    crossSubjectNextBestSequenceStepHe: "",
    subjectsReadyForReleaseHe: [],
    subjectsAtRiskOfSupportRepetitionHe: [],
    subjectsNeedingSupportResetHe: [],
    crossSubjectRecommendationMemoryState: "",
    crossSubjectRecommendationMemoryStateLabelHe: "",
    crossSubjectSupportHistoryDepth: "",
    crossSubjectSupportHistoryDepthLabelHe: "",
    crossSubjectExpectedVsObservedMatch: "",
    crossSubjectExpectedVsObservedMatchHe: "",
    crossSubjectContinuationDecision: "",
    crossSubjectContinuationDecisionHe: "",
    subjectsWithClearCarryoverHe: [],
    subjectsNeedingFreshEvidenceHe: [],
    subjectsWherePriorPathSeemsMisalignedHe: [],
    crossSubjectGateState: "",
    crossSubjectGateStateLabelHe: "",
    crossSubjectNextCycleDecisionFocus: "",
    crossSubjectNextCycleDecisionFocusHe: "",
    crossSubjectEvidenceTargetType: "",
    crossSubjectEvidenceTargetTypeLabelHe: "",
    crossSubjectTargetObservationWindow: "",
    crossSubjectTargetObservationWindowLabelHe: "",
    subjectsNearReleaseButNotThereHe: [],
    subjectsNeedingRecheckBeforeDecisionHe: [],
    subjectsWithVisiblePivotTriggerHe: [],
    crossSubjectDependencyState: "",
    crossSubjectDependencyStateLabelHe: "",
    crossSubjectLikelyFoundationalBlocker: "",
    crossSubjectLikelyFoundationalBlockerLabelHe: "",
    crossSubjectFoundationFirstPriority: false,
    crossSubjectFoundationFirstPriorityHe: "",
    subjectsLikelyShowingDownstreamSymptomsHe: [],
    subjectsNeedingFoundationFirstHe: [],
    subjectsSafeForLocalInterventionHe: [],
  };
}
