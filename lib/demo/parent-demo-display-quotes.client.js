/**
 * Demo-only: replace guillemets / angle quote markers with straight double quotes
 * for parent-visible regular-report text (after client-side insight rebuild).
 */

/** @param {unknown} text */
export function normalizeDemoParentReportQuoteMarkers(text) {
  return String(text || "")
    .replace(/<<([^<>]+?)>>/g, '"$1"')
    .replace(/«([^»]+?)»/g, '"$1"')
    .replace(/&laquo;/gi, '"')
    .replace(/&raquo;/gi, '"')
    .replace(/\u00AB/g, '"')
    .replace(/\u00BB/g, '"');
}

/** @param {unknown} lines */
export function normalizeDemoParentReportQuoteMarkerLines(lines) {
  if (!Array.isArray(lines)) return [];
  return lines.map((line) => normalizeDemoParentReportQuoteMarkers(line)).filter(Boolean);
}

/** @param {Record<string, unknown>|null|undefined} report */
export function isDemoParentReport(report) {
  return report?.demo === true || report?._reportApiPayload?.demo === true;
}

/**
 * @param {Record<string, unknown>} report
 */
export function applyDemoParentReportDisplayQuotes(report) {
  if (!isDemoParentReport(report)) return report;

  if (report.parentFacing && typeof report.parentFacing === "object") {
    const pf = /** @type {Record<string, unknown>} */ ({ ...report.parentFacing });
    if (Array.isArray(pf.insights)) {
      pf.insights = normalizeDemoParentReportQuoteMarkerLines(pf.insights);
    }
    if (Array.isArray(pf.homeRecommendations)) {
      pf.homeRecommendations = normalizeDemoParentReportQuoteMarkerLines(pf.homeRecommendations);
    }
    report.parentFacing = pf;
  }

  const summary = report.summary;
  if (summary && typeof summary === "object") {
    const d = summary.diagnosticOverviewHe;
    if (d && typeof d === "object") {
      report.summary = {
        ...summary,
        diagnosticOverviewHe: {
          ...d,
          practicedSubjectsSummaryHe: d.practicedSubjectsSummaryHe
            ? normalizeDemoParentReportQuoteMarkers(d.practicedSubjectsSummaryHe)
            : d.practicedSubjectsSummaryHe,
          mainFocusAreaLineHe: d.mainFocusAreaLineHe
            ? normalizeDemoParentReportQuoteMarkers(d.mainFocusAreaLineHe)
            : d.mainFocusAreaLineHe,
        },
      };
    }
  }

  return report;
}

/**
 * @param {{ prominentFindingLinesHe?: string[], topicStrengthLinesHe?: string[] }} display
 */
export function applyDemoParentReportDisplayQuotesToDisplayModel(display) {
  if (!display || typeof display !== "object") return display;
  return {
    ...display,
    prominentFindingLinesHe: normalizeDemoParentReportQuoteMarkerLines(display.prominentFindingLinesHe),
    topicStrengthLinesHe: normalizeDemoParentReportQuoteMarkerLines(display.topicStrengthLinesHe),
  };
}

/** @param {string} text */
export function demoParentReportTextHasForbiddenQuoteMarkers(text) {
  return /<<|>>|«|»|\u00AB|\u00BB|&laquo;|&raquo;/i.test(String(text || ""));
}
