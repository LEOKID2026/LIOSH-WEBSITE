/**
 * Regular parent report — UI-only display transforms (no engine / contract changes).
 */

import { collectTopicEngineRowsFromReport } from "../../utils/parent-report-engine-insights-he.js";
import {
  filterCoreParentReportRows,
  isCoreParentReportRow,
  resolveRegisteredGradeKeyFromReport,
} from "../../utils/parent-report-core-grade-filter.js";
import { getLpdFromRow, rowIsPositiveFromLpd } from "../../utils/learning-pattern-decision/index.js";
import { formatParentReportGradeHe } from "../../utils/parent-report-language/parent-report-display-labels.he.js";
import {
  buildApprovedTopicCopyHe,
  buildRegularReportTopicExplainCardHe,
  cleanRegisteredGradeFromFreeTextHe,
  sanitizeRegularReportFreeTextHe,
  topicTitleForFreeTextHe,
} from "./parent-report-approved-copy-he.js";
import { splitMoledetGeographyReportForDisplay } from "../learning-shared/moledet-geography-display.js";
import {
  buildGradeFilteredTopicMapsForRegularReport,
  formatRegularReportTopicTimeCellHe,
  sumTopicMapMinutes,
} from "./parent-report-regular-time.js";

export {
  buildGradeFilteredTopicMapsForRegularReport,
  formatRegularReportTopicTimeCellHe,
  sumTopicMapMinutes,
};

export { buildRegularReportTopicExplainCardHe };

const REPORT_TOPIC_MAP_KEYS = Object.freeze([
  "mathOperations",
  "geometryTopics",
  "englishTopics",
  "scienceTopics",
  "historyTopics",
  "hebrewTopics",
  "moledetGeographyTopics",
]);

/**
 * Grade column in tables - always show the row's actual grade.
 * @param {Record<string, unknown>} row
 */
export function formatRegularReportGradeCellHe(row) {
  const grade = formatParentReportGradeHe(
    row?.gradeKey ?? row?.grade ?? row?.contentGradeKey ?? row?.contentGradeLevel,
  );
  return grade && grade !== "לא זמין" ? grade : "לא זמין";
}

/**
 * @param {Record<string, Record<string, unknown>>|null|undefined} map
 * @param {string|null|undefined} registeredGradeKey
 */
export function filterTopicMapForRegularReport(map, registeredGradeKey) {
  if (!map || typeof map !== "object") return {};
  const out = /** @type {Record<string, unknown>} */ ({});
  for (const [key, row] of Object.entries(map)) {
    if (!row || typeof row !== "object") continue;
    if (registeredGradeKey && !isCoreParentReportRow(row, registeredGradeKey)) continue;
    out[key] = row;
  }
  return out;
}

export function topicMapEntriesForRegularReport(map, registeredGradeKey) {
  return Object.entries(filterTopicMapForRegularReport(map, registeredGradeKey));
}

/** @deprecated use topicTitleForFreeTextHe */
export function cleanTopicLabelForRegularReportHe(label, row, registeredGradeKey) {
  return topicTitleForFreeTextHe(label, registeredGradeKey, row);
}

export function formatRegularReportTopicLabelHe(baseLabel, row, registeredGradeKey) {
  return topicTitleForFreeTextHe(baseLabel, registeredGradeKey, row);
}

function rowNeedsProminentFinding(row) {
  const lpd = getLpdFromRow(row);
  const q = Number(row.questions) || 0;
  if (q <= 0) return false;
  if (lpd) {
    if (lpd.topicStatus === "not_practiced" || (lpd.practicedQuestions || 0) <= 0) return false;
    if (lpd.topicStatus === "initial_data" || lpd.findingType === "initial_topic_data") return false;
    if ((lpd.practicedQuestions || 0) <= 2 && !/סדרות/i.test(String(row.label || ""))) return false;
    const ft = String(lpd.findingType || "");
    const ts = String(lpd.topicStatus || "");
    if (ft === "difficulty_pattern" || ft === "practice_focus" || ft === "mixed_pattern") return true;
    if (ts === "difficulty_observed" || ts === "difficulty_repeated" || ts === "practice_focus" || ts === "mixed") {
      return true;
    }
    if (rowIsPositiveFromLpd(row)) return false;
  }
  const acc = Number(row.accuracy) || 0;
  if (q >= 3 && acc < 72) return true;
  if (q <= 3 && /סדרות/i.test(String(row.label || ""))) return true;
  return false;
}

