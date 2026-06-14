/**
 * Phase 9 — אינטליגנציית טעויות ברמת שורה (v1).
 * טהור לוגית; תוויות עברית מיובאות מ parent-report-ui-explain-he.
 */

import { MISTAKE_PATTERN_LABEL_HE } from "./parent-report-ui-explain-he.js";

/**
 * @param {object} ctx
 * @param {string} ctx.rootCause
 * @param {string} ctx.behaviorType
 * @param {Record<string, boolean>} ctx.riskFlags
 * @param {Record<string, unknown>} ctx.trendDer
 * @param {number} ctx.q
 * @param {number} ctx.accuracy
 * @param {number} ctx.wrongRatio
 * @param {number} ctx.mistakeEventCount
 * @param {string} ctx.evidenceStrength
 * @param {string} ctx.dataSufficiencyLevel
 * @param {string} ctx.conclusionStrength
 * @param {string} [ctx.modeKey]
 * @param {string} [ctx.displayName]
 */
export function buildMistakeIntelligencePhase9(ctx) {
  const q = Number(ctx?.q) || 0;
  const acc = Math.round(Number(ctx?.accuracy) || 0);
  const wr = Math.max(0, Math.min(1, Number(ctx?.wrongRatio) || 0));
  const mC = Number(ctx?.mistakeEventCount) || 0;
  const rootCause = String(ctx?.rootCause || "");
  const behaviorType = String(ctx?.behaviorType || "undetermined");
  const ev = String(ctx?.evidenceStrength || "low");
  const suff = String(ctx?.dataSufficiencyLevel || "low");
  const cs = String(ctx?.conclusionStrength || "");
  const modeKey = String(ctx?.modeKey || "");
  const rf = ctx?.riskFlags && typeof ctx.riskFlags === "object" ? ctx.riskFlags : {};
  const td = ctx?.trendDer && typeof ctx.trendDer === "object" ? ctx.trendDer : /** @type {Record<string, unknown>} */ ({});
  const displayName = String(ctx?.displayName || "הנושא").trim();

  /** @type {string[]} */
  const evidence = [];
  let dominantMistakePattern = "insufficient_mistake_evidence";
  let secondaryMistakePattern = null;
  let mistakeSpecificity = "unknown";
  let mistakeRecurrenceLevel = "unclear";
  let mistakePatternConfidence = 0.35;

  const weakSignal =
    q < 6 ||
    (ev === "low" && suff === "low" && mC < 3) ||
    rootCause === "insufficient_evidence" ||
    cs === "withheld";

  if (mC === 0 && q < 10 && wr < 0.08) {
    dominantMistakePattern = "insufficient_mistake_evidence";
    evidence.push("מעט מדי אירועי טעות מזוהים בטווח לעומת נפח התרגול.");
    mistakePatternConfidence = 0.22;
    mistakeRecurrenceLevel = "isolated";
    mistakeSpecificity = "unknown";
  } else if (weakSignal && mC < 4) {
    dominantMistakePattern = "insufficient_mistake_evidence";
    evidence.push("האות לגבי דפוס טעות חוזר עדיין חלש — לא מדויקים סוג טעות צר.");
    mistakePatternConfidence = 0.28;
    mistakeRecurrenceLevel = q >= 8 ? "unclear" : "isolated";
  } else {
    if (rootCause === "speed_pressure" || behaviorType === "speed_pressure" || (rf.speedOnlyRisk && wr < 0.42)) {
      dominantMistakePattern = "speed_driven_error";
      evidence.push("מסלול מהירות/לחץ זמן מסביר טעויות שאינן בהכרח פער מושגי.");
      if (behaviorType === "knowledge_gap") secondaryMistakePattern = "procedure_break";
      mistakePatternConfidence = Math.min(0.88, 0.55 + (mC >= 5 ? 0.12 : 0));
    } else if (rootCause === "instruction_friction" || behaviorType === "instruction_friction" || rf.hintDependenceRisk) {
      dominantMistakePattern = "instruction_misread";
      evidence.push("תלות בהכוונה/קריאת משימה מסבירה טעויות של ניסוח ולא בהכרח עומק ידע.");
      mistakePatternConfidence = Math.min(0.85, 0.52 + (mC >= 4 ? 0.1 : 0));
    } else if (rootCause === "weak_independence" || (td.independenceDeteriorating && acc >= 72)) {
      dominantMistakePattern = "support_dependent_success";
      evidence.push("הצלחה יחסית לצד ירידה בעצמאות — הטעות נראות קשורות לשחרור עזרה.");
      mistakePatternConfidence = Math.min(0.82, 0.5 + (mC >= 3 ? 0.08 : 0));
    } else if (rootCause === "careless_execution" || behaviorType === "careless_pattern") {
      dominantMistakePattern = "careless_flip";
      evidence.push("שיעור טעויות בינוני לעומת דיוק סביר — דפוס רשלני/ביצועי.");
      mistakePatternConfidence = 0.58;
    } else if (
      rootCause === "knowledge_gap" &&
      behaviorType === "knowledge_gap" &&
      (ev === "strong" || suff === "strong") &&
      acc < 65 &&
      mC >= 6
    ) {
      dominantMistakePattern = wr > 0.38 ? "concept_confusion" : "procedure_break";
      evidence.push("חוזרות טעויות עם דיוק נמוך ונפח טעויות תומך — נראה פער בסדרי פעולה או במושג.");
      mistakePatternConfidence = Math.min(0.86, 0.58 + mC * 0.02);
    } else if (td.fragileProgressPattern || (behaviorType === "fragile_success" && rf.hintDependenceRisk)) {
      dominantMistakePattern = "mixed_mistake_pattern";
      evidence.push("מגמה מעורבת (דיוק מול עצמאות) — לא ננעלים על סוג טעות אחד.");
      mistakePatternConfidence = 0.48;
    } else if (q < 12 && (td.unclearTrend !== false || !td.trendConfOk)) {
      dominantMistakePattern = "early_learning_noise";
      evidence.push("טווח מוקדם או מגמה לא חדה — הטעויות עדיין «רעש למידה».");
      mistakePatternConfidence = 0.4;
    } else {
      dominantMistakePattern = "mixed_mistake_pattern";
      evidence.push("תערובת אותות — דפוס טעות לא חד משמעי.");
      mistakePatternConfidence = 0.45;
    }

    const density = q > 0 ? mC / q : 0;
    if (mC >= 10 || density >= 0.22) mistakeRecurrenceLevel = "persistent";
    else if (mC >= 4 || density >= 0.1 || wr >= 0.18) mistakeRecurrenceLevel = "repeating";
    else if (mC <= 2 && wr < 0.12) mistakeRecurrenceLevel = "isolated";
    else mistakeRecurrenceLevel = "repeating";

    if (density >= 0.2 && mC >= 5) mistakeSpecificity = "narrow";
    else if (dominantMistakePattern === "mixed_mistake_pattern" || dominantMistakePattern === "early_learning_noise")
      mistakeSpecificity = "broad";
    else mistakeSpecificity = "moderate";
  }

  const dominantMistakePatternLabelHe =
    MISTAKE_PATTERN_LABEL_HE[dominantMistakePattern] || MISTAKE_PATTERN_LABEL_HE.insufficient_mistake_evidence;

  const mistakePatternNarrativeHe = `ב«${displayName}» הדפוס הבולט: ${dominantMistakePatternLabelHe}${
    mistakeRecurrenceLevel === "persistent" ? " — חוזר לאורך הטווח." : mistakeRecurrenceLevel === "repeating" ? " — חוזר בינונית." : ""
  }`.trim();

  const mistakeIntelligence = {
    version: 1,
    dominantMistakePattern,
    mistakeRecurrenceLevel,
    mistakeSpecificity,
    mistakePatternConfidence,
  };

  return {
    mistakeIntelligence,
    dominantMistakePattern,
    dominantMistakePatternLabelHe,
    mistakePatternConfidence,
    mistakePatternEvidence: evidence,
    secondaryMistakePattern,
    mistakePatternNarrativeHe,
    mistakeSpecificity,
    mistakeRecurrenceLevel,
  };
}
