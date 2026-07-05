export {
  normalizeParentVisibleMetrics,
  normalizeParentPracticeMetrics,
  buildParentMetricsDataLineHe,
  parentVisibleMetricsContradiction,
  isForbiddenZeroCorrectAllWrongCopy,
  lpdFindingNeedsRebuild,
} from "./normalize-parent-practice-metrics.js";
export { emptyLearningPatternDecision, BLOCKED_CLAIM_KEYS } from "./schema.js";
export { resolveEvidenceStrength, evidenceStrengthRank } from "./resolve-evidence-strength.js";
export {
  resolveObservedPatternLevel,
  resolveRepeatedMistakePatterns,
} from "./resolve-observed-pattern-level.js";
export { resolveTopicFinding } from "./resolve-topic-finding.js";
export { resolveBlockedClaims } from "./resolve-blocked-claims.js";
export {
  buildParentVisibleFinding,
  findForbiddenParentWords,
  FORBIDDEN_PARENT_WORDS,
} from "./build-parent-visible-finding.js";
export { partitionPatternEligibleMistakes } from "./resolve-excluded-evidence.js";
export { buildLearningPatternDecision } from "./build-learning-pattern-decision.js";
export {
  buildParentReportEngineDecisionContract,
  mapEngineRecommendedAction,
  resolveEngineDecisionUncertaintyText,
  injectEnginePatternIntoRepeatedMistakes,
  findStrongestEngineDecisionInSubject,
  buildSubjectEngineSummaryOpeningHe,
} from "./build-parent-report-engine-decision-contract.js";
export {
  buildSubjectEngineDecisionContract,
  buildSubjectEngineDecisionContractFromTopicMap,
  resolveSubjectSummaryTextFromEngineContract,
  resolveSubjectLetterOwnerCopyHe,
  findTopicRecommendationForPriority,
} from "./build-subject-engine-decision-contract.js";
export {
  resolveSubjectOwnerCopyFromContract,
  buildSubjectOwnerCopySlots,
  renderOwnerSubjectCopyTemplateHe,
  parentReportOwnerCopyTemplatesHe,
  SUBJECT_OWNER_COPY_TEMPLATE_IDS,
} from "../parent-report-language/parent-report-owner-copy-templates-he.js";
export {
  buildTopicOwnerCopySlots,
  resolveTopicOwnerBaseTemplateId,
  resolveTopicOwnerCopyHe,
  resolveTopicExplainOwnerSectionsHe,
  resolveTopicRecommendationOwnerCopyHe,
  resolveNarrativeOwnerCopyHe,
  resolveTopicPrimaryFindingOwnerCopyHe,
} from "./resolve-topic-owner-copy.js";
export {
  EDC_CONTRACT_KEY,
  EDC_DECISION_FIELD,
  SP_SUBJECT_ENGINE_CONTRACT,
  RENDER_SOURCE_SUBJECT_ENGINE,
  ED_CLEAR_TOPIC_GAP,
  ED_TOPIC_NEEDS_STRENGTHENING,
  ED_PARTIAL_STABLE,
  ED_EARLY_DIRECTION_ONLY,
  ED_INSUFFICIENT_DATA,
  ED_NONE,
  ED_MASTERY_STABLE,
  RA_REMEDIATE_SAME_LEVEL,
  RA_REMEDIATE_STEP_DOWN,
  RA_WATCH,
  RA_MAINTAIN_AND_STRENGTHEN,
  RA_MAINTAIN,
  RA_INTERVENE,
  ES_STRONG,
  ES_SUPPORTED,
  ES_EMERGING,
  ES_NONE,
  ENGINE_DECISION_RANK,
  REMEDIATE_ACTION_CODES,
  readTopicEngineContract,
  readEngineDecisionCode,
  readSubjectEngineContract,
} from "./engine-decision-codes.js";
export { restoreLearningPatternDecisionsFromUnits } from "./restore-learning-pattern-on-topic-maps.js";
export {
  applyLearningPatternDecisionToUnitsAndRows,
  isPracticedTopicWithParentFinding,
  rowNeedsPracticeFromLpd,
  rowIsPositiveFromLpd,
} from "./apply-learning-pattern-decision.js";
export { traceRowConflictReport } from "./trace-row-conflict-report.js";
export {
  buildTopicRollupsFromLearningPatternDecision,
  syncRowFlagsFromLearningPatternDecision,
  topicUiFromLearningPatternDecision,
} from "./parent-report-ui-helpers.js";
export {
  compareShortDetailedLearningPatternFindings,
  learningPatternDecisionsMatch,
} from "./compare-short-detailed-findings.js";
export { auditLearningPatternDecisionReport } from "./audit-report.js";
export { projectHistorySubtopicLearningPatternDecisions } from "./project-history-subtopic-lpd.js";
export {
  getLpdFromRow,
  guardParentFacingText,
  lpdParentVisibleFindingFromRow,
  shouldSuppressLegacyEngineParentCopy,
  buildLpdParentInsightLineHe,
  buildLpdSafeTopicInsightLineHe,
  buildLpdSafeTopicInsightFromWeakTopic,
  rawMistakesForTopicFromPayload,
  resolveOrBuildLpdOnRow,
  lpdHasParentTopicInsight,
  LEGACY_TOPIC_ATTENTION_INSIGHT_DISABLED,
  resolveParentExplainRowCopy,
  buildLpdSafeTopicExplainSectionsHe,
} from "./lpd-parent-facing-copy.js";
