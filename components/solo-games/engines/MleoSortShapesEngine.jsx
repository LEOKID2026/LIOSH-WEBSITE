import { useEffect, useRef, useState } from "react";
import {
  SOLO_V2_ASSETS,
  SoloV2EndBanner,
  SoloV2Goal,
  SoloV2Hud,
  SoloV2Intro,
  SoloV2Playfield,
  useSoloGameKeyboard,
} from "./solo-v2-ui.jsx";

const DIFFICULTY_SETTINGS = {
  easy: { itemCount: 12, durationSec: 90, maxLives: 3, queueMode: "calm" },
  medium: { itemCount: 18, durationSec: 72, maxLives: 3, queueMode: "mixed" },
  hard: { itemCount: 24, durationSec: 58, maxLives: 2, queueMode: "rush" },
};

const SCORE_PER_SORT = 50;

/** 3 groups × 2 distinct colors — 6 colors total (no duplicate hues in one bin). */
const ITEM_TYPES = [
  { id: "star", bin: "bright", img: SOLO_V2_ASSETS.candy("star.png") },
  { id: "square", bin: "bright", img: SOLO_V2_ASSETS.candy("square.png") },
  { id: "diamond", bin: "cool", img: SOLO_V2_ASSETS.candy("diamond.png") },
  { id: "circle", bin: "cool", img: SOLO_V2_ASSETS.candy("circle.png") },
  { id: "heart", bin: "warm", img: SOLO_V2_ASSETS.candy("heart.png") },
  { id: "drop", bin: "warm", img: SOLO_V2_ASSETS.candy("drop.png") },
];

const BINS = [
  {
    id: "bright",
    title: "צהוב + ירוק",
    emoji: "🌟",
    previews: [
      { src: SOLO_V2_ASSETS.candy("star.png"), ring: "ring-yellow-400" },
      { src: SOLO_V2_ASSETS.candy("square.png"), ring: "ring-emerald-400" },
    ],
    className:
      "border-yellow-400/80 bg-gradient-to-b from-yellow-950/45 via-emerald-950/30 to-emerald-950/40",
  },
  {
    id: "cool",
    title: "כחול + סגול",
    emoji: "💎",
    previews: [
      { src: SOLO_V2_ASSETS.candy("diamond.png"), ring: "ring-sky-400" },
      { src: SOLO_V2_ASSETS.candy("circle.png"), ring: "ring-violet-400" },
    ],
    className:
      "border-sky-400/80 bg-gradient-to-b from-sky-950/45 via-indigo-950/30 to-violet-950/40",
  },
  {
    id: "warm",
    title: "אדום + כתום",
    emoji: "🔥",
    previews: [
      { src: SOLO_V2_ASSETS.candy("heart.png"), ring: "ring-rose-400" },
      { src: SOLO_V2_ASSETS.candy("drop.png"), ring: "ring-orange-400" },
    ],
    className:
      "border-rose-400/80 bg-gradient-to-b from-rose-950/45 via-orange-950/30 to-orange-950/40",
  },
];

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildBalancedPool(count) {
  const pool = [];
  while (pool.length < count) {
    for (const item of ITEM_TYPES) {
      pool.push(item);
      if (pool.length >= count) break;
    }
  }
  return pool.slice(0, count);
}

/** Reduce back-to-back items from the same bin (medium). */
function breakSameBinRuns(items) {
  const arr = [...items];
  for (let i = 1; i < arr.length; i += 1) {
    if (arr[i].bin !== arr[i - 1].bin) continue;
    const swapIdx = arr.findIndex((it, j) => j > i && it.bin !== arr[i - 1].bin);
    if (swapIdx > i) [arr[i], arr[swapIdx]] = [arr[swapIdx], arr[i]];
  }
  return arr;
}

/** Round-robin across bins — faster switching (hard). */
function interleaveBins(items) {
  const buckets = Object.fromEntries(BINS.map((bin) => [bin.id, []]));
  for (const item of items) buckets[item.bin]?.push(item);
  const out = [];
  while (out.length < items.length) {
    for (const bin of BINS) {
      const next = buckets[bin.id]?.shift();
      if (next) out.push(next);
    }
  }
  return out;
}

function buildQueue(count, queueMode = "calm") {
  const pool = buildBalancedPool(count);
  if (queueMode === "rush") return interleaveBins(pool);
  if (queueMode === "mixed") return breakSameBinRuns(shuffle(pool));
  return shuffle(pool);
}

