/**
 * Bridge provenance — tracks db vs estimated vs unavailable fields seeded from API payload.
 * Applied after client report generation so estimated/default values are not parent-facing truth.
 */

import {
  makeBridgeFieldProvenance,
  PARENT_REPORT_DATA_AUTHORITY_SERVER,
} from "../parent-report-server-truth.js";
import {
  effectivePracticeAnswerCount,
  effectivePracticeCorrectCount,
} from "../learning/report-practice-counts.js";

const SUBJECT_IDS = ["math", "geometry", "english", "science", "hebrew", "history", "moledet-geography"];

/**
 * @param {Record<string, unknown>} topicIn
 */
export function buildTopicBridgeFieldProvenanceFromAdapterTopic(topicIn) {
  const topic = topicIn && typeof topicIn === "object" ? topicIn : {};
  const durationRaw = Math.max(0, Math.floor(Number(topic.durationSeconds) || 0));
  const mode = typeof topic.dominantMode === "string" && topic.dominantMode.trim() ? topic.dominantMode.trim() : null;
  const level =
    topic.dominantLevel === "easy" || topic.dominantLevel === "medium" || topic.dominantLevel === "hard"
      ? topic.dominantLevel
      : null;
  const grade =
    typeof topic.contentGradeLevel === "string" && topic.contentGradeLevel.trim()
      ? topic.contentGradeLevel.trim()
      : null;
  const hasActivityTs =
    Number.isFinite(Number(topic.latestActivityMs)) ||
    (typeof topic.latestActivityAt === "string" && topic.latestActivityAt.trim()) ||
    (typeof topic.lastAnswerAt === "string" && topic.lastAnswerAt.trim());

  return {
    duration:
      durationRaw > 0
        ? makeBridgeFieldProvenance("db")
        : makeBridgeFieldProvenance("unavailable", { missingReason: "no_duration_in_db" }),
    mode: mode
      ? makeBridgeFieldProvenance("db")
      : makeBridgeFieldProvenance("unavailable", { missingReason: "no_mode_in_db" }),
    level: level
      ? makeBridgeFieldProvenance("db")
      : makeBridgeFieldProvenance("unavailable", { missingReason: "no_level_in_db" }),
    grade: grade
      ? makeBridgeFieldProvenance("db")
      : makeBridgeFieldProvenance("unavailable", { missingReason: "no_grade_in_db" }),
    timestamp: hasActivityTs
      ? makeBridgeFieldProvenance("db")
      : makeBridgeFieldProvenance("unavailable", { missingReason: "no_activity_timestamp_in_db" }),
  };
}

/**
 * @param {Record<string, unknown>} dbInput
 */
export function collectBridgeProvenanceSummary(dbInput) {
  const subjects =
    dbInput?.subjects && typeof dbInput.subjects === "object" && !Array.isArray(dbInput.subjects)
      ? dbInput.subjects
      : {};
  const fieldFlags = {
    hasEstimatedDuration: false,
    hasUnavailableDuration: false,
    hasDefaultMode: false,
    hasDefaultLevel: false,
    hasDefaultGrade: false,
    hasEstimatedTimestamp: false,
  };
  let topicWithEvidence = 0;

  for (const sid of Object.keys(subjects)) {
    const sub = subjects[sid];
    if (!sub || typeof sub !== "object") continue;
    const topics = sub.topics && typeof sub.topics === "object" ? sub.topics : {};
    for (const topic of Object.values(topics)) {
      if (!topic || typeof topic !== "object") continue;
      if (Math.max(0, Math.floor(Number(topic.total) || 0)) <= 0) continue;
      topicWithEvidence += 1;
      const prov = topic._bridgeFieldProvenance;
      if (!prov || typeof prov !== "object") continue;
      for (const [field, meta] of Object.entries(prov)) {
        if (!meta || typeof meta !== "object") continue;
        if (meta.source === "estimated" || meta.isEstimated === true) {
          if (field === "duration") fieldFlags.hasEstimatedDuration = true;
          if (field === "timestamp") fieldFlags.hasEstimatedTimestamp = true;
        }
        if (meta.source === "unavailable") {
          if (field === "duration") fieldFlags.hasUnavailableDuration = true;
          if (field === "mode") fieldFlags.hasDefaultMode = true;
          if (field === "level") fieldFlags.hasDefaultLevel = true;
          if (field === "grade") fieldFlags.hasDefaultGrade = true;
        }
      }
    }
  }

  return { topicWithEvidence, fieldFlags };
}

function safeMinutesFromSeconds(sec) {
  const n = Math.max(0, Math.floor(Number(sec) || 0));
  return Math.round(n / 60);
}

