import { applyArcadeCoinMove } from "../../arcade/server/arcade-coins.js";
import { isGuestStudent } from "../../guest/guest-display.js";
import { applyDiamondMove } from "../../rewards/server/diamond-ledger.server.js";
import {
  LEO_MINERS_CLAIM_STATUS,
  LEO_MINERS_CLAIM_TYPES,
  LEO_MINERS_COIN_SOURCE_TYPE,
  LEO_MINERS_DIAMOND_SOURCE_TYPE,
  LEO_MINERS_ERROR_CODES,
  LEO_MINERS_GAME_KEY,
} from "../leo-miners-constants.js";
import { loadLeoMinersConfig, loadLeoMinersSoloPayoutRules } from "./leo-miners-config.server.js";
import { minersErrorResult } from "./leo-miners-errors.server.js";
import { diamondsForChestClaim, pointsToLeoCoins } from "./leo-miners-formulas.server.js";
import {
  assertGuestMinersClaimAllowed,
  assertMinersClaimEnabled,
  assertMinersDbReady,
  assertMinersEconomyEnabled,
  assertMinersFeatureEnabled,
  validateClaimPayload,
} from "./leo-miners-guards.server.js";
import {
  decrementMinersPendingRewards,
  atomicClaimMinersPendingPoints,
  atomicClaimMinersPendingDiamonds,
  getOrCreateMinersState,
  sumDailyClaimedCoins,
  sumDailyClaimedDiamonds,
} from "./leo-miners-state.server.js";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {Record<string, unknown>|null|undefined} studentRow
 * @param {Record<string, unknown>} body
 */
