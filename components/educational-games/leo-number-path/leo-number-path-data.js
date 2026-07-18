/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */
/** @typedef {'even' | 'odd' | 'multiples' | 'skip' | 'sequence'} PathRule */

import {
  createMathTask,
  pickBalancedSession,
  randInt,
  shuffledCopy,
} from "../../../lib/educational-games/math-task-schema.js";
import {
  MAX_MISTAKES_BY_DIFFICULTY,
  TASKS_PER_SESSION,
} from "../../../lib/educational-games/educational-session-standard.js";

/**
 * @typedef {{
 *   id: string
 *   gameKey: 'leo-number-path'
 *   difficulty: DifficultyId
 *   skillId: string
 *   variant: PathRule
 *   operands: Record<string, unknown>
 *   expectedAnswer: number[]
 *   representationType: string
 *   rule: PathRule
 *   step?: number
 *   multiple?: number
 *   numbers: number[]
 *   correctPath: number[]
 *   orderMatters: boolean
 *   promptHe: string
 * }} PathTask
 */

export { TASKS_PER_SESSION };

export const DIFFICULTIES = {
  easy: { id: "easy", label: "קל", maxMistakes: MAX_MISTAKES_BY_DIFFICULTY.easy },
  medium: { id: "medium", label: "בינוני", maxMistakes: MAX_MISTAKES_BY_DIFFICULTY.medium },
  hard: { id: "hard", label: "קשה", maxMistakes: MAX_MISTAKES_BY_DIFFICULTY.hard },
};

export const SCORE = { first: 30, second: 20, third: 10 };

/** @param {DifficultyId} difficulty */
function levelCfg(difficulty) {
  if (difficulty === "easy") {
    return { maxNum: 50, multiples: [2, 5, 10], skipSteps: [2, 5, 10], allowBackward: false, geo: false };
  }
  if (difficulty === "medium") {
    return { maxNum: 100, multiples: [3, 4, 5, 6, 7, 8, 9], skipSteps: [3, 4, 6, 7], allowBackward: true, geo: false };
  }
  return {
    maxNum: 144,
    multiples: [6, 7, 8, 9, 10, 11, 12],
    skipSteps: [4, 5, 6, 7, 8, 9],
    allowBackward: true,
    geo: true,
  };
}

/** @param {DifficultyId} difficulty */
function pathQuotas(difficulty) {
  if (difficulty === "easy") {
    return {
      "numbers.even": 5,
      "numbers.odd": 5,
      "numbers.multiples": 4,
      "numbers.skip_counting": 4,
      "numbers.arithmetic_sequence": 2,
    };
  }
  if (difficulty === "medium") {
    return {
      "numbers.even": 2,
      "numbers.odd": 2,
      "numbers.multiples": 6,
      "numbers.skip_counting": 5,
      "numbers.arithmetic_sequence": 5,
    };
  }
  return {
    "numbers.multiples": 5,
    "numbers.skip_counting": 5,
    "numbers.arithmetic_sequence": 5,
    "numbers.geometric_sequence": 3,
    "numbers.even": 1,
    "numbers.odd": 1,
  };
}

/** @param {number[]} correctSet @param {number} count @param {number} max @param {(n: number) => boolean} isForbidden */
function distractorsWhere(correctSet, count, max, isForbidden) {
  const forbidden = new Set(correctSet);
  /** @type {number[]} */
  const out = [];
  let guard = 0;
  while (out.length < count && guard < 500) {
    guard += 1;
    const n = randInt(1, max);
    if (forbidden.has(n) || out.includes(n) || isForbidden(n)) continue;
    out.push(n);
  }
  return out;
}

/**
 * @param {DifficultyId} difficulty
 * @param {ReturnType<typeof levelCfg>} cfg
 * @param {number} guard
 * @param {boolean} isEven
 */
