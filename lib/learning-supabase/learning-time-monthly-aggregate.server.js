/**
 * אגרגציה חודשית אחידה לזמן למידה מזוכה — מקור אמת ל-UI, פרסים ודוחות.
 *
 * - שאלות (answers + parent/teacher attempts): עד 10 דק׳ לשאלה, סכום ללא תקרה כוללת
 * - ספרים / למידה פתוחה: ללא תקרת יחידה (idle מוחל בצד הלקוח בשמירה)
 * - visits: רק זמן שלא חופף לשאלות (union)
 * - אין תקרת 10 על רצף / פעילות / יום / חודש אחרי union
 * - דקה שעון אחת ≤ דקה מזוכה אחת (union)
 */

import {
  creditedMsToRoundedMinutes,
  creditedMsToSessionDurationSeconds,
  extractCreditedMsFromAnswerPayload,
  resolveSessionOrphanCreditedMs,
  MAX_LEARNING_SESSION_CREDITED_MS,
} from "../learning/learning-time-credit-policy.js";
import {
  creditWallClockUnionMs,
  creditExclusiveCategoriesMs,
  exclusiveMsToDisplayMinutes,
  reconstructDwellWindow,
} from "../learning/learning-time-union.js";
import {
  sumLegacyParentAttemptMsWithoutVisits,
  isParentActivityVisitsTableMissingError,
} from "./parent-activity-learning-visits.server.js";
import { isBookTrackingTablesMissingError } from "./book-events.server.js";
import { resolveParentAttemptCreditedTimeMs } from "./parent-activity-learning-credit.server.js";

const MAX_ANSWER_ROWS = 20_000;
const MAX_SESSION_ROWS = 5_000;
const MAX_VISIT_ROWS = 50_000;
/** PostgREST URL limit — keep `.in()` batches small. */
const SESSION_ANSWER_IN_BATCH_SIZE = 150;
const SESSION_PAGE_SIZE = 1000;