export async function processMinersClaim(supabase, studentId, studentRow, body) {
  const dbCheck = await assertMinersDbReady(supabase);
  if (!dbCheck.ok) return dbCheck;

  const config = await loadLeoMinersConfig(supabase);
  const enabledCheck = assertMinersFeatureEnabled(config);
  if (!enabledCheck.ok) return enabledCheck;

  const economyCheck = assertMinersEconomyEnabled(config);
  if (!economyCheck.ok) return economyCheck;

  const guestClaimCheck = await assertGuestMinersClaimAllowed(supabase, studentRow, config);
  if (!guestClaimCheck.ok) return guestClaimCheck;

  const parsed = validateClaimPayload(body);
  if (!parsed.ok) return parsed;

  const isGuest = isGuestStudent(studentRow || {});
  const claimEnabledCheck = assertMinersClaimEnabled(config, parsed.claimType, { isGuest });
  if (!claimEnabledCheck.ok) return claimEnabledCheck;

  const { data: existingLog } = await supabase
    .from("leo_miners_claim_log")
    .select("*")
    .eq("student_id", studentId)
    .eq("idempotency_key", parsed.idempotencyKey)
    .maybeSingle();

  if (existingLog?.id) {
    return {
      ok: true,
      duplicate: true,
      dbReady: true,
      claimType: existingLog.claim_type,
      pointsClaimed: Number(existingLog.points_claimed || 0),
      coinsGranted: Math.floor(Number(existingLog.coins_granted || 0)),
      diamondsGranted: Math.floor(Number(existingLog.diamonds_granted || 0)),
    };
  }

  const state = await getOrCreateMinersState(supabase, studentId);
  const { rules: soloRules } = await loadLeoMinersSoloPayoutRules(supabase);

  if (parsed.claimType === LEO_MINERS_CLAIM_TYPES.COINS) {
    return claimMinersCoins(supabase, studentId, parsed, state, config, soloRules, { isGuest });
  }

  if (parsed.claimType === LEO_MINERS_CLAIM_TYPES.DIAMONDS_CHEST) {
    return claimMinersDiamondsChest(supabase, studentId, parsed, state, config, soloRules, {
      isGuest,
    });
  }

  return minersErrorResult(
    LEO_MINERS_ERROR_CODES.invalid_claim_type,
    "סוג claim לא נתמך"
  );
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {Record<string, unknown>} parsed
 * @param {Record<string, unknown>} state
 * @param {Record<string, unknown>} config
 * @param {Record<string, unknown>} soloRules
 */
async function claimMinersCoins(supabase, studentId, parsed, state, config, soloRules, opts = {}) {
  const cooldownSec = Math.max(0, Math.floor(Number(config.claim_cooldown_sec ?? 0)));
  if (cooldownSec > 0 && state.last_claim_at) {
    const lastMs = new Date(state.last_claim_at).getTime();
    if (Number.isFinite(lastMs)) {
      const elapsed = Math.floor((Date.now() - lastMs) / 1000);
      if (elapsed < cooldownSec) {
        return minersErrorResult(
          LEO_MINERS_ERROR_CODES.claim_cooldown,
          "יש להמתין לפני claim נוסף",
          { retryAfterSec: cooldownSec - elapsed }
        );
      }
    }
  }

  const atomicClaim = await atomicClaimMinersPendingPoints(supabase, studentId);
  const pendingPoints = atomicClaim.ok ? atomicClaim.pointsClaimed : 0;
  if (pendingPoints <= 0) {
    return minersErrorResult(
      LEO_MINERS_ERROR_CODES.no_pending_points,
      "אין נקודות כרייה לאיסוף"
    );
  }

  const dailyCoinsUsed = await sumDailyClaimedCoins(supabase, studentId);
  const conversion = pointsToLeoCoins(pendingPoints, config, soloRules, {
    isGuest: opts.isGuest === true,
    dailyCoinsUsed,
  });
  if (conversion.coins <= 0) {
    const dailyCoinsCap = Number(
      opts.isGuest
        ? config.guest_daily_coins_cap ?? 100
        : config.daily_coins_cap ?? 500
    );
    if (dailyCoinsCap > 0 && dailyCoinsUsed >= dailyCoinsCap) {
      return minersErrorResult(
        LEO_MINERS_ERROR_CODES.daily_coins_cap_reached,
        "הגעתם לתקרת מטבעות יומית"
      );
    }
    return minersErrorResult(
      LEO_MINERS_ERROR_CODES.no_pending_points,
      "לא ניתן להמיר נקודות למטבעות"
    );
  }

  const coinResult = await applyArcadeCoinMove(supabase, {
    studentId,
    direction: "earn",
    amount: conversion.coins,
    idempotencyKey: `leo_miners_claim:${studentId}:${parsed.idempotencyKey}`,
    sourceType: LEO_MINERS_COIN_SOURCE_TYPE,
    sourceId: parsed.idempotencyKey,
    metadata: {
      gameKey: LEO_MINERS_GAME_KEY,
      claimType: LEO_MINERS_CLAIM_TYPES.COINS,
      pointsClaimed: conversion.pointsUsed,
    },
    reason: `leo_miners_${LEO_MINERS_GAME_KEY}`,
  });

  if (!coinResult.ok) {
    await supabase.from("leo_miners_claim_log").insert({
      student_id: studentId,
      idempotency_key: parsed.idempotencyKey,
      claim_type: LEO_MINERS_CLAIM_TYPES.COINS,
      points_claimed: conversion.pointsUsed,
      coins_granted: 0,
      diamonds_granted: 0,
      status: LEO_MINERS_CLAIM_STATUS.REJECTED,
      metadata_json: { code: coinResult.code, message: coinResult.message },
    });
    return minersErrorResult(
      LEO_MINERS_ERROR_CODES.coin_failed,
      coinResult.message || "לא ניתן לזכות מטבעות",
      { code: coinResult.code }
    );
  }

  if (!coinResult.duplicate) {
    /* pending points already cleared atomically before coin credit */
  }

  const { data: claimRow, error: claimLogError } = await supabase
    .from("leo_miners_claim_log")
    .insert({
      student_id: studentId,
      idempotency_key: parsed.idempotencyKey,
      claim_type: LEO_MINERS_CLAIM_TYPES.COINS,
      points_claimed: conversion.pointsUsed,
      coins_granted: conversion.coins,
      diamonds_granted: 0,
      coin_transaction_id: coinResult.transactionId || null,
      status: LEO_MINERS_CLAIM_STATUS.COMPLETED,
      metadata_json: {
        balanceAfter: coinResult.balanceAfter,
        duplicateCoinMove: coinResult.duplicate === true,
      },
    })
    .select("*")
    .single();

  if (claimLogError && claimLogError.code !== "23505") throw claimLogError;

  const refreshed = await getOrCreateMinersState(supabase, studentId);

  return {
    ok: true,
    duplicate: coinResult.duplicate === true,
    dbReady: true,
    claimType: LEO_MINERS_CLAIM_TYPES.COINS,
    pointsClaimed: conversion.pointsUsed,
    coinsGranted: conversion.coins,
    diamondsGranted: 0,
    balanceAfter: coinResult.balanceAfter ?? null,
    pendingPoints: Number(refreshed.mining_points_pending || 0),
    claimLogId: claimRow?.id || null,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {Record<string, unknown>} parsed
 * @param {Record<string, unknown>} state
 * @param {Record<string, unknown>} config
 * @param {Record<string, unknown>} soloRules
 */
async function claimMinersDiamondsChest(
  supabase,
  studentId,
  parsed,
  state,
  config,
  soloRules,
  opts = {}
) {
  const atomicClaim = await atomicClaimMinersPendingDiamonds(supabase, studentId);
  const pendingDiamonds = atomicClaim.ok ? atomicClaim.diamondsClaimed : 0;
  if (pendingDiamonds <= 0) {
    return minersErrorResult(
      LEO_MINERS_ERROR_CODES.no_pending_diamonds,
      "אין יהלומים לאיסוף"
    );
  }

  const dailyDiamondsUsed = await sumDailyClaimedDiamonds(supabase, studentId);
  const conversion = diamondsForChestClaim(pendingDiamonds, config, soloRules, {
    isGuest: opts.isGuest === true,
    dailyDiamondsUsed,
  });
  if (conversion.diamonds <= 0) {
    return minersErrorResult(
      LEO_MINERS_ERROR_CODES.no_pending_diamonds,
      "לא ניתן לאסוף יהלומים"
    );
  }

  const diamondResult = await applyDiamondMove(supabase, {
    studentId,
    direction: "earn",
    amount: conversion.diamonds,
    idempotencyKey: `leo_miners_diamond:${studentId}:${parsed.idempotencyKey}`,
    sourceType: LEO_MINERS_DIAMOND_SOURCE_TYPE,
    sourceId: parsed.idempotencyKey,
    metadata: {
      gameKey: LEO_MINERS_GAME_KEY,
      claimType: LEO_MINERS_CLAIM_TYPES.DIAMONDS_CHEST,
      diamondChestAction: parsed.diamondChestAction,
    },
    reason: `leo_miners_${LEO_MINERS_GAME_KEY}`,
  });

  if (!diamondResult.ok) {
    await supabase.from("leo_miners_claim_log").insert({
      student_id: studentId,
      idempotency_key: parsed.idempotencyKey,
      claim_type: LEO_MINERS_CLAIM_TYPES.DIAMONDS_CHEST,
      points_claimed: 0,
      coins_granted: 0,
      diamonds_granted: 0,
      status: LEO_MINERS_CLAIM_STATUS.REJECTED,
      metadata_json: { code: diamondResult.code, message: diamondResult.message },
    });
    return minersErrorResult(
      LEO_MINERS_ERROR_CODES.diamond_failed,
      diamondResult.message || "לא ניתן לזכות יהלומים",
      { code: diamondResult.code }
    );
  }

  if (!diamondResult.duplicate) {
    /* diamonds already cleared atomically before credit */
  }

  const { data: claimRow, error: claimLogError } = await supabase
    .from("leo_miners_claim_log")
    .insert({
      student_id: studentId,
      idempotency_key: parsed.idempotencyKey,
      claim_type: LEO_MINERS_CLAIM_TYPES.DIAMONDS_CHEST,
      points_claimed: 0,
      coins_granted: 0,
      diamonds_granted: conversion.diamonds,
      diamond_transaction_id: diamondResult.transactionId || null,
      status: LEO_MINERS_CLAIM_STATUS.COMPLETED,
      metadata_json: {
        diamondBalanceAfter: diamondResult.balanceAfter,
        duplicateDiamondMove: diamondResult.duplicate === true,
        diamondChestAction: parsed.diamondChestAction,
      },
    })
    .select("*")
    .single();

  if (claimLogError && claimLogError.code !== "23505") throw claimLogError;

  const refreshed = await getOrCreateMinersState(supabase, studentId);

  return {
    ok: true,
    duplicate: diamondResult.duplicate === true,
    dbReady: true,
    claimType: LEO_MINERS_CLAIM_TYPES.DIAMONDS_CHEST,
    pointsClaimed: 0,
    coinsGranted: 0,
    diamondsGranted: conversion.diamonds,
    diamondBalanceAfter: diamondResult.balanceAfter ?? null,
    pendingDiamonds: Math.floor(Number(refreshed.diamonds_pending || 0)),
    claimLogId: claimRow?.id || null,
  };
}
