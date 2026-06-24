import { useEffect, useRef, useState } from "react";
import SoloGameAdSlot from "../SoloGameAdSlot.jsx";
import { useSoloGameShellUi } from "../../../hooks/solo-games/useSoloGameShellUi.js";
import { useSoloGameKeyboard } from "./solo-v2-ui.jsx";

/** 20 תמונות ייעודיות לפאזל — public/images/puzzle/ */
export const PUZZLE_IMAGES = Object.freeze([
  { id: "01-leo-class", label: "ליאו בשיעור", src: "/images/puzzle/01-leo-class.png" },
  { id: "02-leo-math", label: "ליאו בחשבון", src: "/images/puzzle/02-leo-math.png" },
  { id: "03-leo-reading", label: "ליאו קורא ספר", src: "/images/puzzle/03-leo-reading.png" },
  { id: "04-leo-science", label: "ליאו במעבדה", src: "/images/puzzle/04-leo-science.png" },
  { id: "05-leo-soccer", label: "ליאו בכדורגל", src: "/images/puzzle/05-leo-soccer.png" },
  { id: "06-leo-playground", label: "ליאו במגרש", src: "/images/puzzle/06-leo-playground.png" },
  { id: "07-leo-pool", label: "ליאו בבריכה", src: "/images/puzzle/07-leo-pool.png" },
  { id: "08-leo-beach", label: "ליאו בים", src: "/images/puzzle/08-leo-beach.png" },
  { id: "09-leo-picnic", label: "ליאו בפיקניק", src: "/images/puzzle/09-leo-picnic.png" },
  { id: "10-leo-scooter", label: "ליאו בקורקינט", src: "/images/puzzle/10-leo-scooter.png" },
  { id: "11-leo-frisbee", label: "ליאו בפריסבי", src: "/images/puzzle/11-leo-frisbee.png" },
  { id: "12-leo-forest", label: "ליאו ביער", src: "/images/puzzle/12-leo-forest.png" },
  { id: "13-leo-rain", label: "ליאו בגשם", src: "/images/puzzle/13-leo-rain.png" },
  { id: "14-leo-space", label: "ליאו בחלל", src: "/images/puzzle/14-leo-space.png" },
  { id: "15-leo-snow", label: "ליאו בשלג", src: "/images/puzzle/15-leo-snow.png" },
  { id: "16-leo-dogpark", label: "ליאו בגינת כלבים", src: "/images/puzzle/16-leo-dogpark.png" },
  { id: "17-leo-friend", label: "ליאו עם חבר", src: "/images/puzzle/17-leo-friend.png" },
  { id: "18-leo-bus", label: "ליאו באוטובוס", src: "/images/puzzle/18-leo-bus.png" },
  { id: "19-leo-bus-ride", label: "ליאו נוסע", src: "/images/puzzle/19-leo-bus-ride.png" },
  { id: "20-leo-train", label: "ליאו ברכבת", src: "/images/puzzle/20-leo-train.png" },
]);

const DIFFICULTY_SETTINGS = {
  easy: { grid: 3, timeSec: 300, parMoves: 18, maxGridWidth: "max-w-[min(92vw,340px)]" },
  medium: { grid: 4, timeSec: 240, parMoves: 45, maxGridWidth: "max-w-[min(92vw,380px)]" },
  hard: { grid: 5, timeSec: 300, parMoves: 95, maxGridWidth: "max-w-[min(92vw,400px)]" },
};

const PREVIEW_SWIPE_THRESHOLD_PX = 48;

const PREVIEW_NAV_BTN_CLASS =
  "hidden sm:inline-flex shrink-0 items-center justify-center rounded-xl border-2 border-white/40 bg-black/50 text-yellow-100 text-2xl leading-none min-h-11 min-w-11 hover:bg-black/70 disabled:opacity-30 disabled:pointer-events-none transition";

function createSolvedTiles(gridSize) {
  const tiles = [];
  for (let i = 0; i < gridSize * gridSize; i += 1) tiles.push(i);
  tiles[tiles.length - 1] = null;
  return tiles;
}

function getAdjacentIndices(index, gridSize) {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const out = [];
  if (col > 0) out.push(index - 1);
  if (col < gridSize - 1) out.push(index + 1);
  if (row > 0) out.push(index - gridSize);
  if (row < gridSize - 1) out.push(index + gridSize);
  return out;
}

