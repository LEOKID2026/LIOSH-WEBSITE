/**
 * History-only Copilot scope lock — prevents cross-subject fallback when parents ask about history.
 */

import { historyG6TopicForSubtopic as historyG6ContentMapTopicForSubtopic } from "../../data/history-g6-content-map.js";
import {
  historySubtopicLabelHe as historyCurriculumSubtopicLabelHe,
  historyTopicLabelHe as historyCurriculumTopicLabelHe,
} from "../../data/history-curriculum.js";
import { foldUtteranceForHeMatch } from "./utterance-normalize-he.js";

const historyG6TopicForSubtopic = historyG6ContentMapTopicForSubtopic || (() => null);
const historySubtopicLabelHe = historyCurriculumSubtopicLabelHe || ((k) => String(k || ""));
const historyTopicLabelHe = historyCurriculumTopicLabelHe || ((k) => String(k || ""));

export const ZERO_DATA_HISTORY_TOPIC_HE = "אין עדיין מספיק נתונים בנושא הזה";

/** History-only aliases (subset of report-row-resolver TOPIC_HE_ALIASES — kept here to avoid import cycles). */
const HISTORY_COPILOT_ALIASES = Object.freeze({
  what_is_history: ["מהי היסטוריה", "מקור ראשוני", "מקור משני", "ציר זמן"],
  classical_greece: ["יוון הקלאסית", "אתונה", "ספרטה", "דמוקרטיה", "השוואה אתונה ספרטה"],
  hellenism_jews: ["הלניזם", "אלכסנדר מוקדון", "אלכסנדר", "הלניזם והיהודים"],
  hasmonaeans: ["החשמונאים", "חשמונאים", "אנטיוכוס", "מרד המקבים", "המקבים", "חנוכה"],
  rome_jews: ["רומא והיהודים", "רומא", "הורדוס", "המרד הגדול", "חורבן בית המקדש", "חורבן", "יבנה", "בר כוכבא", "בבל"],
  hist_sub_intro_sources_timeline: ["מקור ראשוני", "מקור משני", "ציר זמן", "מהי היסטוריה"],
  hist_sub_athens_democracy: ["אתונה", "דמוקרטיה", "אתונה הדמוקרטית"],
  hist_sub_sparta: ["ספרטה"],
  hist_sub_athens_sparta_compare: ["השוואה אתונה ספרטה", "השוואה בין אתונה לספרטה", "אתונה וספרטה"],
  hist_sub_greek_culture_legacy: ["תרבות יוון", "מורשת יוון", "אולימפיאדה"],
  hist_sub_alexander_hellenism: ["אלכסנדר מוקדון", "הלניזם"],
  hist_sub_hellenism_meets_judaism: ["המפגש בין הלניזם ליהדות", "הלניזם והיהודים"],
  hist_sub_antiochus_maccabees: ["גזרות אנטיוכוס", "מרד המקבים", "המקבים"],
  hist_sub_hasmonaean_kingdom: ["ממלכת החשמונאים"],
  hist_sub_rise_of_rome: ["עליית רומא"],
  hist_sub_roman_culture_law: ["תרבות רומית", "משפט רומי", "חוק רומי"],
  hist_sub_hasmonaean_loss_roman_conquest: ["כיבוש רומי", "פומפיוס", "אובדן עצמאות"],
  hist_sub_herod_building: ["הורדוס", "מפעלי בנייה", "הרודיון"],
  hist_sub_judea_province: ["יהודה כפרובינציה", "פרובינציה"],
  hist_sub_great_revolt_destruction: ["המרד הגדול", "חורבן בית המקדש", "מצדה"],
  hist_sub_yavne_bar_kokhba_babylon: ["יבנה", "בר כוכבא", "מרכז בבל", "בבל"],
});

const HISTORY_PARENT_TOPIC_KEYS = Object.freeze([
  "what_is_history",
  "classical_greece",
  "hellenism_jews",
  "hasmonaeans",
  "rome_jews",
]);

const HISTORY_SUBTOPIC_KEYS = Object.freeze(
  Object.keys(HISTORY_COPILOT_ALIASES).filter((k) => k.startsWith("hist_sub_")),
);

const FOLDED_PHRASE_BOUNDARY = /[\s?!.,:;״׳]/u;

/**
 * @param {string} haystack
 * @param {string} phrase
 */
