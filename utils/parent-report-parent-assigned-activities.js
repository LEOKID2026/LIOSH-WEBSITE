/**
 * Parent-assigned activity rows for detailed parent report (display slice only).
 */

import { formatParentReportActivityIsrael } from "../lib/learning-supabase/parent-report-activity-time.js";
import {
  formatParentReportGradeHe,
  formatParentReportStatusHe,
  formatParentReportSubjectHe,
  isTechnicalParentActivityTitleHe,
} from "./parent-report-language/parent-report-display-labels.he.js";
import {
  getEnglishTopicName,
  getHebrewTopicName,
  getHistoryTopicName,
  getMathReportBucketDisplayName,
  getMoledetGeographyTopicName,
  getScienceTopicName,
  getTopicName,
} from "./math-report-generator.js";

const REPORT_MAP_KEY = {
  math: "mathOperations",
  geometry: "geometryTopics",
  english: "englishTopics",
  science: "scienceTopics",
  history: "historySubtopics",
  hebrew: "hebrewTopics",
  "moledet-geography": "moledetGeographyTopics",
};

const TOPIC_NAME_FN = {
  math: getMathReportBucketDisplayName,
  geometry: getTopicName,
  english: getEnglishTopicName,
  science: getScienceTopicName,
  history: getHistoryTopicName,
  hebrew: getHebrewTopicName,
  "moledet-geography": getMoledetGeographyTopicName,
};

function topicLabelHe(subjectId, topicKey) {
  const sid = String(subjectId || "").trim();
  const key = String(topicKey || "").trim();
  const fn = TOPIC_NAME_FN[sid];
  if (fn && key) {
    try {
      const label = fn(key);
      if (label && String(label).trim()) return String(label).trim();
    } catch {
      /* fall through */
    }
  }
  return key || "נושא";
}

function formatActivityDateHe(isoOrMs) {
  if (isoOrMs == null || isoOrMs === "") return "לא זמין";
  const ms = typeof isoOrMs === "number" ? isoOrMs : Date.parse(String(isoOrMs));
  if (!Number.isFinite(ms) || ms <= 0) return "לא זמין";
  return formatParentReportActivityIsrael(ms);
}

/**
 * @param {{ titleRaw?: string, subjectId?: string, topicKey?: string, contentGradeKey?: unknown, gradeKey?: unknown }} p
 */
export function buildParentActivityDisplayLabelHe(p) {
  const subjectId = String(p?.subjectId || "").trim();
  const topicKey = String(p?.topicKey || "").trim();
  const topic = topicLabelHe(subjectId, topicKey);
  const subjectLabel = formatParentReportSubjectHe(subjectId);
  const gradeLabel = formatParentReportGradeHe(p?.contentGradeKey ?? p?.gradeKey);
  const titleRaw = String(p?.titleRaw || "").trim();
  const topicSuffix = topic && topic !== "נושא" ? topic : "";
  const subjectGradeFallback =
    subjectLabel && gradeLabel && gradeLabel !== "לא זמין"
      ? `${subjectLabel} כיתה ${gradeLabel}`
      : subjectLabel || "";

  if (!isTechnicalParentActivityTitleHe(titleRaw)) {
    const base = titleRaw || "פעילות אישית מהורה";
    if (topicSuffix) return `${base} - ${topicSuffix}`;
    if (subjectGradeFallback) return `${base} - ${subjectGradeFallback}`;
    return base;
  }

  if (topicSuffix) return `פעילות אישית מהורה - ${topicSuffix}`;
  if (subjectGradeFallback) return `פעילות אישית מהורה - ${subjectGradeFallback}`;
  return "פעילות אישית מהורה";
}

/**
 * @param {Record<string, unknown>} raw
 */
