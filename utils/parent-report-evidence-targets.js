/**
 * Phase 13 — יעדי ראיה לסבב הבא (שפה הורית, מבוסס שורש קושי ומצב ראיות).
 */

import {
  TARGET_EVIDENCE_TYPE_LABEL_HE,
  TARGET_OBSERVATION_WINDOW_LABEL_HE,
} from "./parent-report-ui-explain-he.js";

/**
 * @param {object} ctx
 */
export function buildEvidenceTargetsPhase13(ctx) {
  const root = String(ctx?.rootCause || "");
  const fs = String(ctx?.freshnessState || "");
  const cf = String(ctx?.conclusionFreshness || "");
  const mem = String(ctx?.recommendationMemoryState || "");
  const match = String(ctx?.expectedVsObservedMatch || "");
  const rti = String(ctx?.responseToIntervention || "");
  const mrec = String(ctx?.mistakeRecurrenceLevel || "");
  const ls = String(ctx?.learningStage || "");
  const weakMem = mem === "no_memory" || mem === "light_memory";
  const stale = fs === "stale" || cf === "expired" || cf === "low";

  let targetEvidenceType = "mixed_target";
  if (stale) targetEvidenceType = "fresh_data_needed";
  else if (weakMem) targetEvidenceType = "response_confirmation";
  else if (root === "speed_pressure") targetEvidenceType = "accuracy_confirmation";
  else if (root === "weak_independence") targetEvidenceType = "independence_confirmation";
  else if (ls === "fragile_retention" || ls === "regression_signal") targetEvidenceType = "retention_confirmation";
  else if (mrec === "persistent" || mrec === "repeating") targetEvidenceType = "mistake_reduction_confirmation";
  else if (match === "not_enough_evidence") targetEvidenceType = "response_confirmation";
  else if (rti === "not_enough_evidence") targetEvidenceType = "fresh_data_needed";
  else targetEvidenceType = "accuracy_confirmation";

  let targetObservationWindow = "next_short_cycle";
  if (stale || targetEvidenceType === "fresh_data_needed") targetObservationWindow = "needs_fresh_baseline";
  else if (weakMem || match === "not_enough_evidence") targetObservationWindow = "next_two_cycles";
  else if (ls === "fragile_retention") targetObservationWindow = "next_two_cycles";
  else targetObservationWindow = "next_short_cycle";

  const targetEvidenceTypeLabelHe =
    TARGET_EVIDENCE_TYPE_LABEL_HE[targetEvidenceType] || TARGET_EVIDENCE_TYPE_LABEL_HE.mixed_target;
  const targetObservationWindowLabelHe =
    TARGET_OBSERVATION_WINDOW_LABEL_HE[targetObservationWindow] || TARGET_OBSERVATION_WINDOW_LABEL_HE.unknown;

  const targetSuccessSignalHe =
    targetEvidenceType === "independence_confirmation"
      ? "הצלחה קצרה בסוף המשימה בלי הכוונה באמצע - גם אם לא מושלם."
      : targetEvidenceType === "accuracy_confirmation"
        ? "שני מפגשים קצרים עם דיוק דומה כשהקצב רגוע."
        : targetEvidenceType === "retention_confirmation"
          ? "פתרון נכון אחרי הפסקה קצרה או למחרת - בלי חזרה מיידית לרמז."
          : targetEvidenceType === "mistake_reduction_confirmation"
            ? "פחות טעויות מאותו «דפוס» באותה רמת קושי."
            : targetEvidenceType === "fresh_data_needed"
              ? "סבב תרגול אחד חד עם רישום קצר בסוף - מה השתנה."
              : "מפגש קצר עם אותו כיוון - ולראות אם הילד מגיב עקבית.";

  const targetFailureSignalHe =
    "אם חוזרים בדיוק אותו סוג טעות בלי שינוי - עוצרים ומצמצמים מטרה.";

  const targetIndependenceSignalHe = "פחות עצירות לאמצע משימה כשההוראות ברורות.";

  const targetStabilitySignalHe = "אותה רמת קושי עם תוצאות דומות בשני מפגשים רצופים.";

  const targetFreshnessNeedHe = stale
    ? "כדאי תאריך תרגול עדכני ולא להסתמך רק על מה שנראה מזמן."
    : "מספיק לעקוב אחרי שני מפגשים קצרים לפני שינוי מהותי.";

  const displayName = String(ctx?.displayName || "הנושא").trim();
  const evidenceTargetNarrativeHe = `ב«${displayName}»: ${targetEvidenceTypeLabelHe} · ${targetObservationWindowLabelHe}.`;

  const evidenceTargets = {
    version: 1,
    targetEvidenceType,
    targetObservationWindow,
  };

  return {
    evidenceTargets,
    targetEvidenceType,
    targetEvidenceTypeLabelHe,
    targetObservationWindow,
    targetObservationWindowLabelHe,
    targetSuccessSignalHe,
    targetFailureSignalHe,
    targetIndependenceSignalHe,
    targetStabilitySignalHe,
    targetFreshnessNeedHe,
    evidenceTargetNarrativeHe,
  };
}
