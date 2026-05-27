/**
 * School portal cache feature flags.
 * Reports default OFF — correctness over performance until verified.
 */

/** List/dashboard/me caching — opt-in only until UI freeze is ruled out. */
export function isSchoolPortalListCacheEnabled() {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SCHOOL_PORTAL_LIST_CACHE === "1") {
    return true;
  }
  return false;
}

/** Class/student report caching — disabled by default. */
export function isSchoolPortalReportCacheEnabled() {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SCHOOL_PORTAL_REPORT_CACHE === "1") {
    return true;
  }
  return false;
}

/**
 * @param {unknown} body
 * @param {"class"|"student"} kind
 */
export function isSchoolReportCacheableBody(body, kind) {
  if (!body || typeof body !== "object") return false;
  const summary = kind === "class" ? body.cohortSummary || body.summary : body.summary;
  if (!summary || typeof summary !== "object") return false;
  const answers = Number(summary.totalAnswers ?? 0);
  const sessions = Number(summary.totalSessions ?? 0);
  const studentsWithActivity = Number(summary.studentsWithActivity ?? 0);
  if (kind === "class") {
    return answers > 0 || sessions > 0 || studentsWithActivity > 0;
  }
  return answers > 0 || sessions > 0;
}
