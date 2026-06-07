/**
 * Q2-E.5-C1 — Shadow promotion candidate validation (internal only, no active promotion).
 */

export const PROMOTION_VALIDATION_VERSION = "q2-e-5c1-shadow-v1";

const DATA_SUFFICIENCY = Object.freeze({
  NO_DATA: "no_data",
  INSUFFICIENT: "insufficient_data",
  PRELIMINARY: "preliminary_signal",
  SUPPORTED: "supported_diagnosis",
});

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
 * @param {unknown} v
 */
function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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
function topicPreliminaryOnly(publicView, topicKey) {
  const suff = pickStr(publicView?.byTopic?.[topicKey]?.dataSufficiency);
  return suff === DATA_SUFFICIENCY.PRELIMINARY;
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
 * @param {Record<string, object>|undefined} questionTypes
 * @param {string} subject
 * @param {string} topic
 */
function typesForTopic(questionTypes, subject, topic) {
  if (!questionTypes) return [];
  return Object.values(questionTypes).filter(
    (row) => row?.subject === subject && row?.topic === topic
  );
}

/**
 * @param {Array<Record<string, unknown>>} types
 */
function isUnclassifiedDominant(types) {
  if (types.length === 0) return false;
  const unclassified = types.filter((t) => t.isUnclassified === true).length;
  return unclassified / types.length >= 0.5;
}

/**
 * @param {Record<string, unknown>} group
 */
function groupPassesMetadataQuality(group) {
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
  return { pass: true, reason: "subskill_recurrence_quality_met" };
}

/**
 * @param {Record<string, unknown>} group
 * @param {string} questionType
 */
function hasConflictingPositiveInGroup(group, questionType) {
  const breakdown =
    group.questionTypeBreakdown && typeof group.questionTypeBreakdown === "object"
      ? group.questionTypeBreakdown
      : null;
  if (!breakdown || !questionType) return false;
  const row = breakdown[questionType];
  if (!row || typeof row !== "object") return false;
  return (
    safeNum(row.diagnosticWrong) === 0 &&
    safeNum(row.diagnosticAnswers) >= 3 &&
    row.isMetadataWeak !== true
  );
}

/**
 * @param {Record<string, object>|undefined} bySubSkill
 * @param {string} topicKey
 * @param {string|null} excludeGroupKey
 */
function hasConflictingPositiveSubSkillInTopic(bySubSkill, topicKey, excludeGroupKey) {
  if (!bySubSkill) return false;
  const parts = topicKey.split("::");
  const subject = parts[0] || "";
  const topic = parts[1] || "";
  return Object.entries(bySubSkill).some(([key, row]) => {
    if (key === excludeGroupKey) return false;
    if (!row || typeof row !== "object") return false;
    if (row.subject !== subject || row.topic !== topic) return false;
    if (row.isMetadataWeak === true || row.metadataConfidenceCap !== "high") return false;
    const patterns = row.errorPatterns && typeof row.errorPatterns === "object" ? row.errorPatterns : {};
    const hasWrongPatterns = Object.values(patterns).some((p) => safeNum(p?.wrongCount) > 0);
    return (
      row.recurrence?.met === true &&
      safeNum(row.rawDiagnosticCount) >= 3 &&
      !hasWrongPatterns
    );
  });
}

/**
 * @param {Record<string, unknown>} candidate
 * @param {Record<string, unknown>} internal
 * @param {Record<string, unknown>} publicView
 * @returns {{ status: "validated"|"rejected", reason: string, detail?: Record<string, unknown> }}
 */
function validatePromotionCandidate(candidate, internal, publicView) {
  const bySubSkill =
    internal.bySubSkill && typeof internal.bySubSkill === "object" ? internal.bySubSkill : {};
  const errorPatterns =
    internal.errorPatterns && typeof internal.errorPatterns === "object"
      ? internal.errorPatterns
      : {};
  const questionTypes =
    internal.questionTypes && typeof internal.questionTypes === "object"
      ? internal.questionTypes
      : {};

  const topicKey = pickStr(candidate.topicKey);
  const subject = pickStr(candidate.subject) || topicKey.split("::")[0] || "";
  const topic = pickStr(candidate.topic) || topicKey.split("::")[1] || "";
  const reason = pickStr(candidate.reason);

  if (!topicKey && candidate.scope !== "errorPattern") {
    return { status: "rejected", reason: "missing_topic_scope" };
  }

  if (topicKey && !topicPreliminaryOnly(publicView, topicKey)) {
    const suff = pickStr(publicView?.byTopic?.[topicKey]?.dataSufficiency);
    if (suff === DATA_SUFFICIENCY.NO_DATA || suff === DATA_SUFFICIENCY.INSUFFICIENT) {
      return { status: "rejected", reason: "q1_topic_insufficient_or_no_data" };
    }
    return { status: "rejected", reason: "q1_topic_not_preliminary" };
  }

  const types = typesForTopic(questionTypes, subject, topic);
  if (types.length > 0 && isUnclassifiedDominant(types)) {
    return { status: "rejected", reason: "unclassified_question_type_dominant" };
  }

  if (reason === "preliminary_topic_with_high_confidence_subskill_recurrence") {
    const groupKey = pickStr(candidate.metadataSignals?.subSkillGroupKey);
    const group = subSkillGroup(bySubSkill, groupKey);
    const quality = groupPassesMetadataQuality(group);
    if (!quality.pass) return { status: "rejected", reason: quality.reason };
    if (hasConflictingPositiveSubSkillInTopic(bySubSkill, topicKey, groupKey)) {
      return { status: "rejected", reason: "conflicting_positive_subskill_in_topic" };
    }
    return {
      status: "validated",
      reason: "high_confidence_subskill_recurrence",
      detail: { subSkillGroupKey: groupKey },
    };
  }

  if (reason === "recurring_error_pattern_high_metadata_confidence") {
    const patternKey = pickStr(candidate.patternKey);
    const patternRow = errorPatterns[patternKey];
    if (!patternRow || typeof patternRow !== "object") {
      return { status: "rejected", reason: "missing_error_pattern_row" };
    }
    if (!pickStr(patternRow.pattern)) {
      return { status: "rejected", reason: "missing_possible_error_patterns" };
    }
    if (patternRow.recurrenceMet !== true) {
      return { status: "rejected", reason: "single_day_or_insufficient_recurrence" };
    }
    if (patternRow.isMetadataWeak === true) {
      return { status: "rejected", reason: "metadata_weak" };
    }
    if (pickStr(patternRow.metadataConfidenceCap) !== "high") {
      return { status: "rejected", reason: "metadata_confidence_cap_not_high" };
    }
    if (!effectiveAtLeastModerate(patternRow.effectiveConfidenceLevel)) {
      return { status: "rejected", reason: "effective_confidence_below_moderate" };
    }
    const patternTopicKey = `${pickStr(patternRow.subject)}::${pickStr(patternRow.topic)}`;
    if (patternTopicKey !== "::" && !topicPreliminaryOnly(publicView, patternTopicKey)) {
      return { status: "rejected", reason: "q1_topic_not_preliminary" };
    }
    return {
      status: "validated",
      reason: "high_confidence_error_pattern_recurrence",
      detail: { patternKey },
    };
  }

  if (reason === "word_problem_weakness_while_technical_stable") {
    const wpType = types.find((t) => t.questionType === "word_problem");
    const techType = types.find((t) => t.questionType === "technical");
    if (!wpType || !techType) {
      return { status: "rejected", reason: "missing_question_type_contrast" };
    }
    if (wpType.isUnclassified === true || techType.isUnclassified === true) {
      return { status: "rejected", reason: "unclassified_question_type" };
    }
    if (wpType.isMetadataWeak === true || techType.isMetadataWeak === true) {
      return { status: "rejected", reason: "metadata_weak" };
    }
    if (pickStr(wpType.metadataConfidenceCap) !== "high") {
      return { status: "rejected", reason: "metadata_confidence_cap_not_high" };
    }
    if (!effectiveAtLeastModerate(wpType.effectiveConfidenceLevel)) {
      return { status: "rejected", reason: "effective_confidence_below_moderate" };
    }
    if (safeNum(wpType.diagnosticWrong) < 2 || safeNum(techType.diagnosticWrong) !== 0) {
      return { status: "rejected", reason: "question_type_contrast_not_met" };
    }
    const wpGroup = Object.values(bySubSkill).find(
      (g) =>
        g?.subject === subject &&
        g?.topic === topic &&
        g?.questionType === "word_problem" &&
        g?.groupingLevel === "subSkill"
    );
    if (wpGroup && wpGroup.recurrence?.met !== true) {
      return { status: "rejected", reason: "single_day_or_insufficient_recurrence" };
    }
    if (wpGroup && hasConflictingPositiveInGroup(wpGroup, "word_problem")) {
      return { status: "rejected", reason: "conflicting_positive_in_question_type" };
    }
    return {
      status: "validated",
      reason: "word_problem_contrast_while_technical_stable",
      detail: { wordProblemWrong: wpType.diagnosticWrong, technicalWrong: techType.diagnosticWrong },
    };
  }

  return { status: "rejected", reason: "unknown_promotion_candidate_reason" };
}

/**
 * @param {{
 *   shadowParentGating: Record<string, unknown>,
 *   internal: Record<string, unknown>,
 *   publicView: Record<string, unknown>,
 * }} input
 */
export function validateShadowPromotionCandidates({ shadowParentGating, internal, publicView }) {
  const candidates = Array.isArray(shadowParentGating.shadowPromotionCandidates)
    ? shadowParentGating.shadowPromotionCandidates
    : [];

  /** @type {Array<Record<string, unknown>>} */
  const validatedPromotionCandidates = [];
  /** @type {Array<Record<string, unknown>>} */
  const rejectedPromotionCandidates = [];
  /** @type {string[]} */
  const promotionValidationReasons = [];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const outcome = validatePromotionCandidate(candidate, internal, publicView);
    const topicKey = pickStr(candidate.topicKey) || pickStr(candidate.patternKey) || "unknown";
    const entry = {
      ...candidate,
      validationOutcome: outcome.status,
      validationReason: outcome.reason,
      ...(outcome.detail ? { validationDetail: outcome.detail } : {}),
    };

    if (outcome.status === "validated") {
      validatedPromotionCandidates.push(entry);
      promotionValidationReasons.push(`validated:${topicKey}:${outcome.reason}`);
    } else {
      rejectedPromotionCandidates.push(entry);
      promotionValidationReasons.push(`rejected:${topicKey}:${outcome.reason}`);
    }
  }

  return {
    version: PROMOTION_VALIDATION_VERSION,
    validatedPromotionCandidates,
    rejectedPromotionCandidates,
    promotionValidationReasons,
    promotionValidation: {
      version: PROMOTION_VALIDATION_VERSION,
      candidateCount: candidates.length,
      validatedCount: validatedPromotionCandidates.length,
      rejectedCount: rejectedPromotionCandidates.length,
      activePromotionApplied: false,
    },
  };
}
