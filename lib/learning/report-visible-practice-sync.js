/**
 * Sync all parent-report visible practice fields from server/API authority.
 * Runs once after V2 generation + bridge — V2 must not control practice visibility.
 */

import {
  buildNormalizedSubjectPracticeFromApiPayload,
  NORMALIZED_SUBJECT_IDS,
  policySubjectIdFromAggregate,
  REPORT_TOPIC_MAP_KEYS,
  subjectQuestionCountsFromNormalized,
  summarySubjectFieldsFromNormalized,
} from "./normalized-subject-practice.js";
import {
  buildSubjectEvidenceCoverageLines,
  filterInsightLinesForUnpracticedSubjects,
  practicedSubjectsSummaryLineHe,
  SUBJECT_LABEL_BY_ID,
} from "../../utils/parent-report-language/subject-evidence-policy.js";
import { deriveRawMetricStrengthLinesHe } from "../../utils/parent-data-presence.js";
import {
  getEnglishTopicName,
  getHebrewTopicName,
  getHistoryTopicName,
  getMathReportBucketDisplayName,
  getMoledetGeographyTopicName,
  getScienceTopicName,
  getTopicName,
  formatParentReportGradeLabel,
} from "../../utils/math-report-generator.js";
import { formatParentReportActivityIsrael } from "../learning-supabase/parent-report-activity-time.js";
import { sanitizeReportDurationSeconds } from "../parent-server/report-duration-sanity.js";
import { moledetGeographyReportTopicKeyPrefix } from "../learning-shared/moledet-geography-subject-id.js";

const LEVEL_LABELS = Object.freeze({ easy: "קל", medium: "בינוני", hard: "קשה" });

const MODE_LABELS = Object.freeze({
  learning: "למידה",
  practice: "תרגול",
  challenge: "אתגר",
  speed: "מהירות",
  marathon: "תרגול ארוך",
  graded: "מדורג",
  normal: "רגיל",
  mistakes: "טעויות",
  practice_mistakes: "חזרה על שגיאות",
});

function modeLabelFromKey(modeKey) {
  if (modeKey == null || modeKey === "") return "לא זמין";
  return MODE_LABELS[modeKey] || String(modeKey);
}

function levelLabelFromKey(levelKey) {
  if (levelKey == null || levelKey === "") return "לא זמין";
  return LEVEL_LABELS[levelKey] || String(levelKey);
}

function topicDurationSeconds(topic, questions) {
  let durationSeconds = safeFloor(topic.durationSeconds);
  if (durationSeconds <= 0 && questions > 0) {
    const timeMsSum = safeFloor(topic.timeMsSum);
    if (timeMsSum > 0) {
      durationSeconds = sanitizeReportDurationSeconds(Math.round(timeMsSum / 1000), {
        answerCount: questions,
      }).seconds;
    }
  }
  return durationSeconds;
}

function reconcileTopicMapDurationFromSubject(sub, topicMap) {
  const subjectDurationSeconds = safeFloor(sub.durationSeconds);
  if (subjectDurationSeconds <= 0) return;

  const rows = Object.values(topicMap || {});
  const answeredRows = rows.filter((row) => safeFloor(row?.questions) > 0);
  if (!answeredRows.length) return;

  const allocatedSeconds = rows.reduce(
    (sum, row) => sum + Math.max(0, safeFloor(row?.timeMinutes) * 60),
    0,
  );
  const orphanSeconds = Math.max(0, subjectDurationSeconds - allocatedSeconds);
  if (orphanSeconds <= 0) return;

  const totalQuestions = answeredRows.reduce((sum, row) => sum + safeFloor(row?.questions), 0);
  if (totalQuestions <= 0) return;

  let remaining = orphanSeconds;
  answeredRows.forEach((row, idx) => {
    const share =
      idx === answeredRows.length - 1
        ? remaining
        : Math.floor((orphanSeconds * safeFloor(row.questions)) / totalQuestions);
    remaining -= share;
    const nextSeconds = Math.max(0, safeFloor(row.timeMinutes) * 60) + share;
    row.timeMinutes = Math.round(nextSeconds / 60);
    row.timeHours = (row.timeMinutes / 60).toFixed(2);
  });
}

