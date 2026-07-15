/**
 * Map diagnostic priority codes → parent-facing Hebrew (never show P1–P4 to parents).
 * @param {string|null|undefined} level
 * @returns {string|null}
 */
export function priorityLevelParentLabelHe(level) {
  const k = String(level || "").trim().toUpperCase();
  if (!k) return null;
  switch (k) {
    case "P4":
      return "השבוע כדאי לתת דגש לנושאים האלה - בצעדים קטנים, בלי להילחץ.";
    case "P3":
      return "כדאי לשים לב השבוע ולזמן תרגול קצת יותר סדיר סביב הנושאים האלה.";
    case "P2":
      return "אין צורך בפעולה מיוחדת השבוע - תרגול קצר ורגיל מספיק.";
    case "P1":
      return "אין כרגע נושא שכדאי להתמקד בו - שגרת תרגול קצרה מספיקה.";
    default:
      return null;
  }
}
