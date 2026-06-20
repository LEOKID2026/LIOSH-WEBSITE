/**
 * Child World — Phase 1: Learning Coin Awards
 *
 * Awards Learning Coins to a student after a valid completed learning session.
 * Coin formula and daily cap come from reward_economy_session_coins (Admin/DB).
 *
 * Feature flag: set ENABLE_SESSION_COIN_AWARDS=true to activate.
 *
 * Idempotency key: coin_session_{learningSessionId}
 */

import { applyArcadeCoinMove } from "../arcade/server/arcade-coins";
import { getTodayIsraelMidnightUtc } from "./israel-calendar.server";
import {
  calculateSessionCoinsFromSettings,
  requireSessionCoinSettings,
} from "../rewards/server/economy-config.server.js";

const SESSION_COIN_SOURCE_TYPE = "learning_session";
const SESSION_COIN_REASON = "learning_session";

function isSessionCoinAwardEnabled() {
  return process.env.ENABLE_SESSION_COIN_AWARDS === "true";
}

/**
 * @deprecated Use calculateSessionCoinsFromSettings with DB settings.
 * @param {number|null|undefined} accuracy
 * @param {number|null|undefined} durationSeconds
 * @param {{ baseCoins: number, bonus80Coins: number, bonus95Coins: number }} [settings]
 */
export function calculateSessionCoins(accuracy, durationSeconds, settings) {
  if (!settings) {
    throw new Error("calculateSessionCoins requires session coin settings from DB");
  }
  return calculateSessionCoinsFromSettings(accuracy, durationSeconds, settings);
}

/**
 * Sum of Learning Coins earned from learning sessions today (Asia/Jerusalem calendar day).
 */
async function getTodaySessionEarnings(supabase, studentId) {
  const todayIsraelStart = getTodayIsraelMidnightUtc();

  const { data, error } = await supabase
    .from("coin_transactions")
    .select("amount")
    .eq("student_id", studentId)
    .eq("direction", "earn")
    .eq("source_type", SESSION_COIN_SOURCE_TYPE)
    .gte("created_at", todayIsraelStart.toISOString());

  if (error || !data) return 0;
  return data.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {object} params
 */
export async function awardLearningSessionCoins(supabase, {
  studentId,
  learningSessionId,
  durationSeconds,
  accuracy,
  subject,
}) {
  if (!isSessionCoinAwardEnabled()) {
    return { ok: true, skipped: true, reason: "feature_disabled" };
  }

  if (!learningSessionId) {
    return { ok: true, skipped: true, reason: "missing_session_id" };
  }

  let sessionSettings;
  try {
    sessionSettings = await requireSessionCoinSettings(supabase);
  } catch (err) {
    return { ok: false, reason: "economy_unavailable", detail: err?.message || String(err) };
  }

  const rawCoins = calculateSessionCoinsFromSettings(accuracy, durationSeconds, sessionSettings);
  if (rawCoins <= 0) {
    return { ok: true, skipped: true, reason: "zero_coins_calculated" };
  }

  const dailyCap = sessionSettings.dailyCap;

  let todayEarned = 0;
  try {
    todayEarned = await getTodaySessionEarnings(supabase, studentId);
  } catch {
    todayEarned = 0;
  }

  if (todayEarned >= dailyCap) {
    return { ok: true, skipped: true, reason: "daily_cap_reached", todayEarned };
  }

  const coinsToAward = Math.min(rawCoins, dailyCap - todayEarned);

  const result = await applyArcadeCoinMove(supabase, {
    studentId,
    direction: "earn",
    amount: coinsToAward,
    idempotencyKey: `coin_session_${learningSessionId}`,
    sourceType: SESSION_COIN_SOURCE_TYPE,
    sourceId: learningSessionId,
    metadata: {
      subject: subject || null,
      rawCoins,
      coinsAwarded: coinsToAward,
      durationSeconds,
      accuracy: accuracy ?? null,
      dailyEarnedBefore: todayEarned,
      dailyCap,
    },
    reason: SESSION_COIN_REASON,
  });

  if (!result.ok) {
    return { ok: false, reason: "rpc_failed", detail: result.message };
  }

  return {
    ok: true,
    duplicate: result.duplicate === true,
    coinsAwarded: coinsToAward,
    balanceAfter: result.balanceAfter,
    todayEarned,
  };
}
