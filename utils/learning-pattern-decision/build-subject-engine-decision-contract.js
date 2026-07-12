/**
 * Subject-level engine decision contract — aggregates per-topic engineDecisionContract rows.
 * Decision codes, template IDs, and slots only; no new parent-facing Hebrew copy.
 */

import { evidenceStrengthRank } from "./resolve-evidence-strength.js";

/** @type {Record<string, number>} */
const ENGINE_DECISION_RANK = {
  clear_topic_gap: 4,
  topic_needs_strengthening: 3,
  partial_stable: 2,
  // speed_pressure_pattern is NOT a knowledge gap — it must never rank the same as
  // topic_needs_strengthening. It is tracked separately (see speedCheckTopics below)
  // and excluded from isActionableGapTopic / actionableCandidates entirely.
  speed_pressure_pattern: 1,
  early_direction_only: 1,
  insufficient_data: 0,
  none: 0,
};

/** @type {Set<string>} */
const REMEDIATE_ACTIONS = new Set([
  "remediate_same_level",
  "remediate_step_down",
  "intervene",
]);

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {(Record<string, unknown> & { _decisionRank: number, _evidenceRank: number })|null}
 */
function extractTopicEngineContract(row) {
  const edc =
    row?.engineDecisionContract ||
    row?.learningPatternDecision?.engineDecisionContract ||
    null;
  if (!edc || typeof edc !== "object") return null;

  const metrics =
    edc.metrics && typeof edc.metrics === "object" ? edc.metrics : {};
  const questions = Number(edc.questions ?? row?.questions ?? metrics.questions) || 0;
  const correct = Number(edc.correct ?? row?.correct ?? metrics.correct) || 0;
  const wrong = Number(edc.wrong ?? row?.wrong ?? metrics.wrong) || 0;
  const accuracy = Number(edc.accuracy ?? row?.accuracy ?? metrics.accuracy) || 0;

  const lpd =
    row?.learningPatternDecision && typeof row.learningPatternDecision === "object"
      ? row.learningPatternDecision
      : null;

  const engineDecision = String(edc.engineDecision || "none");
  const evidenceStrength = String(edc.evidenceStrength || "none");

  return {
    topicKey: String(row?.topicRowKey || row?.topicKey || edc.topic || "").trim(),
    topicLabelKey: String(
      row?.displayName || row?.label || edc.topicName || row?.topicKey || "",
    ).trim(),
    questions,
    correct,
    wrong,
    accuracy,
    engineDecision,
    sourceEngine: String(edc.sourceEngine || "topic_aggregation"),
    detectedPattern: edc.detectedPattern || null,
    misconceptionLabel: edc.misconceptionLabel || null,
    affectedSubskill: edc.affectedSubskill || null,
    severity: String(edc.severity || "none"),
    evidenceStrength,
    recommendedAction: String(edc.recommendedAction || "none"),
    parentSafeFinding: String(
      edc.parentSafeFinding || row?.parentVisibleFinding || "",
    ).trim(),
    templateId: String(lpd?.templateId || row?.templateId || "").trim() || null,
    _decisionRank: ENGINE_DECISION_RANK[engineDecision] || 0,
    _evidenceRank: evidenceStrengthRank(evidenceStrength),
  };
}

/**
 * @param {Record<string, unknown>} topic
 */
function isActionableGapTopic(topic) {
  if (!topic?.parentSafeFinding) return false;
  const ed = String(topic.engineDecision || "");
  // speed_pressure_pattern is intentionally excluded: it is not a knowledge gap and
  // must never count toward gaps.length or drive multiple_topic_gaps/
  // focused_strengthening_needed. It is tracked separately as speedCheckTopics.
  if (ed !== "clear_topic_gap" && ed !== "topic_needs_strengthening") {
    return false;
  }
  if (
    evidenceStrengthRank(String(topic.evidenceStrength || "none")) <
      evidenceStrengthRank("emerging") &&
    Number(topic.questions) < 10
  ) {
    return false;
  }
  return (
    REMEDIATE_ACTIONS.has(String(topic.recommendedAction || "")) ||
    String(topic.recommendedAction || "") !== "watch"
  );
}

