/**
 * Child World — Phase 2.6: Monthly Persistence Reward (admin/manual job)
 *
 * Awards Learning Coins once per student per Israel calendar month based on
 * verified active learning minutes from completed learning_sessions only.
 *
 * Source of truth: learning_sessions.duration_seconds (status = completed).
 * Month boundaries: Asia/Jerusalem via israel-calendar.server.js — never UTC.
 * Do NOT use student_learning_state.challenges.monthly.activeMinutes for rewards.
 *
 * Reward tiers (highest only, not cumulative):
 *   100+ min → 10,000   | 250+ → 30,000 | 400+ → 60,000 | 600+ → 100,000
 *
 * Idempotency key: monthly_persistence_{studentId}_{yearMonthIsrael}
 */

import { applyArcadeCoinMove } from "../arcade/server/arcade-coins";
import { getIsraelMonthBounds, getIsraelMonthBoundsForYearMonth } from "./israel-calendar.server";
import { sumParentActivityCreditedMinutesInRange } from "./parent-activity-learning-credit.server.js";

export const MONTHLY_PERSISTENCE_TIERS = [
  { minutes: 100, coins: 10_000 },
  { minutes: 250, coins: 30_000 },
  { minutes: 400, coins: 60_000 },
  { minutes: 600, coins: 100_000 },
];

export const MONTHLY_PERSISTENCE_SOURCE_TYPE = "monthly_persistence";
export const MONTHLY_PERSISTENCE_REASON = "monthly_persistence_reward";

/**
 * Highest tier reached (non-cumulative). Returns null below 100 minutes.
 * @param {number} activeMinutes
 */
export function resolveMonthlyPersistenceTier(activeMinutes) {
  const minutes = Number(activeMinutes);
  if (!Number.isFinite(minutes) || minutes < 100) return null;

  let tier = null;
  for (const t of MONTHLY_PERSISTENCE_TIERS) {
    if (minutes >= t.minutes) tier = t;
  }
  return tier;
}

/**
 * @param {string} studentId
 * @param {string} yearMonthIsrael
 */
export function buildMonthlyPersistenceIdempotencyKey(studentId, yearMonthIsrael) {
  return `monthly_persistence_${studentId}_${yearMonthIsrael}`;
}

/**
 * @param {string} [yearMonthIsrael] - defaults to current Israel month
 */
export function resolveIsraelMonthContext(yearMonthIsrael) {
  if (yearMonthIsrael) {
    return getIsraelMonthBoundsForYearMonth(yearMonthIsrael);
  }
  return getIsraelMonthBounds();
}

/**
 * Sum completed session minutes for one student within Israel month bounds.
 * Queries learning_sessions directly — never cached monthly display values.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function sumCompletedSessionMinutesForIsraelMonth(
  supabase,
  studentId,
  startIso,
  endIso
) {
  const { data, error } = await supabase
    .from("learning_sessions")
    .select("duration_seconds, started_at, status")
    .eq("student_id", studentId)
    .eq("status", "completed")
    .gte("started_at", startIso)
    .lt("started_at", endIso);

  if (error) {
    throw new Error(`learning_sessions_query_failed: ${error.message}`);
  }

  let totalSeconds = 0;
  for (const row of data || []) {
    const ds = Number(row.duration_seconds);
    if (Number.isFinite(ds) && ds > 0) {
      totalSeconds += ds;
    }
  }

  const parentMinutes = await sumParentActivityCreditedMinutesInRange(
    supabase,
    studentId,
    startIso,
    endIso
  );

  return Math.round(((totalSeconds / 60) + (parentMinutes.minutes || 0)) * 100) / 100;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
async function hasExistingMonthlyPersistenceAward(supabase, studentId, idempotencyKey) {
  const { data, error } = await supabase
    .from("coin_transactions")
    .select("id, amount, created_at")
    .eq("student_id", studentId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) {
    throw new Error(`coin_transactions_lookup_failed: ${error.message}`);
  }

  return data ?? null;
}

/**
 * Evaluate one student's monthly persistence reward (read-only).
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ studentId: string, yearMonthIsrael?: string }} params
 */
