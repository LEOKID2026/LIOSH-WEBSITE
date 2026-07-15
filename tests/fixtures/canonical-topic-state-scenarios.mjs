/**
 * 10 mandatory E2E test fixtures for CanonicalTopicState.
 * Each fixture defines inputs and expected canonical state outputs.
 */

const BASE_EVIDENCE = {
  wrongEventCount: 0,
  recurrenceFull: false,
  taxonomyMatch: true,
  dataSufficiencyLevel: "medium",
  confidence01: null,
  stableMastery: false,
  needsPractice: false,
  positiveAuthorityLevel: "none",
};

const BASE_DECISION_INPUTS = {
  priorityLevel: "P2",
  breadth: "narrow",
  counterEvidenceStrong: false,
  weakEvidence: false,
  hintInvalidates: false,
  narrowSample: false,
};

const BASE_CLASSIFICATION = {
  taxonomyId: "TAX_001",
  classificationState: "classified",
  classificationReasonCode: null,
};

export const SCENARIOS = [
  {
    id: "strong_stable_positive",
    description: "Strong stable positive - expand_cautiously",
    params: {
      subjectId: "math",
      topicKey: "addition",
      bucketKey: "addition",
      displayName: "חיבור",
      evidence: { ...BASE_EVIDENCE, questions: 25, correct: 24, wrong: 1, stableMastery: true, positiveAuthorityLevel: "excellent", recurrenceFull: false, taxonomyMatch: true },
      decisionInputs: { ...BASE_DECISION_INPUTS },
      classification: { ...BASE_CLASSIFICATION },
      confidenceLevel: "high",
    },
    expected: {
      actionState: "expand_cautiously",
      "recommendation.family": "expand_cautiously",
      "recommendation.allowed": true,
      "assessment.readiness": "ready",
      "assessment.cannotConcludeYet": false,
      "_deprecated_positiveConclusionAllowed": true,
    },
  },
  {
    id: "positive_insufficient_data",
    description: "Positive but insufficient data - withhold",
    params: {
      subjectId: "math",
      topicKey: "subtraction",
      bucketKey: "subtraction",
      displayName: "חיסור",
      evidence: { ...BASE_EVIDENCE, questions: 5, correct: 5, wrong: 0, stableMastery: true, positiveAuthorityLevel: "excellent" },
      decisionInputs: { ...BASE_DECISION_INPUTS },
      classification: { ...BASE_CLASSIFICATION },
      confidenceLevel: "insufficient_data",
    },
    expected: {
      actionState: "withhold",
      "recommendation.family": "withhold",
      "recommendation.allowed": false,
      "assessment.readiness": "insufficient",
      "assessment.cannotConcludeYet": true,
      "_deprecated_positiveConclusionAllowed": false,
    },
  },
  {
    id: "probe_only_taxonomy_mismatch",
    description: "Probe-only taxonomy-mismatch - probe_only",
    params: {
      subjectId: "math",
      topicKey: "multiplication",
      bucketKey: "multiplication",
      displayName: "כפל",
      evidence: { ...BASE_EVIDENCE, questions: 20, correct: 19, wrong: 1, taxonomyMatch: false, positiveAuthorityLevel: "excellent", stableMastery: true },
      decisionInputs: { ...BASE_DECISION_INPUTS },
      classification: { taxonomyId: null, classificationState: "unclassified_no_taxonomy_match", classificationReasonCode: "taxonomy_not_matched" },
      confidenceLevel: "low",
    },
    expected: {
      actionState: "probe_only",
      "recommendation.family": "probe_only",
      "recommendation.allowed": false,
      "assessment.cannotConcludeYet": false,
      "_deprecated_positiveConclusionAllowed": false,
    },
  },
  {
    id: "low_confidence",
    description: "Low-confidence topic - probe_only",
    params: {
      subjectId: "english",
      topicKey: "vocabulary",
      bucketKey: "vocabulary",
      displayName: "אוצר מילים",
      evidence: { ...BASE_EVIDENCE, questions: 8, correct: 5, wrong: 3, wrongEventCount: 3 },
      decisionInputs: { ...BASE_DECISION_INPUTS },
      classification: { ...BASE_CLASSIFICATION },
      confidenceLevel: "low",
    },
    expected: {
      actionState: "probe_only",
      "recommendation.family": "probe_only",
      "recommendation.allowed": false,
      "assessment.readiness": "insufficient",
      "_deprecated_positiveConclusionAllowed": false,
    },
  },
  {
    id: "true_support_remedial",
    description: "True support/remedial - intervene",
    params: {
      subjectId: "math",
      topicKey: "division",
      bucketKey: "division",
      displayName: "חילוק",
      evidence: { ...BASE_EVIDENCE, questions: 20, correct: 12, wrong: 8, wrongEventCount: 8, recurrenceFull: true, needsPractice: true },
      decisionInputs: { ...BASE_DECISION_INPUTS, priorityLevel: "P4" },
      classification: { ...BASE_CLASSIFICATION },
      confidenceLevel: "high",
    },
    expected: {
      actionState: "intervene",
      "recommendation.family": "intervene",
      "recommendation.allowed": true,
      "assessment.readiness": "ready",
      "assessment.cannotConcludeYet": false,
      "_deprecated_positiveConclusionAllowed": false,
    },
  },
  {
    id: "maintain_only",
    description: "Maintain-only - moderate confidence stable mastery",
    params: {
      subjectId: "math",
      topicKey: "fractions",
      bucketKey: "fractions",
      displayName: "שברים",
      evidence: { ...BASE_EVIDENCE, questions: 15, correct: 14, wrong: 1, stableMastery: true, positiveAuthorityLevel: "good", recurrenceFull: false, taxonomyMatch: true },
      decisionInputs: { ...BASE_DECISION_INPUTS },
      classification: { ...BASE_CLASSIFICATION },
      confidenceLevel: "moderate",
    },
    expected: {
      actionState: "maintain",
      "recommendation.family": "maintain",
      "recommendation.allowed": true,
      "assessment.readiness": "emerging",
      "_deprecated_positiveConclusionAllowed": true,
    },
  },
  {
    id: "expand_cautiously",
    description: "Expand-cautiously - high confidence, stable mastery, high volume",
    params: {
      subjectId: "math",
      topicKey: "decimals",
      bucketKey: "decimals",
      displayName: "עשרוניות",
      evidence: { ...BASE_EVIDENCE, questions: 25, correct: 24, wrong: 1, stableMastery: true, positiveAuthorityLevel: "excellent", recurrenceFull: false, taxonomyMatch: true },
      decisionInputs: { ...BASE_DECISION_INPUTS },
      classification: { ...BASE_CLASSIFICATION },
      confidenceLevel: "high",
    },
    expected: {
      actionState: "expand_cautiously",
      "recommendation.family": "expand_cautiously",
      "recommendation.allowed": true,
      "assessment.readiness": "ready",
      "_deprecated_positiveConclusionAllowed": true,
    },
  },
  {
    id: "empty_subject",
    description: "Empty subject - no units",
    params: null,
    expected: {
      stubOnly: true,
    },
  },
  {
    id: "same_topic_across_modes",
    description: "Same pedagogical topic across modes - collapsed to one canonical state",
    params: {
      subjectId: "math",
      topicKey: "addition",
      bucketKey: "addition",
      displayName: "חיבור",
      evidence: { ...BASE_EVIDENCE, questions: 30, correct: 29, wrong: 1, stableMastery: true, positiveAuthorityLevel: "excellent", recurrenceFull: false, taxonomyMatch: true },
      decisionInputs: { ...BASE_DECISION_INPUTS },
      classification: { ...BASE_CLASSIFICATION },
      confidenceLevel: "high",
    },
    expected: {
      actionState: "expand_cautiously",
      singleTopicStateId: true,
    },
  },
  {
    id: "reproduced_audit_contradiction",
    description: "Reproduced contradiction: stableMastery=true, T=false, C=low => MUST be probe_only",
    params: {
      subjectId: "math",
      topicKey: "multiplication",
      bucketKey: "multiplication",
      displayName: "כפל",
      evidence: { ...BASE_EVIDENCE, questions: 20, correct: 19, wrong: 1, stableMastery: true, positiveAuthorityLevel: "excellent", taxonomyMatch: false },
      decisionInputs: { ...BASE_DECISION_INPUTS },
      classification: { taxonomyId: null, classificationState: "unclassified_no_taxonomy_match", classificationReasonCode: "taxonomy_not_matched" },
      confidenceLevel: "low",
    },
    expected: {
      actionState: "probe_only",
      "recommendation.family": "probe_only",
      "recommendation.allowed": false,
      "_deprecated_positiveConclusionAllowed": false,
    },
  },
];
