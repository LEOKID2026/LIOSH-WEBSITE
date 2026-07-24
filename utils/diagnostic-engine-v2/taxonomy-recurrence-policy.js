import { TAXONOMY_BY_ID } from "./taxonomy-registry.js";

export const TAXONOMY_RECURRENCE_POLICY_VERSION = 1;

function familyForRow(row) {
  if (Number(row?.minDistinctDays) >= 2) {
    return "cross_day_recurrence";
  }
  if (Number(row?.minDistinctPatternFamilies) >= 2) {
    return "multi_pattern_cross_session";
  }
  return "standard_cross_session";
}

function buildPolicies() {
  const out = {};
  for (const [ruleId, row] of Object.entries(TAXONOMY_BY_ID)) {
    const family = familyForRow(row);
    out[ruleId] = Object.freeze({
      ruleId,
      family,
      minWrongEvents: Math.max(3, Number(row.minWrong) || 3),
      minSessionsForSubskill: 2,
      minDistinctDays:
        family === "cross_day_recurrence"
          ? Math.max(2, Number(row.minDistinctDays) || 2)
          : 1,
      minDistinctPatternFamilies: Math.max(
        1,
        Number(row.minDistinctPatternFamilies) || 1,
      ),
      recentActivityRequired: true,
      stalePatternBehavior: "topic_level_only",
      masteryCounterEvidenceBehavior: "block_subskill",
      strongCounterEvidenceBehavior: "block_subskill",
      sameSessionBehavior: "topic_level_only",
      basis:
        family === "cross_day_recurrence"
          ? "existing_taxonomy_minDistinctDays"
          : family === "multi_pattern_cross_session"
            ? "existing_taxonomy_minDistinctPatternFamilies_plus_cross_session_claim_definition"
            : "existing_minWrong_plus_cross_session_claim_definition",
    });
  }
  return Object.freeze(out);
}

export const TAXONOMY_RECURRENCE_POLICY = buildPolicies();

export function recurrencePolicyForRule(ruleId) {
  return TAXONOMY_RECURRENCE_POLICY[String(ruleId || "")] || null;
}
