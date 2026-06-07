/**
 * Q2-E.5-A — Shadow parent gating analysis (internal only, not applied).
 * Compares Q1 public evidence quality with E.1–E.4 metadata signals.
 */

/** Mirrors evidence-quality DATA_SUFFICIENCY (local to avoid circular import). */
const DATA_SUFFICIENCY = Object.freeze({
  NO_DATA: "no_data",
  INSUFFICIENT: "insufficient_data",
  PRELIMINARY: "preliminary_signal",
  SUPPORTED: "supported_diagnosis",
});

export const SHADOW_PARENT_GATING_VERSION = "q2-e-5a-shadow-v1";

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
 * @param {string} subject
 * @param {string} topic
 * @returns {string}
 */
function topicScopeKey(subject, topic) {
  return `${pickStr(subject) || "unknown"}::${pickStr(topic) || "general"}`;
}

/**
 * @param {Record<string, object>|undefined} bySubSkill
 * @param {string} subject
 * @param {string} topic
 * @returns {Array<[string, Record<string, unknown>]>}
 */
function subSkillGroupsForTopic(bySubSkill, subject, topic) {
  if (!bySubSkill || typeof bySubSkill !== "object") return [];
  return Object.entries(bySubSkill).filter(([, entry]) => {
    if (!entry || typeof entry !== "object") return false;
    return entry.subject === subject && entry.topic === topic;
  });
}

/**
 * @param {Record<string, object>|undefined} questionTypes
 * @param {string} subject
 * @param {string} topic
 * @returns {Array<Record<string, unknown>>}
 */
function questionTypesForTopic(questionTypes, subject, topic) {
  if (!questionTypes || typeof questionTypes !== "object") return [];
  return Object.values(questionTypes).filter((row) => {
    if (!row || typeof row !== "object") return false;
    return row.subject === subject && row.topic === topic;
  });
}

/**
 * Shadow-only analysis — never mutates parent-facing output.
 *
 * @param {{
 *   publicView: Record<string, unknown>,
 *   internal: Record<string, unknown>,
 * }} input
 * @returns {Record<string, unknown>}
 */
