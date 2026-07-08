/**
 * Seeds browser-shaped keys from adapted DB report input (same contract as
 * `buildReportInputFromDbData`). Shared by server rebuild and parent-dashboard bridge.
 */

import { normalizeLearningGameMode } from "./learning-activity.js";
import { normalizeGradeLevelToKey } from "../learning-student-defaults.js";
import { sanitizeReportDurationSeconds } from "../parent-server/report-duration-sanity.js";
import { REPORT_TOPIC_GRADE_SEP } from "./report-data-adapter.js";
import { parseActivityTimestampMs } from "./parent-report-activity-time.js";
import { makeBridgeFieldProvenance } from "../parent-report-server-truth.js";
import { aggregateMistakeRowToStorageEvent } from "../../utils/diagnostic-evidence.js";
import { PARENT_REPORT_TOPIC_ANSWER_EVENTS_STORAGE_KEY } from "../../utils/parent-report-topic-trend-v1.js";

export const REPORT_AGG_SUBJECTS = ["math", "geometry", "english", "hebrew", "science", "history", "moledet_geography"];

/** Keys written by {@link seedLocalStorageFromDbReportInput} (not including mleo_player_name). */
export const SEEDED_MLEO_STORAGE_KEYS = [
  "mleo_time_tracking",
  "mleo_math_master_progress",
  "mleo_mistakes",
  "mleo_geometry_time_tracking",
  "mleo_geometry_master_progress",
  "mleo_geometry_mistakes",
  "mleo_english_time_tracking",
  "mleo_english_master_progress",
  "mleo_english_mistakes",
  "mleo_science_time_tracking",
  "mleo_science_master_progress",
  "mleo_science_mistakes",
  "mleo_history_time_tracking",
  "mleo_history_master_progress",
  "mleo_history_mistakes",
  "mleo_hebrew_time_tracking",
  "mleo_hebrew_master_progress",
  "mleo_hebrew_mistakes",
  "mleo_moledet_geography_time_tracking",
  "mleo_moledet_geography_master_progress",
  "mleo_moledet_geography_mistakes",
  PARENT_REPORT_TOPIC_ANSWER_EVENTS_STORAGE_KEY,
];

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mergeModeCountMaps(into, from) {
  if (!from || typeof from !== "object" || Array.isArray(from)) return into;
  const out = into && typeof into === "object" ? { ...into } : {};
  for (const [key, value] of Object.entries(from)) {
    const n = Math.max(0, Math.floor(safeNumber(value)));
    if (!key || n <= 0) continue;
    out[key] = (out[key] || 0) + n;
  }
  return out;
}

/**
 * @param {Map<string, string>} store
 * @param {Record<string, unknown>} dbInput
 * @param {{ nowMs?: number }} [options]
 */
