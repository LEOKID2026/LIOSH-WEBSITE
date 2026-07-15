/**
 * Phase 7 — שכבת ריסון אבחוני לפני מסקנות חזקות בשורת נושא.
 * לוגיקה טהורה; לא תלוי ב-React.
 */

import { PARENT_EVIDENCE_VOLUME } from "./parent-report-language/parent-evidence-matrix.js";

/**
 * @typedef {"confirmed"|"likely"|"weak"|"insufficient"|"mixed"} DiagnosticRestraintLevel
 * @typedef {"strong"|"moderate"|"tentative"|"withheld"} ConclusionStrength
 * @typedef {"high"|"medium"|"low"|"insufficient"} DiagnosticConfidenceBand
 */

/**
 * @param {object} ctx
 * @param {number} ctx.q
 * @param {number} ctx.accuracy
 * @param {number} ctx.wrongRatio
 * @param {number} ctx.recencyScore
 * @param {string} ctx.evidenceStrength
 * @param {string} ctx.dataSufficiencyLevel
 * @param {number} ctx.stability01
 * @param {number} ctx.confidence01
 * @param {Record<string, unknown>} ctx.trendDer
 * @param {Record<string, unknown>} ctx.riskFlags
 * @param {Record<string, unknown>|null|undefined} ctx.behaviorProfile
 */
