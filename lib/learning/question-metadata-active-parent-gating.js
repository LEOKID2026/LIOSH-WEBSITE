/**
 * Q2-E.5-B — Active parent gating trial (conservative suppression only).
 * Uses E.5-A shadow candidates; promotion remains shadow-only.
 */

export const APPLIED_PARENT_GATING_VERSION = "q2-e-5b-active-v1";

/** Mirrors evidence-quality DATA_SUFFICIENCY (local to avoid circular import). */
const DATA_SUFFICIENCY = Object.freeze({
  PRELIMINARY: "preliminary_signal",
  SUPPORTED: "supported_diagnosis",
});

/**
 * @param {unknown} v
 */
function pickStr(v) {
  if (v == null || v === "") return "";
  return String(v).trim();
}

/**
 * @param {Record<string, object>|undefined} bySubSkill
 * @param {string} topicKey
 */
function hasHighConfidenceSubSkillRecurrenceForTopic(bySubSkill, topicKey) {
  if (!bySubSkill || typeof bySubSkill !== "object") return false;
  const parts = topicKey.split("::");
  const subject = parts[0] || "";
  const topic = parts[1] || "";
  return Object.values(bySubSkill).some((row) => {
    if (!row || typeof row !== "object") return false;
    return (
      row.subject === subject &&
      row.topic === topic &&
      row.groupingLevel === "subSkill" &&
      row.metadataConfidenceCap === "high" &&
      row.isMetadataWeak !== true &&
      row.recurrence?.met === true
    );
  });
}

/**
 * @param {Record<string, object>|undefined} errorPatterns
 * @param {string} topicKey
 */
function hasStrongErrorPatternForTopic(errorPatterns, topicKey) {
  if (!errorPatterns || typeof errorPatterns !== "object") return false;
  const parts = topicKey.split("::");
  const subject = parts[0] || "";
  const topic = parts[1] || "";
  return Object.values(errorPatterns).some((row) => {
    if (!row || typeof row !== "object") return false;
    return (
      row.subject === subject &&
      row.topic === topic &&
      row.recurrenceMet === true &&
      row.metadataConfidenceCap === "high" &&
      row.isMetadataWeak !== true
    );
  });
}

/**
 * @param {string} suff
 */
function q1AllowsStrongDiagnosis(suff) {
  return suff === DATA_SUFFICIENCY.PRELIMINARY || suff === DATA_SUFFICIENCY.SUPPORTED;
}

/**
 * Conservative suppression from E.5-A shadow candidates.
 *
 * @param {{
 *   shadowParentGating: Record<string, unknown>,
 *   internal: Record<string, unknown>,
 *   publicView: Record<string, unknown>,
 * }} input
 * @returns {{ appliedParentGating: Record<string, unknown>, gatingDecisions: Array<Record<string, unknown>> }}
 */
export function applyActiveParentGating({ shadowParentGating, internal, publicView }) {
  const bySubSkill =
    internal.bySubSkill && typeof internal.bySubSkill === "object" ? internal.bySubSkill : {};
  const errorPatterns =
    internal.errorPatterns && typeof internal.errorPatterns === "object"
      ? internal.errorPatterns
      : {};

  const shadowSuppression = Array.isArray(shadowParentGating.shadowSuppressionCandidates)
    ? shadowParentGating.shadowSuppressionCandidates
    : [];
  const shadowPromotion = Array.isArray(shadowParentGating.shadowPromotionCandidates)
    ? shadowParentGating.shadowPromotionCandidates
    : [];

  /** @type {Array<Record<string, unknown>>} */
  const gatingDecisions = [];
  /** @type {string[]} */
  const suppressedTopicKeys = [];
  /** @type {Array<Record<string, unknown>>} */
  const skippedCandidates = [];

  for (const candidate of shadowSuppression) {
    if (!candidate || typeof candidate !== "object") continue;
    if (candidate.scope !== "topic") continue;

    const topicKey = pickStr(candidate.topicKey);
    if (!topicKey) continue;

    const publicTopic = publicView?.byTopic?.[topicKey];
    const q1Suff =
      pickStr(publicTopic?.dataSufficiency) || pickStr(candidate.q1DataSufficiency);
    if (!q1AllowsStrongDiagnosis(q1Suff)) {
      skippedCandidates.push({
        topicKey,
        skipReason: "q1_does_not_allow_strong_diagnosis",
      });
      continue;
    }

    if (hasHighConfidenceSubSkillRecurrenceForTopic(bySubSkill, topicKey)) {
      skippedCandidates.push({
        topicKey,
        skipReason: "high_confidence_subskill_recurrence_supports_diagnosis",
      });
      continue;
    }

    if (hasStrongErrorPatternForTopic(errorPatterns, topicKey)) {
      skippedCandidates.push({
        topicKey,
        skipReason: "strong_error_pattern_supports_diagnosis",
      });
      continue;
    }

    gatingDecisions.push({
      scope: "topic",
      topicKey,
      subject: candidate.subject || topicKey.split("::")[0] || null,
      topic: candidate.topic || topicKey.split("::")[1] || null,
      action: "suppress_strong_diagnosis",
      reason: pickStr(candidate.reason) || "metadata_weak_suppression",
      q1DataSufficiency: q1Suff,
      source: "e5b_conservative_suppression",
      shadowAction: candidate.shadowAction || null,
    });
    suppressedTopicKeys.push(topicKey);
  }

  const appliedParentGating = {
    version: APPLIED_PARENT_GATING_VERSION,
    active: true,
    policy: "conservative_suppression_only",
    suppressionApplied: gatingDecisions.length,
    promotionApplied: 0,
    promotionRetainedShadowOnly: shadowPromotion.length,
    suppressedTopicKeys,
    skippedCandidates,
    shadowVersion: shadowParentGating.version || null,
  };

  return { appliedParentGating, gatingDecisions };
}

/**
 * @param {Array<Record<string, unknown>>|undefined} gatingDecisions
 * @param {string} subject
 * @param {string} topicKey
 */
export function isTopicStrongDiagnosisSuppressedByGating(
  gatingDecisions,
  subject,
  topicKey
) {
  if (!Array.isArray(gatingDecisions) || gatingDecisions.length === 0) return false;
  const scopeKey = `${subject}::${topicKey}`;
  return gatingDecisions.some(
    (d) =>
      d?.scope === "topic" &&
      d?.topicKey === scopeKey &&
      d?.action === "suppress_strong_diagnosis"
  );
}
