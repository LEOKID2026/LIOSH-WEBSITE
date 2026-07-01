import { LANGUAGE_SESSION_TASKS, shuffleLanguageTasks } from "./language-game-config.js";

/**
 * @typedef {{
 *   id: string,
 *   taskType?: string,
 *   type?: string,
 *   difficultyWeight?: number,
 *   correctAnswer?: string,
 *   solution?: Record<string, string>,
 * }} LanguageTaskLike
 */

/** @param {LanguageTaskLike} task */
export function languageTaskType(task) {
  return String(task.taskType || task.type || "unknown");
}

/** @param {LanguageTaskLike} task */
export function languageTaskAnswerKey(task) {
  if (task.correctAnswer) return String(task.correctAnswer).toLowerCase();
  const sol = task.solution || {};
  return Object.values(sol).join("|").toLowerCase();
}

/** @param {LanguageTaskLike} task */
export function languageTaskDifficultyWeight(task) {
  if (typeof task.difficultyWeight === "number") return task.difficultyWeight;
  return 50;
}

/**
 * @template T extends LanguageTaskLike
 * @param {T[]} pool
 * @param {number} [count]
 */
export function planLanguageSession(pool, count = LANGUAGE_SESSION_TASKS) {
  if (!pool.length) return [];

  const sorted = [...pool].sort(
    (a, b) => languageTaskDifficultyWeight(a) - languageTaskDifficultyWeight(b),
  );
  const third = Math.max(1, Math.floor(sorted.length / 3));
  const easyBand = sorted.slice(0, third);
  const midBand = sorted.slice(third, third * 2);
  const hardBand = sorted.slice(third * 2);

  const phases = [
    { band: easyBand, n: 5 },
    { band: midBand, n: 10 },
    { band: hardBand.length ? hardBand : midBand, n: Math.max(0, count - 15) },
  ];

  const usedIds = new Set();
  let lastAnswerKey = null;
  /** @type {string[]} */
  const recentTypes = [];
  /** @type {T[]} */
  const session = [];

  /** @param {T[]} band */
  function tryPick(band) {
    for (const task of shuffleLanguageTasks(band)) {
      if (usedIds.has(task.id)) continue;
      const type = languageTaskType(task);
      const answerKey = languageTaskAnswerKey(task);
      if (lastAnswerKey && answerKey === lastAnswerKey) continue;
      if (recentTypes.length >= 2 && recentTypes.slice(-2).every((t) => t === type)) continue;
      usedIds.add(task.id);
      lastAnswerKey = answerKey;
      recentTypes.push(type);
      if (recentTypes.length > 3) recentTypes.shift();
      return task;
    }
    return null;
  }

  for (const phase of phases) {
    let picked = 0;
    let attempts = 0;
    while (picked < phase.n && session.length < count && attempts < 150) {
      attempts += 1;
      let task = tryPick(phase.band);
      if (!task) task = tryPick(sorted);
      if (!task) break;
      session.push(task);
      picked += 1;
    }
  }

  let fillGuard = 0;
  while (session.length < count && fillGuard < 150) {
    fillGuard += 1;
    const task = tryPick(sorted);
    if (!task) break;
    session.push(task);
  }

  return session.slice(0, count);
}

/**
 * @template T extends LanguageTaskLike
 * @param {T[]} pool
 * @param {T} failedTask
 * @param {Set<string>} usedIds
 * @param {Set<string>} scheduledIds
 */
export function pickRemediationTask(pool, failedTask, usedIds, scheduledIds) {
  const type = languageTaskType(failedTask);
  const failedAnswer = languageTaskAnswerKey(failedTask);
  const candidates = shuffleLanguageTasks(
    pool.filter(
      (t) =>
        languageTaskType(t) === type &&
        t.id !== failedTask.id &&
        !usedIds.has(t.id) &&
        !scheduledIds.has(t.id) &&
        languageTaskAnswerKey(t) !== failedAnswer,
    ),
  );
  return candidates[0] ?? null;
}

/**
 * @template T
 * @param {T[]} tasks
 * @param {number} afterIndex
 * @param {T[]} toInsert
 */
export function insertTasksAfter(tasks, afterIndex, toInsert) {
  if (!toInsert.length) return tasks;
  const next = [...tasks];
  next.splice(afterIndex + 1, 0, ...toInsert);
  return next;
}
