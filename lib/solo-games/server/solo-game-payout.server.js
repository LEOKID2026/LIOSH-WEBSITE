import { applyArcadeCoinMove } from "../../arcade/server/arcade-coins.js";
import { requireSoloGameRules } from "../../rewards/server/economy-config.server.js";
import {
  applyDiamondMove,
  calculateSoloGameDiamonds,
} from "../../rewards/server/diamond-ledger.server.js";
import { difficultyLabelHe } from "../solo-game-registry.js";
import {
  getSoloPositiveProgress,
  zeroProgressCoinResult,
} from "../../games/server/positive-progress.server.js";

const SOLO_COIN_SOURCE_TYPE = "solo_game";

const ARCADE_GAME_KEYS = Object.freeze(["catcher", "flyer", "leo-jump", "balloons", "target-tap", "fruit-slice"]);
const PUZZLE_STYLE_GAME_KEYS = Object.freeze(["puzzle", "maze", "picture-puzzle", "smart-blocks"]);
const MEMORY_STYLE_GAME_KEYS = Object.freeze(["memory", "sort-shapes"]);

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

const MAZE_MAX_SCORE = Object.freeze({
  easy: 900,
  medium: 1100,
  hard: 1300,
});

const PICTURE_PUZZLE_MAX_SCORE = Object.freeze({
  easy: 1200,
  medium: 1400,
  hard: 1600,
});

const SORT_SHAPES_INITIAL_SCORE = Object.freeze({
  easy: 600,
  medium: 900,
  hard: 1200,
});

const SMART_BLOCKS_MAX_SCORE = Object.freeze({
  easy: 2500,
  medium: 4000,
  hard: 6000,
});

const TARGET_TAP_MAX_SCORE = Object.freeze({
  easy: 300,
  medium: 450,
  hard: 600,
});

const FRUIT_SLICE_MAX_SCORE = Object.freeze({
  easy: 550,
  medium: 750,
  hard: 1000,
});

function clampInt(n, min, max) {
  const v = Math.floor(Number(n) || 0);
  return Math.max(min, Math.min(max, v));
}

function isArcadeGame(gameKey) {
  return ARCADE_GAME_KEYS.includes(gameKey);
}

function isPuzzleStyleGame(gameKey) {
  return PUZZLE_STYLE_GAME_KEYS.includes(gameKey);
}

function isMemoryStyleGame(gameKey) {
  return MEMORY_STYLE_GAME_KEYS.includes(gameKey);
}

/**
 * @param {string} gameKey
 * @param {string|null|undefined} difficulty
 * @param {Record<string, unknown>} metrics
 * @param {Record<string, unknown>} rules
 */
