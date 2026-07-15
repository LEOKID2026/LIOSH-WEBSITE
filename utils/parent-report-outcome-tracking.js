/**
 * Phase 12 — השוואת צפי מול נצפה (מבוסס זיכרון פרוקסי + RTI/מגמה).
 */

import {
  EXPECTED_OUTCOME_TYPE_LABEL_HE,
  EXPECTED_VS_OBSERVED_MATCH_LABEL_HE,
  FOLLOW_THROUGH_SIGNAL_LABEL_HE,
  OBSERVED_OUTCOME_STATE_LABEL_HE,
} from "./parent-report-ui-explain-he.js";

/**
 * @param {object} ctx — פלט memory + Phase 10–11
 */
export function buildOutcomeTrackingPhase12(ctx) {
  const sig = String(ctx?.priorRecommendationSignature || "unknown").trim();
  const rti = String(ctx?.responseToIntervention || "").trim();
  const indep = String(ctx?.independenceProgress || "").trim();
  const td = ctx?.trendDer && typeof ctx.trendDer === "object" ? ctx.trendDer : {};
  const posAcc = !!td.positiveAccuracy;
  const negAcc = !!td.negativeAccuracy;
  const indepUp = String(td.independenceDirection || "") === "up";
  const indepDown = String(td.independenceDirection || "") === "down";
  const q = Number(ctx?.q) || 0;
  const ev = String(ctx?.evidenceStrength || "low");
  const mem = String(ctx?.recommendationMemoryState || "no_memory").trim();
  const carry = String(ctx?.recommendationCarryover || "not_visible").trim();

  let expectedOutcomeType = "unknown";
  if (sig === "guided_accuracy_path") expectedOutcomeType = "accuracy_stabilization";
  else if (sig === "review_hold_path") expectedOutcomeType = "retention_hold";
  else if (sig === "release_transition_path") expectedOutcomeType = "release_readiness";
  else if (sig === "observe_monitor_path") expectedOutcomeType = "evidence_collection";
  else if (sig === "mixed_prior_path") expectedOutcomeType = "unknown";
  else if (sig === "unknown") expectedOutcomeType = "unknown";

  if (
    (ctx?.mistakeRecurrenceLevel === "persistent" || ctx?.mistakeRecurrenceLevel === "repeating") &&
    expectedOutcomeType === "unknown" &&
    q >= 14
  ) {
    expectedOutcomeType = "error_reduction";
  }

  let observedOutcomeState = "not_observable_yet";
  if (q < 10 || (rti === "not_enough_evidence" && ev === "low")) {
    observedOutcomeState = "not_observable_yet";
  } else if (rti === "regression_under_support" || (negAcc && posAcc === false && rti === "stalled_response")) {
    observedOutcomeState = "contradictory_response";
  } else if (indepDown && (sig === "release_transition_path" || expectedOutcomeType === "release_readiness")) {
    observedOutcomeState = "contradictory_response";
  } else if (rti === "early_positive_response" || rti === "independence_growing") {
    observedOutcomeState = "clear_progress";
  } else if (rti === "over_supported_progress" || rti === "mixed_response") {
    observedOutcomeState = "partial_progress";
  } else if (rti === "stalled_response" || (!posAcc && !indepUp && q >= 12)) {
    observedOutcomeState = "flat_response";
  } else if (rti === "not_enough_evidence") {
    observedOutcomeState = "not_observable_yet";
  } else {
    observedOutcomeState = "partial_progress";
  }

  let expectedVsObservedMatch = "not_enough_evidence";
  if (mem === "no_memory" && q < 14) {
    expectedVsObservedMatch = "not_enough_evidence";
  } else if (expectedOutcomeType === "unknown" || observedOutcomeState === "not_observable_yet") {
    expectedVsObservedMatch = "not_enough_evidence";
  } else if (observedOutcomeState === "contradictory_response") {
    expectedVsObservedMatch = "misaligned";
  } else if (
    (expectedOutcomeType === "accuracy_stabilization" && (observedOutcomeState === "clear_progress" || observedOutcomeState === "partial_progress")) ||
    (expectedOutcomeType === "release_readiness" && (rti === "independence_growing" || indepUp || indep === "improving")) ||
    (expectedOutcomeType === "evidence_collection" && q >= 14 && rti !== "stalled_response")
  ) {
    expectedVsObservedMatch = "aligned";
  } else if (
    (expectedOutcomeType === "accuracy_stabilization" && observedOutcomeState === "flat_response") ||
    (expectedOutcomeType === "release_readiness" && !indepUp && indep !== "improving" && rti !== "independence_growing")
  ) {
    expectedVsObservedMatch = "misaligned";
  } else if (observedOutcomeState === "partial_progress") {
    expectedVsObservedMatch = "partly_aligned";
  } else if (observedOutcomeState === "clear_progress") {
    expectedVsObservedMatch = "aligned";
  } else {
    expectedVsObservedMatch = "partly_aligned";
  }

  let followThroughSignal = "not_inferable";
  if (carry === "not_visible" || mem === "no_memory") {
    followThroughSignal = "not_inferable";
  } else if (expectedVsObservedMatch === "aligned" && carry === "clearly_visible") {
    followThroughSignal = "likely_followed";
  } else if (expectedVsObservedMatch === "partly_aligned" && (carry === "partly_visible" || carry === "clearly_visible")) {
    followThroughSignal = "possibly_followed";
  } else if (mem === "light_memory") {
    followThroughSignal = "unclear";
  } else if (expectedVsObservedMatch === "misaligned") {
    followThroughSignal = "unclear";
  } else {
    followThroughSignal = "possibly_followed";
  }

  let outcomeTrackingConfidence = "low";
  if (mem === "strong_memory" && expectedVsObservedMatch !== "not_enough_evidence") outcomeTrackingConfidence = "high";
  else if (mem === "usable_memory" && q >= 14) outcomeTrackingConfidence = "medium";
  else if (mem === "light_memory") outcomeTrackingConfidence = "low";
  else outcomeTrackingConfidence = "low";

  const displayName = String(ctx?.displayName || "הנושא").trim();
  const expLab = EXPECTED_OUTCOME_TYPE_LABEL_HE[expectedOutcomeType] || EXPECTED_OUTCOME_TYPE_LABEL_HE.unknown;
  const obsLab = OBSERVED_OUTCOME_STATE_LABEL_HE[observedOutcomeState] || OBSERVED_OUTCOME_STATE_LABEL_HE.not_observable_yet;
  const matchLab =
    EXPECTED_VS_OBSERVED_MATCH_LABEL_HE[expectedVsObservedMatch] ||
    EXPECTED_VS_OBSERVED_MATCH_LABEL_HE.not_enough_evidence;
  const ftLab = FOLLOW_THROUGH_SIGNAL_LABEL_HE[followThroughSignal] || FOLLOW_THROUGH_SIGNAL_LABEL_HE.not_inferable;

  let outcomeTrackingNarrativeHe = `ב«${displayName}»: ${expLab} · ${obsLab} · ${matchLab}.`;
  if (expectedVsObservedMatch === "misaligned") {
    outcomeTrackingNarrativeHe = `ב«${displayName}»: ${expLab} - ובפועל ${obsLab} - ${matchLab}.`;
  }

  const outcomeTracking = {
    version: 1,
    expectedOutcomeType,
    observedOutcomeState,
    expectedVsObservedMatch,
    followThroughSignal,
    outcomeTrackingConfidence,
  };

  return {
    outcomeTracking,
    expectedOutcomeType,
    expectedOutcomeTypeLabelHe: expLab,
    observedOutcomeState,
    observedOutcomeStateLabelHe: obsLab,
    expectedVsObservedMatch,
    expectedVsObservedMatchHe: matchLab,
    followThroughSignal,
    followThroughSignalHe: ftLab,
    outcomeTrackingConfidence,
    outcomeTrackingNarrativeHe,
  };
}
