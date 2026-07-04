/**
 * learningPatternDecision — parent-facing composition contract (subject-agnostic).
 */

/** @typedef {"none"|"observed"|"repeated"|"consistent"|"strong"} ObservedPatternLevel */
/** @typedef {"none"|"small_sample"|"emerging"|"supported"|"strong"} EvidenceStrength */
/** @typedef {"not_practiced"|"initial_data"|"no_clear_pattern"|"positive_observed"|"positive_repeated"|"difficulty_observed"|"difficulty_repeated"|"practice_focus"|"mixed"} TopicStatus */
/** @typedef {"none"|"initial_topic_data"|"success_pattern"|"difficulty_pattern"|"mixed_pattern"|"practice_focus"} FindingType */
/** @typedef {"no_parent_text"|"factual_observation"|"pattern_observed"|"repeated_pattern"|"strong_pattern"} ParentWordingLevel */

export const OBSERVED_PATTERN_LEVELS = Object.freeze([
  "none",
  "observed",
  "repeated",
  "consistent",
  "strong",
]);

export const EVIDENCE_STRENGTHS = Object.freeze([
  "none",
  "small_sample",
  "emerging",
  "supported",
  "strong",
]);

export const TOPIC_STATUSES = Object.freeze([
  "not_practiced",
  "initial_data",
  "no_clear_pattern",
  "positive_observed",
  "positive_repeated",
  "difficulty_observed",
  "difficulty_repeated",
  "practice_focus",
  "mixed",
]);

export const FINDING_TYPES = Object.freeze([
  "none",
  "initial_topic_data",
  "success_pattern",
  "difficulty_pattern",
  "mixed_pattern",
  "practice_focus",
]);

export const PARENT_WORDING_LEVELS = Object.freeze([
  "no_parent_text",
  "factual_observation",
  "pattern_observed",
  "repeated_pattern",
  "strong_pattern",
]);

export const BLOCKED_CLAIM_KEYS = Object.freeze([
  "no_final_claim",
  "no_root_cause_claim",
  "no_long_term_claim",
  "no_long_term_mastery_claim",
  "no_cross_topic_claim",
  "no_learning_mode_evidence",
  "no_specific_pattern_claim",
  "no_repeated_wording",
  "no_cross_context_merge",
]);

/**
 * @returns {import("./schema.js").LearningPatternDecisionShape}
 */
export function emptyLearningPatternDecision(subjectId, topicKey) {
  return {
    subjectId: String(subjectId || ""),
    topicKey: String(topicKey || ""),
    practicedQuestions: 0,
    correctCount: 0,
    wrongCount: 0,
    accuracy: 0,
    observedPatternLevel: "none",
    evidenceStrength: "none",
    topicStatus: "not_practiced",
    findingType: "none",
    detectedPatterns: [],
    positivePatterns: [],
    repeatedMistakePatterns: [],
    recommendedFocus: null,
    parentVisibleFinding: "",
    parentWordingLevel: "no_parent_text",
    blockedClaims: [],
    excludedEvidence: [],
    sourceEngines: [],
    competitiveBucketOnly: false,
    enrichmentMissing: [],
    trace: [],
  };
}

/** @typedef {ReturnType<typeof emptyLearningPatternDecision>} LearningPatternDecisionShape */
