import { useCallback, useEffect, useRef, useState } from "react";
import SoloGameMobileFullscreenButton from "../SoloGameMobileFullscreenButton.jsx";
import SoloGameEndInterstitialOverlay from "../SoloGameEndInterstitialOverlay.jsx";
import SoloGamePortraitRecommendationModal from "../SoloGamePortraitRecommendationModal.jsx";
import { useSoloGameMobileFullscreen } from "../../../hooks/solo-games/useSoloGameMobileFullscreen.js";
import {
  FRUIT_SLICE_BG,
  FRUIT_SLICE_MAX_STRIKES,
  FRUIT_SLICE_SCORE_TARGET,
  FRUIT_TYPES,
  fruitSliceAccuracy,
  fruitSliceSwipeScore,
  normalizeFruitSliceDifficulty,
} from "../../../lib/solo-games/fruit-slice-config.js";

const HIT_RADIUS = 22;
const EMOJI_SIZE = 36;
const BOMB_CHANCE = 0.11;
const SPAWN_INTERVAL_MS = 1050;

/**
 * @param {{ x1: number, y1: number, x2: number, y2: number, cx: number, cy: number, r: number }} p
 */
function segmentHitsCircle(p) {
  const dx = p.x2 - p.x1;
  const dy = p.y2 - p.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1) {
    return Math.hypot(p.cx - p.x1, p.cy - p.y1) <= p.r;
  }
  let t = ((p.cx - p.x1) * dx + (p.cy - p.y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const px = p.x1 + t * dx;
  const py = p.y1 + t * dy;
  return Math.hypot(p.cx - px, p.cy - py) <= p.r;
}

/**
 * @param {{
 *   autoStart?: boolean,
 *   initialDifficulty?: string,
 *   onSessionEnd?: (metrics: object) => void,
 * }} props
 */
export default function MleoFruitSliceEngine({
  autoStart = false,
  initialDifficulty = "medium",
  onSessionEnd,
}) {
  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const pendingSessionEndRef = useRef(null);
  const boardRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const swipeRef = useRef(null);
  const lastSpawnRef = useRef(0);
  const idRef = useRef(0);

  const runningRef = useRef(false);
  const difficultyRef = useRef(normalizeFruitSliceDifficulty(initialDifficulty));
  const scoreRef = useRef(0);
  const strikesRef = useRef(0);
  const slicedFruitsRef = useRef(0);
  const missedFruitsRef = useRef(0);
  const bombHitsRef = useRef(0);
  const combosRef = useRef(0);
  const bestComboRef = useRef(0);
  const fruitsRef = useRef([]);
  const particlesRef = useRef([]);

  const [showIntro, setShowIntro] = useState(!autoStart);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [targetScore, setTargetScore] = useState(FRUIT_SLICE_SCORE_TARGET.medium);
  const [flashBad, setFlashBad] = useState(false);

  const {
    isFullscreen,
    showPortraitPrompt,
    dismissPortraitPrompt,
    syncPortraitPromptForRun,
    enterFromUserGesture,
    toggleFromUserGesture,
    showFullscreenButton,
  } = useSoloGameMobileFullscreen({
    gameKey: "fruit-slice",
    gameRunning,
    showIntro,
    gameOver,
  });

  useEffect(() => {
    difficultyRef.current = normalizeFruitSliceDifficulty(initialDifficulty);
    setTargetScore(FRUIT_SLICE_SCORE_TARGET[difficultyRef.current]);
  }, [initialDifficulty]);

  useEffect(() => {
    const wrapper = document.getElementById("game-wrapper");
    if (!wrapper) return undefined;
    const block = (e) => {
      if (e.target?.closest?.("button")) return;
      e.preventDefault();
    };
    wrapper.addEventListener("contextmenu", block);
    return () => wrapper.removeEventListener("contextmenu", block);
  }, []);

  const addParticles = (x, y, color, count = 8) => {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 2 + Math.random() * 3.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        color,
      });
    }
  };

  const spawnFruit = useCallback((w, h) => {
    const roll = Math.random();
    const type = roll < BOMB_CHANCE ? FRUIT_TYPES[4] : FRUIT_TYPES[Math.floor(Math.random() * 4)];
    idRef.current += 1;
    fruitsRef.current.push({
      id: idRef.current,
      type,
      x: 48 + Math.random() * (w - 96),
      y: h + 36,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -(7.2 + Math.random() * 2.8),
      rot: Math.random() * Math.PI,
      rotSpeed: (Math.random() - 0.5) * 0.08,
      sliced: false,
    });
  }, []);

  const registerStrike = useCallback((reason) => {
    if (!runningRef.current) return;
    strikesRef.current += 1;
    setStrikes(strikesRef.current);
    if (reason === "miss") missedFruitsRef.current += 1;
    if (reason === "bomb") bombHitsRef.current += 1;
    setFlashBad(true);
    window.setTimeout(() => setFlashBad(false), 320);
    if (strikesRef.current >= FRUIT_SLICE_MAX_STRIKES) {
      runningRef.current = false;
      setGameRunning(false);
      setGameOver(true);
      const didWin = scoreRef.current >= FRUIT_SLICE_SCORE_TARGET[difficultyRef.current];
      setWon(didWin);
      pendingSessionEndRef.current = { didWin };
    }
  }, []);

  const fireSessionEnd = useCallback(
    (didWin) => {
      if (!onSessionEnd || sessionEndFiredRef.current) return;
      sessionEndFiredRef.current = true;
      const durationMs =
        playStartedAtRef.current != null ? Math.max(0, Date.now() - playStartedAtRef.current) : 0;
      const sliced = slicedFruitsRef.current;
      const missed = missedFruitsRef.current;
      const bombHits = bombHitsRef.current;
      onSessionEnd({
        score: scoreRef.current,
        didWin,
        difficulty: difficultyRef.current,
        levelReached: 0,
        mistakes: strikesRef.current,
        timeRemainingSec: 0,
        durationMs,
        durationSec: Math.floor(durationMs / 1000),
        slicedFruits: sliced,
        missedFruits: missed,
        bombHits,
        strikes: strikesRef.current,
        combos: combosRef.current,
        bestCombo: bestComboRef.current,
        accuracy: fruitSliceAccuracy(sliced, missed, bombHits),
      });
    },
    [onSessionEnd],
  );

  const completeEndInterstitial = () => {
    const pending = pendingSessionEndRef.current;
    if (!pending) return;
    pendingSessionEndRef.current = null;
    fireSessionEnd(pending.didWin);
  };

  const handleSliceSegment = useCallback(
    (x1, y1, x2, y2) => {
      if (!runningRef.current || Math.hypot(x2 - x1, y2 - y1) < 6) return;

      const hitIds = new Set();
      for (const f of fruitsRef.current) {
        if (segmentHitsCircle({ x1, y1, x2, y2, cx: f.x, cy: f.y, r: HIT_RADIUS })) {
          hitIds.add(f.id);
        }
      }
      if (!hitIds.size) return;

      let goodCount = 0;
      let bombHit = false;

      fruitsRef.current = fruitsRef.current.filter((f) => {
        if (!hitIds.has(f.id)) return true;
        if (f.type.bad) {
          bombHit = true;
          addParticles(f.x, f.y, "#ef4444", 10);
          return false;
        }
        goodCount += 1;
        f.sliced = true;
        addParticles(f.x, f.y, "#fbbf24", 8);
        return false;
      });

      if (bombHit) {
        registerStrike("bomb");
        return;
      }

      if (goodCount > 0) {
        const { points, comboBonus } = fruitSliceSwipeScore(goodCount);
        scoreRef.current += points;
        setScore(scoreRef.current);
        slicedFruitsRef.current += goodCount;
        if (goodCount >= 2) {
          combosRef.current += 1;
          if (goodCount > bestComboRef.current) bestComboRef.current = goodCount;
        }
        if (comboBonus > 0) {
          /* combo bonus already included in points */
        }
      }
    },
    [registerStrike],
  );

  const startGame = useCallback(() => {
    sessionEndFiredRef.current = false;
    pendingSessionEndRef.current = null;
    playStartedAtRef.current = Date.now();
    scoreRef.current = 0;
    strikesRef.current = 0;
    slicedFruitsRef.current = 0;
    missedFruitsRef.current = 0;
    bombHitsRef.current = 0;
    combosRef.current = 0;
    bestComboRef.current = 0;
    fruitsRef.current = [];
    particlesRef.current = [];
    lastSpawnRef.current = 0;
    swipeRef.current = null;

    const diff = normalizeFruitSliceDifficulty(initialDifficulty);
    difficultyRef.current = diff;
    setTargetScore(FRUIT_SLICE_SCORE_TARGET[diff]);

    setShowIntro(false);
    setGameOver(false);
    setWon(false);
    setScore(0);
    setStrikes(0);
    setFlashBad(false);

    syncPortraitPromptForRun();
    setGameRunning(true);
    runningRef.current = true;
  }, [initialDifficulty, syncPortraitPromptForRun]);

  useEffect(() => {
    if (autoStart) startGame();
    return () => {
      runningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [autoStart, startGame]);

  useEffect(() => {
    const board = boardRef.current;
    const canvas = canvasRef.current;
    if (!board || !canvas || !gameRunning) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const resize = () => {
      const rect = board.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    let lastTs = performance.now();

    const tick = (ts) => {
      if (!runningRef.current && !gameOver) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const dt = Math.min(32, ts - lastTs);
      lastTs = ts;
      const rect = board.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      if (runningRef.current && ts - lastSpawnRef.current > SPAWN_INTERVAL_MS) {
        spawnFruit(w, h);
        if (Math.random() < 0.38) spawnFruit(w, h);
        lastSpawnRef.current = ts;
      }

      const nextFruits = [];
      for (const f of fruitsRef.current) {
        f.x += f.vx * (dt / 16);
        f.y += f.vy * (dt / 16);
        f.vy += 0.1 * (dt / 16);
        f.rot += f.rotSpeed * (dt / 16);

        const out =
          f.y > h + 60 ||
          f.y < -80 ||
          f.x < -60 ||
          f.x > w + 60;

        if (out) {
          if (runningRef.current && !f.type.bad && !f.sliced) {
            registerStrike("miss");
          }
        } else {
          nextFruits.push(f);
        }
      }
      fruitsRef.current = nextFruits;

      particlesRef.current = particlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx * (dt / 16),
          y: p.y + p.vy * (dt / 16),
          vy: p.vy + 0.1 * (dt / 16),
          life: p.life - 0.028 * (dt / 16),
        }))
        .filter((p) => p.life > 0);

      ctx.clearRect(0, 0, w, h);

      for (const f of fruitsRef.current) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.font = `${EMOJI_SIZE}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(f.type.emoji, 0, 0);
        ctx.restore();
      }

      for (const p of particlesRef.current) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 + p.life * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      const swipe = swipeRef.current;
      if (swipe && swipe.points.length >= 2) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        const pts = swipe.points.slice(-14);
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gameRunning, gameOver, spawnFruit, registerStrike]);

  const onPointerDown = (e) => {
    if (!runningRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    swipeRef.current = {
      pointerId: e.pointerId,
      points: [{ x: e.clientX - rect.left, y: e.clientY - rect.top }],
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const swipe = swipeRef.current;
    if (!swipe || swipe.pointerId !== e.pointerId || !runningRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const prev = swipe.points[swipe.points.length - 1];
    swipe.points.push({ x, y });
    if (prev) handleSliceSegment(prev.x, prev.y, x, y);
  };

  const onPointerUp = (e) => {
    if (swipeRef.current?.pointerId === e.pointerId) swipeRef.current = null;
  };

  return (
    <div
      id="game-wrapper"
      className="relative isolate flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-900 text-white select-none solo-game-mobile-fullscreen-shell"
      dir="rtl"
    >
      {!showIntro && (
        <div className="relative flex min-h-0 w-full flex-1 flex-col px-1 pb-1 pt-1">
          <div className="pointer-events-none absolute left-1/2 top-2 z-[80] max-w-[98vw] -translate-x-1/2 rounded-lg bg-black/65 px-3 py-2 text-center text-[11px] font-bold leading-snug sm:text-sm">
            <span className="text-amber-300">ניקוד: {score}</span>
            {" · "}
            <span>יעד: {targetScore}</span>
            {" · "}
            <span>
              פסילות: {strikes}/{FRUIT_SLICE_MAX_STRIKES}
            </span>
          </div>

          <div
            ref={boardRef}
            className={`relative z-0 mx-auto mt-11 flex h-full min-h-0 w-full max-w-[1180px] flex-1 overflow-hidden rounded-lg border-4 border-yellow-400 bg-black/30 shadow-lg sm:mt-12 ${
              flashBad ? "ring-4 ring-rose-500 ring-inset" : ""
            }`}
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.06), rgba(0,0,0,0.18)), url(${FRUIT_SLICE_BG})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              touchAction: "none",
            }}
          >
            {showFullscreenButton ? (
              <div className="pointer-events-auto absolute right-2 top-2 z-[70]">
                <SoloGameMobileFullscreenButton
                  isFullscreen={isFullscreen}
                  onToggle={toggleFromUserGesture}
                />
              </div>
            ) : null}

            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full touch-none"
              style={{ touchAction: "none" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />

            {gameOver ? (
              <SoloGameEndInterstitialOverlay didWin={won} onDone={completeEndInterstitial} />
            ) : null}
          </div>
        </div>
      )}

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
