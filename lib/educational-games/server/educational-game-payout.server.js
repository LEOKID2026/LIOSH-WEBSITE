import { applyArcadeCoinMove } from "../../arcade/server/arcade-coins.js";
import { requireEducationalGameRules } from "../../rewards/server/economy-config.server.js";
import { difficultyLabelHe } from "../educational-game-registry.js";

const EDUCATIONAL_COIN_SOURCE_TYPE = "educational_game";

const RECYCLING_FACTORY_MAX_SCORE = Object.freeze({
  easy: 450,
  medium: 700,
  hard: 950,
});

function clampInt(n, min, max) {
  const v = Math.floor(Number(n) || 0);
  return Math.max(min, Math.min(max, v));
}

function clampFloat(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

/**
 * @param {Record<string, unknown>} metrics
 * @param {string|null|undefined} difficulty
 * @param {Record<string, unknown>} rules
 */
export function calculateEducationalGameCoins(gameKey, difficulty, metrics, rules) {
  const diff = String(difficulty || metrics?.difficulty || "medium").toLowerCase();
  const didWin = metrics?.didWin === true;
  const score = clampInt(metrics?.score, 0, 100000);
  const accuracy = clampFloat(metrics?.accuracy, 0, 1);
  const bestStreak = clampInt(metrics?.bestStreak, 0, 200);
  const maxCoins = clampInt(rules?.maxCoins, 1, 1000000);

  const winBonus = rules?.winBonus && typeof rules.winBonus === "object" ? rules.winBonus : {};
  const lossParticipation =
    rules?.lossParticipation && typeof rules.lossParticipation === "object"
      ? rules.lossParticipation
      : {};

  let coins = didWin ? clampInt(winBonus[diff], 0, maxCoins) : clampInt(lossParticipation[diff], 0, maxCoins);
  const breakdown = [];

  if (didWin) {
    breakdown.push(`ניצחון (${difficultyLabelHe(diff)}): ${clampInt(winBonus[diff], 0, maxCoins)}`);
  } else {
    breakdown.push(`השתתפות (${difficultyLabelHe(diff)}): ${clampInt(lossParticipation[diff], 0, maxCoins)}`);
  }

  if (accuracy >= 0.9) {
    const bonusPct = clampFloat(rules?.accuracyBonus90, 0, 1);
    const bonus = Math.floor(coins * bonusPct);
    if (bonus > 0) {
      coins += bonus;
      breakdown.push(`דיוק גבוה: +${bonus}`);
    }
  } else if (accuracy >= 0.75) {
    const bonusPct = clampFloat(rules?.accuracyBonus75, 0, 1);
    const bonus = Math.floor(coins * bonusPct);
    if (bonus > 0) {
      coins += bonus;
      breakdown.push(`דיוק טוב: +${bonus}`);
    }
  }

  if (bestStreak >= 10) {
    const streakBonus = clampInt(rules?.bestStreakBonus10, 0, maxCoins);
    if (streakBonus > 0) {
      coins += streakBonus;
      breakdown.push(`רצף ${bestStreak}: +${streakBonus}`);
    }
  }

  const highThreshold = clampInt(rules?.highScoreBonusThreshold, 0, 100000);
  const highBonus = clampInt(rules?.highScoreBonus, 0, maxCoins);
  if (didWin && score >= highThreshold && highBonus > 0) {
    coins += highBonus;
    breakdown.push(`ניקוד גבוה: +${highBonus}`);
  }

  coins = clampInt(coins, 0, maxCoins);
  return {
    coins,
    breakdownHe: breakdown.join(" · ") || "—",
    displayLevelHe: difficultyLabelHe(diff),
  };
}

/**
 * @param {Record<string, unknown>} metrics
 * @param {string} gameKey
 * @param {string|null|undefined} difficulty
 */
export function validateEducationalGameMetrics(metrics, gameKey, difficulty) {
  const score = Number(metrics?.score);
  if (!Number.isFinite(score) || score < 0 || score > 100000) {
    return { ok: false, message: "ניקוד לא תקין" };
  }

  const diff = String(difficulty || metrics?.difficulty || "").toLowerCase();
  if (!["easy", "medium", "hard"].includes(diff)) {
    return { ok: false, message: "רמת קושי לא תקינה" };
  }

  const sortedItems = Number(metrics?.sortedItems);
  const correctItems = Number(metrics?.correctItems);
  const wrongItems = Number(metrics?.wrongItems);
  const missedItems = Number(metrics?.missedItems);
  const mistakes = Number(metrics?.mistakes);
  const bestStreak = Number(metrics?.bestStreak);
  const durationSec = Number(metrics?.durationSec);
  const accuracy = Number(metrics?.accuracy);

  for (const [val, max, label] of [
    [sortedItems, 100, "פריטים שמוינו"],
    [correctItems, 100, "פריטים נכונים"],
    [wrongItems, 50, "טעויות מיון"],
    [missedItems, 50, "פריטים שפוספסו"],
    [mistakes, 50, "טעויות"],
    [bestStreak, 100, "רצף"],
    [durationSec, 3600, "משך"],
  ]) {
    if (!Number.isFinite(val) || val < 0 || val > max) {
      return { ok: false, message: `${label} לא תקין` };
    }
  }

  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1) {
    return { ok: false, message: "דיוק לא תקין" };
  }

  if (gameKey === "recycling-factory") {
    const cap = RECYCLING_FACTORY_MAX_SCORE[diff] || 950;
    if (score > cap) return { ok: false, message: "ניקוד חריג" };
    const expectedSorted = diff === "easy" ? 20 : diff === "medium" ? 30 : 40;
    if (metrics?.didWin === true && sortedItems < expectedSorted) {
      return { ok: false, message: "כמות פריטים לא תקינה" };
    }
    if (correctItems > sortedItems + 2) {
      return { ok: false, message: "נתוני מיון לא תקינים" };
    }
    if (Math.abs(mistakes - (wrongItems + missedItems)) > 1) {
      return { ok: false, message: "ספירת טעויות לא תקינה" };
    }
  }

  return { ok: true };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {object} params
 */
export async function finalizeEducationalGameSession(supabase, params) {
  const { session, studentId, metrics, finishedAt = new Date().toISOString() } = params;
  const gameKey = session.game_key;
  const difficulty = session.difficulty || metrics?.difficulty || null;

  const metricCheck = validateEducationalGameMetrics(metrics, gameKey, difficulty);
  if (!metricCheck.ok) {
    return { ok: false, code: "invalid_metrics", message: metricCheck.message };
  }

  const rules = await requireEducationalGameRules(supabase, gameKey);
  const payout = calculateEducationalGameCoins(gameKey, difficulty, metrics, rules);

  let balanceAfter = null;
  let duplicate = false;

  if (payout.coins > 0) {
    const coinResult = await applyArcadeCoinMove(supabase, {
      studentId,
      direction: "earn",
      amount: payout.coins,
      idempotencyKey: `educational_game_${session.id}`,
      sourceType: EDUCATIONAL_COIN_SOURCE_TYPE,
      sourceId: session.id,
      metadata: {
        gameKey,
        category: "educational",
        difficulty,
        metrics,
        breakdownHe: payout.breakdownHe,
      },
      reason: `educational_game_${gameKey}`,
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
    score: metrics?.score ?? 0,
    coinsAwarded: payout.coins,
    breakdownHe: payout.breakdownHe,
    displayLevelHe: payout.displayLevelHe,
    balanceAfter,
    duplicate,
    accuracy: metrics?.accuracy ?? 0,
    correctItems: metrics?.correctItems ?? 0,
    mistakes: metrics?.mistakes ?? 0,
    bestStreak: metrics?.bestStreak ?? 0,
  };

  const { error: updateError } = await supabase
    .from("educational_game_sessions")
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

  if (updateError) {
    return { ok: false, code: "db_error", message: updateError.message || "לא ניתן לשמור תוצאה" };
  }

  return {
    ok: true,
    didWin: resultJson.didWin,
    score: resultJson.score,
    coinsAwarded: payout.coins,
    breakdownHe: payout.breakdownHe,
    displayLevelHe: payout.displayLevelHe,
    balanceAfter,
    duplicate,
    accuracy: Math.round((metrics?.accuracy ?? 0) * 100),
    correctItems: metrics?.correctItems ?? 0,
    mistakes: metrics?.mistakes ?? 0,
    bestStreak: metrics?.bestStreak ?? 0,
  };
}
