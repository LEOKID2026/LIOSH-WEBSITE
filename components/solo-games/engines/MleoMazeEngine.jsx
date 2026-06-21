import { useCallback, useEffect, useRef, useState } from "react";

const IMG_LEO = "/images/leo.png";
const IMG_STAR = "/images/candy/star.png";
const IMG_DIAMOND = "/images/diamond.png";

const SCORE_STAR = 20;
const SCORE_KEY = 10;
const SCORE_DIAMOND = 50;
const SCORE_MAZE = 100;

const SCORE_CAP = { easy: 900, medium: 1100, hard: 1300 };

const DIFFICULTY_SETTINGS = {
  easy: {
    rows: 9,
    cols: 7,
    timeSec: 180,
    maxMistakes: 20,
    starCount: 3,
    hintAfter: 4,
    cellMin: 30,
    cellMinLg: 38,
    diamondChance: 0.75,
    diamondSec: 10,
  },
  medium: {
    rows: 11,
    cols: 9,
    timeSec: 210,
    maxMistakes: 14,
    starCount: 4,
    hintAfter: 99,
    cellMin: 24,
    cellMinLg: 32,
    diamondChance: 0.7,
    diamondSec: 10,
  },
  hard: {
    rows: 13,
    cols: 11,
    timeSec: 240,
    maxMistakes: 10,
    starCount: 5,
    hintAfter: 99,
    cellMin: 20,
    cellMinLg: 28,
    diamondChance: 0.65,
    diamondSec: 10,
  },
};

const MAZE_RULES = {
  easy: {
    minSteps: 12,
    minTurns: 4,
    minStartExitDist: 8,
    minDeadEnds: 3,
    minStarsOffPath: 2,
    minKeySteps: 3,
    maxKeySteps: 16,
    extraPassages: 3,
    minChoices: 2,
  },
  medium: {
    minSteps: 18,
    minTurns: 6,
    minStartExitDist: 12,
    minDeadEnds: 5,
    minStarsOffPath: 2,
    minKeySteps: 5,
    maxKeySteps: 24,
    extraPassages: 4,
    minChoices: 3,
  },
  hard: {
    minSteps: 24,
    minTurns: 8,
    minStartExitDist: 16,
    minDeadEnds: 8,
    minStarsOffPath: 3,
    minKeySteps: 8,
    maxKeySteps: 38,
    extraPassages: 5,
    minChoices: 4,
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

function generateMaze(rows, cols, seed) {
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
      if (left && right && !up && !down) out.push({ r, c });
      if (up && down && !left && !right) out.push({ r, c });
    }
  }
  return out;
}

function openExtraPassages(maze, rng, count) {
  const copy = maze.map((row) => [...row]);
  const candidates = shuffleWithRng(wallBreakCandidates(copy), rng);
  let opened = 0;
  for (const cell of candidates) {
    if (opened >= count) break;
    copy[cell.r][cell.c] = 0;
    opened += 1;
  }
  return copy;
}

function countPathChoices(maze) {
  const rows = maze.length;
  const cols = maze[0].length;
  let choices = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (maze[r][c] !== 0) continue;
      const up = maze[r - 1]?.[c] === 0;
      const down = maze[r + 1]?.[c] === 0;
      const left = maze[r][c - 1] === 0;
      const right = maze[r][c + 1] === 0;
      const n = [up, down, left, right].filter(Boolean).length;
      if (n >= 3) choices += 1;
      else if (n === 2 && ((up && left) || (up && right) || (down && left) || (down && right))) {
        choices += 1;
      }
    }
  }
  return choices;
}

function validatePrizes(maze, start, exit, key, stars, bonusDiamond) {
  if (!key || !findPath(maze, start, key).length || !findPath(maze, key, exit).length) return false;
  for (const star of stars) {
    if (!findPath(maze, start, star).length) return false;
  }
  if (bonusDiamond && !findPath(maze, start, bonusDiamond).length) return false;
  return true;
}

