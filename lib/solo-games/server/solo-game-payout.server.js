import { applyArcadeCoinMove } from "../../arcade/server/arcade-coins.js";
import { requireSoloGameRules } from "../../rewards/server/economy-config.server.js";
import { difficultyLabelHe } from "../solo-game-registry.js";

const SOLO_COIN_SOURCE_TYPE = "solo_game";

const MEMORY_INITIAL_SCORE = Object.freeze({
  easy: 1000,
  medium: 3000,
  hard: 6000,
});

const PUZZLE_SCORE_TO_WIN = Object.freeze({
  easy: 500,
  medium: 800,
  hard: 1400,
});

function clampInt(n, min, max) {
  const v = Math.floor(Number(n) || 0);
  return Math.max(min, Math.min(max, v));
}

/**
 * @param {string} gameKey
 * @param {string|null|undefined} difficulty
 * @param {Record<string, unknown>} metrics
 * @param {Record<string, unknown>} rules
 */
export function calculateSoloGameCoins(gameKey, difficulty, metrics, rules) {
  const score = clampInt(metrics?.score, 0, 100000);
  const levelReached = clampInt(metrics?.levelReached, 0, 500);
  const mistakes = clampInt(metrics?.mistakes, 0, 500);
  const timeRemainingSec = clampInt(metrics?.timeRemainingSec, 0, 3600);
  const didWin = metrics?.didWin === true;
  const diff = String(difficulty || metrics?.difficulty || "medium").toLowerCase();
  const maxCoins = clampInt(rules?.maxCoins, 1, 1000000);

  let coins = 0;
  const breakdown = [];

  if (gameKey === "catcher" || gameKey === "flyer") {
    const base = clampInt(rules?.baseCoins, 0, maxCoins);
    const divisor = Math.max(1, clampInt(rules?.scoreUnitDivisor, 1, 1000));
    const perUnit = clampInt(rules?.perScoreUnit, 0, maxCoins);
    const perLevel = clampInt(rules?.perLevelBonus, 0, maxCoins);
    const scoreUnits = Math.floor(score / divisor);
    const levelBonus = levelReached * perLevel;
    coins = base + scoreUnits * perUnit + levelBonus;
    breakdown.push(`בסיס: ${base}`);
    if (scoreUnits > 0) breakdown.push(`ניקוד: +${scoreUnits * perUnit}`);
    if (levelBonus > 0) breakdown.push(`רמה ${levelReached}: +${levelBonus}`);
  } else if (gameKey === "puzzle") {
    const lossCoins = clampInt(rules?.lossCoins, 0, maxCoins);
    const winBonus = rules?.winBonus && typeof rules.winBonus === "object" ? rules.winBonus : {};
    const winBase = clampInt(winBonus[diff], 0, maxCoins);
    const scoreDiv = Math.max(1, clampInt(rules?.scoreBonusDivisor, 1, 1000));
    if (didWin) {
      coins = winBase + Math.floor(score / scoreDiv);
      breakdown.push(`ניצחון (${difficultyLabelHe(diff)}): ${winBase}`);
      const extra = Math.floor(score / scoreDiv);
      if (extra > 0) breakdown.push(`בונוס ניקוד: +${extra}`);
    } else {
      coins = lossCoins;
      breakdown.push(`השתתפות: ${lossCoins}`);
    }
  } else if (gameKey === "memory") {
    const winBonus = rules?.winBonus && typeof rules.winBonus === "object" ? rules.winBonus : {};
    const winBase = clampInt(winBonus[diff], 0, maxCoins);
    const mistakePenalty = clampInt(rules?.mistakePenalty, 0, maxCoins);
    const timeBonusPerSec = clampInt(rules?.timeBonusPerSec, 0, maxCoins);
    if (didWin) {
      const mistakeCost = mistakes * mistakePenalty;
      const timeBonus = timeRemainingSec * timeBonusPerSec;
      coins = winBase - mistakeCost + timeBonus;
      breakdown.push(`ניצחון (${difficultyLabelHe(diff)}): ${winBase}`);
      if (mistakeCost > 0) breakdown.push(`טעויות (${mistakes}): -${mistakeCost}`);
      if (timeBonus > 0) breakdown.push(`זמן שנותר: +${timeBonus}`);
    } else {
      coins = 0;
      breakdown.push("לא הספקת לסיים — אין מטבעות");
    }
  }

  coins = clampInt(coins, 0, maxCoins);
  return {
    coins,
    breakdownHe: breakdown.join(" · ") || "—",
    displayLevelHe:
      gameKey === "catcher" || gameKey === "flyer"
        ? `רמה ${levelReached}`
        : difficultyLabelHe(diff),
  };
}

