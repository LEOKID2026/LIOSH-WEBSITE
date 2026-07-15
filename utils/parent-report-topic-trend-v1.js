/**
 * Topic-level accuracy trend within a single report period (early vs recent answers).
 * Pure engine — no window / UI dependencies.
 */

import { EVIDENCE_SOURCE, normalizeEvidenceSourceKey } from "../lib/learning-supabase/evidence-source.js";
import { PARENT_REPORT_DISPLAY_TIMEZONE } from "../lib/learning-supabase/parent-report-activity-time.js";

export const TREND_V1_SOURCE = "parent_report_topic_timeline_v1";

export const TREND_V1_MIN_TOTAL = 8;
export const TREND_V1_MIN_HALF = 3;
export const TREND_V1_DELTA_THRESHOLD_PCT = 10;

const APPROVED_TREND_SOURCES = new Set([
  EVIDENCE_SOURCE.SELF_PRACTICE,
  EVIDENCE_SOURCE.PARENT_ASSIGNED,
]);

export const TREND_V1_PARENT_LINE_HE = Object.freeze({
  improving:
    "מגמה בתקופה: משתפר - בחלק המאוחר של התקופה הדיוק גבוה יותר מאשר בתחילתה.",
  stable:
    "מגמה בתקופה: ללא שינוי משמעותי - עדיין כדאי לחזק את הנושא בתרגול קצר.",
  declining:
    "מגמה בתקופה: צריך חיזוק - בחלק המאוחר של התקופה היו יותר טעויות, ולכן כדאי לחזק בתרגול קצר.",
  insufficient_data:
    "עדיין אין מספיק רצף תרגול כדי לזהות מגמה לאורך זמן.",
});

/** Short status label shown after "מגמה בתקופה:" in parent-facing lines. */
export const TREND_V1_STATUS_LABEL_HE = Object.freeze({
  improving: "משתפר",
  stable: "ללא שינוי משמעותי",
  declining: "צריך חיזוק",
});

/** Aggregate stores `moledet_geography`; V2 maps use `moledet-geography`. */
export const TREND_SUBJECT_STORE_KEY = Object.freeze({
  "moledet-geography": "moledet_geography",
});

/** @param {unknown} ms */
function calendarDayKeyIsrael(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PARENT_REPORT_DISPLAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(n));
}

/** @param {unknown} event */
function isApprovedTrendEvent(event) {
  if (!event || typeof event !== "object") return false;
  const src = normalizeEvidenceSourceKey(event.evidenceSource);
  if (!src || !APPROVED_TREND_SOURCES.has(src)) return false;
  const ms = Number(event.answeredAtMs);
  if (!Number.isFinite(ms)) return false;
  return event.isCorrect === true || event.isCorrect === false;
}

/**
 * @param {unknown[]} events
 */
export function filterApprovedTopicTrendEvents(events) {
  if (!Array.isArray(events)) return [];
  return events.filter(isApprovedTrendEvent);
}

/**
 * @param {{ questions: number, correct: number, fromMs: number|null, toMs: number|null }} slice
 */
function buildTrendWindowSlice(slice) {
  const questions = Math.max(0, Math.floor(Number(slice?.questions) || 0));
  const correct = Math.max(0, Math.min(questions, Math.floor(Number(slice?.correct) || 0)));
  const accuracyPct = questions > 0 ? Math.round((correct / questions) * 100) : null;
  return {
    questions,
    correct,
    accuracyPct,
    from:
      slice?.fromMs != null && Number.isFinite(slice.fromMs)
        ? new Date(slice.fromMs).toISOString()
        : null,
    to:
      slice?.toMs != null && Number.isFinite(slice.toMs)
        ? new Date(slice.toMs).toISOString()
        : null,
  };
}

/**
 * @param {unknown[]} approvedEvents
 */
export function computeTopicTrendV1(approvedEvents) {
  const events = filterApprovedTopicTrendEvents(approvedEvents).sort(
    (a, b) => Number(a.answeredAtMs) - Number(b.answeredAtMs),
  );
  const total = events.length;

  const insufficient = (confidence = "none") => ({
    ok: true,
    source: TREND_V1_SOURCE,
    direction: "insufficient_data",
    early: buildTrendWindowSlice({ questions: 0, correct: 0, fromMs: null, toMs: null }),
    recent: buildTrendWindowSlice({ questions: 0, correct: 0, fromMs: null, toMs: null }),
    deltaPct: null,
    confidence,
    parentLineHe: TREND_V1_PARENT_LINE_HE.insufficient_data,
  });

  if (total < TREND_V1_MIN_TOTAL) {
    return insufficient("none");
  }

  const uniqueDays = new Set(
    events.map((e) => calendarDayKeyIsrael(e.answeredAtMs)).filter(Boolean),
  );
  if (uniqueDays.size < 2) {
    return insufficient("none");
  }

  const earlyCount = Math.floor(total / 2);
  const earlyEvents = events.slice(0, earlyCount);
  const recentEvents = events.slice(earlyCount);

  if (
    earlyEvents.length < TREND_V1_MIN_HALF ||
    recentEvents.length < TREND_V1_MIN_HALF
  ) {
    return insufficient("none");
  }

  const sumSlice = (arr) => {
    let correct = 0;
    for (const e of arr) {
      if (e.isCorrect === true) correct += 1;
    }
    const fromMs = arr.length ? Number(arr[0].answeredAtMs) : null;
    const toMs = arr.length ? Number(arr[arr.length - 1].answeredAtMs) : null;
    return {
      questions: arr.length,
      correct,
      fromMs: Number.isFinite(fromMs) ? fromMs : null,
      toMs: Number.isFinite(toMs) ? toMs : null,
    };
  };

  const earlyAgg = sumSlice(earlyEvents);
  const recentAgg = sumSlice(recentEvents);
  const earlyAccuracy = earlyAgg.questions > 0 ? earlyAgg.correct / earlyAgg.questions : 0;
  const recentAccuracy = recentAgg.questions > 0 ? recentAgg.correct / recentAgg.questions : 0;
  const deltaPct = Math.round((recentAccuracy - earlyAccuracy) * 100);

  let direction = "stable";
  if (deltaPct >= TREND_V1_DELTA_THRESHOLD_PCT && recentAccuracy >= earlyAccuracy) {
    direction = "improving";
  } else if (deltaPct <= -TREND_V1_DELTA_THRESHOLD_PCT) {
    direction = "declining";
  }

  let confidence = "enough";
  if (total < 12 || uniqueDays.size === 2) {
    confidence = "thin";
  }

  return {
    ok: true,
    source: TREND_V1_SOURCE,
    direction,
    early: buildTrendWindowSlice(earlyAgg),
    recent: buildTrendWindowSlice(recentAgg),
    deltaPct,
    confidence,
    parentLineHe: TREND_V1_PARENT_LINE_HE[direction] || TREND_V1_PARENT_LINE_HE.stable,
  };
}

