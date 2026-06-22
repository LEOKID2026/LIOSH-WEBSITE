/** Maze generation + iron-rule validation for solo Leo maze. */

export const MAZE_RULES = {
  easy: {
    minSteps: 12,
    minTurns: 4,
    minStartExitDist: 8,
    minDeadEnds: 3,
    minStarsOffPath: 2,
    minKeySteps: 3,
    maxKeySteps: 16,
    extraPassages: 2,
    maxReinforceOpens: 7,
    maxOpenDelta: 0.055,
    minChoices: 3,
    maxCorridorRun: 5,
    minCriticalDegree: 2,
  },
  medium: {
    minSteps: 18,
    minTurns: 6,
    minStartExitDist: 12,
    minDeadEnds: 5,
    minStarsOffPath: 2,
    minKeySteps: 5,
    maxKeySteps: 24,
    extraPassages: 3,
    maxReinforceOpens: 10,
    maxOpenDelta: 0.065,
    minChoices: 4,
    maxCorridorRun: 6,
    minCriticalDegree: 2,
  },
  hard: {
    minSteps: 24,
    minTurns: 8,
    minStartExitDist: 16,
    minDeadEnds: 8,
    minStarsOffPath: 3,
    minKeySteps: 8,
    maxKeySteps: 38,
    extraPassages: 4,
    maxReinforceOpens: 12,
    maxOpenDelta: 0.075,
    minChoices: 5,
    maxCorridorRun: 7,
    minCriticalDegree: 2,
  },
};

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateMaze(rows, cols, seed) {
  const rng = mulberry32(seed);
  const grid = Array.from({ length: rows }, () => Array(cols).fill(1));
  const baseDirs = [
    [0, 2],
    [2, 0],
    [0, -2],
    [-2, 0],
  ];
  const stack = [[1, 1]];
  grid[1][1] = 0;

  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const dirs = shuffleWithRng(baseDirs, rng);
    const neighbors = dirs
      .map(([dr, dc]) => [r + dr, c + dc, r + dr / 2, c + dc / 2])
      .filter(
        ([nr, nc]) =>
          nr > 0 && nc > 0 && nr < rows - 1 && nc < cols - 1 && grid[nr][nc] === 1
      );

    if (!neighbors.length) stack.pop();
    else {
      const pick = neighbors[Math.floor(rng() * neighbors.length)];
      const [nr, nc, wr, wc] = pick;
      grid[nr][nc] = 0;
      grid[wr][wc] = 0;
      stack.push([nr, nc]);
    }
  }

  return grid;
}

function wallBreakCandidates(maze) {
  const rows = maze.length;
  const cols = maze[0].length;
  const out = [];
  for (let r = 1; r < rows - 1; r += 1) {
    for (let c = 1; c < cols - 1; c += 1) {
      if (maze[r][c] !== 1) continue;
      const up = maze[r - 1][c] === 0;
      const down = maze[r + 1][c] === 0;
      const left = maze[r][c - 1] === 0;
      const right = maze[r][c + 1] === 0;
      const openSides = [up, down, left, right].filter(Boolean).length;
      if (openSides < 2) continue;
      if (left && right) out.push({ r, c, score: openSides });
      if (up && down) out.push({ r, c, score: openSides });
    }
  }
  return out;
}

export function openExtraPassages(maze, rng, count) {
  const copy = maze.map((row) => [...row]);
  const candidates = shuffleWithRng(wallBreakCandidates(copy), rng);
  const simpleLoops = candidates.filter((cell) => cell.score === 2);
  const pool = simpleLoops.length ? simpleLoops : candidates;
  let opened = 0;
  for (const cell of pool) {
    if (opened >= count) break;
    if (copy[cell.r][cell.c] !== 1) continue;
    copy[cell.r][cell.c] = 0;
    opened += 1;
  }
  return copy;
}

export function openCellRatio(maze) {
  const open = pathCells(maze).length;
  const total = maze.length * maze[0].length;
  return total > 0 ? open / total : 0;
}

function criticalCellsList(ctx) {
  const { start, exit, key, stars, bonusDiamond } = ctx;
  return [start, exit, key, ...stars, ...(bonusDiamond ? [bonusDiamond] : [])];
}

function scoreReinforceWall(maze, wall, ctx) {
  let score = 0;
  const critical = criticalCellsList(ctx);
  for (const cell of critical) {
    score += Math.max(0, 6 - manhattan(wall, cell)) * 2;
  }
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    const nr = wall.r + dr;
    const nc = wall.c + dc;
    if (maze[nr]?.[nc] === 0 && openNeighborCount(maze, { r: nr, c: nc }) === 1) {
      score += 4;
    }
  }
  if (wall.score === 2) score += 1;
  return score;
}

