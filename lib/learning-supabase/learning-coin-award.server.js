/**
 * Child World — Phase 1: Learning Coin Awards
 *
 * Awards Learning Coins to a student after a valid completed learning session.
 * Uses the same arcade_coin_apply RPC as the arcade system — idempotent,
 * balance-safe, and service-role only.
 *
 * Feature flag: set ENABLE_SESSION_COIN_AWARDS=true to activate.
 * If the flag is absent or false, all calls return immediately with { skipped: true }.
 *
 * Coin formula (tiered, non-stacking accuracy bonus):
 *   base:          10 coins
 *   accuracy >= 80%: +5  → total 15
 *   accuracy >= 95%: +10 → total 20  (replaces the +5, not additive)
 *
 * Daily cap: 300 coins per student per Asia/Jerusalem calendar day from learning-session awards.
 * The day resets at Israel midnight (03:00 UTC in summer / 02:00 UTC in winter).
 * The Monthly Persistence Reward (Phase 2) is separate and not capped here.
 *
 * Idempotency key: coin_session_{learningSessionId}
 * Duplicate calls for the same session ID are silently accepted (no double award).
 *
 * This helper NEVER throws and NEVER fails the calling session/finish handler.
 * Coin award failure is returned as { ok: false } for logging only.
 */

import { applyArcadeCoinMove } from "../arcade/server/arcade-coins";
import { getTodayIsraelMidnightUtc } from "./israel-calendar.server";

const SESSION_COIN_SOURCE_TYPE = "learning_session";
const SESSION_COIN_REASON = "learning_session";
const SESSION_DAILY_CAP = 300;

function isSessionCoinAwardEnabled() {
  return process.env.ENABLE_SESSION_COIN_AWARDS === "true";
}

/**
 * Tiered accuracy bonus — non-stacking (highest tier wins).
 * Returns 0 for invalid or zero-duration sessions.
 */
export function calculateSessionCoins(accuracy, durationSeconds) {
  if (typeof durationSeconds !== "number" || durationSeconds <= 0) return 0;
  const base = 10;
  const acc = typeof accuracy === "number" && isFinite(accuracy) ? accuracy : 0;
  if (acc >= 95) return base + 10;
  if (acc >= 80) return base + 5;
  return base;
}

/**
 * Sum of Learning Coins earned from learning sessions today (Asia/Jerusalem calendar day).
 * "Today" is defined as the current calendar day in Israel local time — not UTC.
 *
 * Owner decision (2026-05-22): All daily caps use Asia/Jerusalem, matching the child's
 * real local day. The daily cap therefore resets at Israel midnight (03:00 UTC in summer,
 * 02:00 UTC in winter), not at 00:00 UTC.
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
 * Main export — call this from session/finish.js after the session row is written.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase - service-role client
 * @param {object} params
 * @param {string} params.studentId
 * @param {string} params.learningSessionId
 * @param {number} params.durationSeconds
 * @param {number|null} params.accuracy  - 0–100; null treated as 0
 * @param {string|null} params.subject   - stored in metadata for reporting
 *
 * @returns {Promise<{
 *   ok: boolean,
 *   skipped?: boolean,
 *   reason?: string,
 *   duplicate?: boolean,
 *   coinsAwarded?: number,
 *   balanceAfter?: number,
 *   todayEarned?: number,
 * }>}
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

  const rawCoins = calculateSessionCoins(accuracy, durationSeconds);
  if (rawCoins <= 0) {
    return { ok: true, skipped: true, reason: "zero_coins_calculated" };
  }

  let todayEarned = 0;
  try {
    todayEarned = await getTodaySessionEarnings(supabase, studentId);
  } catch {
    // If we cannot read today's total, default to 0 — err on the side of awarding.
    todayEarned = 0;
  }

  if (todayEarned >= SESSION_DAILY_CAP) {
    return { ok: true, skipped: true, reason: "daily_cap_reached", todayEarned };
  }

  const coinsToAward = Math.min(rawCoins, SESSION_DAILY_CAP - todayEarned);

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