/**
 * @param {Record<string, unknown>} metrics
 * @param {string} gameKey
 * @param {string|null|undefined} difficulty
 */
export function validateSoloGameMetrics(metrics, gameKey, difficulty) {
  const score = Number(metrics?.score);
  if (!Number.isFinite(score) || score < 0 || score > 100000) {
    return { ok: false, message: "ניקוד לא תקין" };
  }

  const diff = String(difficulty || metrics?.difficulty || "").toLowerCase();

  if (gameKey === "puzzle") {
    const cap = (PUZZLE_SCORE_TO_WIN[diff] || 1400) * 2;
    if (score > cap) return { ok: false, message: "ניקוד חריג" };
  }

  if (gameKey === "memory") {
    const initial = MEMORY_INITIAL_SCORE[diff] || 10000;
    if (score > initial) return { ok: false, message: "ניקוד חריג" };
    const mistakes = Number(metrics?.mistakes);
    if (!Number.isFinite(mistakes) || mistakes < 0 || mistakes > 200) {
      return { ok: false, message: "מספר טעויות לא תקין" };
    }
    const expectedMaxMistakes = Math.ceil(initial / 10);
    if (mistakes > expectedMaxMistakes + 2) {
      return { ok: false, message: "מספר טעויות חריג" };
    }
  }

  if (gameKey === "catcher" || gameKey === "flyer") {
    const levelReached = Number(metrics?.levelReached);
    const expectedLevel = Math.floor(score / (gameKey === "flyer" ? 12 : 10));
    if (!Number.isFinite(levelReached) || levelReached < 0 || levelReached > expectedLevel + 1) {
      return { ok: false, message: "רמה לא תקינה" };
    }
  }

  return { ok: true };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {object} params
 */
export async function finalizeSoloGameSession(supabase, params) {
  const {
    session,
    studentId,
    metrics,
    finishedAt = new Date().toISOString(),
  } = params;

  const gameKey = session.game_key;
  const difficulty = session.difficulty || metrics?.difficulty || null;

  const metricCheck = validateSoloGameMetrics(metrics, gameKey, difficulty);
  if (!metricCheck.ok) {
    return { ok: false, code: "invalid_metrics", message: metricCheck.message };
  }

  const rules = await requireSoloGameRules(supabase, gameKey);
  const payout = calculateSoloGameCoins(gameKey, difficulty, metrics, rules);

  let balanceAfter = null;
  let duplicate = false;

  if (payout.coins > 0) {
    const coinResult = await applyArcadeCoinMove(supabase, {
      studentId,
      direction: "earn",
      amount: payout.coins,
      idempotencyKey: `solo_game_${session.id}`,
      sourceType: SOLO_COIN_SOURCE_TYPE,
      sourceId: session.id,
      metadata: {
        gameKey,
        difficulty,
        metrics,
        breakdownHe: payout.breakdownHe,
      },
      reason: `solo_game_${gameKey}`,
    });

    if (!coinResult.ok) {
      return {
        ok: false,
        code: coinResult.code || "coin_failed",
        message: coinResult.message || "לא ניתן לזכות מטבעות",
      };
    }
    balanceAfter = coinResult.balanceAfter ?? null;
    duplicate = coinResult.duplicate === true;
  } else {
    const { data: balRow } = await supabase
      .from("student_coin_balances")
      .select("balance")
      .eq("student_id", studentId)
      .maybeSingle();
    balanceAfter = balRow?.balance ?? 0;
  }

  const resultJson = {
    didWin: metrics?.didWin === true,
    score: Math.floor(Number(metrics?.score) || 0),
    displayLevelHe: payout.displayLevelHe,
    breakdownHe: payout.breakdownHe,
    duplicate,
  };

  const { error: updErr } = await supabase
    .from("solo_game_sessions")
    .update({
      status: "completed",
      finished_at: finishedAt,
      metrics_json: metrics,
      coins_awarded: payout.coins,
      result_json: resultJson,
      updated_at: finishedAt,
    })
    .eq("id", session.id)
    .eq("student_id", studentId)
    .eq("status", "active");

  if (updErr) {
    return { ok: false, code: "db_error", message: updErr.message || "לא ניתן לשמור תוצאה" };
  }

  return {
    ok: true,
    coinsAwarded: payout.coins,
    breakdownHe: payout.breakdownHe,
    balanceAfter,
    didWin: metrics?.didWin === true,
    score: resultJson.score,
    displayLevelHe: payout.displayLevelHe,
    duplicate,
  };
}