/**
 * @param {Record<string, unknown>[]} priorityTopics
 * @param {Record<string, unknown>[]} allTopics
 * @param {number} [speedCheckTopicsCount] — count of speed_pressure_pattern-only topics
 *   (not knowledge gaps — see isActionableGapTopic). Passed in explicitly so this
 *   function stays a pure decision table over the three counts, per the product-approved
 *   routing order.
 */
function deriveSubjectDecision(priorityTopics, allTopics, speedCheckTopicsCount = 0) {
  const gaps = priorityTopics.filter(isActionableGapTopic);
  const stable = allTopics.filter(
    (t) =>
      String(t.engineDecision || "") === "partial_stable" ||
      String(t.recommendedAction || "") === "maintain" ||
      String(t.recommendedAction || "") === "maintain_and_strengthen",
  );

  // Product-approved routing order (mixed_subject_profile only ever describes exactly
  // ONE topic needing strengthening — its approved copy says "נושא אחד שכדאי לחזק" and
  // must never be used when two or more topics have gaps). speed_check_only_subject is
  // NOT a gap and NOT a strengthening decision — it only applies when there is nothing
  // else to report except topic(s) flagged purely for a speed-mode check.
  if (gaps.length >= 2) return "multiple_topic_gaps";
  if (gaps.length === 1 && stable.length >= 1) return "mixed_subject_profile";
  if (gaps.length === 1 && stable.length === 0) return "focused_strengthening_needed";
  if (gaps.length === 0 && stable.length >= 1) return "subject_strength_stable";
  if (gaps.length === 0 && stable.length === 0 && speedCheckTopicsCount >= 1) {
    return "speed_check_only_subject";
  }
  return "insufficient_subject_data";
}

/**
 * @param {Record<string, unknown>[]} priorityTopics
 * @param {string} subjectDecision
 */
function deriveRecommendedSubjectAction(priorityTopics, subjectDecision) {
  const gaps = priorityTopics.filter(isActionableGapTopic);
  if (
    gaps.length >= 1 &&
    (subjectDecision === "multiple_topic_gaps" ||
      subjectDecision === "focused_strengthening_needed" ||
      subjectDecision === "mixed_subject_profile")
  ) {
    return "remediate_priority_topics_same_level";
  }
  if (subjectDecision === "subject_strength_stable") return "maintain_current_level";
  // Distinct from "insufficient_data_withhold": there IS real, sufficient practice data —
  // it just isn't evidence of a knowledge gap. No template is registered for this action
  // id, so home-action text stays empty rather than showing an invented recommendation.
  if (subjectDecision === "speed_check_only_subject") return "verify_speed_only_before_deciding";
  return "insufficient_data_withhold";
}

/**
 * @param {Array<Record<string, unknown> & { _decisionRank?: number, _evidenceRank?: number }>} topics
 */
function sortPriorityTopics(topics) {
  return [...topics].sort((a, b) => {
    const drA = Number(a._decisionRank) || 0;
    const drB = Number(b._decisionRank) || 0;
    if (drB !== drA) return drB - drA;
    const erA = Number(a._evidenceRank) || 0;
    const erB = Number(b._evidenceRank) || 0;
    if (erB !== erA) return erB - erA;
    /** @type {Record<string, number>} */
    const sevRank = { high: 3, moderate: 2, low: 1, none: 0 };
    const sa = sevRank[String(a.severity)] || 0;
    const sb = sevRank[String(b.severity)] || 0;
    if (sb !== sa) return sb - sa;
    const wrongA = Number(a.wrong) || 0;
    const wrongB = Number(b.wrong) || 0;
    if (wrongB !== wrongA) return wrongB - wrongA;
    const accA = Number(a.accuracy) || 0;
    const accB = Number(b.accuracy) || 0;
    if (accA !== accB) return accA - accB;
    return (Number(b.questions) || 0) - (Number(a.questions) || 0);
  });
}

/**
 * @param {Record<string, unknown> & { _decisionRank?: number, _evidenceRank?: number }} topic
 */
function stripInternalRanks(topic) {
  const { _decisionRank, _evidenceRank, ...rest } = topic;
  return rest;
}

/**
 * @param {string} subjectId
 * @param {Record<string, unknown>[]} [topicRows]
 * @param {{ subjectLabelKey?: string }} [opts]
 */
