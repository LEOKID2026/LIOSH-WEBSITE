import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import RewardCardImage from "../../student/rewards/RewardCardImage.jsx";
import { buildMemoryDeckFromShop } from "../../../lib/solo-games/memory-shop-cards.client.js";
import { useSoloGameKeyboard } from "./solo-v2-ui.jsx";

/**
 * @param {{ autoStart?: boolean, initialDifficulty?: string, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoMemoryEngine({
  autoStart = false,
  initialDifficulty = "medium",
  onSessionEnd,
}) {
  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
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
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [windowWidth, setWindowWidth] = useState(1200);
  const [windowHeight, setWindowHeight] = useState(800);
  const [time, setTime] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [startedPlaying, setStartedPlaying] = useState(false);
  const [didWin, setDidWin] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const scoreRef = useRef(0);

  const flipSound = typeof Audio !== "undefined" ? new Audio("/sounds/flap.mp3") : null;

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
    onSessionEnd({
      score: finalScore,
      didWin: won,
      difficulty,
      mistakes,
      timeRemainingSec: timeLeft,
      durationMs:
        playStartedAtRef.current != null
          ? Math.max(0, Date.now() - playStartedAtRef.current)
          : undefined,
    });
  };

  async function initGameWithDifficulty(diffKey) {
    const seq = initSeqRef.current + 1;
    initSeqRef.current = seq;
    sessionEndFiredRef.current = false;
    playStartedAtRef.current = Date.now();
    const { score: startScore, time, pairs } = difficultySettings[diffKey] || difficultySettings.medium;
    initialScoreRef.current = startScore;

    setDeckLoading(true);
    setDeckError(false);
    setFlipped([]);
    setMatched([]);
    setScore(startScore);
    scoreRef.current = startScore;
    setTime(time);
    setGameOver(false);
    setDidWin(false);
    setTimerRunning(false);
    setStartedPlaying(false);
    setFocusIndex(0);
    setCards([]);
    setGameRunning(false);

    const result = await buildMemoryDeckFromShop(pairs);
    if (initSeqRef.current !== seq) return;

    if (!result.ok) {
      setDeckError(true);
      setDeckLoading(false);
      return;
    }

    setCards(result.deck);
    setGameRunning(true);
    setDeckLoading(false);
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
          setTimerRunning(false);
          setGameOver(true);
          setDidWin(false);
          fireSessionEnd(scoreRef.current, false, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    if (matched.length > 0 && matched.length === cards.length) {
      setTimerRunning(false);
      setDidWin(true);
      setGameOver(true);
      confetti({ particleCount: 120, spread: 100, origin: { y: 0.6 } });
      fireSessionEnd(scoreRef.current, true, time);
    }
  }, [matched, cards, time]);

  useEffect(() => {
    const updateSize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    window.addEventListener("orientationchange", updateSize);
    return () => {
      window.removeEventListener("resize", updateSize);
      window.removeEventListener("orientationchange", updateSize);
    };
  }, []);

  function handleFlip(card) {
    if (gameOver || !gameRunning || deckLoading) return;
    if (!startedPlaying) {
      setStartedPlaying(true);
      setTimerRunning(true);
    }
    if (flipped.length === 2 || flipped.includes(card.id) || matched.includes(card.id)) return;

    flipSound?.play().catch(() => {});
    const newFlipped = [...flipped, card.id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      const card1 = cards.find((c) => c.id === first);
      const card2 = cards.find((c) => c.id === second);

      if (card1?.pairKey && card1.pairKey === card2?.pairKey) {
        setMatched((prev) => [...prev, first, second]);
      } else {
        setScore((s) => {
          const next = Math.max(0, s - 10);
          scoreRef.current = next;
          return next;
        });
      }

      setTimeout(() => setFlipped([]), 1200);
    }
  }

  const totalCards = cards.length;
  let columns = windowWidth < 600 ? Math.min(6, totalCards) : Math.min(10, totalCards);
  const rows = Math.ceil(totalCards / Math.max(columns, 1));
  const containerWidth = windowWidth * 0.95;
  const containerHeight = typeof window !== "undefined" ? window.innerHeight * 0.55 : 500;
  const gapSize = windowWidth < 600 ? 4 : windowWidth < 1024 ? 6 : 10;
  const cardWidth = Math.max(
    35,
    Math.min(
      windowWidth < 600 ? 72 : 110,
      Math.min(containerWidth / Math.max(columns, 1) - 6, containerHeight / Math.max(rows, 1) / 1.35 - 6)
    )
  );

  useSoloGameKeyboard(gameRunning && !gameOver && !showIntro && !deckLoading && !deckError, (e) => {
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

  return (
    <div
      id="game-wrapper"
      className="relative flex h-full min-h-0 w-full flex-1 flex-col items-center justify-start overflow-hidden bg-gray-900 text-white"
    >
      {!showIntro && (
        <>
          {!deckError ? (
            <div className="flex shrink-0 items-center justify-center gap-3 py-2">
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
              <div className="rounded-lg bg-black/60 px-2 py-1 text-sm font-bold">⏳ {time}s</div>
              <div className="rounded-lg bg-black/60 px-2 py-1 text-sm font-bold">⭐ {score}</div>
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 pb-2">
            {deckLoading ? (
              <p className="text-sm font-semibold text-yellow-200">טוען קלפים מהחנות…</p>
            ) : deckError ? (
              <div className="flex max-w-sm flex-col items-center gap-4 px-4 text-center">
                <p className="text-base font-extrabold text-rose-200 sm:text-lg">
                  לא נמצאו מספיק קלפי חנות למשחק זיכרון
                </p>
                <p className="text-sm text-gray-300">
                  חזור לחנות הקלפים ובדוק שיש קלפים זמינים
                </p>
                <button
                  type="button"
                  onClick={() => initGameWithDifficulty(difficulty)}
                  className="min-h-[48px] rounded-xl bg-yellow-400 px-8 py-3 text-base font-bold text-black shadow-md"
                >
                  נסה שוב
                </button>
              </div>
            ) : (
              <div
                className={`${gameOver ? "pointer-events-none opacity-50" : ""}`}
                style={{
                  display: "grid",
                  gap: `${gapSize}px`,
                  gridTemplateColumns: `repeat(${columns}, ${cardWidth}px)`,
                  justifyContent: "center",
                  maxWidth: `${containerWidth}px`,
                  maxHeight: `${containerHeight}px`,
                }}
              >
                {cards.map((card, idx) => {
                  const isFlipped = flipped.includes(card.id) || matched.includes(card.id);
                  const isFocused = idx === focusIndex;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => handleFlip(card)}
                      className={`relative flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                        isFocused ? "ring-4 ring-sky-400" : "border-yellow-400/30"
                      } ${isFlipped ? "border-yellow-300/70 bg-slate-900/40" : "border-amber-500/40 bg-gradient-to-br from-amber-600 via-yellow-500 to-amber-700"}`}
                      style={{ width: `${cardWidth}px`, height: `${cardWidth * 1.35}px` }}
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
                          wrapperClassName="h-[92%] w-[88%]"
                        />
                      ) : (
                        <div className="flex h-[92%] w-[88%] flex-col items-center justify-center rounded-md bg-gradient-to-br from-amber-500/90 via-yellow-400/95 to-amber-600/90 shadow-inner ring-1 ring-amber-100/30">
                          <img
                            src="/images/leo-logo.png"
                            alt=""
                            className="h-[42%] w-[42%] object-contain opacity-90 drop-shadow"
                            draggable={false}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
