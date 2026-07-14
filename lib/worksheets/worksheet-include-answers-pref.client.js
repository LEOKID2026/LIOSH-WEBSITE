/**
 * Persist parent preference for optional answer-key print.
 * @module lib/worksheets/worksheet-include-answers-pref.client
 */

export const WORKSHEET_INCLUDE_ANSWERS_PREF_KEY = "leo_worksheet_include_answers_v1";

/**
 * @returns {boolean}
 */
export function loadWorksheetIncludeAnswersPref() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(WORKSHEET_INCLUDE_ANSWERS_PREF_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * @param {boolean} includeAnswers
 */
export function saveWorksheetIncludeAnswersPref(includeAnswers) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      WORKSHEET_INCLUDE_ANSWERS_PREF_KEY,
      includeAnswers === true ? "true" : "false"
    );
  } catch {
    /* ignore quota / private mode */
  }
}
