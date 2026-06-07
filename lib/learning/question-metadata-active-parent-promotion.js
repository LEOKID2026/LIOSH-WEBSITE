/**
 * Q2-E.5-C2 — Active parent promotion trial (conservative, validated candidates only).
 */

export const APPLIED_PARENT_PROMOTION_VERSION = "q2-e-5c2-active-v1";

const DATA_SUFFICIENCY = Object.freeze({
  PRELIMINARY: "preliminary_signal",
});

const ALLOWED_VALIDATION_REASONS = Object.freeze([
  "high_confidence_subskill_recurrence",
  "high_confidence_error_pattern_recurrence",
]);

/** @type {Record<string, number>} */
const EFFECTIVE_RANK = Object.freeze({
  insufficient_data: 0,
  low: 1,
  moderate: 2,
  high: 3,
});

/**
 * @param {unknown} v
 */
function pickStr(v) {
  if (v == null || v === "") return "";
  return String(v).trim();
}

/**
 * @param {unknown} level
 */
function effectiveAtLeastModerate(level) {
  const rank = EFFECTIVE_RANK[pickStr(level)] ?? 0;
  return rank >= EFFECTIVE_RANK.moderate;
}

/**
 * @param {Record<string, unknown>|undefined} publicView
 * @param {string} topicKey
 */
function topicIsPreliminary(publicView, topicKey) {
  return pickStr(publicView?.byTopic?.[topicKey]?.dataSufficiency) === DATA_SUFFICIENCY.PRELIMINARY;
}

/**
 * @param {Record<string, object>|undefined} bySubSkill
 * @param {string} groupKey
 */
function subSkillGroup(bySubSkill, groupKey) {
  if (!bySubSkill || !groupKey) return null;
  const row = bySubSkill[groupKey];
  return row && typeof row === "object" ? row : null;
}

/**
 * @param {Record<string, unknown>} candidate
 * @param {Record<string, unknown>} internal
 * @param {Record<string, unknown>} publicView
 */
function passesC2PromotionPolicy(candidate, internal, publicView) {
  if (candidate.validationOutcome !== "validated") {
    return { pass: false, reason: "candidate_not_validated_by_c1" };
  }

  const validationReason = pickStr(candidate.validationReason);
  if (!ALLOWED_VALIDATION_REASONS.includes(validationReason)) {
    return { pass: false, reason: "validation_reason_not_allowed_for_c2" };
  }

  const topicKey = pickStr(candidate.topicKey);
  const patternKey = pickStr(candidate.patternKey);
  const bySubSkill =
    internal.bySubSkill && typeof internal.bySubSkill === "object" ? internal.bySubSkill : {};
  const errorPatterns =
    internal.errorPatterns && typeof internal.errorPatterns === "object"
      ? internal.errorPatterns
      : {};

  if (validationReason === "high_confidence_subskill_recurrence") {
    if (!topicKey || !topicIsPreliminary(publicView, topicKey)) {
      return { pass: false, reason: "q1_topic_not_preliminary" };
    }
    const groupKey = pickStr(candidate.metadataSignals?.subSkillGroupKey);
    const group = subSkillGroup(bySubSkill, groupKey);
    if (!group) return { pass: false, reason: "missing_subskill_group" };
    if (group.isMetadataWeak === true) return { pass: false, reason: "metadata_weak" };
    if (group.groupingLevel === "topic") return { pass: false, reason: "topic_only_metadata_rollup" };
    if (pickStr(group.metadataConfidenceCap) !== "high") {
      return { pass: false, reason: "metadata_confidence_cap_not_high" };
    }
    if (!effectiveAtLeastModerate(group.effectiveConfidenceLevel)) {
      return { pass: false, reason: "effective_confidence_below_moderate" };
    }
    if (group.recurrence?.met !== true) {
      return { pass: false, reason: "single_day_or_insufficient_recurrence" };
    }
    return { pass: true, reason: validationReason };
  }

  if (validationReason === "high_confidence_error_pattern_recurrence") {
    const row = errorPatterns[patternKey];
    if (!row || typeof row !== "object") {
      return { pass: false, reason: "missing_error_pattern_row" };
    }
    const patternTopicKey = `${pickStr(row.subject)}::${pickStr(row.topic)}`;
    if (!topicIsPreliminary(publicView, patternTopicKey)) {
      return { pass: false, reason: "q1_topic_not_preliminary" };
    }
    if (!pickStr(row.pattern)) return { pass: false, reason: "missing_possible_error_patterns" };
    if (row.recurrenceMet !== true) {
      return { pass: false, reason: "single_day_or_insufficient_recurrence" };
    }
    if (row.isMetadataWeak === true) return { pass: false, reason: "metadata_weak" };
    if (pickStr(row.metadataConfidenceCap) !== "high") {
      return { pass: false, reason: "metadata_confidence_cap_not_high" };
    }
    if (!effectiveAtLeastModerate(row.effectiveConfidenceLevel)) {
      return { pass: false, reason: "effective_confidence_below_moderate" };
    }
    return { pass: true, reason: validationReason };
  }

  return { pass: false, reason: "unknown_validation_reason" };
}

