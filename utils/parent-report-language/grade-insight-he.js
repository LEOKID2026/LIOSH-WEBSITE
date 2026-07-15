/**
 * Parent-facing insight phrasing that turns ALREADY-COMPUTED facts
 * (gradeRelation, evidenceScope, evidenceSource) into actionable Hebrew meaning.
 *
 * This module ONLY phrases existing data. It never computes scores, accuracy,
 * grade relation, or evidence thresholds — it consumes them.
 *
 *   gradeRelation:  "lower" | "same" | "higher" | "unknown"
 *   evidenceScope:  "prerequisite_foundation" | "registered_grade_primary" | "enrichment_stretch" | "unknown_scope"
 *   evidenceSource: "self_practice" | "parent_assigned_activity" | "learning_book" | "classroom_assigned_activity"
 */

/** Gentle "where did this evidence come from" phrase. Empty string when not meaningful. */
const EVIDENCE_SOURCE_PHRASE_HE = Object.freeze({
  // Parent-assigned provenance is internal only — never shown as a separate parent-report label.
  parent_assigned_activity: "",
  self_practice: "בתרגול עצמאי",
  learning_book: "לאחר עבודה בספר",
  classroom_assigned_activity: "בפעילות מהכיתה",
});

/**
 * @param {string|null|undefined} source
 * @returns {string} phrase like "בפעילות שנשלחה מההורה" or "" when unknown.
 */
export function evidenceSourcePhraseHe(source) {
  const key = String(source || "").trim();
  return EVIDENCE_SOURCE_PHRASE_HE[key] || "";
}

/**
 * Normalize relation → scope when caller only has gradeRelation.
 * @param {string|null|undefined} gradeRelation
 */
export function evidenceScopeFromRelation(gradeRelation) {
  const rel = String(gradeRelation || "").trim();
  if (rel === "same") return "registered_grade_primary";
  if (rel === "lower") return "prerequisite_foundation";
  if (rel === "higher") return "enrichment_stretch";
  return "unknown_scope";
}

/**
 * One actionable sentence that explains what the grade scope MEANS for this topic,
 * given whether the child is succeeding (strength) or struggling (needs support).
 *
 * Returns "" when there is nothing meaningful to add (e.g. unknown relation).
 *
 * @param {{
 *   gradeRelation?: string|null;
 *   evidenceScope?: string|null;
 *   isStrength?: boolean;       // succeeding with enough evidence
 *   needsSupport?: boolean;     // struggling / weak
 *   topicName?: string|null;
 * }} args
 * @returns {string}
 */
export function gradeScopeMeaningHe(args) {
  const rel = String(args?.gradeRelation || "").trim();
  const scope = String(args?.evidenceScope || "").trim() || evidenceScopeFromRelation(rel);
  const isStrength = args?.isStrength === true;
  const needsSupport = args?.needsSupport === true;

  if (scope === "prerequisite_foundation" || rel === "lower") {
    if (needsSupport) {
      return "התרגול בוצע מתחת לכיתה הרשומה, ולכן קושי כאן עשוי להעיד על צורך בחיזוק היסודות בנושא לפני שמתקדמים לרמת הכיתה.";
    }
    if (isStrength) {
      return "התרגול בוצע מתחת לכיתה הרשומה, וההצלחה כאן מעידה על בסיס יציב - אפשר להתקדם לתרגול ברמת הכיתה.";
    }
    return "התרגול בוצע מתחת לכיתה הרשומה, כך שכדאי לקרוא את התוצאה כתמונת בסיס ולא כביצוע ברמת הכיתה.";
  }

  if (scope === "enrichment_stretch" || rel === "higher") {
    if (isStrength) {
      return "הילד הצליח גם מעל רמת הכיתה בנושא הזה - אפשר לשקול להעלות קושי או להתקדם לנושא מתקדם יותר.";
    }
    if (needsSupport) {
      return "התרגול בוצע מעל רמת הכיתה הרשומה, כך שקושי כאן צפוי יותר ולא בהכרח מעיד על פער בתוכן הכיתה.";
    }
    return "התרגול בוצע מעל רמת הכיתה הרשומה - כדאי לקרוא את זה בנפרד מביצוע ברמת הכיתה.";
  }

  if (scope === "registered_grade_primary" || rel === "same") {
    if (isStrength) {
      return "יש שליטה טובה ברמת הכיתה בנושא הזה; אפשר להתקדם בהדרגה - להעלות מעט קושי או לעבור לנושא הבא.";
    }
  }

  return "";
}

/**
 * Optional "you may be over-investing in a topic the child already masters" insight.
 * Caller decides WHEN to use it (e.g. strong + substantial repeated practice).
 * @param {string|null|undefined} topicName
 * @returns {string}
 */
export function masteryReallocationHe(topicName) {
  const name = String(topicName || "").trim();
  return name
    ? `נראה שיש שליטה ב${name}; כדאי לשקול להפנות חלק מזמן התרגול לנושא אחר שכדאי לשים לב אליו יותר.`
    : "נראה שיש שליטה בנושא הזה; כדאי לשקול להפנות חלק מזמן התרגול לנושא אחר שכדאי לשים לב אליו יותר.";
}

export default {
  evidenceSourcePhraseHe,
  evidenceScopeFromRelation,
  gradeScopeMeaningHe,
  masteryReallocationHe,
};
