/**
 * Deterministic Parent Q&A Question Router — first product gate.
 *
 * Now a thin wrapper around `classifyParentQuestionDeterministic`. The classifier
 * is the real classifier-first architecture (two-tier signal model with payload
 * vocabulary). This file preserves the legacy `QaRouterResult` shape used by
 * `index.js` for backward compatibility.
 *
 * Buckets returned by the classifier are mapped to four router outcomes:
 *   off_topic              -> exitEarly with OFF_TOPIC_RESPONSE_HE
 *   diagnostic_sensitive   -> exitEarly with DIAGNOSTIC_BOUNDARY_RESPONSE_HE
 *   ambiguous_or_unclear   -> exitEarly with AMBIGUOUS_RESPONSE_HE
 *   report_related         -> no early exit; downstream Stage A picks sub-intent
 *
 * For the deterministic classifier, the LLM is never called from this gate.
 * The async path in `index.js` may invoke `classifyParentQuestionViaLlm`
 * separately for ambiguous residuals.
 */

import {
  classifyParentQuestionDeterministic,
  buildTopicClarificationQuestionHe,
  GENERAL_OFF_TOPIC_RESPONSE_HE,
  OFF_TOPIC_RESPONSE_HE,
  DIAGNOSTIC_BOUNDARY_RESPONSE_HE,
  HEALTH_BOUNDARY_RESPONSE_HE,
  PRIVACY_BOUNDARY_RESPONSE_HE,
  PEER_COMPARISON_RESPONSE_HE,
  AMBIGUOUS_RESPONSE_HE,
  CLASSIFIER_THRESHOLDS,
} from "./question-classifier.js";
import {
  hasAnchoredReportRows,
  isVagueTopicSelectionRequest,
} from "./report-row-resolver.js";
import { foldUtteranceForHeMatch } from "./utterance-normalize-he.js";

export {
  OFF_TOPIC_RESPONSE_HE,
  GENERAL_OFF_TOPIC_RESPONSE_HE,
  DIAGNOSTIC_BOUNDARY_RESPONSE_HE,
  HEALTH_BOUNDARY_RESPONSE_HE,
  PRIVACY_BOUNDARY_RESPONSE_HE,
  PEER_COMPARISON_RESPONSE_HE,
  AMBIGUOUS_RESPONSE_HE,
};

/**
 * @typedef {(
 *   "off_topic" |
 *   "ambiguous_or_unclear" |
 *   "unsafe_or_diagnostic_request" |
 *   "unknown_report_question"
 * )} QaRouterIntent
 */

/**
 * @typedef {{
 *   routerIntent: QaRouterIntent;
 *   requiresLlm: boolean;
 *   deterministicResponse: string | null;
 *   exitEarly: boolean;
 *   classifierBucket: import("./question-classifier.js").ClassifierBucket;
 *   classifierConfidence: number;
 *   classifierSource: "deterministic";
 *   classifierSignals: import("./question-classifier.js").ClassifierResult["signals"];
 * }} QaRouterResult
 */

/**
 * Deterministic question router — the first product gate for every parent question.
 *
 * @param {string} utteranceRaw
 * @param {unknown} [payload] — optional report payload; used to derive subject/topic vocabulary.
 * @returns {QaRouterResult}
 */