/**
 * @param {{
 *   validatedPromotionCandidates: Array<Record<string, unknown>>,
 *   internal: Record<string, unknown>,
 *   publicView: Record<string, unknown>,
 * }} input
 */
export function applyActiveParentPromotion({ validatedPromotionCandidates, internal, publicView }) {
  const candidates = Array.isArray(validatedPromotionCandidates)
    ? validatedPromotionCandidates
    : [];

  /** @type {Array<Record<string, unknown>>} */
  const promotionDecisions = [];
  /** @type {Array<Record<string, unknown>>} */
  const skippedCandidates = [];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const policy = passesC2PromotionPolicy(candidate, internal, publicView);
    if (!policy.pass) {
      skippedCandidates.push({
        candidateKey: pickStr(candidate.topicKey) || pickStr(candidate.patternKey) || "unknown",
        skipReason: policy.reason,
        validationReason: candidate.validationReason || null,
      });
      continue;
    }

    const topicKey = pickStr(candidate.topicKey);
    const isErrorPattern = candidate.scope === "errorPattern";
    promotionDecisions.push({
      scope: isErrorPattern ? "errorPattern" : "topic",
      topicKey: isErrorPattern
        ? `${pickStr(candidate.subject)}::${pickStr(candidate.topic)}`
        : topicKey,
      patternKey: isErrorPattern ? pickStr(candidate.patternKey) : null,
      subject: candidate.subject || topicKey.split("::")[0] || null,
      topic: candidate.topic || topicKey.split("::")[1] || null,
      action: "allow_strong_diagnosis",
      validationReason: policy.reason,
      source: "e5c2_conservative_promotion",
      shadowReason: candidate.reason || null,
    });
  }

  const appliedParentPromotion = {
    version: APPLIED_PARENT_PROMOTION_VERSION,
    active: true,
    policy: "validated_preliminary_promotion_only",
    promotionApplied: promotionDecisions.length,
    skippedCandidates,
    promotedTopicKeys: promotionDecisions
      .filter((d) => d.scope === "topic")
      .map((d) => d.topicKey)
      .filter(Boolean),
    promotedPatternKeys: promotionDecisions
      .filter((d) => d.scope === "errorPattern")
      .map((d) => d.patternKey)
      .filter(Boolean),
  };

  return { appliedParentPromotion, promotionDecisions };
}

/**
 * @param {Array<Record<string, unknown>>|undefined} promotionDecisions
 * @param {string} subject
 * @param {string} topicKey
 */
export function hasTopicPromotionDecision(promotionDecisions, subject, topicKey) {
  if (!Array.isArray(promotionDecisions) || promotionDecisions.length === 0) return false;
  const scopeKey = `${subject}::${topicKey}`;
  return promotionDecisions.some(
    (d) =>
      d?.scope === "topic" &&
      d?.topicKey === scopeKey &&
      d?.action === "allow_strong_diagnosis"
  );
}

/**
 * @param {Array<Record<string, unknown>>|undefined} promotionDecisions
 */
export function hasErrorPatternPromotionDecision(promotionDecisions) {
  if (!Array.isArray(promotionDecisions) || promotionDecisions.length === 0) return false;
  return promotionDecisions.some(
    (d) => d?.scope === "errorPattern" && d?.action === "allow_strong_diagnosis"
  );
}