function pathCells(maze) {
  const out = [];
  for (let r = 0; r < maze.length; r += 1) {
    for (let c = 0; c < maze[r].length; c += 1) {
      if (maze[r][c] === 0) out.push({ r, c });
    }
  }
  return out;
}

function findPath(maze, start, exit) {
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

function manhattan(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

function countTurns(path) {
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

function countDeadEnds(maze) {
  const rows = maze.length;
  const cols = maze[0].length;
  let dead = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (maze[r][c] !== 0) continue;
      let neighbors = 0;
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        if (maze[r + dr]?.[c + dc] === 0) neighbors += 1;
      }
      if (neighbors === 1) dead += 1;
    }
  }
  return dead;
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
    return steps >= rules.minKeySteps && steps <= rules.maxKeySteps;
  });
  const pool = valid.length ? valid : branches.filter((cell) => findPath(maze, start, cell).length >= 2);
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)];
}

function placeStars(maze, count, start, exit, rng, minOffPath, reserved) {
  const route = findPath(maze, start, exit);
  const shortest = new Set(route.map((p) => `${p.r},${p.c}`));
  const branches = branchPool(maze, start, exit).filter((p) => !reserved.has(`${p.r},${p.c}`));
  const routePool = route.filter(
    (p) =>
      !(p.r === start.r && p.c === start.c) &&
      !(p.r === exit.r && p.c === exit.c) &&
      !reserved.has(`${p.r},${p.c}`)
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

  takeFrom(branches, minOffPath);
  takeFrom(shuffleWithRng([...branches, ...routePool], rng), count - stars.length);

  return stars.slice(0, count);
}

function placeBonusDiamond(maze, start, exit, rng, reserved) {
  const branches = branchPool(maze, start, exit).filter((p) => !reserved.has(`${p.r},${p.c}`));
  if (!branches.length) return null;
  return branches[Math.floor(rng() * branches.length)];
}

function buildMazeLevel(rows, cols, starCount, difficulty, withDiamond) {
  const rules = MAZE_RULES[difficulty] || MAZE_RULES.medium;
  const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;

  for (let attempt = 0; attempt < 56; attempt += 1) {
    const seed =
      ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) + attempt * 9973) >>> 0;
    const rng = mulberry32(seed);
    let maze = generateMaze(rows, cols, seed);
    maze = openExtraPassages(maze, rng, rules.extraPassages);

    if (countDeadEnds(maze) < rules.minDeadEnds) continue;
    if (countPathChoices(maze) < rules.minChoices) continue;

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

    const stars = placeStars(maze, starCount, start, exit, rng, rules.minStarsOffPath, reserved);
    if (stars.length < starCount) continue;

    const shortest = new Set(route.map((p) => `${p.r},${p.c}`));
    const offPath = stars.filter((s) => !shortest.has(`${s.r},${s.c}`)).length;
    if (offPath < rules.minStarsOffPath) continue;

    let bonusDiamond = null;
    if (withDiamond && rng() < settings.diamondChance) {
      stars.forEach((s) => reserved.add(`${s.r},${s.c}`));
      const cell = placeBonusDiamond(maze, start, exit, rng, reserved);
      if (cell) bonusDiamond = { ...cell, secondsLeft: settings.diamondSec, active: true };
    }

    if (!validatePrizes(maze, start, exit, key, stars, bonusDiamond)) continue;

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

  const seed = Date.now() >>> 0;
  let maze = generateMaze(rows, cols, seed);
  maze = openExtraPassages(maze, mulberry32(seed), 2);
  const start = { r: 1, c: 1 };
  const exit = { r: rows - 2, c: cols - 2 };
  const key = { r: 1, c: Math.min(cols - 2, 3) };
  return {
    maze,
    start,
    exit,
    key,
    stars: placeStars(maze, starCount, start, exit, mulberry32(seed), 1, new Set()),
    bonusDiamond: null,
    mazeId: (seed % 9000) + 1000,
  };
}

function streakBonus(mazesCompleted) {
  if (mazesCompleted < 2) return 0;
  return Math.floor((mazesCompleted - 1) / 2) * 25;
}