function rowQualifiesAsTopicStrength(row) {
  const q = Number(row.questions) || 0;
  const acc = Math.round(Number(row.accuracy) || 0);
  if (q < 5 || acc < 80) return false;
  const lpd = getLpdFromRow(row);
  if (lpd) {
    if ((lpd.practicedQuestions || 0) < 5) return false;
    return rowIsPositiveFromLpd(row);
  }
  return acc >= 80;
}

function prepareRow(row, registeredGradeKey) {
  return {
    ...row,
    label: topicTitleForFreeTextHe(String(row.label || row.displayName || ""), registeredGradeKey, row),
  };
}

export function buildRegularReportProminentFindingLineHe(row, registeredGradeKey) {
  if (!rowNeedsProminentFinding(row)) return "";
  const copy = buildApprovedTopicCopyHe(prepareRow(row, registeredGradeKey), registeredGradeKey);
  const line = copy.prominent || "";
  return line
    ? sanitizeRegularReportFreeTextHe(line, registeredGradeKey, copy.title)
    : "";
}

export function buildRegularReportProminentFindingLinesHe(report, topicRows = null) {
  const registeredGradeKey = resolveRegisteredGradeKeyFromReport(report);
  const rows = (topicRows || collectTopicEngineRowsFromReport(report)).map((r) =>
    prepareRow(r, registeredGradeKey),
  );
  const candidates = rows.filter(rowNeedsProminentFinding);
  candidates.sort((a, b) => {
    const accDiff = (Number(a.accuracy) || 0) - (Number(b.accuracy) || 0);
    if (accDiff !== 0) return accDiff;
    return (Number(b.questions) || 0) - (Number(a.questions) || 0);
  });

  const out = [];
  const seen = new Set();
  for (const row of candidates) {
    const line = buildRegularReportProminentFindingLineHe(row, registeredGradeKey);
    if (!line) continue;
    const key = line.slice(0, 64);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length >= 5) break;
  }
  return out;
}

export function buildRegularReportTopicStrengthLineHe(row, registeredGradeKey) {
  if (!rowQualifiesAsTopicStrength(row)) return "";
  const copy = buildApprovedTopicCopyHe(prepareRow(row, registeredGradeKey), registeredGradeKey);
  if (copy.strength) {
    return sanitizeRegularReportFreeTextHe(copy.strength, registeredGradeKey, copy.title);
  }
  const topic = copy.title;
  const q = Number(row.questions) || 0;
  const acc = Math.round(Number(row.accuracy) || 0);
  const line = `${topic}: התרגול נראה יציב - ${q} שאלות, דיוק ${acc}%.`;
  return sanitizeRegularReportFreeTextHe(line, registeredGradeKey, topic);
}

export function buildRegularReportTopicStrengthLinesHe(report, topicRows = null) {
  const registeredGradeKey = resolveRegisteredGradeKeyFromReport(report);
  const rows = (topicRows || collectTopicEngineRowsFromReport(report)).map((r) =>
    prepareRow(r, registeredGradeKey),
  );
  const stable = rows.filter(rowQualifiesAsTopicStrength);
  stable.sort((a, b) => (Number(b.accuracy) || 0) - (Number(a.accuracy) || 0));

  const out = [];
  const seenTopics = new Set();
  for (const row of stable) {
    const topicKey = String(row.topicKey || row.rowKey || row.label || "");
    if (seenTopics.has(topicKey)) continue;
    const line = buildRegularReportTopicStrengthLineHe(row, registeredGradeKey);
    if (!line) continue;
    seenTopics.add(topicKey);
    out.push(line);
    if (out.length >= 4) break;
  }
  return out;
}

