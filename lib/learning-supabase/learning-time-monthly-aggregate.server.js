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

function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
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
  for (const row of data || []) {
    const credited = extractCreditedMsFromAnswerPayload(row.answer_payload);
    if (credited <= 0) continue;
    const end = new Date(row.answered_at).getTime();
    if (!Number.isFinite(end)) continue;
    const w = reconstructDwellWindow({ endedAtMs: end, creditedMs: credited, rawMs: credited });
    if (w) windows.push(w);
  }
  return windows;
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
        return { windows: [], schemaUnavailable: true };
      }
      throw error;
    }

    for (const attempt of data || []) {
      if (attempt?.is_correct == null) continue;
      const credited = resolveParentAttemptCreditedTimeMs(attempt);
      if (credited == null || credited <= 0) continue;
      const end = new Date(attempt.answered_at).getTime();
      const w = reconstructDwellWindow({
        endedAtMs: end,
        creditedMs: credited,
        rawMs: credited,
      });
      if (w) windows.push(w);
    }
    return { windows, schemaUnavailable: false };
  } catch (error) {
    if (error?.code === "42P01" || isParentActivityVisitsTableMissingError(error)) {
      return { windows: [], schemaUnavailable: true };
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
        return { windows: [], schemaUnavailable: true };
      }
      throw error;
    }

    for (const attempt of data || []) {
      if (attempt?.is_correct == null) continue;
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
      if (w) windows.push(w);
    }
    return { windows, schemaUnavailable: false };
  } catch (error) {
    if (error?.code === "42P01" || error?.code === "PGRST205") {
      return { windows: [], schemaUnavailable: true };
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
        return { windows: [], schemaUnavailable: true };
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
      if (w) windows.push(w);
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

    return { windows, schemaUnavailable: false };
  } catch (error) {
    if (isParentActivityVisitsTableMissingError(error)) {
      return { windows: [], schemaUnavailable: true };
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
  try {
    const { data, error } = await supabase
      .from("book_page_visits")
      .select("credited_dwell_ms, raw_dwell_ms, started_at, ended_at")
      .eq("student_id", studentId)
      .not("ended_at", "is", null)
      .gte("ended_at", startIso)
      .lt("ended_at", endIsoExclusive)
      .limit(MAX_ANSWER_ROWS);

    if (error) {
      if (isBookTrackingTablesMissingError(error)) {
        return { windows: [], schemaUnavailable: true };
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
      if (w) windows.push(w);
    }
    return { windows, schemaUnavailable: false };
  } catch (error) {
    if (isBookTrackingTablesMissingError(error)) {
      return { windows: [], schemaUnavailable: true };
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
export async function collectOrphanTimeWindowsInRange(
  supabase,
  studentId,
  startIso,
  endIsoExclusive
) {
  const { data: sessions, error: sErr } = await supabase
    .from("learning_sessions")
    .select("id, duration_seconds, metadata, started_at, ended_at, status")
    .eq("student_id", studentId)
    .eq("status", "completed")
    .gte("started_at", startIso)
    .lt("started_at", endIsoExclusive)
    .limit(MAX_SESSION_ROWS);

  if (sErr) throw sErr;
  if (!sessions?.length) return [];

  const sessionIds = sessions.map((s) => s.id).filter(Boolean);
  const { data: answers, error: aErr } = await supabase
    .from("answers")
    .select("learning_session_id, answer_payload")
    .in("learning_session_id", sessionIds);

  if (aErr) throw aErr;

  /** @type {Map<string, number>} */
  const answerMsBySession = new Map();
  for (const row of answers || []) {
    const sid = row.learning_session_id;
    if (!sid) continue;
    answerMsBySession.set(
      sid,
      (answerMsBySession.get(sid) || 0) + extractCreditedMsFromAnswerPayload(row.answer_payload)
    );
  }

  /** @type {Array<[number, number]>} */
  const windows = [];
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
      if (w) windows.push(w);
      continue;
    }
    const wStart = Math.max(start, endedAt - orphan);
    if (endedAt > wStart) windows.push([wStart, endedAt]);
  }
  return windows;
}

/** @deprecated kept for callers that only need answer ms sums */
export async function sumAnswerCreditedMsInRange(supabase, studentId, startIso, endIsoExclusive) {
  const windows = await collectAnswerTimeWindowsInRange(supabase, studentId, startIso, endIsoExclusive);
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
  const windows = await collectOrphanTimeWindowsInRange(
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
  const answerWindows = await collectAnswerTimeWindowsInRange(
    supabase,
    studentId,
    startIso,
    endIsoExclusive
  );
  const parentAttempts = await collectParentAttemptTimeWindowsInRange(
    supabase,
    studentId,
    startIso,
    endIsoExclusive
  );
  const teacherAttempts = await collectTeacherAttemptTimeWindowsInRange(
    supabase,
    studentId,
    startIso,
    endIsoExclusive
  );
  const parentPack = await collectParentVisitTimeWindowsInRange(
    supabase,
    studentId,
    startIso,
    endIsoExclusive
  );
  const bookPack = await collectBookTimeWindowsInRange(
    supabase,
    studentId,
    startIso,
    endIsoExclusive
  );
  const orphanWindows = await collectOrphanTimeWindowsInRange(
    supabase,
    studentId,
    startIso,
    endIsoExclusive
  );

  const questionWindows = [
    ...answerWindows,
    ...(parentAttempts.windows || []),
    ...(teacherAttempts.windows || []),
  ];

  const allWindows = [
    ...questionWindows,
    ...(parentPack.windows || []),
    ...(bookPack.windows || []),
    ...orphanWindows,
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
  const orphanRawMs = orphanWindows.reduce((a, [s, e]) => a + (e - s), 0);

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
