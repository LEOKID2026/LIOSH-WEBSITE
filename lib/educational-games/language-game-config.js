/** @typedef {'easy' | 'medium' | 'hard'} LanguageDifficultyId */

export const LANGUAGE_SESSION_TASKS = 20;

/** @type {Record<LanguageDifficultyId, { label: string, grade: string, maxMistakes: number, timeSec: number }>} */
export const LANGUAGE_DIFFICULTIES = {
  easy: { label: "קל", grade: "א׳–ב׳", maxMistakes: 5, timeSec: 45 },
  medium: { label: "בינוני", grade: "ג׳–ד׳", maxMistakes: 4, timeSec: 40 },
  hard: { label: "קשה", grade: "ה׳–ו׳", maxMistakes: 3, timeSec: 35 },
};

/** Extra time for Hebrew hard tasks with a reading passage. */
export const LANGUAGE_HARD_PASSAGE_TIME_SEC = 45;

export const LANGUAGE_SCORE = {
  correct: 30,
  streak3: 15,
  streak5: 30,
  timeout: -5,
};

export const LANGUAGE_MIN_POOL_PER_LEVEL = 30;

/** @template T @param {T[]} arr */
export function shuffleLanguageTasks(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * @param {LanguageDifficultyId} difficulty
 * @param {{ hasPassage?: boolean, isHebrew?: boolean }} [opts]
 */
export function taskTimeLimitSec(difficulty, opts = {}) {
  const base = LANGUAGE_DIFFICULTIES[difficulty]?.timeSec ?? 45;
  if (opts.isHebrew && difficulty === "hard" && opts.hasPassage) {
    return LANGUAGE_HARD_PASSAGE_TIME_SEC;
  }
  return base;
}
