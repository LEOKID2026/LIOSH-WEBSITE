/**
 * Product semantic intent labels (telemetry, tests, analytics).
 * These are **category names** (ask_strengths, main_focus, …), not display copy
 * and not the internal {@link import("./stage-a-freeform-interpretation.js").CanonicalParentIntent} strings
 * used in contracts and routing.
 *
 * Mapping is many-to-one: several parent phrasings → one category; answers still
 * come from grounded report data + validators, not from FAQ tables.
 */

/**
 * @typedef {(
 *   "ask_strengths" |
 *   "ask_weaknesses" |
 *   "explain_report" |
 *   "home_practice" |
 *   "main_focus" |
 *   "subject_specific" |
 *   "topic_specific" |
 *   "off_topic" |
 *   "diagnostic_sensitive" |
 *   "peer_comparison" |
 *   "ambiguous_or_unclear" |
 *   "other"
 * )} SemanticParentIntent
 */

/**
 * @param {string} canonical - {@link import("./stage-a-freeform-interpretation.js").CanonicalParentIntent}
 * @returns {SemanticParentIntent | null}
 */
export function semanticIntentFromCanonical(canonical) {
  const k = String(canonical || "").trim();
  switch (k) {
    case "what_is_going_well":
      return "ask_strengths";
    case "what_is_still_difficult":
    case "what_not_to_do_now":
      return "ask_weaknesses";
    case "explain_report":
      return "explain_report";
    case "what_is_most_important":
    case "strength_vs_weakness_summary":
      return "main_focus";
    case "what_to_do_today":
    case "what_to_do_this_week":
      return "home_practice";
    case "ask_subject_specific":
      return "subject_specific";
    case "ask_topic_specific":
      return "topic_specific";
    case "off_topic_redirect":
      return "off_topic";
    case "clinical_boundary":
      return "diagnostic_sensitive";
    case "unclear":
      return "ambiguous_or_unclear";
    default:
      return null;
  }
}

/**
 * Classifier bucket wins for early-exit turns (before Stage A runs).
 * @param {import("./question-classifier.js").ClassifierBucket} bucket
 * @returns {SemanticParentIntent | null}
 */
export function semanticIntentFromClassifierBucket(bucket) {
  switch (bucket) {
    case "off_topic":
      return "off_topic";
    case "diagnostic_sensitive":
      return "diagnostic_sensitive";
    case "peer_comparison":
      return "peer_comparison";
    case "ambiguous_or_unclear":
      return "ambiguous_or_unclear";
    case "report_related":
      return null;
    default:
      return null;
  }
}

/**
 * @param {{ classifierBucket: import("./question-classifier.js").ClassifierBucket; canonicalIntent: string }} args
 * @returns {SemanticParentIntent | null}
 */
export function semanticIntentForMetadata({ classifierBucket, canonicalIntent }) {
  const fromBucket = semanticIntentFromClassifierBucket(classifierBucket);
  if (fromBucket) return fromBucket;
  const fromCanon = semanticIntentFromCanonical(canonicalIntent);
  return fromCanon;
}

export default {
  semanticIntentFromCanonical,
  semanticIntentFromClassifierBucket,
  semanticIntentForMetadata,
};
