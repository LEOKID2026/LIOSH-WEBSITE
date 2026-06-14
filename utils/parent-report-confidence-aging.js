/**
 * Phase 10 — התיישנות ראיות / רענון ביטחון במסקנה (v1).
 * משתמש ב recencyScore ובנפח ראיות — בלי תאריכים מדויקים כשאין נתון מלא.
 */

import {
  FRESHNESS_STATE_LABEL_HE,
  CONCLUSION_FRESHNESS_LABEL_HE,
  RECALIBRATION_NEED_LABEL_HE,
} from "./parent-report-ui-explain-he.js";

/**
 * @param {object} ctx
 * @param {number} ctx.recencyScore
 * @param {number} ctx.q
 * @param {string} ctx.evidenceStrength
 * @param {string} ctx.dataSufficiencyLevel
 * @param {string} ctx.conclusionStrength
 * @param {string} [ctx.retentionRisk]
 */
export function buildConfidenceAgingPhase10(ctx) {
  const rs = Number(ctx?.recencyScore);
  const recency = Number.isFinite(rs) ? rs : 55;
  const q = Number(ctx?.q) || 0;
  const ev = String(ctx?.evidenceStrength || "low");
  const suff = String(ctx?.dataSufficiencyLevel || "low");
  const cs = String(ctx?.conclusionStrength || "");
  const rr = String(ctx?.retentionRisk || "");

  let freshnessState = "unknown";
  if (recency >= 82 && q >= 14 && (ev === "strong" || suff === "strong")) freshnessState = "fresh";
  else if (recency >= 55 && q >= 8) freshnessState = "recent_but_partial";
  else if (recency >= 35) freshnessState = "aging";
  else freshnessState = "stale";

  if (q < 6) freshnessState = "unknown";

  let conclusionFreshness = "medium";
  if (freshnessState === "fresh" && ev === "strong") conclusionFreshness = "high";
  else if (freshnessState === "stale" || (freshnessState === "aging" && ev === "low")) conclusionFreshness = "low";
  if (freshnessState === "stale" && cs === "strong") conclusionFreshness = "expired";

  let confidenceDecayApplied = false;
  if ((freshnessState === "aging" || freshnessState === "stale") && (cs === "strong" || cs === "moderate")) {
    confidenceDecayApplied = true;
  }
  if (freshnessState === "stale" && ev !== "strong") {
    confidenceDecayApplied = true;
  }

  let recalibrationNeed = "none";
  if (freshnessState === "stale" || conclusionFreshness === "expired") {
    recalibrationNeed = "structured_recheck";
  } else if (freshnessState === "aging" || conclusionFreshness === "low") {
    recalibrationNeed = "light_review";
  } else if (q < 10 && cs === "strong") {
    recalibrationNeed = "do_not_rely_yet";
  }
  if (rr === "high" && recalibrationNeed === "none") {
    recalibrationNeed = "light_review";
  }

  const freshnessStateLabelHe =
    FRESHNESS_STATE_LABEL_HE[freshnessState] || FRESHNESS_STATE_LABEL_HE.unknown;

  const conclusionFreshnessLabelHe =
    CONCLUSION_FRESHNESS_LABEL_HE[conclusionFreshness] || CONCLUSION_FRESHNESS_LABEL_HE.medium;

  const recalibrationNeedHe =
    RECALIBRATION_NEED_LABEL_HE[recalibrationNeed] || RECALIBRATION_NEED_LABEL_HE.none;

  const confidenceAging = {
    version: 1,
    freshnessState,
    conclusionFreshness,
    recalibrationNeed,
    confidenceDecayApplied,
  };

  return {
    confidenceAging,
    freshnessState,
    freshnessStateLabelHe,
    conclusionFreshness,
    conclusionFreshnessLabelHe,
    confidenceDecayApplied,
    recalibrationNeed,
    recalibrationNeedHe,
  };
}