/**
 * @param {Record<string, unknown>|null|undefined} trendV1
 */
export function shouldShowTrendV1Line(trendV1) {
  const t = trendV1 && typeof trendV1 === "object" ? trendV1 : null;
  if (!t || t.ok !== true) return false;
  const d = String(t.direction || "").trim();
  return d === "improving" || d === "stable" || d === "declining";
}

/**
 * @param {Record<string, unknown>|null|undefined} trendV1
 */
export function trendV1DisplayLineHe(trendV1) {
  if (!shouldShowTrendV1Line(trendV1)) return "";
  const d = String(trendV1?.direction || "").trim();
  const canonical = TREND_V1_PARENT_LINE_HE[d];
  if (canonical) return canonical;
  return String(trendV1?.parentLineHe || "").trim();
}

export const PARENT_REPORT_TOPIC_ANSWER_EVENTS_STORAGE_KEY =
  "mleo_parent_report_topic_answer_events_v1";

/**
 * @returns {Record<string, Record<string, unknown[]>>|null}
 */
export function loadTopicAnswerEventsFromReportStorage() {
  try {
    const ls = globalThis.localStorage;
    if (!ls || typeof ls.getItem !== "function") return null;
    const raw = ls.getItem(PARENT_REPORT_TOPIC_ANSWER_EVENTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** @param {string} subjectId */
function resolveTrendSubjectStoreKey(subjectId) {
  const sid = String(subjectId || "").trim();
  return TREND_SUBJECT_STORE_KEY[sid] || sid;
}

/** @param {string} topicRowKey */
function topicRowKeyBase(topicRowKey) {
  const k = String(topicRowKey || "").trim();
  const idx = k.indexOf("::grade:");
  return idx >= 0 ? k.slice(0, idx) : k;
}

/**
 * @param {Record<string, unknown[]>|null|undefined} subjectEvents
 * @param {string} topicRowKey
 * @param {Record<string, unknown>|null|undefined} row
 */
export function resolveTopicAnswerEventsForRow(subjectEvents, topicRowKey, row) {
  if (!subjectEvents || typeof subjectEvents !== "object") return [];

  const keysToTry = [];
  const addKey = (key) => {
    const k = String(key || "").trim();
    if (k && !keysToTry.includes(k)) keysToTry.push(k);
  };

  addKey(topicRowKey);
  addKey(row?.topicRowKey);
  addKey(row?.bucketKey);
  addKey(topicRowKeyBase(topicRowKey));
  addKey(topicRowKeyBase(row?.topicRowKey));
  addKey(topicRowKeyBase(row?.bucketKey));

  for (const key of keysToTry) {
    const events = subjectEvents[key];
    if (Array.isArray(events) && events.length > 0) return events;
  }
  return [];
}

/**
 * @param {Record<string, Record<string, unknown>>} maps
 * @param {Record<string, Record<string, unknown[]>>|null|undefined} topicAnswerEventsBySubject
 */
export function enrichTopicMapsWithTrendV1(maps, topicAnswerEventsBySubject) {
  const store =
    topicAnswerEventsBySubject && typeof topicAnswerEventsBySubject === "object"
      ? topicAnswerEventsBySubject
      : null;

  for (const [subjectId, topicMap] of Object.entries(maps || {})) {
    if (!topicMap || typeof topicMap !== "object") continue;
    const storeKey = resolveTrendSubjectStoreKey(subjectId);
    const subjectEvents = store ? store[storeKey] || store[subjectId] : null;

    for (const [topicRowKey, row] of Object.entries(topicMap)) {
      if (!row || typeof row !== "object") continue;
      const events = store
        ? resolveTopicAnswerEventsForRow(subjectEvents, topicRowKey, row)
        : [];
      row.trendV1 = computeTopicTrendV1(events);
    }
  }
  return maps;
}