export function buildSubjectEngineDecisionContract(subjectId, topicRows = [], opts = {}) {
  /** @type {string[]} */
  const traceReason = ["subject:aggregate_start"];

  const sid = String(subjectId || "").trim();
  const subjectLabelKey = String(opts.subjectLabelKey || sid).trim() || sid;

  const allExtracted = (Array.isArray(topicRows) ? topicRows : [])
    .map(extractTopicEngineContract)
    .filter(Boolean);

  traceReason.push(`topics:extracted=${allExtracted.length}`);

  const totalQuestions = allExtracted.reduce((s, t) => s + (Number(t.questions) || 0), 0);
  const totalCorrect = allExtracted.reduce((s, t) => s + (Number(t.correct) || 0), 0);
  const weightedAccuracy =
    totalQuestions > 0 ? Math.round((totalCorrect * 100) / totalQuestions) : 0;

  const actionableCandidates = allExtracted.filter(
    (t) =>
      t.parentSafeFinding &&
      (t.engineDecision === "clear_topic_gap" ||
        t.engineDecision === "topic_needs_strengthening" ||
        t.engineDecision === "early_direction_only"),
  );

  const priorityTopicsSorted = sortPriorityTopics(actionableCandidates);
  const priorityTopics = priorityTopicsSorted.map(stripInternalRanks).slice(0, 5);
  const allTopicsClean = allExtracted.map(stripInternalRanks);

  // speed_pressure_pattern topics are NOT knowledge gaps: never merged into mainGaps,
  // never counted toward gaps.length. Sorted with the same existing priority order as
  // actionable gaps so that when several exist, the subject-level text names only the
  // single highest-priority one (never "several topics").
  const speedCandidates = allExtracted.filter(
    (t) => t.parentSafeFinding && t.engineDecision === "speed_pressure_pattern",
  );
  const speedTopicsSorted = sortPriorityTopics(speedCandidates).map(stripInternalRanks);
  const speedCheckTopics = speedTopicsSorted.map((t) => t.topicKey).filter(Boolean);
  const prioritySpeedTopic = speedTopicsSorted[0] || null;

  const subjectDecision = deriveSubjectDecision(priorityTopics, allTopicsClean, speedCheckTopics.length);
  traceReason.push(`subjectDecision:${subjectDecision}`);

  let evidenceStrength = "none";
  for (const t of priorityTopics) {
    if (evidenceStrengthRank(String(t.evidenceStrength || "none")) > evidenceStrengthRank(evidenceStrength)) {
      evidenceStrength = String(t.evidenceStrength || "none");
    }
  }

  const strongestDetectedPatterns = [
    ...new Set(priorityTopics.map((t) => t.detectedPattern).filter(Boolean)),
  ];

  const mainGaps = priorityTopics.filter(isActionableGapTopic).map((t) => t.topicKey);
  const stableStrengths = allTopicsClean
    .filter(
      (t) =>
        String(t.engineDecision || "") === "partial_stable" ||
        String(t.recommendedAction || "") === "maintain" ||
        String(t.recommendedAction || "") === "maintain_and_strengthen",
    )
    .map((t) => t.topicKey)
    .filter(Boolean);

  const recommendedSubjectAction = deriveRecommendedSubjectAction(priorityTopics, subjectDecision);
  traceReason.push(`recommendedSubjectAction:${recommendedSubjectAction}`);

  const speedCheckEvidenceQualifies =
    !!prioritySpeedTopic &&
    (evidenceStrengthRank(String(prioritySpeedTopic.evidenceStrength || "none")) >=
      evidenceStrengthRank("supported") ||
      Number(prioritySpeedTopic.questions) >= 20);

  // Blocks the legacy (engine-unaware) subject-summary/parent-letter fallback paths —
  // e.g. findClearWeakTopicInSubject, which can otherwise declare "נקודת חיזוק ברורה"
  // (a clear, definite knowledge gap) purely from accuracy/volume, with zero awareness
  // that the only active decision here is speed_check_only_subject (not a proven gap).
  const blockedLegacySummary =
    priorityTopics.some((t) => {
      if (!isActionableGapTopic(t)) return false;
      return (
        evidenceStrengthRank(String(t.evidenceStrength || "none")) >=
          evidenceStrengthRank("supported") || Number(t.questions) >= 20
      );
    }) ||
    (subjectDecision === "speed_check_only_subject" && speedCheckEvidenceQualifies);

  if (blockedLegacySummary) traceReason.push("blockedLegacySummary:true");

  const summarySlots = {
    openingTemplateId: blockedLegacySummary
      ? "SUBJECT_OPENING_PRIORITY_TOPIC_0"
      : "SUBJECT_OPENING_LEGACY",
    diagnosisTemplateId:
      priorityTopics.length > 1
        ? "SUBJECT_DIAGNOSIS_PRIORITY_TOPIC_1"
        : "SUBJECT_DIAGNOSIS_PRIORITY_TOPIC_0",
    homeActionTemplateId: recommendedSubjectAction,
    closingTemplateId: blockedLegacySummary
      ? "SUBJECT_CLOSING_ENGINE_CONTRACT"
      : "SUBJECT_CLOSING_LEGACY",
    priorityTopicKeys: priorityTopics.map((t) => t.topicKey),
    renderSource: "subjectEngineDecisionContract",
  };

  for (const t of priorityTopics) {
    traceReason.push(
      `priority:${t.topicKey}:decision=${t.engineDecision}:action=${t.recommendedAction}`,
    );
  }

  return {
    subjectId: sid,
    subjectLabelKey,
    totalQuestions,
    weightedAccuracy,
    subjectDecision,
    evidenceStrength,
    priorityTopics,
    strongestDetectedPatterns,
    mainGaps,
    stableStrengths,
    speedCheckTopics,
    prioritySpeedTopic,
    recommendedSubjectAction,
    blockedLegacySummary,
    traceReason,
    summarySlots,
  };
}

