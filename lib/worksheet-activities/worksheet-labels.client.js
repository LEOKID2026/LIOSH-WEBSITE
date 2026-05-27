/** @param {string} status */
export function worksheetStatusLabelHe(status) {
  const map = {
    draft: "טיוטה",
    active: "פעיל",
    closed: "סגור",
    archived: "בארכיון",
  };
  return map[String(status || "").toLowerCase()] || status;
}

/** @param {string} mode */
export function worksheetModeLabelHe(mode) {
  const map = {
    pdf_only: "PDF בלבד",
    digital_answers: "גיליון תשובות דיגיטלי",
    manual_grading: "ציון ידני",
  };
  return map[String(mode || "").toLowerCase()] || mode;
}

/** @param {string} gradingStatus */
export function worksheetGradingStatusLabelHe(gradingStatus) {
  const map = {
    not_submitted: "לא הוגש",
    submitted: "הוגש",
    pending_review: "ממתין לבדיקה",
    partially_checked: "נבדק חלקית",
    checked: "נבדק",
    published: "פורסם",
  };
  return map[String(gradingStatus || "").toLowerCase()] || gradingStatus;
}

/** @param {string} questionType */
export function worksheetQuestionTypeLabelHe(questionType) {
  const map = {
    multiple_choice: "בחירה מרובה",
    true_false: "נכון/לא נכון",
    numeric: "מספר",
    short_answer: "תשובה קצרה",
    free_text: "טקסט חופשי",
  };
  return map[String(questionType || "").toLowerCase()] || questionType;
}
