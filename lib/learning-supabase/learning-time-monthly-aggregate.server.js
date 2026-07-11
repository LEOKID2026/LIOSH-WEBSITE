/**
 * אגרגציה חודשית אחידה לזמן למידה מזוכה — מקור אמת ל-UI, פרסים ודוחות.
 *
 * מקורות (ללא כפילות):
 * - answers.answer_payload.creditedTimeMs — כל שאלה/יחידה במסטרים
 * - parent_activity_attempts — פעילות מהורה
 * - book_page_visits.credited_dwell_ms — עמוד ספר (לא סכום session)
 * - יתום מפגישות — יחידה אחרונה שלא נשמרה כתשובה
 */

import {
  creditedMsToRoundedMinutes,
  creditedMsToSessionDurationSeconds,
  extractCreditedMsFromAnswerPayload,
  resolveSessionOrphanCreditedMs,
  capStoredSessionDurationSeconds,
  MAX_LEARNING_SESSION_CREDITED_MS,
} from "../learning/learning-time-credit-policy.js";
import {
  sumParentActivityCreditedMinutesInRange,
  resolveParentAttemptCreditedTimeMs,
} from "./parent-activity-learning-credit.server.js";
import { isMissingColumnError } from "./learning-activity.js";
import { isBookTrackingTablesMissingError } from "./book-events.server.js";

const MAX_ANSWER_ROWS = 20_000;
const MAX_SESSION_ROWS = 5_000;

function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} startIso
 * @param {string} endIsoExclusive
 */
export async function sumAnswerCreditedMsInRange(supabase, studentId, startIso, endIsoExclusive) {
  const { data, error } = await supabase
    .from("answers")
    .select("answer_payload, answered_at")
    .eq("student_id", studentId)
    .gte("answered_at", startIso)
    .lt("answered_at", endIsoExclusive)
    .limit(MAX_ANSWER_ROWS);

  if (error) throw error;

  let totalMs = 0;
  for (const row of data || []) {
    totalMs += extractCreditedMsFromAnswerPayload(row.answer_payload);
  }
  return { ms: totalMs, count: (data || []).length };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} startIso
 * @param {string} endIsoExclusive
 */
export async function sumBookPageCreditedMsInRange(supabase, studentId, startIso, endIsoExclusive) {
  try {
    const { data, error } = await supabase
      .from("book_page_visits")
      .select("credited_dwell_ms, ended_at")
      .eq("student_id", studentId)
      .not("ended_at", "is", null)
      .gte("ended_at", startIso)
      .lt("ended_at", endIsoExclusive)
      .limit(MAX_ANSWER_ROWS);

    if (error) {
      if (isBookTrackingTablesMissingError(error)) {
        return { ms: 0, schemaUnavailable: true };
      }
      throw error;
    }

    let totalMs = 0;
    for (const row of data || []) {
      const credited = Math.floor(Number(row.credited_dwell_ms) || 0);
      if (credited > 0) totalMs += credited;
    }
    return { ms: totalMs, schemaUnavailable: false };
  } catch (error) {
    if (isBookTrackingTablesMissingError(error)) {
      return { ms: 0, schemaUnavailable: true };
    }
    throw error;
  }
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} learningSessionId
 */
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

/**
 * יתום מפגישות שהושלמו בחודש — לא סופר תשובות שוב.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} startIso
 * @param {string} endIsoExclusive
 */
export async function sumSessionOrphanCreditedMsInRange(
  supabase,
  studentId,
  startIso,
  endIsoExclusive
) {
  const { data: sessions, error: sErr } = await supabase
    .from("learning_sessions")
    .select("id, duration_seconds, metadata, started_at, status")
    .eq("student_id", studentId)
    .eq("status", "completed")
    .gte("started_at", startIso)
    .lt("started_at", endIsoExclusive)
    .limit(MAX_SESSION_ROWS);

  if (sErr) throw sErr;
  if (!sessions?.length) return { ms: 0 };

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
    const prev = answerMsBySession.get(sid) || 0;
    answerMsBySession.set(sid, prev + extractCreditedMsFromAnswerPayload(row.answer_payload));
  }

  let orphanMs = 0;
  for (const session of sessions) {
    const sid = session.id;
    const answerSum = answerMsBySession.get(sid) || 0;
    const meta = isPlainObject(session.metadata) ? session.metadata : {};
    const summary = isPlainObject(meta.summary) ? meta.summary : {};
    const storedOrphan = Number(summary.orphanCreditedMs);
    if (Number.isFinite(storedOrphan) && storedOrphan > 0) {
      orphanMs += Math.floor(storedOrphan);
      continue;
    }
    orphanMs += resolveSessionOrphanCreditedMs(
      answerSum,
      0,
      session.duration_seconds
    );
  }

  return { ms: orphanMs };
}

/**
 * סכום דקות מזוכות לחודש ישראל — מקור אמת יחיד.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} startIso
 * @param {string} endIsoExclusive
 * @param {{ applyEconomyMonthlyCap?: boolean, economyMonthlyCap?: number }} [opts]
 */
export async function sumStudentLearningCreditedMinutesInIsraelMonth(
  supabase,
  studentId,
  startIso,
  endIsoExclusive,
  opts = {}
) {
  const answers = await sumAnswerCreditedMsInRange(supabase, studentId, startIso, endIsoExclusive);
  const parent = await sumParentActivityCreditedMinutesInRange(
    supabase,
    studentId,
    startIso,
    endIsoExclusive
  );
  const book = await sumBookPageCreditedMsInRange(supabase, studentId, startIso, endIsoExclusive);
  const orphan = await sumSessionOrphanCreditedMsInRange(
    supabase,
    studentId,
    startIso,
    endIsoExclusive
  );

  let totalMs =
    answers.ms +
    Math.round((parent.minutes || 0) * 60_000) +
    book.ms +
    orphan.ms;

  let minutes = creditedMsToRoundedMinutes(totalMs);

  const monthlyCap = Math.floor(Number(opts.economyMonthlyCap) || 0);
  if (opts.applyEconomyMonthlyCap !== false && monthlyCap > 0 && minutes > monthlyCap) {
    minutes = monthlyCap;
  }

  return {
    minutes,
    breakdown: {
      answersMs: answers.ms,
      parentMinutes: parent.minutes || 0,
      bookMs: book.ms,
      orphanMs: orphan.ms,
    },
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} learningSessionId
 * @param {{ clientAccruedMs?: number }} [opts]
 */
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
