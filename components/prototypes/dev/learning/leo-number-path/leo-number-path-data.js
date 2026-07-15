/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */
/** @typedef {'even' | 'odd' | 'multiples' | 'skip' | 'sequence'} PathRule */

import { MIN_POOL_SIZE, randInt, shuffle } from "../shared/task-session.js";

/** @typedef {{
 *   id: string
 *   rule: PathRule
 *   step?: number
 *   multiple?: number
 *   numbers: number[]
 *   correctPath: number[]
 *   orderMatters: boolean
 *   promptHe: string
 * }} PathTask */

/** @type {Record<DifficultyId, { maxNum: number, multiples: number[], skipSteps: number[] }>} */
const LEVEL = {
  easy: { maxNum: 40, multiples: [], skipSteps: [2, 5, 10] },
  medium: { maxNum: 80, multiples: [3, 4, 5, 6, 7], skipSteps: [7, 8] },
  hard: { maxNum: 120, multiples: [8, 9, 10, 11, 12], skipSteps: [9, 11] },
};

/** @param {number} n @param {number} count @param {number} max */
function distractorsAround(correctSet, count, max) {
  const correct = new Set(correctSet);
  const out = [];
  let guard = 0;
  while (out.length < count && guard < 200) {
    guard += 1;
    const n = randInt(1, max);
    if (correct.has(n) || out.includes(n)) continue;
    out.push(n);
  }
  return out;
}

/**
 * @param {DifficultyId} difficulty
 * @param {{ salt?: number }} [opts]
 */
export function generatePathPool(difficulty, opts = {}) {
  const cfg = LEVEL[difficulty];
  const salt = opts.salt ?? 0;
  const seen = new Set();
  /** @type {PathTask[]} */
  const pool = [];
  let guard = 0;

  while (pool.length < MIN_POOL_SIZE + 10 && guard < 1200) {
    guard += 1;
    const kindRoll = (guard + salt) % 6;

    if (difficulty === "easy" || (difficulty === "medium" && kindRoll < 2)) {
      const isEven = kindRoll % 2 === 0;
      const max = cfg.maxNum;
      const span = randInt(10, 16);
      const start = randInt(1, Math.max(1, max - span));
      const nums = [];
      for (let i = 0; i < span; i += 1) nums.push(start + i);
      const correct = nums.filter((n) => (isEven ? n % 2 === 0 : n % 2 === 1));
      const extra = distractorsAround(correct, randInt(2, 4), max).filter((n) => !nums.includes(n));
      const numbers = shuffle([...nums, ...extra]).slice(0, 16);
      const key = `eo-${isEven ? "e" : "o"}-${numbers.join(",")}`;
      if (seen.has(key) || correct.length < 3) continue;
      seen.add(key);
      pool.push({
        id: `p-${difficulty}-${pool.length}`,
        rule: isEven ? "even" : "odd",
        numbers: shuffle(numbers),
        correctPath: correct,
        orderMatters: false,
        promptHe: isEven ? "בחרו מספרים זוגיים" : "בחרו מספרים אי-זוגיים",
      });
      continue;
    }

    if (difficulty === "easy" || (difficulty === "medium" && kindRoll === 2)) {
      const step = cfg.skipSteps[guard % cfg.skipSteps.length];
      const start = randInt(1, step);
      const len = randInt(4, 6);
      const correct = [];
      for (let i = 0; i < len; i += 1) correct.push(start + i * step);
      if (correct[correct.length - 1] > cfg.maxNum) continue;
      const numbers = shuffle([
        ...correct,
        ...distractorsAround(correct, randInt(4, 7), cfg.maxNum),
      ]).slice(0, 18);
      const key = `sk-${step}-${start}-${len}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push({
        id: `p-${difficulty}-${pool.length}`,
        rule: "skip",
        step,
        numbers,
        correctPath: correct,
        orderMatters: true,
        promptHe: `קפצו במסלול: ${correct.slice(0, 4).join(" → ")}${correct.length > 4 ? "…" : ""}`,
      });
      continue;
    }

    const mults = cfg.multiples.length ? cfg.multiples : [2, 3];
    const multiple = mults[guard % mults.length];
    const max = cfg.maxNum;
    const correct = [];
    for (let n = multiple; n <= max; n += multiple) {
      if (correct.length >= randInt(4, 8)) break;
      correct.push(n);
    }
    if (correct.length < 3) continue;
    const numbers = shuffle([
      ...correct,
      ...distractorsAround(correct, randInt(5, 9), max),
    ]).slice(0, 18);
    const key = `m-${multiple}-${numbers.length}-${correct.length}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push({
      id: `p-${difficulty}-${pool.length}`,
      rule: "multiples",
      multiple,
      numbers,
      correctPath: correct,
      orderMatters: false,
      promptHe: `בחרו את כל הכפולות של ${multiple}`,
    });

    if (difficulty === "hard" && guard % 4 === 0) {
      const step = difficulty === "hard" ? randInt(2, 4) * 2 : 2;
      const start = randInt(2, 6);
      const correctSeq = [start];
      for (let i = 1; i < 5; i += 1) correctSeq.push(correctSeq[i - 1] * step);
      if (correctSeq[correctSeq.length - 1] > cfg.maxNum) continue;
      const numbersSeq = shuffle([
        ...correctSeq,
        ...distractorsAround(correctSeq, randInt(4, 6), cfg.maxNum),
      ]);
      const keySeq = `sq-${correctSeq.join("-")}`;
      if (!seen.has(keySeq)) {
        seen.add(keySeq);
        pool.push({
          id: `p-${difficulty}-seq-${pool.length}`,
          rule: "sequence",
          numbers: numbersSeq,
          correctPath: correctSeq,
          orderMatters: true,
          promptHe: `המשיכו את המסלול: ${correctSeq.slice(0, 3).join(" → ")} → ?`,
        });
      }
    }
  }

  return shuffle(pool);
}

/** @param {PathTask} task @param {number[]} selected */
export function validatePath(task, selected) {
  const expected = task.correctPath;
  if (task.orderMatters) {
    if (selected.length !== expected.length) return false;
    return selected.every((n, i) => n === expected[i]);
  }
  if (selected.length !== expected.length) return false;
  const a = [...selected].sort((x, y) => x - y);
  const b = [...expected].sort((x, y) => x - y);
  return a.every((n, i) => n === b[i]);
}

/** @param {boolean} ok */
export function pathFeedback(ok) {
  return ok ? "מעולה! בחרתם מסלול נכון." : "כמעט! בדקו את הקפיצות בין המספרים.";
}

/** @param {number[]} selected @param {boolean} orderMatters */
export function formatSelectedPath(selected, orderMatters) {
  if (!selected.length) return "-";
  return orderMatters ? selected.join(" → ") : selected.join(" · ");
}