/** Open only as many loop walls as needed for iron rules — prefer walls near critical areas. */
export function reinforceMazePassages(maze, rng, rules, validateCtx, maxOpens) {
  const budget = maxOpens ?? rules.maxReinforceOpens ?? 6;
  let copy = maze.map((row) => [...row]);
  for (let i = 0; i < budget; i += 1) {
    if (validateIronRules(copy, validateCtx, rules)) return copy;

    const candidates = wallBreakCandidates(copy)
      .filter((w) => copy[w.r][w.c] === 1)
      .map((w) => ({ ...w, reinforceScore: scoreReinforceWall(copy, w, validateCtx) }))
      .sort((a, b) => b.reinforceScore - a.reinforceScore || a.score - b.score);

    if (!candidates.length) break;
    const topScore = candidates[0].reinforceScore;
    const tier = candidates.filter((c) => c.reinforceScore === topScore);
    const pick = tier[Math.floor(rng() * tier.length)];
    copy[pick.r][pick.c] = 0;
  }
  return copy;
}

export function pathCells(maze) {
  const out = [];
  for (let r = 0; r < maze.length; r += 1) {
    for (let c = 0; c < maze[r].length; c += 1) {
      if (maze[r][c] === 0) out.push({ r, c });
    }
  }
  return out;
}

export function findPath(maze, start, exit) {
  const key = (r, c) => `${r},${c}`;
  const queue = [{ r: start.r, c: start.c, path: [{ r: start.r, c: start.c }] }];
  const seen = new Set([key(start.r, start.c)]);

  while (queue.length) {
    const node = queue.shift();
    if (node.r === exit.r && node.c === exit.c) return node.path;
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nr = node.r + dr;
      const nc = node.c + dc;
      const k = key(nr, nc);
      if (maze[nr]?.[nc] === 0 && !seen.has(k)) {
        seen.add(k);
        queue.push({
          r: nr,
          c: nc,
          path: node.path.concat([{ r: nr, c: nc }]),
        });
      }
    }
  }
  return [];
}

export function openNeighborCount(maze, cell) {
  let n = 0;
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    if (maze[cell.r + dr]?.[cell.c + dc] === 0) n += 1;
  }
  return n;
}

export function countPathChoices(maze) {
  const rows = maze.length;
  const cols = maze[0].length;
  let choices = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (maze[r][c] !== 0) continue;
      const deg = openNeighborCount(maze, { r, c });
      if (deg >= 3) choices += 1;
      else if (deg === 2) {
        const up = maze[r - 1]?.[c] === 0;
        const down = maze[r + 1]?.[c] === 0;
        const left = maze[r][c - 1] === 0;
        const right = maze[r][c + 1] === 0;
        if ((up && left) || (up && right) || (down && left) || (down && right)) {
          choices += 1;
        }
      }
    }
  }
  return choices;
}

export function maxStraightCorridorRun(maze) {
  const rows = maze.length;
  const cols = maze[0].length;
  let maxRun = 1;

  for (let r = 0; r < rows; r += 1) {
    let run = 0;
    for (let c = 0; c < cols; c += 1) {
      if (maze[r][c] === 0 && openNeighborCount(maze, { r, c }) === 2) {
        const left = maze[r][c - 1] === 0;
        const right = maze[r][c + 1] === 0;
        if (left && right) {
          run += 1;
          maxRun = Math.max(maxRun, run);
          continue;
        }
      }
      run = 0;
    }
  }

  for (let c = 0; c < cols; c += 1) {
    let run = 0;
    for (let r = 0; r < rows; r += 1) {
      if (maze[r][c] === 0 && openNeighborCount(maze, { r, c }) === 2) {
        const up = maze[r - 1]?.[c] === 0;
        const down = maze[r + 1]?.[c] === 0;
        if (up && down) {
          run += 1;
          maxRun = Math.max(maxRun, run);
          continue;
        }
      }
      run = 0;
    }
  }

  return maxRun;
}