function buildStructuredInsightFromTopicRows(report, topicRows) {
  const registeredGradeKey = resolveRegisteredGradeKeyFromReport(report);
  const rows = topicRows.map((r) => prepareRow(r, registeredGradeKey));
  const attention = rows.filter(rowNeedsProminentFinding);
  attention.sort((a, b) => (Number(a.accuracy) || 0) - (Number(b.accuracy) || 0));
  const strengths = rows.filter(rowQualifiesAsTopicStrength);
  strengths.sort((a, b) => (Number(b.accuracy) || 0) - (Number(a.accuracy) || 0));

  const strengthBullets = [];
  for (const row of strengths) {
    if (strengthBullets.length >= 3) break;
    const copy = buildApprovedTopicCopyHe(row, registeredGradeKey);
    if (copy.strength) {
      strengthBullets.push(copy.strength);
    } else {
      const line = buildRegularReportTopicStrengthLineHe(row, registeredGradeKey);
      if (line) strengthBullets.push(line);
    }
  }

  const focusBullets = [];
  const homeTips = [];
  for (const row of attention) {
    if (focusBullets.length >= 3) break;
    const copy = buildApprovedTopicCopyHe(row, registeredGradeKey);
    if (copy.focusLine) {
      focusBullets.push(`${copy.title}: ${copy.focusLine}`);
    } else if (copy.whatItMeans) {
      focusBullets.push(`${copy.title}: ${copy.whatItMeans}`);
    } else {
      const line = buildRegularReportProminentFindingLineHe(row, registeredGradeKey);
      if (line) focusBullets.push(line);
    }
    if (copy.homeAction && homeTips.length < 3) {
      homeTips.push(`ב${copy.title}: ${copy.homeAction}`);
    }
  }

  const strengthTopics = strengthBullets.map((s) => s.split(":")[0]).filter(Boolean);
  const focusTopics = focusBullets.map((f) => f.split(":")[0]).filter(Boolean);

  let summary = "";
  if (strengthTopics.length && focusTopics.length) {
    summary =
      "בדוח הזה רואים תרגול יציב יחסית, אבל יש כמה נושאים שכדאי לשים אליהם לב. " +
      `${strengthTopics[0]} נראה יציב יותר, בעוד שב${focusTopics.slice(0, 3).join(", ")} מופיעות טעויות שחוזרות.`;
  } else if (focusTopics.length) {
    summary = `בדוח הזה יש כמה נושאים שכדאי לשים אליהם לב: ${focusTopics.slice(0, 3).join(", ")}.`;
  } else if (strengthTopics.length) {
    summary = `בדוח הזה התרגול נראה יציב יחסית, בעיקר ב${strengthTopics[0]}.`;
  }

  return {
    summary,
    strengths: strengthBullets,
    focusAreas: focusBullets,
    homeTips: homeTips.slice(0, 3),
    cautionNote: "",
  };
}

export function transformRegularReportParentAiExplanation(explanation, report) {
  if (!explanation?.ok) return explanation;
  const topicRows = collectTopicEngineRowsFromReport(report);
  const rebuilt = buildStructuredInsightFromTopicRows(report, topicRows);

  if (!rebuilt.summary && !rebuilt.strengths.length && !rebuilt.focusAreas.length) {
    return explanation;
  }

  return {
    ...explanation,
    structured: {
      summary: rebuilt.summary,
      strengths: rebuilt.strengths,
      focusAreas: rebuilt.focusAreas,
      homeTips: rebuilt.homeTips,
      cautionNote: "",
    },
  };
}