export function routeParentQuestion(utteranceRaw, payload) {
  const folded = foldUtteranceForHeMatch(utteranceRaw);
  if (hasAnchoredReportRows(payload) && isVagueTopicSelectionRequest(folded)) {
    return {
      routerIntent: "ambiguous_or_unclear",
      requiresLlm: false,
      deterministicResponse: buildTopicClarificationQuestionHe(payload),
      exitEarly: true,
      classifierBucket: "report_related",
      classifierConfidence: 0.72,
      classifierSource: "deterministic",
      classifierSignals: {
        reportSignal: 0.7,
        offTopicSignal: 0,
        diagnosticSignal: 0,
        ambiguitySignal: 0.2,
        hasStrongReportToken: true,
        hasGenericKnowledgeFraming: false,
        subjectTopicNameMatched: false,
        pronounsMatched: false,
        meaningfulTokenCount: 3,
      },
    };
  }

  const result = classifyParentQuestionDeterministic({ utterance: utteranceRaw, payload });

  switch (result.bucket) {
    case "off_topic":
      return {
        routerIntent: "off_topic",
        requiresLlm: false,
        deterministicResponse: GENERAL_OFF_TOPIC_RESPONSE_HE,
        exitEarly: true,
        classifierBucket: result.bucket,
        classifierConfidence: result.confidence,
        classifierSource: "deterministic",
        classifierSignals: result.signals,
      };
    case "health_sensitive":
      return {
        routerIntent: "unsafe_or_diagnostic_request",
        requiresLlm: false,
        deterministicResponse: HEALTH_BOUNDARY_RESPONSE_HE,
        exitEarly: true,
        classifierBucket: result.bucket,
        classifierConfidence: result.confidence,
        classifierSource: "deterministic",
        classifierSignals: result.signals,
      };
    case "privacy_sensitive":
      return {
        routerIntent: "privacy_sensitive_request",
        requiresLlm: false,
        deterministicResponse: PRIVACY_BOUNDARY_RESPONSE_HE,
        exitEarly: true,
        classifierBucket: result.bucket,
        classifierConfidence: result.confidence,
        classifierSource: "deterministic",
        classifierSignals: result.signals,
      };
    case "diagnostic_sensitive":
      return {
        routerIntent: "unsafe_or_diagnostic_request",
        requiresLlm: false,
        deterministicResponse: DIAGNOSTIC_BOUNDARY_RESPONSE_HE,
        exitEarly: true,
        classifierBucket: result.bucket,
        classifierConfidence: result.confidence,
        classifierSource: "deterministic",
        classifierSignals: result.signals,
      };
    case "peer_comparison":
      return {
        routerIntent: "peer_comparison_request",
        requiresLlm: false,
        deterministicResponse: PEER_COMPARISON_RESPONSE_HE,
        exitEarly: true,
        classifierBucket: result.bucket,
        classifierConfidence: result.confidence,
        classifierSource: "deterministic",
        classifierSignals: result.signals,
      };
    case "ambiguous_or_unclear":
      return {
        routerIntent: "ambiguous_or_unclear",
        requiresLlm: false,
        deterministicResponse: AMBIGUOUS_RESPONSE_HE,
        exitEarly: true,
        classifierBucket: result.bucket,
        classifierConfidence: result.confidence,
        classifierSource: "deterministic",
        classifierSignals: result.signals,
      };
    case "report_related":
    default:
      return {
        routerIntent: "unknown_report_question",
        requiresLlm: true,
        deterministicResponse: null,
        exitEarly: false,
        classifierBucket: "report_related",
        classifierConfidence: result.confidence,
        classifierSource: "deterministic",
        classifierSignals: result.signals,
      };
  }
}

/**
 * Map router's product intent to the existing CanonicalParentIntent used downstream.
 * Kept for backward compatibility; legacy callers may still consult this.
 *
 * @param {QaRouterIntent} routerIntent
 * @returns {import("./stage-a-freeform-interpretation.js").CanonicalParentIntent | null}
 */
export function routerIntentToCanonical(routerIntent) {
  switch (routerIntent) {
    case "off_topic": return "off_topic_redirect";
    case "ambiguous_or_unclear": return "unclear";
    case "unsafe_or_diagnostic_request": return "clinical_boundary";
    case "privacy_sensitive_request": return "parent_policy_refusal";
    case "unknown_report_question": return "explain_report";
    default: return null;
  }
}

export default {
  routeParentQuestion,
  routerIntentToCanonical,
  OFF_TOPIC_RESPONSE_HE,
  DIAGNOSTIC_BOUNDARY_RESPONSE_HE,
  PEER_COMPARISON_RESPONSE_HE,
  AMBIGUOUS_RESPONSE_HE,
  CLASSIFIER_THRESHOLDS,
};
