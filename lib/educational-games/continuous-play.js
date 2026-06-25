/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

export const MIN_QUESTION_TIME_SEC = 15;
export const TIME_DECREASE_PER_STAGE = 5;
export const CORRECT_PER_STAGE_UP = 10;
export const SCORE_CORRECT = 30;
export const SCORE_TIME_BONUS_MAX = 20;
export const SCORE_STREAK_BONUS = 25;
export const STREAK_BONUS_EVERY = 5;

/** @type {Record<DifficultyId, { label: string, startTimeSec: number, maxMistakes: number }>} */
export const CONTINUOUS_DIFFICULTY = {
  easy: { label: "קל", startTimeSec: 45, maxMistakes: 5 },
  medium: { label: "בינוני", startTimeSec: 40, maxMistakes: 4 },
  hard: { label: "קשה", startTimeSec: 35, maxMistakes: 3 },
};

/** @param {number} startTimeSec @param {number} internalStage */
export function timeLimitForStage(startTimeSec, internalStage) {
  const stage = Math.max(1, Math.floor(internalStage));
  return Math.max(MIN_QUESTION_TIME_SEC, startTimeSec - (stage - 1) * TIME_DECREASE_PER_STAGE);
}

/** @param {number} successCount */
export function internalStageFromSuccesses(successCount) {
  return Math.floor(Math.max(0, successCount) / CORRECT_PER_STAGE_UP) + 1;
}

/** @param {number} timeLeftSec @param {number} timeLimitSec */
export function calcTimeBonus(timeLeftSec, timeLimitSec) {
  if (timeLimitSec <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, timeLeftSec / timeLimitSec));
  return Math.round(SCORE_TIME_BONUS_MAX * ratio);
}

/** @param {DifficultyId} difficulty */
export function getContinuousDifficulty(difficulty) {
  return CONTINUOUS_DIFFICULTY[difficulty] || CONTINUOUS_DIFFICULTY.medium;
}