function shuffleMoveCount(difficulty) {
  if (difficulty === "easy") return 8 + Math.floor(Math.random() * 5);
  if (difficulty === "medium") return 25 + Math.floor(Math.random() * 16);
  return 60 + Math.floor(Math.random() * 31);
}

/** ערבוב חוקי בלבד — מהלכים לאחור מהמצב המסודר */
function legalShuffle(gridSize, shuffleMoves) {
  const solved = createSolvedTiles(gridSize);
  let tiles = [...solved];
  let blankIndex = tiles.indexOf(null);
  const moves = Math.max(1, shuffleMoves);

  for (let i = 0; i < moves; i += 1) {
    const neighbors = getAdjacentIndices(blankIndex, gridSize);
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    [tiles[blankIndex], tiles[pick]] = [tiles[pick], tiles[blankIndex]];
    blankIndex = pick;
  }

  if (isSolved(tiles, gridSize)) {
    const neighbors = getAdjacentIndices(blankIndex, gridSize);
    const pick = neighbors[0];
    [tiles[blankIndex], tiles[pick]] = [tiles[pick], tiles[blankIndex]];
  }

  return tiles;
}

function isSolved(tiles, gridSize) {
  const goal = createSolvedTiles(gridSize);
  if (tiles.length !== goal.length) return false;
  return tiles.every((t, i) => t === goal[i]);
}

function canMoveTile(tiles, index, gridSize) {
  if (tiles[index] == null) return false;
  const blankIndex = tiles.indexOf(null);
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const blankRow = Math.floor(blankIndex / gridSize);
  const blankCol = blankIndex % gridSize;
  return (
    (row === blankRow && Math.abs(col - blankCol) === 1) ||
    (col === blankCol && Math.abs(row - blankRow) === 1)
  );
}

/**
 * @param {{ autoStart?: boolean, initialDifficulty?: string, onSessionEnd?: (metrics: object) => void, onPreGameUiChange?: (active: boolean) => void }} props
 */
