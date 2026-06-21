import { useEffect, useRef, useState } from "react";
import { useSoloGameKeyboard } from "./solo-v2-ui.jsx";
import confetti from "canvas-confetti";

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

  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showIntro, setShowIntro] = useState(!autoStart);
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

  const allImages = Array.from({ length: 50 }, (_, i) => `/images/card/shiba${i + 1}.png`);
  const flipSound = typeof Audio !== "undefined" ? new Audio("/sounds/flap.mp3") : null;

  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  const difficultySettings = {
    easy: { num: 6, score: 1000, time: 120, label: "קל" },
    medium: { num: 12, score: 3000, time: 240, label: "בינוני" },
    hard: { num: 20, score: 6000, time: 360, label: "קשה" },
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

  function initGameWithDifficulty(diffKey) {
    sessionEndFiredRef.current = false;
    playStartedAtRef.current = Date.now();
    const { score: startScore, time, num } = difficultySettings[diffKey];
    initialScoreRef.current = startScore;
    const cardImages = [...allImages].sort(() => Math.random() - 0.5).slice(0, num);

    const duplicated = [...cardImages, ...cardImages]
      .sort(() => Math.random() - 0.5)
      .map((src, i) => ({ id: i, src }));

    setCards(duplicated);
    setFlipped([]);
    setMatched([]);
    setScore(startScore);
    scoreRef.current = startScore;
    setTime(time);
    setGameOver(false);
    setDidWin(false);
    setTimerRunning(false);
    setStartedPlaying(false);
    setGameRunning(true);
    setFocusIndex(0);
  }

  useEffect(() => {
    if (autoStart) initGameWithDifficulty(initialDifficulty || difficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, initialDifficulty]);

  // ✅ ספירה לאחור
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

  // ✅ עצירה והכרזה על ניצחון + אפקט
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
    if (gameOver || !gameRunning) return;
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

      if (card1.src === card2.src) setMatched((prev) => [...prev, first, second]);
      else setScore((s) => {
        const next = Math.max(0, s - 10);
        scoreRef.current = next;
        return next;
      });

      setTimeout(() => setFlipped([]), 1200);
    }
  }
  const totalCards = cards.length;
  let columns = windowWidth < 600 ? Math.min(6, totalCards) : Math.min(10, totalCards);
  const rows = Math.ceil(totalCards / columns);
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

  useSoloGameKeyboard(gameRunning && !gameOver && !showIntro, (e) => {
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
        className="flex h-full min-h-0 flex-1 flex-col items-center justify-start overflow-hidden bg-gray-900 text-white w-full relative"
      >
        {!showIntro && (
          <>
            <div className="flex shrink-0 justify-center items-center gap-3 py-2">
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

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 pb-2">
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
                    <div
                      key={card.id}
                      onClick={() => handleFlip(card)}
                      className={`flex cursor-pointer items-center justify-center rounded-lg bg-yellow-500 transition hover:scale-105 ${
                        isFocused ? "ring-4 ring-sky-400" : ""
                      }`}
                      style={{ width: `${cardWidth}px`, height: `${cardWidth * 1.35}px` }}
                    >
                      {isFlipped ? (
                        <img src={card.src} alt="card" className="h-[90%] w-[90%] rounded-md object-cover" />
                      ) : (
                        <div className="h-[90%] w-[90%] rounded-md bg-gray-300" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
  );
}
