/**
 * Parent-assigned activity — credited time resolution and monthly aggregation.
 *
 * מקור אמת לזמן למידה: parent_activity_learning_visits (לא parent_activity_attempts).
 * ניסיונות נשמרים לדוחות תשובות בלבד.
 */

import { computeAssignedActivityTiming } from "../learning/timing-policy.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isMissingColumnError } from "./learning-activity.js";
import { creditedMsToRoundedMinutes } from "../learning/learning-time-credit-policy.js";
import {
  sumParentActivityVisitCreditedMsInRange,
  sumLegacyParentAttemptMsWithoutVisits,
} from "./parent-activity-learning-visits.server.js";

function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/**
 * זמן מזוכה מתוך ניסיון — לדוחות הורים בלבד, לא לאגרגציה חודשית.
 * @param {Record<string, unknown>} attempt
 * @returns {number|null}
 */
export function resolveParentAttemptCreditedTimeMs(attempt) {
  const snapshot = isPlainObject(attempt?.question_snapshot) ? attempt.question_snapshot : null;
  if (snapshot) {
    const credited = Number(snapshot.creditedTimeMs);
    if (Number.isFinite(credited) && credited >= 0) return credited;
    const rawFromSnapshot = Number(snapshot.rawTimeSpentMs);
    if (Number.isFinite(rawFromSnapshot) && rawFromSnapshot > 0) {
      return computeAssignedActivityTiming(rawFromSnapshot).creditedTimeMs;
    }
  }
  const rawMs = Number(attempt?.time_spent_ms);
  if (Number.isFinite(rawMs) && rawMs > 0) {
    return computeAssignedActivityTiming(rawMs).creditedTimeMs;
  }
  return null;
}

/**
 * @param {Array<Record<string, unknown>>} attempts
 */
export function summarizeParentActivityAttempts(attempts) {
  let totalCreditedMs = 0;
  let answersCount = 0;
  let correctCount = 0;

  for (const attempt of attempts || []) {
    if (attempt?.is_correct == null) continue;
    answersCount += 1;
    if (attempt.is_correct === true) correctCount += 1;
    const credited = resolveParentAttemptCreditedTimeMs(attempt);
    if (credited != null && credited > 0) totalCreditedMs += credited;
  }

  const durationSeconds = totalCreditedMs > 0 ? Math.max(1, Math.round(totalCreditedMs / 1000)) : 0;
  const accuracy =
    answersCount > 0 ? Number(((correctCount / answersCount) * 100).toFixed(2)) : 0;

  return {
    answersCount,
    correctCount,
    totalCreditedMs,
    durationSeconds,
    accuracy,
  };
}

/**
 * סכום דקות מזוכות מפעילות מהורה — מקור אמת: ביקורי למידה.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} startIso
 * @param {string} endIsoExclusive
 */
export async function sumParentActivityCreditedMinutesInRange(
  supabase,
  studentId,
  startIso,
  endIsoExclusive
) {
  const visits = await sumParentActivityVisitCreditedMsInRange(
    supabase,
    studentId,
    startIso,
    endIsoExclusive
  );

  if (visits.schemaUnavailable) {
    const { data, error } = await supabase
      .from("parent_activity_attempts")
      .select("is_correct, time_spent_ms, question_snapshot, answered_at")
      .eq("student_id", studentId)
      .gte("answered_at", startIso)
      .lt("answered_at", endIsoExclusive);

    if (error) {
      if (isDbSchemaNotReadyError(error) || isMissingColumnError(error)) {
        return { minutes: 0, schemaUnavailable: true };
      }
      throw error;
    }

    let totalMs = 0;
    for (const row of data || []) {
      if (row?.is_correct == null) continue;
      const credited = resolveParentAttemptCreditedTimeMs(row);
      if (credited != null && credited > 0) totalMs += credited;
    }
    return {
      minutes: creditedMsToRoundedMinutes(totalMs),
      schemaUnavailable: false,
      source: "attempts_fallback",
    };
  }

  const legacyMs = await sumLegacyParentAttemptMsWithoutVisits(
    supabase,
    studentId,
    startIso,
    endIsoExclusive
  );
  const totalMs = visits.ms + legacyMs;

  return {
    minutes: creditedMsToRoundedMinutes(totalMs),
    schemaUnavailable: false,
    source: "learning_visits",
  };
}
