/**
 * Server-authoritative per-subject practice counts for parent report visibility.
 * Built from GET report-data API payload — not V2 localStorage replay.
 */

import {
  effectivePracticeAccuracy,
  effectivePracticeAnswerCount,
  effectivePracticeCorrectCount,
} from "./report-practice-counts.js";

export const NORMALIZED_SUBJECT_IDS = Object.freeze([
  "math",
  "geometry",
  "english",
  "science",
  "hebrew",
  "history",
  "moledet_geography",
]);

/** UI / policy canonical ids (moledet-geography hyphenated). */
export const POLICY_SUBJECT_IDS = Object.freeze([
  "math",
  "geometry",
  "english",
  "science",
  "hebrew",
  "history",
  "moledet-geography",
]);

const SUMMARY_FIELD_MAP = Object.freeze({
  math: {
    questions: "mathQuestions",
    correct: "mathCorrect",
    accuracy: "mathAccuracy",
  },
  geometry: {
    questions: "geometryQuestions",
    correct: "geometryCorrect",
    accuracy: "geometryAccuracy",
  },
  english: {
    questions: "englishQuestions",
    correct: "englishCorrect",
    accuracy: "englishAccuracy",
  },
  science: {
    questions: "scienceQuestions",
    correct: "scienceCorrect",
    accuracy: "scienceAccuracy",
  },
  hebrew: {
    questions: "hebrewQuestions",
    correct: "hebrewCorrect",
    accuracy: "hebrewAccuracy",
  },
  history: {
    questions: "historyQuestions",
    correct: "historyCorrect",
    accuracy: "historyAccuracy",
  },
  moledet_geography: {
    questions: "moledetGeographyQuestions",
    correct: "moledetGeographyCorrect",
    accuracy: "moledetGeographyAccuracy",
  },
});

const REPORT_TOPIC_MAP_KEYS = Object.freeze({
  math: "mathOperations",
  geometry: "geometryTopics",
  english: "englishTopics",
  science: "scienceTopics",
  hebrew: "hebrewTopics",
  history: "historyTopics",
  moledet_geography: "moledetGeographyTopics",
});

function safeFloor(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function safeAccuracy(correct, total) {
  const c = safeFloor(correct);
  const t = safeFloor(total);
  return t > 0 ? Math.round((c / t) * 100) : 0;
}

/** @param {string} aggregateSubjectId */
export function policySubjectIdFromAggregate(aggregateSubjectId) {
  return aggregateSubjectId === "moledet_geography" ? "moledet-geography" : aggregateSubjectId;
}

/** @param {string} policySubjectId */
export function aggregateSubjectIdFromPolicy(policySubjectId) {
  return policySubjectId === "moledet-geography" ? "moledet_geography" : policySubjectId;
}

/**
 * @param {Record<string, unknown>} subjectRow
 */
export function normalizedSubjectPracticeRow(subjectRow = {}) {
  const questions = effectivePracticeAnswerCount(subjectRow);
  const correct = effectivePracticeCorrectCount(subjectRow);
  const durationSeconds = safeFloor(subjectRow.durationSeconds);
  const accuracy =
    questions > 0 ? safeAccuracy(correct, questions) : Math.round(Number(effectivePracticeAccuracy(subjectRow)) || 0);
  return { questions, correct, accuracy, durationSeconds };
}

/**
 * @param {Record<string, unknown>|null|undefined} apiPayload
 */
export function buildNormalizedSubjectPracticeFromApiPayload(apiPayload) {
  const subjects =
    apiPayload?.subjects && typeof apiPayload.subjects === "object" && !Array.isArray(apiPayload.subjects)
      ? apiPayload.subjects
      : {};
  /** @type {Record<string, { questions: number, correct: number, accuracy: number, durationSeconds: number }>} */
  const out = {};
  for (const subjectId of NORMALIZED_SUBJECT_IDS) {
    const row = subjects[subjectId] && typeof subjects[subjectId] === "object" ? subjects[subjectId] : {};
    out[subjectId] = normalizedSubjectPracticeRow(row);
  }
  return out;
}

/**
 * @param {Record<string, { questions?: number }>} normalized
 */
export function subjectQuestionCountsFromNormalized(normalized) {
  /** @type {Record<string, number>} */
  const out = {};
  for (const subjectId of NORMALIZED_SUBJECT_IDS) {
    const policyId = policySubjectIdFromAggregate(subjectId);
    out[policyId] = safeFloor(normalized?.[subjectId]?.questions);
  }
  return out;
}

/**
 * @param {Record<string, { questions?: number, correct?: number, accuracy?: number }>} normalized
 */
export function summarySubjectFieldsFromNormalized(normalized) {
  /** @type {Record<string, number>} */
  const out = {};
  for (const subjectId of NORMALIZED_SUBJECT_IDS) {
    const fields = SUMMARY_FIELD_MAP[subjectId];
    const row = normalized?.[subjectId] || {};
    out[fields.questions] = safeFloor(row.questions);
    out[fields.correct] = safeFloor(row.correct);
    out[fields.accuracy] = safeFloor(row.accuracy);
  }
  return out;
}

/**
 * @param {Record<string, unknown>|null|undefined} report
 */
export function practicedSubjectCountFromReport(report) {
  const normalized = report?._normalizedSubjectPractice;
  if (normalized && typeof normalized === "object") {
    return NORMALIZED_SUBJECT_IDS.filter((id) => safeFloor(normalized[id]?.questions) > 0).length;
  }
  const summary = report?.summary;
  if (summary && typeof summary === "object") {
    let count = 0;
    for (const subjectId of NORMALIZED_SUBJECT_IDS) {
      const field = SUMMARY_FIELD_MAP[subjectId].questions;
      if (safeFloor(summary[field]) > 0) count += 1;
    }
    return count;
  }
  return 0;
}

export { REPORT_TOPIC_MAP_KEYS, SUMMARY_FIELD_MAP };
