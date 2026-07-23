/**
 * Demo unified learning-time breakdown — mirrors sumStudentLearningCreditedMinutesInIsraelMonth
 * for in-memory answers, book_page_visits and parent_activity_learning_visits.
 */
import {
  extractCreditedMsFromAnswerPayload,
  creditedMsToRoundedMinutes,
} from "../../learning/learning-time-credit-policy.js";
import {
  creditWallClockUnionMs,
  creditExclusiveCategoriesMs,
  exclusiveMsToDisplayMinutes,
  reconstructDwellWindow,
} from "../../learning/learning-time-union.js";

/**
 * @param {unknown} payload
 * @returns {string|null}
 */
function subjectKeyFromPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const raw =
    payload.subjectId ?? payload.subject_id ?? payload.subject ?? payload.subjectKey ?? null;
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  return s || null;
}

/**
 * @param {[number, number]|null} w
 * @param {'question'|'book'|'other'} category
 * @param {string|null} [subjectKey]
 */
function toTagged(w, category, subjectKey = null) {
  if (!w) return null;
  return { start: w[0], end: w[1], category, subjectKey: subjectKey || null };
}

/**
 * @param {Array<Record<string, unknown>>} answers
 */
function collectDemoAnswerTimeWindows(answers) {
  /** @type {Array<[number, number]>} */
  const windows = [];
  /** @type {Array<{ start: number, end: number, category: 'question', subjectKey: string|null }>} */
  const tagged = [];
  let analyzedQuestionCount = 0;

  for (const row of answers || []) {
    const payload =
      row.answer_payload && typeof row.answer_payload === "object" && !Array.isArray(row.answer_payload)
        ? row.answer_payload
        : {};
    const credited = extractCreditedMsFromAnswerPayload(payload);
    if (credited <= 0) continue;
    analyzedQuestionCount += 1;
    const end = new Date(String(row.answered_at || row.created_at || "")).getTime();
    if (!Number.isFinite(end)) continue;
    const w = reconstructDwellWindow({ endedAtMs: end, creditedMs: credited, rawMs: credited });
    if (w) {
      windows.push(w);
      const t = toTagged(w, "question", subjectKeyFromPayload(payload));
      if (t) tagged.push(t);
    }
  }

  return { windows, tagged, analyzedQuestionCount };
}

/**
 * @param {Array<Record<string, unknown>>} bookVisits
 */
function collectDemoBookTimeWindows(bookVisits) {
  /** @type {Array<[number, number]>} */
  const windows = [];
  /** @type {Array<{ start: number, end: number, category: 'book', subjectKey: string|null }>} */
  const tagged = [];

  for (const row of bookVisits || []) {
    const end = new Date(String(row.ended_at || "")).getTime();
    const started = new Date(String(row.started_at || "")).getTime();
    const raw = Number(row.raw_dwell_ms) || 0;
    const cred = Number(row.credited_dwell_ms) || 0;
    const w = reconstructDwellWindow({
      startedAtMs: started,
      endedAtMs: end,
      rawMs: Math.max(raw, cred),
      creditedMs: Math.max(raw, cred),
    });
    if (w) {
      windows.push(w);
      const subjectKey =
        row.subject != null && String(row.subject).trim()
          ? String(row.subject).trim().toLowerCase()
          : null;
      const t = toTagged(w, "book", subjectKey);
      if (t) tagged.push(t);
    }
  }

  return { windows, tagged };
}

/**
 * parent_activity_learning_visits → category "other" (collectParentVisitTimeWindowsInRange).
 * @param {Array<Record<string, unknown>>} parentActivityVisits
 */
function collectDemoParentActivityVisitTimeWindows(parentActivityVisits) {
  /** @type {Array<[number, number]>} */
  const windows = [];
  /** @type {Array<{ start: number, end: number, category: 'other', subjectKey: null }>} */
  const tagged = [];

  for (const row of parentActivityVisits || []) {
    const end = new Date(String(row.ended_at || "")).getTime();
    const started = new Date(String(row.started_at || "")).getTime();
    const raw = Number(row.raw_dwell_ms) || 0;
    const cred = Number(row.credited_dwell_ms) || 0;
    const w = reconstructDwellWindow({
      startedAtMs: started,
      endedAtMs: end,
      rawMs: Math.max(raw, cred),
      creditedMs: Math.max(raw, cred),
    });
    if (w) {
      windows.push(w);
      const t = toTagged(w, "other", null);
      if (t) tagged.push(t);
    }
  }

  return { windows, tagged };
}

