/**
 * דוח הורים קצר (V2) — ניסוח הורי בלבד, פרמטרים בלבד.
 */

export {
  insufficientSubjectQuestionsLineHe,
  zeroEvidenceSubjectLineHe,
  thinEvidenceSubjectLineHe,
} from "./subject-evidence-policy.js";

export function tierStableStrengthHe() {
  return "חוזק יציב";
}

export function tierWeaknessRecurringHe() {
  return "קושי שחוזר על עצמו";
}

export function tierWeaknessSupportHe() {
  return "חיזוק עדין";
}

export function evidenceExampleTitleFallbackHe() {
  return "נושא שנבדק";
}

export function evidenceExampleBodyFallbackHe() {
  return "עדיין אין מספיק פרטים כאן כדי להאריך - עדיף להמשיך בתרגול קצר ואז לחזור לניסוח.";
}

export function v2SubjectMemoryPartialEvidenceHe() {
  return "בחלק מהנושאים עדיין מעט תרגול - עוד כמה שאלות יעשו את התמונה ברורה יותר.";
}

export function v2SubjectDiagnosticRestraintHe() {
  return "עדיין מוקדם לקבוע כיוון ברור על כל הנושאים בבת אחת - עדיף לתת לתרגול עקבי עוד זמן.";
}

/** Short overview when topic engine cannot conclude (2–3 questions, withhold). */
export function v2ShortOverviewCannotConcludeHe() {
  return "הנתונים עדיין חלקיים, ולכן כדאי לאסוף עוד מידע לפני שקובעים כיוון סופי.";
}
