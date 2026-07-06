import {
  LEO_MINERS_ACCRUE_STATUS,
  LEO_MINERS_ACTION_TYPES,
  LEO_MINERS_ERROR_CODES,
} from "../leo-miners-constants.js";
import { loadLeoMinersConfig } from "./leo-miners-config.server.js";
import { minersErrorResult } from "./leo-miners-errors.server.js";
import { calculateAccruePoints } from "./leo-miners-formulas.server.js";
import {
  assertGuestMinersClaimAllowed,
  assertMinersAccrueEnabled,
  assertMinersDbReady,
  assertMinersEconomyEnabled,
  assertMinersFeatureEnabled,
  checkAccrueRateLimit,
  resolveGuestMinersMultiplier,
  validateAccruePayload,
  validateOfflineElapsed,
} from "./leo-miners-guards.server.js";
import {
  getOrCreateMinersState,
  incrementMinersPendingPoints,
  sumDailyAccruedPoints,
} from "./leo-miners-state.server.js";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {Record<string, unknown>|null|undefined} studentRow
 * @param {Record<string, unknown>} body
 */
export async function processMinersAccrue(supabase, studentId, studentRow, body) {
  const dbCheck = await assertMinersDbReady(supabase);
  if (!dbCheck.ok) return dbCheck;

  const config = await loadLeoMinersConfig(supabase);
  const enabledCheck = assertMinersFeatureEnabled(config);
  if (!enabledCheck.ok) return enabledCheck;

  const economyCheck = assertMinersEconomyEnabled(config);
  if (!economyCheck.ok) return economyCheck;

  const parsed = validateAccruePayload(body, config);
  if (!parsed.ok) return parsed;

  const accrueCheck = assertMinersAccrueEnabled(config, parsed.actionType);
  if (!accrueCheck.ok) return accrueCheck;

  const { data: existingLog } = await supabase
    .from("leo_miners_accrue_log")
    .select("id, status, calculated_points, daily_points_after")
    .eq("student_id", studentId)
    .eq("idempotency_key", parsed.idempotencyKey)
    .maybeSingle();

  if (existingLog?.id) {
    const state = await getOrCreateMinersState(supabase, studentId);
    return {
      ok: true,
      duplicate: true,
      dbReady: true,
      actionType: parsed.actionType,
      pointsAdded: Number(existingLog.calculated_points || 0),
      pendingPoints: Number(state.mining_points_pending || 0),
      dailyUsed: Number(existingLog.daily_points_after || 0),
      dailyCap: Number(config.dailyCap ?? config.daily_cap ?? 2500),
    };
  }

  const rateCheck = await checkAccrueRateLimit(supabase, studentId, parsed.totalBreaks, config);
  if (!rateCheck.ok) return rateCheck;

  const state = await getOrCreateMinersState(supabase, studentId);

  if (parsed.actionType === LEO_MINERS_ACTION_TYPES.OFFLINE_BATCH) {
    const offlineCheck = validateOfflineElapsed(
      state.last_seen_at,
      parsed.offlineElapsedSec,
      config
    );
    if (!offlineCheck.ok) {
      await supabase.from("leo_miners_accrue_log").insert({
        student_id: studentId,
        idempotency_key: parsed.idempotencyKey,
        action_type: parsed.actionType,
        stage_counts: parsed.stageCounts,
        breaks_count: parsed.totalBreaks,
        offline_elapsed_sec: parsed.offlineElapsedSec,
        calculated_points: 0,
        daily_points_after: await sumDailyAccruedPoints(supabase, studentId),
        status: LEO_MINERS_ACCRUE_STATUS.REJECTED,
        reject_reason: offlineCheck.code,
      });
      return offlineCheck;
    }
  }

  const guest = await resolveGuestMinersMultiplier(supabase, studentRow, config);
  const minedToday = await sumDailyAccruedPoints(supabase, studentId);
  const isOffline =
    parsed.actionType === LEO_MINERS_ACTION_TYPES.OFFLINE_BATCH ||
    parsed.offlineElapsedSec > 0;

  const calc = calculateAccruePoints(parsed.stageCounts, minedToday, config, {
    offline: isOffline,
    guestMultiplier: guest.multiplier,
    isGuest: guest.isGuest,
  });

  if (calc.awarded <= 0 && parsed.totalBreaks > 0) {
    const dailyCap = Number(config.dailyCap ?? config.daily_cap ?? 2500);
    await supabase.from("leo_miners_accrue_log").insert({
      student_id: studentId,
      idempotency_key: parsed.idempotencyKey,
      action_type: parsed.actionType,
      stage_counts: parsed.stageCounts,
      breaks_count: parsed.totalBreaks,
      offline_elapsed_sec: parsed.offlineElapsedSec,
      calculated_points: 0,
      daily_points_after: minedToday,
      status: LEO_MINERS_ACCRUE_STATUS.REJECTED,
      reject_reason:
        minedToday >= dailyCap
          ? LEO_MINERS_ERROR_CODES.daily_cap_reached
          : "zero_after_softcut",
    });

    return minersErrorResult(
      minedToday >= dailyCap
        ? LEO_MINERS_ERROR_CODES.daily_cap_reached
        : LEO_MINERS_ERROR_CODES.invalid_payload,
      minedToday >= dailyCap ? "הגעתם לתקרה היומית" : "לא נוספו נקודות",
      { dailyUsed: minedToday, dailyCap }
    );
  }

  const { error: logError } = await supabase.from("leo_miners_accrue_log").insert({
    student_id: studentId,
    idempotency_key: parsed.idempotencyKey,
    action_type: parsed.actionType,
    stage_counts: parsed.stageCounts,
    breaks_count: parsed.totalBreaks,
    offline_elapsed_sec: parsed.offlineElapsedSec,
    calculated_points: calc.awarded,
    daily_points_after: calc.minedTodayAfter,
    status: LEO_MINERS_ACCRUE_STATUS.APPLIED,
    reject_reason: null,
  });

  if (logError) {
    if (logError.code === "23505" && existingLog?.id) {
      return {
        ok: true,
        duplicate: true,
        dbReady: true,
        actionType: parsed.actionType,
        pointsAdded: Number(existingLog.calculated_points || 0),
        pendingPoints: Number(state.mining_points_pending || 0),
        dailyUsed: Number(existingLog.daily_points_after || 0),
        dailyCap: Number(config.dailyCap ?? config.daily_cap ?? 2500),
      };
    }
    throw logError;
  }

  const updated = await incrementMinersPendingPoints(supabase, studentId, calc.awarded, {
    lastSeenAt: parsed.clientSeenAt,
  });

  return {
    ok: true,
    duplicate: false,
    dbReady: true,
    actionType: parsed.actionType,
    pointsAdded: calc.awarded,
    grossPoints: calc.grossPoints,
    softcutFactor: calc.softcutFactor,
    pendingPoints: Number(updated.mining_points_pending || 0),
    dailyUsed: calc.minedTodayAfter,
    dailyCap: calc.dailyCap,
    guestMultiplier: guest.isGuest ? guest.multiplier : 1,
  };
}