function buildParityTask(difficulty, cfg, guard, isEven) {
  const max = cfg.maxNum;
  const span = randInt(10, 16);
  const start = randInt(1, Math.max(1, max - span));
  const nums = [];
  for (let i = 0; i < span; i += 1) nums.push(start + i);
  const wrongParity = (n) => (isEven ? n % 2 !== 0 : n % 2 === 0);
  const inSpan = new Set(nums);
  const extra = distractorsWhere(nums, randInt(3, 5), max, (n) => wrongParity(n) || inSpan.has(n));
  let numbers = shuffledCopy([...nums, ...extra]).slice(0, 16);
  // Avoid fixed layout: reshuffle positions
  numbers = shuffledCopy(numbers);
  const correct = numbers.filter((n) => !wrongParity(n)).sort((a, b) => a - b);
  if (correct.length < 3) return null;

  const rule = isEven ? "even" : "odd";
  return {
    ...createMathTask({
      id: `p-${difficulty}-parity-${guard}`,
      gameKey: "leo-number-path",
      difficulty,
      skillId: isEven ? "numbers.even" : "numbers.odd",
      variant: rule,
      operands: { rule, boardSize: numbers.length },
      expectedAnswer: correct,
      representationType: "number_grid",
    }),
    rule,
    numbers,
    correctPath: correct,
    orderMatters: false,
    promptHe: isEven
      ? "בחרו את כל המספרים הזוגיים על המסלול"
      : "בחרו את כל המספרים האי־זוגיים על המסלול",
  };
}

/**
 * @param {DifficultyId} difficulty
 * @param {ReturnType<typeof levelCfg>} cfg
 * @param {number} guard
 */
function buildSkipTask(difficulty, cfg, guard) {
  const step = cfg.skipSteps[guard % cfg.skipSteps.length];
  const backward = cfg.allowBackward && guard % 3 === 0;
  const len = randInt(4, 6);
  /** @type {number[]} */
  const correct = [];
  if (backward) {
    const start = randInt(step * len, cfg.maxNum);
    for (let i = 0; i < len; i += 1) correct.push(start - i * step);
  } else {
    const start = randInt(1, step + 4);
    for (let i = 0; i < len; i += 1) correct.push(start + i * step);
  }
  if (correct.some((n) => n < 1 || n > cfg.maxNum)) return null;

  const correctSet = new Set(correct);
  const nearStep = (n) => {
    if (correctSet.has(n)) return true;
    return correct.some((c) => Math.abs(c - n) === step);
  };
  const numbers = shuffledCopy([
    ...correct,
    ...distractorsWhere(correct, randInt(5, 8), cfg.maxNum, nearStep),
  ]).slice(0, 18);

  const start = correct[0];
  const directionHe = backward ? "אחורה" : "קדימה";

  return {
    ...createMathTask({
      id: `p-${difficulty}-skip-${guard}`,
      gameKey: "leo-number-path",
      difficulty,
      skillId: "numbers.skip_counting",
      variant: "skip",
      operands: { start, step, direction: backward ? "backward" : "forward", length: len },
      expectedAnswer: correct,
      representationType: "number_grid",
    }),
    rule: "skip",
    step,
    numbers,
    correctPath: correct,
    orderMatters: true,
    promptHe: `התחילו מ-${start} וקפצו ${directionHe} ב־${step}. בחרו את המסלול לפי הסדר.`,
  };
}

/**
 * @param {DifficultyId} difficulty
 * @param {ReturnType<typeof levelCfg>} cfg
 * @param {number} guard
 */
function buildMultiplesTask(difficulty, cfg, guard) {
  const multiple = cfg.multiples[guard % cfg.multiples.length];
  const max = cfg.maxNum;
  /** @type {number[]} */
  const allMultiples = [];
  for (let n = multiple; n <= max; n += multiple) allMultiples.push(n);
  if (allMultiples.length < 3) return null;

  const onBoardCount = randInt(3, Math.min(7, allMultiples.length));
  const startIdx = randInt(0, Math.max(0, allMultiples.length - onBoardCount));
  const seedMultiples = allMultiples.slice(startIdx, startIdx + onBoardCount);
  const isMultiple = (n) => n % multiple === 0;
  const numbers = shuffledCopy([
    ...seedMultiples,
    ...distractorsWhere(seedMultiples, randInt(5, 9), max, isMultiple),
  ]).slice(0, 18);
  const correctOnBoard = numbers.filter(isMultiple).sort((a, b) => a - b);
  if (correctOnBoard.length < 3) return null;

  return {
    ...createMathTask({
      id: `p-${difficulty}-mult-${guard}`,
      gameKey: "leo-number-path",
      difficulty,
      skillId: "numbers.multiples",
      variant: "multiples",
      operands: { multiple },
      expectedAnswer: correctOnBoard,
      representationType: "number_grid",
    }),
    rule: "multiples",
    multiple,
    numbers,
    correctPath: correctOnBoard,
    orderMatters: false,
    promptHe: `בחרו את כל הכפולות של ${multiple} על המסלול`,
  };
}

