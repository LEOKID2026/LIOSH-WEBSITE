import { useEffect, useRef, useState } from "react";

const BG_MAZE = "/images/game-park.png";
const IMG_LEO = "/images/leo.png";
const IMG_STAR = "/images/candy/star.png";
const IMG_EXIT = "/images/diamond.png";

const SCORE_STAR = 20;
const SCORE_EXIT = 100;

const DIFFICULTY_SETTINGS = {
  easy: { size: 5, timeSec: 180, maxMistakes: 15, starCount: 2, hintAfter: 3 },
  medium: { size: 7, timeSec: 150, maxMistakes: 12, starCount: 4, hintAfter: 99 },
  hard: { size: 9, timeSec: 120, maxMistakes: 10, starCount: 6, hintAfter: 99 },
};

function generateMaze(size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(1));
  const stack = [[1, 1]];
  grid[1][1] = 0;
  const dirs = [
    [0, 2],
    [2, 0],
    [0, -2],
    [-2, 0],
  ];
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const neighbors = dirs
      .map(([dr, dc]) => [r + dr, c + dc, r + dr / 2, c + dc / 2])
      .filter(([nr, nc]) => nr > 0 && nc > 0 && nr < size - 1 && nc < size - 1 && grid[nr][nc] === 1);
    if (!neighbors.length) stack.pop();
    else {
      const [nr, nc, wr, wc] = neighbors[Math.floor(Math.random() * neighbors.length)];
      grid[nr][nc] = 0;
      grid[wr][wc] = 0;
      stack.push([nr, nc]);
    }
  }
  grid[size - 2][size - 2] = 0;
  return grid;
}

function placeStars(maze, count, start, exit) {
  const cells = [];
  for (let r = 0; r < maze.length; r += 1) {
    for (let c = 0; c < maze[r].length; c += 1) {
      if (maze[r][c] === 0 && !(r === start.r && c === start.c) && !(r === exit.r && c === exit.c)) {
        cells.push({ r, c });
      }
    }
  }
  cells.sort(() => Math.random() - 0.5);
  return cells.slice(0, count).map((cell, i) => ({ ...cell, id: i, taken: false }));
}

function findPathCells(maze, start, exit) {
  const key = (r, c) => `${r},${c}`;
  const queue = [{ r: start.r, c: start.c, path: [] }];
  const seen = new Set([key(start.r, start.c)]);

  while (queue.length) {
    const node = queue.shift();
    if (node.r === exit.r && node.c === exit.c) {
      return node.path.concat([{ r: node.r, c: node.c }]);
    }
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
        queue.push({ r: nr, c: nc, path: node.path.concat([{ r: node.r, c: node.c }]) });
      }
    }
  }
  return [];
}

