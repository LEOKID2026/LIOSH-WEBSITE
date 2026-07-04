/**
 * Re-export shared evidence-strength policy (see utils/evidence-strength-policy.js).
 * LPD and DE2 both consume the same pure volume tiers — not a DE2→UI dependency.
 */
export { resolveEvidenceStrength, evidenceStrengthRank } from "../evidence-strength-policy.js";