export function buildRegularReportDisplayModel(report) {
  const registeredGradeKey = resolveRegisteredGradeKeyFromReport(report);
  const topicRows = collectTopicEngineRowsFromReport(report);
  return {
    registeredGradeKey,
    topicRows,
    prominentFindingLinesHe: buildRegularReportProminentFindingLinesHe(report, topicRows),
    topicStrengthLinesHe: buildRegularReportTopicStrengthLinesHe(report, topicRows),
    filterMap: (map) => filterTopicMapForRegularReport(map, registeredGradeKey),
    mapEntries: (map) => topicMapEntriesForRegularReport(map, registeredGradeKey),
    formatTopicLabel: (label, row) => topicTitleForFreeTextHe(label, registeredGradeKey, row),
    formatGradeCell: (row) => formatRegularReportGradeCellHe(row),
    transformAiExplanation: (explanation) => transformRegularReportParentAiExplanation(explanation, report),
  };
}

/**
 * @param {Record<string, { questions?: number, correct?: number, timeMinutes?: number }>|null|undefined} map
 */
function aggregateTopicMapMetrics(map) {
  let questions = 0;
  let correct = 0;
  for (const row of Object.values(map || {})) {
    if (!row || typeof row !== "object") continue;
    questions += Number(row.questions) || 0;
    correct += Number(row.correct) || 0;
  }
  const timeMinutes = sumTopicMapMinutes(map);
  const accuracy = questions > 0 ? Math.round((correct / questions) * 100) : 0;
  return { questions, correct, accuracy, timeMinutes };
}

/**
 * @param {Record<string, unknown>|null|undefined} parentFacing
 * @param {string|null|undefined} registeredGradeKey
 */
function cleanParentFacingForRegularReport(parentFacing, registeredGradeKey) {
  if (!parentFacing || typeof parentFacing !== "object") return parentFacing;
  const cleanLine = (line) =>
    sanitizeRegularReportFreeTextHe(String(line || ""), registeredGradeKey);
  return {
    ...parentFacing,
    insights: Array.isArray(parentFacing.insights)
      ? parentFacing.insights.map(cleanLine).filter(Boolean)
      : parentFacing.insights,
    homeRecommendations: Array.isArray(parentFacing.homeRecommendations)
      ? parentFacing.homeRecommendations.map(cleanLine).filter(Boolean)
      : parentFacing.homeRecommendations,
  };
}

function sanitizeSummaryFreeTextForRegularReport(summary, registeredGradeKey) {
  if (!summary || typeof summary !== "object") return summary;
  const d = summary.diagnosticOverviewHe;
  if (!d || typeof d !== "object") return summary;
  return {
    ...summary,
    diagnosticOverviewHe: {
      ...d,
      practicedSubjectsSummaryHe: d.practicedSubjectsSummaryHe
        ? sanitizeRegularReportFreeTextHe(d.practicedSubjectsSummaryHe, registeredGradeKey)
        : d.practicedSubjectsSummaryHe,
      mainFocusAreaLineHe: d.mainFocusAreaLineHe
        ? sanitizeRegularReportFreeTextHe(d.mainFocusAreaLineHe, registeredGradeKey)
        : d.mainFocusAreaLineHe,
    },
  };
}

/**
 * Recompute summary totals from grade-filtered topic maps (display only).
 * @param {Record<string, unknown>} report
 */