function foldedIncludesPhrase(haystack, phrase) {
  const h = String(haystack || "");
  const p = String(phrase || "").trim();
  if (p.length < 2 || !h.includes(p)) return false;
  if (p.length >= 4) return true;
  let idx = 0;
  while ((idx = h.indexOf(p, idx)) !== -1) {
    const before = idx === 0 ? " " : h[idx - 1];
    const afterIdx = idx + p.length;
    const after = afterIdx >= h.length ? " " : h[afterIdx];
    if (FOLDED_PHRASE_BOUNDARY.test(before) && FOLDED_PHRASE_BOUNDARY.test(after)) return true;
    idx += 1;
  }
  return false;
}

/**
 * @param {string} utterance
 * @returns {{
 *   locked: true;
 *   subjectId: "history";
 *   subjectExplicit: boolean;
 *   topicBaseKey: string|null;
 *   subtopicKey: string|null;
 * } | null}
 */
export function detectHistoryCopilotLock(utterance) {
  const folded = foldUtteranceForHeMatch(utterance);
  if (folded.length < 2) return null;

  const historyWord = foldUtteranceForHeMatch("היסטוריה");
  const subjectExplicit = foldedIncludesPhrase(folded, historyWord);

  /** @type {Array<{ key: string; score: number; isSubtopic: boolean }>} */
  const hits = [];

  const scanKey = (key) => {
    for (const alias of HISTORY_COPILOT_ALIASES[key] || []) {
      const af = foldUtteranceForHeMatch(alias);
      if (af.length >= 2 && foldedIncludesPhrase(folded, af)) {
        hits.push({ key, score: af.length, isSubtopic: key.startsWith("hist_sub_") });
      }
    }
  };

  for (const key of HISTORY_PARENT_TOPIC_KEYS) scanKey(key);
  for (const key of HISTORY_SUBTOPIC_KEYS) scanKey(key);

  if (!subjectExplicit && !hits.length) return null;

  hits.sort((a, b) => b.score - a.score || Number(b.isSubtopic) - Number(a.isSubtopic));

  const top = hits[0] || null;
  let topicBaseKey = null;
  let subtopicKey = null;

  if (top) {
    if (top.isSubtopic) {
      subtopicKey = top.key;
      topicBaseKey = historyG6TopicForSubtopic(top.key) || null;
    } else {
      topicBaseKey = top.key;
    }
  }

  return {
    locked: true,
    subjectId: "history",
    subjectExplicit,
    topicBaseKey,
    subtopicKey,
  };
}

/**
 * @param {unknown} payload
 * @param {string} topicBaseKey
 */
function historyOverviewRowsForTopic(payload, topicBaseKey) {
  const base = String(topicBaseKey || "").trim();
  if (!base) return [];
  const sp = (Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : []).find(
    (p) => String(p?.subject || "") === "history",
  );
  const rows = Array.isArray(sp?.topicOverviewRows) ? sp.topicOverviewRows : [];
  return rows.filter((row) => {
    const key = String(row?.topicRowKey || row?.topicKey || "").trim();
    return key === base || key.startsWith(`${base}::`);
  });
}

/**
 * @param {unknown} payload
 * @param {string} topicBaseKey
 */
export function historyTopicQuestionsFromPayload(payload, topicBaseKey) {
  const base = String(topicBaseKey || "").trim();
  if (!base) return 0;
  let q = 0;
  for (const row of historyOverviewRowsForTopic(payload, base)) {
    q += Math.max(0, Number(row?.questions) || 0);
  }
  if (q > 0) return q;
  const sp = (Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : []).find(
    (p) => String(p?.subject || "") === "history",
  );
  for (const tr of Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : []) {
    const key = String(tr?.topicRowKey || tr?.topicKey || "").trim();
    if (key === base || key.startsWith(`${base}::`)) {
      q += Math.max(0, Number(tr?.questions ?? tr?.questionCount) || 0);
    }
  }
  return q;
}

/**
 * @param {unknown} payload
 * @param {string} subtopicKey
 */
export function historySubtopicQuestionsFromPayload(payload, subtopicKey) {
  const key = String(subtopicKey || "").trim();
  if (!key) return 0;
  const map =
    (payload?.historySubtopics && typeof payload.historySubtopics === "object" && payload.historySubtopics) ||
    (payload?.maps?.historySubtopics && typeof payload.maps.historySubtopics === "object" && payload.maps.historySubtopics) ||
    {};
  return Math.max(0, Number(map[key]?.questions) || 0);
}

/**
 * @param {unknown} payload
 */
