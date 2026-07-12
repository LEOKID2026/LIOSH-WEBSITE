/**
 * Parent-assigned activity — מקור אמת לזמן למידה (ביקורים, לא תשובות).
 *
 * כל ביקור רציף = שורה עם client_visit_token ייחודי.
 * תשובות נשארות ב-parent_activity_attempts ללא שינוי.
 */

import {
  creditOpenLearningMs,
  creditedMsToRoundedMinutes,
} from "../learning/learning-time-credit-policy.js";
import { creditWallClockUnionMs, reconstructDwellWindow } from "../learning/learning-time-union.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isMissingColumnError } from "./learning-activity.js";
import { loadParentActivityForStudent } from "../parent-server/parent-activity.server.js";
import {
  computeAssignedActivityTiming,
  computeOpenLearningTiming,
} from "../learning/timing-policy.js";

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

/** Gap after which a later visit on the same activity counts as a new continuous entry. */
export const PARENT_ACTIVITY_CONTINUOUS_VISIT_GAP_MS = 5 * 60_000;

/**
 * Union visit dwell windows — no per-activity / per-cluster 10-minute cap.
 * Remount rows that overlap collapse via wall-clock union.
 *
 * @param {Array<{ activity_id?: string, ended_at?: string, started_at?: string, raw_dwell_ms?: number, credited_dwell_ms?: number }>} rows
 * @param {{ gapMs?: number }} [opts]
 * @returns {{ ms: number, clusterCount: number, rawRowCount: number }}
 */
export function coalesceParentActivityVisitCreditedMs(rows, _opts = {}) {
  const list = Array.isArray(rows) ? rows : [];
  /** @type {Array<[number, number]>} */
  const windows = [];
  for (const row of list) {
    const end = new Date(row?.ended_at || row?.started_at || 0).getTime();
    const started = new Date(row?.started_at || row?.ended_at || 0).getTime();
    const raw = Math.max(
      0,
      Math.floor(Number(row?.raw_dwell_ms) || Number(row?.credited_dwell_ms) || 0)
    );
    const cred = Math.max(0, Math.floor(Number(row?.credited_dwell_ms) || 0));
    const w = reconstructDwellWindow({
      startedAtMs: started,
      endedAtMs: end,
      rawMs: Math.max(raw, cred),
      creditedMs: Math.max(raw, cred),
    });
    if (w) windows.push(w);
  }
  const credited = creditWallClockUnionMs(windows);
  return {
    ms: credited.creditedMs,
    clusterCount: credited.segmentCount,
    rawRowCount: list.length,
  };
}

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
  // Visit is open-learning gap coverage — NOT a 10-minute activity unit.
  const creditedDwellMs =
    Number.isFinite(clientCredited) && clientCredited > 0
      ? creditOpenLearningMs(clientCredited)
      : creditOpenLearningMs(rawDwellMs);

  if (creditedDwellMs <= 0) {
    return { ok: true, skipped: true, reason: "zero_credit" };
  }

  const visitKind =
    String(input.visitKind || "").trim() === "answer" ? "answer" : "learning";
  const endedAt = new Date().toISOString();
  const startedClientMs = Number(input.startedAtClient);
  const startedAt =
    Number.isFinite(startedClientMs) && startedClientMs > 0
      ? new Date(startedClientMs).toISOString()
      : endedAt;

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
      started_at: startedAt,
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
      .select("activity_id, credited_dwell_ms, raw_dwell_ms, started_at, ended_at")
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

    const coalesced = coalesceParentActivityVisitCreditedMs(data || []);
    return {
      ms: coalesced.ms,
      schemaUnavailable: false,
      clusterCount: coalesced.clusterCount,
      rawRowCount: coalesced.rawRowCount,
    };
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
        "activity_id, credited_dwell_ms, raw_dwell_ms, started_at, ended_at, parent_assigned_activities!inner(subject)"
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

    /** @type {Map<string, string>} */
    const subjectByActivity = new Map();
    for (const row of data || []) {
      const actId = String(row?.activity_id || "").trim();
      if (!actId || subjectByActivity.has(actId)) continue;
      const meta =
        row.parent_assigned_activities &&
        typeof row.parent_assigned_activities === "object" &&
        !Array.isArray(row.parent_assigned_activities)
          ? row.parent_assigned_activities
          : {};
      const sub = String(meta.subject || "").trim().toLowerCase();
      if (sub) subjectByActivity.set(actId, sub);
    }

    /** @type {Record<string, number>} */
    const bySubjectMs = {};
    // Coalesce per activity, then attribute the coalesced ms to that activity's subject.
    const byActivity = new Map();
    for (const row of data || []) {
      const actId = String(row?.activity_id || "").trim();
      if (!actId) continue;
      if (!byActivity.has(actId)) byActivity.set(actId, []);
      byActivity.get(actId).push(row);
    }
    for (const [actId, rows] of byActivity.entries()) {
      const coalesced = coalesceParentActivityVisitCreditedMs(rows);
      const sub = subjectByActivity.get(actId);
      if (!sub || coalesced.ms <= 0) continue;
      bySubjectMs[sub] = (bySubjectMs[sub] || 0) + coalesced.ms;
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
