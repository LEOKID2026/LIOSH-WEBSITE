/**
 * Diagnostic Engine V3 — internal types and enums (not parent-facing copy).
 */

export const ENGINE_V3_VERSION = "3.0.0";
export const ENGINE_V3_BLUEPRINT = "Diagnostic Engine V3 - fast, deep, evidence-bound";

/** Wave 1 — richest error/subskill rules */
export const V3_WAVE1_SUBJECT_IDS = Object.freeze(["math", "hebrew", "english"]);

export const V3_ALL_SUBJECT_IDS = Object.freeze([
  "math",
  "geometry",
  "english",
  "science",
  "hebrew",
  "moledet-geography",
  "history",
]);

/** @typedef {typeof import("./error-types-v3.js").ERROR_TYPE_V3[keyof typeof import("./error-types-v3.js").ERROR_TYPE_V3]} ErrorTypeV3 */

/** @typedef {"very_low"|"low"|"medium"|"high"} ConfidenceBandV3 */

/** @typedef {
 *   "enough_for_initial_signal" |
 *   "enough_for_working_hypothesis" |
 *   "enough_for_stable_subskill_diagnosis" |
 *   "needs_more_probe" |
 *   "contradictory_evidence"
 * } DiagnosisStageV3 */

/** @typedef {
 *   "practice_more" |
 *   "give_probe_questions" |
 *   "strengthen_prerequisite" |
 *   "reduce_reading_load" |
 *   "remove_timer" |
 *   "advance_cautiously" |
 *   "maintain" |
 *   "insufficient_data"
 * } RecommendedNextStepV3 */

/** @typedef {"none"|"thin"|"moderate"|"strong"} EvidenceStrengthV3 */

export const CONFIDENCE_BAND = Object.freeze({
  VERY_LOW: "very_low",
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
});

export const DIAGNOSIS_STAGE = Object.freeze({
  INITIAL_SIGNAL: "enough_for_initial_signal",
  WORKING_HYPOTHESIS: "enough_for_working_hypothesis",
  STABLE: "enough_for_stable_subskill_diagnosis",
  NEEDS_PROBE: "needs_more_probe",
  CONTRADICTORY: "contradictory_evidence",
});

export const RECOMMENDED_NEXT_STEP = Object.freeze({
  PRACTICE_MORE: "practice_more",
  GIVE_PROBE: "give_probe_questions",
  STRENGTHEN_PREREQUISITE: "strengthen_prerequisite",
  REDUCE_READING: "reduce_reading_load",
  REMOVE_TIMER: "remove_timer",
  ADVANCE: "advance_cautiously",
  MAINTAIN: "maintain",
  INSUFFICIENT: "insufficient_data",
});