function topicLastSessionMs(topic, questions) {
  if (questions > 0) {
    const lastAnswerMs = Number.isFinite(Number(topic.lastAnswerMs)) ? Number(topic.lastAnswerMs) : null;
    if (Number.isFinite(lastAnswerMs)) return lastAnswerMs;
  }
  const latestMs = Number.isFinite(Number(topic.latestActivityMs)) ? Number(topic.latestActivityMs) : null;
  if (Number.isFinite(latestMs)) return latestMs;
  return null;
}

function topicLastSessionAt(topic, questions) {
  const ms = topicLastSessionMs(topic, questions);
  return Number.isFinite(ms) ? formatParentReportActivityIsrael(ms) : null;
}

const SUBJECT_DISPLAY_NAME_FN = Object.freeze({
  math: getMathReportBucketDisplayName,
  geometry: getTopicName,
  english: getEnglishTopicName,
  science: getScienceTopicName,
  hebrew: getHebrewTopicName,
  history: getHistoryTopicName,
  moledet_geography: getMoledetGeographyTopicName,
});

const ALL_BY_SUBJECT_PREFIX = Object.freeze({
  math: "math_",
  geometry: "geometry_",
  english: "english_",
  science: "science_",
  hebrew: "hebrew_",
  history: "history_",
  moledet_geography: `${moledetGeographyReportTopicKeyPrefix()}_`,
});