export default function MleoPicturePuzzleEngine({
  autoStart = false,
  initialDifficulty = "medium",
  onSessionEnd,
  onPreGameUiChange,
}) {
  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const movesRef = useRef(0);
  const hintTimerRef = useRef(null);
  const previewTouchStartX = useRef(null);

  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [selectedImageId, setSelectedImageId] = useState(PUZZLE_IMAGES[0].id);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [showPicker, setShowPicker] = useState(true);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [tiles, setTiles] = useState([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(240);
  const [won, setWon] = useState(false);
  const [blockedMsg, setBlockedMsg] = useState("");
  const [showHintPreview, setShowHintPreview] = useState(false);
  const { SG, pageBgStyle } = useSoloGameShellUi();

  useEffect(() => {
    onPreGameUiChange?.(showPicker);
    return () => onPreGameUiChange?.(false);
  }, [showPicker, onPreGameUiChange]);

  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  useEffect(
    () => () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    },
    []
  );

  const safePreviewIndex =
    previewIndex == null
      ? null
      : Math.min(Math.max(previewIndex, 0), PUZZLE_IMAGES.length - 1);
  const previewImage = safePreviewIndex == null ? null : PUZZLE_IMAGES[safePreviewIndex];
  const canPreviewPrev = safePreviewIndex != null && safePreviewIndex > 0;
  const canPreviewNext =
    safePreviewIndex != null && safePreviewIndex < PUZZLE_IMAGES.length - 1;

  const closePreview = () => setPreviewIndex(null);

  const goPreviewPrev = () => {
    setPreviewIndex((index) => (index == null ? index : Math.max(0, index - 1)));
  };

  const goPreviewNext = () => {
    setPreviewIndex((index) =>
      index == null ? index : Math.min(PUZZLE_IMAGES.length - 1, index + 1)
    );
  };

  const handlePreviewTouchStart = (event) => {
    previewTouchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handlePreviewTouchEnd = (event) => {
    if (previewTouchStartX.current == null || PUZZLE_IMAGES.length < 2) return;
    const endX = event.changedTouches[0]?.clientX;
    if (endX == null) return;
    const delta = endX - previewTouchStartX.current;
    previewTouchStartX.current = null;
    if (Math.abs(delta) < PREVIEW_SWIPE_THRESHOLD_PX) return;
    setPreviewIndex((index) => {
      if (index == null) return index;
      if (delta > 0 && index < PUZZLE_IMAGES.length - 1) return index + 1;
      if (delta < 0 && index > 0) return index - 1;
      return index;
    });
  };

  useEffect(() => {
    if (previewIndex == null) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setPreviewIndex(null);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setPreviewIndex((index) =>
          index == null ? index : Math.min(PUZZLE_IMAGES.length - 1, index + 1)
        );
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setPreviewIndex((index) => (index == null ? index : Math.max(0, index - 1)));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewIndex]);

  const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;
  const gridSize = settings.grid;
  const puzzleImage = PUZZLE_IMAGES.find((img) => img.id === selectedImageId)?.src || PUZZLE_IMAGES[0].src;
  const isEasy = difficulty === "easy";

  const blankIndex = tiles.indexOf(null);
  const movableSet = new Set(
    blankIndex >= 0 ? getAdjacentIndices(blankIndex, gridSize).filter((i) => tiles[i] != null) : []
  );

  const computeWinScore = (remaining, moveCount) => {
    const extra = Math.max(0, moveCount - settings.parMoves);
    const timeBonus = isEasy ? remaining * 2 : remaining * 3;
    return Math.max(0, 400 + timeBonus - extra * 8);
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

  const flashBlocked = () => {
    setBlockedMsg("אי אפשר להזיז את האריח הזה");
    window.setTimeout(() => setBlockedMsg(""), 1200);
  };

  const triggerHint = () => {
    if (!gameRunning || gameOver) return;
    setShowHintPreview(true);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setShowHintPreview(false), 3000);
  };

  const startGame = () => {
    sessionEndFiredRef.current = false;
    playStartedAtRef.current = Date.now();
    movesRef.current = 0;
    setMoves(0);
    setShowPicker(false);
    setGameOver(false);
    setWon(false);
    setBlockedMsg("");
    setShowHintPreview(false);
    setTimeLeft(settings.timeSec);
    setTiles(legalShuffle(gridSize, shuffleMoveCount(difficulty)));
    setGameRunning(true);
  };

  useEffect(() => {
    if (!gameRunning) return undefined;
    if (timeLeft <= 0) {
      if (!isSolved(tiles, gridSize)) endGame(false, 0);
      return undefined;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameRunning, timeLeft]);

  const tryMove = (index) => {
    if (!gameRunning || gameOver) return;
    if (tiles[index] == null) return;

    if (!canMoveTile(tiles, index, gridSize)) {
      flashBlocked();
      return;
    }

    const blank = tiles.indexOf(null);
    const next = [...tiles];
    [next[index], next[blank]] = [next[blank], next[index]];
    movesRef.current += 1;
    setMoves(movesRef.current);
    setTiles(next);

    if (isSolved(next, gridSize)) {
      endGame(true, timeLeft);
    }
  };

  useSoloGameKeyboard(gameRunning && !gameOver && !showPicker, (e) => {
    if (e.code === "KeyH" && isEasy) {
      triggerHint();
      return true;
    }
    const blank = tiles.indexOf(null);
    if (blank < 0) return false;
    const br = Math.floor(blank / gridSize);
    const bc = blank % gridSize;
    let target = null;
    if (e.code === "ArrowUp" || e.code === "KeyW") {
      if (br + 1 < gridSize) target = (br + 1) * gridSize + bc;
    } else if (e.code === "ArrowDown" || e.code === "KeyS") {
      if (br > 0) target = (br - 1) * gridSize + bc;
    } else if (e.code === "ArrowLeft" || e.code === "KeyA") {
      if (bc + 1 < gridSize) target = br * gridSize + (bc + 1);
    } else if (e.code === "ArrowRight" || e.code === "KeyD") {
      if (bc > 0) target = br * gridSize + (bc - 1);
    }
    if (target == null) return true;
    tryMove(target);
    return true;
  });

  const tileBg = (tile) => {
    const row = Math.floor(tile / gridSize);
    const col = tile % gridSize;
    const posX = gridSize > 1 ? (col / (gridSize - 1)) * 100 : 0;
    const posY = gridSize > 1 ? (row / (gridSize - 1)) * 100 : 0;
    return {
      backgroundImage: `url(${puzzleImage})`,
      backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
      backgroundPosition: `${posX}% ${posY}%`,
    };
  };

  const tileMinClass =
    gridSize === 3 ? "min-h-[92px] sm:min-h-[108px]" : gridSize === 4 ? "min-h-[72px] sm:min-h-[84px]" : "min-h-[58px] sm:min-h-[68px]";

  const playWrap =
    "relative isolate flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-900 text-white select-none";

  return (
    <div
      id="game-wrapper"
      className={showPicker ? SG.preGameWrap : playWrap}
      style={showPicker ? pageBgStyle : undefined}
      dir="rtl"
    >
      {showPicker ? (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden px-1 py-0.5 sm:px-2 sm:py-1">
          <div className="shrink-0 py-0.5 text-center leading-tight">
            <h2 className={SG.preGameTitle}>בחרו תמונה לפאזל</h2>
            <p className={SG.preGameSub}>לחצו · בחרו · התחילו</p>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden py-1">
            <div className="grid w-full max-w-[min(calc(100vw-12px),328px)] grid-cols-4 grid-rows-5 gap-1 sm:max-w-[min(560px,90vw)] sm:grid-cols-5 sm:grid-rows-4 sm:gap-2">
              {PUZZLE_IMAGES.map((img, index) => {
                const selected = selectedImageId === img.id;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setPreviewIndex(index)}
                    className={`relative aspect-square w-full min-w-0 overflow-hidden rounded-md border-2 p-0 transition sm:rounded-lg ${
                      selected ? SG.preGameImageBorderSelected : SG.preGameImageBorderDefault
                    }`}
                    style={{ touchAction: "manipulation" }}
                    aria-label={`${img.label}${selected ? " — נבחרה" : ""}`}
                  >
                    <img
                      src={img.src}
                      alt=""
                      className="block h-full w-full object-cover"
                      draggable={false}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="shrink-0 px-1 pb-1 pt-1 sm:px-2">
            <button
              type="button"
              onClick={startGame}
              className={SG.preGameStartBtn}
              style={{ touchAction: "manipulation" }}
            >
              התחל משחק
            </button>
          </div>

          <SoloGameAdSlot />

          {previewImage ? (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/88 p-3"
              role="dialog"
              aria-modal="true"
              aria-label={`תצוגת ${previewImage.label}`}
              onClick={closePreview}
            >
              <div
                className="flex w-full max-w-2xl flex-col items-center gap-3 sm:max-w-3xl"
                onClick={(event) => event.stopPropagation()}
                dir="rtl"
              >
                <div className="flex w-full items-center justify-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={goPreviewPrev}
                    disabled={!canPreviewPrev}
                    className={PREVIEW_NAV_BTN_CLASS}
                    aria-label="תמונה קודמת"
                  >
                    ‹
                  </button>

                  <div
                    className="flex min-w-0 flex-1 touch-pan-y flex-col items-center gap-2"
                    onTouchStart={handlePreviewTouchStart}
                    onTouchEnd={handlePreviewTouchEnd}
                  >
                    <img
                      src={previewImage.src}
                      alt={previewImage.label}
                      className="max-h-[min(72dvh,480px)] w-full max-w-[min(92vw,480px)] rounded-xl object-contain ring-2 ring-yellow-400"
                      draggable={false}
                    />
                    <p className="text-sm font-bold text-yellow-100">{previewImage.label}</p>
                  </div>

                  <button
                    type="button"
                    onClick={goPreviewNext}
                    disabled={!canPreviewNext}
                    className={PREVIEW_NAV_BTN_CLASS}
                    aria-label="תמונה הבאה"
                  >
                    ›
                  </button>
                </div>

                <div className="flex w-full max-w-xs gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImageId(previewImage.id);
                      closePreview();
                    }}
                    className="min-h-[44px] flex-1 rounded-xl bg-yellow-400 px-3 py-2 text-sm font-bold text-black"
                    style={{ touchAction: "manipulation" }}
                  >
                    בחר תמונה
                  </button>
                  <button
                    type="button"
                    onClick={closePreview}
                    className="min-h-[44px] flex-1 rounded-xl border-2 border-white/40 bg-black/50 px-3 py-2 text-sm font-bold text-white"
                    style={{ touchAction: "manipulation" }}
                  >
                    סגור
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-1 pb-1 pt-1">
          <div className="pointer-events-none absolute left-1/2 top-2 z-[80] max-w-[98vw] -translate-x-1/2 rounded-lg bg-black/65 px-3 py-2 text-center text-[11px] font-bold leading-snug sm:text-sm">
            <span className="text-amber-300">ניקוד: {won ? computeWinScore(timeLeft, moves) : 0}</span>
            {" · "}
            <span>מהלכים: {moves}</span>
            {" · "}
            <span>{timeLeft}s</span>
            {" · "}
            <span>{gridSize}×{gridSize}</span>
          </div>

          <div className="relative z-0 mx-auto mt-11 flex h-full min-h-0 w-full max-w-[1180px] flex-1 flex-col overflow-hidden rounded-lg border-4 border-yellow-400 bg-gradient-to-b from-slate-900 to-slate-950 shadow-lg sm:mt-12">
            <div className="flex min-h-0 flex-1 flex-col items-center justify-start gap-2 overflow-y-auto p-2 sm:flex-row sm:items-start sm:justify-center sm:gap-4 sm:p-3">
              <div className="flex w-full shrink-0 flex-col items-center gap-2 sm:w-auto">
                <div
                  className={`rounded-xl border-2 border-yellow-400/60 bg-black/40 p-2 text-center ${
                    isEasy ? "ring-2 ring-sky-400/50" : ""
                  }`}
                >
                  <p className="mb-1 text-xs font-bold text-yellow-200 sm:text-sm">תמונת היעד 🐶</p>
                  <img
                    src={puzzleImage}
                    alt=""
                    className={`rounded-lg object-cover ring-2 ring-yellow-400 ${
                      isEasy ? "h-24 w-24 sm:h-28 sm:w-28" : "h-20 w-20 sm:h-24 sm:w-24"
                    }`}
                  />
                </div>
                {isEasy ? (
                  <button
                    type="button"
                    onClick={triggerHint}
                    disabled={!gameRunning || gameOver}
                    className="min-h-[44px] rounded-xl border-2 border-sky-400 bg-sky-950/60 px-4 py-2 text-sm font-bold text-sky-100 disabled:opacity-40"
                    style={{ touchAction: "manipulation" }}
                  >
                    💡 רמז — תמונה מלאה
                  </button>
                ) : null}
              </div>

              <div className={`relative w-full shrink-0 ${settings.maxGridWidth}`}>
                {blockedMsg ? (
                  <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1 rounded-lg bg-rose-600/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg sm:text-sm">
                    {blockedMsg}
                  </div>
                ) : null}

                <div
                  className="grid gap-1.5 rounded-xl border-2 border-yellow-400 bg-slate-950/80 p-2 shadow-inner sm:gap-2 sm:p-3"
                  style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
                >
                  {tiles.map((tile, index) => {
                    if (tile == null) {
                      return (
                        <div
                          key={`blank-${index}`}
                          className={`aspect-square rounded-lg border-2 border-dashed ${
                            isEasy
                              ? "border-sky-400 bg-sky-950/50 ring-2 ring-sky-400/40"
                              : "border-white/30 bg-white/8"
                          } ${tileMinClass}`}
                          aria-label="מקום ריק"
                        />
                      );
                    }
                    const movable = movableSet.has(index);
                    return (
                      <button
                        key={`tile-${index}-${tile}`}
                        type="button"
                        className={`aspect-square overflow-hidden rounded-lg border-2 bg-slate-800 shadow-md transition touch-manipulation active:scale-[0.97] ${tileMinClass} ${
                          movable
                            ? "border-sky-300 ring-2 ring-sky-400/50"
                            : "border-yellow-300/70 opacity-95"
                        }`}
                        style={tileBg(tile)}
                        onClick={() => tryMove(index)}
                        aria-label={`חלק ${tile + 1}${movable ? " — ניתן להזיז" : ""}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {showHintPreview ? (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-4">
                <div className="text-center">
                  <img
                    src={puzzleImage}
                    alt=""
                    className="mx-auto max-h-[min(50vh,280px)] max-w-[min(85vw,280px)] rounded-xl object-contain ring-4 ring-sky-400"
                  />
                  <p className="mt-2 text-sm font-bold text-sky-200">כך צריכה להיראות התמונה!</p>
                </div>
              </div>
            ) : null}

            {gameOver ? (
              <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 overflow-y-auto bg-black/82 px-4 py-6 text-center">
                <h2 className={`text-2xl font-extrabold sm:text-4xl ${won ? "text-emerald-300" : "text-rose-400"}`}>
                  {won ? "מעולה! הפאזל מוכן!" : "הזמן נגמר — לא הספקתם"}
                </h2>
                <p className="max-w-md text-sm font-semibold text-white/90 sm:text-base">
                  {won
                    ? `ניקוד: ${computeWinScore(timeLeft, moves)} · מהלכים: ${moves}`
                    : "נסו שוב — סדרו את כל החלקים לפני שהזמן נגמר"}
                </p>
                {!won ? (
                  <p className="text-xs text-gray-300 sm:text-sm">הפסד = 0 מטבעות</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