function manhattan(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

export function countTurns(path) {
  if (path.length < 3) return 0;
  let turns = 0;
  for (let i = 2; i < path.length; i += 1) {
    const dr1 = path[i - 1].r - path[i - 2].r;
    const dc1 = path[i - 1].c - path[i - 2].c;
    const dr2 = path[i].r - path[i - 1].r;
    const dc2 = path[i].c - path[i - 1].c;
    if (dr1 !== dr2 || dc1 !== dc2) turns += 1;
  }
  return turns;
}

export function countDeadEnds(maze) {
  return pathCells(maze).filter((p) => openNeighborCount(maze, p) === 1).length;
}

function pickStartExit(maze, rng, minDist) {
  const paths = pathCells(maze);
  const shuffled = shuffleWithRng(paths, rng);

  for (let i = 0; i < shuffled.length; i += 1) {
    for (let j = shuffled.length - 1; j > i; j -= 1) {
      const start = shuffled[i];
      const exit = shuffled[j];
      if (manhattan(start, exit) < minDist) continue;
      const route = findPath(maze, start, exit);
      if (route.length >= 2) return { start, exit, route };
    }
  }

  const start = paths[0];
  const exit = paths[paths.length - 1];
  return { start, exit, route: findPath(maze, start, exit) };
}

function branchPool(maze, start, exit) {
  const route = findPath(maze, start, exit);
  const shortest = new Set(route.map((p) => `${p.r},${p.c}`));
  return pathCells(maze).filter(
    (p) =>
      !shortest.has(`${p.r},${p.c}`) &&
      !(p.r === start.r && p.c === start.c) &&
      !(p.r === exit.r && p.c === exit.c)
  );
}

function placeKey(maze, start, exit, rng, difficulty) {
  const rules = MAZE_RULES[difficulty] || MAZE_RULES.medium;
  const branches = branchPool(maze, start, exit);
  const valid = branches.filter((cell) => {
    const toKey = findPath(maze, start, cell);
    const toExit = findPath(maze, cell, exit);
    if (toKey.length < 2 || toExit.length < 2) return false;
    const steps = toKey.length - 1;
    if (steps < rules.minKeySteps || steps > rules.maxKeySteps) return false;
    return openNeighborCount(maze, cell) >= rules.minCriticalDegree;
  });
  const pool = valid.length
    ? valid
    : branches.filter(
        (cell) =>
          findPath(maze, start, cell).length >= 2 &&
          openNeighborCount(maze, cell) >= rules.minCriticalDegree
      );
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)];
}

function placeStars(maze, count, start, exit, rng, minOffPath, reserved, difficulty) {
  const rules = MAZE_RULES[difficulty] || MAZE_RULES.medium;
  const route = findPath(maze, start, exit);
  const branches = branchPool(maze, start, exit).filter((p) => !reserved.has(`${p.r},${p.c}`));
  const routePool = route.filter(
    (p) =>
      !(p.r === start.r && p.c === start.c) &&
      !(p.r === exit.r && p.c === exit.c) &&
      !reserved.has(`${p.r},${p.c}`) &&
      openNeighborCount(maze, p) >= rules.minCriticalDegree
  );
  const used = new Set([...reserved]);
  const stars = [];

  const takeFrom = (pool, n) => {
    const shuffled = shuffleWithRng(
      pool.filter((p) => !used.has(`${p.r},${p.c}`)),
      rng
    );
    for (const cell of shuffled) {
      if (n <= 0 || stars.length >= count) break;
      const cellKey = `${cell.r},${cell.c}`;
      if (used.has(cellKey)) continue;
      used.add(cellKey);
      stars.push({ ...cell, id: stars.length, taken: false });
      n -= 1;
    }
  };

  takeFrom(branches.filter((p) => openNeighborCount(maze, p) >= 2), minOffPath);
  takeFrom(shuffleWithRng([...branches, ...routePool], rng), count - stars.length);

  return stars.slice(0, count);
}

function placeBonusDiamond(maze, start, exit, rng, reserved) {
  const branches = branchPool(maze, start, exit).filter(
    (p) => !reserved.has(`${p.r},${p.c}`) && openNeighborCount(maze, p) >= 2
  );
  if (!branches.length) return null;
  return branches[Math.floor(rng() * branches.length)];
}

/**
 * Iron rules: 2+ exits at critical cells, no long single corridors,
 * post-key access to all remaining goals, real choice points.
 */
export function validateIronRules(maze, ctx, rules) {
  const { start, exit, key, stars, bonusDiamond } = ctx;
  if (!key) return false;

  const critical = [start, exit, key, ...stars, ...(bonusDiamond ? [bonusDiamond] : [])];
  for (const cell of critical) {
    if (openNeighborCount(maze, cell) < rules.minCriticalDegree) return false;
  }

  if (countPathChoices(maze) < rules.minChoices) return false;
  if (maxStraightCorridorRun(maze) > rules.maxCorridorRun) return false;

  if (!findPath(maze, start, key).length) return false;
  if (!findPath(maze, key, exit).length) return false;

  for (const star of stars) {
    if (!findPath(maze, start, star).length) return false;
    if (!findPath(maze, key, star).length) return false;
    if (!findPath(maze, star, exit).length) return false;
  }

  if (bonusDiamond) {
    if (!findPath(maze, start, bonusDiamond).length) return false;
    if (!findPath(maze, key, bonusDiamond).length) return false;
    if (!findPath(maze, bonusDiamond, exit).length) return false;
  }

  return true;
}

