import { useEffect, useRef, useState } from "react";
import {
  SOLO_V2_ASSETS,
  SoloV2EndBanner,
  SoloV2Goal,
  SoloV2Hud,
  SoloV2Intro,
  SoloV2Playfield,
} from "./solo-v2-ui.jsx";

const PUZZLE_IMAGE = SOLO_V2_ASSETS.leoAlt;

const DIFFICULTY_SETTINGS = {
  easy: { grid: 3, timeSec: 180, parMoves: 35 },
  medium: { grid: 4, timeSec: 240, parMoves: 70 },
  hard: { grid: 5, timeSec: 300, parMoves: 110 },
};

function createSolvedTiles(gridSize) {
  const tiles = [];
  for (let i = 0; i < gridSize * gridSize; i += 1) tiles.push(i);
  tiles[tiles.length - 1] = null;
  return tiles;
}

function countInversions(arr, gridSize) {
  const filtered = arr.filter((x) => x != null);
  let inv = 0;
  for (let i = 0; i < filtered.length; i += 1) {
    for (let j = i + 1; j < filtered.length; j += 1) {
      if (filtered[i] > filtered[j]) inv += 1;
    }
  }
  const blankRowFromBottom = gridSize - Math.floor(arr.indexOf(null) / gridSize);
  if (gridSize % 2 === 1) return inv % 2 === 0;
  return (inv + blankRowFromBottom) % 2 === 1;
}

function shuffleTiles(gridSize) {
  const solved = createSolvedTiles(gridSize);
  let tiles = [...solved];
  do {
    tiles = [...solved].sort(() => Math.random() - 0.5);
  } while (!countInversions(tiles, gridSize) || tiles.every((t, i) => t === solved[i]));
  return tiles;
}

function isSolved(tiles, gridSize) {
  return tiles.every((t, i) => t === createSolvedTiles(gridSize)[i]);
}

/**
 * @param {{ autoStart?: boolean, initialDifficulty?: string, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoPicturePuzzleEngine({
  autoStart = false,
  initialDifficulty = "medium",
  onSessionEnd,
}) {
  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const movesRef = useRef(0);

  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showIntro, setShowIntro] = useState(!autoStart);
  const [tiles, setTiles] = useState([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(240);
  const [won, setWon] = useState(false);

  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;
  const gridSize = settings.grid;

  const computeWinScore = (remaining, moveCount) => {
    const extra = Math.max(0, moveCount - settings.parMoves);
    return Math.max(0, 400 + remaining * 3 - extra * 8);
  };

  const fireSessionEnd = (didWin, remaining, moveCount, finalScore) => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    onSessionEnd({
      score: finalScore,
      didWin,
      difficulty,
      mistakes: Math.max(0, moveCount - settings.parMoves),
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
    const finalScore = didWin ? computeWinScore(remaining, movesRef.current) : 0;
    fireSessionEnd(didWin, remaining, movesRef.current, finalScore);
  };

  const startGame = () => {
    sessionEndFiredRef.current = false;
    playStartedAtRef.current = Date.now();
    movesRef.current = 0;
    setMoves(0);
    setShowIntro(false);
    setGameOver(false);
    setWon(false);
    setTimeLeft(settings.timeSec);
    setTiles(shuffleTiles(gridSize));
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

  const tryMove = (index) => {
    if (!gameRunning || tiles[index] == null) return;
    const blankIndex = tiles.indexOf(null);
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const blankRow = Math.floor(blankIndex / gridSize);
    const blankCol = blankIndex % gridSize;
    const adjacent =
      (row === blankRow && Math.abs(col - blankCol) === 1) ||
      (col === blankCol && Math.abs(row - blankRow) === 1);
    if (!adjacent) return;

    const next = [...tiles];
    [next[index], next[blankIndex]] = [next[blankIndex], next[index]];
    movesRef.current += 1;
    setMoves(movesRef.current);
    setTiles(next);
    if (isSolved(next, gridSize)) endGame(true, timeLeft);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center gap-2 overflow-hidden px-2 py-2 text-white w-full" dir="rtl">
      <SoloV2Goal text="סדרו את תמונת ליאו! ניקוד רק כשמסיימים את הפאזל." />
      {!showIntro ? (
        <SoloV2Hud
          rows={[
            { label: "מהלכים", value: moves },
            { label: "זמן", value: `${timeLeft}s` },
            { label: "ניקוד", value: won ? computeWinScore(timeLeft, moves) : 0, accent: "text-amber-300" },
          ]}
        />
      ) : null}

      <SoloV2Playfield bg={SOLO_V2_ASSETS.bgDay} className="max-w-md">
        {showIntro ? (
          <SoloV2Intro
            title="פאזל תמונה של ליאו"
            lines={[
              "החליקו/לחצו על אריח ליד הריק",
              "ניקוד רק בסיום מוצלח",
              "פחות מהלכים + זמן שנשאר = יותר ניקוד",
              "נגמר הזמן = הפסד",
            ]}
            onStart={startGame}
          />
        ) : (
          <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 p-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-black/30 px-3 py-2">
              <img src={PUZZLE_IMAGE} alt="" className="h-12 w-12 rounded-lg object-cover ring-2 ring-yellow-400" />
              <p className="text-sm font-semibold text-yellow-100">כך צריכה להיראות התמונה 🐶</p>
            </div>

            <div
              className="grid w-full max-w-sm gap-1 rounded-xl border-2 border-yellow-400 bg-black/50 p-2 shadow-inner"
              style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
            >
              {tiles.map((tile, index) => {
                if (tile == null) {
                  return (
                    <div
                      key={`blank-${index}`}
                      className="aspect-square rounded-md border border-dashed border-white/20 bg-white/5"
                    />
                  );
                }
                const row = Math.floor(tile / gridSize);
                const col = tile % gridSize;
                const posX = gridSize > 1 ? (col / (gridSize - 1)) * 100 : 0;
                const posY = gridSize > 1 ? (row / (gridSize - 1)) * 100 : 0;
                return (
                  <button
                    key={`tile-${index}`}
                    type="button"
                    className="aspect-square overflow-hidden rounded-md border-2 border-yellow-300/70 bg-slate-800 shadow-md touch-manipulation active:scale-95"
                    style={{
                      backgroundImage: `url(${PUZZLE_IMAGE})`,
                      backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
                      backgroundPosition: `${posX}% ${posY}%`,
                    }}
                    onClick={() => tryMove(index)}
                    aria-label={`חלק ${tile + 1}`}
                  />
                );
              })}
            </div>

            {gameOver ? (
              <SoloV2EndBanner
                success={won}
                title={won ? "מעולה! הפאזל מוכן!" : "הזמן נגמר — לא הספקתם"}
                subtitle={
                  won
                    ? `ניקוד: ${computeWinScore(timeLeft, moves)} · מהלכים: ${moves}`
                    : `נסו שוב עם פחות מהלכים`
                }
              />
            ) : null}
          </div>
        )}
      </SoloV2Playfield>
    </div>
  );
}
