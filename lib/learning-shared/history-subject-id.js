/**
 * History canonical subject ids.
 * Activity/DB/reports/diagnostics: history (single id, no hyphen split).
 */

/** @type {"history"} */
export const HISTORY_ACTIVITY_SUBJECT_ID = "history";

/** @type {"history"} */
export const HISTORY_REPORT_SUBJECT_ID = "history";

const ACTIVITY_ALIASES = new Set([HISTORY_ACTIVITY_SUBJECT_ID]);

/**
 * @param {string|null|undefined} subjectId
 * @returns {typeof HISTORY_ACTIVITY_SUBJECT_ID|null}
 */
export function normalizeHistoryActivitySubjectId(subjectId) {
  const s = String(subjectId || "").trim().toLowerCase();
  if (!s) return null;
  if (ACTIVITY_ALIASES.has(s)) return HISTORY_ACTIVITY_SUBJECT_ID;
  return null;
}

/**
 * @param {string|null|undefined} subjectId
 * @returns {typeof HISTORY_REPORT_SUBJECT_ID|null}
 */
export function normalizeHistoryReportSubjectId(subjectId) {
  if (normalizeHistoryActivitySubjectId(subjectId)) {
    return HISTORY_REPORT_SUBJECT_ID;
  }
  return null;
}

/**
 * @param {string|null|undefined} subjectId
 * @returns {boolean}
 */
export function isHistorySubjectAlias(subjectId) {
  return normalizeHistoryActivitySubjectId(subjectId) != null;
}
