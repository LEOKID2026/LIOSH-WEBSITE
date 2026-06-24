/** @typedef {'easy' | 'medium' | 'hard'} FruitSliceDifficulty */

export const FRUIT_SLICE_SCORE_TARGET = Object.freeze({
  easy: 150,
  medium: 250,
  hard: 400,
});

export const FRUIT_SLICE_MAX_STRIKES = 3;

export const FRUIT_SCORE = 10;
export const FRUIT_SLICE_COMBO_BONUS_2 = 10;
export const FRUIT_SLICE_COMBO_BONUS_3_PLUS = 25;

export const FRUIT_TYPES = Object.freeze([
  { id: "apple", emoji: "🍎", bad: false },
  { id: "orange", emoji: "🍊", bad: false },
  { id: "melon", emoji: "🍉", bad: false },
  { id: "grape", emoji: "🍇", bad: false },
  { id: "bomb", emoji: "💣", bad: true },
]);

/** Temporary BG — same asset family as other solo arcade games. */
export const FRUIT_SLICE_BG = "/images/game-balloons-bg.png";

/**
 * @param {number} sliced
 * @param {number} missed
 * @param {number} bombHits
 */
export function fruitSliceAccuracy(sliced, missed, bombHits) {
  const total = sliced + missed + bombHits;
  if (total <= 0) return 100;
  return Math.round((sliced / total) * 100);
}

/**
 * @param {number} goodCount
 */
export function fruitSliceSwipeScore(goodCount) {
  if (goodCount <= 0) return { points: 0, comboBonus: 0 };
  let comboBonus = 0;
  if (goodCount >= 3) comboBonus = FRUIT_SLICE_COMBO_BONUS_3_PLUS;
  else if (goodCount === 2) comboBonus = FRUIT_SLICE_COMBO_BONUS_2;
  return { points: goodCount * FRUIT_SCORE + comboBonus, comboBonus };
}

/**
 * @param {string|null|undefined} difficulty
 * @returns {FruitSliceDifficulty}
 */
export function normalizeFruitSliceDifficulty(difficulty) {
  const d = String(difficulty || "medium").toLowerCase();
  if (d === "easy" || d === "hard") return d;
  return "medium";
}
