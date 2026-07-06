/**
 * Keep parent PWA users inside /parent/ scope when viewing the detailed report.
 * @param {import("next/router").NextRouter["query"] | Record<string, unknown>} query
 */
export function resolveDetailedParentReportPathname(query) {
  return query?.source === "parent"
    ? "/parent/parent-report-detailed"
    : "/learning/parent-report-detailed";
}
