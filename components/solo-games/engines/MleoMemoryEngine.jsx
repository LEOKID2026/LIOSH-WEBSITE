import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import RewardCardImage from "../../student/rewards/RewardCardImage.jsx";
import { buildMemoryDeckFromShop } from "../../../lib/solo-games/memory-shop-cards.client.js";
import { useSoloGameShellUi } from "../../../hooks/solo-games/useSoloGameShellUi.js";
import { useSoloGameMobileFullscreen } from "../../../hooks/solo-games/useSoloGameMobileFullscreen.js";
import { useSoloEngineAudio } from "../../../hooks/solo-games/useSoloGameAudio.js";
import SoloGameMobileFullscreenButton from "../SoloGameMobileFullscreenButton.jsx";
import SoloGameEndInterstitialOverlay from "../SoloGameEndInterstitialOverlay.jsx";
import SoloGamePortraitRecommendationModal from "../SoloGamePortraitRecommendationModal.jsx";
import { useSoloGameKeyboard, loadImage } from "./solo-v2-ui.jsx";
import SoloGameNavButtons from "../SoloGameNavButtons.jsx";

const SHOP_CARD_BACK = "/rewards/cards/common/card_back.webp";
const MISMATCH_HOLD_MS = 1200;
/** Portrait shop card: width : height = 2 : 3 */
const CARD_ASPECT = 3 / 2;

/**
 * @param {{ totalCards: number, difficulty: string, boardW: number, boardH: number, isMobile: boolean }} opts
 */
function computeMemoryGridLayout({ totalCards, difficulty, boardW, boardH, isMobile }) {
  if (!totalCards || boardW < 40 || boardH < 40) {
    return { columns: 4, rows: 3, cardWidth: 72, cardHeight: 108, gap: 8 };
  }

  const gapMin = isMobile ? 4 : 6;
  const gapMax = isMobile ? 8 : 10;
  const minCardW = isMobile ? 52 : 64;
  const maxCardWByDiff = {
    easy: isMobile ? 132 : 220,
    medium: isMobile ? 112 : 180,
    hard: isMobile ? 96 : 148,
  };
  const maxCardW = maxCardWByDiff[difficulty] || maxCardWByDiff.medium;

  const colPrefs = {
    easy: isMobile ? [3, 4, 2] : [4, 3, 6, 2],
    medium: isMobile ? [4, 2] : [4, 8, 2],
    hard: isMobile ? [4, 3] : [6, 8, 4, 3],
  };
  const prefs = colPrefs[difficulty] || colPrefs.medium;

  const candidates = [];
  const seen = new Set();
  const addCols = (cols) => {
    if (cols < 2 || cols > totalCards || seen.has(cols)) return;
    seen.add(cols);
    candidates.push({ cols, rows: Math.ceil(totalCards / cols) });
  };
  prefs.forEach(addCols);
  const maxCols = isMobile ? 4 : 8;
  for (let cols = 2; cols <= Math.min(totalCards, maxCols); cols += 1) addCols(cols);

  let best = null;
  for (const { cols, rows } of candidates) {
    for (let gap = gapMax; gap >= gapMin; gap -= 2) {
      const maxW = (boardW - gap * (cols - 1)) / cols;
      const maxH = (boardH - gap * (rows - 1)) / rows;
      let cardW = Math.min(maxW, maxH / CARD_ASPECT);
      cardW = Math.max(minCardW, Math.min(maxCardW, cardW));
      const cardH = cardW * CARD_ASPECT;
      const gridW = cardW * cols + gap * (cols - 1);
      const gridH = cardH * rows + gap * (rows - 1);
      if (gridW > boardW + 0.5 || gridH > boardH + 0.5) continue;

      if (!best || cardW > best.cardWidth) {
        best = {
          columns: cols,
          rows,
          cardWidth: Math.floor(cardW),
          cardHeight: Math.floor(cardH),
          gap,
        };
      }
    }
  }

  return best || { columns: 4, rows: 3, cardWidth: 72, cardHeight: 108, gap: 8 };
}

/**
 * @param {{
 *   autoStart?: boolean,
 *   initialDifficulty?: string,
 *   onSessionEnd?: (metrics: object) => void,
 *   onPreGameUiChange?: (active: boolean) => void,
 *   deckBuilder?: (pairCount: number) => Promise<{ ok: true, deck: object[] } | { ok: false, reason: string }>,
 * }} props
 */
