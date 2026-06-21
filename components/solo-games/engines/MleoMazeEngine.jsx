import { useEffect, useRef, useState } from "react";

const IMG_LEO = "/images/leo.png";
const IMG_STAR = "/images/candy/star.png";
const IMG_EXIT = "/images/diamond.png";

const SCORE_STAR = 20;
const SCORE_EXIT = 100;

const DIFFICULTY_SETTINGS = {
  easy: { size: 5, timeSec: 200, maxMistakes: 18, starCount: 2, hintAfter: 3, cellMin: 52 },
  medium: { size: 7, timeSec: 160, maxMistakes: 12, starCount: 4, hintAfter: 99, cellMin: 40 },
  hard: { size: 9, timeSec: 130, maxMistakes: 10, starCount: 6, hintAfter: 99, cellMin: 34 },
};

const MAZE_RULES = {
  easy: { minSteps: 7, minTurns: 2, minStartExitDist: 4, minDeadEnds: 1, minStarsOffPath: 1 },
  medium: { minSteps: 11, minTurns: 4, minStartExitDist: 6, minDeadEnds: 3, minStarsOffPath: 2 },
  hard: { minSteps: 16, minTurns: 6, minStartExitDist: 8, minDeadEnds: 5, minStarsOffPath: 3 },
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

function generateMaze(size, seed) {
  const rng = mulberry32(seed);
  const grid = Array.from({ length: size }, () => Array(size).fill(1));
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
      .filter(([nr, nc]) => nr > 0 && nc > 0 && nr < size - 1 && nc < size - 1 && grid[nr][nc] === 1);

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
  const size = maze.length;
  let dead = 0;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
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

function placeStars(maze, count, start, exit, rng, minOffPath) {
  const route = findPath(maze, start, exit);
  const shortest = new Set(route.map((p) => `${p.r},${p.c}`));
  const branchPool = pathCells(maze).filter(
    (p) =>
      !shortest.has(`${p.r},${p.c}`) &&
      !(p.r === start.r && p.c === start.c) &&
      !(p.r === exit.r && p.c === exit.c)
  );
  const routePool = route.filter(
    (p) =>
      !(p.r === start.r && p.c === start.c) &&
      !(p.r === exit.r && p.c === exit.c)
  );
  const used = new Set();
  const stars = [];

  const takeFrom = (pool, n) => {
    const shuffled = shuffleWithRng(
      pool.filter((p) => !used.has(`${p.r},${p.c}`)),
      rng
    );
    for (const cell of shuffled) {
      if (n <= 0 || stars.length >= count) break;
      const key = `${cell.r},${cell.c}`;
      if (used.has(key)) continue;
      used.add(key);
      stars.push({ ...cell, id: stars.length, taken: false });
      n -= 1;
    }
  };

  takeFrom(branchPool, minOffPath);
  takeFrom(shuffleWithRng([...branchPool, ...routePool], rng), count - stars.length);

  return stars.slice(0, count);
}

function buildMazeLevel(size, starCount, difficulty) {
  const rules = MAZE_RULES[difficulty] || MAZE_RULES.medium;

  for (let attempt = 0; attempt < 48; attempt += 1) {
    const seed =
      ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) + attempt * 9973) >>> 0;
    const rng = mulberry32(seed);
    const maze = generateMaze(size, seed);

    if (countDeadEnds(maze) < rules.minDeadEnds) continue;

    const { start, exit, route } = pickStartExit(maze, rng, rules.minStartExitDist);
    const steps = route.length - 1;
    if (steps < rules.minSteps) continue;
    if (countTurns(route) < rules.minTurns) continue;

    const stars = placeStars(maze, starCount, start, exit, rng, rules.minStarsOffPath);
    if (stars.length < starCount) continue;

    const shortest = new Set(route.map((p) => `${p.r},${p.c}`));
    const offPath = stars.filter((s) => !shortest.has(`${s.r},${s.c}`)).length;
    if (offPath < rules.minStarsOffPath) continue;

    return {
      maze,
      start,
      exit,
      stars,
      mazeId: (seed % 9000) + 1000,
    };
  }

  const seed = Date.now() >>> 0;
  const maze = generateMaze(size, seed);
  const start = { r: 1, c: 1 };
  const exit = { r: size - 2, c: size - 2 };
  return {
    maze,
    start,
    exit,
    stars: placeStars(maze, starCount, start, exit, mulberry32(seed), 1),
    mazeId: (seed % 9000) + 1000,
  };
}

