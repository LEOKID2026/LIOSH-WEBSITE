/**
 * Map engine confidence levels → parent-facing Hebrew (no raw enums in UI).
 */
import { PARENT_EVIDENCE_VOLUME } from "./parent-evidence-matrix.js";

/**
 * @param {string|null|undefined} level
 * @param {number|null|undefined} [questionCount] optional volume guard for strong wording
 * @returns {string}
 */
export function confidenceLevelParentSummaryHe(level, questionCount = null) {
  const k = String(level || "").trim();
  const q =
    questionCount != null && Number.isFinite(Number(questionCount))
      ? Math.max(0, Math.floor(Number(questionCount)))
      : null;
  const belowStrong = q != null && q < PARENT_EVIDENCE_VOLUME.STRONG_MIN;

  switch (k) {
    case "high":
      if (belowStrong) {
        return "יש כיוון ראשוני בנושא הזה, אבל צריך עוד תרגולים כדי לוודא שהוא יציב.";
      }
      return "כבר רואים כיוון עקבי בנושא הזה.";
    case "moderate":
      return "יש כיוון ראשוני בנושא הזה, אבל צריך עוד תרגולים כדי לוודא שהוא יציב.";
    case "low":
      return "עדיין מוקדם לקבוע בנושא הזה, ועוד תרגול יעזור להבין את התמונה.";
    case "early_signal_only":
      return "זה סימן ראשוני בלבד, ולכן עדיין לא קובעים כיוון סופי בנושא הזה.";
    case "insufficient_data":
      return "בתקופה שנבחרה עדיין מעט חומר לנושא - עוד קצת תרגול ייצר תמונה ברורה יותר.";
    case "contradictory":
      return "כרגע התוצאות בנושא הזה לא אחידות, ולכן עוד מוקדם לקבוע כיוון ברור.";
    default:
      return "עדיין לא ברור מה אפשר לקבוע בנושא הזה - נכון לעכשיו עדיף תרגול קצר ולבדוק שוב בהמשך.";
  }
}
