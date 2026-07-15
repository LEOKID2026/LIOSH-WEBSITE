/**
 * Builder — constructs a frozen, immutable CanonicalTopicState from engine evidence and gating.
 */
import { createHash } from "crypto";
import { COMPOSITE_KEY_SEPARATOR, CLAIM_CLASSES } from "./schema.js";
import { evaluateDecisionTable } from "./decision-table.js";
import { validateCanonicalInvariants } from "./invariant-validator.js";

function deepFreeze(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  Object.freeze(obj);
  for (const val of Object.values(obj)) {
    if (val !== null && typeof val === "object" && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

function computeStateHash(state) {
  const payload = JSON.stringify(state, Object.keys(state).sort());
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

function deriveDecisionTier(actionState, readiness) {
  if (actionState === "withhold") return 0;
  if (actionState === "probe_only") return readiness === "forming" ? 1 : 0;
  if (actionState === "diagnose_only") return readiness === "ready" ? 3 : 2;
  if (actionState === "intervene") return readiness === "ready" ? 4 : 3;
  if (actionState === "maintain") return readiness === "ready" ? 3 : 2;
  if (actionState === "expand_cautiously") return readiness === "ready" ? 4 : 3;
  return 0;
}

function deriveAllowedClaimClass(decisionTier) {
  if (decisionTier <= 0) return "no_claim";
  if (decisionTier === 1) return "descriptive_observation";
  if (decisionTier === 2) return "gentle_pattern";
  if (decisionTier === 3) return "stable_pattern";
  return "actionable_guidance";
}

function deriveNarrativeConstraints(actionState, confidenceLevel, cannotConcludeYet) {
  const uncertaintyRequired =
    actionState === "withhold" ||
    actionState === "probe_only" ||
    confidenceLevel === "low" ||
    confidenceLevel === "early_signal_only" ||
    confidenceLevel === "insufficient_data" ||
    confidenceLevel === "contradictory" ||
    cannotConcludeYet;

  const allowedSections = [];
  const forbiddenPhrases = [];

  if (actionState === "withhold") {
    allowedSections.push("stub_only");
    forbiddenPhrases.push("נקודת חוזק", "שליטה מלאה", "מומלץ להרחיב");
  } else if (actionState === "probe_only") {
    allowedSections.push("observation", "uncertainty_note");
    forbiddenPhrases.push("שליטה מלאה", "מומלץ להרחיב", "מוכן להתקדם");
  } else if (actionState === "diagnose_only") {
    allowedSections.push("observation", "pattern_note", "uncertainty_note");
    forbiddenPhrases.push("שליטה מלאה");
  } else if (actionState === "intervene") {
    allowedSections.push("observation", "pattern_note", "action_recommendation");
  } else if (actionState === "maintain") {
    allowedSections.push("strength_note", "maintenance_action");
    forbiddenPhrases.push("קושי", "דורש תמיכה", "חולשה");
  } else if (actionState === "expand_cautiously") {
    allowedSections.push("strength_note", "expansion_action");
    forbiddenPhrases.push("קושי", "דורש תמיכה", "חולשה");
  }

  return { uncertaintyRequired, allowedSections, forbiddenPhrases };
}

function deriveRenderFlags(actionState) {
  return {
    showAsStrength: actionState === "maintain" || actionState === "expand_cautiously",
    showAsWeakness: actionState === "intervene" || actionState === "diagnose_only",
    showAsMonitoring: actionState === "probe_only" || actionState === "withhold",
    suppressActionText: actionState === "withhold",
  };
}

/**
 * @param {object} params
 * @param {string} params.subjectId
 * @param {string} params.topicKey
 * @param {string} params.bucketKey
 * @param {string} params.displayName
 * @param {object} params.evidence
 * @param {number} params.evidence.questions
 * @param {number} params.evidence.correct
 * @param {number} params.evidence.wrong
 * @param {number} params.evidence.wrongEventCount
 * @param {boolean} params.evidence.recurrenceFull
 * @param {boolean} params.evidence.taxonomyMatch
 * @param {string} params.evidence.dataSufficiencyLevel
 * @param {number|null} params.evidence.confidence01
 * @param {boolean} params.evidence.stableMastery
 * @param {boolean} params.evidence.needsPractice
 * @param {string} params.evidence.positiveAuthorityLevel
 * @param {object} params.decisionInputs
 * @param {string} params.decisionInputs.priorityLevel
 * @param {string} params.decisionInputs.breadth
 * @param {boolean} params.decisionInputs.counterEvidenceStrong
 * @param {boolean} params.decisionInputs.weakEvidence
 * @param {boolean} params.decisionInputs.hintInvalidates
 * @param {boolean} params.decisionInputs.narrowSample
 * @param {object} params.classification
 * @param {string|null} params.classification.taxonomyId
 * @param {string} params.classification.classificationState
 * @param {string|null} params.classification.classificationReasonCode
 * @param {string} params.confidenceLevel
 * @returns {import("./schema.js").CanonicalTopicState}
 */
export function buildCanonicalState(params) {
  const { subjectId, topicKey, bucketKey, displayName, evidence, decisionInputs, classification, confidenceLevel } = params;

  if (subjectId === "__unknown_subject__" || !subjectId) {
    throw new Error(`buildCanonicalState: subjectId is "${subjectId}" - must be a real subject identifier`);
  }
  if (topicKey === "__unknown_topic__" || !topicKey) {
    throw new Error(`buildCanonicalState: topicKey is "${topicKey}" - must be a real topic identifier`);
  }
  if (topicKey.includes(COMPOSITE_KEY_SEPARATOR)) {
    throw new Error(`buildCanonicalState: topicKey "${topicKey}" contains composite separator - must be collapsed before canonical state creation`);
  }

  const tableResult = evaluateDecisionTable({
    confidenceLevel,
    taxonomyMatch: evidence.taxonomyMatch,
    recurrenceFull: evidence.recurrenceFull,
    counterEvidenceStrong: decisionInputs.counterEvidenceStrong,
    weakEvidence: decisionInputs.weakEvidence,
    hintInvalidates: decisionInputs.hintInvalidates,
    stableMastery: evidence.stableMastery,
    questions: evidence.questions,
    accuracy: evidence.questions > 0 ? (evidence.correct / evidence.questions) * 100 : 0,
    priorityLevel: decisionInputs.priorityLevel,
  });

  const { actionState, readiness, cannotConcludeYet, recommendation, hardDenyReason, taxonomyMismatchReason } = tableResult;
  const decisionTier = deriveDecisionTier(actionState, readiness);
  const allowedClaimClass = deriveAllowedClaimClass(decisionTier);
  const narrativeConstraints = deriveNarrativeConstraints(actionState, confidenceLevel, cannotConcludeYet);
  const renderFlags = deriveRenderFlags(actionState);

  const topicStateId = `${subjectId}::${topicKey}`;

  const stateBody = {
    topicStateId,
    stateHash: "",
    subjectId,
    topicKey,
    bucketKey: bucketKey || topicKey,
    displayName: displayName || topicKey,
    evidence: {
      questions: evidence.questions,
      correct: evidence.correct,
      wrong: evidence.wrong,
      wrongEventCount: evidence.wrongEventCount,
      recurrenceFull: evidence.recurrenceFull,
      taxonomyMatch: evidence.taxonomyMatch,
      dataSufficiencyLevel: evidence.dataSufficiencyLevel || "low",
      confidence01: evidence.confidence01 ?? null,
      stableMastery: !!evidence.stableMastery,
      needsPractice: !!evidence.needsPractice,
      positiveAuthorityLevel: evidence.positiveAuthorityLevel || "none",
    },
    decisionInputs: {
      priorityLevel: decisionInputs.priorityLevel || "P1",
      breadth: decisionInputs.breadth || "narrow",
      counterEvidenceStrong: !!decisionInputs.counterEvidenceStrong,
      weakEvidence: !!decisionInputs.weakEvidence,
      hintInvalidates: !!decisionInputs.hintInvalidates,
      narrowSample: !!decisionInputs.narrowSample,
      hardDenyReason: hardDenyReason || null,
      taxonomyMismatchReason: taxonomyMismatchReason || null,
    },
    classification: {
      taxonomyId: classification.taxonomyId || null,
      classificationState: classification.classificationState || "unclassified_no_taxonomy_match",
      classificationReasonCode: classification.classificationReasonCode || null,
    },
    assessment: {
      confidenceLevel,
      readiness,
      decisionTier,
      cannotConcludeYet,
      allowedClaimClass,
    },
    actionState,
    recommendation: {
      family: actionState,
      allowed: recommendation.allowed,
      intensityCap: recommendation.intensityCap,
      reasonCodes: recommendation.reasonCodes,
    },
    narrativeConstraints,
    renderFlags,
    _deprecated_positiveConclusionAllowed: actionState === "maintain" || actionState === "expand_cautiously",
  };

  stateBody.stateHash = computeStateHash(stateBody);

  validateCanonicalInvariants(stateBody);

  deepFreeze(stateBody);

  return stateBody;
}