export async function evaluateMonthlyPersistenceReward(supabase, { studentId, yearMonthIsrael }) {
  if (!studentId) {
    return { ok: false, code: "missing_student_id" };
  }

  const month = resolveIsraelMonthContext(yearMonthIsrael);
  const activeMinutes = await sumCompletedSessionMinutesForIsraelMonth(
    supabase,
    studentId,
    month.startIso,
    month.endIso
  );

  const tier = resolveMonthlyPersistenceTier(activeMinutes);
  const idempotencyKey = buildMonthlyPersistenceIdempotencyKey(studentId, month.ym);
  const existing = await hasExistingMonthlyPersistenceAward(supabase, studentId, idempotencyKey);

  let skippedReason = null;
  if (!tier) {
    skippedReason = "below_minutes_threshold";
  } else if (existing) {
    skippedReason = "already_awarded";
  }

  return {
    ok: true,
    studentId,
    yearMonthIsrael: month.ym,
    monthBounds: { startIso: month.startIso, endIso: month.endIso },
    activeMinutes,
    tierMinutes: tier?.minutes ?? null,
    wouldAward: tier?.coins ?? 0,
    eligible: tier !== null && !existing,
    skippedReason,
    alreadyAwarded: Boolean(existing),
    existingTransactionId: existing?.id ?? null,
    idempotencyKey,
  };
}

/**
 * Award monthly persistence coins for one student (idempotent).
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ studentId: string, yearMonthIsrael?: string }} params
 */
export async function awardMonthlyPersistenceReward(supabase, { studentId, yearMonthIsrael }) {
  const evaluation = await evaluateMonthlyPersistenceReward(supabase, { studentId, yearMonthIsrael });
  if (!evaluation.ok) return evaluation;

  if (evaluation.skippedReason === "below_minutes_threshold") {
    return {
      ok: true,
      skipped: true,
      reason: evaluation.skippedReason,
      ...evaluation,
    };
  }

  if (evaluation.skippedReason === "already_awarded") {
    return {
      ok: true,
      skipped: true,
      duplicate: true,
      reason: evaluation.skippedReason,
      ...evaluation,
    };
  }

  const result = await applyArcadeCoinMove(supabase, {
    studentId,
    direction: "earn",
    amount: evaluation.wouldAward,
    idempotencyKey: evaluation.idempotencyKey,
    sourceType: MONTHLY_PERSISTENCE_SOURCE_TYPE,
    sourceId: evaluation.yearMonthIsrael,
    metadata: {
      activeMinutes: evaluation.activeMinutes,
      tierMinutes: evaluation.tierMinutes,
      yearMonthIsrael: evaluation.yearMonthIsrael,
    },
    reason: MONTHLY_PERSISTENCE_REASON,
  });

  if (!result.ok) {
    return {
      ok: false,
      code: result.code || "rpc_failed",
      message: result.message,
      ...evaluation,
    };
  }

  return {
    ok: true,
    awarded: !result.duplicate,
    duplicate: result.duplicate === true,
    coinsAwarded: evaluation.wouldAward,
    balanceAfter: result.balanceAfter,
    transactionId: result.transactionId,
    ...evaluation,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string[]} [studentIds]
 */
async function resolveTargetStudentIds(supabase, studentIds) {
  if (Array.isArray(studentIds) && studentIds.length > 0) {
    return studentIds.map(String).filter(Boolean);
  }

  const { data, error } = await supabase.from("students").select("id");
  if (error) {
    throw new Error(`students_query_failed: ${error.message}`);
  }

  return (data || []).map((row) => row.id).filter(Boolean);
}

/**
 * Run monthly persistence award job for one or all students.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ yearMonthIsrael?: string, studentIds?: string[], dryRun?: boolean }} params
 */
export async function runMonthlyPersistenceAwardJob(
  supabase,
  { yearMonthIsrael, studentIds, dryRun = false } = {}
) {
  const month = resolveIsraelMonthContext(yearMonthIsrael);
  const targets = await resolveTargetStudentIds(supabase, studentIds);

  const results = [];
  let eligibleCount = 0;
  let awardedCount = 0;
  let skippedCount = 0;

  for (const studentId of targets) {
    if (dryRun) {
      const evaluation = await evaluateMonthlyPersistenceReward(supabase, {
        studentId,
        yearMonthIsrael: month.ym,
      });
      results.push(evaluation);
      if (evaluation.eligible) eligibleCount += 1;
      else skippedCount += 1;
      continue;
    }

    const outcome = await awardMonthlyPersistenceReward(supabase, {
      studentId,
      yearMonthIsrael: month.ym,
    });
    results.push(outcome);

    if (outcome.skipped || outcome.duplicate) {
      skippedCount += 1;
    } else if (outcome.awarded) {
      awardedCount += 1;
      eligibleCount += 1;
    } else if (outcome.ok === false) {
      skippedCount += 1;
    }
  }

  return {
    ok: true,
    dryRun: dryRun === true,
    yearMonthIsrael: month.ym,
    monthBounds: { startIso: month.startIso, endIso: month.endIso },
    studentCount: targets.length,
    eligibleCount,
    awardedCount,
    skippedCount,
    results,
  };
}