function normalizeAggregateParentActivityRow(raw) {
  const q = Number(raw?.questionCount ?? raw?.questions) || 0;
  const tm = Number(raw?.timeMinutes) || 0;
  if (q <= 0 && tm <= 0) return null;
  const subjectId = String(raw?.subjectId ?? raw?.subject ?? "").trim();
  const topicKey = String(raw?.topicKey ?? raw?.topic ?? "").trim();
  const titleRaw = String(raw?.titleHe ?? raw?.title ?? "").trim();
  return {
    activityId: raw?.activityId ? String(raw.activityId) : null,
    activityLabelHe: buildParentActivityDisplayLabelHe({
      titleRaw,
      subjectId,
      topicKey,
      contentGradeKey: raw?.contentGradeKey ?? raw?.gradeKey,
      gradeKey: raw?.gradeKey,
    }),
    subjectId,
    subjectLabelHe: formatParentReportSubjectHe(subjectId),
    topicKey,
    topicLabelHe: topicLabelHe(subjectId, topicKey),
    gradeLabelHe: formatParentReportGradeHe(raw?.contentGradeKey ?? raw?.gradeKey),
    lastActivityAtHe: formatActivityDateHe(raw?.lastActivityAtIso ?? raw?.lastActivityMs),
    questionCount: q,
    accuracy: Math.round(Number(raw?.accuracy) || 0),
    timeMinutes: Math.round(tm || (Number(raw?.timeMsSum) || 0) / 60000),
    statusLabelHe: raw?.status ? formatParentReportStatusHe(raw.status) : "-",
  };
}

/**
 * @param {Record<string, unknown>} baseReport
 */
function buildFallbackFromTopicMaps(baseReport) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byKey = new Map();

  for (const [subjectId, mapKey] of Object.entries(REPORT_MAP_KEY)) {
    const map = baseReport?.[mapKey];
    if (!map || typeof map !== "object") continue;
    for (const [topicRowKey, row] of Object.entries(map)) {
      if (!row || typeof row !== "object") continue;
      const primary = String(row.primaryEvidenceSource || "").trim();
      const sources = Array.isArray(row.evidenceSources) ? row.evidenceSources : [];
      const isParent =
        primary === "parent_assigned_activity" || sources.includes("parent_assigned_activity");
      if (!isParent) continue;
      const q = Number(row.questions) || 0;
      const tm = Number(row.timeMinutes) || 0;
      if (q <= 0 && tm <= 0) continue;

      const topicBase = String(topicRowKey).split("::grade:")[0] || topicRowKey;
      const gradeKey = row.gradeKey || (topicRowKey.includes("::grade:") ? topicRowKey.split("::grade:")[1] : null);
      const dedupeKey = `${subjectId}|${topicBase}|${gradeKey || ""}`;
      const existing = byKey.get(dedupeKey);
      if (existing) {
        existing.questionCount = (Number(existing.questionCount) || 0) + q;
        existing.correctCount = (Number(existing.correctCount) || 0) + (Number(row.correct) || 0);
        existing.timeMinutes = (Number(existing.timeMinutes) || 0) + tm;
        const accQ = Number(existing.questionCount) || 0;
        existing.accuracy = accQ > 0 ? Math.round(((Number(existing.correctCount) || 0) / accQ) * 100) : 0;
        continue;
      }
      byKey.set(dedupeKey, {
        titleHe: "",
        subjectId,
        topicKey: topicBase,
        contentGradeKey: gradeKey,
        questionCount: q,
        correctCount: Number(row.correct) || 0,
        accuracy: Number(row.accuracy) || 0,
        timeMinutes: tm,
        lastActivityAtIso: row.lastSessionMs || row.latestActivityMs || null,
        status: null,
      });
    }
  }

  return [...byKey.values()]
    .map((raw) => normalizeAggregateParentActivityRow(raw))
    .filter(Boolean);
}

/**
 * @param {Record<string, unknown>|null|undefined} baseReport
 */
export function buildParentAssignedActivitiesInPeriod(baseReport) {
  const fromApi = baseReport?._reportApiPayload?.parentAssignedActivitiesInPeriod;
  const fromBase = baseReport?.parentAssignedActivitiesInPeriod;
  const rawRows = Array.isArray(fromBase)
    ? fromBase
    : Array.isArray(fromApi)
      ? fromApi
      : null;

  const normalized = rawRows
    ? rawRows.map((r) => normalizeAggregateParentActivityRow(r)).filter(Boolean)
    : buildFallbackFromTopicMaps(baseReport);

  return normalized.sort((a, b) =>
    String(b.lastActivityAtHe || "").localeCompare(String(a.lastActivityAtHe || ""), "he")
  );
}
