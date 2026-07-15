/**
 * Phase 10 — הערכת תגובה להתערבות / התאמת תמיכה (v1).
 */

import {
  RESPONSE_TO_INTERVENTION_LABEL_HE,
  SUPPORT_ADJUSTMENT_NEED_LABEL_HE,
  SUPPORT_FIT_LABEL_HE,
} from "./parent-report-ui-explain-he.js";

/**
 * @param {object} ctx
 * @param {Record<string, unknown>} [ctx.trendDer]
 * @param {string} ctx.learningStage
 * @param {string} ctx.independenceProgress
 * @param {string} ctx.mistakeRecurrenceLevel
 * @param {string} ctx.dominantMistakePattern
 * @param {string} ctx.retentionRisk
 * @param {Record<string, boolean>} [ctx.riskFlags]
 * @param {number} ctx.q
 * @param {number} ctx.accuracy
 * @param {number} ctx.wrongRatio
 * @param {string} ctx.evidenceStrength
 * @param {string} ctx.dataSufficiencyLevel
 * @param {string} ctx.conclusionStrength
 * @param {string} [ctx.displayName]
 */
export function buildInterventionEffectivenessPhase10(ctx) {
  const td = ctx?.trendDer && typeof ctx.trendDer === "object" ? ctx.trendDer : {};
  const q = Number(ctx?.q) || 0;
  const acc = Math.round(Number(ctx?.accuracy) || 0);
  const wr = Math.max(0, Math.min(1, Number(ctx?.wrongRatio) || 0));
  const learningStage = String(ctx?.learningStage || "");
  const indep = String(ctx?.independenceProgress || "");
  const mrec = String(ctx?.mistakeRecurrenceLevel || "");
  const dmp = String(ctx?.dominantMistakePattern || "");
  const rr = String(ctx?.retentionRisk || "");
  const rf = ctx?.riskFlags && typeof ctx.riskFlags === "object" ? ctx.riskFlags : {};
  const ev = String(ctx?.evidenceStrength || "low");
  const suff = String(ctx?.dataSufficiencyLevel || "low");
  const cs = String(ctx?.conclusionStrength || "");
  const hint = !!rf.hintDependenceRisk;
  const displayName = String(ctx?.displayName || "הנושא").trim();

  const trendOk = !!td.trendConfOk;
  const posAcc = !!td.positiveAccuracy;
  const negAcc = !!td.negativeAccuracy;
  const indepUp = String(td.independenceDirection || "") === "up";
  const indepDown = !!td.independenceDeteriorating;

  /** @type {string[]} */
  const evidence = [];
  let responseToIntervention = "not_enough_evidence";
  let effectivenessConfidence = 0.32;
  let supportFit = "unknown";
  let supportAdjustmentNeed = "monitor_only";

  const weak =
    q < 8 ||
    ev === "low" ||
    cs === "withheld" ||
    dmp === "insufficient_mistake_evidence" ||
    learningStage === "insufficient_longitudinal_evidence";

  if (weak) {
    responseToIntervention = "not_enough_evidence";
    evidence.push("עדיין אין מספיק אות להעריך אם התמיכה הנוכחית «מחזיקה» מגמה.");
    effectivenessConfidence = 0.25;
    supportFit = "unknown";
    supportAdjustmentNeed = "monitor_only";
  } else if (
    learningStage === "regression_signal" &&
    negAcc &&
    trendOk &&
    q >= 12 &&
    ev !== "low"
  ) {
    responseToIntervention = "regression_under_support";
    evidence.push("מגמת דיוק שלילית בטווח - חשוב לבחון אם התמיכה מספיקת או מכוונת נכון.");
    effectivenessConfidence = 0.62;
    supportFit = "poor_fit";
    supportAdjustmentNeed = "change_strategy";
  } else if (posAcc && indepDown && trendOk && q >= 8) {
    responseToIntervention = "mixed_response";
    evidence.push("דיוק משתפר אך העצמאות יורדת - תגובה מעורבת לתמיכה הנוכחית.");
    effectivenessConfidence = 0.44;
    supportFit = "partial_fit";
    supportAdjustmentNeed = "increase_structure";
  } else if ((mrec === "persistent" || mrec === "repeating") && !posAcc && acc < 72) {
    responseToIntervention = "stalled_response";
    evidence.push("טעויות חוזרות בלי שיפור דיוק ברור - נראה שההתקדמות נתקעה.");
    effectivenessConfidence = 0.55;
    supportFit = "partial_fit";
    supportAdjustmentNeed = "tighten_focus";
  } else if (acc >= 78 && (hint || learningStage === "fragile_retention") && !indepUp) {
    responseToIntervention = "over_supported_progress";
    evidence.push("דיוק טוב יחסית אך ההצלחה עדיין תלויה בליווי - לא שליטה מלאה בלי עזרה.");
    effectivenessConfidence = 0.58;
    supportFit = "partial_fit";
    supportAdjustmentNeed = "reduce_support";
  } else if (indep === "improving" && indepUp && acc >= 70) {
    responseToIntervention = "independence_growing";
    evidence.push("עולה עצמאות יחסית לצד דיוק סביר - סימן שהכיוון מתחיל להתאים.");
    effectivenessConfidence = Math.min(0.82, 0.55 + (suff === "strong" ? 0.12 : 0));
    supportFit = "good_fit";
    supportAdjustmentNeed = "hold_course";
  } else if (posAcc && trendOk && q >= 10 && acc >= 68 && !negAcc) {
    responseToIntervention = "early_positive_response";
    evidence.push("יש סימנים ראשונים לשיפור - עדיין מוקדם לראות אם זה נשמר בלי תמיכה.");
    effectivenessConfidence = 0.48;
    supportFit = ev === "strong" && suff !== "low" ? "good_fit" : "partial_fit";
    supportAdjustmentNeed = "hold_course";
  } else {
    responseToIntervention = "mixed_response";
    evidence.push("תמונה אמצעית - לא סוגרים אם התמיכה מספיקת או דורשת שינוי.");
    effectivenessConfidence = 0.4;
    supportFit = "partial_fit";
    supportAdjustmentNeed = "monitor_only";
  }

  const responseToInterventionLabelHe =
    RESPONSE_TO_INTERVENTION_LABEL_HE[responseToIntervention] ||
    RESPONSE_TO_INTERVENTION_LABEL_HE.not_enough_evidence;

  const supportFitLabelHe = SUPPORT_FIT_LABEL_HE[supportFit] || SUPPORT_FIT_LABEL_HE.unknown;

  const supportAdjustmentNeedHe =
    SUPPORT_ADJUSTMENT_NEED_LABEL_HE[supportAdjustmentNeed] || SUPPORT_ADJUSTMENT_NEED_LABEL_HE.monitor_only;

  const interventionEffectNarrativeHe = `ב«${displayName}»: ${responseToInterventionLabelHe}. ${supportAdjustmentNeedHe}`;

  const interventionEffectiveness = {
    version: 1,
    responseToIntervention,
    supportFit,
    supportAdjustmentNeed,
    effectivenessConfidence,
  };

  return {
    interventionEffectiveness,
    responseToIntervention,
    responseToInterventionLabelHe,
    effectivenessConfidence,
    effectivenessEvidence: evidence,
    supportFit,
    supportFitLabelHe,
    supportAdjustmentNeed,
    supportAdjustmentNeedHe,
    interventionEffectNarrativeHe,
  };
}
