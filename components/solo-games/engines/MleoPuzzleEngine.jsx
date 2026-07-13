import { useEffect, useRef, useState } from "react";
import SoloGameMobileFullscreenButton from "../SoloGameMobileFullscreenButton.jsx";
import SoloGameEndInterstitialOverlay from "../SoloGameEndInterstitialOverlay.jsx";
import SoloGamePortraitRecommendationModal from "../SoloGamePortraitRecommendationModal.jsx";
import { useSoloGameMobileFullscreen } from "../../../hooks/solo-games/useSoloGameMobileFullscreen.js";
import { useSoloEngineAudio } from "../../../hooks/solo-games/useSoloGameAudio.js";
import { useSoloGameKeyboard } from "./solo-v2-ui.jsx";

const SHAPES = [
  "heart.png",
  "circle.png",
  "square.png",
  "drop.png",
  "diamond.png",
  "star.png",
];

const DIFFICULTY_SETTINGS = {
  easy: { grid: 6, scoreToWin: 500, time: 60 },
  medium: { grid: 7, scoreToWin: 800, time: 90 },
  hard: { grid: 8, scoreToWin: 1400, time: 120 },
};

/**
 * @param {{ autoStart?: boolean, initialDifficulty?: string, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoPuzzleEngine({
  autoStart = false,
  initialDifficulty = "easy",
  onSessionEnd,
}) {
  const sfx = useSoloEngineAudio();
  const clearChainRef = useRef(0);

  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const pendingSessionEndRef = useRef(null);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [grid, setGrid] = useState([]);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(60);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [didWin, setDidWin] = useState(false);
  const [showIntro, setShowIntro] = useState(!autoStart);
  const [selected, setSelected] = useState(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);

  const {
    isFullscreen,
    showPortraitPrompt,
    dismissPortraitPrompt,
    syncPortraitPromptForRun,
    enterFromUserGesture,
    toggleFromUserGesture,
    showFullscreenButton,
  } = useSoloGameMobileFullscreen({
    gameKey: "puzzle",
    gameRunning,
    showIntro,
    gameOver,
  });

  const size = DIFFICULTY_SETTINGS[difficulty].grid;

  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  const fireSessionEnd = (finalScore, won) => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    onSessionEnd({
      score: finalScore,
      didWin: won,
      difficulty,
      timeRemainingSec: 0,
      durationMs:
        playStartedAtRef.current != null
          ? Math.max(0, Date.now() - playStartedAtRef.current)
          : undefined,
    });
  };

  useEffect(() => {
    if (!gameRunning) return;
    if (time <= 0) {
      const won = score >= DIFFICULTY_SETTINGS[difficulty].scoreToWin;
      setGameOver(true);
      setDidWin(won);
      setGameRunning(false);
      pendingSessionEndRef.current = { finalScore: score, won };
      return undefined;
    }
    const interval = setInterval(() => setTime((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [gameRunning, time, score, difficulty]);

  const completeEndInterstitial = () => {
    const pending = pendingSessionEndRef.current;
    if (!pending) return;
    pendingSessionEndRef.current = null;
    fireSessionEnd(pending.finalScore, pending.won);
  };

  useEffect(() => {
    const preventTouchScroll = (e) => {
      if (e.target.closest(".grid")) e.preventDefault();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("touchmove", preventTouchScroll, { passive: false });

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("touchmove", preventTouchScroll);
    };
  }, []);

  const generateGrid = () => {
    const newGrid = [];
    for (let i = 0; i < size * size; i++) {
      const rand = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      newGrid.push(rand);
    }
    setGrid(newGrid);
  };

  const getIndex = (row, col) => row * size + col;
  const getCoords = (index) => [Math.floor(index / size), index % size];

  const areAdjacent = (i1, i2) => {
    const [r1, c1] = getCoords(i1);
    const [r2, c2] = getCoords(i2);
    return (
      (r1 === r2 && Math.abs(c1 - c2) === 1) ||
      (c1 === c2 && Math.abs(r1 - r2) === 1)
    );
  };

  const swapAndCheck = (i1, i2) => {
    const newGrid = [...grid];
    [newGrid[i1], newGrid[i2]] = [newGrid[i2], newGrid[i1]];
    if (hasMatch(newGrid)) {
      clearChainRef.current = 0;
      setGrid(newGrid);
      clearMatches(newGrid);
    }
  };

  const hasMatch = (g) => {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size - 2; c++) {
        const i = getIndex(r, c);
        if (g[i] && g[i] === g[i + 1] && g[i] === g[i + 2]) return true;
      }
    }
    for (let c = 0; c < size; c++) {
      for (let r = 0; r < size - 2; r++) {
        const i = getIndex(r, c);
        if (g[i] && g[i] === g[i + size] && g[i] === g[i + 2 * size]) return true;
      }
    }
    return false;
  };

  const clearMatches = (g) => {
    const toClear = Array(size * size).fill(false);

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size - 2; c++) {
        const i = getIndex(r, c);
        const val = g[i];
        if (val && val === g[i + 1] && val === g[i + 2]) {
          toClear[i] = toClear[i + 1] = toClear[i + 2] = true;
        }
      }
    }

    for (let c = 0; c < size; c++) {
      for (let r = 0; r < size - 2; r++) {
        const i = getIndex(r, c);
        const val = g[i];
        if (val && val === g[i + size] && val === g[i + 2 * size]) {
          toClear[i] = toClear[i + size] = toClear[i + 2 * size] = true;
        }
      }
    }

    let cleared = 0;
    for (let i = 0; i < toClear.length; i++) {
      if (toClear[i]) {
        g[i] = null;
        cleared++;
      }
    }
    if (cleared > 0) {
      sfx.playClearLine();
      if (clearChainRef.current > 0) sfx.playCombo();
      clearChainRef.current += 1;
      setScore((s) => s + cleared * 10);
      fallDown(g);
    }
  };

  const fallDown = (g) => {
    for (let c = 0; c < size; c++) {
      let col = [];
      for (let r = 0; r < size; r++) {
        const i = getIndex(r, c);
        if (g[i]) col.push(g[i]);
      }
      while (col.length < size) {
        col.unshift(SHAPES[Math.floor(Math.random() * SHAPES.length)]);
      }
      for (let r = 0; r < size; r++) {
        g[getIndex(r, c)] = col[r];
      }
    }
    setGrid([...g]);
    setTimeout(() => clearMatches(g), 300);
  };

  const handleClick = (index) => {
    if (selected === null) {
      setSelected(index);
    } else if (selected === index) {
      setSelected(null);
    } else if (areAdjacent(selected, index)) {
      swapAndCheck(selected, index);
      setSelected(null);
    } else {
      setSelected(index);
    }
  };

  const handleTouchStart = (index, e) => {
    const touch = e.touches[0];
    setTouchStart({ index, x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (index, e) => {
    if (!touchStart) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    const threshold = 30;
    let targetIndex = null;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > threshold && getCoords(touchStart.index)[1] < size - 1) {
        targetIndex = touchStart.index + 1;
      } else if (dx < -threshold && getCoords(touchStart.index)[1] > 0) {
        targetIndex = touchStart.index - 1;
      }
    } else {
      if (dy > threshold && getCoords(touchStart.index)[0] < size - 1) {
        targetIndex = touchStart.index + size;
      } else if (dy < -threshold && getCoords(touchStart.index)[0] > 0) {
        targetIndex = touchStart.index - size;
      }
    }

    if (targetIndex !== null && areAdjacent(touchStart.index, targetIndex)) {
      swapAndCheck(touchStart.index, targetIndex);
      setSelected(null);
    }

    setTouchStart(null);
  };

  const startGame = () => {
    sessionEndFiredRef.current = false;
    pendingSessionEndRef.current = null;
    playStartedAtRef.current = Date.now();
    setShowIntro(false);
    syncPortraitPromptForRun();
    setGameRunning(true);
    setGameOver(false);
    setDidWin(false);
    setScore(0);
    setTime(DIFFICULTY_SETTINGS[difficulty].time);
    setFocusIndex(0);
    generateGrid();
  };

  useSoloGameKeyboard(gameRunning && !gameOver && !showIntro, (e) => {
    const [r, c] = getCoords(focusIndex);
    if (e.code === "ArrowRight" && c < size - 1) {
      setFocusIndex(focusIndex + 1);
      return true;
    }
    if (e.code === "ArrowLeft" && c > 0) {
      setFocusIndex(focusIndex - 1);
      return true;
    }
    if (e.code === "ArrowDown" && r < size - 1) {
      setFocusIndex(focusIndex + size);
      return true;
    }
    if (e.code === "ArrowUp" && r > 0) {
      setFocusIndex(focusIndex - size);
      return true;
    }
    if (e.code === "Enter" || e.code === "Space") {
      handleClick(focusIndex);
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (autoStart) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, difficulty]);

  return (
      <div
        id="game-wrapper"
        className="relative isolate flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-900 text-white w-full select-none solo-game-mobile-fullscreen-shell"
        dir="rtl"
      >
        {!showIntro ? (
          <div className="flex min-h-0 w-full flex-1 flex-col">
            {showFullscreenButton ? (
              <div className="pointer-events-auto absolute right-2 top-2 z-[70]">
                <SoloGameMobileFullscreenButton
                  isFullscreen={isFullscreen}
                  onToggle={toggleFromUserGesture}
                />
              </div>
            ) : null}

            <div className="z-10 flex shrink-0 items-center justify-center gap-3 py-2 text-base font-bold max-lg:gap-2 max-lg:py-1 sm:text-lg">
              <div className="rounded bg-black/60 px-3 py-1">⏳ {time} שנ׳</div>
              <div className="rounded bg-black/60 px-3 py-1">⭐ {score}</div>
            </div>

            <div
              className="grid min-h-0 w-full flex-1 touch-none gap-1 content-center justify-center overflow-hidden px-2 pb-2 max-lg:px-1 max-lg:pb-1 lg:mx-auto lg:w-[min(95vw,640px)]"
              style={{
                gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
                maxHeight: "100%",
              }}
            >
              {grid.map((shape, i) => (
                <div
                  key={i}
                  onClick={() => handleClick(i)}
                  onTouchStart={(e) => handleTouchStart(i, e)}
                  onTouchEnd={(e) => handleTouchEnd(i, e)}
                  className={`cursor-pointer select-none rounded bg-gray-700 p-0.5 transition ${
                    selected === i ? "ring-4 ring-yellow-400" : focusIndex === i ? "ring-4 ring-sky-400" : ""
                  }`}
                >
                  <img
                    src={`/images/candy/${shape}`}
                    alt="candy"
                    className="h-auto w-full object-contain"
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {gameOver ? (
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
