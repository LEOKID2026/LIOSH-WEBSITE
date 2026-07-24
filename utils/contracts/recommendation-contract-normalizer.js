const RI_RANK = Object.freeze({ RI0: 0, RI1: 1, RI2: 2, RI3: 3 });
const RI_FROM_RANK = Object.freeze(["RI0", "RI1", "RI2", "RI3"]);
const STEP_CAP = Object.freeze({
  maintain_current_path: "RI0",
  watch: "RI0",
  maintain_and_strengthen: "RI1",
  remediate_same_level: "RI2",
  advance_level: "RI3",
  advance_grade_topic_only: "RI3",
  drop_one_level_topic_only: "RI2",
  drop_one_grade_topic_only: "RI2",
});

function intensityRank(value) {
  const rank = RI_RANK[String(value || "")];
  return Number.isFinite(rank) ? rank : 0;
}

/**
 * @param {unknown} value
 */
export function isAuthoritativeRecommendationOverride(value) {
  return !!(
    value &&
    typeof value === "object" &&
    value.source === "canonicalState" &&
    value.allowed === true &&
    typeof value.reasonCode === "string" &&
    value.reasonCode.trim() &&
    Object.hasOwn(RI_RANK, String(value.intensityCap || ""))
  );
}

/**
 * P0 invariant: forbidden recommendations are never eligible unless canonical state
 * explicitly records an authoritative override and reason code.
 * @param {object|null|undefined} contract
 */
export function recommendationEligibilityInvariantHolds(contract) {
  if (!contract || typeof contract !== "object") return true;
  const forbidden = Array.isArray(contract.forbiddenBecause)
    ? contract.forbiddenBecause.filter(Boolean)
    : [];
  if (forbidden.length === 0 || contract.eligible !== true) return true;
  return isAuthoritativeRecommendationOverride(contract.authorityOverride);
}

/**
 * Phase 6 P0: step may only cap an existing recommendation. It cannot promote
 * intensity or eligibility without an explicit canonical-state override.
 * @param {object|null|undefined} contract
 * @param {string} decisionStep
 * @param {{ authoritativeOverride?: object|null }} [options]
 */
export function normalizeRecommendationContract(contract, decisionStep, options = {}) {
  if (!contract || typeof contract !== "object") {
    return contract;
  }

  const step = String(decisionStep || "maintain_and_strengthen");
  const out = { ...contract };
  const currentRank = intensityRank(contract.intensity);
  const stepCap = STEP_CAP[step] || "RI0";
  const stepCapRank = intensityRank(stepCap);
  const override = options?.authoritativeOverride;
  const validOverride = isAuthoritativeRecommendationOverride(override);
  const forbidden = Array.isArray(contract.forbiddenBecause)
    ? contract.forbiddenBecause.filter(Boolean)
    : [];

  let nextRank = Math.min(currentRank, stepCapRank);
  let eligible = contract.eligible === true && nextRank > 0;

  if (validOverride) {
    const overrideCapRank = intensityRank(override.intensityCap);
    nextRank = Math.min(stepCapRank, overrideCapRank);
    eligible = nextRank > 0;
    out.authorityOverride = {
      source: "canonicalState",
      allowed: true,
      intensityCap: RI_FROM_RANK[overrideCapRank],
      reasonCode: override.reasonCode.trim(),
    };
  } else if (forbidden.length > 0 || contract.eligible !== true) {
    nextRank = 0;
    eligible = false;
    delete out.authorityOverride;
  }

  out.intensity = RI_FROM_RANK[nextRank];
  out.eligible = eligible;

  if (!eligible) {
    out.family = null;
  } else if (out.family == null || out.family === undefined) {
    out.family = "general_practice";
  }

  // The normalizer enforces the invariant rather than throwing in production.
  if (!recommendationEligibilityInvariantHolds(out)) {
    out.intensity = "RI0";
    out.eligible = false;
    out.family = null;
    delete out.authorityOverride;
  }

  return out;
}
