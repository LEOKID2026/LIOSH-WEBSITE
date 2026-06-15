/**
 * Short parent report — how we describe diagnostic data source (no engine jargon).
 * @param {string} source raw `report.diagnosticPrimarySource`
 */
export function diagnosticPrimarySourceParentLabelHe(source) {
  const s = String(source || "").trim();
  if (s === "diagnosticEngineV2") {
    return "תובנות לפי השאלות שתורגלו בתקופה שנבחרה.";
  }
  if (s === "legacy_patternDiagnostics_fallback") {
    return "חלק מהתובנות מבוסס על שיטה קודמת (פחות נתונים מעודכנים) — כדאי לקרוא בזהירות.";
  }
  return "מקור התובנות לא זוהה בבירור — מומלץ להמשיך בתרגול ולבדוק שוב מאוחר יותר.";
}
