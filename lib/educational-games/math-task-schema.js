/**
 * Shared in-memory math task schema for educational math games.
 * Intentionally NOT sent to the server / engine / parent reports.
 */

/** @typedef {'easy'|'medium'|'hard'} MathDifficultyId */

/**
 * @typedef {'math_wrong'|'timeout'|'ui_misclick'|'drag_misdrop'|'incomplete_selection'|'correct'} MathOutcomeType
 */

/**
 * @typedef {{
 *   id: string,
 *   gameKey: string,
 *   difficulty: MathDifficultyId,
 *   skillId: string,
 *   variant: string,
 *   operands: Record<string, unknown>,
 *   expectedAnswer: unknown,
 *   representationType: string,
 * }} MathTaskCore
 */

/**
 * @typedef {{
 *   taskId: string,
 *   submittedAnswer: unknown,
 *   attemptNumber: number,
 *   isCorrect: boolean,
 *   outcomeType: MathOutcomeType,
 * }} MathAttemptResult
 */

export const MATH_OUTCOME_TYPES = Object.freeze([
  "math_wrong",
  "timeout",
  "ui_misclick",
  "drag_misdrop",
  "incomplete_selection",
  "correct",
]);

export const MAX_ATTEMPTS_BEFORE_REVEAL = 3;

/**
 * @param {Partial<MathTaskCore> & Pick<MathTaskCore, 'id'|'gameKey'|'difficulty'|'skillId'|'variant'|'expectedAnswer'>} fields
 * @returns {MathTaskCore}
 */
export function createMathTask(fields) {
  return {
    id: String(fields.id),
    gameKey: String(fields.gameKey),
    difficulty: /** @type {MathDifficultyId} */ (fields.difficulty),
    skillId: String(fields.skillId),
    variant: String(fields.variant),
    operands: fields.operands && typeof fields.operands === "object" ? { ...fields.operands } : {},
    expectedAnswer: fields.expectedAnswer,
    representationType: String(fields.representationType || "numeric"),
  };
}

/**
 * @param {Partial<MathAttemptResult> & Pick<MathAttemptResult, 'taskId'|'submittedAnswer'|'attemptNumber'|'isCorrect'|'outcomeType'>} fields
 * @returns {MathAttemptResult}
 */
export function createMathAttemptResult(fields) {
  return {
    taskId: String(fields.taskId),
    submittedAnswer: fields.submittedAnswer,
    attemptNumber: Math.max(1, Math.floor(Number(fields.attemptNumber) || 1)),
    isCorrect: fields.isCorrect === true,
    outcomeType: /** @type {MathOutcomeType} */ (fields.outcomeType),
  };
}

/**
 * @param {Array<{ skillId?: string, variant?: string, id?: string }>} tasks
 * @param {string} [keyFn]
 */
export function assertNoDuplicateTaskKeys(tasks, keyFn) {
  const seen = new Set();
  for (const task of tasks) {
    const key =
      typeof keyFn === "function"
        ? keyFn(task)
        : `${task.skillId}|${task.variant}|${JSON.stringify(task.operands ?? task)}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate task key in session: ${key}`);
    }
    seen.add(key);
  }
}

/**
 * @param {Array<{ skillId: string }>} tasks
 * @returns {Record<string, number>}
 */
export function skillDistribution(tasks) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const task of tasks) {
    const id = task.skillId || "unknown";
    counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

/**
 * Balanced pick: take from pools in round-robin / quota fashion.
 * @template T
 * @param {Record<string, T[]>} poolsBySkill
 * @param {Record<string, number>} quotas
 * @param {(item: T) => string} uniqueKeyFn
 * @param {number} count
 * @returns {T[]}
 */
export function pickBalancedSession(poolsBySkill, quotas, uniqueKeyFn, count) {
  /** @type {T[]} */
  const out = [];
  const used = new Set();
  /** @type {Record<string, number>} */
  const taken = {};

  const skills = Object.keys(quotas);
  for (const skill of skills) taken[skill] = 0;

  let guard = 0;
  while (out.length < count && guard < count * 40) {
    guard += 1;
    let progressed = false;
    for (const skill of skills) {
      if (out.length >= count) break;
      if ((taken[skill] || 0) >= (quotas[skill] || 0)) continue;
      const pool = poolsBySkill[skill] || [];
      const candidate = pool.find((item) => !used.has(uniqueKeyFn(item)));
      if (!candidate) continue;
      used.add(uniqueKeyFn(candidate));
      taken[skill] = (taken[skill] || 0) + 1;
      out.push(candidate);
      progressed = true;
    }
    if (!progressed) break;
  }

  if (out.length < count) {
    const leftovers = Object.values(poolsBySkill)
      .flat()
      .filter((item) => !used.has(uniqueKeyFn(item)));
    for (const item of leftovers) {
      if (out.length >= count) break;
      used.add(uniqueKeyFn(item));
      out.push(item);
    }
  }

  return out.slice(0, count);
}

/** @param {number} min @param {number} max */
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** @template T @param {T[]} arr */
export function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** @template T @param {T[]} arr */
export function shuffledCopy(arr) {
  return shuffleInPlace([...arr]);
}
