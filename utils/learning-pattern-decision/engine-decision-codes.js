/**
 * Engine decision codes and contract field keys — technical layer only.
 * Not scanned by parent-report-hebrew-copy-guard (parent-facing sources must import from here).
 */

/** Topic/unit contract object key */
export const EDC_CONTRACT_KEY = "engineDecisionContract";

/** Decision code field inside topic contract */
export const EDC_DECISION_FIELD = "engineDecision";

/** Subject-level contract key on subject profile */
export const SP_SUBJECT_ENGINE_CONTRACT = "subjectEngineDecisionContract";

/** Letter/render trace source id */
export const RENDER_SOURCE_SUBJECT_ENGINE = "subjectEngineDecisionContract";

/** Engine decision codes */
export const ED_CLEAR_TOPIC_GAP = "clear_topic_gap";
export const ED_TOPIC_NEEDS_STRENGTHENING = "topic_needs_strengthening";
export const ED_PARTIAL_STABLE = "partial_stable";
export const ED_EARLY_DIRECTION_ONLY = "early_direction_only";
export const ED_INSUFFICIENT_DATA = "insufficient_data";
export const ED_NONE = "none";
export const ED_MASTERY_STABLE = "mastery_stable";
/** Speed-driven mistakes on otherwise-adequate evidence — distinct from a knowledge gap. */
export const ED_SPEED_PRESSURE_PATTERN = "speed_pressure_pattern";

/** Recommended action codes */
export const RA_REMEDIATE_SAME_LEVEL = "remediate_same_level";
export const RA_REMEDIATE_STEP_DOWN = "remediate_step_down";
export const RA_WATCH = "watch";
export const RA_MAINTAIN_AND_STRENGTHEN = "maintain_and_strengthen";
export const RA_MAINTAIN = "maintain";
export const RA_INTERVENE = "intervene";

/** Evidence strength codes */
export const ES_STRONG = "strong";
export const ES_SUPPORTED = "supported";
export const ES_EMERGING = "emerging";
export const ES_NONE = "none";

/** @type {Record<string, number>} */
export const ENGINE_DECISION_RANK = Object.freeze({
  [ED_CLEAR_TOPIC_GAP]: 4,
  [ED_TOPIC_NEEDS_STRENGTHENING]: 3,
  [ED_PARTIAL_STABLE]: 2,
  // Not a knowledge gap — must never rank the same as topic_needs_strengthening.
  [ED_SPEED_PRESSURE_PATTERN]: 1,
  [ED_EARLY_DIRECTION_ONLY]: 1,
  [ED_INSUFFICIENT_DATA]: 0,
  [ED_NONE]: 0,
});

/** @type {Set<string>} */
export const REMEDIATE_ACTION_CODES = new Set([
  RA_REMEDIATE_SAME_LEVEL,
  RA_REMEDIATE_STEP_DOWN,
  RA_INTERVENE,
]);

/**
 * @param {Record<string, unknown>|null|undefined} holder
 */
export function readTopicEngineContract(holder) {
  if (!holder || typeof holder !== "object") return null;
  const c = holder[EDC_CONTRACT_KEY];
  return c && typeof c === "object" ? c : null;
}

/**
 * @param {Record<string, unknown>|null|undefined} contract
 */
export function readEngineDecisionCode(contract) {
  if (!contract || typeof contract !== "object") return "";
  return String(contract[EDC_DECISION_FIELD] || "");
}

/**
 * @param {Record<string, unknown>|null|undefined} sp
 */
export function readSubjectEngineContract(sp) {
  if (!sp || typeof sp !== "object") return null;
  const c = sp[SP_SUBJECT_ENGINE_CONTRACT];
  return c && typeof c === "object" ? c : null;
}
