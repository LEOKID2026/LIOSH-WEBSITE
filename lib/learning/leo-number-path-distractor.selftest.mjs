import {
  generatePathPool,
  findDistractorFalseNegatives,
  matchingNumbersOnBoard,
  buildOrderedSessionRun,
  sessionRunIsAscending,
} from "../../components/educational-games/leo-number-path/leo-number-path-data.js";

let failed = 0;

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
  }
  const run = buildOrderedSessionRun(difficulty);
  if (run.length !== 12) {
    failed += 1;
    console.error(`FAIL session length ${difficulty}: ${run.length}`);
  }
  if (!sessionRunIsAscending(run)) {
    failed += 1;
    console.error(`FAIL session order ${difficulty}`);
  }
}

if (failed > 0) {
  console.error(`leo-number-path distractor selftest: ${failed} failure(s)`);
  process.exit(1);
}

console.log("leo-number-path distractor selftest: OK");