/**
 * @param {{ autoStart?: boolean, initialDifficulty?: string, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoSortShapesEngine({
  autoStart = false,
  initialDifficulty = "medium",
  onSessionEnd,
}) {
  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const mistakesRef = useRef(0);
  const sortedRef = useRef(0);
  const scoreRef = useRef(0);

  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [showIntro, setShowIntro] = useState(!autoStart);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(90);
  const [queue, setQueue] = useState([]);
  const [sortedCount, setSortedCount] = useState(0);
  const [selectedBin, setSelectedBin] = useState(0);

  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;

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

  const loseLife = (remaining) => {
    setLives((prev) => {
      const next = prev - 1;
      if (next <= 0) endGame(false, remaining);
      return next;
    });
  };

  const startGame = () => {
    sessionEndFiredRef.current = false;
    playStartedAtRef.current = Date.now();
    mistakesRef.current = 0;
    sortedRef.current = 0;
    scoreRef.current = 0;
    setSortedCount(0);
    setShowIntro(false);
    setGameOver(false);
    setWon(false);
    setScore(0);
    setLives(settings.maxLives);
    setTimeLeft(settings.durationSec);
    setQueue(buildQueue(settings.itemCount, settings.queueMode));
    setSelectedBin(0);
    setGameRunning(true);
  };

  useEffect(() => {
    if (autoStart && !gameRunning && !gameOver && !showIntro) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (!gameRunning) return undefined;
    if (timeLeft <= 0) {
      endGame(sortedRef.current >= settings.itemCount, 0);
      return undefined;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameRunning, timeLeft]);

  const currentItem = queue[0] || null;

  const handleBinTap = (binId) => {
    if (!gameRunning || !currentItem) return;
    if (currentItem.bin !== binId) {
      mistakesRef.current += 1;
      loseLife(timeLeft);
      return;
    }
    sortedRef.current += 1;
    scoreRef.current += SCORE_PER_SORT;
    setSortedCount(sortedRef.current);
    setScore(scoreRef.current);
    setQueue((q) => q.slice(1));
    if (sortedRef.current >= settings.itemCount) {
      endGame(true, timeLeft);
    }
  };

  useSoloGameKeyboard(gameRunning && !gameOver && !showIntro, (e) => {
    if (e.code === "ArrowRight" || (e.code === "Tab" && !e.shiftKey)) {
      setSelectedBin((b) => (b + 1) % BINS.length);
      return true;
    }
    if (e.code === "ArrowLeft" || (e.code === "Tab" && e.shiftKey)) {
      setSelectedBin((b) => (b + BINS.length - 1) % BINS.length);
      return true;
    }
    if (e.code === "Digit1") {
      setSelectedBin(0);
      return true;
    }
    if (e.code === "Digit2") {
      setSelectedBin(1);
      return true;
    }
    if (e.code === "Digit3") {
      setSelectedBin(2);
      return true;
    }
    if (e.code === "Enter" || e.code === "Space") {
      handleBinTap(BINS[selectedBin].id);
      return true;
    }
    return false;
  });

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center gap-2 overflow-hidden px-2 py-2 text-white w-full" dir="rtl">
      <SoloV2Goal text="גררו את הצורה לקבוצה הנכונה! +50 על כל מיון נכון." />
      {!showIntro ? (
        <SoloV2Hud
          rows={[
            { label: "ניקוד", value: score, accent: "text-amber-300" },
            { label: "ממוין", value: `${sortedCount}/${settings.itemCount}` },
            { label: "חיים", value: "❤️".repeat(Math.max(0, lives)) },
            { label: "זמן", value: `${timeLeft}s` },
          ]}
        />
      ) : null}

      <SoloV2Playfield bg={SOLO_V2_ASSETS.bgPark} className="max-w-lg">
        {showIntro ? (
          <SoloV2Intro
            title="מיון צורות"
            lines={[
              "בחרו את התיבה הנכונה לכל צורה",
              "+50 על מיון נכון בלבד",
              "טעות = מאבדים חיים",
              "סיימו את כל הפריטים לפני שהזמן נגמר",
            ]}
            onStart={startGame}
          />
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-3 p-3">
            <div className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-yellow-400/40 bg-black/40 p-4">
              <p className="text-sm font-semibold text-yellow-100">הפריט הבא:</p>
              {currentItem ? (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-yellow-300 bg-white/10 shadow-lg">
                  <img src={currentItem.img} alt="" className="h-16 w-16 object-contain" />
                </div>
              ) : (
                <span className="text-lg font-bold text-emerald-300">סיימתם!</span>
              )}
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-3 gap-2">
              {BINS.map((bin, binIdx) => (
                <button
                  key={bin.id}
                  type="button"
                  disabled={!gameRunning || !currentItem}
                  onClick={() => handleBinTap(bin.id)}
                  className={`flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 py-2 text-xs font-bold sm:text-sm ${bin.className} disabled:opacity-40 ${
                    selectedBin === binIdx && gameRunning && !gameOver ? "ring-4 ring-yellow-300" : ""
                  }`}
                >
                  <span className="text-2xl">{bin.emoji}</span>
                  <div className="flex gap-1">
                    {bin.previews.map((preview) => (
                      <img
                        key={preview.src}
                        src={preview.src}
                        alt=""
                        className={`h-5 w-5 rounded-sm object-contain ring-2 ${preview.ring}`}
                      />
                    ))}
                  </div>
                  {bin.title}
                </button>
              ))}
            </div>

            {gameOver ? (
              <SoloV2EndBanner
                success={won}
                title={won ? "כל הכבוד! מיינתם הכל!" : "לא הספקתם הפעם"}
                subtitle={`ניקוד: ${score} · ממוין: ${sortedCount}/${settings.itemCount}`}
              />
            ) : null}
          </div>
        )}
      </SoloV2Playfield>
    </div>
  );
}
