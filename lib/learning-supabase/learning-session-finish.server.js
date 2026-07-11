/**
 * Server-side learning session finish helpers — duration and summary integrity.
 */

import {
  MAX_LEARNING_SESSION_SECONDS,
  MIN_LEARNING_SESSION_SECONDS,
  capStoredSessionDurationSeconds,
} from "../learning/learning-time-credit-policy.js";

export {
  MAX_LEARNING_SESSION_SECONDS,
  MIN_LEARNING_SESSION_SECONDS,
  capStoredSessionDurationSeconds,
};

/**
 * @deprecated Wall-clock duration — לא משמש כמקור אמת לזמן מזוכה.
 * @param {Date|string|null|undefined} startedAt
 * @param {Date|string|null|undefined} [endedAt]
 */
export function computeLearningSessionDurationSeconds(startedAt, endedAt = new Date()) {
  const startMs = new Date(startedAt).getTime();
  const endMs = new Date(endedAt).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  const raw = Math.max(0, Math.floor((endMs - startMs) / 1000));
  if (raw < MIN_LEARNING_SESSION_SECONDS) return 0;
  return Math.min(raw, MAX_LEARNING_SESSION_SECONDS);
}

/**
 * Derive session summary from saved answers; fall back to client values only when no answers exist.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} learningSessionId
 * @param {{ totalQuestions?: number, correctAnswers?: number, wrongAnswers?: number, accuracy?: number, score?: number }} clientSummary
 */
export async function deriveSessionSummaryFromAnswers(supabase, learningSessionId, clientSummary = {}) {
  const { data: rows, error } = await supabase
    .from("answers")
    .select("is_correct")
    .eq("learning_session_id", learningSessionId);

  if (error || !Array.isArray(rows) || rows.length === 0) {
    const totalQuestions = Math.max(0, Math.floor(Number(clientSummary.totalQuestions) || 0));
    const correctAnswers = Math.max(0, Math.floor(Number(clientSummary.correctAnswers) || 0));
    const wrongAnswers = Math.max(
      0,
      Math.floor(Number(clientSummary.wrongAnswers) || Math.max(0, totalQuestions - correctAnswers))
    );
    let accuracy = Number(clientSummary.accuracy);
    if (!Number.isFinite(accuracy) && totalQuestions > 0) {
      accuracy = Math.round((correctAnswers / totalQuestions) * 100);
    }
    accuracy = Math.max(0, Math.min(100, Number.isFinite(accuracy) ? accuracy : 0));
    return {
      totalQuestions,
      correctAnswers: Math.min(correctAnswers, totalQuestions),
      wrongAnswers: Math.min(wrongAnswers, totalQuestions),
      score: Number(clientSummary.score) || 0,
      accuracy,
      derivedFromAnswers: false,
    };
  }

  const totalQuestions = rows.length;
  const correctAnswers = rows.filter((r) => r.is_correct === true).length;
  const wrongAnswers = Math.max(0, totalQuestions - correctAnswers);
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  return {
    totalQuestions,
    correctAnswers,
    wrongAnswers,
    score: Number(clientSummary.score) || correctAnswers,
    accuracy,
    derivedFromAnswers: true,
  };
}