function chunkArray(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/**
 * @param {unknown} payload
 * @returns {string|null}
 */
function subjectKeyFromPayload(payload) {
  if (!isPlainObject(payload)) return null;
  const raw =
    payload.subjectId ??
    payload.subject_id ??
    payload.subject ??
    payload.subjectKey ??
    null;
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
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} startIso
 * @param {string} endIsoExclusive
 * @returns {Promise<Array<[number, number]>>}
 */
export async function collectAnswerTimeWindowsInRange(supabase, studentId, startIso, endIsoExclusive) {
  const { data, error } = await supabase
    .from("answers")
    .select("answer_payload, answered_at")
    .eq("student_id", studentId)
    .gte("answered_at", startIso)
    .lt("answered_at", endIsoExclusive)
    .limit(MAX_ANSWER_ROWS);

  if (error) throw error;
  /** @type {Array<[number, number]>} */
  const windows = [];
  /** @type {Array<{ start: number, end: number, category: 'question', subjectKey: string|null }>} */
  const tagged = [];
  let analyzedQuestionCount = 0;
  for (const row of data || []) {
    const credited = extractCreditedMsFromAnswerPayload(row.answer_payload);
    if (credited <= 0) continue;
    analyzedQuestionCount += 1;
    const end = new Date(row.answered_at).getTime();
    if (!Number.isFinite(end)) continue;
    const w = reconstructDwellWindow({ endedAtMs: end, creditedMs: credited, rawMs: credited });
    if (w) {
      windows.push(w);
      const t = toTagged(w, "question", subjectKeyFromPayload(row.answer_payload));
      if (t) tagged.push(t);
    }
  }
  return { windows, tagged, analyzedQuestionCount };
}

/**
 * זמני שאלות מפעילות הורה — מקור מועדף על visit שלם.
 */
export async function collectParentAttemptTimeWindowsInRange(
  supabase,
  studentId,
  startIso,
  endIsoExclusive
) {
  /** @type {Array<[number, number]>} */
  const windows = [];
  /** @type {Array<{ start: number, end: number, category: 'question', subjectKey: string|null }>} */
  const tagged = [];
  let analyzedQuestionCount = 0;
  try {
    const { data, error } = await supabase
      .from("parent_activity_attempts")
      .select("time_spent_ms, question_snapshot, answered_at, is_correct")
      .eq("student_id", studentId)
      .gte("answered_at", startIso)
      .lt("answered_at", endIsoExclusive)
      .limit(MAX_VISIT_ROWS);

    if (error) {
      if (isParentActivityVisitsTableMissingError(error) || error?.code === "42P01") {
        return { windows: [], tagged: [], analyzedQuestionCount: 0, schemaUnavailable: true };
      }
      throw error;
    }

    for (const attempt of data || []) {
      if (attempt?.is_correct == null) continue;
      analyzedQuestionCount += 1;
      const credited = resolveParentAttemptCreditedTimeMs(attempt);
      if (credited == null || credited <= 0) continue;
      const end = new Date(attempt.answered_at).getTime();
      const w = reconstructDwellWindow({
        endedAtMs: end,
        creditedMs: credited,
        rawMs: credited,
      });
      if (w) {
        windows.push(w);
        const snap = isPlainObject(attempt.question_snapshot) ? attempt.question_snapshot : {};
        const t = toTagged(w, "question", subjectKeyFromPayload(snap));
        if (t) tagged.push(t);
      }
    }
    return { windows, tagged, analyzedQuestionCount, schemaUnavailable: false };
  } catch (error) {
    if (error?.code === "42P01" || isParentActivityVisitsTableMissingError(error)) {
      return { windows: [], tagged: [], analyzedQuestionCount: 0, schemaUnavailable: true };
    }
    throw error;
  }
}

/**
 * זמני שאלות מפעילות מורה / כיתה.
 */
export async function collectTeacherAttemptTimeWindowsInRange(
  supabase,
  studentId,
  startIso,
  endIsoExclusive
) {
  /** @type {Array<[number, number]>} */
  const windows = [];
  /** @type {Array<{ start: number, end: number, category: 'question', subjectKey: string|null }>} */
  const tagged = [];
  let analyzedQuestionCount = 0;
  try {
    const { data, error } = await supabase
      .from("classroom_activity_attempts")
      .select("time_spent_ms, question_snapshot, answered_at, is_correct")
      .eq("student_id", studentId)
      .gte("answered_at", startIso)
      .lt("answered_at", endIsoExclusive)
      .limit(MAX_VISIT_ROWS);

    if (error) {
      if (error?.code === "42P01" || error?.code === "PGRST205") {
        return { windows: [], tagged: [], analyzedQuestionCount: 0, schemaUnavailable: true };
      }
      throw error;
    }

    for (const attempt of data || []) {
      if (attempt?.is_correct == null) continue;
      analyzedQuestionCount += 1;
      const snap = isPlainObject(attempt.question_snapshot) ? attempt.question_snapshot : {};
      let credited = Number(snap.creditedTimeMs);
      if (!Number.isFinite(credited) || credited < 0) {
        const raw = Number(attempt.time_spent_ms) || Number(snap.rawTimeSpentMs) || 0;
        credited = Math.min(Math.max(0, Math.floor(raw)), 600_000);
      } else {
        credited = Math.min(Math.floor(credited), 600_000);
      }
      if (credited <= 0) continue;
      const end = new Date(attempt.answered_at).getTime();
      const w = reconstructDwellWindow({
        endedAtMs: end,
        creditedMs: credited,
        rawMs: credited,
      });
      if (w) {
        windows.push(w);
        const t = toTagged(w, "question", subjectKeyFromPayload(snap));
        if (t) tagged.push(t);
      }
    }
    return { windows, tagged, analyzedQuestionCount, schemaUnavailable: false };
  } catch (error) {
    if (error?.code === "42P01" || error?.code === "PGRST205") {
      return { windows: [], tagged: [], analyzedQuestionCount: 0, schemaUnavailable: true };
    }
    throw error;
  }
}

/**
 * Visits — זמן פעילות שאינו מכוסה בשאלות (ימולא בפערים דרך union).
 */
export async function collectParentVisitTimeWindowsInRange(
  supabase,
  studentId,
  startIso,
  endIsoExclusive
) {
  /** @type {Array<[number, number]>} */
  const windows = [];
  /** @type {Array<{ start: number, end: number, category: 'other', subjectKey: null }>} */
  const tagged = [];
  try {
    const { data, error } = await supabase
      .from("parent_activity_learning_visits")
      .select("activity_id, credited_dwell_ms, raw_dwell_ms, started_at, ended_at")
      .eq("student_id", studentId)
      .gte("ended_at", startIso)
      .lt("ended_at", endIsoExclusive)
      .limit(MAX_VISIT_ROWS);

    if (error) {
      if (isParentActivityVisitsTableMissingError(error)) {
        return { windows: [], tagged: [], schemaUnavailable: true };
      }
      throw error;
    }

    for (const row of data || []) {
      const end = new Date(row.ended_at).getTime();
      const started = new Date(row.started_at).getTime();
      // Prefer raw for historical reconstruction when credited was wrongly visit-capped at 10.
      // Union with attempt windows prevents double-counting question time.
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

    if ((data || []).length === 0) {
      const legacyMs = await sumLegacyParentAttemptMsWithoutVisits(
        supabase,
        studentId,
        startIso,
        endIsoExclusive
      );
      if (legacyMs > 0) {
        // Attempts already collected separately; skip duplicating here.
      }
    }

    return { windows, tagged, schemaUnavailable: false };
  } catch (error) {
    if (isParentActivityVisitsTableMissingError(error)) {
      return { windows: [], tagged: [], schemaUnavailable: true };
    }
    throw error;
  }
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} startIso
 * @param {string} endIsoExclusive
 */
export async function collectBookTimeWindowsInRange(supabase, studentId, startIso, endIsoExclusive) {
  /** @type {Array<[number, number]>} */
  const windows = [];
  /** @type {Array<{ start: number, end: number, category: 'book', subjectKey: string|null }>} */
  const tagged = [];
  try {
    const { data, error } = await supabase
      .from("book_page_visits")
      .select("credited_dwell_ms, raw_dwell_ms, started_at, ended_at, subject")
      .eq("student_id", studentId)
      .not("ended_at", "is", null)
      .gte("ended_at", startIso)
      .lt("ended_at", endIsoExclusive)
      .limit(MAX_ANSWER_ROWS);

    if (error) {
      if (isBookTrackingTablesMissingError(error)) {
        return { windows: [], tagged: [], schemaUnavailable: true };
      }
      throw error;
    }

    for (const row of data || []) {
      const end = new Date(row.ended_at).getTime();
      const started = new Date(row.started_at).getTime();
      const raw = Number(row.raw_dwell_ms) || 0;
      const cred = Number(row.credited_dwell_ms) || 0;
      // Prefer raw when historical credit was page-capped at 10; idle cannot be proven retroactively.
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
    return { windows, tagged, schemaUnavailable: false };
  } catch (error) {
    if (isBookTrackingTablesMissingError(error)) {
      return { windows: [], tagged: [], schemaUnavailable: true };
    }
    throw error;
  }
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} startIso
 * @param {string} endIsoExclusive
 */
async function fetchCompletedSessionsInRange(supabase, studentId, startIso, endIsoExclusive) {
  /** @type {Array<Record<string, unknown>>} */
  const sessions = [];
  for (let offset = 0; offset < MAX_SESSION_ROWS; offset += SESSION_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("learning_sessions")
      .select("id, duration_seconds, metadata, started_at, ended_at, status")
      .eq("student_id", studentId)
      .eq("status", "completed")
      .gte("started_at", startIso)
      .lt("started_at", endIsoExclusive)
      .order("started_at", { ascending: true })
      .range(offset, offset + SESSION_PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;
    sessions.push(...data);
    if (data.length < SESSION_PAGE_SIZE) break;
  }
  return sessions;
}

async function fetchAnswerPayloadsForSessionIds(supabase, sessionIds) {
  /** @type {Array<{ learning_session_id: string, answer_payload: unknown }>} */
  const rows = [];
  for (const batch of chunkArray(sessionIds, SESSION_ANSWER_IN_BATCH_SIZE)) {
    if (!batch.length) continue;
    const { data, error } = await supabase
      .from("answers")
      .select("learning_session_id, answer_payload")
      .in("learning_session_id", batch);
    if (error) throw error;
    if (data?.length) rows.push(...data);
  }
  return rows;
}

export async function collectOrphanTimeWindowsInRange(
  supabase,
  studentId,
  startIso,
  endIsoExclusive
) {
  const sessions = await fetchCompletedSessionsInRange(supabase, studentId, startIso, endIsoExclusive);
  if (!sessions.length) return { windows: [], tagged: [] };

  const sessionIds = sessions.map((s) => s.id).filter(Boolean);
  const answers = await fetchAnswerPayloadsForSessionIds(supabase, sessionIds);

  /** @type {Map<string, number>} */
  const answerMsBySession = new Map();
  for (const row of answers) {
    const sid = row.learning_session_id;
    if (!sid) continue;
    answerMsBySession.set(
      sid,
      (answerMsBySession.get(sid) || 0) + extractCreditedMsFromAnswerPayload(row.answer_payload)
    );
  }

  /** @type {Array<[number, number]>} */
  const windows = [];
  /** @type {Array<{ start: number, end: number, category: 'other', subjectKey: null }>} */
  const tagged = [];
  for (const session of sessions) {
    const answerSum = answerMsBySession.get(session.id) || 0;
    const meta = isPlainObject(session.metadata) ? session.metadata : {};
    const summary = isPlainObject(meta.summary) ? meta.summary : {};
    let orphan = resolveSessionOrphanCreditedMs(answerSum, 0, session.duration_seconds);
    if (orphan <= 0 && answerSum <= 0) {
      const storedOrphan = Number(summary.orphanCreditedMs);
      if (Number.isFinite(storedOrphan) && storedOrphan > 0) {
        orphan = resolveSessionOrphanCreditedMs(0, Math.floor(storedOrphan), 0);
      }
    }
    if (orphan <= 0) continue;

    const start = new Date(session.started_at).getTime();
    const endedAt = session.ended_at
      ? new Date(session.ended_at).getTime()
      : start + Math.floor(Number(session.duration_seconds) || 0) * 1000;
    if (!Number.isFinite(start) || !Number.isFinite(endedAt) || endedAt <= start) {
      const end = start + Math.floor(Number(session.duration_seconds) || 0) * 1000;
      const w = reconstructDwellWindow({ endedAtMs: end, creditedMs: orphan, rawMs: orphan });
      if (w) {
        windows.push(w);
        const t = toTagged(w, "other", null);
        if (t) tagged.push(t);
      }
      continue;
    }
    const wStart = Math.max(start, endedAt - orphan);
    if (endedAt > wStart) {
      const w = /** @type {[number, number]} */ ([wStart, endedAt]);
      windows.push(w);
      const t = toTagged(w, "other", null);
      if (t) tagged.push(t);
    }
  }
  return { windows, tagged };
}

/** @deprecated kept for callers that only need answer ms sums */
export async function sumAnswerCreditedMsInRange(supabase, studentId, startIso, endIsoExclusive) {
  const { windows } = await collectAnswerTimeWindowsInRange(supabase, studentId, startIso, endIsoExclusive);
  const ms = windows.reduce((a, [s, e]) => a + (e - s), 0);
  return { ms, count: windows.length };
}

export async function sumBookPageCreditedMsInRange(supabase, studentId, startIso, endIsoExclusive) {
  const { windows, schemaUnavailable } = await collectBookTimeWindowsInRange(
    supabase,
    studentId,
    startIso,
    endIsoExclusive
  );
  if (schemaUnavailable) return { ms: 0, schemaUnavailable: true };
  const ms = windows.reduce((a, [s, e]) => a + (e - s), 0);
  return { ms, schemaUnavailable: false };
}

export async function sumAnswerCreditedMsForSession(supabase, learningSessionId) {
  const { data, error } = await supabase
    .from("answers")
    .select("answer_payload")
    .eq("learning_session_id", learningSessionId);

  if (error) throw error;

  let totalMs = 0;
  for (const row of data || []) {
    totalMs += extractCreditedMsFromAnswerPayload(row.answer_payload);
  }
  return totalMs;
}

export async function sumSessionOrphanCreditedMsInRange(
  supabase,
  studentId,
  startIso,
  endIsoExclusive
) {
  const { windows } = await collectOrphanTimeWindowsInRange(
    supabase,
    studentId,
    startIso,
    endIsoExclusive
  );
  const ms = windows.reduce((a, [s, e]) => a + (e - s), 0);
  return { ms };
}

/**
 * סכום דקות מזוכות — union ללא תקרת רצף.
 */
export async function sumStudentLearningCreditedMinutesInIsraelMonth(
  supabase,
  studentId,
  startIso,
  endIsoExclusive,
  opts = {}
) {
  const [
    answerPack,
    parentAttempts,
    teacherAttempts,
    parentPack,
    bookPack,
    orphanPack,
  ] = await Promise.all([
    collectAnswerTimeWindowsInRange(supabase, studentId, startIso, endIsoExclusive),
    collectParentAttemptTimeWindowsInRange(supabase, studentId, startIso, endIsoExclusive),
    collectTeacherAttemptTimeWindowsInRange(supabase, studentId, startIso, endIsoExclusive),
    collectParentVisitTimeWindowsInRange(supabase, studentId, startIso, endIsoExclusive),
    collectBookTimeWindowsInRange(supabase, studentId, startIso, endIsoExclusive),
    collectOrphanTimeWindowsInRange(supabase, studentId, startIso, endIsoExclusive),
  ]);

  const answerWindows = answerPack.windows || [];
  const questionWindows = [
    ...answerWindows,
    ...(parentAttempts.windows || []),
    ...(teacherAttempts.windows || []),
  ];

  const allWindows = [
    ...questionWindows,
    ...(parentPack.windows || []),
    ...(bookPack.windows || []),
    ...(orphanPack.windows || []),
  ];

  // Critical: NO streak cap after union
  const credited = creditWallClockUnionMs(allWindows);

  let minutes = credited.minutes;

  const monthlyCap = Math.floor(Number(opts.economyMonthlyCap) || 0);
  if (opts.applyEconomyMonthlyCap !== false && monthlyCap > 0 && minutes > monthlyCap) {
    minutes = monthlyCap;
  }

  const answerRawMs = answerWindows.reduce((a, [s, e]) => a + (e - s), 0);
  const parentAttemptMs = (parentAttempts.windows || []).reduce((a, [s, e]) => a + (e - s), 0);
  const teacherAttemptMs = (teacherAttempts.windows || []).reduce((a, [s, e]) => a + (e - s), 0);
  const parentVisitMs = (parentPack.windows || []).reduce((a, [s, e]) => a + (e - s), 0);
  const bookRawMs = (bookPack.windows || []).reduce((a, [s, e]) => a + (e - s), 0);
  const orphanRawMs = (orphanPack.windows || []).reduce((a, [s, e]) => a + (e - s), 0);

  const tagged = [
    ...(answerPack.tagged || []),
    ...(parentAttempts.tagged || []),
    ...(teacherAttempts.tagged || []),
    ...(bookPack.tagged || []),
    ...(parentPack.tagged || []),
    ...(orphanPack.tagged || []),
  ];
  const exclusive = creditExclusiveCategoriesMs(tagged);
  // Align exclusive total to credited union ms (same wall clock).
  // creditExclusiveCategoriesMs already exclusive; assert equals credited when tags cover all windows.
  const exclusiveAligned = {
    ...exclusive,
    totalMs: credited.creditedMs,
  };
  // If exclusive sum differs slightly due to uncovered gaps, fold remainder into otherActiveLearning.
  const exclusiveSum =
    exclusive.questionPracticeMs + exclusive.bookReadingMs + exclusive.otherActiveLearningMs;
  let otherMs = exclusive.otherActiveLearningMs;
  if (credited.creditedMs > exclusiveSum) {
    otherMs += credited.creditedMs - exclusiveSum;
  } else if (credited.creditedMs < exclusiveSum && exclusiveSum > 0) {
    // Scale down proportionally in ms (should be rare).
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
      creditedMsToRoundedMinutes(q + b)
    );
    bySubject.push({
      subjectKey,
      questionPracticeMinutes: subDisplay.questionPracticeMinutes,
      bookReadingMinutes: subDisplay.bookReadingMinutes,
    });
  }
  bySubject.sort((a, b) =>
    String(a.subjectKey).localeCompare(String(b.subjectKey), "en")
  );

  const analyzedQuestionCount =
    (Number(answerPack.analyzedQuestionCount) || 0) +
    (Number(parentAttempts.analyzedQuestionCount) || 0) +
    (Number(teacherAttempts.analyzedQuestionCount) || 0);

  const learningTimeExclusiveBreakdown = {
    totalMinutes: display.totalMinutes,
    questionPracticeMinutes: display.questionPracticeMinutes,
    bookReadingMinutes: display.bookReadingMinutes,
    otherActiveLearningMinutes: display.otherActiveLearningMinutes,
    analyzedQuestionCount,
    bySubject,
    _ms: {
      questionPracticeMs: exclusiveAligned.questionPracticeMs,
      bookReadingMs: exclusiveAligned.bookReadingMs,
      otherActiveLearningMs: exclusiveAligned.otherActiveLearningMs,
      totalMs: exclusiveAligned.totalMs,
    },
  };

  return {
    minutes,
    breakdown: {
      answersMs: answerRawMs,
      parentAttemptMs,
      teacherAttemptMs,
      parentMinutes: creditedMsToRoundedMinutes(parentVisitMs),
      bookMs: bookRawMs,
      orphanMs: orphanRawMs,
      unionMs: credited.unionMs,
      overlapMs: credited.overlapMs,
      creditedMs: credited.creditedMs,
      segmentCount: credited.segmentCount,
      streakCapApplied: false,
    },
    learningTimeExclusiveBreakdown,
  };
}

export async function resolveSessionFinishCreditedDuration(supabase, learningSessionId, opts = {}) {
  const answerCreditedMs = await sumAnswerCreditedMsForSession(supabase, learningSessionId);
  const clientAccruedMs = Math.max(0, Math.floor(Number(opts.clientAccruedMs) || 0));
  const orphanCreditedMs = resolveSessionOrphanCreditedMs(answerCreditedMs, clientAccruedMs);
  const creditedMsTotal = Math.min(
    answerCreditedMs + orphanCreditedMs,
    MAX_LEARNING_SESSION_CREDITED_MS
  );

  return {
    durationSeconds: creditedMsToSessionDurationSeconds(creditedMsTotal),
    creditedMsTotal,
    orphanCreditedMs,
    answerCreditedMs,
  };
}
