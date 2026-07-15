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
    return "חלק מהמידע מגיע מגרסה קודמת של הדוח - כדאי להתייחס אליו בזהירות.";
  }
  return "עדיין אין מספיק נתונים לתובנה ברורה - כדאי להמשיך לתרגל ולבדוק שוב.";
}
