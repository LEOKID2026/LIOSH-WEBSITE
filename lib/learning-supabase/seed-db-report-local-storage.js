/**
 * Seeds browser-shaped keys from adapted DB report input (same contract as
 * `buildReportInputFromDbData`). Shared by server rebuild and parent-dashboard bridge.
 */

import { normalizeLearningGameMode } from "./learning-activity.js";
import { normalizeGradeLevelToKey } from "../learning-student-defaults.js";
import { REPORT_TOPIC_GRADE_SEP } from "./report-data-adapter.js";
import { parseActivityTimestampMs } from "./parent-report-activity-time.js";

export const REPORT_AGG_SUBJECTS = ["math", "geometry", "english", "hebrew", "science", "moledet_geography"];

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
  "mleo_hebrew_time_tracking",
  "mleo_hebrew_master_progress",
  "mleo_hebrew_mistakes",
  "mleo_moledet_geography_time_tracking",
  "mleo_moledet_geography_master_progress",
  "mleo_moledet_geography_mistakes",
];

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {Map<string, string>} store
 * @param {Record<string, unknown>} dbInput
 */
export function seedLocalStorageFromDbReportInput(store, dbInput) {
  const range = dbInput.range && typeof dbInput.range === "object" ? dbInput.range : {};
  const fromStr = String(range.from || "").slice(0, 10);
  const toStr = String(range.to || "").slice(0, 10);
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
  const hebTopics = {};
  const hebProg = {};
  const molTopics = {};
  const molProg = {};

  const mathMistakes = [];
  const geomMistakes = [];
  const engMistakes = [];
  const sciMistakes = [];
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
      const durationSec = Math.max(0, Math.floor(safeNumber(topic.durationSeconds)));
      const sessionMode = normalizeLearningGameMode(topic.dominantMode) || "learning";
      const domLevel = topic.dominantLevel;
      const sessionLevel =
        domLevel === "easy" || domLevel === "medium" || domLevel === "hard" ? domLevel : "medium";
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
      const sessionGrade = contentGrade || registeredGrade || "unknown";
      const activityMs =
        parseActivityTimestampMs(topic.latestActivityMs) ??
        parseActivityTimestampMs(topic.latestActivityAt);
      const session = {
        ...(Number.isFinite(activityMs) ? { timestamp: activityMs } : {}),
        total,
        correct,
        mode: sessionMode,
        grade: sessionGrade,
        registeredGrade: registeredGrade || null,
        contentGrade: contentGrade || null,
        gradeRelation: typeof topic.gradeRelation === "string" ? topic.gradeRelation : "unknown",
        level: sessionLevel,
        duration: durationSec > 0 ? durationSec : Math.max(30, total * 30),
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
      } else if (sid === "hebrew") {
        pushSession(hebTopics, hebProg);
      } else if (sid === "moledet_geography") {
        pushSession(molTopics, molProg);
      }
    }

    const mistakes = Array.isArray(sub.mistakes) ? sub.mistakes : [];
    for (const m of mistakes) {
      if (!m || typeof m !== "object") continue;
      const topic = String(m.topic || "general").slice(0, 120);
      let ts = parseActivityTimestampMs(m.answeredAt);
      if (!Number.isFinite(ts)) ts = null;
      const row = {
        ...(Number.isFinite(ts) ? { timestamp: ts } : {}),
        topic,
        operation: sid === "math" ? topic : undefined,
        isCorrect: false,
        grade: normalizeGradeLevelToKey(m.contentGradeLevel) || registeredGrade || undefined,
        registeredGrade: registeredGrade || undefined,
        contentGrade: normalizeGradeLevelToKey(m.contentGradeLevel) || undefined,
        gradeRelation: typeof m.gradeRelation === "string" ? m.gradeRelation : undefined,
      };
      if (sid === "math") mathMistakes.push(row);
      else if (sid === "geometry") geomMistakes.push(row);
      else if (sid === "english") engMistakes.push(row);
      else if (sid === "science") sciMistakes.push(row);
      else if (sid === "hebrew") hebMistakes.push(row);
      else if (sid === "moledet_geography") molMistakes.push(row);
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

  store.set("mleo_hebrew_time_tracking", JSON.stringify({ topics: hebTopics }));
  store.set("mleo_hebrew_master_progress", JSON.stringify({ progress: hebProg }));
  store.set("mleo_hebrew_mistakes", JSON.stringify(hebMistakes));

  store.set("mleo_moledet_geography_time_tracking", JSON.stringify({ topics: molTopics }));
  store.set("mleo_moledet_geography_master_progress", JSON.stringify({ progress: molProg }));
  store.set("mleo_moledet_geography_mistakes", JSON.stringify(molMistakes));
}
