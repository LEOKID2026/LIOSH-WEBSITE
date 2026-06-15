/**
 * Enforce server-built parentFacing as the launch authority for parent-facing
 * insights/recommendations when the report was loaded from GET report-data.
 * Suppresses contradictory client-side diagnostic recommendations on thin data.
 */

import { shouldSuppressClientPatternDiagnostics } from "../learning/evidence-quality.js";
import { PARENT_EVIDENCE_VOLUME } from "../../utils/parent-report-language/parent-evidence-matrix.js";

const THIN_DATA_MAX_ANSWERS = PARENT_EVIDENCE_VOLUME.STUDENT_REPORT_THIN_MAX;

/**
 * @param {Record<string, unknown>|null|undefined} apiPayload
 */
export function isServerThinDataReportPayload(apiPayload) {
  const summary = apiPayload?.summary;
  if (!summary || typeof summary !== "object") return false;
  const totalAnswers = Number(summary.totalAnswers) || 0;
  const totalSessions = Number(summary.totalSessions) || 0;
  if (totalAnswers === 0 && totalSessions === 0) return true;
  if (totalAnswers > 0 && totalAnswers < THIN_DATA_MAX_ANSWERS) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} subjectRow
 */
function stripSubjectDiagnosticActions(subjectRow) {
  if (!subjectRow || typeof subjectRow !== "object") return subjectRow;
  return {
    ...subjectRow,
    parentActionHe: null,
    nextWeekGoalHe: null,
    studentRecommendationsImprove: [],
    studentRecommendationsMaintain: [],
    parentRecommendationsImprove: [],
    parentRecommendationsMaintain: [],
  };
}

/**
 * @param {Record<string, unknown>} report
 */
export function suppressClientDiagnosticRecommendations(report) {
  if (!report || typeof report !== "object") return report;

  if (report.analysis && typeof report.analysis === "object") {
    report.analysis = { ...report.analysis, recommendations: [] };
  }

  if (report.patternDiagnostics?.subjects && typeof report.patternDiagnostics.subjects === "object") {
    const subjects = {};
    for (const [key, value] of Object.entries(report.patternDiagnostics.subjects)) {
      subjects[key] = stripSubjectDiagnosticActions(value);
    }
    report.patternDiagnostics = { ...report.patternDiagnostics, subjects };
  }

  report.recommendationDecisionTrace = [];
  return report;
}

/**
 * Apply server parentFacing from the report-data API onto a client-generated base report.
 * @param {Record<string, unknown>} clientReport
 * @param {Record<string, unknown>} apiPayload
 */
export function applyServerParentFacingAuthorityToClientReport(clientReport, apiPayload) {
  if (!clientReport || typeof clientReport !== "object") return clientReport;
  const serverPf = apiPayload?.parentFacing;
  if (!serverPf || typeof serverPf !== "object") return clientReport;

  clientReport.parentFacing = serverPf;
  clientReport._parentFacingAuthority = "server";
  const thinData = isServerThinDataReportPayload(apiPayload);
  const suppressPatterns =
    thinData || shouldSuppressClientPatternDiagnostics(apiPayload);
  clientReport._serverThinData = thinData;
  clientReport._serverDiagnosisSuppressed = suppressPatterns;

  suppressClientDiagnosticRecommendations(clientReport);

  if (suppressPatterns) {
    if (clientReport.patternDiagnostics && typeof clientReport.patternDiagnostics === "object") {
      clientReport.patternDiagnostics = {
        ...clientReport.patternDiagnostics,
        subjects: {},
      };
    }
  }

  return clientReport;
}