function computeWinScore(starsTaken, timeRemaining, mistakes, settings) {
  const base = starsTaken * SCORE_STAR + SCORE_EXIT;
  const timeBonus = timeRemaining * 2;
  const mistakeBonus = Math.max(0, settings.maxMistakes - mistakes) * 5;
  return base + timeBonus + mistakeBonus;
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

  const scoreRef = useRef(0);
  const mistakesRef = useRef(0);
  const starsTakenRef = useRef(0);
  const timeLeftRef = useRef(150);

  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [showIntro, setShowIntro] = useState(!autoStart);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [maze, setMaze] = useState([]);
  const [stars, setStars] = useState([]);
  const [player, setPlayer] = useState({ r: 1, c: 1 });
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [starsTaken, setStarsTaken] = useState(0);
  const [timeLeft, setTimeLeft] = useState(150);
  const [wallMsg, setWallMsg] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [hintCells, setHintCells] = useState([]);

  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;
  const exit = { r: settings.size - 2, c: settings.size - 2 };
  const start = { r: 1, c: 1 };
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
    setWallMsg("אי אפשר לעבור דרך קיר!");
    window.setTimeout(() => setWallMsg(""), 1400);
  };

  const updateHint = (nextPlayer, nextMistakes) => {
    if (!isEasy || nextMistakes < settings.hintAfter) {
      setShowHint(false);
      setHintCells([]);
      return;
    }
    const path = findPathCells(maze, nextPlayer, exit);
    setHintCells(path.slice(0, Math.min(5, path.length)));
    setShowHint(true);
  };

  const addMistake = () => {
    mistakesRef.current += 1;
    setMistakes(mistakesRef.current);
    flashWallMsg();
    updateHint(player, mistakesRef.current);
    if (mistakesRef.current >= settings.maxMistakes) {
      endGame(false, timeLeftRef.current);
    }
  };

  const startGame = () => {
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
    setShowHint(false);
    setHintCells([]);
    setTimeLeft(settings.timeSec);

    const m = generateMaze(settings.size);
    setMaze(m);
    setPlayer(start);
    setStars(placeStars(m, settings.starCount, start, exit));
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
    updateHint(next, mistakesRef.current);

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

  const isHintCell = (r, c) => hintCells.some((h) => h.r === r && h.c === c);

  const cellClass = (r, c, isWall, isExit, isPlayer, star) => {
    if (isWall) {
      return "bg-gradient-to-br from-emerald-800 via-green-900 to-emerald-950 shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)] ring-1 ring-emerald-950/80";
    }
    if (isExit) {
      return "bg-amber-100/25 ring-2 ring-amber-400 animate-pulse";
    }
    if (showHint && isHintCell(r, c)) {
      return "bg-sky-300/25 ring-2 ring-sky-400/70";
    }
    if (isPlayer) {
      return "bg-lime-200/20";
    }
    if (star) {
      return "bg-lime-100/15";
    }
    return "bg-gradient-to-br from-lime-200/25 via-green-100/10 to-lime-300/20";
  };

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
          <p className="max-w-sm text-sm text-gray-200">
            הובילו את ליאו אל השער ואספו כוכבים בדרך!
          </p>
          <ul className="max-w-sm space-y-1 text-sm text-gray-300">
            <li>⭐ +20 על כל כוכב</li>
            <li>🚪 +100 על הגעה לשער</li>
            <li>קיר = טעות · יותר מדי טעויות = הפסד</li>
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
        <div className="flex min-h-0 w-full flex-1 flex-col px-1 pb-1 pt-1">
          <div className="pointer-events-none absolute left-1/2 top-2 z-[80] max-w-[98vw] -translate-x-1/2 rounded-lg bg-black/65 px-3 py-2 text-center text-[11px] font-bold leading-snug sm:text-sm">
            <span className="text-amber-300">ניקוד: {score}</span>
            {" · "}
            <span>⭐ {starsTaken}/{settings.starCount}</span>
            {" · "}
            <span>טעויות: {mistakes}/{settings.maxMistakes}</span>
            {" · "}
            <span>{timeLeft}s</span>
          </div>

          <p className="pointer-events-none absolute left-1/2 top-[2.6rem] z-[80] max-w-[95vw] -translate-x-1/2 truncate text-center text-[10px] font-semibold text-lime-200 sm:top-[2.75rem] sm:text-xs">
            🎯 הובילו את ליאו אל השער ואספו כוכבים!
            {isEasy ? ` · רמז: ${exitDirArrow()}` : ""}
          </p>

          <div className="relative z-0 mx-auto mt-14 flex h-full min-h-0 w-full max-w-[1180px] flex-1 flex-col overflow-hidden rounded-lg border-4 border-yellow-400 shadow-lg sm:mt-16">
            <div
              className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-hidden p-2 sm:gap-3 sm:p-3"
              style={{
                backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(0,0,0,0.2)), url(${BG_MAZE})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {wallMsg ? (
                <div className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-xl bg-rose-600/90 px-4 py-2 text-sm font-bold text-white shadow-lg">
                  {wallMsg}
                </div>
              ) : null}

              <div
                ref={boardRef}
                className="mx-auto w-full max-w-[min(92vw,420px)] shrink-0 rounded-2xl border-2 border-emerald-700/60 bg-emerald-950/30 p-1.5 shadow-inner sm:max-w-[min(88vw,480px)] sm:p-2"
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
                  className="grid gap-[3px] sm:gap-1"
                  style={{ gridTemplateColumns: `repeat(${settings.size}, minmax(0, 1fr))` }}
                >
                  {maze.map((row, r) =>
                    row.map((cell, c) => {
                      const isPlayer = player.r === r && player.c === c;
                      const isExit = exit.r === r && exit.c === c;
                      const star = stars.find((s) => !s.taken && s.r === r && s.c === c);
                      const isWall = cell === 1;
                      return (
                        <div
                          key={`${r}-${c}`}
                          className={`flex aspect-square min-h-[36px] items-center justify-center rounded-md sm:min-h-[42px] ${cellClass(
                            r,
                            c,
                            isWall,
                            isExit,
                            isPlayer,
                            star
                          )}`}
                        >
                          {isPlayer ? (
                            <img src={IMG_LEO} alt="" className="h-[88%] w-[88%] object-contain drop-shadow-md" draggable={false} />
                          ) : star ? (
                            <img src={IMG_STAR} alt="" className="h-[72%] w-[72%] object-contain drop-shadow" draggable={false} />
                          ) : isExit && !isWall ? (
                            <div className="flex flex-col items-center">
                              <img src={IMG_EXIT} alt="" className="h-[68%] w-[68%] object-contain" draggable={false} />
                              <span className="text-[8px] font-bold text-amber-200 sm:text-[9px]">שער</span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mx-auto grid w-full max-w-[240px] shrink-0 grid-cols-3 gap-2 px-2 pb-1">
                <span />
                <button
                  type="button"
                  className="min-h-[48px] rounded-xl bg-yellow-400 text-xl font-bold text-black shadow-md active:scale-95"
                  style={{ touchAction: "manipulation" }}
                  onClick={() => tryMove(-1, 0)}
                  aria-label="למעלה"
                >
                  ↑
                </button>
                <span />
                <button
                  type="button"
                  className="min-h-[48px] rounded-xl bg-yellow-400 text-xl font-bold text-black shadow-md active:scale-95"
                  style={{ touchAction: "manipulation" }}
                  onClick={() => tryMove(0, -1)}
                  aria-label="שמאלה"
                >
                  ←
                </button>
                <button
                  type="button"
                  className="min-h-[48px] rounded-xl bg-yellow-400 text-xl font-bold text-black shadow-md active:scale-95"
                  style={{ touchAction: "manipulation" }}
                  onClick={() => tryMove(1, 0)}
                  aria-label="למטה"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="min-h-[48px] rounded-xl bg-yellow-400 text-xl font-bold text-black shadow-md active:scale-95"
                  style={{ touchAction: "manipulation" }}
                  onClick={() => tryMove(0, 1)}
                  aria-label="ימינה"
                >
                  →
                </button>
              </div>
            </div>

            {gameOver ? (
              <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 overflow-y-auto bg-black/82 px-4 py-6 text-center">
                <h2 className={`text-2xl font-extrabold sm:text-4xl ${won ? "text-emerald-300" : "text-rose-400"}`}>
                  {won ? "כל הכבוד! מצאתם את השער!" : "לא הספקתם הפעם"}
                </h2>
                <p className="max-w-md text-sm font-semibold text-white/90 sm:text-base">
                  ניקוד: {score} · כוכבים: {starsTaken}/{settings.starCount} · טעויות: {mistakes}
                  {won ? ` · זמן שנשאר: ${timeLeft}s` : ""}
                </p>
                <p className="text-xs text-gray-300 sm:text-sm">
                  {won ? "ממתין לסיכום מטבעות..." : "הפסד = 0 מטבעות · ממתין לסיכום..."}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
