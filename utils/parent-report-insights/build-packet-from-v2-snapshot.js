/**
 * Synthesizes a minimal aggregate-shaped object from a V2 parent-report snapshot so the Insight
 * Packet can be derived without a Supabase round-trip. The pages that consume the parent report
 * (`pages/learning/parent-report.js` and `pages/learning/parent-report-detailed.js`) only have the
 * V2 snapshot available client-side; the synthesized aggregate fills in the few fields the packet
 * builder reads, with conservative defaults for fields that are not measured client-side
 * (`hintsUsed`, `timeSpentMs`, `mode`, `level`).
 *
 * V2 → aggregate field mapping:
 *   summary.{subject}Questions → subjects[subject].answers
 *   summary.{subject}Correct  → subjects[subject].correct  (when present)
 *   summary.{subject}Accuracy → subjects[subject].accuracy
 *   {subject}Operations|Topics map → subjects[subject].topics[topicKey] (questions/accuracy/correct)
 *
 * No fluency or hints data is invented; counts default to 0 and averages to null. The Insight
 * Packet's downstream consumers (validator, AI input projection) handle nulls cleanly.
 */

import { buildParentReportInsightPacket } from "./index.js";
import { buildGradeEvidenceFields } from "../../lib/learning-supabase/practice-grade-resolution.js";
import { normalizeGradeLevelToKey } from "../../lib/learning-student-defaults.js";

const SUBJECT_KEYS = ["math", "geometry", "english", "hebrew", "science", "moledet_geography"];

const SUMMARY_Q_KEYS = {
  math: "mathQuestions",
  geometry: "geometryQuestions",
  english: "englishQuestions",
  hebrew: "hebrewQuestions",
  science: "scienceQuestions",
  moledet_geography: "moledetGeographyQuestions",
};

const SUMMARY_C_KEYS = {
  math: "mathCorrect",
  geometry: "geometryCorrect",
  english: "englishCorrect",
  hebrew: "hebrewCorrect",
  science: "scienceCorrect",
  moledet_geography: "moledetGeographyCorrect",
};

const SUMMARY_A_KEYS = {
  math: "mathAccuracy",
  geometry: "geometryAccuracy",
  english: "englishAccuracy",
  hebrew: "hebrewAccuracy",
  science: "scienceAccuracy",
  moledet_geography: "moledetGeographyAccuracy",
};

const TOPIC_FIELD_KEYS = {
  math: "mathOperations",
  geometry: "geometryTopics",
  english: "englishTopics",
  hebrew: "hebrewTopics",
  science: "scienceTopics",
  moledet_geography: "moledetGeographyTopics",
};