export function rebuildSummaryFromFilteredReport(report) {
  const base = report.summary && typeof report.summary === "object" ? { ...report.summary } : {};
  const math = aggregateTopicMapMetrics(report.mathOperations);
  const geometry = aggregateTopicMapMetrics(report.geometryTopics);
  const english = aggregateTopicMapMetrics(report.englishTopics);
  const science = aggregateTopicMapMetrics(report.scienceTopics);
  const history = aggregateTopicMapMetrics(report.historyTopics);
  const hebrew = aggregateTopicMapMetrics(report.hebrewTopics);
  const mg = splitMoledetGeographyReportForDisplay(report);
  const mgMoledetMinutes = sumTopicMapMinutes(mg.moledetTopics);
  const mgGeographyMinutes = sumTopicMapMinutes(mg.geographyTopics);

  const subjectStats = [
    math,
    geometry,
    english,
    science,
    history,
    hebrew,
    mg.moledetStats,
    mg.geographyStats,
  ];
  let totalQuestions = 0;
  let totalCorrect = 0;
  let totalTimeMinutes = 0;
  for (const s of subjectStats) {
    totalQuestions += s.questions;
    totalCorrect += s.correct;
  }
  totalTimeMinutes =
    math.timeMinutes +
    geometry.timeMinutes +
    english.timeMinutes +
    science.timeMinutes +
    history.timeMinutes +
    hebrew.timeMinutes +
    mgMoledetMinutes +
    mgGeographyMinutes;

  const mgQuestions = mg.moledetStats.questions + mg.geographyStats.questions;
  const mgCorrect = mg.moledetStats.correct + mg.geographyStats.correct;

  const authoritativeMinutes = Number(
    base.creditedLearningMinutes ??
      (base.learningTimeSource === "unified_credited" ? base.totalTimeMinutes : NaN)
  );
  const useAuthoritative =
    base.learningTimeSource === "unified_credited" &&
    Number.isFinite(authoritativeMinutes) &&
    authoritativeMinutes >= 0;

  if (useAuthoritative) {
    totalTimeMinutes = Math.round(authoritativeMinutes * 100) / 100;
  }

  return {
    ...base,
    totalQuestions,
    totalCorrect,
    totalTimeMinutes,
    totalTimeHours:
      totalTimeMinutes > 0
        ? (totalTimeMinutes / 60).toFixed(2)
        : base.totalTimeHours ?? "0.00",
    creditedLearningMinutes: useAuthoritative ? totalTimeMinutes : base.creditedLearningMinutes,
    learningTimeSource: useAuthoritative ? "unified_credited" : base.learningTimeSource,
    learningTimeExclusiveBreakdown:
      base.learningTimeExclusiveBreakdown && typeof base.learningTimeExclusiveBreakdown === "object"
        ? base.learningTimeExclusiveBreakdown
        : undefined,
    overallAccuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    mathQuestions: math.questions,
    mathCorrect: math.correct,
    mathAccuracy: math.accuracy,
    geometryQuestions: geometry.questions,
    geometryCorrect: geometry.correct,
    geometryAccuracy: geometry.accuracy,
    englishQuestions: english.questions,
    englishCorrect: english.correct,
    englishAccuracy: english.accuracy,
    scienceQuestions: science.questions,
    scienceCorrect: science.correct,
    scienceAccuracy: science.accuracy,
    historyQuestions: history.questions,
    historyCorrect: history.correct,
    historyAccuracy: history.accuracy,
    hebrewQuestions: hebrew.questions,
    hebrewCorrect: hebrew.correct,
    hebrewAccuracy: hebrew.accuracy,
    moledetGeographyQuestions: mgQuestions,
    moledetGeographyCorrect: mgCorrect,
    moledetGeographyAccuracy: mgQuestions > 0 ? Math.round((mgCorrect / mgQuestions) * 100) : 0,
  };
}

/**
 * Single view model for the regular parent report — filtered rows + recomputed totals.
 * Does not mutate the source report.
 * @param {Record<string, unknown>|null|undefined} report
 */
export function buildRegularReportViewModel(report) {
  if (!report || typeof report !== "object") return null;
  const registeredGradeKey = resolveRegisteredGradeKeyFromReport(report);

  const filteredMaps = buildGradeFilteredTopicMapsForRegularReport(report, registeredGradeKey);

  const filteredReport = {
    ...report,
    ...filteredMaps,
    parentFacing: cleanParentFacingForRegularReport(report.parentFacing, registeredGradeKey),
    summary: sanitizeSummaryFreeTextForRegularReport(
      rebuildSummaryFromFilteredReport({
        ...report,
        ...filteredMaps,
      }),
      registeredGradeKey,
    ),
  };

  const display = buildRegularReportDisplayModel(filteredReport);

  return {
    registeredGradeKey,
    report: filteredReport,
    display,
  };
}

export {
  collectTopicEngineRowsFromReport,
  filterCoreParentReportRows,
  resolveRegisteredGradeKeyFromReport,
  topicTitleForFreeTextHe,
};