/**
 * @param {DifficultyId} difficulty
 * @param {ReturnType<typeof levelCfg>} cfg
 * @param {number} guard
 * @param {boolean} geometric
 */
function buildSequenceTask(difficulty, cfg, guard, geometric) {
  if (geometric) {
    const ratio = randInt(2, 3);
    const start = randInt(2, 5);
    const correctSeq = [start];
    for (let i = 1; i < 4; i += 1) correctSeq.push(correctSeq[i - 1] * ratio);
    if (correctSeq[correctSeq.length - 1] > cfg.maxNum) return null;
    const seqSet = new Set(correctSeq);
    const fitsRatio = (n) => {
      if (seqSet.has(n)) return true;
      return correctSeq.some((c) => c * ratio === n || (n * ratio === c && Number.isInteger(n)));
    };
    const numbers = shuffledCopy([
      ...correctSeq,
      ...distractorsWhere(correctSeq, randInt(5, 7), cfg.maxNum, fitsRatio),
    ]);
    return {
      ...createMathTask({
        id: `p-${difficulty}-geo-${guard}`,
        gameKey: "leo-number-path",
        difficulty,
        skillId: "numbers.geometric_sequence",
        variant: "sequence",
        operands: { kind: "geometric", start, ratio, shown: correctSeq.slice(0, 2) },
        expectedAnswer: correctSeq,
        representationType: "number_grid",
      }),
      rule: "sequence",
      numbers,
      correctPath: correctSeq,
      orderMatters: true,
      promptHe: `סדרת כפל: מתחילים ב־${start}, כל פעם כפול ${ratio}. בחרו את המסלול לפי הסדר.`,
    };
  }

  const step = difficulty === "easy" ? randInt(2, 5) : randInt(3, 9);
  const descending = cfg.allowBackward && guard % 4 === 0;
  const len = 5;
  /** @type {number[]} */
  const correctSeq = [];
  if (descending) {
    const start = randInt(step * len + 5, cfg.maxNum);
    for (let i = 0; i < len; i += 1) correctSeq.push(start - i * step);
  } else {
    const start = randInt(1, 12);
    for (let i = 0; i < len; i += 1) correctSeq.push(start + i * step);
  }
  if (correctSeq.some((n) => n < 1 || n > cfg.maxNum)) return null;

  const missingMiddle = difficulty !== "easy" && guard % 2 === 0;
  const shown = missingMiddle
    ? [correctSeq[0], "?", correctSeq[2], "?", correctSeq[4]]
    : [correctSeq[0], correctSeq[1], "?"];

  const seqSet = new Set(correctSeq);
  const near = (n) => seqSet.has(n) || correctSeq.some((c) => Math.abs(c - n) === step);
  const numbers = shuffledCopy([
    ...correctSeq,
    ...distractorsWhere(correctSeq, randInt(5, 7), cfg.maxNum, near),
  ]);

  const clue = missingMiddle
    ? `השלימו את הסדרה: ${shown.join(" , ")} (קפיצה קבועה)`
    : `סדרה חשבונית: מתחילים ב־${correctSeq[0]}, מוסיפים ${descending ? "מינוס " : ""}${step} בכל פעם. בחרו את כל האיברים לפי הסדר.`;

  return {
    ...createMathTask({
      id: `p-${difficulty}-arith-${guard}`,
      gameKey: "leo-number-path",
      difficulty,
      skillId: "numbers.arithmetic_sequence",
      variant: "sequence",
      operands: {
        kind: "arithmetic",
        start: correctSeq[0],
        step: descending ? -step : step,
        missingMiddle,
      },
      expectedAnswer: correctSeq,
      representationType: "number_grid",
    }),
    rule: "sequence",
    numbers,
    correctPath: correctSeq,
    orderMatters: true,
    promptHe: clue,
  };
}

/**
 * @param {DifficultyId} difficulty
 * @param {{ salt?: number }} [opts]
 */