export function buildMazeLevel(rows, cols, starCount, difficulty, withDiamond, settings = {}) {
  const rules = MAZE_RULES[difficulty] || MAZE_RULES.medium;
  const diamondChance = settings.diamondChance ?? 0.7;
  const diamondSec = settings.diamondSec ?? 10;

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const seed =
      ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) + attempt * 9973) >>> 0;
    const rng = mulberry32(seed);
    let maze = generateMaze(rows, cols, seed);
    const baseOpenRatio = openCellRatio(maze);
    const maxOpenRatio = baseOpenRatio + rules.maxOpenDelta;
    maze = openExtraPassages(maze, rng, rules.extraPassages);

    if (countDeadEnds(maze) < rules.minDeadEnds) continue;
    if (countPathChoices(maze) < rules.minChoices) continue;
    if (maxStraightCorridorRun(maze) > rules.maxCorridorRun) continue;

    const { start, exit, route } = pickStartExit(maze, rng, rules.minStartExitDist);
    const steps = route.length - 1;
    if (steps < rules.minSteps) continue;
    if (countTurns(route) < rules.minTurns) continue;

    const key = placeKey(maze, start, exit, rng, difficulty);
    if (!key) continue;

    const reserved = new Set([
      `${start.r},${start.c}`,
      `${exit.r},${exit.c}`,
      `${key.r},${key.c}`,
    ]);

    const stars = placeStars(
      maze,
      starCount,
      start,
      exit,
      rng,
      rules.minStarsOffPath,
      reserved,
      difficulty
    );
    if (stars.length < starCount) continue;

    const shortest = new Set(route.map((p) => `${p.r},${p.c}`));
    const offPath = stars.filter((s) => !shortest.has(`${s.r},${s.c}`)).length;
    if (offPath < rules.minStarsOffPath) continue;

    let bonusDiamond = null;
    if (withDiamond && rng() < diamondChance) {
      stars.forEach((s) => reserved.add(`${s.r},${s.c}`));
      const cell = placeBonusDiamond(maze, start, exit, rng, reserved);
      if (cell) bonusDiamond = { ...cell, secondsLeft: diamondSec, active: true };
    }

    const validateCtx = { start, exit, key, stars, bonusDiamond };
    maze = reinforceMazePassages(maze, rng, rules, validateCtx, rules.maxReinforceOpens);
    if (!validateIronRules(maze, validateCtx, rules)) {
      maze = reinforceMazePassages(maze, rng, rules, validateCtx, 4);
    }

    if (openCellRatio(maze) > maxOpenRatio) continue;
    if (!validateIronRules(maze, validateCtx, rules)) continue;

    return {
      maze,
      start,
      exit,
      key,
      stars,
      bonusDiamond,
      mazeId: (seed % 9000) + 1000,
    };
  }

  for (let extra = 0; extra < 100; extra += 1) {
    const seed = (Date.now() + extra * 7919) >>> 0;
    const rng = mulberry32(seed);
    let maze = generateMaze(rows, cols, seed);
    const baseOpenRatio = openCellRatio(maze);
    const maxOpenRatio = baseOpenRatio + rules.maxOpenDelta + 0.02;
    maze = openExtraPassages(maze, rng, rules.extraPassages + 1);
    const { start, exit, route } = pickStartExit(maze, rng, Math.max(4, rules.minStartExitDist - 4));
    const key = placeKey(maze, start, exit, rng, difficulty) || {
      r: route[Math.min(3, route.length - 1)].r,
      c: route[Math.min(3, route.length - 1)].c,
    };
    const reserved = new Set([`${start.r},${start.c}`, `${exit.r},${exit.c}`, `${key.r},${key.c}`]);
    const stars = placeStars(maze, starCount, start, exit, rng, 1, reserved, difficulty);
    if (stars.length < starCount) continue;
    const validateCtx = { start, exit, key, stars, bonusDiamond: null };
    maze = reinforceMazePassages(maze, rng, rules, validateCtx, rules.maxReinforceOpens + 2);
    if (openCellRatio(maze) > maxOpenRatio) continue;
    if (validateIronRules(maze, validateCtx, rules)) {
      return {
        maze,
        start,
        exit,
        key,
        stars,
        bonusDiamond: null,
        mazeId: (seed % 9000) + 1000,
      };
    }
  }

  throw new Error("maze_generation_failed");
}
