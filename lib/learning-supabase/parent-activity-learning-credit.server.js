/**
 * Parent-assigned activity — credited time resolution and range sums.
 *
 * מקור מועדף: זמני שאלות (attempts). Visits משלימים פערים בלבד (union).
 */

import { computeAssignedActivityTiming } from "../learning/timing-policy.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isMissingColumnError } from "./learning-activity.js";
import {
  creditedMsToRoundedMinutes,
  creditLearningUnitMs,
} from "../learning/learning-time-credit-policy.js";
import { creditWallClockUnionMs, reconstructDwellWindow } from "../learning/learning-time-union.js";
import {
  sumParentActivityVisitCreditedMsInRange,
  sumLegacyParentAttemptMsWithoutVisits,
  isParentActivityVisitsTableMissingError,
} from "./parent-activity-learning-visits.server.js";

function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/**
 * זמן מזוכה מתוך ניסיון שאלה — עד 10 דקות לשאלה.
 * @param {Record<string, unknown>} attempt
 * @returns {number|null}
 */
export function resolveParentAttemptCreditedTimeMs(attempt) {
  const snapshot = isPlainObject(attempt?.question_snapshot) ? attempt.question_snapshot : null;
  if (snapshot) {
    const credited = Number(snapshot.creditedTimeMs);
    if (Number.isFinite(credited) && credited >= 0) return creditLearningUnitMs(credited);
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
 * סכום דקות מזוכות מפעילות מהורה — attempts + visits (union, ללא תקרת רצף).
 */
export async function sumParentActivityCreditedMinutesInRange(
  supabase,
  studentId,
  startIso,
  endIsoExclusive
) {
  /** @type {Array<[number, number]>} */
  const windows = [];

  try {
    const { data: attempts, error: aErr } = await supabase
      .from("parent_activity_attempts")
      .select("is_correct, time_spent_ms, question_snapshot, answered_at")
      .eq("student_id", studentId)
      .gte("answered_at", startIso)
      .lt("answered_at", endIsoExclusive);

    if (aErr) {
      if (isDbSchemaNotReadyError(aErr) || isMissingColumnError(aErr)) {
        // fall through to visits only
      } else {
        throw aErr;
      }
    } else {
      for (const row of attempts || []) {
        if (row?.is_correct == null) continue;
        const credited = resolveParentAttemptCreditedTimeMs(row);
        if (credited == null || credited <= 0) continue;
        const end = new Date(row.answered_at).getTime();
        const w = reconstructDwellWindow({
          endedAtMs: end,
          creditedMs: credited,
          rawMs: credited,
        });
        if (w) windows.push(w);
      }
    }
  } catch (error) {
    if (!(isDbSchemaNotReadyError(error) || isMissingColumnError(error))) throw error;
  }

  const visits = await sumParentActivityVisitCreditedMsInRange(
    supabase,
    studentId,
    startIso,
    endIsoExclusive
  );

  if (!visits.schemaUnavailable) {
    try {
      const { data, error } = await supabase
        .from("parent_activity_learning_visits")
        .select("credited_dwell_ms, raw_dwell_ms, started_at, ended_at")
        .eq("student_id", studentId)
        .gte("ended_at", startIso)
        .lt("ended_at", endIsoExclusive)
        .limit(50_000);
      if (!error) {
        for (const row of data || []) {
          const end = new Date(row.ended_at).getTime();
          const started = new Date(row.started_at).getTime();
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
      }
    } catch {
      /* visits optional when attempts present */
    }
  } else if (windows.length === 0) {
    const legacyMs = await sumLegacyParentAttemptMsWithoutVisits(
      supabase,
      studentId,
      startIso,
      endIsoExclusive
    );
    return {
      minutes: creditedMsToRoundedMinutes(legacyMs),
      schemaUnavailable: false,
      source: "attempts_fallback",
    };
  }

  const credited = creditWallClockUnionMs(windows);
  return {
    minutes: credited.minutes,
    schemaUnavailable: false,
    source: "attempts_and_visits_union",
    creditedMs: credited.creditedMs,
  };
}

export { isParentActivityVisitsTableMissingError };
