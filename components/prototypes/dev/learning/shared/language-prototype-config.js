/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

export const LANGUAGE_PROTOTYPE_TASKS = 10;

/** @type {Record<DifficultyId, { label: string, grade: string, maxMistakes: number, timeSec: number }>} */
export const LANGUAGE_PROTOTYPE_DIFFICULTIES = {
  easy: { label: "קל", grade: "א׳–ב׳", maxMistakes: 5, timeSec: 45 },
  medium: { label: "בינוני", grade: "ג׳–ד׳", maxMistakes: 4, timeSec: 40 },
  hard: { label: "קשה", grade: "ה׳–ו׳", maxMistakes: 3, timeSec: 35 },
};

export const LANGUAGE_PROTOTYPE_SCORE = {
  correct: 30,
  streak3: 15,
  streak5: 30,
  timeout: -5,
};

/** @template T @param {T[]} arr */
export function shuffleTasks(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
