/**
 * When a legitimate report question has no supporting evidence in the payload,
 * return NO_DATA_FOR_REQUEST_RESPONSE_HE instead of ambiguous clarification.
 */

import {
  NO_DATA_FOR_REQUEST_RESPONSE_HE,
  NO_DATA_SPECIFIC_FOR_REQUEST_RESPONSE_HE,
} from "./question-classifier.js";
import { maxGlobalReportQuestionCount } from "./report-volume-context.js";
import { foldUtteranceForHeMatch } from "./utterance-normalize-he.js";

const TREND_UTTERANCE_RE =
  /מה\s+השתנה|משבוע\s+קודם|מהשבוע\s+קודם|השבוע\s+קודם|האם\s+(?:הוא|היא)\s+מתקדם|יש\s+שיפור/u;
const PARENT_ACTIVITY_UTTERANCE_RE = /הפעילות\s+.*השפיע|מה\s+נתתי\s+ל(?:ו|ה)/u;
const SPEED_UTTERANCE_RE = /לחץ\s+זמן|עונה\s+מהר|מהר\s+מדי|בגלל\s+לחץ/u;
const SUBSKILL_UTTERANCE_RE = /תת[-\s]?מיומנות|מיומנות\s+ספ(?:צ|ס)יפית|האם\s+הבעיה\s+היא\s+נשיאה/u;

import {
  collectTopicMetrics,
  pickWeakestTopic,
  rowMetricsFromTopicRow,
  topicAnchorFields,
} from "./pattern-topic-metrics.js";
import { normalizeSubjectId } from "./contract-reader.js";

/**
 * @param {string} line
 */
export function isRealTrendLineHe(line) {
  const t = String(line || "").trim();
  if (!t) return false;
  if (
    /ראשוני\s+בלבד|אין\s+מספיק|לא\s+ניתן\s+ל(?:ראות|קבוע)|נבדקו\s+\d+\s+נושאים|בתקופה\s+שנבחרה|סיכום\s+תקופ/u.test(
      t,
    )
  ) {
    return false;
  }
  return /שיפור|ירידה|עלי(?:ה|ת)|ירד|עלה|התקד|מגמת|לעומת|מהשבוע|קודם|נמוך\s+יותר|גבוה\s+יותר|יציבות|דיוק\s+(?:עלה|ירד)/u.test(
    t,
  );
}

/**
 * Week-over-week or directional change — excludes cautionary «יציבות» without comparison.
 * @param {string} line
 */
export function isProgressComparisonTrendLineHe(line) {
  const t = String(line || "").trim();
  if (!t || !isRealTrendLineHe(t)) return false;
  if (/יציבות/u.test(t) && !/שיפור|ירידה|עלי(?:ה|ת)|ירד|עלה|התקד|לעומת|מהשבוע|השבוע\s+קודם|מגמת|דיוק\s+(?:עלה|ירד)/u.test(t)) {
    return false;
  }
  return /שיפור|ירידה|עלי(?:ה|ת)|ירד|עלה|התקד|לעומת|מהשבוע|השבוע\s+קודם|מגמת|דיוק\s+(?:עלה|ירד)/u.test(t);
}

/**
 * @param {unknown} payload
 */
export function hasProgressComparisonTrend(payload) {
  const trends = payload?.executiveSummary?.majorTrendsHe;
  if (!Array.isArray(trends) || trends.length === 0) return false;
  return trends.some((line) => isProgressComparisonTrendLineHe(line));
}

/**
 * @param {unknown} payload
 */
export function exportTrendEvidence(payload) {
  return hasTrendEvidence(payload);
}

/**
 * @param {unknown} payload
 */
function hasTrendEvidence(payload) {
  const trends = payload?.executiveSummary?.majorTrendsHe;
  if (!Array.isArray(trends) || trends.length === 0) return false;
  return trends.some((line) => isRealTrendLineHe(line));
}

/**
 * @param {unknown} payload
 */
function hasParentActivityEvidence(payload) {
  return !!exportParentActivityEvidence(payload);
}

/**
 * @param {unknown} payload
 * @returns {ReturnType<typeof topicAnchorFields>|null}
 */