export function computeDiagnosticRestraint(ctx) {
  const q = Number(ctx?.q) || 0;
  const acc = Math.round(Number(ctx?.accuracy) || 0);
  const wrongRatio = Number(ctx?.wrongRatio) || 0;
  const recencyScore = Number.isFinite(Number(ctx?.recencyScore)) ? Number(ctx.recencyScore) : 55;
  const ev = String(ctx?.evidenceStrength || "low");
  const suff = String(ctx?.dataSufficiencyLevel || "low");
  const stab = Number(ctx?.stability01) ?? 0;
  const conf = Number(ctx?.confidence01) ?? 0;
  const trendDer = ctx?.trendDer || {};
  const riskFlags = ctx?.riskFlags || {};
  const behaviorType = String(riskFlags?.behaviorType || ctx?.behaviorProfile?.dominantType || "undetermined");

  /** @type {string[]} */
  const reasons = [];
  /** @type {string[]} */
  const alternativeExplanations = [];

  let level /** @type {DiagnosticRestraintLevel} */ = "confirmed";
  let conclusionStrength /** @type {ConclusionStrength} */ = "strong";
  let band /** @type {DiagnosticConfidenceBand} */ = "high";

  if (q >= PARENT_EVIDENCE_VOLUME.HIGH_VOLUME_MIN && ev !== "low") {
    reasons.push("high_volume_topic_evidence");
    if (level === "weak" || level === "insufficient") level = "likely";
    band = acc >= 78 || acc <= 42 ? "high" : "medium";
  } else if (q <= PARENT_EVIDENCE_VOLUME.INSUFFICIENT_MAX) {
    reasons.push("very_low_volume");
    level = "insufficient";
  } else if (q < PARENT_EVIDENCE_VOLUME.INSIGHT_MIN) {
    reasons.push("low_volume");
    if (level === "confirmed") level = "weak";
  }

  if (suff === "low" || ev === "low") {
    reasons.push("weak_evidence_or_sufficiency");
    if (level === "confirmed") level = "weak";
    band = "low";
  } else if (suff === "medium" || ev === "medium") {
    reasons.push("medium_evidence");
    if (level === "confirmed") level = "likely";
    if (band === "high") band = "medium";
  }

  if (recencyScore < 38) {
    reasons.push("weak_recency");
    if (level === "confirmed") level = "likely";
    if (level === "likely") level = "weak";
  }

  if (stab < 0.32 && q >= PARENT_EVIDENCE_VOLUME.INSIGHT_MIN) {
    reasons.push("unstable_accuracy_signal");
    if (level === "confirmed") level = "likely";
  }

  const speedVsGap =
    !!riskFlags.speedOnlyRisk &&
    (behaviorType === "knowledge_gap" || wrongRatio < 0.22) &&
    acc < 72;
  if (speedVsGap) {
    reasons.push("speed_vs_mastery_conflict");
    level = "mixed";
    alternativeExplanations.push("ייתכן שהחולשה קשורה למסלול מהיר או לחץ זמן ולא לפער ידע עמוק.");
  }

  const hintInd =
    !!riskFlags.hintDependenceRisk ||
    (Number(ctx?.behaviorProfile?.signals?.hintRate) >= 0.28 &&
      Number(ctx?.behaviorProfile?.signals?.hintKnownCount) >= 2);
  if (hintInd && acc >= 78) {
    reasons.push("strong_score_weak_independence");
    if (level === "confirmed") level = "likely";
    alternativeExplanations.push("הדיוק גבוה אך יש סימני תלות ברמזים - כדאי לא לפרש כמאסטרי מלא לפני עצמאות.");
  }

  if (trendDer.fragileProgressPattern && behaviorType !== "fragile_success") {
    reasons.push("trend_behavior_mismatch");
    if (level === "confirmed") level = "mixed";
  }

  if (level === "insufficient" || level === "mixed") {
    band = level === "insufficient" ? "insufficient" : "medium";
  }

  if (level === "insufficient" || (level === "weak" && q < 10)) {
    conclusionStrength = "withheld";
  } else if (level === "weak" || level === "mixed") {
    conclusionStrength = "tentative";
  } else if (level === "likely") {
    conclusionStrength = "moderate";
  }

  const fragileClaim = behaviorType === "fragile_success";
  const fragileSupport =
    fragileClaim &&
    (hintInd || trendDer.fragileProgressPattern) &&
    q >= 10 &&
    ev !== "low";
  if (fragileClaim && !fragileSupport) {
    reasons.push("fragile_success_unsupported");
    if (conclusionStrength === "strong") conclusionStrength = "tentative";
    if (level === "confirmed") level = "weak";
    alternativeExplanations.push("פרופיל «הצלחה שבירה» דורש תמיכה במגמה או ברמזים - כרגע זה לא מלא.");
  }

  const kgClaim = behaviorType === "knowledge_gap";
  const kgSupport = !!riskFlags.strongKnowledgeGapEvidence || (q >= PARENT_EVIDENCE_VOLUME.STRONG_MIN && wrongRatio >= 0.26 && acc < 62);
  if (kgClaim && !kgSupport) {
    reasons.push("knowledge_gap_under_evidence");
    if (conclusionStrength === "strong" || conclusionStrength === "moderate") conclusionStrength = "tentative";
    if (level === "confirmed") level = "weak";
    alternativeExplanations.push("פער ידע אמיתי דורש דיוק נמוך יחד עם נפח וטעויות - כאן הנתון עדיין חלקי.");
  }

  const shouldAvoidStrongConclusion =
    conclusionStrength === "withheld" ||
    conclusionStrength === "tentative" ||
    level === "insufficient" ||
    level === "mixed";

  let diagnosticCautionHe =
    "המערכת מצמצמת ניסוח: הנתונים בטווח לא מאפשרים כיוון ברור חזק לגבי מקור הקושי.";
  if (level === "insufficient") {
    diagnosticCautionHe =
      "מעט מדי תרגול בטווח - לא מסיקים מסקנות חזקות; מומלץ לאסוף עוד מפגשים קצרים לפני שינוי מהותי.";
  } else if (level === "mixed") {
    diagnosticCautionHe =
      "יש אותות מנוגדים (למשל מהירות מול פער ידע) - לא ננעל על כיוון אחד לפני עוד תרגול מבוקר.";
  } else if (conclusionStrength === "tentative") {
    diagnosticCautionHe = "מה שמוצג כאן סביר אך לא סופי - כדאי לעקוב ולא לדרוס את הילד בהנחה חדה.";
  }

  return {
    diagnosticRestraint: {
      level,
      reasons,
      behaviorTypeObserved: behaviorType,
    },
    conclusionStrength,
    shouldAvoidStrongConclusion,
    alternativeExplanations,
    diagnosticCautionHe,
    diagnosticConfidenceBand: band,
  };
}