/**
 * Build subject contract from topic map rows (same engineDecisionContract source as detailed rollup).
 *
 * @param {string} subjectId
 * @param {Record<string, unknown>|null|undefined} topicMap
 * @param {{ subjectLabelKey?: string }} [opts]
 */
export function buildSubjectEngineDecisionContractFromTopicMap(subjectId, topicMap, opts = {}) {
  /** @type {Record<string, unknown>[]} */
  const rows = [];
  if (topicMap && typeof topicMap === "object") {
    for (const [topicKey, row] of Object.entries(topicMap)) {
      if (!row || typeof row !== "object") continue;
      if ((Number(row.questions) || 0) <= 0) continue;
      rows.push({
        topicRowKey: topicKey,
        topicKey,
        displayName: String(row.displayName || row.narrativeTopicLabelHe || "").trim(),
        label: row.displayName,
        questions: row.questions,
        correct: row.correct,
        wrong: row.wrong,
        accuracy: row.accuracy,
        engineDecisionContract: row.engineDecisionContract,
        learningPatternDecision: row.learningPatternDecision,
        parentVisibleFinding: row.parentVisibleFinding,
        templateId: row.learningPatternDecision?.templateId,
      });
    }
  }
  return buildSubjectEngineDecisionContract(subjectId, rows, opts);
}

/**
 * @param {Record<string, unknown>|null|undefined} contract
 * @returns {string|null}
 * @deprecated Prefer resolveSubjectSummaryTextFromEngineContract from resolve-subject-owner-copy.js with subjectLabelHe.
 */
export function resolveSubjectSummaryTextFromEngineContractLegacyFinding(contract) {
  if (!contract?.blockedLegacySummary) return null;
  const p0 = contract.priorityTopics?.[0];
  const finding = String(p0?.parentSafeFinding || "").trim();
  return finding || null;
}

export {
  resolveSubjectSummaryTextFromEngineContract,
  resolveSubjectLetterOwnerCopyHe,
} from "./resolve-subject-owner-copy.js";

/**
 * @param {Record<string, unknown>|null|undefined} sp
 * @param {string} topicKey
 */
export function findTopicRecommendationForPriority(sp, topicKey) {
  const key = String(topicKey || "").trim();
  if (!key) return null;
  return (Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : []).find(
    (tr) => String(tr?.topicRowKey || tr?.topicKey || "") === key,
  );
}