function computeWinScore(starsTaken, timeRemaining, mistakes, settings) {
  const base = starsTaken * SCORE_STAR + SCORE_EXIT;
  const timeBonus = timeRemaining * 2;
  const mistakeBonus = Math.max(0, settings.maxMistakes - mistakes) * 5;
  return base + timeBonus + mistakeBonus;
}

function nextHintCell(maze, player, exit) {
  const route = findPath(maze, player, exit);
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
  const swipeRef = useRef({ x: 0, y: 0, active: false });
  const hintTimerRef = useRef(null);

  const scoreRef = useRef(0);
  const mistakesRef = useRef(0);
  const starsTakenRef = useRef(0);
  const timeLeftRef = useRef(160);

  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [showIntro, setShowIntro] = useState(!autoStart);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [maze, setMaze] = useState([]);
  const [stars, setStars] = useState([]);
  const [start, setStart] = useState({ r: 1, c: 1 });
  const [exit, setExit] = useState({ r: 3, c: 3 });
  const [mazeId, setMazeId] = useState(0);
  const [player, setPlayer] = useState({ r: 1, c: 1 });
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [starsTaken, setStarsTaken] = useState(0);
  const [timeLeft, setTimeLeft] = useState(160);
  const [wallMsg, setWallMsg] = useState("");
  const [hintCell, setHintCell] = useState(null);

  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  useEffect(
    () => () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    },
    []
  );

  const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;
  const isEasy = difficulty === "easy";

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
    });
  };

  const endGame = (didWin, remaining) => {
    setGameRunning(false);
    setGameOver(true);
    setWon(didWin);
    const finalScore = didWin
      ? computeWinScore(starsTakenRef.current, remaining, mistakesRef.current, settings)
      : 0;
    scoreRef.current = finalScore;
    setScore(finalScore);
    fireSessionEnd(didWin, remaining, finalScore);
  };

  const flashWallMsg = () => {
    setWallMsg("יש קיר!");
    window.setTimeout(() => setWallMsg(""), 1200);
  };

  const pulseHint = (nextPlayer) => {
    if (!isEasy || mistakesRef.current < settings.hintAfter) {
      setHintCell(null);
      return;
    }
    const cell = nextHintCell(maze, nextPlayer, exit);
    setHintCell(cell);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHintCell(null), 2200);
  };

  const addMistake = () => {
    mistakesRef.current += 1;
    setMistakes(mistakesRef.current);
    flashWallMsg();
    pulseHint(player);
    if (mistakesRef.current >= settings.maxMistakes) {
      endGame(false, timeLeftRef.current);
    }
  };

  const startGame = () => {
    const level = buildMazeLevel(settings.size, settings.starCount, difficulty);
    sessionEndFiredRef.current = false;
    playStartedAtRef.current = Date.now();
    scoreRef.current = 0;
    mistakesRef.current = 0;
    starsTakenRef.current = 0;
    timeLeftRef.current = settings.timeSec;

    setScore(0);
    setMistakes(0);
    setStarsTaken(0);
    setShowIntro(false);
    setGameOver(false);
    setWon(false);
    setWallMsg("");
    setHintCell(null);
    setTimeLeft(settings.timeSec);
    setMaze(level.maze);
    setStart(level.start);
    setExit(level.exit);
    setMazeId(level.mazeId);
    setPlayer(level.start);
    setStars(level.stars);
    setGameRunning(true);
  };

  useEffect(() => {
    if (autoStart && !gameRunning && !gameOver) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (!gameRunning) return undefined;
    if (timeLeft <= 0) {
      endGame(false, 0);
      return undefined;
    }
    const t = setTimeout(() => {
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameRunning, timeLeft]);

  const tryMove = (dr, dc) => {
    if (!gameRunning) return;
    const nr = player.r + dr;
    const nc = player.c + dc;
    if (!maze[nr] || maze[nr][nc] === 1) {
      addMistake();
      return;
    }

    const next = { r: nr, c: nc };
    setPlayer(next);
    setHintCell(null);

    const starIdx = stars.findIndex((s) => !s.taken && s.r === nr && s.c === nc);
    if (starIdx >= 0) {
      setStars((prev) => prev.map((s, i) => (i === starIdx ? { ...s, taken: true } : s)));
      starsTakenRef.current += 1;
      setStarsTaken(starsTakenRef.current);
      scoreRef.current += SCORE_STAR;
      setScore(scoreRef.current);
    }

    if (nr === exit.r && nc === exit.c) {
      endGame(true, timeLeftRef.current);
    }
  };

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

  const exitDirArrow = () => {
    const dr = exit.r - player.r;
    const dc = exit.c - player.c;
    if (Math.abs(dr) >= Math.abs(dc)) return dr < 0 ? "↑" : "↓";
    return dc < 0 ? "←" : "→";
  };

  const isHint = (r, c) => hintCell && hintCell.r === r && hintCell.c === c;
  const isStartCell = (r, c) => start.r === r && start.c === c;
  const isExitCell = (r, c) => exit.r === r && exit.c === c;

  return (
    <div
      id="game-wrapper"
      className="relative isolate flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-900 text-white select-none"
      dir="rtl"
    >
      {showIntro ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <img src={IMG_LEO} alt="" className="h-20 w-20 object-contain drop-shadow-lg" />
          <h2 className="text-xl font-extrabold text-yellow-300">מבוך ליאו</h2>
          <p className="max-w-sm text-sm font-semibold text-lime-100">
            הובילו את ליאו אל השער ואספו כוכבים בדרך!
          </p>
          <ul className="max-w-sm space-y-1 text-sm text-gray-300">
            <li>⭐ +20 · 🚪 +100</li>
            <li>כל משחק — מבוך חדש!</li>
            <li>קיר = טעות · נגמר זמן = הפסד</li>
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
          <div className="pointer-events-none absolute left-1/2 top-2 z-[80] max-w-[98vw] -translate-x-1/2 rounded-lg bg-black/65 px-3 py-2 text-center text-[11px] font-bold leading-snug sm:text-sm">
            <span className="text-amber-300">ניקוד: {score}</span>
            {" · "}
            <span>⭐ {starsTaken}/{settings.starCount}</span>
            {" · "}
            <span>טעויות: {mistakes}/{settings.maxMistakes}</span>
            {" · "}
            <span>{timeLeft}s</span>
          </div>

          <p className="pointer-events-none absolute left-1/2 top-[2.55rem] z-[80] max-w-[95vw] -translate-x-1/2 truncate text-center text-[10px] font-semibold text-lime-200 sm:top-[2.7rem] sm:text-xs">
            🎯 הובילו את ליאו אל השער!
            {isEasy ? ` כיוון: ${exitDirArrow()}` : ""}
            {mazeId ? ` · מבוך #${mazeId}` : ""}
          </p>

          <div className="relative z-0 mx-auto mt-14 flex h-full min-h-0 w-full max-w-[1180px] flex-1 flex-col overflow-hidden rounded-lg border-4 border-yellow-400 bg-gradient-to-b from-emerald-950/80 to-slate-950 shadow-lg sm:mt-16">
            <div
              className="relative flex min-h-0 flex-1 flex-col items-center justify-between gap-2 overflow-hidden bg-gradient-to-b from-emerald-950/35 via-slate-950 to-slate-900 p-2 sm:p-3"
            >
              {wallMsg ? (
                <div className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-xl bg-orange-600/95 px-4 py-2 text-sm font-bold text-white shadow-lg">
                  {wallMsg}
                </div>
              ) : null}

              <div
                ref={boardRef}
                className="mx-auto w-full max-w-[min(94vw,460px)] shrink-0 rounded-2xl border-[3px] border-amber-700/50 bg-amber-950/20 p-1.5 shadow-inner sm:p-2"
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
                  className="grid gap-[4px] sm:gap-1"
                  style={{
                    gridTemplateColumns: `repeat(${settings.size}, minmax(0, 1fr))`,
                  }}
                >
                  {maze.map((row, r) =>
                    row.map((cell, c) => {
                      const isPlayer = player.r === r && player.c === c;
                      const isWall = cell === 1;
                      const star = stars.find((s) => !s.taken && s.r === r && s.c === c);
                      const onPath = !isWall;

                      return (
                        <div
                          key={`${r}-${c}`}
                          className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-lg sm:rounded-xl ${
                            isWall
                              ? "bg-gradient-to-br from-green-800 via-emerald-900 to-green-950 shadow-[inset_0_2px_6px_rgba(0,0,0,0.45)] ring-1 ring-green-950"
                              : isExitCell(r, c)
                                ? "bg-amber-100/30 ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                                : isHint(r, c)
                                  ? "bg-sky-300/35 ring-2 ring-sky-400 animate-pulse"
                                  : isStartCell(r, c)
                                    ? "bg-lime-200/25 ring-1 ring-lime-300/60"
                                    : "bg-gradient-to-br from-amber-50/25 via-lime-100/20 to-yellow-100/15 ring-1 ring-amber-200/20"
                          }`}
                          style={{ minHeight: settings.cellMin }}
                        >
                          {isWall ? (
                            <span className="text-base opacity-70 sm:text-lg" aria-hidden>
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
                          {!isPlayer && !star && isExitCell(r, c) ? (
                            <div className="flex flex-col items-center">
                              <img src={IMG_EXIT} alt="" className="h-[62%] w-[62%] object-contain" draggable={false} />
                              <span className="text-[8px] font-extrabold text-amber-100 sm:text-[9px]">שער</span>
                            </div>
                          ) : null}
                          {!isPlayer && !star && isStartCell(r, c) && !isExitCell(r, c) ? (
                            <span className="absolute bottom-0.5 text-[8px] font-bold text-lime-200/90">🏁</span>
                          ) : null}
                          {!isWall && !isPlayer && !star && !isExitCell(r, c) && !isStartCell(r, c) && onPath ? (
                            <span className="pointer-events-none absolute inset-1 rounded-md border border-dashed border-amber-100/10" />
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mx-auto grid w-full max-w-[252px] shrink-0 grid-cols-3 gap-2 pb-1 pt-1">
                <span />
                <button
                  type="button"
                  className="min-h-[50px] rounded-2xl bg-yellow-400 text-xl font-bold text-black shadow-lg active:scale-95"
                  style={{ touchAction: "manipulation" }}
                  onClick={() => tryMove(-1, 0)}
                  aria-label="למעלה"
                >
                  ↑
                </button>
                <span />
                <button
                  type="button"
                  className="min-h-[50px] rounded-2xl bg-yellow-400 text-xl font-bold text-black shadow-lg active:scale-95"
                  style={{ touchAction: "manipulation" }}
                  onClick={() => tryMove(0, -1)}
                  aria-label="שמאלה"
                >
                  →
                </button>
                <button
                  type="button"
                  className="min-h-[50px] rounded-2xl bg-yellow-400 text-xl font-bold text-black shadow-lg active:scale-95"
                  style={{ touchAction: "manipulation" }}
                  onClick={() => tryMove(1, 0)}
                  aria-label="למטה"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="min-h-[50px] rounded-2xl bg-yellow-400 text-xl font-bold text-black shadow-lg active:scale-95"
                  style={{ touchAction: "manipulation" }}
                  onClick={() => tryMove(0, 1)}
                  aria-label="ימינה"
                >
                  ←
                </button>
              </div>
            </div>

            {gameOver ? (
              <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 overflow-y-auto bg-black/85 px-4 py-6 text-center">
                <h2 className={`text-2xl font-extrabold sm:text-4xl ${won ? "text-emerald-300" : "text-rose-400"}`}>
                  {won ? "כל הכבוד! מצאתם את השער!" : "לא הספקתם הפעם"}
                </h2>
                <p className="max-w-md text-sm font-semibold text-white/90 sm:text-base">
                  ניקוד: {score} · כוכבים: {starsTaken}/{settings.starCount} · טעויות: {mistakes}
                  {won ? ` · זמן שנשאר: ${timeLeft}s` : ""}
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
  );
}