function safeFloor(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/**
 * @param {string} topicKey
 * @param {Record<string, unknown>} topic
 * @param {(bucketKey: string) => string} displayNameFn
 */
function topicRowFromDbInputTopic(topicKey, topic, displayNameFn) {
  const questions = safeFloor(topic.total);
  const correct = safeFloor(topic.correct);
  const wrong = safeFloor(topic.wrong);
  const accuracy = questions > 0 ? Math.round((correct / questions) * 100) : 0;
  const durationSeconds = topicDurationSeconds(topic, questions);
  const timeMinutes = Math.round(durationSeconds / 60);
  const bucketKey = String(topic.topicBaseKey || topicKey.split("::grade:")[0] || topicKey).trim() || topicKey;
  const gradeKeyRaw = topic.contentGradeLevel || topic.registeredGradeLevel || null;
  const modeKey = topic.dominantMode || null;
  const levelKey = topic.dominantLevel || null;
  const lastAnswerMs = Number.isFinite(Number(topic.lastAnswerMs)) ? Number(topic.lastAnswerMs) : null;
  const lastSessionMs = topicLastSessionMs(topic, questions);
  const lastSessionAt = topicLastSessionAt(topic, questions);
  const lastAnswerAt =
    Number.isFinite(lastAnswerMs) ? formatParentReportActivityIsrael(lastAnswerMs) : topic.lastAnswerAt || null;
  return {
    bucketKey,
    topicRowKey: topicKey,
    questions,
    correct,
    wrong,
    accuracy,
    timeMinutes,
    timeHours: (timeMinutes / 60).toFixed(2),
    needsPractice: accuracy < 70,
    excellent: accuracy >= 90 && questions >= 10,
    displayName: displayNameFn(bucketKey),
    mode: modeLabelFromKey(modeKey),
    modeKey,
    grade: formatParentReportGradeLabel(gradeKeyRaw),
    gradeKey: gradeKeyRaw,
    registeredGradeKey: topic.registeredGradeLevel || null,
    contentGradeKey: topic.contentGradeLevel || null,
    level: levelLabelFromKey(levelKey),
    levelKey,
    lastSessionAt,
    lastSessionMs,
    latestActivityAt: lastSessionAt || topic.latestActivityAt || null,
    latestActivityMs: lastSessionMs,
    lastAnswerAt,
    lastAnswerMs,
    latestActivitySource: topic.latestActivitySource || null,
  };
}

/**
 * @param {Record<string, unknown>|null|undefined} dbInput
 */
export function buildTopicMapsFromDbInput(dbInput) {
  const subjects =
    dbInput?.subjects && typeof dbInput.subjects === "object" && !Array.isArray(dbInput.subjects)
      ? dbInput.subjects
      : {};
  /** @type {Record<string, Record<string, unknown>>} */
  const maps = {};
  for (const subjectId of NORMALIZED_SUBJECT_IDS) {
    const mapKey = REPORT_TOPIC_MAP_KEYS[subjectId];
    const displayNameFn = SUBJECT_DISPLAY_NAME_FN[subjectId];
    const sub = subjects[subjectId] && typeof subjects[subjectId] === "object" ? subjects[subjectId] : {};
    const topicsIn = sub.topics && typeof sub.topics === "object" ? sub.topics : {};
    const topicMap = {};
    for (const [topicKey, topicRaw] of Object.entries(topicsIn)) {
      const topic = topicRaw && typeof topicRaw === "object" ? topicRaw : {};
      if (safeFloor(topic.total) <= 0) continue;
      topicMap[topicKey] = topicRowFromDbInputTopic(topicKey, topic, displayNameFn);
    }
    reconcileTopicMapDurationFromSubject(sub, topicMap);
    maps[mapKey] = topicMap;
  }
  return maps;
}

/**
 * @param {Record<string, Record<string, unknown>>} topicMaps
 */
function buildAllBySubjectFromTopicMaps(topicMaps) {
  /** @type {Record<string, Record<string, unknown>>} */
  const out = {};
  for (const subjectId of NORMALIZED_SUBJECT_IDS) {
    const mapKey = REPORT_TOPIC_MAP_KEYS[subjectId];
    const prefix = ALL_BY_SUBJECT_PREFIX[subjectId];
    const topicMap = topicMaps[mapKey] || {};
    for (const [k, v] of Object.entries(topicMap)) {
      out[`${prefix}${k}`] = v;
    }
  }
  return out;
}

/**
 * @param {Record<string, unknown>|null|undefined} apiPayload
 */
export function buildChartDailyActivityFromApiPayload(apiPayload) {
  const daily = Array.isArray(apiPayload?.dailyActivity) ? apiPayload.dailyActivity : [];
  const bySubject =
    apiPayload?.dailyActivityBySubject && typeof apiPayload.dailyActivityBySubject === "object"
      ? apiPayload.dailyActivityBySubject
      : apiPayload?._dailyBySubject && typeof apiPayload._dailyBySubject === "object"
        ? apiPayload._dailyBySubject
        : {};

  const subjectChartKeys = Object.freeze({
    math: "mathTopics",
    geometry: "geometryTopics",
    english: "englishTopics",
    science: "scienceTopics",
    hebrew: "hebrewTopics",
    history: "historyTopics",
    moledet_geography: "moledetGeographyTopics",
  });

  return daily
    .map((day) => {
      const date = String(day?.date || "").slice(0, 10);
      if (!date) return null;
      const subjectDay = bySubject[date] && typeof bySubject[date] === "object" ? bySubject[date] : {};
      /** @type {Record<string, unknown>} */
      const row = {
        date,
        timeMinutes: Math.round(safeFloor(day.durationSeconds) / 60),
        questions: safeFloor(day.answers),
      };
      for (const subjectId of NORMALIZED_SUBJECT_IDS) {
        const chartKey = subjectChartKeys[subjectId];
        const counts =
          subjectDay[subjectId] && typeof subjectDay[subjectId] === "object" ? subjectDay[subjectId] : null;
        if (!counts) {
          row[chartKey] = 0;
          continue;
        }
        const topicCount = safeFloor(counts.topicCount);
        const answers = safeFloor(counts.answers);
        row[chartKey] = topicCount > 0 ? topicCount : answers > 0 ? 1 : 0;
      }
      return row;
    })
    .filter(Boolean)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

/**
 * @param {Record<string, unknown>} report
 * @param {{ apiPayload?: Record<string, unknown>, dbInput?: Record<string, unknown> }} sources
 */
export function syncReportVisiblePracticeFromServer(report, sources = {}) {
  if (!report || typeof report !== "object") return report;

  const apiPayload = sources.apiPayload && typeof sources.apiPayload === "object" ? sources.apiPayload : {};
  const dbInput = sources.dbInput && typeof sources.dbInput === "object" ? sources.dbInput : {};

  const normalized = buildNormalizedSubjectPracticeFromApiPayload(apiPayload);
  const subjectQuestionCounts = subjectQuestionCountsFromNormalized(normalized);
  const summaryFields = summarySubjectFieldsFromNormalized(normalized);
  const evidenceCoverage = buildSubjectEvidenceCoverageLines(subjectQuestionCounts, SUBJECT_LABEL_BY_ID);
  const practicedSubjectsSummaryHe = practicedSubjectsSummaryLineHe(
    subjectQuestionCounts,
    SUBJECT_LABEL_BY_ID,
  );

  report._normalizedSubjectPractice = normalized;
  report._practiceVisibilityAuthority = "server";

  if (!report.summary || typeof report.summary !== "object") {
    report.summary = {};
  }
  Object.assign(report.summary, summaryFields);

  const totalQuestions = NORMALIZED_SUBJECT_IDS.reduce(
    (sum, id) => sum + safeFloor(normalized[id]?.questions),
    0,
  );
  const totalCorrect = NORMALIZED_SUBJECT_IDS.reduce(
    (sum, id) => sum + safeFloor(normalized[id]?.correct),
    0,
  );
  if (totalQuestions > 0) {
    report.summary.totalQuestions = totalQuestions;
    report.summary.totalCorrect = totalCorrect;
    report.summary.totalWrong = Math.max(0, totalQuestions - totalCorrect);
    report.summary.overallAccuracy = Math.round((totalCorrect / totalQuestions) * 100);
  }

  const priorOverview =
    report.summary.diagnosticOverviewHe && typeof report.summary.diagnosticOverviewHe === "object"
      ? report.summary.diagnosticOverviewHe
      : {};
  report.summary.diagnosticOverviewHe = {
    ...priorOverview,
    notPracticedSubjectsHe: [],
    thinEvidenceSubjectsHe: evidenceCoverage.thinEvidenceSubjectsHe,
    insufficientDataSubjectsHe: evidenceCoverage.thinEvidenceSubjectsHe,
    notPracticedSubjectsSummaryHe: evidenceCoverage.notPracticedSubjectsSummaryHe,
    practicedSubjectsSummaryHe,
    strongestAreaLineHe: filterInsightLinesForUnpracticedSubjects(
      [priorOverview.strongestAreaLineHe].filter(Boolean),
      subjectQuestionCounts,
      SUBJECT_LABEL_BY_ID,
    )[0] || null,
    mainFocusAreaLineHe: filterInsightLinesForUnpracticedSubjects(
      [priorOverview.mainFocusAreaLineHe].filter(Boolean),
      subjectQuestionCounts,
      SUBJECT_LABEL_BY_ID,
    )[0] || null,
    readyForProgressPreviewHe: filterInsightLinesForUnpracticedSubjects(
      Array.isArray(priorOverview.readyForProgressPreviewHe) ? priorOverview.readyForProgressPreviewHe : [],
      subjectQuestionCounts,
      SUBJECT_LABEL_BY_ID,
    ),
    requiresAttentionPreviewHe: filterInsightLinesForUnpracticedSubjects(
      Array.isArray(priorOverview.requiresAttentionPreviewHe) ? priorOverview.requiresAttentionPreviewHe : [],
      subjectQuestionCounts,
      SUBJECT_LABEL_BY_ID,
    ),
  };

  report.rawMetricStrengthsHe = deriveRawMetricStrengthLinesHe(report.summary, null, null);

  const topicMaps = buildTopicMapsFromDbInput(dbInput);
  for (const subjectId of NORMALIZED_SUBJECT_IDS) {
    const mapKey = REPORT_TOPIC_MAP_KEYS[subjectId];
    report[mapKey] = topicMaps[mapKey] || {};
  }
  report.allBySubject = buildAllBySubjectFromTopicMaps(topicMaps);

  report.dailyActivity = buildChartDailyActivityFromApiPayload(apiPayload);
  const dailyBySubject =
    apiPayload.dailyActivityBySubject && typeof apiPayload.dailyActivityBySubject === "object"
      ? apiPayload.dailyActivityBySubject
      : apiPayload._dailyBySubject && typeof apiPayload._dailyBySubject === "object"
        ? apiPayload._dailyBySubject
        : null;
  if (dailyBySubject) {
    report.dailyActivityBySubject = dailyBySubject;
  }

  return report;
}

export { policySubjectIdFromAggregate };
