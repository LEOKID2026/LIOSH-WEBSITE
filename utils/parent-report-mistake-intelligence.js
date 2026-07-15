/**
 * Phase 9 — אינטליגנציית טעויות ברמת שורה (v1).
 * טהור לוגית; תוויות עברית מיובאות מ parent-report-ui-explain-he.
 */

import { MISTAKE_PATTERN_LABEL_HE } from "./parent-report-ui-explain-he.js";
import { mapTaxonomyToMistakePatternFamily } from "./parent-report-engine-taxonomy-bridge.js";

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
 * @param {string} [ctx.engineConfidenceTier]
 * @param {string} [ctx.accuracyBand]
 * @param {ReturnType<import("./parent-report-engine-taxonomy-bridge.js").resolveRowTaxonomyMatch>|null} [ctx.taxonomyMatch]
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
  const engineConfidenceTier = String(ctx?.engineConfidenceTier || "");
  const accuracyBand = String(ctx?.accuracyBand || "");
  const taxonomyMatch = ctx?.taxonomyMatch && typeof ctx.taxonomyMatch === "object" ? ctx.taxonomyMatch : null;
  const rf = ctx?.riskFlags && typeof ctx.riskFlags === "object" ? ctx.riskFlags : {};
  const td = ctx?.trendDer && typeof ctx.trendDer === "object" ? ctx.trendDer : /** @type {Record<string, unknown>} */ ({});
  const displayName = String(ctx?.displayName || "הנושא").trim();
  const taxonomyPatternFamily = mapTaxonomyToMistakePatternFamily(taxonomyMatch, acc, wr);

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
    evidence.push("האות לגבי דפוס טעות חוזר עדיין חלש - לא מדויקים סוג טעות צר.");
    mistakePatternConfidence = 0.28;
    mistakeRecurrenceLevel = q >= 8 ? "unclear" : "isolated";
  } else if (
    (accuracyBand === "mastery" || (accuracyBand === "partial_good" && acc >= 70)) &&
    q >= 10 &&
    !rf.strongKnowledgeGapEvidence
  ) {
    dominantMistakePattern = "insufficient_mistake_evidence";
    evidence.push("engine_v1:accuracy_band_no_weakness_pattern");
    mistakePatternConfidence = 0.32;
    mistakeRecurrenceLevel = mC >= 4 ? "repeating" : "isolated";
    mistakeSpecificity = "unknown";
  } else if (taxonomyPatternFamily && taxonomyMatch?.taxonomyMatch && q >= 5) {
    dominantMistakePattern = taxonomyPatternFamily;
    evidence.push(`engine_v1:taxonomy_match:${taxonomyMatch.taxonomyId}`);
    mistakePatternConfidence =
      taxonomyMatch.matchStrength === "strong"
        ? 0.8
        : taxonomyMatch.matchStrength === "moderate"
          ? 0.66
          : 0.52;
  } else if (
    (accuracyBand === "clear_gap" || accuracyBand === "needs_strengthening") &&
    q >= 10 &&
    engineConfidenceTier !== "T0" &&
    engineConfidenceTier !== "T1"
  ) {
    if (rootCause === "speed_pressure" || behaviorType === "speed_pressure" || (rf.speedOnlyRisk && wr < 0.42)) {
      dominantMistakePattern = "speed_driven_error";
      evidence.push("engine_v1:speed_pattern_at_gap_band");
      mistakePatternConfidence = 0.62;
    } else if (acc < 50 || wr > 0.38) {
      dominantMistakePattern = "concept_confusion";
      evidence.push("engine_v1:clear_gap_concept_pattern");
      mistakePatternConfidence = Math.min(0.84, 0.56 + mC * 0.02);
    } else {
      dominantMistakePattern = "procedure_break";
      evidence.push("engine_v1:clear_gap_procedure_pattern");
      mistakePatternConfidence = Math.min(0.82, 0.54 + mC * 0.02);
    }
  } else if (
    (accuracyBand === "clear_gap" || accuracyBand === "needs_strengthening") &&
    q >= 5 &&
    engineConfidenceTier === "T1"
  ) {
    dominantMistakePattern = acc < 50 ? "concept_confusion" : "procedure_break";
    evidence.push("engine_v1:early_direction_gap_pattern");
    mistakePatternConfidence = 0.48;
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
      evidence.push("הצלחה יחסית לצד ירידה בעצמאות - הטעות נראות קשורות לשחרור עזרה.");
      mistakePatternConfidence = Math.min(0.82, 0.5 + (mC >= 3 ? 0.08 : 0));
    } else if (rootCause === "careless_execution" || behaviorType === "careless_pattern") {
      dominantMistakePattern = "careless_flip";
      evidence.push("שיעור טעויות בינוני לעומת דיוק סביר - דפוס רשלני/ביצועי.");
      mistakePatternConfidence = 0.58;
    } else if (
      rootCause === "knowledge_gap" &&
      behaviorType === "knowledge_gap" &&
      (ev === "strong" || suff === "strong") &&
      acc < 65 &&
      mC >= 6
    ) {
      dominantMistakePattern = wr > 0.38 ? "concept_confusion" : "procedure_break";
      evidence.push("חוזרות טעויות עם דיוק נמוך ונפח טעויות תומך - נראה פער בסדרי פעולה או במושג.");
      mistakePatternConfidence = Math.min(0.86, 0.58 + mC * 0.02);
    } else if (td.fragileProgressPattern || (behaviorType === "fragile_success" && rf.hintDependenceRisk)) {
      if (accuracyBand === "needs_strengthening" && !taxonomyMatch?.taxonomyMatch) {
        dominantMistakePattern = "mixed_mistake_pattern";
        evidence.push("מגמה מעורבת (דיוק מול עצמאות) - לא ננעלים על סוג טעות אחד.");
        mistakePatternConfidence = 0.48;
      } else if (accuracyBand === "clear_gap") {
        dominantMistakePattern = acc < 50 ? "concept_confusion" : "procedure_break";
        evidence.push("engine_v1:fragile_but_clear_gap_band");
        mistakePatternConfidence = 0.55;
      } else {
        dominantMistakePattern = "procedure_break";
        evidence.push("engine_v1:fragile_partial_procedure");
        mistakePatternConfidence = 0.5;
      }
    } else if (q < 12 && (td.unclearTrend !== false || !td.trendConfOk)) {
      dominantMistakePattern = "early_learning_noise";
      evidence.push("טווח מוקדם או מגמה לא חדה - הטעויות עדיין \"רעש למידה\".");
      mistakePatternConfidence = 0.4;
    } else if (accuracyBand === "needs_strengthening" && q >= 10) {
      dominantMistakePattern = "procedure_break";
      evidence.push("engine_v1:needs_strengthening_default_procedure");
      mistakePatternConfidence = 0.52;
    } else if (accuracyBand === "clear_gap" && q >= 10) {
      dominantMistakePattern = acc < 50 ? "concept_confusion" : "procedure_break";
      evidence.push("engine_v1:clear_gap_fallback");
      mistakePatternConfidence = 0.54;
    } else {
      dominantMistakePattern = "mixed_mistake_pattern";
      evidence.push("תערובת אותות - דפוס טעות לא חד משמעי.");
      mistakePatternConfidence = 0.45;
    }
  }

  const density = q > 0 ? mC / q : 0;
  if (mistakeRecurrenceLevel === "unclear") {
    if (mC >= 10 || density >= 0.22) mistakeRecurrenceLevel = "persistent";
    else if (mC >= 4 || density >= 0.1 || wr >= 0.18) mistakeRecurrenceLevel = "repeating";
    else if (mC <= 2 && wr < 0.12) mistakeRecurrenceLevel = "isolated";
    else mistakeRecurrenceLevel = "repeating";
  }

  if (mistakeSpecificity === "unknown" && dominantMistakePattern !== "insufficient_mistake_evidence") {
    if (density >= 0.2 && mC >= 5) mistakeSpecificity = "narrow";
    else if (dominantMistakePattern === "mixed_mistake_pattern" || dominantMistakePattern === "early_learning_noise")
      mistakeSpecificity = "broad";
    else mistakeSpecificity = "moderate";
  }

  const dominantMistakePatternLabelHe =
    MISTAKE_PATTERN_LABEL_HE[dominantMistakePattern] || MISTAKE_PATTERN_LABEL_HE.insufficient_mistake_evidence;

  const mistakePatternNarrativeHe = `בנושא ${displayName} הדפוס הבולט: ${dominantMistakePatternLabelHe}${
    mistakeRecurrenceLevel === "persistent" ? " - חוזר לאורך הטווח." : mistakeRecurrenceLevel === "repeating" ? " - חוזר בינונית." : ""
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
