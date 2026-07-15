const SOLO_ARCADE_GAME_KEYS = Object.freeze([
  "catcher",
  "flyer",
  "leo-jump",
  "balloons",
  "target-tap",
  "fruit-slice",
]);

const SOLO_PUZZLE_STYLE_GAME_KEYS = Object.freeze([
  "puzzle",
  "maze",
  "picture-puzzle",
  "smart-blocks",
]);

const SOLO_MEMORY_STYLE_GAME_KEYS = Object.freeze(["memory", "sort-shapes"]);

function clampInt(n, min, max) {
  const v = Math.floor(Number(n) || 0);
  return Math.max(min, Math.min(max, v));
}

/**
 * Real progress metric for educational games — must be > 0 before any coin payout.
 * @param {string} gameKey
 * @param {Record<string, unknown>} metrics
 */
export function getEducationalPositiveProgress(gameKey, metrics) {
  const key = String(gameKey || "").trim().toLowerCase();

  if (key === "recycling-factory") {
    return Math.max(
      clampInt(metrics?.correctItems, 0, 100),
      clampInt(metrics?.sortedItems, 0, 100),
    );
  }

  if (key === "leo-supermarket") {
    return clampInt(metrics?.correctCustomers, 0, 20);
  }

  if (key === "leo-lab") {
    return clampInt(metrics?.successfulExperiments, 0, 20);
  }

  if (key === "leo-pizzeria") {
    return clampInt(metrics?.successfulCustomers, 0, 20);
  }

  if (key === "leo-gifts" || key === "leo-bakery") {
    return clampInt(metrics?.successfulQuestions, 0, 20);
  }

  if (key === "leo-number-path") {
    return clampInt(metrics?.successfulTasks, 0, 20);
  }

  if (key === "leo-word-train" || key === "leo-word-detective") {
    return clampInt(metrics?.successfulTasks, 0, 20);
  }

  return 0;
}

/**
 * Real progress metric for solo games — must be > 0 before any coin payout.
 * @param {string} gameKey
 * @param {Record<string, unknown>} metrics
 */
export function getSoloPositiveProgress(gameKey, metrics) {
  const key = String(gameKey || "").trim().toLowerCase();
  const score = clampInt(metrics?.score, 0, 100000);

  if (key === "fruit-slice") {
    return clampInt(metrics?.slicedFruits, 0, 200);
  }

  if (key === "smart-blocks") {
    return clampInt(metrics?.placedBlocks, 0, 800);
  }

  if (key === "memory") {
    return clampInt(metrics?.pairsMatched, 0, 50);
  }

  if (key === "maze") {
    return Math.max(
      clampInt(metrics?.starsCollected, 0, 100),
      clampInt(metrics?.mazeCompleted, 0, 100),
      metrics?.didWin === true ? score : 0,
    );
  }

  if (SOLO_ARCADE_GAME_KEYS.includes(key)) {
    return score;
  }

  if (SOLO_PUZZLE_STYLE_GAME_KEYS.includes(key) || SOLO_MEMORY_STYLE_GAME_KEYS.includes(key)) {
    return score;
  }

  return score;
}

/**
 * @param {number} progress
 */
export function zeroProgressCoinResult(progress) {
  if (progress > 0) return null;
  return {
    coins: 0,
    breakdownHe: "-",
    noPositiveProgress: true,
  };
}
