import { useEffect, useRef, useState } from "react";
import SoloGameMobileFullscreenButton from "../SoloGameMobileFullscreenButton.jsx";
import SoloGameEndInterstitialOverlay from "../SoloGameEndInterstitialOverlay.jsx";
import SoloGamePortraitRecommendationModal from "../SoloGamePortraitRecommendationModal.jsx";
import { useSoloGameMobileFullscreen } from "../../../hooks/solo-games/useSoloGameMobileFullscreen.js";
import { useSoloEngineAudio } from "../../../hooks/solo-games/useSoloGameAudio.js";
import {
  SOLO_V2_ASSETS,
  SoloV2Goal,
  SoloV2Hud,
  SoloV2Intro,
  SoloV2Playfield,
  useSoloGameKeyboard,
} from "./solo-v2-ui.jsx";

const DIFFICULTY_SETTINGS = {
  easy: { itemCount: 12, durationSec: 90, maxLives: 3, queueMode: "calm", binShuffleMs: null },
  medium: { itemCount: 18, durationSec: 72, maxLives: 3, queueMode: "mixed", binShuffleMs: 11000 },
  hard: { itemCount: 24, durationSec: 58, maxLives: 2, queueMode: "rush", binShuffleMs: 8000 },
};

const SCORE_PER_SORT = 50;

/** @type {Record<string, { labelHe: string, ring: string }>} */
const COLOR_META = Object.freeze({
  red: { labelHe: "אדום", ring: "ring-rose-400" },
  orange: { labelHe: "כתום", ring: "ring-orange-400" },
  blue: { labelHe: "כחול", ring: "ring-sky-400" },
  purple: { labelHe: "סגול", ring: "ring-violet-400" },
  yellow: { labelHe: "צהוב", ring: "ring-yellow-400" },
  green: { labelHe: "ירוק", ring: "ring-emerald-400" },
});

/**
 * Single source of truth — each item maps to exactly one color.
 * Asset colors (verified): heart=red, star=orange, square=blue, drop=yellow, circle=green.
 * Purple uses an inline gem (no purple candy PNG in repo; diamond.png is blue — excluded).
 */
const SORT_ITEMS = Object.freeze([
  { id: "heart", color: "red", render: { type: "img", src: SOLO_V2_ASSETS.candy("heart.png") } },
  { id: "star", color: "orange", render: { type: "img", src: SOLO_V2_ASSETS.candy("star.png") } },
  { id: "square", color: "blue", render: { type: "img", src: SOLO_V2_ASSETS.candy("square.png") } },
  { id: "purple-jewel", color: "purple", render: { type: "purple-gem" } },
  { id: "drop", color: "yellow", render: { type: "img", src: SOLO_V2_ASSETS.candy("drop.png") } },
  { id: "circle", color: "green", render: { type: "img", src: SOLO_V2_ASSETS.candy("circle.png") } },
]);

const SORT_GROUP_DEFS = Object.freeze([
  {
    id: "bright",
    colors: ["yellow", "green"],
    emoji: "🌟",
    className:
      "border-yellow-400/80 bg-gradient-to-b from-yellow-950/45 via-emerald-950/30 to-emerald-950/40",
  },
  {
    id: "cool",
    colors: ["blue", "purple"],
    emoji: "💎",
    className:
      "border-sky-400/80 bg-gradient-to-b from-sky-950/45 via-indigo-950/30 to-violet-950/40",
  },
  {
    id: "warm",
    colors: ["red", "orange"],
    emoji: "🔥",
    className:
      "border-rose-400/80 bg-gradient-to-b from-rose-950/45 via-orange-950/30 to-orange-950/40",
  },
]);

function groupTitle(colorA, colorB) {
  return `${COLOR_META[colorA].labelHe} + ${COLOR_META[colorB].labelHe}`;
}

function itemsForColors(colorIds) {
  return SORT_ITEMS.filter((item) => colorIds.includes(item.color));
}

function binForColor(color) {
  return SORT_GROUP_DEFS.find((group) => group.colors.includes(color))?.id || null;
}

/** @type {readonly { id: string, title: string, emoji: string, className: string, colors: string[], items: typeof SORT_ITEMS }[]} */
const BINS = Object.freeze(
  SORT_GROUP_DEFS.map((group) => {
    const items = itemsForColors(group.colors);
    return {
      id: group.id,
      title: groupTitle(group.colors[0], group.colors[1]),
      emoji: group.emoji,
      className: group.className,
      colors: group.colors,
      items,
    };
  })
);

/** Playable queue entries — bin derived from color, never hand-written. */
const ITEM_TYPES = Object.freeze(
  SORT_ITEMS.map((item) => ({
    ...item,
    bin: binForColor(item.color),
    colorRing: COLOR_META[item.color].ring,
  }))
);

