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
} from "./lpd-parent-facing-copy.js";
