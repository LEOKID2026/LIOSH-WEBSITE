/**
 * History grade gates — teaching content is G6 curriculum only.
 * Student-facing subject tiles and history-master are open to all grades;
 * use these helpers for teacher tooling and parent reports, not child UI gates.
 */import { normalizeGradeLevelToKey } from "../lib/learning-student-defaults.js";

export const HISTORY_TEACH_GRADE = 6;
export const HISTORY_TEACH_GRADE_KEY = "g6";

/**
 * @param {string|number|null|undefined} gradeLevel
 * @returns {number|null} 1–6 or null when unknown
 */
export function parseHistoryGateGrade(gradeLevel) {
  const key = normalizeGradeLevelToKey(gradeLevel);
  if (!key || !/^g[1-6]$/.test(key)) return null;
  return parseInt(key.slice(1), 10);
}

/**
 * G6 only — fail closed when grade is unknown or not sixth grade.
 * @param {string|number|null|undefined} gradeLevel
 * @returns {boolean}
 */
export function isHistoryGradeAllowed(gradeLevel) {
  const key = normalizeGradeLevelToKey(gradeLevel);
  return key === HISTORY_TEACH_GRADE_KEY;
}

/**
 * @param {string|null|undefined} gradeKey e.g. g6
 * @returns {string|null}
 */
export function historyGradeKeyOrNull(gradeKey) {
  const key = normalizeGradeLevelToKey(gradeKey);
  return key === HISTORY_TEACH_GRADE_KEY ? HISTORY_TEACH_GRADE_KEY : null;
}
