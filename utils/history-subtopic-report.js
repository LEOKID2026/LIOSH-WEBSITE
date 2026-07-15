/**
 * History parent-report helpers — 16 subtopic rows derived from mistakes + parent topic sessions.
 */
import {
  HISTORY_G6_SUBTOPIC_IDS as HISTORY_G6_CONTENT_MAP_SUBTOPIC_IDS,
  historyG6TopicForSubtopic as historyG6ContentMapTopicForSubtopic,
} from "../data/history-g6-content-map.js";
import {
  historySubtopicLabelHe as historyCurriculumSubtopicLabelHe,
  historyTopicLabelHe as historyCurriculumTopicLabelHe,
  historySubtopicsForTopic as historyCurriculumSubtopicsForTopic,
} from "../data/history-curriculum.js";

const HISTORY_G6_SUBTOPIC_IDS = HISTORY_G6_CONTENT_MAP_SUBTOPIC_IDS || [];
const historyG6TopicForSubtopic = historyG6ContentMapTopicForSubtopic || (() => null);
const historySubtopicLabelHe = historyCurriculumSubtopicLabelHe || ((k) => String(k || ""));
const historyTopicLabelHe = historyCurriculumTopicLabelHe || ((k) => String(k || ""));
const historySubtopicsForTopic = historyCurriculumSubtopicsForTopic || (() => []);

/**
 * @param {Record<string, unknown>} m
 * @returns {string|null}
 */
export function historyMistakeSubtopicKey(m) {
  if (!m || typeof m !== "object") return null;
  const p = m.params && typeof m.params === "object" ? m.params : {};
  const key =
    p.subtopicKey ||
    p.subskillId ||
    p.subtype ||
    m.subtopicKey ||
    null;
  const s = String(key || "").trim();
  return s.startsWith("hist_sub_") ? s : null;
}

/**
 * Aggregate session stats from parent-topic rows (any grade/mode scope).
 * @param {Record<string, Record<string, unknown>>} historyTopics
 * @param {string} parentTopicKey
 */
function aggregateParentTopicStats(historyTopics, parentTopicKey) {
  let questions = 0;
  let correct = 0;
  let timeMinutes = 0;
  const prefix = `${parentTopicKey}::`;
  for (const [key, row] of Object.entries(historyTopics || {})) {
    if (key !== parentTopicKey && !key.startsWith(prefix)) continue;
    questions += Number(row?.questions) || 0;
    correct += Number(row?.correct) || 0;
    timeMinutes += Number(row?.timeMinutes) || 0;
  }
  const accuracy = questions > 0 ? Math.round((correct / questions) * 100) : 0;
  return { questions, correct, accuracy, timeMinutes };
}

/**
 * @param {{
 *   historyTopics: Record<string, Record<string, unknown>>,
 *   mistakeCountsBySubtopic: Record<string, { count: number, lastSeen: unknown }>,
 * }} input
 * @returns {Record<string, Record<string, unknown>>}
 */
export function buildHistorySubtopicReportMap({ historyTopics, mistakeCountsBySubtopic }) {
  /** @type {Record<string, Record<string, unknown>>} */
  const out = {};
  const mistakesByParent = {};

  for (const subId of HISTORY_G6_SUBTOPIC_IDS) {
    const parentTopic = historyG6TopicForSubtopic(subId) || "mixed";
    mistakesByParent[parentTopic] =
      (mistakesByParent[parentTopic] || 0) + (mistakeCountsBySubtopic[subId]?.count || 0);
  }

  for (const subId of HISTORY_G6_SUBTOPIC_IDS) {
    const parentTopic = historyG6TopicForSubtopic(subId) || "mixed";
    const parentStats = aggregateParentTopicStats(historyTopics, parentTopic);
    const subtopicCount = (historySubtopicsForTopic(parentTopic) || []).length || 1;
    const mistakeRow = mistakeCountsBySubtopic[subId] || { count: 0, lastSeen: null };
    const parentMistakeTotal = mistakesByParent[parentTopic] || 0;
    const share =
      parentMistakeTotal > 0 && mistakeRow.count > 0
        ? mistakeRow.count / parentMistakeTotal
        : 1 / subtopicCount;

    const estQuestions =
      parentStats.questions > 0
        ? Math.max(mistakeRow.count > 0 ? 1 : 0, Math.round(parentStats.questions * share))
        : 0;
    const estCorrect =
      estQuestions > 0 && parentStats.questions > 0
        ? Math.round((parentStats.correct / parentStats.questions) * estQuestions)
        : 0;
    const accuracy =
      estQuestions > 0 ? Math.round((estCorrect / estQuestions) * 100) : parentStats.accuracy;

    out[subId] = {
      subject: "history",
      bucketKey: subId,
      parentTopicKey: parentTopic,
      parentTopicLabelHe: historyTopicLabelHe(parentTopic),
      displayName: historySubtopicLabelHe(subId),
      questions: estQuestions,
      correct: estCorrect,
      accuracy,
      timeMinutes:
        parentStats.timeMinutes > 0
          ? Math.round(parentStats.timeMinutes * share)
          : 0,
      mistakes: mistakeRow.count,
      mistakeLastSeen: mistakeRow.lastSeen,
      needsPractice: estQuestions >= 5 && accuracy < 70,
      excellent: estQuestions >= 10 && accuracy >= 92,
      subtopicReport: true,
    };
  }
  return out;
}

