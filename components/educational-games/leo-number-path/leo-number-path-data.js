/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */
/** @typedef {'even' | 'odd' | 'multiples' | 'skip' | 'sequence'} PathRule */

import { PRODUCTION_MIN_POOL, shuffle } from "../../../lib/educational-games/educational-task-picker.js";

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

export const TASKS_PER_SESSION = 12;

export const DIFFICULTIES = {
  easy: { id: "easy", label: "קל", maxMistakes: 6 },
  medium: { id: "medium", label: "בינוני", maxMistakes: 5 },
  hard: { id: "hard", label: "קשה", maxMistakes: 4 },
};

export const SCORE = {
  first: 30,
  second: 20,
  third: 10,
};

/** @type {Record<DifficultyId, { maxNum: number, multiples: number[], skipSteps: number[] }>} */
const LEVEL = {
  easy: { maxNum: 40, multiples: [], skipSteps: [2, 5, 10] },
  medium: { maxNum: 80, multiples: [3, 4, 5, 6, 7], skipSteps: [7, 8] },
  hard: { maxNum: 120, multiples: [8, 9, 10, 11, 12], skipSteps: [9, 11] },
};

/** @param {number} min @param {number} max */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** @param {number[]} correctSet @param {number} count @param {number} max @param {(n: number) => boolean} isForbidden */
function distractorsWhere(correctSet, count, max, isForbidden) {
  const forbidden = new Set(correctSet);
  /** @type {number[]} */
  const out = [];
  let guard = 0;
  while (out.length < count && guard < 400) {
    guard += 1;
    const n = randInt(1, max);
    if (forbidden.has(n) || out.includes(n) || isForbidden(n)) continue;
    out.push(n);
  }
  return out;
}

