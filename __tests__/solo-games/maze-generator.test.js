import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAZE_RULES,
  buildMazeLevel,
  openNeighborCount,
  validateIronRules,
  maxStraightCorridorRun,
  countPathChoices,
} from "../../lib/solo-games/maze-generator.js";

const DIFFICULTY_SETTINGS = {
  easy: { rows: 9, cols: 7, starCount: 3, diamondChance: 0.75, diamondSec: 10 },
  medium: { rows: 11, cols: 9, starCount: 4, diamondChance: 0.7, diamondSec: 10 },
  hard: { rows: 13, cols: 11, starCount: 5, diamondChance: 0.65, diamondSec: 10 },
};

function assertIronLevel(level, difficulty) {
  const rules = MAZE_RULES[difficulty];
  const ctx = {
    start: level.start,
    exit: level.exit,
    key: level.key,
    stars: level.stars,
    bonusDiamond: level.bonusDiamond,
  };
  assert.equal(validateIronRules(level.maze, ctx, rules), true);

  for (const cell of [level.start, level.exit, level.key, ...level.stars]) {
    assert.ok(
      openNeighborCount(level.maze, cell) >= rules.minCriticalDegree,
      `critical cell needs 2+ exits: ${cell.r},${cell.c}`
    );
  }

  assert.ok(countPathChoices(level.maze) >= rules.minChoices);
  assert.ok(maxStraightCorridorRun(level.maze) <= rules.maxCorridorRun);
}

describe("maze generator iron rules", () => {
  for (const difficulty of ["easy", "medium", "hard"]) {
    it(`generates valid ${difficulty} mazes (20 samples)`, () => {
      const settings = DIFFICULTY_SETTINGS[difficulty];
      for (let i = 0; i < 20; i += 1) {
        const level = buildMazeLevel(
          settings.rows,
          settings.cols,
          settings.starCount,
          difficulty,
          true,
          settings
        );
        assertIronLevel(level, difficulty);
      }
    });
  }

  it("post-key access: key reaches every star and exit", () => {
    const level = buildMazeLevel(11, 9, 4, "medium", false, DIFFICULTY_SETTINGS.medium);
    const rules = MAZE_RULES.medium;
    assert.equal(
      validateIronRules(
        level.maze,
        {
          start: level.start,
          exit: level.exit,
          key: level.key,
          stars: level.stars,
          bonusDiamond: null,
        },
        rules
      ),
      true
    );
  });
});
