import assert from "node:assert/strict";
import {
  MAZE_RULES,
  buildMazeLevel,
  validateIronRules,
  openNeighborCount,
  countPathChoices,
  maxStraightCorridorRun,
} from "../lib/solo-games/maze-generator.js";

const SAMPLES = 50;
const configs = [
  { difficulty: "easy", rows: 9, cols: 7, stars: 3 },
  { difficulty: "medium", rows: 11, cols: 9, stars: 4 },
  { difficulty: "hard", rows: 13, cols: 11, stars: 5 },
];

let failures = 0;
for (const cfg of configs) {
  for (let i = 0; i < SAMPLES; i += 1) {
    const level = buildMazeLevel(cfg.rows, cfg.cols, cfg.stars, cfg.difficulty, true, {
      diamondChance: 0.8,
      diamondSec: 10,
    });
    const rules = MAZE_RULES[cfg.difficulty];
    const ctx = {
      start: level.start,
      exit: level.exit,
      key: level.key,
      stars: level.stars,
      bonusDiamond: level.bonusDiamond,
    };
    if (!validateIronRules(level.maze, ctx, rules)) {
      failures += 1;
      console.error(`FAIL iron rules ${cfg.difficulty} sample ${i}`);
      continue;
    }
    for (const cell of [level.start, level.exit, level.key, ...level.stars]) {
      if (openNeighborCount(level.maze, cell) < 2) {
        failures += 1;
        console.error(`FAIL degree ${cfg.difficulty} at ${cell.r},${cell.c}`);
      }
    }
    if (countPathChoices(level.maze) < rules.minChoices) failures += 1;
    if (maxStraightCorridorRun(level.maze) > rules.maxCorridorRun) failures += 1;
  }
}

assert.equal(failures, 0, `${failures} maze validation failures`);
console.log(`OK — ${SAMPLES * configs.length} mazes passed iron rules.`);
