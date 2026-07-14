/**
 * Parent-facing MCQ preference for worksheet generator — no internal keys in UI.
 * @module lib/worksheets/worksheet-mcq-preference
 */

/**
 * Whether the parent may toggle "שאלות אמריקאיות" for this subject.
 * @param {string} subjectId
 * @returns {boolean}
 */
export function isWorksheetMcqOffered(subjectId) {
  return subjectId === "math" || subjectId === "geometry";
}

/**
 * @deprecated Use isWorksheetMcqOffered — math/geometry always offer the checkbox.
 * @param {string} subjectId
 * @param {string} [_gradeKey]
 * @param {string} [_topicKey]
 * @param {string} [_mathPracticeFormat]
 * @returns {boolean}
 */
export function isWorksheetMcqSupported(subjectId, _gradeKey, _topicKey, _mathPracticeFormat) {
  return isWorksheetMcqOffered(subjectId);
}

/**
 * @param {boolean | undefined | null} preferMcq
 * @returns {boolean | undefined}
 */
export function normalizePreferMcq(preferMcq) {
  if (preferMcq === true) return true;
  if (preferMcq === false) return false;
  return undefined;
}