export function calculateSoloGameCoins(gameKey, difficulty, metrics, rules) {
  const progress = getSoloPositiveProgress(gameKey, metrics);
  const zero = zeroProgressCoinResult(progress);
  const diff = String(difficulty || metrics?.difficulty || "medium").toLowerCase();
  const maxCoins = clampInt(rules?.maxCoins, 1, 1000000);

  if (zero) {
    return {
      coins: 0,
      breakdownHe: "-",
      displayLevelHe: isArcadeGame(gameKey)
        ? "-"
        : difficultyLabelHe(diff),
    };
  }

  const score = clampInt(metrics?.score, 0, 100000);
  const levelReached = clampInt(metrics?.levelReached, 0, 500);
  const mistakes = clampInt(metrics?.mistakes, 0, 500);
  const timeRemainingSec = clampInt(metrics?.timeRemainingSec, 0, 3600);
  const didWin = metrics?.didWin === true;

  let coins = 0;
  const breakdown = [];

  if (isArcadeGame(gameKey)) {
    const divisor = Math.max(1, clampInt(rules?.scoreUnitDivisor, 1, 1000));
    const perUnit = clampInt(rules?.perScoreUnit, 0, maxCoins);
    const perLevel = clampInt(rules?.perLevelBonus, 0, maxCoins);
    const scoreUnits = Math.floor(score / divisor);
    const levelBonus = levelReached * perLevel;
    coins = scoreUnits * perUnit + levelBonus;
    if (scoreUnits > 0) breakdown.push(`ניקוד: +${scoreUnits * perUnit}`);
    if (levelBonus > 0) breakdown.push(`רמה ${levelReached}: +${levelBonus}`);
  } else if (isPuzzleStyleGame(gameKey)) {
    const winBonus = rules?.winBonus && typeof rules.winBonus === "object" ? rules.winBonus : {};
    const winBase = clampInt(winBonus[diff], 0, maxCoins);
    const scoreDiv = Math.max(1, clampInt(rules?.scoreBonusDivisor, 1, 1000));

    if (didWin) {
      coins = winBase + Math.floor(score / scoreDiv);
      breakdown.push(`ניצחון (${difficultyLabelHe(diff)}): ${winBase}`);
      const extra = Math.floor(score / scoreDiv);
      if (extra > 0) breakdown.push(`בונוס ניקוד: +${extra}`);
    } else if (gameKey === "maze") {
      const starRate = clampInt(rules?.perStarCollected, 0, maxCoins) || 4;
      const stars = clampInt(metrics?.starsCollected, 0, 100);
      coins = stars * starRate;
      breakdown.push(`כוכבים (${stars}): ${stars * starRate}`);
    } else if (gameKey === "smart-blocks") {
      const blockRate = clampInt(rules?.perPlacedBlock, 0, maxCoins) || 2;
      const placed = clampInt(metrics?.placedBlocks, 0, 800);
      coins = placed * blockRate + Math.floor(score / scoreDiv);
      breakdown.push(`בלוקים (${placed}): ${placed * blockRate}`);
      const extra = Math.floor(score / scoreDiv);
      if (extra > 0) breakdown.push(`בונוס ניקוד: +${extra}`);
    } else {
      coins = Math.floor(score / scoreDiv);
      breakdown.push(`התקדמות: +${coins}`);
    }
  } else if (isMemoryStyleGame(gameKey)) {
    const winBonus = rules?.winBonus && typeof rules.winBonus === "object" ? rules.winBonus : {};
    const winBase = clampInt(winBonus[diff], 0, maxCoins);
    const mistakePenalty = clampInt(rules?.mistakePenalty, 0, maxCoins);
    const timeBonusPerSec = clampInt(rules?.timeBonusPerSec, 0, maxCoins);
    const pairRate = clampInt(rules?.perPairMatched, 0, maxCoins) || 6;

    if (didWin) {
      const mistakeCost = mistakes * mistakePenalty;
      const timeBonus = timeRemainingSec * timeBonusPerSec;
      coins = winBase - mistakeCost + timeBonus;
      breakdown.push(`ניצחון (${difficultyLabelHe(diff)}): ${winBase}`);
      if (mistakeCost > 0) breakdown.push(`טעויות (${mistakes}): -${mistakeCost}`);
      if (timeBonus > 0) breakdown.push(`זמן שנותר: +${timeBonus}`);
    } else if (gameKey === "memory") {
      const pairs = clampInt(metrics?.pairsMatched, 0, 50);
      coins = pairs * pairRate;
      breakdown.push(`זוגות (${pairs}): ${pairs * pairRate}`);
    } else {
      coins = Math.floor(score / 10);
      breakdown.push(`התקדמות: +${coins}`);
    }
  }

  coins = clampInt(coins, 0, maxCoins);
  return {
    coins,
    breakdownHe: breakdown.join(" · ") || "-",
    displayLevelHe: isArcadeGame(gameKey)
      ? levelReached > 0
        ? `רמה ${levelReached}`
        : "-"
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
    const pairsMatched = Number(metrics?.pairsMatched);
    if (Number.isFinite(pairsMatched) && (pairsMatched < 0 || pairsMatched > 50)) {
      return { ok: false, message: "מספר זוגות לא תקין" };
    }
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

  if (gameKey === "leo-jump") {
    const levelReached = Number(metrics?.levelReached);
    const expectedLevel = Math.floor(score / 10);
    if (!Number.isFinite(levelReached) || levelReached < 0 || levelReached > expectedLevel + 1) {
      return { ok: false, message: "רמה לא תקינה" };
    }
    if (score > 5000) return { ok: false, message: "ניקוד חריג" };
  }

  if (gameKey === "balloons") {
    if (score > 600) return { ok: false, message: "ניקוד חריג" };
    const levelReached = Number(metrics?.levelReached);
    if (levelReached != null && Number.isFinite(levelReached) && levelReached !== 0) {
      return { ok: false, message: "רמה לא תקינה" };
    }
  }

  if (gameKey === "target-tap") {
    const cap = TARGET_TAP_MAX_SCORE[diff] || 600;
    if (score > cap + 20) return { ok: false, message: "ניקוד חריג" };
    const mistakes = Number(metrics?.mistakes);
    if (!Number.isFinite(mistakes) || mistakes < 0 || mistakes > 80) {
      return { ok: false, message: "מספר טעויות לא תקין" };
    }
    const levelReached = Number(metrics?.levelReached);
    const expectedLevel = Math.floor(score / 5);
    if (!Number.isFinite(levelReached) || levelReached < 0 || levelReached > expectedLevel + 1) {
      return { ok: false, message: "רמה לא תקינה" };
    }
  }

  if (gameKey === "maze") {
    const cap = MAZE_MAX_SCORE[diff] || 1300;
    if (score > cap) return { ok: false, message: "ניקוד חריג" };
    const mistakes = Number(metrics?.mistakes);
    if (!Number.isFinite(mistakes) || mistakes < 0 || mistakes > 300) {
      return { ok: false, message: "מספר טעויות לא תקין" };
    }
  }

  if (gameKey === "picture-puzzle") {
    const cap = PICTURE_PUZZLE_MAX_SCORE[diff] || 1600;
    if (score > cap) return { ok: false, message: "ניקוד חריג" };
    const mistakes = Number(metrics?.mistakes);
    if (!Number.isFinite(mistakes) || mistakes < 0 || mistakes > 400) {
      return { ok: false, message: "מספר טעויות לא תקין" };
    }
  }

  if (gameKey === "sort-shapes") {
    const initial = SORT_SHAPES_INITIAL_SCORE[diff] || 1200;
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

  if (gameKey === "smart-blocks") {
    const cap = SMART_BLOCKS_MAX_SCORE[diff] || 6000;
    if (score > cap) return { ok: false, message: "ניקוד חריג" };
    const moves = Number(metrics?.moves);
    if (!Number.isFinite(moves) || moves < 0 || moves > 800) {
      return { ok: false, message: "מספר מהלכים לא תקין" };
    }
    const placedBlocks = Number(metrics?.placedBlocks);
    if (!Number.isFinite(placedBlocks) || placedBlocks < 0 || placedBlocks > 800) {
      return { ok: false, message: "מספר בלוקים לא תקין" };
    }
  }

  if (gameKey === "fruit-slice") {
    const cap = FRUIT_SLICE_MAX_SCORE[diff] || 1000;
    if (score > cap) return { ok: false, message: "ניקוד חריג" };
    const strikes = Number(metrics?.strikes);
    if (!Number.isFinite(strikes) || strikes < 0 || strikes > 3) {
      return { ok: false, message: "מספר פסילות לא תקין" };
    }
    const slicedFruits = Number(metrics?.slicedFruits);
    if (!Number.isFinite(slicedFruits) || slicedFruits < 0 || slicedFruits > 200) {
      return { ok: false, message: "מספר פירות שנחתכו לא תקין" };
    }
    const missedFruits = Number(metrics?.missedFruits);
    if (!Number.isFinite(missedFruits) || missedFruits < 0 || missedFruits > 50) {
      return { ok: false, message: "מספר פירות שפוספסו לא תקין" };
    }
    const bombHits = Number(metrics?.bombHits);
    if (!Number.isFinite(bombHits) || bombHits < 0 || bombHits > 3) {
      return { ok: false, message: "מספר פגיעות בפצצות לא תקין" };
    }
    const accuracy = Number(metrics?.accuracy);
    if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100) {
      return { ok: false, message: "דיוק לא תקין" };
    }
    const levelReached = Number(metrics?.levelReached);
    if (levelReached != null && Number.isFinite(levelReached) && levelReached !== 0) {
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
  const diamondPayout = calculateSoloGameDiamonds(
    rules?.diamondRules,
    getSoloPositiveProgress(gameKey, metrics) > 0 ? metrics : { ...metrics, score: 0, didWin: false },
  );

  let balanceAfter = null;
  let duplicate = false;
  let diamondBalanceAfter = null;
  let diamondDuplicate = false;

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

  if (diamondPayout.diamonds > 0) {
    const diamondResult = await applyDiamondMove(supabase, {
      studentId,
      direction: "earn",
      amount: diamondPayout.diamonds,
      idempotencyKey: `solo_diamond_${session.id}`,
      sourceType: "solo_game",
      sourceId: session.id,
      metadata: {
        gameKey,
        difficulty,
        metrics,
        breakdownHe: diamondPayout.breakdownHe,
      },
      reason: `solo_game_${gameKey}`,
    });

    if (!diamondResult.ok && !diamondResult.skipped) {
      return {
        ok: false,
        code: diamondResult.code || "diamond_failed",
        message: diamondResult.message || "לא ניתן לזכות יהלומים",
      };
    }
    diamondBalanceAfter = diamondResult.balanceAfter ?? null;
    diamondDuplicate = diamondResult.duplicate === true;
  } else {
    const { data: diamondBalRow } = await supabase
      .from("student_diamond_balances")
      .select("balance")
      .eq("student_id", studentId)
      .maybeSingle();
    diamondBalanceAfter = diamondBalRow?.balance ?? 0;
  }

  const resultJson = {
    didWin: metrics?.didWin === true,
    score: Math.floor(Number(metrics?.score) || 0),
    displayLevelHe: payout.displayLevelHe,
    breakdownHe: payout.breakdownHe,
    duplicate,
  };

  const diamondResultJson = {
    diamonds: diamondPayout.diamonds,
    breakdownHe: diamondPayout.breakdownHe,
    duplicate: diamondDuplicate,
  };

  const { error: updErr } = await supabase
    .from("solo_game_sessions")
    .update({
      status: "completed",
      finished_at: finishedAt,
      metrics_json: metrics,
      coins_awarded: payout.coins,
      diamonds_awarded: diamondPayout.diamonds,
      result_json: resultJson,
      diamond_result_json: diamondResultJson,
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
    diamondsAwarded: diamondPayout.diamonds,
    diamondBreakdownHe: diamondPayout.breakdownHe,
    diamondBalanceAfter,
    didWin: metrics?.didWin === true,
    score: resultJson.score,
    displayLevelHe: payout.displayLevelHe,
    duplicate,
    diamondDuplicate,
  };
}