export function generatePathPool(difficulty, opts = {}) {
  const cfg = levelCfg(difficulty);
  const salt = opts.salt ?? 0;
  /** @type {PathTask[]} */
  const pool = [];
  const seen = new Set();
  let guard = 0;

  while (pool.length < 120 && guard < 2500) {
    guard += 1;
    const roll = (guard + salt) % 10;
    /** @type {PathTask|null} */
    let task = null;
    if (roll < 2) task = buildParityTask(difficulty, cfg, guard, true);
    else if (roll < 4) task = buildParityTask(difficulty, cfg, guard, false);
    else if (roll < 6) task = buildMultiplesTask(difficulty, cfg, guard);
    else if (roll < 8) task = buildSkipTask(difficulty, cfg, guard);
    else task = buildSequenceTask(difficulty, cfg, guard, cfg.geo && roll === 9);

    if (!task) continue;
    const key = pathTaskKey(task);
    if (seen.has(key)) continue;
    seen.add(key);
    task.id = `p-${difficulty}-${pool.length}`;
    pool.push(task);
  }
  return shuffledCopy(pool);
}

/** @param {PathTask} task */
export function pathTaskKey(task) {
  const board = [...task.numbers].sort((a, b) => a - b).join(",");
  const meta = task.step ?? task.multiple ?? "";
  return `${task.rule}-${meta}-${task.correctPath.join(",")}-${board}`;
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
  return ok ? "מעולה! בחרתם מסלול נכון." : "כמעט! בדקו שוב את הכלל ואת הסדר.";
}

/** @param {PathTask} task */
export function pathSolutionText(task) {
  const path = task.orderMatters ? task.correctPath.join(" → ") : task.correctPath.join(" · ");
  return `המסלול הנכון: ${path}`;
}

/** @param {number[]} selected @param {boolean} orderMatters */
export function formatSelectedPath(selected, orderMatters) {
  if (!selected.length) return "-";
  return orderMatters ? selected.join(" → ") : selected.join(" · ");
}

/** @param {number} successfulTasks @param {number} total @param {number} mistakes @param {number} maxMistakes */
export function isNumberPathWin(successfulTasks, total, mistakes, maxMistakes) {
  return successfulTasks >= total && mistakes < maxMistakes;
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

export function findDistractorFalseNegatives(tasks) {
  /** @type {{ id: string, rule: string, number: number }[]} */
  const issues = [];
  for (const task of tasks) {
    const shouldMatch = matchingNumbersOnBoard(task);
    for (const n of shouldMatch) {
      if (!task.correctPath.includes(n) && (task.rule === "even" || task.rule === "odd" || task.rule === "multiples")) {
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
  if (task.rule === "even" || task.rule === "odd") score = 10 + task.correctPath.length;
  else if (task.rule === "skip") score = 35 + (task.step ?? 0);
  else if (task.rule === "multiples") score = 50 + (task.multiple ?? 0);
  else if (task.rule === "sequence") score = 70 + maxOnBoard * 0.02;
  return score;
}

/**
 * @param {DifficultyId} difficulty
 * @param {number} [count]
 */
export function buildOrderedSessionRun(difficulty, count = TASKS_PER_SESSION) {
  const salt = Math.floor(Math.random() * 10000);
  const pool = generatePathPool(difficulty, { salt });

  /** @type {Record<string, PathTask[]>} */
  const pools = {};
  for (const task of pool) {
    const sid = task.skillId;
    if (!pools[sid]) pools[sid] = [];
    pools[sid].push(task);
  }

  let run = pickBalancedSession(pools, pathQuotas(difficulty), pathTaskKey, count);

  const used = new Set(run.map(pathTaskKey));
  while (run.length < count) {
    let added = false;
    for (const task of shuffledCopy(pool)) {
      if (run.length >= count) break;
      const key = pathTaskKey(task);
      if (used.has(key)) continue;
      used.add(key);
      run.push(task);
      added = true;
    }
    if (!added) break;
  }

  const mid = Math.floor(run.length / 2);
  run = [
    ...run.slice(0, mid).sort((a, b) => taskDifficultyScore(a) - taskDifficultyScore(b)),
    ...run.slice(mid).sort((a, b) => taskDifficultyScore(a) - taskDifficultyScore(b)),
  ];

  return run.slice(0, count).map((task, i) => ({ ...task, id: `p-${difficulty}-run-${i}` }));
}

/** @param {PathTask[]} run */
export function sessionRunIsAscending(run) {
  if (run.length < 6) return true;
  const scores = run.map(taskDifficultyScore);
  const openAvg = scores.slice(0, 5).reduce((s, v) => s + v, 0) / 5;
  const finalAvg = scores.slice(-5).reduce((s, v) => s + v, 0) / 5;
  return openAvg <= finalAvg + 5;
}
