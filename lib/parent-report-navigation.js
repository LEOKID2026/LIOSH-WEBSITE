/** Parent report UI — always exit to the parent dashboard (never browser history). */
export const PARENT_DASHBOARD_ROUTE = "/parent/dashboard";
export const SHORT_PARENT_REPORT_ROUTE = "/learning/parent-report";

export function navigateToParentDashboard(router) {
  router.replace(PARENT_DASHBOARD_ROUTE);
}

/**
 * Query for short parent report — preserves period, custom dates, and parent/teacher remote source.
 * @param {import("next/router").NextRouter | { query?: Record<string, unknown> }} routerOrQuery
 */
export function buildShortParentReportQuery(routerOrQuery) {
  const query = routerOrQuery?.query || {};
  const out = {};
  const period = query.period;
  if (typeof period === "string" && period.trim()) out.period = period.trim();
  const start = query.start;
  const end = query.end;
  if (typeof start === "string" && start.trim()) out.start = start.trim();
  if (typeof end === "string" && end.trim()) out.end = end.trim();
  const studentId = query.studentId;
  if (typeof studentId === "string" && studentId.trim()) out.studentId = studentId.trim();
  if (query.source === "parent") out.source = "parent";
  if (query.source === "teacher") out.source = "teacher";
  return out;
}