/** @param {{ render: { type: string, src?: string }, colorRing?: string, className?: string }} item */
function SortShapeIcon({ item, className = "h-16 w-16", preview = false }) {
  const sizeClass = preview ? "h-5 w-5" : className;
  const ring = item.colorRing || COLOR_META[item.color]?.ring || "";

  if (item.render.type === "img") {
    return (
      <img
        src={item.render.src}
        alt=""
        className={`object-contain ${sizeClass} ${preview ? `rounded-sm ring-2 ${ring}` : ""}`}
        draggable={false}
      />
    );
  }

  if (item.render.type === "purple-gem") {
    return (
      <span
        className={`inline-flex items-center justify-center ${sizeClass} ${preview ? `rounded-sm p-0.5 ring-2 ${ring}` : ""}`}
        aria-hidden
      >
        <span
          className={`inline-block rotate-45 rounded-md bg-gradient-to-br from-violet-300 via-violet-500 to-purple-800 shadow-[inset_0_1px_4px_rgba(255,255,255,0.45)] ${
            preview ? "h-full w-full min-h-[14px] min-w-[14px]" : "h-[72%] w-[72%]"
          }`}
        />
      </span>
    );
  }

  return null;
}

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function shuffleBinOrder(order) {
  const next = shuffle(order);
  if (next.every((v, i) => v === order[i]) && next.length > 1) {
    [next[0], next[1]] = [next[1], next[0]];
  }
  return next;
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

function breakSameBinRuns(items) {
  const arr = [...items];
  for (let i = 1; i < arr.length; i += 1) {
    if (arr[i].bin !== arr[i - 1].bin) continue;
    const swapIdx = arr.findIndex((it, j) => j > i && it.bin !== arr[i - 1].bin);
    if (swapIdx > i) [arr[i], arr[swapIdx]] = [arr[swapIdx], arr[i]];
  }
  return arr;
}

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
  const sfx = useSoloEngineAudio();

  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const pendingSessionEndRef = useRef(null);
  const mistakesRef = useRef(0);
  const sortedRef = useRef(0);
  const scoreRef = useRef(0);
  const queueRef = useRef([]);

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
  const [binOrder, setBinOrder] = useState([0, 1, 2]);
  const [shuffleWarning, setShuffleWarning] = useState(false);

  const {
    isFullscreen,
    showPortraitPrompt,
    dismissPortraitPrompt,
    syncPortraitPromptForRun,
    enterFromUserGesture,
    toggleFromUserGesture,
    showFullscreenButton,
  } = useSoloGameMobileFullscreen({
    gameKey: "sort-shapes",
    gameRunning,
    showIntro,
    gameOver,
  });

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
    if (pendingSessionEndRef.current) return;
    setGameRunning(false);
    setGameOver(true);
    setWon(didWin);
    pendingSessionEndRef.current = { didWin, remaining };
  };

  const completeEndInterstitial = () => {
    const pending = pendingSessionEndRef.current;
    if (!pending) return;
    pendingSessionEndRef.current = null;
    fireSessionEnd(pending.didWin, pending.remaining);
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
    pendingSessionEndRef.current = null;
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
    const builtQueue = buildQueue(settings.itemCount, settings.queueMode);
    queueRef.current = builtQueue;
    setQueue(builtQueue);
    setSelectedBin(0);
    setBinOrder([0, 1, 2]);
    setShuffleWarning(false);
    syncPortraitPromptForRun();
    setGameRunning(true);
  };

  useEffect(() => {
    if (!gameRunning || gameOver || !settings.binShuffleMs) return undefined;
    const id = window.setInterval(() => {
      setShuffleWarning(true);
      sfx.playWarning();
      window.setTimeout(() => setShuffleWarning(false), 1000);
      setBinOrder((prev) => shuffleBinOrder(prev));
    }, settings.binShuffleMs);
    return () => window.clearInterval(id);
  }, [gameRunning, gameOver, settings.binShuffleMs, sfx]);

  useEffect(() => {
    if (autoStart && !gameRunning && !gameOver && !showIntro) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (!gameRunning) return undefined;
    if (timeLeft <= 0) {
      const timerId = window.setTimeout(() => {
        if (pendingSessionEndRef.current) return;
        const won =
          sortedRef.current >= settings.itemCount || queueRef.current.length === 0;
        endGame(won, 0);
      }, 0);
      return () => window.clearTimeout(timerId);
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameRunning, timeLeft]);

  const currentItem = queue[0] || null;

  const handleBinTap = (binId) => {
    if (!gameRunning || !currentItem) return;
    sfx.playDrag();
    if (currentItem.bin !== binId) {
      sfx.playDropFail();
      mistakesRef.current += 1;
      loseLife(timeLeft);
      return;
    }
    sfx.playDropOk();
    sortedRef.current += 1;
    scoreRef.current += SCORE_PER_SORT;
    setSortedCount(sortedRef.current);
    setScore(scoreRef.current);
    const nextQueue = queueRef.current.slice(1);
    queueRef.current = nextQueue;
    setQueue(nextQueue);
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
    <div
      id="game-wrapper"
      className="relative isolate flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-900 text-white w-full select-none solo-game-mobile-fullscreen-shell"
      dir="rtl"
    >
      <div className="flex min-h-0 w-full flex-1 flex-col gap-2 px-2 py-2 max-lg:gap-1 max-lg:px-0 max-lg:py-0">
        <div className="w-full shrink-0 max-lg:[&>p]:mx-0 max-lg:[&>p]:mb-1 max-lg:[&>p]:w-full max-lg:[&>p]:max-w-none max-lg:[&>p]:rounded-none max-lg:[&>p]:border-x-0">
          <SoloV2Goal text="גררו את הצורה לקבוצה הנכונה! +50 על כל מיון נכון." />
        </div>
        {!showIntro ? (
          <div className="w-full shrink-0 max-lg:[&>div]:w-full max-lg:[&>div]:max-w-none max-lg:[&>div]:rounded-none max-lg:[&>div]:border-x-0">
            <SoloV2Hud
              rows={[
                { label: "ניקוד", value: score, accent: "text-amber-300" },
                { label: "ממוין", value: `${sortedCount}/${settings.itemCount}` },
                { label: "חיים", value: "❤️".repeat(Math.max(0, lives)) },
                { label: "זמן", value: `${timeLeft} שנ׳` },
              ]}
            />
          </div>
        ) : null}

        <SoloV2Playfield
          bg={SOLO_V2_ASSETS.bgPark}
          className="max-w-lg max-lg:max-w-none max-lg:w-full max-lg:flex-1 max-lg:min-h-0 max-lg:rounded-none max-lg:border-x-0 max-lg:border-b-0 max-lg:shadow-none"
        >
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
          <div className="relative flex h-full min-h-0 flex-col gap-3 p-3 max-lg:gap-2 max-lg:p-2">
            {showFullscreenButton ? (
              <div className="pointer-events-auto absolute right-2 top-2 z-[70]">
                <SoloGameMobileFullscreenButton
                  isFullscreen={isFullscreen}
                  onToggle={toggleFromUserGesture}
                />
              </div>
            ) : null}

            <div className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-yellow-400/40 bg-black/40 p-4">
              <p className="text-sm font-semibold text-yellow-100">הפריט הבא:</p>
              {currentItem ? (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-yellow-300 bg-white/10 shadow-lg">
                  <SortShapeIcon item={currentItem} />
                </div>
              ) : (
                <span className="text-lg font-bold text-emerald-300">סיימתם!</span>
              )}
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-3 gap-2">
              {binOrder.map((binIdx, slotIdx) => {
                const bin = BINS[binIdx];
                return (
                <button
                  key={bin.id}
                  type="button"
                  disabled={!gameRunning || !currentItem}
                  onClick={() => handleBinTap(bin.id)}
                  className={`flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 py-2 text-xs font-bold sm:text-sm ${bin.className} disabled:opacity-40 ${
                    selectedBin === slotIdx && gameRunning && !gameOver ? "ring-4 ring-yellow-300" : ""
                  }`}
                >
                  <span className="text-2xl">{bin.emoji}</span>
                  <div className="flex gap-1">
                    {bin.items.map((item) => (
                      <SortShapeIcon key={item.id} item={item} preview />
                    ))}
                  </div>
                  {bin.title}
                </button>
              );
              })}
            </div>

            {shuffleWarning ? (
              <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex justify-center">
                <span className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-extrabold text-black shadow-lg sm:text-base">
                  מערבבים!
                </span>
              </div>
            ) : null}

            {gameOver ? (
              <SoloGameEndInterstitialOverlay
                didWin={won}
                onDone={completeEndInterstitial}
              />
            ) : null}
          </div>
        )}
        </SoloV2Playfield>
      </div>
      <SoloGamePortraitRecommendationModal
        show={showPortraitPrompt}
        onDismissRotate={() => {
          dismissPortraitPrompt(false);
          enterFromUserGesture();
        }}
        onContinueAnyway={() => {
          dismissPortraitPrompt(true);
          enterFromUserGesture();
        }}
      />
    </div>
  );
}