function safeNumber(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function emptyEnumCounts() {
  return { unknown: 0, learning: 0, review: 0, drill: 0 };
}

function emptyLevelCounts() {
  return { unknown: 0, easy: 0, medium: 0, hard: 0 };
}

function emptyTopic() {
  return {
    answers: 0,
    correct: 0,
    wrong: 0,
    accuracy: 0,
    durationSeconds: 0,
    hintsSum: 0,
    hintsCount: 0,
    timeMsSum: 0,
    timeMsCount: 0,
    correctSlowAnswers: 0,
    correctManyHintsAnswers: 0,
    wrongFastAnswers: 0,
    avgHintsPerQuestion: null,
    avgTimePerQuestionSec: null,
    modeCounts: emptyEnumCounts(),
    levelCounts: emptyLevelCounts(),
  };
}

function emptySubject() {
  return {
    sessions: 0,
    answers: 0,
    correct: 0,
    wrong: 0,
    accuracy: 0,
    durationSeconds: 0,
    hintsSum: 0,
    hintsCount: 0,
    timeMsSum: 0,
    timeMsCount: 0,
    correctSlowAnswers: 0,
    correctManyHintsAnswers: 0,
    wrongFastAnswers: 0,
    avgHintsPerQuestion: null,
    avgTimePerQuestionSec: null,
    modeCounts: emptyEnumCounts(),
    levelCounts: emptyLevelCounts(),
    topics: {},
  };
}

function fillTopicsFromMap(subjectAgg, topicMap, registeredGradeKey) {
  if (!topicMap || typeof topicMap !== "object") return;
  const regKey =
    registeredGradeKey != null && String(registeredGradeKey).trim()
      ? normalizeGradeLevelToKey(registeredGradeKey) || String(registeredGradeKey).trim().toLowerCase()
      : null;
  for (const [rawKey, row] of Object.entries(topicMap)) {
    if (!row || typeof row !== "object") continue;
    const key = String(rawKey || "").trim();
    if (!key) continue;
    const answers = Math.max(0, Math.round(safeNumber(row.questions)));
    if (answers === 0) continue;
    const accuracy = Math.max(0, Math.min(100, safeNumber(row.accuracy)));
    const correct = Number.isFinite(Number(row.correct))
      ? Math.max(0, Math.round(Number(row.correct)))
      : Math.round((accuracy / 100) * answers);
    const wrong = Math.max(0, answers - correct);
    const t = emptyTopic();
    t.answers = answers;
    t.correct = correct;
    t.wrong = wrong;
    t.accuracy = Number(accuracy.toFixed(2));
    if (row.contentGradeKey != null && String(row.contentGradeKey).trim()) {
      t.contentGradeLevel = String(row.contentGradeKey).trim().toLowerCase();
    } else if (row.gradeKey != null && String(row.gradeKey).trim()) {
      t.contentGradeLevel = String(row.gradeKey).trim().toLowerCase();
    }
    if (row.registeredGradeKey != null && String(row.registeredGradeKey).trim()) {
      t.registeredGradeLevel = String(row.registeredGradeKey).trim().toLowerCase();
    }
    if (typeof row.gradeRelation === "string" && row.gradeRelation.trim()) {
      t.gradeRelation = row.gradeRelation.trim();
    } else if (regKey && t.contentGradeLevel) {
      const ge = buildGradeEvidenceFields(regKey, t.contentGradeLevel);
      t.gradeRelation = ge.gradeRelation || "unknown";
      t.registeredGradeLevel = ge.registeredGradeLevel ?? regKey;
    }
    if (row.gradeDelta != null && Number.isFinite(Number(row.gradeDelta))) {
      t.gradeDelta = Number(row.gradeDelta);
    }
    subjectAgg.topics[key] = t;
  }
}

function gradeLevelToNormalized(value) {
  if (typeof value !== "string") return "unknown";
  const trimmed = value.trim().toLowerCase();
  return /^g[1-9]$/.test(trimmed) ? trimmed : "unknown";
}

/**
 * @param {Record<string, unknown>|null|undefined} report — V2 parent-report snapshot
 * @returns {object} synthetic aggregate (subset of `aggregateParentReportPayload` output)
 */
export function synthesizeAggregateFromV2Snapshot(report) {
  const s = report?.summary && typeof report.summary === "object" ? report.summary : {};
  const subjects = {};
  let totalAnswers = 0;
  let totalCorrect = 0;
  let totalWrong = 0;

  const gradeFragment =
    typeof report?.gradeFragment === "string"
      ? report.gradeFragment
      : typeof s.gradeLevel === "string"
      ? s.gradeLevel
      : "";
  const registeredGradeKey =
    typeof report?.registeredGradeKey === "string" && String(report.registeredGradeKey).trim()
      ? normalizeGradeLevelToKey(report.registeredGradeKey) ||
        String(report.registeredGradeKey).trim().toLowerCase()
      : gradeLevelToNormalized(gradeFragment);
  const registeredForAggregate =
    registeredGradeKey && registeredGradeKey !== "unknown" ? registeredGradeKey : null;

  for (const subjectKey of SUBJECT_KEYS) {
    const sub = emptySubject();
    const answers = Math.max(0, Math.round(safeNumber(s[SUMMARY_Q_KEYS[subjectKey]])));
    const accuracy = Math.max(0, Math.min(100, safeNumber(s[SUMMARY_A_KEYS[subjectKey]])));
    const correct =
      SUMMARY_C_KEYS[subjectKey] && Number.isFinite(Number(s[SUMMARY_C_KEYS[subjectKey]]))
        ? Math.max(0, Math.round(Number(s[SUMMARY_C_KEYS[subjectKey]])))
        : Math.round((accuracy / 100) * answers);
    const wrong = Math.max(0, answers - correct);
    sub.answers = answers;
    sub.correct = correct;
    sub.wrong = wrong;
    sub.accuracy = Number(accuracy.toFixed(2));
    sub.sessions = answers > 0 ? 1 : 0;
    fillTopicsFromMap(sub, report?.[TOPIC_FIELD_KEYS[subjectKey]], registeredForAggregate);
    subjects[subjectKey] = sub;
    totalAnswers += answers;
    totalCorrect += correct;
    totalWrong += wrong;
  }

  const totalQuestions = totalAnswers > 0 ? totalAnswers : Math.max(0, Math.round(safeNumber(s.totalQuestions)));
  const overallAccuracy =
    totalAnswers > 0
      ? Number(((totalCorrect / totalAnswers) * 100).toFixed(2))
      : Math.max(0, Math.min(100, safeNumber(s.overallAccuracy)));
  const totalDurationSeconds = Math.max(
    0,
    Math.round(safeNumber(s.totalDurationSeconds) || safeNumber(s.totalTimeMinutes) * 60)
  );

  const studentName =
    typeof report?.playerName === "string" && report.playerName.trim()
      ? report.playerName.trim()
      : "";

  const period = report?.period || null;
  const range = period && typeof period === "object"
    ? {
        from: typeof period.startISO === "string" ? period.startISO.slice(0, 10) : "",
        to: typeof period.endISO === "string" ? period.endISO.slice(0, 10) : "",
      }
    : { from: "", to: "" };

  return {
    ok: true,
    student: {
      id: "",
      full_name: studentName || null,
      grade_level: gradeFragment || registeredForAggregate || null,
      registeredGradeLevel: registeredForAggregate,
      is_active: true,
    },
    range,
    summary: {
      totalSessions: 0,
      completedSessions: 0,
      totalAnswers: totalQuestions,
      correctAnswers: totalCorrect,
      wrongAnswers: totalWrong,
      accuracy: Math.max(0, Math.min(100, overallAccuracy)),
      totalDurationSeconds,
      avgHintsPerQuestion: null,
      avgTimePerQuestionSec: null,
      modeCounts: emptyEnumCounts(),
      levelCounts: emptyLevelCounts(),
      normalizedGradeLevel: gradeLevelToNormalized(gradeFragment || registeredForAggregate || ""),
      registeredGradeLevel: registeredForAggregate,
    },
    subjects,
    dailyActivity: [],
    recentMistakes: [],
    meta: {
      source: "v2_snapshot_synthetic",
      version: "v2-derived",
      insightsVersion: "2026.05-insights-derived",
      fallbackUsed: false,
      sessionDateField: "started_at",
      answerDateField: "answered_at",
      fluencyThresholds: { slowMs: 60000, fastMs: 6000, manyHints: 3 },
    },
  };
}

/**
 * Convenience: V2 snapshot → Insight Packet.
 *
 * @param {Record<string, unknown>|null|undefined} report — V2 parent-report snapshot
 * @param {object} [options] - passed through to `buildParentReportInsightPacket`
 */
function gradePracticeBreakdownFromV2Maps(report) {
  /** @type {Array<Record<string, unknown>>} */
  const rows = [];
  const subjectFieldPairs = [
    ["math", "mathOperations"],
    ["geometry", "geometryTopics"],
    ["english", "englishTopics"],
    ["hebrew", "hebrewTopics"],
    ["science", "scienceTopics"],
    ["moledet_geography", "moledetGeographyTopics"],
  ];
  for (const [subjectKey, field] of subjectFieldPairs) {
    const map = report?.[field];
    if (!map || typeof map !== "object") continue;
    for (const [topicKey, row] of Object.entries(map)) {
      if (!row || typeof row !== "object") continue;
      const q = Math.max(0, Math.round(safeNumber(row.questions)));
      if (q <= 0) continue;
      const content =
        typeof row.contentGradeKey === "string" && row.contentGradeKey.trim()
          ? row.contentGradeKey.trim().toLowerCase()
          : typeof row.gradeKey === "string" && row.gradeKey.trim()
          ? row.gradeKey.trim().toLowerCase()
          : null;
      rows.push({
        subjectKey,
        topicKey,
        displayNameHe: String(row.displayName || topicKey).trim() || topicKey,
        contentGradeLevel: content,
        registeredGradeLevel:
          typeof row.registeredGradeKey === "string" && row.registeredGradeKey.trim()
            ? row.registeredGradeKey.trim().toLowerCase()
            : typeof report?.registeredGradeKey === "string"
            ? report.registeredGradeKey.trim().toLowerCase()
            : null,
        gradeRelation:
          typeof row.gradeRelation === "string" && row.gradeRelation.trim()
            ? row.gradeRelation.trim()
            : "unknown",
        totalQuestions: q,
        accuracyPct: Math.max(0, Math.min(100, safeNumber(row.accuracy))),
      });
    }
  }
  return rows;
}

export function buildInsightPacketFromV2Snapshot(report, options = {}) {
  const aggregate = synthesizeAggregateFromV2Snapshot(report || {});
  const packet = buildParentReportInsightPacket({ aggregate, v2Report: report }, options);
  if (!packet || packet.ok === false) return packet;
  const v2Breakdown = gradePracticeBreakdownFromV2Maps(report || {});
  if (v2Breakdown.length) {
    packet.gradePracticeBreakdown = v2Breakdown;
    packet.mixedGradePractice =
      v2Breakdown.some((r) => r.gradeRelation === "lower" || r.gradeRelation === "higher") ||
      report?.gradePracticeMeta?.mixedGradePractice === true;
    if (packet.mixedGradePractice && !packet.mixedGradePracticeNoteHe) {
      packet.mixedGradePracticeNoteHe =
        typeof report?.gradePracticeMeta?.mixedGradePracticeNoteHe === "string"
          ? report.gradePracticeMeta.mixedGradePracticeNoteHe
          : "חלק מהתרגול בוצע בכיתה שונה מהכיתה הרשומה, ולכן הוא מוצג בנפרד.";
    }
  }
  return packet;
}