function safeCount(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function safeAccuracy(correct, total) {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

const SUMMARY_SUBJECT_FIELDS = Object.freeze({
  math: ["mathQuestions", "mathCorrect", "mathAccuracy"],
  geometry: ["geometryQuestions", "geometryCorrect", "geometryAccuracy"],
  english: ["englishQuestions", "englishCorrect", "englishAccuracy"],
  science: ["scienceQuestions", "scienceCorrect", "scienceAccuracy"],
  hebrew: ["hebrewQuestions", "hebrewCorrect", "hebrewAccuracy"],
  history: ["historyQuestions", "historyCorrect", "historyAccuracy"],
  moledet_geography: [
    "moledetGeographyQuestions",
    "moledetGeographyCorrect",
    "moledetGeographyAccuracy",
  ],
});

/**
 * @param {Record<string, unknown>} report
 * @param {Record<string, unknown>} dbInput
 * @param {Record<string, unknown>} apiPayload
 */
export function applyBridgeProvenanceToGeneratedReport(report, dbInput, apiPayload) {
  if (!report || typeof report !== "object") return report;

  report._reportDataAuthority = PARENT_REPORT_DATA_AUTHORITY_SERVER;
  const summary = collectBridgeProvenanceSummary(dbInput);
  report._bridgeProvenance = {
    ...summary,
    appliedAt: "phase1-server-truth",
  };

  const apiSummary = apiPayload?.summary && typeof apiPayload.summary === "object" ? apiPayload.summary : {};
  const creditedLearningMinutes = Number(apiSummary.creditedLearningMinutes);
  const hasUnifiedCredited =
    apiSummary.learningTimeSource === "unified_credited" &&
    Number.isFinite(creditedLearningMinutes) &&
    creditedLearningMinutes >= 0;
  const serverDurationSec = hasUnifiedCredited
    ? Math.max(0, Math.round(creditedLearningMinutes * 60))
    : Math.max(0, Math.floor(Number(apiSummary.totalDurationSeconds) || 0));

  if (report.summary && typeof report.summary === "object") {
    const totalQuestions = safeCount(apiSummary.totalAnswers ?? apiSummary.totalQuestions);
    const totalCorrect = safeCount(apiSummary.correctAnswers ?? apiSummary.totalCorrect);
    const totalWrong = safeCount(apiSummary.wrongAnswers ?? apiSummary.totalWrong);
    report.summary.totalQuestions = totalQuestions;
    report.summary.totalCorrect = totalCorrect;
    report.summary.totalWrong = totalWrong;
    report.summary.overallAccuracy = safeAccuracy(totalCorrect, totalQuestions);

    const subjects =
      apiPayload?.subjects && typeof apiPayload.subjects === "object" && !Array.isArray(apiPayload.subjects)
        ? apiPayload.subjects
        : {};
    for (const [subjectId, fields] of Object.entries(SUMMARY_SUBJECT_FIELDS)) {
      const source = subjects[subjectId] && typeof subjects[subjectId] === "object" ? subjects[subjectId] : {};
      const questions = effectivePracticeAnswerCount(source);
      const correct = effectivePracticeCorrectCount(source);
      report.summary[fields[0]] = questions;
      report.summary[fields[1]] = correct;
      report.summary[fields[2]] = safeAccuracy(correct, questions);
    }
  }

  if (hasUnifiedCredited || serverDurationSec > 0) {
    const mins = hasUnifiedCredited
      ? Math.round(creditedLearningMinutes * 100) / 100
      : safeMinutesFromSeconds(serverDurationSec);
    if (report.summary && typeof report.summary === "object") {
      report.summary.totalTimeMinutes = mins;
      report.summary.totalTimeHours = (mins / 60).toFixed(2);
      report.summary.creditedLearningMinutes = mins;
      report.summary.learningTimeSource = hasUnifiedCredited
        ? "unified_credited"
        : apiSummary.learningTimeSource || "duration_seconds";
      const exclusive = apiSummary.learningTimeExclusiveBreakdown;
      if (exclusive && typeof exclusive === "object") {
        report.summary.learningTimeExclusiveBreakdown = exclusive;
      } else if (
        apiPayload?.meta?.learningTimeExclusiveBreakdown &&
        typeof apiPayload.meta.learningTimeExclusiveBreakdown === "object"
      ) {
        report.summary.learningTimeExclusiveBreakdown =
          apiPayload.meta.learningTimeExclusiveBreakdown;
      }
    }
  } else if (summary.fieldFlags.hasUnavailableDuration || summary.fieldFlags.hasEstimatedDuration) {
    if (report.summary && typeof report.summary === "object") {
      report.summary.totalTimeMinutes = 0;
      report.summary.totalTimeHours = "0.00";
    }
  }

  const stripNonAuthoritativeRowFields = (row) => {
    if (!row || typeof row !== "object") return row;
    const next = { ...row };
    if (summary.fieldFlags.hasUnavailableDuration || summary.fieldFlags.hasEstimatedDuration) {
      next.timeMinutes = 0;
      next.timeHours = "0.00";
    }
    if (summary.fieldFlags.hasDefaultMode) {
      next.modeKey = null;
      next.mode = null;
      next.modeStr = "לא זמין";
    }
    if (summary.fieldFlags.hasDefaultLevel) {
      next.levelKey = null;
      next.level = null;
    }
    if (summary.fieldFlags.hasDefaultGrade) {
      next.gradeKey = null;
      next.gradeKeyRaw = null;
    }
    return next;
  };

  if (report.allBySubject && typeof report.allBySubject === "object") {
    const nextAll = {};
    for (const [subject, bucket] of Object.entries(report.allBySubject)) {
      if (!bucket || typeof bucket !== "object") {
        nextAll[subject] = bucket;
        continue;
      }
      const nextBucket = {};
      for (const [key, row] of Object.entries(bucket)) {
        nextBucket[key] = stripNonAuthoritativeRowFields(row);
      }
      nextAll[subject] = nextBucket;
    }
    report.allBySubject = nextAll;
  }

  for (const sid of SUBJECT_IDS) {
    const key = sid === "moledet-geography" ? "moledetGeography" : sid;
    if (!Array.isArray(report[key])) continue;
    report[key] = report[key].map((row) => stripNonAuthoritativeRowFields(row));
  }

  return report;
}