function computeFinalScore(sessionScore, mazesCompleted, timeRemaining, difficulty) {
  let total = sessionScore;
  if (mazesCompleted >= 1) total += timeRemaining;
  const cap = SCORE_CAP[difficulty] || SCORE_CAP.medium;
  return Math.min(total, cap);
}

function nextHintCell(maze, player, target) {
  const route = findPath(maze, player, target);
  if (route.length >= 2) return route[1];
  return null;
}

/**
 * @param {{ autoStart?: boolean, initialDifficulty?: string, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoMazeEngine({
  autoStart = false,
  initialDifficulty = "medium",
  onSessionEnd,
}) {
  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const boardRef = useRef(null);
  const mazeLayoutRef = useRef(null);
  const swipeRef = useRef({ x: 0, y: 0, active: false });
  const hintTimerRef = useRef(null);
  const msgTimerRef = useRef(null);
  const wallHitTimerRef = useRef(null);

  const scoreRef = useRef(0);
  const mistakesRef = useRef(0);
  const starsTakenRef = useRef(0);
  const mazesCompletedRef = useRef(0);
  const hasKeyRef = useRef(false);
  const timeLeftRef = useRef(210);

  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [showIntro, setShowIntro] = useState(!autoStart);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [maze, setMaze] = useState([]);
  const [stars, setStars] = useState([]);
  const [keyCell, setKeyCell] = useState(null);
  const [start, setStart] = useState({ r: 1, c: 1 });
  const [exit, setExit] = useState({ r: 3, c: 3 });
  const [mazeId, setMazeId] = useState(0);
  const [player, setPlayer] = useState({ r: 1, c: 1 });
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [starsTaken, setStarsTaken] = useState(0);
  const [mazesCompleted, setMazesCompleted] = useState(0);
  const [hasKey, setHasKey] = useState(false);
  const [timeLeft, setTimeLeft] = useState(210);
  const [statusMsg, setStatusMsg] = useState("");
  const [hintCell, setHintCell] = useState(null);
  const [bonusDiamond, setBonusDiamond] = useState(null);
  const [diamondBanner, setDiamondBanner] = useState(false);
  const [wallHitCell, setWallHitCell] = useState(null);
  const [cellPx, setCellPx] = useState(24);

  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  useEffect(
    () => () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
      if (wallHitTimerRef.current) clearTimeout(wallHitTimerRef.current);
    },
    []
  );

  const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;
  const isEasy = difficulty === "easy";

  useEffect(() => {
    if (showIntro || !gameRunning) return undefined;
    const area = mazeLayoutRef.current;
    if (!area) return undefined;

    const compute = () => {
      const rect = area.getBoundingClientRect();
      const desktopSide = window.matchMedia("(min-width: 768px)").matches;

      if (desktopSide) {
        const dpadW = 200;
        const availW = Math.max(100, rect.width - dpadW - 12);
        const availH = Math.max(100, rect.height - 8);
        const fromW = availW / settings.cols;
        const fromH = availH / settings.rows;
        setCellPx(Math.max(14, Math.floor(Math.min(fromW, fromH))));
        return;
      }

      const portrait = window.matchMedia("(orientation: portrait)").matches;
      const dpadH = portrait ? 196 : 0;
      const availW = Math.max(100, rect.width - 8);
      const availH = Math.max(100, rect.height - dpadH - 4);
      const fromW = availW / settings.cols;
      const fromH = availH / settings.rows;
      const vwCell = Math.floor(window.innerWidth * 0.04);
      const fit = Math.floor(Math.min(fromW, fromH));
      const cap = settings.cellMinLg + 4;
      setCellPx(Math.max(settings.cellMin, Math.min(cap, Math.max(vwCell, fit))));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(area);
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
    };
  }, [showIntro, gameRunning, settings.cols, settings.rows, settings.cellMin, settings.cellMinLg, mazeId]);

  const flashMsg = useCallback((text, ms = 1400) => {
    setStatusMsg(text);
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setStatusMsg(""), ms);
  }, []);

  const fireSessionEnd = (didWin, remaining, finalScore) => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    onSessionEnd({
      score: finalScore,
      didWin,
      difficulty,
      mistakes: mistakesRef.current,
      timeRemainingSec: remaining,
      durationMs:
        playStartedAtRef.current != null
          ? Math.max(0, Date.now() - playStartedAtRef.current)
          : undefined,
      mazeCompleted: mazesCompletedRef.current,
      starsCollected: starsTakenRef.current,
    });
  };

  const endGame = (didWin, remaining) => {
    setGameRunning(false);
    setGameOver(true);
    setWon(didWin);
    const finalScore = didWin
      ? computeFinalScore(scoreRef.current, mazesCompletedRef.current, remaining, difficulty)
      : 0;
    scoreRef.current = finalScore;
    setScore(finalScore);
    fireSessionEnd(didWin, remaining, finalScore);
  };

  const applyLevel = useCallback(
    (level) => {
      setMaze(level.maze);
      setStart(level.start);
      setExit(level.exit);
      setKeyCell(level.key);
      setMazeId(level.mazeId);
      setPlayer(level.start);
      setStars(level.stars);
      setBonusDiamond(level.bonusDiamond);
      hasKeyRef.current = false;
      setHasKey(false);
      setHintCell(null);
      setWallHitCell(null);
      if (level.bonusDiamond) {
        setDiamondBanner(true);
        window.setTimeout(() => setDiamondBanner(false), 2200);
      }
    },
    []
  );

  const loadNextMaze = useCallback(() => {
    const level = buildMazeLevel(
      settings.rows,
      settings.cols,
      settings.starCount,
      difficulty,
      true
    );
    applyLevel(level);
  }, [applyLevel, difficulty, settings.cols, settings.rows, settings.starCount]);

  const completeMaze = useCallback(() => {
    mazesCompletedRef.current += 1;
    const mc = mazesCompletedRef.current;
    const bonus = SCORE_MAZE + streakBonus(mc);
    scoreRef.current += bonus;
    setScore(scoreRef.current);
    setMazesCompleted(mc);
    flashMsg("מבוך הושלם! 🎉", 900);
    loadNextMaze();
  }, [flashMsg, loadNextMaze]);

  const pulseHint = useCallback(
    (nextPlayer) => {
      if (!isEasy || mistakesRef.current < settings.hintAfter) {
        setHintCell(null);
        return;
      }
      const target = hasKeyRef.current ? exit : keyCell || exit;
      const cell = nextHintCell(maze, nextPlayer, target);
      setHintCell(cell);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setHintCell(null), 2200);
    },
    [exit, isEasy, keyCell, maze, settings.hintAfter]
  );

  const flashWallHit = useCallback((r, c) => {
    setWallHitCell({ r, c });
    if (wallHitTimerRef.current) clearTimeout(wallHitTimerRef.current);
    wallHitTimerRef.current = setTimeout(() => setWallHitCell(null), 400);
  }, []);

  const addMistake = useCallback(() => {
    mistakesRef.current += 1;
    setMistakes(mistakesRef.current);
    flashMsg("יש קיר!");
    pulseHint(player);
    if (mistakesRef.current >= settings.maxMistakes) {
      endGame(mazesCompletedRef.current >= 1, timeLeftRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashMsg, player, pulseHint, settings.maxMistakes]);

  const startGame = () => {
    sessionEndFiredRef.current = false;
    playStartedAtRef.current = Date.now();
    scoreRef.current = 0;
    mistakesRef.current = 0;
    starsTakenRef.current = 0;
    mazesCompletedRef.current = 0;
    hasKeyRef.current = false;
    timeLeftRef.current = settings.timeSec;

    setScore(0);
    setMistakes(0);
    setStarsTaken(0);
    setMazesCompleted(0);
    setHasKey(false);
    setShowIntro(false);
    setGameOver(false);
    setWon(false);
    setStatusMsg("");
    setHintCell(null);
    setWallHitCell(null);
    setDiamondBanner(false);
    setTimeLeft(settings.timeSec);
    loadNextMaze();
    setGameRunning(true);
  };

  useEffect(() => {
    if (autoStart && !gameRunning && !gameOver) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (!gameRunning) return undefined;
    if (timeLeft <= 0) {
      endGame(mazesCompletedRef.current >= 1, 0);
      return undefined;
    }
    const t = setTimeout(() => {
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameRunning, timeLeft]);

  useEffect(() => {
    if (!gameRunning || !bonusDiamond?.active) return undefined;
    const tick = setInterval(() => {
      setBonusDiamond((prev) => {
        if (!prev?.active) return null;
        const next = prev.secondsLeft - 1;
        if (next <= 0) return null;
        return { ...prev, secondsLeft: next };
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [bonusDiamond?.active, gameRunning]);

  const tryMove = (dr, dc) => {
    if (!gameRunning) return;
    const nr = player.r + dr;
    const nc = player.c + dc;
    if (!maze[nr] || maze[nr][nc] === 1) {
      if (maze[nr]?.[nc] === 1) flashWallHit(nr, nc);
      addMistake();
      return;
    }

    const next = { r: nr, c: nc };
    setPlayer(next);
    setHintCell(null);

    if (keyCell && !hasKeyRef.current && nr === keyCell.r && nc === keyCell.c) {
      hasKeyRef.current = true;
      setHasKey(true);
      scoreRef.current += SCORE_KEY;
      setScore(scoreRef.current);
      flashMsg("מצאתם מפתח! 🔑", 1000);
    }

    const starIdx = stars.findIndex((s) => !s.taken && s.r === nr && s.c === nc);
    if (starIdx >= 0) {
      setStars((prev) => prev.map((s, i) => (i === starIdx ? { ...s, taken: true } : s)));
      starsTakenRef.current += 1;
      setStarsTaken(starsTakenRef.current);
      scoreRef.current += SCORE_STAR;
      setScore(scoreRef.current);
    }

    if (
      bonusDiamond?.active &&
      nr === bonusDiamond.r &&
      nc === bonusDiamond.c
    ) {
      scoreRef.current += SCORE_DIAMOND;
      setScore(scoreRef.current);
      setBonusDiamond(null);
      flashMsg("יהלום! +50 💎", 1000);
    }

    if (nr === exit.r && nc === exit.c) {
      if (!hasKeyRef.current) {
        flashMsg("צריך למצוא את המפתח קודם!");
        return;
      }
      completeMaze();
    }
  };

  const tryMoveRef = useRef(tryMove);
  tryMoveRef.current = tryMove;

  useEffect(() => {
    if (!gameRunning || gameOver) return undefined;
    const onKey = (e) => {
      const moves = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
        KeyW: [-1, 0],
        KeyS: [1, 0],
        KeyA: [0, -1],
        KeyD: [0, 1],
      };
      const mv = moves[e.code];
      if (!mv) return;
      e.preventDefault();
      tryMoveRef.current(mv[0], mv[1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameRunning, gameOver]);

  const handleSwipeEnd = (clientX, clientY) => {
    const s = swipeRef.current;
    if (!s.active) return;
    s.active = false;
    const dx = clientX - s.x;
    const dy = clientY - s.y;
    const min = 28;
    if (Math.abs(dx) < min && Math.abs(dy) < min) return;
    if (Math.abs(dx) > Math.abs(dy)) tryMove(0, dx > 0 ? 1 : -1);
    else tryMove(dy > 0 ? 1 : -1, 0);
  };

  const goalArrow = () => {
    const target = hasKey ? exit : keyCell || exit;
    const dr = target.r - player.r;
    const dc = target.c - player.c;
    if (Math.abs(dr) >= Math.abs(dc)) return dr < 0 ? "↑" : "↓";
    return dc < 0 ? "←" : "→";
  };

  const isHint = (r, c) => hintCell && hintCell.r === r && hintCell.c === c;
  const isStartCell = (r, c) => start.r === r && start.c === c;
  const isExitCell = (r, c) => exit.r === r && exit.c === c;
  const isKeyCell = (r, c) => keyCell && keyCell.r === r && keyCell.c === c;
  const isBonusDiamond = (r, c) =>
    bonusDiamond?.active && bonusDiamond.r === r && bonusDiamond.c === c;
  const isWallHit = (r, c) => wallHitCell && wallHitCell.r === r && wallHitCell.c === c;

  return (
    <>
      <style>{`
        @keyframes mazeWallHit {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          50% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
        }
      `}</style>
    <div
      id="game-wrapper"
      className="relative isolate flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-900 text-white select-none"
      dir="rtl"
    >
      {showIntro ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <img src={IMG_LEO} alt="" className="h-20 w-20 object-contain drop-shadow-lg" />
          <h2 className="text-xl font-extrabold text-yellow-300">מרוץ מבוכים — ליאו</h2>
          <p className="max-w-sm text-sm font-semibold text-lime-100">
            פתרו כמה שיותר מבוכים לפני שנגמר הזמן!
          </p>
          <ul className="max-w-sm space-y-1 text-sm text-gray-300">
            <li>🔑 מצאו מפתח → 🚪 הגיעו לשער</li>
            <li>⭐ +20 · 💎 +50 · מבוך +100</li>
            <li>כל מבוך חדש — אספו ורוצו הלאה!</li>
          </ul>
          <button
            type="button"
            onClick={startGame}
            className="min-h-[48px] rounded-xl bg-yellow-400 px-8 py-3 text-base font-bold text-black"
          >
            התחל משחק
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-1 pb-1 pt-1">
          <div className="pointer-events-none absolute left-1/2 top-1.5 z-[80] w-[98vw] max-w-lg -translate-x-1/2 rounded-xl border border-yellow-400/30 bg-black/70 px-2 py-2 text-center text-xs font-bold leading-relaxed sm:text-sm">
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
              <span className="text-amber-300">ניקוד: {score}</span>
              <span>⏱ {timeLeft}s</span>
              <span className="text-emerald-300">מבוכים: {mazesCompleted}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs">
              <span>{hasKey ? "🔑 יש מפתח!" : "🔑 אין מפתח"}</span>
              <span>⭐ {starsTaken}</span>
              <span>טעויות: {mistakes}/{settings.maxMistakes}</span>
              {bonusDiamond?.active ? (
                <span className="animate-pulse text-cyan-300">💎 {bonusDiamond.secondsLeft}s</span>
              ) : null}
            </div>
          </div>

          <p className="pointer-events-none absolute left-1/2 top-[5.25rem] z-[80] max-w-[95vw] -translate-x-1/2 px-2 text-center text-[11px] font-semibold leading-snug text-lime-200 sm:top-[4.4rem] sm:text-xs">
            🎯 {hasKey ? "הגיעו לשער!" : "מצאו את המפתח!"}
            {isEasy ? ` כיוון: ${goalArrow()}` : ""}
            {mazeId ? ` · מבוך #${mazeId}` : ""}
          </p>

          <div className="relative z-0 mx-auto mt-16 flex h-full min-h-0 w-full max-w-[1180px] flex-1 flex-col overflow-hidden rounded-lg border-4 border-yellow-400 bg-gradient-to-b from-emerald-950/80 to-slate-950 shadow-lg sm:mt-[4.25rem] md:mt-14">
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-emerald-950/35 via-slate-950 to-slate-900 p-1 sm:p-2">
              {statusMsg ? (
                <div className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-xl bg-orange-600/95 px-4 py-2 text-sm font-bold text-white shadow-lg">
                  {statusMsg}
                </div>
              ) : null}

              {diamondBanner ? (
                <div className="pointer-events-none absolute left-1/2 top-12 z-30 -translate-x-1/2 animate-pulse rounded-xl border border-cyan-300/60 bg-cyan-950/90 px-4 py-2 text-sm font-extrabold text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.45)]">
                  יהלום הופיע! 💎
                </div>
              ) : null}

              <div
                ref={mazeLayoutRef}
                className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 max-md:landscape:flex-row max-md:landscape:gap-2 md:flex-row md:gap-3 md:overflow-hidden"
              >
                <div
                  ref={boardRef}
                  className="mx-auto w-fit max-w-full shrink-0 rounded-2xl border-[3px] border-amber-700/50 bg-amber-950/20 p-1 shadow-inner sm:p-1.5 md:mx-0"
                  style={{ touchAction: "manipulation" }}
                  onTouchStart={(e) => {
                    const t = e.touches[0];
                    if (!t) return;
                    swipeRef.current = { x: t.clientX, y: t.clientY, active: true };
                  }}
                  onTouchEnd={(e) => {
                    const t = e.changedTouches[0];
                    if (t) handleSwipeEnd(t.clientX, t.clientY);
                  }}
                >
                  <div
                    className="grid gap-[2px] sm:gap-1"
                    dir="ltr"
                    style={{
                      gridTemplateColumns: `repeat(${settings.cols}, ${cellPx}px)`,
                    }}
                  >
                  {maze.map((row, r) =>
                    row.map((cell, c) => {
                      const isPlayer = player.r === r && player.c === c;
                      const isWall = cell === 1;
                      const star = stars.find((s) => !s.taken && s.r === r && s.c === c);
                      const onPath = !isWall;

                      const isWallHitCell = isWallHit(r, c);

                      return (
                        <div
                          key={`${r}-${c}`}
                          className={`relative flex items-center justify-center overflow-hidden rounded-md sm:rounded-lg ${
                            isWall
                              ? isWallHitCell
                                ? "bg-gradient-to-br from-orange-600/95 via-red-700/90 to-red-900/95 shadow-[inset_0_0_10px_rgba(251,146,60,0.5)] ring-2 ring-orange-400 animate-[mazeWallHit_0.4s_ease-in-out]"
                                : "bg-gradient-to-br from-[#0a3d22] via-[#052e16] to-[#021a0f] shadow-[inset_0_3px_8px_rgba(0,0,0,0.55)] ring-1 ring-[#031a0e]"
                              : isExitCell(r, c)
                                ? hasKey
                                  ? "bg-amber-100/35 ring-2 ring-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.5)]"
                                  : "bg-slate-700/40 ring-2 ring-slate-500/60"
                                : isBonusDiamond(r, c)
                                  ? "animate-pulse bg-cyan-300/30 ring-2 ring-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.55)]"
                                  : isKeyCell(r, c) && !hasKey
                                    ? "bg-yellow-200/25 ring-2 ring-yellow-400/70"
                                    : isHint(r, c)
                                      ? "bg-sky-300/35 ring-2 ring-sky-400 animate-pulse"
                                      : isStartCell(r, c)
                                        ? "bg-teal-500/45 ring-1 ring-teal-200/50"
                                        : "bg-gradient-to-br from-teal-500/50 via-emerald-400/40 to-cyan-600/35 ring-1 ring-teal-300/30 shadow-[inset_0_1px_4px_rgba(255,255,255,0.1)]"
                          }`}
                          style={{
                            width: cellPx,
                            height: cellPx,
                          }}
                        >
                          {isWall ? (
                            <span
                              className={`text-sm sm:text-base ${isWallHitCell ? "opacity-95" : "opacity-75"}`}
                              aria-hidden
                            >
                              🌿
                            </span>
                          ) : null}
                          {isPlayer ? (
                            <img
                              src={IMG_LEO}
                              alt=""
                              className="absolute z-10 h-[82%] w-[82%] object-contain drop-shadow-lg"
                              draggable={false}
                            />
                          ) : null}
                          {!isPlayer && star ? (
                            <img
                              src={IMG_STAR}
                              alt=""
                              className="h-[68%] w-[68%] object-contain drop-shadow-md"
                              draggable={false}
                            />
                          ) : null}
                          {!isPlayer && !star && isKeyCell(r, c) && !hasKey ? (
                            <span className="text-xl drop-shadow-md sm:text-2xl" aria-hidden>
                              🔑
                            </span>
                          ) : null}
                          {!isPlayer && !star && isBonusDiamond(r, c) ? (
                            <img
                              src={IMG_DIAMOND}
                              alt=""
                              className="h-[70%] w-[70%] animate-pulse object-contain drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                              draggable={false}
                            />
                          ) : null}
                          {!isPlayer && !star && isExitCell(r, c) ? (
                            <div className="flex flex-col items-center">
                              <span className="text-lg sm:text-xl">{hasKey ? "🚪" : "🔒"}</span>
                              <span className="text-[7px] font-extrabold text-amber-100 sm:text-[8px]">
                                {hasKey ? "שער" : "נעול"}
                              </span>
                            </div>
                          ) : null}
                          {!isPlayer && !star && isStartCell(r, c) && !isExitCell(r, c) ? (
                            <span className="absolute bottom-0 text-[7px] font-bold text-lime-200/90 sm:text-[8px]">
                              🏁
                            </span>
                          ) : null}
                          {!isWall &&
                          !isPlayer &&
                          !star &&
                          !isExitCell(r, c) &&
                          !isStartCell(r, c) &&
                          !isKeyCell(r, c) &&
                          !isBonusDiamond(r, c) &&
                          onPath ? (
                            <span className="pointer-events-none absolute inset-0.5 rounded border border-dashed border-teal-100/15" />
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div
                dir="ltr"
                className="mx-auto grid w-full max-w-[252px] shrink-0 grid-cols-3 gap-2 pb-1 pt-1 max-md:landscape:mx-0 max-md:landscape:max-w-[196px] max-md:landscape:pb-0 md:mx-0 md:max-w-[196px] md:pb-0 md:pt-0"
              >
                <span />
                <button
                  type="button"
                  className="min-h-[48px] rounded-2xl bg-yellow-400 text-xl font-bold text-black shadow-lg active:scale-95 sm:min-h-[50px]"
                  style={{ touchAction: "manipulation" }}
                  onClick={() => tryMove(-1, 0)}
                  aria-label="למעלה"
                >
                  ↑
                </button>
                <span />
                <button
                  type="button"
                  className="min-h-[48px] rounded-2xl bg-yellow-400 text-xl font-bold text-black shadow-lg active:scale-95 sm:min-h-[50px]"
                  style={{ touchAction: "manipulation" }}
                  onClick={() => tryMove(0, -1)}
                  aria-label="שמאלה"
                >
                  ←
                </button>
                <button
                  type="button"
                  className="min-h-[48px] rounded-2xl bg-yellow-400 text-xl font-bold text-black shadow-lg active:scale-95 sm:min-h-[50px]"
                  style={{ touchAction: "manipulation" }}
                  onClick={() => tryMove(1, 0)}
                  aria-label="למטה"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="min-h-[48px] rounded-2xl bg-yellow-400 text-xl font-bold text-black shadow-lg active:scale-95 sm:min-h-[50px]"
                  style={{ touchAction: "manipulation" }}
                  onClick={() => tryMove(0, 1)}
                  aria-label="ימינה"
                >
                  →
                </button>
              </div>
              </div>
            </div>

            {gameOver ? (
              <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 overflow-y-auto bg-black/85 px-4 py-6 text-center">
                <h2 className={`text-2xl font-extrabold sm:text-4xl ${won ? "text-emerald-300" : "text-rose-400"}`}>
                  {won ? "כל הכבוד!" : "נגמר המשחק"}
                </h2>
                <p className="max-w-md text-sm font-semibold text-white/90 sm:text-base">
                  מבוכים: {mazesCompleted} · כוכבים: {starsTaken} · טעויות: {mistakes}
                </p>
                <p className="max-w-md text-sm font-semibold text-amber-200 sm:text-base">
                  ניקוד: {score}
                  {won && timeLeft > 0 ? ` · זמן שנשאר: ${timeLeft}s` : ""}
                </p>
                <p className="text-xs text-gray-300 sm:text-sm">
                  {won ? "ממתין לסיכום מטבעות..." : "הפסד = 0 מטבעות"}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
    </>
  );
}

