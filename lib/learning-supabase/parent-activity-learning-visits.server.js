/**
 * Parent-assigned activity — מקור אמת לזמן למידה (ביקורים, לא תשובות).
 *
 * כל ביקור רציף = שורה עם client_visit_token ייחודי.
 * תשובות נשארות ב-parent_activity_attempts ללא שינוי.
 */

import {
  creditLearningUnitMs,
  creditedMsToRoundedMinutes,
} from "../learning/learning-time-credit-policy.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isMissingColumnError } from "./learning-activity.js";
import { loadParentActivityForStudent } from "../parent-server/parent-activity.server.js";
import { computeAssignedActivityTiming } from "../learning/timing-policy.js";

function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function legacyAttemptCreditedMs(attempt) {
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

const MAX_VISIT_ROWS = 50_000;
const MAX_ATTEMPT_ROWS = 50_000;

export function isParentActivityVisitsTableMissingError(error) {
  const code = error?.code;
  const message = String(error?.message || "");
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    /parent_activity_learning_visits|relation.*does not exist/i.test(message)
  );
}

function normalizeVisitToken(raw) {
  const v = String(raw || "").trim();
  if (!v || v.length < 8 || v.length > 120) return null;
  return v;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} activityId
 * @param {{
 *   questionIndex: number,
 *   clientVisitToken: string,
 *   rawDwellMs?: number|null,
 *   creditedDwellMs?: number|null,
 *   visitKind?: string,
 * }} input
 */
