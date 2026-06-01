/** Hebrew short labels for book UI (child-facing). */

/** @type {Record<string, string>} */
export const GRADE_SHORT_LABELS = Object.freeze({
  g1: "א׳",
  g2: "ב׳",
  g3: "ג׳",
  g4: "ד׳",
  g5: "ה׳",
  g6: "ו׳",
});

/** @type {Record<string, string>} */
export const GRADE_LONG_LABELS = Object.freeze({
  g1: "כיתה א׳",
  g2: "כיתה ב׳",
  g3: "כיתה ג׳",
  g4: "כיתה ד׳",
  g5: "כיתה ה׳",
  g6: "כיתה ו׳",
});

/** @param {string} grade */
export function getGradeShortLabel(grade) {
  return GRADE_SHORT_LABELS[String(grade || "").toLowerCase()] ?? grade;
}

/** @param {string} grade */
export function getGradeLongLabel(grade) {
  return GRADE_LONG_LABELS[String(grade || "").toLowerCase()] ?? grade;
}
