/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

export const TASKS_PER_LEVEL = 10;

export const DIFFICULTIES = {
  easy: { id: "easy", label: "קל" },
  medium: { id: "medium", label: "בינוני" },
  hard: { id: "hard", label: "קשה" },
};

export const SCORE = {
  correct: 30,
  firstTry: 20,
  streakBonus: 10,
};

/** @param {DifficultyId} difficulty @param {Record<DifficultyId, unknown[]>} pools */
export function pickTasksForRun(difficulty, pools) {
  const list = pools[difficulty] ?? [];
  return list.slice(0, TASKS_PER_LEVEL);
}

/** @param {string} [imageSrc] @param {string} fallbackEmoji */
export function visualEmoji(imageSrc, fallbackEmoji) {
  return imageSrc ? null : fallbackEmoji;
}