export function historySubjectQuestionsFromPayload(payload) {
  const sp = (Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : []).find(
    (p) => String(p?.subject || "") === "history",
  );
  let q = Math.max(0, Number(sp?.subjectQuestionCount ?? sp?.questionCount) || 0);
  if (q > 0) return q;
  for (const row of Array.isArray(sp?.topicOverviewRows) ? sp.topicOverviewRows : []) {
    q += Math.max(0, Number(row?.questions) || 0);
  }
  if (q > 0) return q;
  for (const tr of Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : []) {
    q += Math.max(0, Number(tr?.questions ?? tr?.questionCount) || 0);
  }
  if (q > 0) return q;
  const summary = payload?.summary && typeof payload.summary === "object" ? payload.summary : {};
  return Math.max(0, Number(summary.historyQuestions) || 0);
}

/**
 * @param {unknown} payload
 * @param {string} topicBaseKey
 */
export function findHistoryTopicRowKey(payload, topicBaseKey) {
  const base = String(topicBaseKey || "").trim();
  if (!base) return "";
  const rows = historyOverviewRowsForTopic(payload, base);
  const withData = rows.filter((r) => Number(r?.questions) > 0);
  if (withData.length) {
    return String(withData[0]?.topicRowKey || withData[0]?.topicKey || base);
  }
  if (rows.length) {
    return String(rows[0]?.topicRowKey || rows[0]?.topicKey || base);
  }
  return `${base}::grade:g6`;
}

/**
 * @param {{ topicBaseKey?: string|null; subtopicKey?: string|null; scopeLabel?: string }} lockOrScope
 */
export function historyScopeLabelFromLock(lockOrScope) {
  if (lockOrScope?.subtopicKey) {
    return historySubtopicLabelHe(String(lockOrScope.subtopicKey));
  }
  if (lockOrScope?.topicBaseKey) {
    return historyTopicLabelHe(String(lockOrScope.topicBaseKey));
  }
  return String(lockOrScope?.scopeLabel || "היסטוריה").trim() || "היסטוריה";
}

export function isHistoryZeroDataScope(scope) {
  return !!(scope && scope.historyZeroData);
}

/**
 * @param {object} scope
 */
export function composeHistoryZeroDataAnswerDraft({ scope }) {
  const label =
    String(scope?.scopeLabel || "").trim() ||
    historyScopeLabelFromLock({
      subtopicKey: scope?.historySubtopicKey || scope?.subtopicKey,
      topicBaseKey: scope?.topicBaseKey,
    });
  const truthPacket = {
    schemaVersion: "v1",
    audience: "parent",
    scopeType: scope.scopeType || "topic",
    scopeId: scope.scopeId || "history",
    scopeLabel: label,
    interpretationScope: "executive",
    derivedLimits: {
      cannotConcludeYet: true,
      recommendationEligible: false,
      recommendationIntensityCap: "RI0",
      readiness: "insufficient",
      confidenceBand: "low",
    },
    allowedFollowupFamilies: ["uncertainty_boundary"],
    surfaceFacts: {
      subjectId: "history",
      questions: 0,
      reportQuestionTotalGlobal: 0,
      displayName: label,
      accuracy: 0,
      subjectLabelHe: "היסטוריה",
    },
    contracts: {
      narrative: {
        textSlots: {
          observation: ZERO_DATA_HISTORY_TOPIC_HE,
          interpretation: `ב${label} לא נאספו עדיין מספיק שאלות בתקופה שנבחרה.`,
          uncertainty: "אפשר לחזור לשאלה אחרי עוד תרגול ממוקד בנושא.",
        },
      },
      decision: { cannotConcludeYet: true },
      readiness: { readiness: "insufficient" },
      confidence: { confidenceBand: "low" },
      recommendation: { eligible: false, intensity: "RI0" },
    },
  };
  return {
    truthPacket,
    plannerIntent: "explain_report",
    scopeMeta: {
      generationPath: "history_zero_data",
      answerComposerUsed: "history_zero_data",
      historyLock: true,
    },
    answerBlocks: [
      { type: "observation", textHe: ZERO_DATA_HISTORY_TOPIC_HE, source: "history_zero_data" },
      {
        type: "meaning",
        textHe: `ב${label} לא נאספו עדיין מספיק שאלות בתקופה שנבחרה בדוח.`,
        source: "history_zero_data",
      },
      {
        type: "next_step",
        textHe: "כדאי לתרגל 5–8 שאלות ממוקדות בנושא, ואז לשאול שוב.",
        source: "history_zero_data",
      },
    ],
  };
}

export default {
  ZERO_DATA_HISTORY_TOPIC_HE,
  detectHistoryCopilotLock,
  historyTopicQuestionsFromPayload,
  historySubtopicQuestionsFromPayload,
  historySubjectQuestionsFromPayload,
  findHistoryTopicRowKey,
  historyScopeLabelFromLock,
  isHistoryZeroDataScope,
  composeHistoryZeroDataAnswerDraft,
};
