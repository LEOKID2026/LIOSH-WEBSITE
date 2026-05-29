/**
 * Map engine confidence levels → parent-facing Hebrew (no raw enums in UI).
 * @param {string|null|undefined} level
 * @returns {string}
 */
export function confidenceLevelParentSummaryHe(level) {
  const k = String(level || "").trim();
  switch (k) {
    case "high":
      return "כבר רואים כיוון ברור בנושא הזה.";
    case "moderate":
      return "יש כיוון ראשוני בנושא הזה, אבל צריך עוד תרגולים כדי לוודא שהוא יציב.";
    case "low":
      return "עדיין מוקדם לקבוע בנושא הזה, ועוד תרגול יעזור להבין את התמונה.";
    case "early_signal_only":
      return "זה סימן ראשוני בלבד, ולכן עדיין לא קובעים מסקנה בנושא הזה.";
    case "insufficient_data":
      return "בתקופה שנבחרה עדיין מעט חומר לנושא — עוד קצת תרגול ייצר תמונה ברורה יותר.";
    case "contradictory":
      return "כרגע התוצאות בנושא הזה לא אחידות, ולכן עוד מוקדם לקבוע מסקנה.";
    default:
      return "עדיין לא ברור מה אפשר לקבוע בנושא הזה — נכון לעכשיו עדיף תרגול קצר ולבדוק שוב בהמשך.";
  }
}
