/**
 * Phase 12 — זיכרון המלצה/תמיכה (פרוקסי מחלונות מגמה + דפוס Phase 11).
 * לא ממציא היסטוריית צעדים — רק מבהיר עומק זמין ונראות carryover.
 */

import {
  PRIOR_RECOMMENDATION_SIGNATURE_LABEL_HE,
  RECOMMENDATION_CARRYOVER_LABEL_HE,
  RECOMMENDATION_MEMORY_STATE_LABEL_HE,
  SUPPORT_HISTORY_DEPTH_LABEL_HE,
} from "./parent-report-ui-explain-he.js";

/**
 * @param {object} ctx
 * @param {string} [ctx.priorSupportPattern] מ Phase 11
 * @param {object|null} [ctx.trend]
 * @param {object} [ctx.trendDer]
 */
export function buildRecommendationMemoryPhase12(ctx) {
  const q = Number(ctx?.q) || 0;
  const ev = String(ctx?.evidenceStrength || "low");
  const suff = String(ctx?.dataSufficiencyLevel || "low");
  const cs = String(ctx?.conclusionStrength || "");
  const trend = ctx?.trend && typeof ctx.trend === "object" ? ctx.trend : null;
  const w = trend?.windows && typeof trend.windows === "object" ? trend.windows : null;
  const prevAcc = w?.previousComparablePeriod?.accuracy;
  const curAcc = w?.currentPeriod?.accuracy;
  const recentAcc = w?.recentShortWindow?.accuracy;
  const hasPrevCur =
    Number.isFinite(Number(prevAcc)) && Number.isFinite(Number(curAcc));
  const hasRecent = Number.isFinite(Number(recentAcc));
  const hasCurOnly = Number.isFinite(Number(curAcc)) && !hasPrevCur;

  let supportHistoryDepth = "unknown";
  if (!trend || !w) {
    supportHistoryDepth = "unknown";
  } else if (hasPrevCur && hasRecent) {
    supportHistoryDepth = "multi_window";
  } else if (hasPrevCur) {
    supportHistoryDepth = "short_history";
  } else if (hasCurOnly || hasRecent) {
    supportHistoryDepth = "single_window";
  }

  const td = ctx?.trendDer && typeof ctx.trendDer === "object" ? ctx.trendDer : {};
  const trendConfOk = !!td.trendConfOk;

  const ps = String(ctx?.priorSupportPattern || "unknown").trim();
  let priorRecommendationSignature = "unknown";
  if (ps === "guided_then_release") priorRecommendationSignature = "release_transition_path";
  else if (ps === "guided_repeat") priorRecommendationSignature = "guided_accuracy_path";
  else if (ps === "review_hold_repeat") priorRecommendationSignature = "review_hold_path";
  else if (ps === "observe_then_retry") priorRecommendationSignature = "observe_monitor_path";
  else if (ps === "mixed_support_history") priorRecommendationSignature = "mixed_prior_path";
  else priorRecommendationSignature = "unknown";

  let recommendationMemoryState = "no_memory";
  if (q < 8 || cs === "withheld") {
    recommendationMemoryState = "no_memory";
  } else if (q < 12 && ev === "low") {
    recommendationMemoryState = "no_memory";
  } else if (supportHistoryDepth === "unknown" && q < 16) {
    recommendationMemoryState = "light_memory";
  } else if (supportHistoryDepth === "single_window" && q >= 10) {
    recommendationMemoryState = ev === "low" ? "light_memory" : "light_memory";
  } else if (supportHistoryDepth === "short_history" && q >= 12 && (ev === "medium" || ev === "strong")) {
    recommendationMemoryState = trendConfOk ? "usable_memory" : "light_memory";
  } else if (supportHistoryDepth === "multi_window" && q >= 14 && (ev === "medium" || ev === "strong") && suff !== "low") {
    recommendationMemoryState = trendConfOk && q >= 16 ? "strong_memory" : "usable_memory";
  } else if (q >= 14 && hasPrevCur) {
    recommendationMemoryState = "usable_memory";
  } else if (q >= 10) {
    recommendationMemoryState = "light_memory";
  } else {
    recommendationMemoryState = "no_memory";
  }

  const rpm = String(ctx?.recommendedPracticeMode || "");
  const iff = String(ctx?.interventionFormat || "");
  const guidedBand =
    rpm === "slow_guided_accuracy" ||
    rpm === "error_reduction_loop" ||
    rpm === "guided_release" ||
    iff === "guided_practice";
  const reviewBand = rpm === "review_and_hold";
  const observeBand = rpm === "observe_only" || iff === "observation_block";

  let recommendationCarryover = "unclear";
  if (recommendationMemoryState === "no_memory") {
    recommendationCarryover = "not_visible";
  } else if (priorRecommendationSignature === "unknown" || priorRecommendationSignature === "mixed_prior_path") {
    recommendationCarryover = recommendationMemoryState === "light_memory" ? "unclear" : "partly_visible";
  } else if (
    (priorRecommendationSignature === "guided_accuracy_path" && guidedBand) ||
    (priorRecommendationSignature === "review_hold_path" && reviewBand) ||
    (priorRecommendationSignature === "observe_monitor_path" && observeBand) ||
    (priorRecommendationSignature === "release_transition_path" && rpm === "guided_release")
  ) {
    recommendationCarryover =
      recommendationMemoryState === "strong_memory" || recommendationMemoryState === "usable_memory"
        ? "clearly_visible"
        : "partly_visible";
  } else if (priorRecommendationSignature === "release_transition_path" && !guidedBand && observeBand) {
    recommendationCarryover = "partly_visible";
  } else {
    recommendationCarryover =
      recommendationMemoryState === "light_memory" || recommendationMemoryState === "no_memory"
        ? "not_visible"
        : "partly_visible";
  }

  let memoryOfPriorSupportConfidence = "none";
  if (recommendationMemoryState === "strong_memory") memoryOfPriorSupportConfidence = "high";
  else if (recommendationMemoryState === "usable_memory") memoryOfPriorSupportConfidence = "medium";
  else if (recommendationMemoryState === "light_memory") memoryOfPriorSupportConfidence = "low";
  else memoryOfPriorSupportConfidence = "none";

  const displayName = String(ctx?.displayName || "הנושא").trim();
  const stLab =
    RECOMMENDATION_MEMORY_STATE_LABEL_HE[recommendationMemoryState] ||
    RECOMMENDATION_MEMORY_STATE_LABEL_HE.no_memory;
  const depthLab =
    SUPPORT_HISTORY_DEPTH_LABEL_HE[supportHistoryDepth] || SUPPORT_HISTORY_DEPTH_LABEL_HE.unknown;
  const carryLab =
    RECOMMENDATION_CARRYOVER_LABEL_HE[recommendationCarryover] || RECOMMENDATION_CARRYOVER_LABEL_HE.unclear;
  const priorSigLab =
    PRIOR_RECOMMENDATION_SIGNATURE_LABEL_HE[priorRecommendationSignature] ||
    PRIOR_RECOMMENDATION_SIGNATURE_LABEL_HE.unknown;

  const recommendationMemoryNarrativeHe = `ב«${displayName}»: ${stLab} · ${depthLab} · ${priorSigLab} - ${carryLab}.`;

  const recommendationMemory = {
    version: 1,
    recommendationMemoryState,
    priorRecommendationSignature,
    supportHistoryDepth,
    recommendationCarryover,
    memoryOfPriorSupportConfidence,
  };

  return {
    recommendationMemory,
    recommendationMemoryState,
    recommendationMemoryStateLabelHe: stLab,
    priorRecommendationSignature,
    priorRecommendationSignatureLabelHe: priorSigLab,
    supportHistoryDepth,
    supportHistoryDepthLabelHe: depthLab,
    recommendationCarryover,
    recommendationCarryoverLabelHe: carryLab,
    memoryOfPriorSupportConfidence,
    recommendationMemoryNarrativeHe,
  };
}
