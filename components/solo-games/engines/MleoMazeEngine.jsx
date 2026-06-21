import { useEffect, useRef, useState } from "react";
import {
  SOLO_V2_ASSETS,
  SoloV2EndBanner,
  SoloV2Goal,
  SoloV2Hud,
  SoloV2Intro,
  SoloV2Playfield,
} from "./solo-v2-ui.jsx";

const DIFFICULTY_SETTINGS = {
  easy: { size: 5, timeSec: 120, maxMistakes: 10, starCount: 3 },
  medium: { size: 7, timeSec: 180, maxMistakes: 14, starCount: 5 },
  hard: { size: 9, timeSec: 240, maxMistakes: 18, starCount: 7 },
};

const SCORE_STAR = 20;
const SCORE_EXIT = 100;

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
  const scoreRef = useRef(0);
  const mistakesRef = useRef(0);
  const starsTakenRef = useRef(0);

  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showIntro, setShowIntro] = useState(!autoStart);
  const [maze, setMaze] = useState([]);
  const [stars, setStars] = useState([]);
  const [player, setPlayer] = useState({ r: 1, c: 1 });
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [starsTaken, setStarsTaken] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);
  const [won, setWon] = useState(false);

  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;
  const exit = { r: settings.size - 2, c: settings.size - 2 };

  const fireSessionEnd = (didWin, remaining) => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    onSessionEnd({
      score: scoreRef.current,
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
    fireSessionEnd(didWin, remaining);
  };

  const addMistake = () => {
    mistakesRef.current += 1;
    setMistakes(mistakesRef.current);
    if (mistakesRef.current >= settings.maxMistakes) {
      endGame(false, timeLeft);
    }
  };

  const startGame = () => {
    sessionEndFiredRef.current = false;
    playStartedAtRef.current = Date.now();
    scoreRef.current = 0;
    mistakesRef.current = 0;
    starsTakenRef.current = 0;
    setScore(0);
    setMistakes(0);
    setStarsTaken(0);
    setShowIntro(false);
    setGameOver(false);
    setWon(false);
    setTimeLeft(settings.timeSec);
    const m = generateMaze(settings.size);
    setMaze(m);
    setPlayer({ r: 1, c: 1 });
    setStars(placeStars(m, settings.starCount, { r: 1, c: 1 }, exit));
    setGameRunning(true);
  };

  useEffect(() => {
    if (autoStart && !gameRunning && !gameOver && !showIntro) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (!gameRunning) return undefined;
    if (timeLeft <= 0) {
      endGame(false, 0);
      return undefined;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
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

    const starIdx = stars.findIndex((s) => !s.taken && s.r === nr && s.c === nc);
    if (starIdx >= 0) {
      setStars((prev) => prev.map((s, i) => (i === starIdx ? { ...s, taken: true } : s)));
      starsTakenRef.current += 1;
      setStarsTaken(starsTakenRef.current);
      scoreRef.current += SCORE_STAR;
      setScore(scoreRef.current);
    }

    if (nr === exit.r && nc === exit.c) {
      scoreRef.current += SCORE_EXIT;
      setScore(scoreRef.current);
      endGame(true, timeLeft);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center gap-2 overflow-hidden px-2 py-2 text-white w-full" dir="rtl">
      <SoloV2Goal text="עזרו לליאו לאסוף כוכבים ולהגיע לשער היציאה!" />
      {!showIntro ? (
        <SoloV2Hud
          rows={[
            { label: "ניקוד", value: score, accent: "text-amber-300" },
            { label: "כוכבים", value: `${starsTaken}/${settings.starCount}` },
            { label: "טעויות", value: `${mistakes}/${settings.maxMistakes}` },
            { label: "זמן", value: `${timeLeft}s` },
          ]}
        />
      ) : null}

      <SoloV2Playfield bg={SOLO_V2_ASSETS.bgSky} className="max-w-md">
        {showIntro ? (
          <SoloV2Intro
            title="מבוך ליאו"
            lines={[
              "+20 על כל כוכב",
              "+100 על הגעה לשער",
              "הלימה בקיר = טעות",
              "יותר מדי טעויות או נגמר הזמן = הפסד",
            ]}
            onStart={startGame}
          />
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-2 p-2">
            <div
              className="mx-auto grid min-h-0 max-h-[min(52dvh,420px)] w-full max-w-[320px] flex-1 gap-0.5 rounded-xl border-2 border-yellow-300/60 bg-emerald-950/40 p-1"
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
                      className={`flex aspect-square items-center justify-center rounded-sm ${
                        isWall
                          ? "bg-gradient-to-br from-indigo-900 to-slate-900 shadow-inner"
                          : isExit
                            ? "bg-emerald-500/40 ring-1 ring-emerald-300"
                            : "bg-emerald-100/15"
                      }`}
                    >
                      {isPlayer ? (
                        <img src={SOLO_V2_ASSETS.leo} alt="" className="h-[85%] w-[85%] object-contain" />
                      ) : star ? (
                        <img src={SOLO_V2_ASSETS.star} alt="" className="h-[70%] w-[70%] object-contain" />
                      ) : isExit && !isWall ? (
                        <img src={SOLO_V2_ASSETS.diamond} alt="" className="h-[65%] w-[65%] object-contain" />
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mx-auto grid w-full max-w-[220px] shrink-0 grid-cols-3 gap-1.5">
              <span />
              <button type="button" className="min-h-[44px] rounded-xl bg-yellow-400 text-lg font-bold text-black" onClick={() => tryMove(-1, 0)}>↑</button>
              <span />
              <button type="button" className="min-h-[44px] rounded-xl bg-yellow-400 text-lg font-bold text-black" onClick={() => tryMove(0, -1)}>←</button>
              <button type="button" className="min-h-[44px] rounded-xl bg-yellow-400 text-lg font-bold text-black" onClick={() => tryMove(1, 0)}>↓</button>
              <button type="button" className="min-h-[44px] rounded-xl bg-yellow-400 text-lg font-bold text-black" onClick={() => tryMove(0, 1)}>→</button>
            </div>

            {gameOver ? (
              <SoloV2EndBanner
                success={won}
                title={won ? "כל הכבוד! מצאתם את היציאה!" : "לא הספקתם הפעם"}
                subtitle={`ניקוד: ${score} · כוכבים: ${starsTaken}/${settings.starCount}`}
              />
            ) : null}
          </div>
        )}
      </SoloV2Playfield>
    </div>
  );
}
