/**
 * Phase 4 — unified parent-facing evidence volume matrix.
 *
 * One owner for question-count tiers. Different numbers serve different scopes:
 * - 5  = start of preliminary signal (not insufficient)
 * - 8  = subject/topic insight & cautious conclusions
 * - 12 = strong recommendation / supported diagnosis (with recurrence)
 * - 15 = student-level report thin-data suppress (total answers, not per topic)
 * - 40 = high-volume topic band (never "collect more data" for volume alone)
 */

export const PARENT_EVIDENCE_VOLUME = Object.freeze({
  /** 0 questions — no practice / no data */
  NONE: 0,
  /** 1–4 — too little to conclude */
  INSUFFICIENT_MAX: 4,
  /** 5–7 — preliminary direction only */
  PRELIMINARY_MIN: 5,
  PRELIMINARY_MAX: 7,
  /** 8–11 — hedged insight allowed */
  INSIGHT_MIN: 8,
  INSIGHT_MAX: 11,
  /** 12+ — strong recommendation / supported diagnosis (recurrence may still apply) */
  STRONG_MIN: 12,
  /** Total report answers below this → thin student-level copy / client suppress */
  STUDENT_REPORT_THIN_MAX: 15,
  /** High-volume topic band */
  HIGH_VOLUME_MIN: 40,
});

/** @deprecated use PARENT_EVIDENCE_VOLUME.INSIGHT_MIN */
export const SUBJECT_VALID_MIN_QUESTIONS = PARENT_EVIDENCE_VOLUME.INSIGHT_MIN;

/** @deprecated use PARENT_EVIDENCE_VOLUME */
export const PRELIMINARY_MIN_DIAGNOSTIC = PARENT_EVIDENCE_VOLUME.PRELIMINARY_MIN;

/** @deprecated use PARENT_EVIDENCE_VOLUME */
export const SUPPORTED_MIN_DIAGNOSTIC = PARENT_EVIDENCE_VOLUME.STRONG_MIN;

export const PARENT_EVIDENCE_TIER = Object.freeze({
  none: "none",
  insufficient: "insufficient",
  preliminary: "preliminary",
  insight: "insight",
  strong: "strong",
  high_volume: "high_volume",
});

/**
 * @param {number} questionCount
 * @returns {typeof PARENT_EVIDENCE_TIER[keyof typeof PARENT_EVIDENCE_TIER]}
 */
export function classifyParentEvidenceTier(questionCount) {
  const q = Math.max(0, Math.floor(Number(questionCount) || 0));
  if (q === 0) return PARENT_EVIDENCE_TIER.none;
  if (q <= PARENT_EVIDENCE_VOLUME.INSUFFICIENT_MAX) return PARENT_EVIDENCE_TIER.insufficient;
  if (q < PARENT_EVIDENCE_VOLUME.INSIGHT_MIN) return PARENT_EVIDENCE_TIER.preliminary;
  if (q < PARENT_EVIDENCE_VOLUME.STRONG_MIN) return PARENT_EVIDENCE_TIER.insight;
  if (q < PARENT_EVIDENCE_VOLUME.HIGH_VOLUME_MIN) return PARENT_EVIDENCE_TIER.strong;
  return PARENT_EVIDENCE_TIER.high_volume;
}

/**
 * @param {number} questionCount
 */
export function hasPreliminaryEvidence(questionCount) {
  const t = classifyParentEvidenceTier(questionCount);
  return (
    t === PARENT_EVIDENCE_TIER.preliminary ||
    t === PARENT_EVIDENCE_TIER.insight ||
    t === PARENT_EVIDENCE_TIER.strong ||
    t === PARENT_EVIDENCE_TIER.high_volume
  );
}

/**
 * @param {number} questionCount
 */
export function hasInsightEvidence(questionCount) {
  const t = classifyParentEvidenceTier(questionCount);
  return (
    t === PARENT_EVIDENCE_TIER.insight ||
    t === PARENT_EVIDENCE_TIER.strong ||
    t === PARENT_EVIDENCE_TIER.high_volume
  );
}

/**
 * @param {number} questionCount
 */
export function hasStrongRecommendationEvidence(questionCount) {
  const t = classifyParentEvidenceTier(questionCount);
  return t === PARENT_EVIDENCE_TIER.strong || t === PARENT_EVIDENCE_TIER.high_volume;
}

/**
 * Topic-row bands aligned with matrix (thin / low / moderate / strong).
 * @param {number} questionCount
 */
export function classifyTopicVolumeBand(questionCount) {
  const t = classifyParentEvidenceTier(questionCount);
  if (t === PARENT_EVIDENCE_TIER.high_volume) return "strong";
  if (t === PARENT_EVIDENCE_TIER.strong) return "moderate";
  if (t === PARENT_EVIDENCE_TIER.insight || t === PARENT_EVIDENCE_TIER.preliminary) return "low";
  return "thin";
}

export default {
  PARENT_EVIDENCE_VOLUME,
  SUBJECT_VALID_MIN_QUESTIONS,
  PRELIMINARY_MIN_DIAGNOSTIC,
  SUPPORTED_MIN_DIAGNOSTIC,
  PARENT_EVIDENCE_TIER,
  classifyParentEvidenceTier,
  hasPreliminaryEvidence,
  hasInsightEvidence,
  hasStrongRecommendationEvidence,
  classifyTopicVolumeBand,
};