export function computeShadowParentGatingAnalysis({ publicView, internal }) {
  const byTopic = internal.byTopic && typeof internal.byTopic === "object" ? internal.byTopic : {};
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

  /** @type {Array<Record<string, unknown>>} */
  const shadowSuppressionCandidates = [];
  /** @type {Array<Record<string, unknown>>} */
  const shadowPromotionCandidates = [];
  /** @type {Array<Record<string, unknown>>} */
  const noOpCases = [];
  /** @type {string[]} */
  const shadowGatingReasons = [];

  const hasMetadataSignals =
    Object.keys(bySubSkill).length > 0 ||
    Object.keys(errorPatterns).length > 0 ||
    Object.keys(questionTypes).length > 0;

  if (!hasMetadataSignals) {
    noOpCases.push({
      scope: "student",
      case: "metadata_signals_missing",
      reason: "no_internal_metadata_grouping_available",
    });
    shadowGatingReasons.push("no_op:metadata_signals_missing");
    return packShadowResult(shadowSuppressionCandidates, shadowPromotionCandidates, noOpCases, shadowGatingReasons);
  }

  for (const [topicKey, topicScope] of Object.entries(byTopic)) {
    if (!topicScope || typeof topicScope !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (topicScope);
    const suff = pickStr(row.dataSufficiency);
    const parts = topicKey.split("::");
    const subject = parts[0] || "unknown";
    const topic = parts[1] || "general";
    const groups = subSkillGroupsForTopic(bySubSkill, subject, topic);
    const types = questionTypesForTopic(questionTypes, subject, topic);

    const publicTopic = publicView?.byTopic?.[topicKey];
    const q1Suff = pickStr(publicTopic?.dataSufficiency) || suff;

    if (groups.length === 0) {
      if (suff === DATA_SUFFICIENCY.INSUFFICIENT || suff === DATA_SUFFICIENCY.NO_DATA) {
        noOpCases.push({
          scope: "topic",
          topicKey,
          case: "q1_insufficient_no_metadata_groups",
          reason: "metadata_missing_for_topic",
        });
      }
      continue;
    }

    const weakGroups = groups.filter(([, g]) => g.isMetadataWeak === true);
    const strongGroups = groups.filter(
      ([, g]) =>
        g.isMetadataWeak !== true &&
        g.metadataConfidenceCap === "high" &&
        g.groupingLevel === "subSkill"
    );
    const onlyTopicRollup = groups.every(([, g]) => g.groupingLevel === "topic");
    const onlyLowCapGroups = groups.every(
      ([, g]) => g.metadataConfidenceCap === "low" || g.isMetadataWeak === true
    );

    const unclassifiedTypes = types.filter((t) => t.isUnclassified === true);
    const classifiedShare =
      types.length > 0 ? (types.length - unclassifiedTypes.length) / types.length : 1;

    if (
      q1Suff === DATA_SUFFICIENCY.SUPPORTED &&
      (onlyTopicRollup || onlyLowCapGroups || weakGroups.length === groups.length)
    ) {
      const reason = onlyTopicRollup
        ? "supported_topic_but_topic_only_metadata_rollup"
        : onlyLowCapGroups
          ? "supported_topic_but_only_low_confidence_subskill_groups"
          : "supported_topic_but_weak_metadata_groups";
      shadowSuppressionCandidates.push({
        scope: "topic",
        topicKey,
        subject,
        topic,
        q1DataSufficiency: q1Suff,
        shadowAction: "would_review_strong_topic_gating",
        reason,
        metadataSignals: {
          groupCount: groups.length,
          weakGroupCount: weakGroups.length,
          onlyTopicRollup,
        },
      });
      shadowGatingReasons.push(`suppress_candidate:${topicKey}:${reason}`);
    }

    if (
      q1Suff === DATA_SUFFICIENCY.SUPPORTED &&
      types.length > 0 &&
      classifiedShare < 0.5
    ) {
      shadowSuppressionCandidates.push({
        scope: "topic",
        topicKey,
        subject,
        topic,
        q1DataSufficiency: q1Suff,
        shadowAction: "would_review_unclassified_question_type_mix",
        reason: "supported_topic_mostly_unclassified_question_types",
        metadataSignals: {
          unclassifiedTypeCount: unclassifiedTypes.length,
          totalTypeCount: types.length,
        },
      });
      shadowGatingReasons.push(`suppress_candidate:${topicKey}:unclassified_question_types`);
    }

    if (
      q1Suff === DATA_SUFFICIENCY.PRELIMINARY &&
      strongGroups.some(([, g]) => g.recurrence?.met === true)
    ) {
      const promoted = strongGroups.find(([, g]) => g.recurrence?.met === true);
      const [, groupRow] = promoted || [];
      shadowPromotionCandidates.push({
        scope: "topic",
        topicKey,
        subject,
        topic,
        q1DataSufficiency: q1Suff,
        shadowAction: "would_consider_subskill_recurrence_signal",
        reason: "preliminary_topic_with_high_confidence_subskill_recurrence",
        metadataSignals: {
          subSkillGroupKey: promoted?.[0] || null,
          subSkill: groupRow?.subSkill || null,
          metadataConfidenceCap: groupRow?.metadataConfidenceCap || null,
        },
      });
      shadowGatingReasons.push(`promote_candidate:${topicKey}:subskill_recurrence`);
    }

    if (q1Suff === DATA_SUFFICIENCY.SUPPORTED && strongGroups.length > 0) {
      noOpCases.push({
        scope: "topic",
        topicKey,
        case: "q1_supported_matches_strong_metadata",
        reason: "supported_topic_with_high_confidence_subskill_groups",
      });
      shadowGatingReasons.push(`no_op:${topicKey}:q1_metadata_aligned`);
    }

    if (
      q1Suff === DATA_SUFFICIENCY.PRELIMINARY &&
      strongGroups.length === 0 &&
      weakGroups.length === groups.length
    ) {
      noOpCases.push({
        scope: "topic",
        topicKey,
        case: "preliminary_with_weak_metadata_only",
        reason: "metadata_too_weak_for_promotion_shadow",
      });
      shadowGatingReasons.push(`no_op:${topicKey}:weak_metadata_only`);
    }

    const wpType = types.find((t) => t.questionType === "word_problem");
    const techType = types.find((t) => t.questionType === "technical");
    if (
      wpType &&
      techType &&
      safeNum(wpType.diagnosticWrong) >= 2 &&
      safeNum(techType.diagnosticWrong) === 0 &&
      q1Suff === DATA_SUFFICIENCY.PRELIMINARY
    ) {
      shadowPromotionCandidates.push({
        scope: "questionType",
        topicKey,
        subject,
        topic,
        q1DataSufficiency: q1Suff,
        shadowAction: "would_surface_question_type_weakness",
        reason: "word_problem_weakness_while_technical_stable",
        metadataSignals: {
          wordProblemWrong: wpType.diagnosticWrong,
          technicalWrong: techType.diagnosticWrong,
        },
      });
      shadowGatingReasons.push(`promote_candidate:${topicKey}:word_problem_vs_technical`);
    }
  }

  for (const [patternKey, patternRow] of Object.entries(errorPatterns)) {
    if (!patternRow || typeof patternRow !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (patternRow);
    if (row.recurrenceMet !== true) continue;
    if (row.isMetadataWeak === true || row.metadataConfidenceCap !== "high") continue;

    shadowPromotionCandidates.push({
      scope: "errorPattern",
      patternKey,
      subject: row.subject,
      topic: row.topic,
      pattern: row.pattern,
      q1DataSufficiency: pickStr(publicView?.student?.dataSufficiency) || null,
      shadowAction: "would_consider_repeated_error_pattern",
      reason: "recurring_error_pattern_high_metadata_confidence",
      metadataSignals: {
        wrongCount: row.wrongCount,
        metadataConfidenceCap: row.metadataConfidenceCap,
        subSkillGroupKey: row.subSkillGroupKey || null,
      },
    });
    shadowGatingReasons.push(`promote_candidate:${patternKey}:error_pattern_recurrence`);
  }

  if (
    shadowSuppressionCandidates.length === 0 &&
    shadowPromotionCandidates.length === 0 &&
    noOpCases.length === 0
  ) {
    noOpCases.push({
      scope: "student",
      case: "no_shadow_delta_detected",
      reason: "q1_and_metadata_signals_neutral",
    });
    shadowGatingReasons.push("no_op:no_shadow_delta");
  }

  return packShadowResult(
    shadowSuppressionCandidates,
    shadowPromotionCandidates,
    noOpCases,
    shadowGatingReasons
  );
}

/**
 * @param {Array<Record<string, unknown>>} shadowSuppressionCandidates
 * @param {Array<Record<string, unknown>>} shadowPromotionCandidates
 * @param {Array<Record<string, unknown>>} noOpCases
 * @param {string[]} shadowGatingReasons
 */
function packShadowResult(
  shadowSuppressionCandidates,
  shadowPromotionCandidates,
  noOpCases,
  shadowGatingReasons
) {
  return {
    version: SHADOW_PARENT_GATING_VERSION,
    shadowSuppressionCandidates,
    shadowPromotionCandidates,
    shadowGatingReasons,
    noOpCases,
    summary: {
      suppressionCount: shadowSuppressionCandidates.length,
      promotionCount: shadowPromotionCandidates.length,
      noOpCount: noOpCases.length,
    },
  };
}
