import {
  generatePathPool,
  findDistractorFalseNegatives,
  matchingNumbersOnBoard,
  buildOrderedSessionRun,
  sessionRunIsAscending,
  pathTaskKey,
  TASKS_PER_SESSION,
} from "../../components/educational-games/leo-number-path/leo-number-path-data.js";
import { PRODUCTION_MIN_POOL } from "../educational-games/educational-task-picker.js";

let failed = 0;

/** @param {string} difficulty @param {Record<string, number>} rules */
function minRules(difficulty, rules) {
  if (difficulty === "easy") {
    return { even: 1, odd: 1, skip: 1, multiples: 1 };
  }
  if (difficulty === "medium") {
    return { skip: 1, multiples: 1, even: 1, odd: 1 };
  }
  return { multiples: 1, skip: 1, sequence: 1 };
}

for (const difficulty of ["easy", "medium", "hard"]) {
  for (let salt = 0; salt < 20; salt += 1) {
    const pool = generatePathPool(difficulty, { salt });
    const issues = findDistractorFalseNegatives(pool);
    if (issues.length > 0) {
      failed += 1;
      console.error(`FAIL ${difficulty} salt=${salt}:`, issues.slice(0, 3));
    }
    for (const task of pool) {
      if (task.rule === "even" || task.rule === "odd" || task.rule === "multiples") {
        const expected = matchingNumbersOnBoard(task);
        const a = [...expected].sort((x, y) => x - y);
        const b = [...task.correctPath].sort((x, y) => x - y);
        if (a.length !== b.length || a.some((n, i) => n !== b[i])) {
          failed += 1;
          console.error(`FAIL align ${task.id} ${task.rule}`);
        }
      }
    }

    const unique = new Set(pool.map(pathTaskKey)).size;
    if (pool.length < PRODUCTION_MIN_POOL + 10) {
      failed += 1;
      console.error(`FAIL pool size ${difficulty} salt=${salt}: ${pool.length}`);
    }
    if (unique < pool.length) {
      failed += 1;
      console.error(`FAIL pool dupes ${difficulty} salt=${salt}: ${pool.length - unique}`);
    }
  }

  const pool0 = generatePathPool(difficulty, { salt: 0 });
  const ruleCounts = {};
  for (const task of pool0) {
    ruleCounts[task.rule] = (ruleCounts[task.rule] || 0) + 1;
  }
  for (const [rule, min] of Object.entries(minRules(difficulty, ruleCounts))) {
    if ((ruleCounts[rule] || 0) < min) {
      failed += 1;
      console.error(`FAIL rule mix ${difficulty}: ${rule}=${ruleCounts[rule] || 0}`);
    }
  }

  const run = buildOrderedSessionRun(difficulty);
  if (run.length !== TASKS_PER_SESSION) {
    failed += 1;
    console.error(`FAIL session length ${difficulty}: ${run.length}`);
  }
  if (!sessionRunIsAscending(run)) {
    failed += 1;
    console.error(`FAIL session order ${difficulty}`);
  }
  if (new Set(run.map(pathTaskKey)).size !== run.length) {
    failed += 1;
    console.error(`FAIL session dupes ${difficulty}`);
  }

  const sessions = Array.from({ length: 100 }, () => buildOrderedSessionRun(difficulty));
  const allKeys = sessions.flatMap((run) => run.map(pathTaskKey));
  const uniqueAcross = new Set(allKeys).size;
  const minExpected = difficulty === "hard" ? 80 : difficulty === "medium" ? 100 : 120;
  if (uniqueAcross < minExpected) {
    failed += 1;
    console.error(
      `FAIL cross-session variety ${difficulty}: ${uniqueAcross} unique / ${allKeys.length} total`,
    );
  }
}

if (failed > 0) {
  console.error(`leo-number-path distractor selftest: ${failed} failure(s)`);
  process.exit(1);
}

console.log("leo-number-path distractor selftest: OK");