export function exportParentActivityEvidence(payload) {
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  for (const sp of profiles) {
    const sid = normalizeSubjectId(sp?.subject);
    const recs = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    for (const tr of recs) {
      const riv = tr?.rowIdentityV1 && typeof tr.rowIdentityV1 === "object" ? tr.rowIdentityV1 : {};
      const sources = Array.isArray(riv.evidenceSources) ? riv.evidenceSources : [];
      const joined = `${JSON.stringify(sources)} ${String(tr?.contractsV1?.evidence?.primarySource || "")}`;
      if (/parent_assigned|parent.?activity|פעילות אישית/u.test(joined)) {
        const m = rowMetricsFromTopicRow({ ...tr, subjectId: sid }, sid);
        if (m.q > 0) return topicAnchorFields(m);
      }
    }
  }
  if (Number(payload?.summary?.parentActivityAttemptsCount || 0) > 0) {
    const weak = pickWeakestTopic(collectTopicMetrics(payload));
    return weak ? topicAnchorFields(weak) : null;
  }
  const attempts = Array.isArray(payload?.attempts)
    ? payload.attempts
    : Array.isArray(payload?.practiceAttempts)
      ? payload.practiceAttempts
      : [];
  if (attempts.some((a) => /parent/i.test(String(a?.source || a?.mode || a?.origin || "")))) {
    const weak = pickWeakestTopic(collectTopicMetrics(payload));
    return weak ? topicAnchorFields(weak) : null;
  }
  return null;
}

/**
 * @param {unknown} payload
 */
function hasSpeedEvidence(payload) {
  return !!exportSpeedEvidence(payload);
}

/**
 * @param {unknown} payload
 * @returns {ReturnType<typeof topicAnchorFields>|null}
 */
export function exportSpeedEvidence(payload) {
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  for (const sp of profiles) {
    const sid = normalizeSubjectId(sp?.subject);
    const recs = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    for (const tr of recs) {
      const slots = tr?.contractsV1?.narrative?.textSlots || {};
      const joined = [slots.observation, slots.interpretation, slots.uncertainty]
        .map((x) => String(x || ""))
        .join(" ");
      if (/מהיר|זמן\s+תגובה|לחץ\s+זמן|קצב/u.test(joined)) {
        const m = rowMetricsFromTopicRow({ ...tr, subjectId: sid }, sid);
        if (m.q > 0) return topicAnchorFields(m);
      }
    }
  }
  return null;
}

/**
 * @param {unknown} payload
 */
function hasSafeSubskillEvidence(payload) {
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  for (const sp of profiles) {
    const recs = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    for (const tr of recs) {
      const sub = tr?.contractsV1?.evidence?.safeSubskillHe || tr?.safeSubskillHe;
      if (String(sub || "").trim().length >= 3) return true;
    }
  }
  return false;
}

/**
 * @param {unknown} payload
 */
function hasCarrySubskillEvidence(payload) {
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  for (const sp of profiles) {
    const recs = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    for (const tr of recs) {
      const sub = String(tr?.contractsV1?.evidence?.safeSubskillHe || tr?.safeSubskillHe || "").trim();
      if (/נשיא/u.test(sub)) return true;
    }
  }
  return false;
}

/**
 * @param {string} utterance
 * @param {unknown} payload
 */
export function shouldReturnNoDataForRequest(utterance, payload) {
  const t = foldUtteranceForHeMatch(String(utterance || ""));
  if (!t) return false;

  if (/האם\s+הבעיה\s+היא\s+נשיאה/u.test(t) && !hasCarrySubskillEvidence(payload)) return true;

  const globalQ = maxGlobalReportQuestionCount(payload);
  if (globalQ > 0 && globalQ < 8) {
    if (TREND_UTTERANCE_RE.test(t) || PARENT_ACTIVITY_UTTERANCE_RE.test(t) || SPEED_UTTERANCE_RE.test(t)) {
      return true;
    }
  }

  if (TREND_UTTERANCE_RE.test(t) && !hasTrendEvidence(payload)) return true;
  if (PARENT_ACTIVITY_UTTERANCE_RE.test(t) && !hasParentActivityEvidence(payload)) return true;
  if (SPEED_UTTERANCE_RE.test(t) && !hasSpeedEvidence(payload)) return true;
  if (SUBSKILL_UTTERANCE_RE.test(t) && !hasSafeSubskillEvidence(payload)) return true;

  return false;
}

/**
 * @param {string} [utterance]
 * @param {unknown} [payload]
 */
export function noDataResponseHe(utterance = "", payload = null) {
  const globalQ = maxGlobalReportQuestionCount(payload);
  if (globalQ >= 8) {
    return NO_DATA_SPECIFIC_FOR_REQUEST_RESPONSE_HE;
  }
  return NO_DATA_FOR_REQUEST_RESPONSE_HE;
}

/**
 * @param {string} text
 */
export function isNoDataClarificationText(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  return (
    t === NO_DATA_FOR_REQUEST_RESPONSE_HE ||
    t === NO_DATA_SPECIFIC_FOR_REQUEST_RESPONSE_HE ||
    t.includes("אין מספיק מידע") ||
    t.includes("בדוח הנוכחי אין מספיק") ||
    t.includes("יש בדוח נתוני תרגול")
  );
}
