/**
 * blockedClaims from canonicalState + topic finding — overclaim protection.
 */
import { isUsableParentPatternLabel } from "./parent-pattern-label.js";

/**
 * @param {object} p
 * @param {string} p.topicStatus
 * @param {string} p.findingType
 * @param {string} p.evidenceStrength
 * @param {boolean} p.canUseRepeatedWording
 * @param {object|null} [p.canonicalState]
 * @param {boolean} [p.competitiveBucketOnly]
 * @param {string|null} [p.engineDetectedPattern]
 */
export function resolveBlockedClaims({
  topicStatus,
  findingType,
  evidenceStrength,
  canUseRepeatedWording,
  canonicalState = null,
  competitiveBucketOnly = false,
  engineDetectedPattern = null,
}) {
  /** @type {Set<string>} */
  const blocked = new Set();

  blocked.add("no_root_cause_claim");
  blocked.add("no_long_term_claim");

  if (evidenceStrength !== "strong") {
    blocked.add("no_final_claim");
  }

  if (findingType === "success_pattern" || topicStatus.startsWith("positive")) {
    blocked.add("no_long_term_mastery_claim");
    blocked.add("no_final_claim");
  }

  if (
    (topicStatus === "difficulty_observed" ||
      topicStatus === "practice_focus" ||
      findingType === "practice_focus") &&
    !isUsableParentPatternLabel(String(engineDetectedPattern || ""))
  ) {
    blocked.add("no_specific_pattern_claim");
  }

  if (!canUseRepeatedWording) {
    blocked.add("no_repeated_wording");
  }

  if (topicStatus === "initial_data" || findingType === "initial_topic_data") {
    blocked.add("no_final_claim");
    blocked.add("no_specific_pattern_claim");
    blocked.add("no_repeated_wording");
    blocked.add("no_long_term_mastery_claim");
  }

  if (competitiveBucketOnly) {
    blocked.add("no_cross_context_merge");
  }

  const action = canonicalState?.actionState;
  if (action?.withholdParentClaim === true) {
    blocked.add("no_final_claim");
  }
  if (Array.isArray(action?.blockedClaimKeys)) {
    for (const k of action.blockedClaimKeys) blocked.add(String(k));
  }

  return [...blocked];
}