export function seedLocalStorageFromDbReportInput(store, dbInput, options = {}) {
  const nowMs = Number.isFinite(options.nowMs) ? options.nowMs : Date.now();
  const range = dbInput.range && typeof dbInput.range === "object" ? dbInput.range : {};
  const fromStr = String(range.from || "").slice(0, 10);
  const toStr = String(range.to || "").slice(0, 10);
  const rangeStartMs = /^\d{4}-\d{2}-\d{2}$/.test(fromStr)
    ? parseActivityTimestampMs(`${fromStr}T00:00:00.000Z`)
    : null;
  const rangeEndMs = /^\d{4}-\d{2}-\d{2}$/.test(toStr)
    ? parseActivityTimestampMs(`${toStr}T23:59:59.999Z`)
    : null;
  const effectiveRangeEndMs =
    Number.isFinite(rangeEndMs) && rangeEndMs > nowMs ? nowMs : rangeEndMs;
  const subjects =
    dbInput.subjects && typeof dbInput.subjects === "object" && !Array.isArray(dbInput.subjects)
      ? dbInput.subjects
      : {};

  const mathOps = {};
  const mathProg = {};
  const geomTopics = {};
  const geomProg = {};
  const engTopics = {};
  const engProg = {};
  const sciTopics = {};
  const sciProg = {};
  const histTopics = {};
  const histProg = {};
  const hebTopics = {};
  const hebProg = {};
  const molTopics = {};
  const molProg = {};

  const mathMistakes = [];
  const geomMistakes = [];
  const engMistakes = [];
  const sciMistakes = [];
  const histMistakes = [];
  const hebMistakes = [];
  const molMistakes = [];

  const registeredGrade =
    normalizeGradeLevelToKey(
      typeof dbInput.student?.registeredGradeLevel === "string"
        ? dbInput.student.registeredGradeLevel
        : typeof dbInput.student?.gradeLevel === "string"
        ? dbInput.student.gradeLevel
        : ""
    ) ||
    (typeof dbInput.student?.gradeLevelKey === "string" && /^g[1-6]$/.test(String(dbInput.student.gradeLevelKey).toLowerCase())
      ? String(dbInput.student.gradeLevelKey).toLowerCase()
      : "") ||
    null;

  for (const sid of REPORT_AGG_SUBJECTS) {
    const sub = subjects[sid] && typeof subjects[sid] === "object" ? subjects[sid] : {};
    const topics =
      sub.topics && typeof sub.topics === "object" && !Array.isArray(sub.topics) ? sub.topics : {};

    for (const [topicKey, rawTopic] of Object.entries(topics)) {
      const topic = rawTopic && typeof rawTopic === "object" ? rawTopic : {};
      const total = Math.max(0, Math.floor(safeNumber(topic.total)));
      if (total <= 0) continue;
      const correct = Math.max(0, Math.min(total, Math.floor(safeNumber(topic.correct))));
      const fieldProv =
        topic._bridgeFieldProvenance && typeof topic._bridgeFieldProvenance === "object"
          ? topic._bridgeFieldProvenance
          : null;
      const durationSecRaw = Math.max(0, Math.floor(safeNumber(topic.durationSeconds)));
      const durationSec =
        durationSecRaw > 0
          ? sanitizeReportDurationSeconds(durationSecRaw, { answerCount: total }).seconds
          : 0;
      const durationProvenance =
        fieldProv?.duration ||
        (durationSecRaw > 0
          ? makeBridgeFieldProvenance("db")
          : makeBridgeFieldProvenance("unavailable", { missingReason: "no_duration_in_db" }));
      const sessionMode = normalizeLearningGameMode(topic.dominantMode) || null;
      const modeProvenance =
        fieldProv?.mode ||
        (sessionMode
          ? makeBridgeFieldProvenance("db")
          : makeBridgeFieldProvenance("unavailable", { missingReason: "no_mode_in_db" }));
      const domLevel = topic.dominantLevel;
      const sessionLevel =
        domLevel === "easy" || domLevel === "medium" || domLevel === "hard" ? domLevel : null;
      const levelProvenance =
        fieldProv?.level ||
        (sessionLevel
          ? makeBridgeFieldProvenance("db")
          : makeBridgeFieldProvenance("unavailable", { missingReason: "no_level_in_db" }));
      const topicBaseKey =
        typeof topic.topicBaseKey === "string" && topic.topicBaseKey.trim()
          ? topic.topicBaseKey.trim()
          : topicKey.includes(REPORT_TOPIC_GRADE_SEP)
          ? topicKey.split(REPORT_TOPIC_GRADE_SEP)[0]
          : topicKey;
      const contentGrade =
        normalizeGradeLevelToKey(topic.contentGradeLevel) ||
        (topicKey.includes(REPORT_TOPIC_GRADE_SEP)
          ? normalizeGradeLevelToKey(topicKey.split(REPORT_TOPIC_GRADE_SEP)[1])
          : null);
      const sessionGrade = contentGrade || null;
      const aggregateModeCounts =
        topic.modeCounts && typeof topic.modeCounts === "object" && !Array.isArray(topic.modeCounts)
          ? { ...topic.modeCounts }
          : topic.dominantMode
          ? { [topic.dominantMode]: Math.max(1, Math.floor(safeNumber(topic.total))) }
          : null;
      const gradeProvenance =
        fieldProv?.grade ||
        (sessionGrade
          ? makeBridgeFieldProvenance("db")
          : makeBridgeFieldProvenance("unavailable", { missingReason: "no_grade_in_db" }));
      let activityMs =
        parseActivityTimestampMs(topic.lastAnswerMs) ??
        parseActivityTimestampMs(topic.lastAnswerAt) ??
        parseActivityTimestampMs(topic.sessionStartedAt) ??
        parseActivityTimestampMs(topic.latestActivityMs) ??
        parseActivityTimestampMs(topic.latestActivityAt);
      let timestampProvenance =
        fieldProv?.timestamp ||
        (Number.isFinite(activityMs)
          ? makeBridgeFieldProvenance("db")
          : makeBridgeFieldProvenance("unavailable", { missingReason: "no_activity_timestamp_in_db" }));
      if (!Number.isFinite(activityMs) && total > 0 && Number.isFinite(effectiveRangeEndMs)) {
        activityMs = effectiveRangeEndMs;
        timestampProvenance = makeBridgeFieldProvenance("estimated", {
          isEstimated: true,
          missingReason: "range_end_timestamp_fallback",
        });
      }
      if (
        total > 0 &&
        Number.isFinite(rangeStartMs) &&
        Number.isFinite(effectiveRangeEndMs) &&
        Number.isFinite(activityMs)
      ) {
        const clamped = Math.min(effectiveRangeEndMs, Math.max(rangeStartMs, activityMs));
        if (clamped !== activityMs) {
          activityMs = clamped;
          timestampProvenance = makeBridgeFieldProvenance("estimated", {
            isEstimated: true,
            missingReason: "range_clamp_timestamp_for_v2_session_filter",
          });
        }
      }
      const session = {
        ...(Number.isFinite(activityMs) ? { timestamp: activityMs } : {}),
        total,
        correct,
        ...(sessionMode ? { mode: sessionMode } : {}),
        ...(sessionGrade ? { grade: sessionGrade } : {}),
        registeredGrade: registeredGrade || null,
        contentGrade: contentGrade || null,
        gradeRelation: typeof topic.gradeRelation === "string" ? topic.gradeRelation : "unknown",
        evidenceSourceCounts:
          topic.evidenceSourceCounts && typeof topic.evidenceSourceCounts === "object"
            ? topic.evidenceSourceCounts
            : undefined,
        primaryEvidenceSource:
          typeof topic.primaryEvidenceSource === "string" ? topic.primaryEvidenceSource : undefined,
        parentActivityTitle:
          typeof topic.parentActivityTitle === "string" ? topic.parentActivityTitle : undefined,
        ...(sessionLevel ? { level: sessionLevel } : {}),
        ...(durationSec > 0 ? { duration: durationSec } : {}),
        ...(aggregateModeCounts ? { aggregateModeCounts } : {}),
        _bridgeFieldProvenance: {
          duration: durationProvenance,
          mode: modeProvenance,
          level: levelProvenance,
          grade: gradeProvenance,
          timestamp: timestampProvenance,
        },
        latestActivitySource:
          typeof topic.latestActivitySource === "string" ? topic.latestActivitySource : undefined,
        lastAnswerAt: topic.lastAnswerAt || undefined,
        sessionStartedAt: topic.sessionStartedAt || undefined,
        sessionFinishedAt: topic.sessionFinishedAt || undefined,
      };

      const pushSession = (map, progMap) => {
        if (!map[topicBaseKey]) map[topicBaseKey] = { sessions: [] };
        map[topicBaseKey].sessions.push(session);
        const prev = progMap[topicBaseKey] || { total: 0, correct: 0 };
        progMap[topicBaseKey] = {
          total: prev.total + total * 20,
          correct: prev.correct + correct * 20,
        };
      };

      if (sid === "math") {
        pushSession(mathOps, mathProg);
      } else if (sid === "geometry") {
        pushSession(geomTopics, geomProg);
      } else if (sid === "english") {
        pushSession(engTopics, engProg);
      } else if (sid === "science") {
        pushSession(sciTopics, sciProg);
      } else if (sid === "history") {
        pushSession(histTopics, histProg);
      } else if (sid === "hebrew") {
        pushSession(hebTopics, hebProg);
      } else if (sid === "moledet_geography") {
        pushSession(molTopics, molProg);
      }
    }

    const mistakes = Array.isArray(sub.mistakes) ? sub.mistakes : [];
    for (const m of mistakes) {
      if (!m || typeof m !== "object") continue;
      const storageEvent = aggregateMistakeRowToStorageEvent(m, sid, registeredGrade);
      if (!storageEvent) continue;
      if (sid === "math") mathMistakes.push(storageEvent);
      else if (sid === "geometry") geomMistakes.push(storageEvent);
      else if (sid === "english") engMistakes.push(storageEvent);
      else if (sid === "science") sciMistakes.push(storageEvent);
      else if (sid === "history") histMistakes.push(storageEvent);
      else if (sid === "hebrew") hebMistakes.push(storageEvent);
      else if (sid === "moledet_geography") molMistakes.push(storageEvent);
    }
  }

  store.set("mleo_time_tracking", JSON.stringify({ operations: mathOps }));
  store.set("mleo_math_master_progress", JSON.stringify({ progress: mathProg }));
  store.set("mleo_mistakes", JSON.stringify(mathMistakes));

  store.set("mleo_geometry_time_tracking", JSON.stringify({ topics: geomTopics }));
  store.set("mleo_geometry_master_progress", JSON.stringify({ progress: geomProg }));
  store.set("mleo_geometry_mistakes", JSON.stringify(geomMistakes));

  store.set("mleo_english_time_tracking", JSON.stringify({ topics: engTopics }));
  store.set("mleo_english_master_progress", JSON.stringify({ progress: engProg }));
  store.set("mleo_english_mistakes", JSON.stringify(engMistakes));

  store.set("mleo_science_time_tracking", JSON.stringify({ topics: sciTopics }));
  store.set("mleo_science_master_progress", JSON.stringify({ progress: sciProg }));
  store.set("mleo_science_mistakes", JSON.stringify(sciMistakes));

  store.set("mleo_history_time_tracking", JSON.stringify({ topics: histTopics }));
  store.set("mleo_history_master_progress", JSON.stringify({ progress: histProg }));
  store.set("mleo_history_mistakes", JSON.stringify(histMistakes));

  store.set("mleo_hebrew_time_tracking", JSON.stringify({ topics: hebTopics }));
  store.set("mleo_hebrew_master_progress", JSON.stringify({ progress: hebProg }));
  store.set("mleo_hebrew_mistakes", JSON.stringify(hebMistakes));

  store.set("mleo_moledet_geography_time_tracking", JSON.stringify({ topics: molTopics }));
  store.set("mleo_moledet_geography_master_progress", JSON.stringify({ progress: molProg }));
  store.set("mleo_moledet_geography_mistakes", JSON.stringify(molMistakes));

  const topicAnswerEvents =
    dbInput._internalTopicAnswerEvents &&
    typeof dbInput._internalTopicAnswerEvents === "object" &&
    !Array.isArray(dbInput._internalTopicAnswerEvents)
      ? dbInput._internalTopicAnswerEvents
      : null;
  if (topicAnswerEvents) {
    store.set(PARENT_REPORT_TOPIC_ANSWER_EVENTS_STORAGE_KEY, JSON.stringify(topicAnswerEvents));
  }
}