/**
 * Hebrew parent-facing recommendation snippets per parent topic (5 topics).
 * @param {string} topicKey
 * @param {{ accuracy?: number, questions?: number }} row
 */
export function historyParentRecommendationHe(topicKey, row) {
  const name = historyTopicLabelHe(topicKey) || "היסטוריה";
  const q = Number(row?.questions) || 0;
  const acc = Number(row?.accuracy) || 0;
  if (q < 5) {
    return `ב${name}: עדיין מעט תרגול - כדאי לפתוח את הספר בנושא ולתרגל 10–15 דקות.`;
  }
  if (acc < 65) {
    return `ב${name}: כדאי לחזור על הספר, לסדר אירועים על ציר זמן, ולשאול "למה קרה?" אחרי כל אירוע.`;
  }
  if (acc < 85) {
    return `ב${name}: התקדמות טובה - חזרו על נקודות שבהן היו טעויות ונסו להסביר בקול רם.`;
  }
  return `ב${name}: ביצועים חזקים - אפשר לשלב תרגול "תערובת" או לעבור לנושא הבא בספר.`;
}

/**
 * Subtopic-level home action (16 subtopics).
 * @param {string} subtopicKey
 */
export function historySubtopicParentActionHe(subtopicKey) {
  const label = historySubtopicLabelHe(subtopicKey) || "הנושא";
  if (subtopicKey.includes("source") || subtopicKey.includes("intro")) {
    return `ב${label}: תנו דוגמה אחת ממקור ראשוני ואחת ממקור משני מהבית (תמונה, מכתב, מאמר).`;
  }
  if (subtopicKey.includes("compare")) {
    return `ב${label}: ציירו טבלה של שני עמודות - דמיון והבדל.`;
  }
  if (subtopicKey.includes("cause") || subtopicKey.includes("antiochus") || subtopicKey.includes("loss")) {
    return `ב${label}: שאלו "מה הייתה הסיבה?" ו"מה התוצאה?" אחרי כל אירוע.`;
  }
  if (subtopicKey.includes("timeline") || subtopicKey.includes("revolt") || subtopicKey.includes("rise")) {
    return `ב${label}: סדרו 4–5 אירועים על ציר זמן (נייר או מחברת).`;
  }
  return `ב${label}: קראו את הסעיף בספר היסטוריה ותרגלו 5–10 שאלות במסך ההיסטוריה.`;
}

/**
 * History recommendations with subtopic-specific home actions (not generic fallback).
 * @param {Record<string, Record<string, unknown>>} historySubtopics
 * @param {Record<string, { count?: number }>} mistakes
 * @param {typeof import("./math-report-generator.js").generateRecommendations} generateRecommendations
 */
export function enrichHistoryRecommendations(historySubtopics, mistakes, generateRecommendations) {
  const base = generateRecommendations(historySubtopics, mistakes);
  return base.map((rec) => {
    const row = historySubtopics[rec.operation];
    if (!row?.subtopicReport) return rec;
    const homeAction = historySubtopicParentActionHe(rec.operation);
    const tail = homeAction.endsWith(".") ? homeAction : `${homeAction}.`;
    return {
      ...rec,
      subject: "history",
      homeActionHe: homeAction,
      message: `${rec.message.replace(/\s*\(דיוק[^)]*\)\s*$/, "").trim()}. ${tail}`,
    };
  });
}
