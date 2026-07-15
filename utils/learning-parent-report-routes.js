/**
 * Canonical browser paths for parent reports under `/learning/*`.
 * Single source of truth for simulator links and QA - pages live in `pages/learning/`.
 */
export const LEARNING_PARENT_REPORT_SHORT_PATH = "/learning/parent-report";
export const LEARNING_PARENT_REPORT_DETAILED_PATH = "/learning/parent-report-detailed";

function appendQuery(path, params) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && String(v) !== "") usp.set(k, String(v));
  }
  const q = usp.toString();
  return q ? `${path}?${q}` : path;
}

/**
 * Short parent report URL. Use `period: "custom"` with YYYY-MM-DD when data spans outside week/month.
 * @param {{ period?: string, startYmd?: string|null, endYmd?: string|null }} [range]
 */
export function learningParentReportShortHref(range = {}) {
  const period = range.period || "week";
  if (period === "custom" && range.startYmd && range.endYmd) {
    return appendQuery(LEARNING_PARENT_REPORT_SHORT_PATH, {
      period: "custom",
      start: range.startYmd,
      end: range.endYmd,
    });
  }
  return appendQuery(LEARNING_PARENT_REPORT_SHORT_PATH, { period });
}

/**
 * Detailed parent report URL (optionally summary mode).
 * @param {{ period?: string, startYmd?: string|null, endYmd?: string|null }} [range]
 * @param {"summary"|"full"|undefined} [displayMode]
 */
export function learningParentReportDetailedHref(range = {}, displayMode) {
  const period = range.period || "week";
  const q = {};
  if (period === "custom" && range.startYmd && range.endYmd) {
    q.period = "custom";
    q.start = range.startYmd;
    q.end = range.endYmd;
  } else {
    q.period = period;
  }
  if (displayMode === "summary") q.mode = "summary";
  return appendQuery(LEARNING_PARENT_REPORT_DETAILED_PATH, q);
}

/** Detailed report, print-friendly summary layout (same page, `mode=summary`). */
export function learningParentReportDetailedSummaryHref(range = {}) {
  return learningParentReportDetailedHref(range, "summary");
}