/**
 * @param {Array<Record<string, unknown>>} answers
 * @param {Array<Record<string, unknown>>} bookVisits
 */
export function measureDemoQuestionAndBookMs(answers, bookVisits) {
  const answerPack = collectDemoAnswerTimeWindows(answers);
  const bookPack = collectDemoBookTimeWindows(bookVisits);
  const questionMs = creditWallClockUnionMs(answerPack.windows || []).creditedMs;
  const bookMs = creditWallClockUnionMs(bookPack.windows || []).creditedMs;
  return { questionMs, bookMs };
}

/**
 * @param {{
 *   answers: Array<Record<string, unknown>>,
 *   bookVisits: Array<Record<string, unknown>>,
 *   parentActivityVisits?: Array<Record<string, unknown>>,
 * }} input
 */
export function computeDemoUnifiedLearningTime(input) {
  const answerPack = collectDemoAnswerTimeWindows(input.answers);
  const bookPack = collectDemoBookTimeWindows(input.bookVisits);
  const parentVisitPack = collectDemoParentActivityVisitTimeWindows(input.parentActivityVisits || []);

  const allWindows = [
    ...(answerPack.windows || []),
    ...(bookPack.windows || []),
    ...(parentVisitPack.windows || []),
  ];

  const credited = creditWallClockUnionMs(allWindows);
  const minutes = credited.minutes;

  const tagged = [
    ...(answerPack.tagged || []),
    ...(bookPack.tagged || []),
    ...(parentVisitPack.tagged || []),
  ];
  const exclusive = creditExclusiveCategoriesMs(tagged);

  const exclusiveAligned = { ...exclusive, totalMs: credited.creditedMs };
  let otherMs = exclusive.otherActiveLearningMs;
  const exclusiveSum =
    exclusive.questionPracticeMs + exclusive.bookReadingMs + exclusive.otherActiveLearningMs;
  if (credited.creditedMs > exclusiveSum) {
    otherMs += credited.creditedMs - exclusiveSum;
  } else if (credited.creditedMs < exclusiveSum && exclusiveSum > 0) {
    const scale = credited.creditedMs / exclusiveSum;
    exclusiveAligned.questionPracticeMs = Math.floor(exclusive.questionPracticeMs * scale);
    exclusiveAligned.bookReadingMs = Math.floor(exclusive.bookReadingMs * scale);
    otherMs =
      credited.creditedMs -
      exclusiveAligned.questionPracticeMs -
      exclusiveAligned.bookReadingMs;
  }
  exclusiveAligned.otherActiveLearningMs = Math.max(0, otherMs);
  exclusiveAligned.totalMs =
    exclusiveAligned.questionPracticeMs +
    exclusiveAligned.bookReadingMs +
    exclusiveAligned.otherActiveLearningMs;

  const display = exclusiveMsToDisplayMinutes(exclusiveAligned, minutes);

  const bySubject = [];
  for (const [subjectKey, ms] of Object.entries(exclusive.bySubjectMs || {})) {
    const q = Math.max(0, Math.floor(Number(ms.questionPracticeMs) || 0));
    const b = Math.max(0, Math.floor(Number(ms.bookReadingMs) || 0));
    if (q <= 0 && b <= 0) continue;
    const subDisplay = exclusiveMsToDisplayMinutes(
      {
        questionPracticeMs: q,
        bookReadingMs: b,
        otherActiveLearningMs: 0,
        totalMs: q + b,
      },
      creditedMsToRoundedMinutes(q + b),
    );
    bySubject.push({
      subjectKey,
      questionPracticeMinutes: subDisplay.questionPracticeMinutes,
      bookReadingMinutes: subDisplay.bookReadingMinutes,
    });
  }
  bySubject.sort((a, b) => String(a.subjectKey).localeCompare(String(b.subjectKey), "en"));

  return {
    minutes,
    totalDurationSeconds: Math.max(0, Math.round(minutes * 60)),
    learningTimeExclusiveBreakdown: {
      totalMinutes: display.totalMinutes,
      questionPracticeMinutes: display.questionPracticeMinutes,
      bookReadingMinutes: display.bookReadingMinutes,
      otherActiveLearningMinutes: display.otherActiveLearningMinutes,
      analyzedQuestionCount: answerPack.analyzedQuestionCount,
      bySubject,
    },
  };
}