export async function recordParentActivityLearningVisit(
  supabase,
  studentId,
  activityId,
  input
) {
  const loaded = await loadParentActivityForStudent(supabase, studentId, activityId);
  if (!loaded.ok) return loaded;

  const row = loaded.row;
  if (row.status !== "active") {
    return { ok: false, status: 409, code: "activity_not_available" };
  }

  const { data: statusRow, error: statusErr } = await supabase
    .from("parent_activity_status")
    .select("status")
    .eq("activity_id", activityId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (statusErr) {
    if (isDbSchemaNotReadyError(statusErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!statusRow || statusRow.status === "not_started") {
    return { ok: false, status: 400, code: "activity_not_started" };
  }
  if (statusRow.status === "submitted") {
    return { ok: false, status: 409, code: "already_submitted" };
  }

  const questionIndex = Math.floor(Number(input.questionIndex));
  if (!Number.isFinite(questionIndex) || questionIndex < 0) {
    return { ok: false, status: 400, code: "invalid_question_index" };
  }
  if (questionIndex >= Math.floor(Number(row.question_count) || 0)) {
    return { ok: false, status: 400, code: "invalid_question_index" };
  }

  const clientVisitToken = normalizeVisitToken(input.clientVisitToken);
  if (!clientVisitToken) {
    return { ok: false, status: 400, code: "invalid_visit_token" };
  }

  const existing = await supabase
    .from("parent_activity_learning_visits")
    .select("id,credited_dwell_ms")
    .eq("student_id", studentId)
    .eq("client_visit_token", clientVisitToken)
    .maybeSingle();

  if (existing.error) {
    if (isParentActivityVisitsTableMissingError(existing.error)) {
      return { ok: false, status: 503, code: "visits_table_not_ready" };
    }
    throw existing.error;
  }
  if (existing.data?.id) {
    return {
      ok: true,
      duplicate: true,
      visitId: existing.data.id,
      creditedDwellMs: existing.data.credited_dwell_ms,
    };
  }

  const rawDwellMs = Math.max(0, Math.floor(Number(input.rawDwellMs) || 0));
  const clientCredited = Number(input.creditedDwellMs);
  const creditedDwellMs =
    Number.isFinite(clientCredited) && clientCredited > 0
      ? creditLearningUnitMs(clientCredited)
      : creditLearningUnitMs(rawDwellMs);

  if (creditedDwellMs <= 0) {
    return { ok: true, skipped: true, reason: "zero_credit" };
  }

  const visitKind =
    String(input.visitKind || "").trim() === "answer" ? "answer" : "learning";
  const endedAt = new Date().toISOString();

  const insert = await supabase
    .from("parent_activity_learning_visits")
    .insert({
      activity_id: activityId,
      student_id: studentId,
      question_index: questionIndex,
      client_visit_token: clientVisitToken,
      raw_dwell_ms: rawDwellMs,
      credited_dwell_ms: creditedDwellMs,
      visit_kind: visitKind,
      started_at: endedAt,
      ended_at: endedAt,
    })
    .select("id,credited_dwell_ms")
    .limit(1)
    .maybeSingle();

  if (insert.error) {
    if (isParentActivityVisitsTableMissingError(insert.error)) {
      return { ok: false, status: 503, code: "visits_table_not_ready" };
    }
    if (insert.error.code === "23505") {
      return { ok: true, duplicate: true };
    }
    throw insert.error;
  }

  return {
    ok: true,
    visitId: insert.data?.id || null,
    creditedDwellMs: insert.data?.credited_dwell_ms ?? creditedDwellMs,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} startIso
 * @param {string} endIsoExclusive
 */
export async function sumParentActivityVisitCreditedMsInRange(
  supabase,
  studentId,
  startIso,
  endIsoExclusive
) {
  try {
    const { data, error } = await supabase
      .from("parent_activity_learning_visits")
      .select("credited_dwell_ms, ended_at")
      .eq("student_id", studentId)
      .gte("ended_at", startIso)
      .lt("ended_at", endIsoExclusive)
      .limit(MAX_VISIT_ROWS);

    if (error) {
      if (isParentActivityVisitsTableMissingError(error)) {
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
    if (isParentActivityVisitsTableMissingError(error)) {
      return { ms: 0, schemaUnavailable: true };
    }
    throw error;
  }
}

/**
 * Legacy attempts without any visit row for the same activity+question slot.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} startIso
 * @param {string} endIsoExclusive
 */
export async function sumLegacyParentAttemptMsWithoutVisits(
  supabase,
  studentId,
  startIso,
  endIsoExclusive
) {
  const { data: attempts, error: aErr } = await supabase
    .from("parent_activity_attempts")
    .select("id, activity_id, question_index, is_correct, time_spent_ms, question_snapshot, answered_at")
    .eq("student_id", studentId)
    .gte("answered_at", startIso)
    .lt("answered_at", endIsoExclusive)
    .limit(MAX_ATTEMPT_ROWS);

  if (aErr) {
    if (isDbSchemaNotReadyError(aErr) || isMissingColumnError(aErr)) {
      return 0;
    }
    throw aErr;
  }

  if (!attempts?.length) return 0;

  const activityIds = [...new Set(attempts.map((a) => a.activity_id).filter(Boolean))];
  const { data: visits, error: vErr } = await supabase
    .from("parent_activity_learning_visits")
    .select("activity_id, question_index")
    .eq("student_id", studentId)
    .in("activity_id", activityIds);

  if (vErr) {
    if (isParentActivityVisitsTableMissingError(vErr)) {
      return 0;
    }
    throw vErr;
  }

  const slotsWithVisits = new Set(
    (visits || []).map((v) => `${v.activity_id}:${v.question_index}`)
  );

  let legacyMs = 0;
  for (const attempt of attempts) {
    if (attempt?.is_correct == null) continue;
    const slotKey = `${attempt.activity_id}:${attempt.question_index}`;
    if (slotsWithVisits.has(slotKey)) continue;
    const credited = legacyAttemptCreditedMs(attempt);
    if (credited != null && credited > 0) legacyMs += credited;
  }
  return legacyMs;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} startIso
 * @param {string} endIsoExclusive
 */
export async function sumParentActivityVisitMsBySubjectInRange(
  supabase,
  studentId,
  startIso,
  endIsoExclusive
) {
  try {
    const { data, error } = await supabase
      .from("parent_activity_learning_visits")
      .select(
        "credited_dwell_ms, ended_at, parent_assigned_activities!inner(subject)"
      )
      .eq("student_id", studentId)
      .gte("ended_at", startIso)
      .lt("ended_at", endIsoExclusive)
      .limit(MAX_VISIT_ROWS);

    if (error) {
      if (isParentActivityVisitsTableMissingError(error)) {
        return { bySubjectMs: {}, schemaUnavailable: true };
      }
      throw error;
    }

    /** @type {Record<string, number>} */
    const bySubjectMs = {};
    for (const row of data || []) {
      const credited = Math.floor(Number(row.credited_dwell_ms) || 0);
      if (credited <= 0) continue;
      const meta =
        row.parent_assigned_activities &&
        typeof row.parent_assigned_activities === "object" &&
        !Array.isArray(row.parent_assigned_activities)
          ? row.parent_assigned_activities
          : {};
      const sub = String(meta.subject || "").trim().toLowerCase();
      if (!sub) continue;
      bySubjectMs[sub] = (bySubjectMs[sub] || 0) + credited;
    }
    return { bySubjectMs, schemaUnavailable: false };
  } catch (error) {
    if (isParentActivityVisitsTableMissingError(error)) {
      return { bySubjectMs: {}, schemaUnavailable: true };
    }
    throw error;
  }
}

export { creditedMsToRoundedMinutes };