/** @param {PathTask} task */
export function matchingNumbersOnBoard(task) {
  if (task.rule === "even") return task.numbers.filter((n) => n % 2 === 0);
  if (task.rule === "odd") return task.numbers.filter((n) => n % 2 === 1);
  if (task.rule === "multiples" && task.multiple) {
    return task.numbers.filter((n) => n % task.multiple === 0);
  }
  return [...task.correctPath];
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

  while (pool.length < PRODUCTION_MIN_POOL + 10 && guard < 1200) {
    guard += 1;
    const kindRoll = (guard + salt) % 6;

    if (difficulty === "easy" || (difficulty === "medium" && kindRoll < 2)) {
      const isEven = kindRoll % 2 === 0;
      const max = cfg.maxNum;
      const span = randInt(10, 16);
      const start = randInt(1, Math.max(1, max - span));
      const nums = [];
      for (let i = 0; i < span; i += 1) nums.push(start + i);
      const wrongParity = (n) => (isEven ? n % 2 !== 0 : n % 2 === 0);
      const inSpan = new Set(nums);
      const extra = distractorsWhere(nums, randInt(2, 4), max, (n) => wrongParity(n) || inSpan.has(n));
      const numbers = shuffle([...nums, ...extra]).slice(0, 16);
      const correct = numbers.filter((n) => !wrongParity(n));
      const key = `eo-${isEven ? "e" : "o"}-${numbers.join(",")}`;
      if (seen.has(key) || correct.length < 3) continue;
      seen.add(key);
      pool.push({
        id: `p-${difficulty}-${pool.length}`,
        rule: isEven ? "even" : "odd",
        numbers: shuffle(numbers),
        correctPath: correct.sort((a, b) => a - b),
        orderMatters: false,
        promptHe: isEven ? "בחרו את כל המספרים הזוגיים על המסלול" : "בחרו את כל המספרים האי־זוגיים על המסלול",
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
      const correctSet = new Set(correct);
      const isSeqLike = (n) => {
        if (correctSet.has(n)) return true;
        if (correct.includes(n - step) || correct.includes(n + step)) return true;
        if (correct.some((c) => c !== n && Math.abs(c - n) === step)) return true;
        return false;
      };
      const numbers = shuffle([
        ...correct,
        ...distractorsWhere(correct, randInt(4, 7), cfg.maxNum, isSeqLike),
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
        promptHe: `בחרו לפי הסדר: ${correct.slice(0, 4).join(" → ")}${correct.length > 4 ? "…" : ""}`,
      });
      continue;
    }

    const mults = cfg.multiples.length ? cfg.multiples : [2, 3];
    const multiple = mults[guard % mults.length];
    const max = cfg.maxNum;
    const targetLen = randInt(4, 8);
    /** @type {number[]} */
    const correct = [];
    for (let n = multiple; n <= max && correct.length < targetLen; n += multiple) {
      correct.push(n);
    }
    if (correct.length < 3) continue;
    const isMultiple = (n) => n % multiple === 0;
    const numbers = shuffle([
      ...correct,
      ...distractorsWhere(correct, randInt(5, 9), max, isMultiple),
    ]).slice(0, 18);
    const correctOnBoard = numbers.filter(isMultiple);
    const key = `m-${multiple}-${numbers.join(",")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push({
      id: `p-${difficulty}-${pool.length}`,
      rule: "multiples",
      multiple,
      numbers,
      correctPath: correctOnBoard.sort((a, b) => a - b),
      orderMatters: false,
      promptHe: `בחרו את כל הכפולות של ${multiple} על המסלול`,
    });

    if (difficulty === "hard" && guard % 4 === 0) {
      const ratio = randInt(2, 4);
      const start = randInt(2, 6);
      const correctSeq = [start];
      for (let i = 1; i < 5; i += 1) correctSeq.push(correctSeq[i - 1] * ratio);
      if (correctSeq[correctSeq.length - 1] > cfg.maxNum) continue;
      const seqSet = new Set(correctSeq);
      const fitsRatio = (n) => {
        if (seqSet.has(n)) return true;
        for (const c of correctSeq) {
          if (Number.isInteger(c * ratio) && c * ratio === n) return true;
          if (Number.isInteger(n * ratio) && n * ratio === c) return true;
        }
        return false;
      };
      const numbersSeq = shuffle([
        ...correctSeq,
        ...distractorsWhere(correctSeq, randInt(4, 6), cfg.maxNum, fitsRatio),
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
          promptHe: `המשיכו לפי הסדר: ${correctSeq.slice(0, 3).join(" → ")} → ?`,
        });
      }
    }
  }

  return shuffle(pool);
}

/** @param {PathTask} task */
export function pathTaskKey(task) {
  return `${task.rule}-${task.promptHe}-${task.correctPath.join(",")}`;
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
  if (!selected.length) return "—";
  return orderMatters ? selected.join(" → ") : selected.join(" · ");
}

/** @param {number} successfulTasks @param {number} total @param {number} mistakes @param {number} maxMistakes */
export function isNumberPathWin(successfulTasks, total, mistakes, maxMistakes) {
  return successfulTasks >= total && mistakes < maxMistakes;
}

/** Returns tasks where a board number matches the rule but is not in correctPath. */
export function findDistractorFalseNegatives(tasks) {
  /** @type {{ id: string, rule: string, number: number }[]} */
  const issues = [];
  for (const task of tasks) {
    const shouldMatch = matchingNumbersOnBoard(task);
    for (const n of shouldMatch) {
      if (!task.correctPath.includes(n)) {
        issues.push({ id: task.id, rule: task.rule, number: n });
      }
    }
  }
  return issues;
}

/** @param {PathTask} task */
export function taskDifficultyScore(task) {
  let score = 0;
  const maxOnBoard = Math.max(...task.numbers, 0);
  if (task.rule === "even" || task.rule === "odd") {
    score = 10 + task.correctPath.length + maxOnBoard * 0.05;
  } else if (task.rule === "skip") {
    score = 35 + task.correctPath.length * 2 + (task.step ?? 0);
  } else if (task.rule === "multiples") {
    score = 50 + task.correctPath.length * 2 + (task.multiple ?? 0);
  } else if (task.rule === "sequence") {
    score = 75 + task.correctPath.length * 3 + maxOnBoard * 0.03;
  }
  return score;
}

/**
 * @param {DifficultyId} difficulty
 * @param {number} [count]
 */
export function buildOrderedSessionRun(difficulty, count = TASKS_PER_SESSION) {
  const pool = generatePathPool(difficulty, { salt: 0 });
  const sorted = [...pool].sort((a, b) => taskDifficultyScore(a) - taskDifficultyScore(b));
  const bandSize = Math.max(1, Math.floor(count / 3));
  const third = Math.max(bandSize, Math.floor(sorted.length / 3));
  const easyBand = sorted.slice(0, third);
  const midBand = sorted.slice(third, third * 2);
  const hardBand = sorted.slice(third * 2);
  const used = new Set();
  let lastKey = null;

  /** @param {PathTask[]} band @param {number} n */
  function pickFrom(band, n) {
    /** @type {PathTask[]} */
    const out = [];
    for (const task of shuffle(band)) {
      if (out.length >= n) break;
      const key = pathTaskKey(task);
      if (used.has(key) || key === lastKey) continue;
      used.add(key);
      lastKey = key;
      out.push(task);
    }
    return out;
  }

  const run = [
    ...pickFrom(easyBand, bandSize),
    ...pickFrom(midBand, bandSize),
    ...pickFrom(hardBand, count - bandSize * 2),
  ];

  while (run.length < count) {
    for (const task of shuffle(sorted)) {
      if (run.length >= count) break;
      const key = pathTaskKey(task);
      if (used.has(key)) continue;
      used.add(key);
      run.push(task);
    }
    break;
  }

  return run.slice(0, count);
}

/** @param {PathTask[]} run */
export function sessionRunIsAscending(run) {
  if (run.length < 2) return true;
  const scores = run.map(taskDifficultyScore);
  for (let band = 0; band < 3; band += 1) {
    const start = band * 4;
    const end = Math.min(start + 4, scores.length);
    if (end <= start) continue;
    const slice = scores.slice(start, end);
    const nextStart = start + 4;
    const nextEnd = Math.min(nextStart + 4, scores.length);
    if (nextEnd <= nextStart) continue;
    const nextSlice = scores.slice(nextStart, nextEnd);
    const avg = slice.reduce((s, v) => s + v, 0) / slice.length;
    const nextAvg = nextSlice.reduce((s, v) => s + v, 0) / nextSlice.length;
    if (avg > nextAvg + 0.01) return false;
  }
  return true;
}
