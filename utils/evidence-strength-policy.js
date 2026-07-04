/**
 * Shared evidence-strength policy — pure volume tiers, subject-agnostic.
 *
 * Consumers: DE2 output-gating (internal trace label), LPD composition layer.
 * This module must NOT import DE2, parent-facing UI, or LPD decision logic.
 */
import {
  classifyParentEvidenceTier,
  PARENT_EVIDENCE_TIER,
} from "./parent-report-language/parent-evidence-matrix.js";

/**
 * @param {number} questionCount
 * @returns {"none"|"small_sample"|"emerging"|"supported"|"strong"}
 */
export function resolveEvidenceStrength(questionCount) {
  const q = Math.max(0, Math.floor(Number(questionCount) || 0));
  if (q === 0) return "none";
  if (q <= 4) return "small_sample";
  const tier = classifyParentEvidenceTier(q);
  if (tier === PARENT_EVIDENCE_TIER.preliminary) return "emerging";
  if (tier === PARENT_EVIDENCE_TIER.insight) return "supported";
  if (tier === PARENT_EVIDENCE_TIER.strong || tier === PARENT_EVIDENCE_TIER.high_volume) return "strong";
  return "small_sample";
}

/**
 * @param {"none"|"small_sample"|"emerging"|"supported"|"strong"} strength
 */
export function evidenceStrengthRank(strength) {
  const ranks = { none: 0, small_sample: 1, emerging: 2, supported: 3, strong: 4 };
  return ranks[String(strength)] ?? 0;
}
