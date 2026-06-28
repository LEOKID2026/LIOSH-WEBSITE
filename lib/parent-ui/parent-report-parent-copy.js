/**
 * Parent-report copy helpers — QA polish (labels + one weekly home action). Display only.
 */

export const PARENT_REPORT_WEEKLY_HOME_FALLBACK_HE =
  "להמשיך לתרגל כמה שאלות קצרות כדי שנוכל לזהות כיוון ברור יותר.";

/**
 * One concrete home action for early display in the short report.
 * @param {{ shortContractTop?: object|null, report?: object|null, diagnosticsView?: object|null }} ctx
 */
export function resolveParentReportWeeklyHomeActionHe(ctx) {
  const { shortContractTop, report, diagnosticsView } = ctx || {};
  const candidates = [];

  const doNow = String(shortContractTop?.doNowHe || "").trim();
  if (doNow) candidates.push(doNow);

  const homeRecs = report?.parentFacing?.homeRecommendations;
  if (Array.isArray(homeRecs)) {
    for (const line of homeRecs) {
      const t = String(line || "").trim();
      if (t) {
        candidates.push(t);
        break;
      }
    }
  }

  const rows = diagnosticsView?.rows;
  if (Array.isArray(rows)) {
    for (const row of rows) {
      const sub = row?.sub;
      if (!sub) continue;
      const pa = String(sub.parentActionHe || sub.subjectDoNowHe || "").trim();
      if (pa) {
        candidates.push(pa);
        break;
      }
      const legacy = sub.parentRecommendationsImprove?.[0]?.textHe;
      if (legacy) {
        candidates.push(String(legacy).trim());
        break;
      }
    }
  }

  const mainFocus = String(report?.summary?.diagnosticOverviewHe?.mainFocusAreaLineHe || "").trim();
  if (mainFocus && candidates.length === 0) candidates.push(mainFocus);

  return candidates.find(Boolean) || PARENT_REPORT_WEEKLY_HOME_FALLBACK_HE;
}

/**
 * Merge parentActionHe + legacy parImp into one card payload.
 * @param {{ parentActionHe?: string|null, parImp?: { textHe?: string }[] }} sub
 */
export function mergeParentReportHomeActionHe(sub) {
  const primary = String(sub?.parentActionHe || "").trim();
  if (primary) return primary;
  const legacy = sub?.parImp || sub?.parentRecommendationsImprove || [];
  const first = Array.isArray(legacy) ? legacy[0]?.textHe : null;
  return String(first || "").trim() || null;
}