export default function MleoMemoryEngine({
  autoStart = false,
  initialDifficulty = "medium",
  onSessionEnd,
  onPreGameUiChange,
  deckBuilder = buildMemoryDeckFromShop,
}) {
  const sfx = useSoloEngineAudio();

  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const pendingSessionEndRef = useRef(null);
  const initialScoreRef = useRef(0);
  const initSeqRef = useRef(0);

  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showIntro, setShowIntro] = useState(!autoStart);
  const [deckLoading, setDeckLoading] = useState(false);
  const [deckError, setDeckError] = useState(false);
  const [score, setScore] = useState(0);
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const matchedRef = useRef([]);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [boardSize, setBoardSize] = useState({ w: 0, h: 0 });
  const boardRef = useRef(null);
  const [time, setTime] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [startedPlaying, setStartedPlaying] = useState(false);
  const [didWin, setDidWin] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const [keyboardNavActive, setKeyboardNavActive] = useState(false);
  const scoreRef = useRef(0);
  const { SG, pageBgStyle } = useSoloGameShellUi();
  const isPreGame = deckLoading || deckError;

  const {
    isFullscreen,
    showPortraitPrompt,
    dismissPortraitPrompt,
    syncPortraitPromptForRun,
    enterFromUserGesture,
    toggleFromUserGesture,
    showFullscreenButton,
  } = useSoloGameMobileFullscreen({
    gameKey: "memory",
    gameRunning,
    showIntro,
    gameOver,
  });

  useEffect(() => {
    onPreGameUiChange?.(isPreGame);
    return () => onPreGameUiChange?.(false);
  }, [isPreGame, onPreGameUiChange]);

  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  const difficultySettings = {
    easy: { pairs: 6, score: 1000, time: 120, label: "קל" },
    medium: { pairs: 8, score: 3000, time: 240, label: "בינוני" },
    hard: { pairs: 12, score: 6000, time: 360, label: "קשה" },
  };

  const fireSessionEnd = (finalScore, won, timeLeft) => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    const initial = initialScoreRef.current || difficultySettings[difficulty]?.score || 0;
    const mistakes = Math.max(0, Math.round((initial - finalScore) / 10));
    const pairsMatched = Math.floor(matchedRef.current.length / 2);
    onSessionEnd({
      score: finalScore,
      didWin: won,
      difficulty,
      mistakes,
      pairsMatched,
      timeRemainingSec: timeLeft,
      durationMs:
        playStartedAtRef.current != null
          ? Math.max(0, Date.now() - playStartedAtRef.current)
          : undefined,
    });
  };

  const endGame = (won, timeLeftVal) => {
    if (pendingSessionEndRef.current) return;
    setTimerRunning(false);
    setGameOver(true);
    setDidWin(won);
    pendingSessionEndRef.current = { won, timeLeft: timeLeftVal };
  };

  const completeEndInterstitial = () => {
    const pending = pendingSessionEndRef.current;
    if (!pending) return;
    pendingSessionEndRef.current = null;
    fireSessionEnd(scoreRef.current, pending.won, pending.timeLeft);
  };

  async function initGameWithDifficulty(diffKey) {
    const seq = initSeqRef.current + 1;
    initSeqRef.current = seq;
    sessionEndFiredRef.current = false;
    pendingSessionEndRef.current = null;
    playStartedAtRef.current = Date.now();
    const { score: startScore, time, pairs } = difficultySettings[diffKey] || difficultySettings.medium;
    initialScoreRef.current = startScore;

    setDeckLoading(true);
    setDeckError(false);
    setFlipped([]);
    setMatched([]);
    matchedRef.current = [];
    setScore(startScore);
    scoreRef.current = startScore;
    setTime(time);
    setGameOver(false);
    setDidWin(false);
    setTimerRunning(false);
    setStartedPlaying(false);
    setFocusIndex(0);
    setKeyboardNavActive(false);
    setCards([]);
    setGameRunning(false);

    const result = await deckBuilder(pairs);
    if (initSeqRef.current !== seq) return;

    if (!result.ok) {
      setDeckError(true);
      setDeckLoading(false);
      return;
    }

    setCards(result.deck);
    syncPortraitPromptForRun();
    setGameRunning(true);
    setDeckLoading(false);
    void Promise.all([loadImage(SHOP_CARD_BACK), ...result.deck.map((c) => loadImage(c.src))]);
  }

  useEffect(() => {
    if (autoStart) initGameWithDifficulty(initialDifficulty || difficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, initialDifficulty]);

  useEffect(() => {
    if (!timerRunning) return;

    const interval = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          endGame(false, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    if (matched.length > 0 && matched.length === cards.length) {
      setDidWin(true);
      setGameOver(true);
      confetti({ particleCount: 120, spread: 100, origin: { y: 0.6 } });
      endGame(true, time);
    }
  }, [matched, cards, time]);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return undefined;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setBoardSize({
        w: Math.max(0, Math.floor(rect.width)),
        h: Math.max(0, Math.floor(rect.height)),
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [deckLoading, deckError, showIntro, gameRunning]);

  function handleFlip(card) {
    if (gameOver || !gameRunning || deckLoading) return;
    setKeyboardNavActive(false);
    if (!startedPlaying) {
      setStartedPlaying(true);
      setTimerRunning(true);
    }
    if (flipped.length === 2 || flipped.includes(card.id) || matched.includes(card.id)) return;

    sfx.playFlap();
    const newFlipped = [...flipped, card.id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      const card1 = cards.find((c) => c.id === first);
      const card2 = cards.find((c) => c.id === second);

      if (card1?.pairKey && card1.pairKey === card2?.pairKey) {
        sfx.playMatchOk();
        setMatched((prev) => {
          const next = [...prev, first, second];
          matchedRef.current = next;
          return next;
        });
        setFlipped([]);
      } else {
        sfx.playMatchBad();
        setScore((s) => {
          const next = Math.max(0, s - 10);
          scoreRef.current = next;
          return next;
        });
        const started = Date.now();
        const closeAt = started + MISMATCH_HOLD_MS;
        void Promise.all([loadImage(card1?.src), loadImage(card2?.src)]).then(() => {
          const delay = Math.max(0, closeAt - Date.now());
          window.setTimeout(() => setFlipped([]), delay);
        });
      }
    }
  }

  const totalCards = cards.length;
  const isMobileViewport =
    typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
  const isMobile = boardSize.w > 0 ? boardSize.w < 640 : isMobileViewport;
  const fallbackBoardW =
    typeof window !== "undefined"
      ? isMobileViewport
        ? window.innerWidth
        : window.innerWidth * 0.92
      : 360;
  const fallbackBoardH =
    typeof window !== "undefined"
      ? isMobileViewport
        ? Math.max(280, window.innerHeight * 0.62)
        : window.innerHeight * 0.5
      : 400;
  const layout = computeMemoryGridLayout({
    totalCards,
    difficulty,
    boardW: boardSize.w || fallbackBoardW,
    boardH: boardSize.h || fallbackBoardH,
    isMobile,
  });
  const { columns, cardWidth, cardHeight, gap: gapSize } = layout;

  useSoloGameKeyboard(gameRunning && !gameOver && !showIntro && !deckLoading && !deckError, (e) => {
    setKeyboardNavActive(true);
    if (e.code === "ArrowRight") {
      setFocusIndex((i) => Math.min(totalCards - 1, i + 1));
      return true;
    }
    if (e.code === "ArrowLeft") {
      setFocusIndex((i) => Math.max(0, i - 1));
      return true;
    }
    if (e.code === "ArrowDown") {
      setFocusIndex((i) => Math.min(totalCards - 1, i + columns));
      return true;
    }
    if (e.code === "ArrowUp") {
      setFocusIndex((i) => Math.max(0, i - columns));
      return true;
    }
    if (e.code === "Enter" || e.code === "Space") {
      const card = cards[focusIndex];
      if (card) handleFlip(card);
      return true;
    }
    return false;
  });

  const playWrap =
    "relative isolate flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-gray-900 text-white select-none solo-game-mobile-fullscreen-shell";

  return (
    <div
      id="game-wrapper"
      className={isPreGame ? SG.preGameWrap : playWrap}
      style={isPreGame ? pageBgStyle : undefined}
    >
      {!showIntro && (
        <div className="flex min-h-0 w-full flex-1 flex-col">
          {!deckError ? (
            <div className="flex w-full shrink-0 items-center justify-center gap-3 py-2 max-lg:gap-2 max-lg:py-1">
              <div className="h-3 w-24 overflow-hidden rounded-full bg-gray-700 sm:w-32">
                <div
                  className={`h-full ${
                    time / difficultySettings[difficulty].time > 0.6
                      ? "bg-green-500"
                      : time / difficultySettings[difficulty].time > 0.3
                        ? "bg-yellow-400"
                        : "bg-red-500"
                  } transition-all duration-500`}
                  style={{ width: `${(time / difficultySettings[difficulty].time) * 100}%` }}
                />
              </div>
              <div className="rounded-lg bg-black/60 px-2 py-1 text-sm font-bold">⏳ {time} שנ׳</div>
              <div className="rounded-lg bg-black/60 px-2 py-1 text-sm font-bold">⭐ {score}</div>
            </div>
          ) : null}

          <div
            ref={boardRef}
            className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden px-2 pb-2 max-lg:px-0 max-lg:pb-1"
          >
            {showFullscreenButton ? (
              <div className="pointer-events-auto absolute right-2 top-2 z-[70]">
                <SoloGameMobileFullscreenButton
                  isFullscreen={isFullscreen}
                  onToggle={toggleFromUserGesture}
                />
              </div>
            ) : null}

            {deckLoading ? (
              <p className={SG.preGameLoading}>טוען קלפים מהחנות…</p>
            ) : deckError ? (
              <div className="flex max-w-sm flex-col items-center gap-4 px-4 text-center">
                <p className={SG.preGameErrorTitle}>
                  לא נמצאו מספיק קלפי חנות למשחק זיכרון
                </p>
                <p className={SG.preGameErrorSub}>
                  חזור לחנות הקלפים ובדוק שיש קלפים זמינים
                </p>
                <SoloGameNavButtons
                  primaryLabel="נסה שוב"
                  onPrimary={() => initGameWithDifficulty(difficulty)}
                />
              </div>
            ) : (
              <div
                className={`mx-auto ${gameOver ? "pointer-events-none opacity-50" : ""}`}
                style={{
                  display: "grid",
                  gap: `${gapSize}px`,
                  gridTemplateColumns: `repeat(${columns}, ${cardWidth}px)`,
                  justifyContent: "center",
                  alignContent: "center",
                  width: "100%",
                  maxWidth: `${cardWidth * columns + gapSize * (columns - 1)}px`,
                  height: "100%",
                  maxHeight: `${layout.cardHeight * layout.rows + gapSize * (layout.rows - 1)}px`,
                }}
              >
                {cards.map((card, idx) => {
                  const isFlipped = flipped.includes(card.id) || matched.includes(card.id);
                  const isMatched = matched.includes(card.id);
                  const isFocused = keyboardNavActive && idx === focusIndex;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => handleFlip(card)}
                      className={`relative flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                        isFocused ? "ring-4 ring-sky-400" : isMatched ? "border-emerald-400/80" : "border-yellow-400/30"
                      } ${isFlipped ? "border-yellow-300/70 bg-transparent" : "border-amber-500/40 bg-slate-900"}`}
                      style={{ width: `${cardWidth}px`, height: `${cardHeight}px` }}
                      aria-label={isFlipped ? card.nameHe || "קלף פתוח" : "קלף סגור"}
                    >
                      {isFlipped ? (
                        <RewardCardImage
                          src={card.src}
                          preBaked={card.preBaked}
                          size="tile"
                          fit="cover"
                          loading="eager"
                          alt={card.nameHe || "קלף"}
                          wrapperClassName="absolute inset-0 h-full w-full"
                          className="h-full w-full"
                        />
                      ) : (
                        <img
                          src={SHOP_CARD_BACK}
                          alt=""
                          className="h-full w-full object-contain"
                          draggable={false}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {gameOver && !showIntro ? (
        <SoloGameEndInterstitialOverlay
          didWin={didWin}
          onDone={completeEndInterstitial}
        />
      ) : null}

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
