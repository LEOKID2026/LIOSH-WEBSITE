import { useEffect, useRef, useState } from "react";
import SoloGameMobileFullscreenButton from "../SoloGameMobileFullscreenButton.jsx";
import SoloGameEndInterstitialOverlay from "../SoloGameEndInterstitialOverlay.jsx";
import SoloGamePortraitRecommendationModal from "../SoloGamePortraitRecommendationModal.jsx";
import { useSoloGameMobileFullscreen } from "../../../hooks/solo-games/useSoloGameMobileFullscreen.js";
import { useSoloEngineAudio } from "../../../hooks/solo-games/useSoloGameAudio.js";

const BG_IMAGES = ["/images/game1.png", "/images/game2.png", "/images/game3.png", "/images/game4.png"];
const SPRITE_DOG = "/images/leo2.png";
const IMG_COIN = "/images/coin.png";
const IMG_DIAMOND = "/images/diamond.png";
const IMG_OBSTACLE = "/images/obstacle1.png";

// Sizes per type (px)
const sizeCoin = 42;
const sizeDiamond = 34;
const sizeBomb = 50;

/**
 * @param {{ autoStart?: boolean, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoFlyerEngine({ autoStart = false, onSessionEnd }) {
  const sfx = useSoloEngineAudio();
  const sfxRef = useRef(sfx);
  sfxRef.current = sfx;

  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const pendingSessionEndRef = useRef(null);
  const boardRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const runningRef = useRef(false);

  // UI / general state
  const [showIntro, setShowIntro] = useState(!autoStart);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [highScore, setHighScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);

  const {
    isFullscreen,
    showPortraitPrompt,
    dismissPortraitPrompt,
    syncPortraitPromptForRun,
    enterFromUserGesture,
    toggleFromUserGesture,
    showFullscreenButton,
  } = useSoloGameMobileFullscreen({
    gameKey: "flyer",
    gameRunning,
    showIntro,
    gameOver,
  });

  // world
  const dogRef = useRef(null);
  const itemsRef = useRef([]);
  const bgIndexRef = useRef(0);
  const gravityRef = useRef(0.08);        // עדין
  const flapPowerRef = useRef(-2.2);      // עדין

  // press-and-hold (mobile) – בלי בוסט חד
  const isFlyingRef = useRef(false);
  const keyFlyRef = useRef(false);

  // timing (dt)
  const lastTimeRef = useRef(performance.now());

  // difficulty timer
  const diffTimerRef = useRef({ lastSpawn: 0 });

  // preloaded assets
  const assetsRef = useRef({
    bgs: [],
    dog: null,
    coin: null,
    diamond: null,
    obstacle: null,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Block context/selection/long-press (scoped; לא חוסם UI)
  useEffect(() => {
    const wrapper = document.getElementById("game-wrapper");
    if (!wrapper) return;

    const isUI = (el) =>
      el.closest?.("a, input, textarea, select, button, [role='textbox'], [contenteditable='true']");

    const preventMenu = (e) => { if (!isUI(e.target)) e.preventDefault(); };
    const preventSelection = (e) => { if (!isUI(e.target)) e.preventDefault(); };

    let touchTimer;
    const handleTouchStart = (e) => {
      if (isUI(e.target)) return;
      touchTimer = setTimeout(() => { e.preventDefault(); }, 500);
    };
    const handleTouchEnd = () => clearTimeout(touchTimer);

    wrapper.addEventListener("contextmenu", preventMenu);
    wrapper.addEventListener("selectstart", preventSelection);
    wrapper.addEventListener("copy", preventSelection);
    wrapper.addEventListener("touchstart", handleTouchStart, { passive: false });
    wrapper.addEventListener("touchend", handleTouchEnd);

    return () => {
      wrapper.removeEventListener("contextmenu", preventMenu);
      wrapper.removeEventListener("selectstart", preventSelection);
      wrapper.removeEventListener("copy", preventSelection);
      wrapper.removeEventListener("touchstart", handleTouchStart);
      wrapper.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Preload images & sounds + persisted data
  useEffect(() => {
    const loadImage = (src) =>
      new Promise((res) => {
        const img = new window.Image();
        img.onload = () => res(img);
        img.src = src;
        if (img.complete) res(img);
      });

    Promise.all(BG_IMAGES.map(loadImage)).then((imgs) => (assetsRef.current.bgs = imgs));
    loadImage(SPRITE_DOG).then((img) => (assetsRef.current.dog = img));
    loadImage(IMG_COIN).then((img) => (assetsRef.current.coin = img));
    loadImage(IMG_DIAMOND).then((img) => (assetsRef.current.diamond = img));
    loadImage(IMG_OBSTACLE).then((img) => (assetsRef.current.obstacle = img));

    if (typeof window !== "undefined") {
      const hs = Number(localStorage.getItem("mleoFlyerHighScore") || 0);
      setHighScore(hs);
      const lb = JSON.parse(localStorage.getItem("mleoFlyerLeaderboard") || "[]");
      setLeaderboard(lb);
      // טעינת שם משתמש שמור
      const savedName = localStorage.getItem("mleo_player_name") || "";
      setPlayerName(savedName);
    }
  }, []);

  const updateLeaderboard = (name, sc) => {
    let lb = JSON.parse(localStorage.getItem("mleoFlyerLeaderboard") || "[]");
    const i = lb.findIndex((p) => p.name === name);
    if (i >= 0) {
      if (sc > lb[i].score) lb[i].score = sc;
    } else {
      lb.push({ name, score: sc });
    }
    lb = lb.sort((a, b) => b.score - a.score).slice(0, 20);
    localStorage.setItem("mleoFlyerLeaderboard", JSON.stringify(lb));
    setLeaderboard(lb);

    const hs = Number(localStorage.getItem("mleoFlyerHighScore") || 0);
    if (sc > hs) {
      localStorage.setItem("mleoFlyerHighScore", String(sc));
      setHighScore(sc);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  function getDifficulty() {
    const s = scoreRef.current;
    const level = Math.floor(s / 12);

    const spawnInterval = Math.max(1200 - level * 110, 300);
    const itemSpeed     = Math.min(2.6 + level * 0.4, 7.8);
    const bombBias      = Math.min(0.08 + level * 0.05, 0.55);

    // עדין יותר (קפיצה/נפילה איטיים)
    const gravity    = Math.min(0.06 + level * 0.004, 0.12);
    const flapPower  = Math.max(-1.8 - level * 0.03, -2.8);

    return { level, spawnInterval, itemSpeed, bombBias, gravity, flapPower };
  }

  function syncCanvasSize() {
    const board = boardRef.current;
    const canvas = canvasRef.current;
    if (!board || !canvas) return false;
    const w = Math.max(2, Math.floor(board.clientWidth));
    const h = Math.max(2, Math.floor(board.clientHeight));
    if (w < 8 || h < 8) return false;
    canvas.width = w;
    canvas.height = h;
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Init
  function initGame() {
    const canvas = canvasRef.current;
    if (!canvas || !syncCanvasSize()) return;
    const H = canvas.height;

    dogRef.current = { x: canvas.width / 3, y: H / 2, w: 60, h: 50, vy: 0 };
    itemsRef.current = [];
    bgIndexRef.current = Math.floor(Math.random() * BG_IMAGES.length);

    const d = getDifficulty();
    gravityRef.current = d.gravity;
    flapPowerRef.current = d.flapPower;

    scoreRef.current = 0;
    setScore(0);
    setGameOver(false);
    diffTimerRef.current.lastSpawn = performance.now();
    lastTimeRef.current = performance.now();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Spawn item with dynamic weights/speed
  function spawnItem(diff) {
    const r = Math.random();
    let type = "coin";
    if (r < diff.bombBias) type = "bomb";
    else if (r < diff.bombBias + 0.25) type = "diamond";

    const size = type === "diamond" ? sizeDiamond : type === "coin" ? sizeCoin : sizeBomb;
    const canvas = canvasRef.current || { width: 800, height: 420 };

    itemsRef.current.push({
      type,
      x: canvas.width + size,
      y: Math.random() * (canvas.height - size - 30) + 15,
      size,
      vx: -(diff.itemSpeed + Math.random() * 0.6),
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  function isHit(dog, it) {
    const a = { x: dog.x + 10, y: dog.y + 8, w: dog.w - 20, h: dog.h - 16 };
    const b = { x: it.x, y: it.y, w: it.size, h: it.size };
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Main loop – time based (dt) + press-and-hold thrust (no burst)
  function loop() {
    if (!runningRef.current) return;

    const now = performance.now();
    let dt = (now - lastTimeRef.current) / 1000; // seconds
    lastTimeRef.current = now;
    if (dt > 0.05) dt = 0.05; // cap long frames
    const scale = dt * 60;    // נרמול אל 60FPS

    const canvas = canvasRef.current;
    if (!canvas) { rafRef.current = requestAnimationFrame(loop); return; }
    const ctx = canvas.getContext("2d");
    const A = assetsRef.current;

    // background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bg = A.bgs[bgIndexRef.current];
    if (bg) ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    // difficulty per-frame
    const d = getDifficulty();
    gravityRef.current = d.gravity;
    flapPowerRef.current = d.flapPower;

    // update dog
    const dog = dogRef.current;

    // גרביטציה עדינה
    dog.vy += gravityRef.current * scale;

    // press-and-hold – דחיפה רציפה (עכבר/מגע + מקלדת)
    if (isFlyingRef.current || keyFlyRef.current) {
      const lift = keyFlyRef.current && !isFlyingRef.current ? 0.52 : 0.42;
      dog.vy += (flapPowerRef.current * lift) * scale;
    }

    // חיכוך/החלקה
    dog.vy *= Math.pow(0.99, scale);

    // הגבלת מהירות (נפילה ועלייה איטיות)
    dog.vy = Math.max(Math.min(dog.vy, 2.4), -3.2);

    // עדכון מיקום
    dog.y  += dog.vy * scale;

    // גבולות
    const floor = canvas.height - dog.h - 12;
    if (dog.y < 8) { dog.y = 8; dog.vy = Math.max(dog.vy, 0); }
    if (dog.y > floor) { dog.y = floor; dog.vy = Math.min(dog.vy, 0); }

    // draw dog
    if (A.dog) ctx.drawImage(A.dog, dog.x, dog.y, dog.w, dog.h);

    // timed spawn
    if (now - diffTimerRef.current.lastSpawn >= d.spawnInterval) {
      spawnItem(d);
      diffTimerRef.current.lastSpawn = now;
    }

    // items
    for (let i = itemsRef.current.length - 1; i >= 0; i--) {
      const it = itemsRef.current[i];
      it.x += it.vx * scale;

      if (it.type === "coin" && A.coin) ctx.drawImage(A.coin, it.x, it.y, it.size, it.size);
      if (it.type === "diamond" && A.diamond) ctx.drawImage(A.diamond, it.x, it.y, it.size, it.size);
      if (it.type === "bomb" && A.obstacle) ctx.drawImage(A.obstacle, it.x, it.y, it.size, it.size);

      if (it.x < -it.size) { itemsRef.current.splice(i, 1); continue; }

      if (isHit(dog, it)) {
        if (it.type === "coin") {
          const ns = scoreRef.current + 1;
          scoreRef.current = ns; setScore(ns);
          sfxRef.current.playCoin();
        } else if (it.type === "diamond") {
          const ns = scoreRef.current + 5;
          scoreRef.current = ns; setScore(ns);
          sfxRef.current.playDiamond();
        } else {
          sfxRef.current.playHit();
          runningRef.current = false;
          setGameRunning(false);
          setGameOver(true);
          pendingSessionEndRef.current = { finalScore: scoreRef.current };
          cancelAnimationFrame(rafRef.current);
          return;
        }
        itemsRef.current.splice(i, 1);
      }
    }

    // HUD
    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(`Level: ${d.level}`, 16, 28);

    rafRef.current = requestAnimationFrame(loop);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Controls – press-and-hold on canvas + keyboard hold (Space / ArrowUp)
  useEffect(() => {
    const isUI = (el) =>
      el.closest?.("a, input, textarea, select, button, [role='textbox'], [contenteditable='true']");

    const onKeyDown = (e) => {
      if (isUI(e.target)) return;
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (!keyFlyRef.current && runningRef.current) {
          dogRef.current.vy += flapPowerRef.current * 0.55;
        }
        keyFlyRef.current = true;
      }
    };

    const onKeyUp = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        keyFlyRef.current = false;
      }
    };

    const onPointerDown = (e) => {
      if (isUI(e.target)) return;
      if (e.target !== canvasRef.current) return;
      e.preventDefault();
      isFlyingRef.current = true;
      canvasRef.current?.setPointerCapture?.(e.pointerId);
    };
    const onPointerUp = () => {
      isFlyingRef.current = false;
    };

    const canvas = canvasRef.current;

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas?.addEventListener("pointerdown", onPointerDown, { passive: false });
    canvas?.addEventListener("pointerup", onPointerUp);
    canvas?.addEventListener("pointercancel", onPointerUp);
    canvas?.addEventListener("pointerleave", onPointerUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas?.removeEventListener("pointerdown", onPointerDown);
      canvas?.removeEventListener("pointerup", onPointerUp);
      canvas?.removeEventListener("pointercancel", onPointerUp);
      canvas?.removeEventListener("pointerleave", onPointerUp);
    };
  }, [showIntro]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Responsive canvas – size to board container (same pattern as catcher)
  useEffect(() => {
    if (showIntro) return undefined;
    const board = boardRef.current;
    if (!board || typeof ResizeObserver === "undefined") return undefined;

    const apply = () => {
      syncCanvasSize();
    };

    apply();
    const ro = new ResizeObserver(() => apply());
    ro.observe(board);
    return () => ro.disconnect();
  }, [showIntro]);

  // ─────────────────────────────────────────────────────────────────────────────
  const fireSessionEnd = (finalScore) => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    const levelReached = Math.floor(finalScore / 12);
    onSessionEnd({
      score: finalScore,
      levelReached,
      didWin: false,
      durationMs:
        playStartedAtRef.current != null
          ? Math.max(0, Date.now() - playStartedAtRef.current)
          : undefined,
    });
  };

  const completeEndInterstitial = () => {
    const pending = pendingSessionEndRef.current;
    if (!pending) return;
    pendingSessionEndRef.current = null;
    fireSessionEnd(pending.finalScore);
  };

  function startGame() {
    sessionEndFiredRef.current = false;
    pendingSessionEndRef.current = null;
    playStartedAtRef.current = Date.now();
    setShowIntro(false);
    if (!canvasRef.current) { requestAnimationFrame(startGame); return; }

    initGame();
    syncPortraitPromptForRun();
    setGameRunning(true);
    runningRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }

  useEffect(() => {
    if (autoStart) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  function restartGame() {
    setGameOver(false);
    startGame();
  }

  useEffect(() => {
    return () => {
      runningRef.current = false;
      setGameRunning(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
      <div
        id="game-wrapper"
        className="relative isolate flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-gray-900 text-white select-none solo-game-mobile-fullscreen-shell"
        dir="rtl"
      >
        {!showIntro && (
          <div className="flex min-h-0 w-full flex-1 flex-col px-1 pb-2 pt-1">
            <div
              ref={boardRef}
              className="relative z-0 mx-auto flex h-full min-h-0 w-full max-w-[1180px] flex-1 overflow-hidden rounded-lg border-4 border-yellow-400 bg-black/30 shadow-lg"
            >
              {showFullscreenButton ? (
                <div className="pointer-events-auto absolute right-2 top-2 z-[70]">
                  <SoloGameMobileFullscreenButton
                    isFullscreen={isFullscreen}
                    onToggle={toggleFromUserGesture}
                  />
                </div>
              ) : null}

              <div className="pointer-events-none absolute left-1/2 top-2 z-20 max-w-[95vw] -translate-x-1/2 rounded-lg bg-black/60 px-4 py-2 text-base font-bold sm:text-lg">
                ניקוד: {score}
              </div>
              <canvas
                ref={canvasRef}
                className="absolute inset-0 block h-full w-full touch-none"
              />

              {gameOver ? (
                <SoloGameEndInterstitialOverlay
                  didWin={false}
                  onDone={completeEndInterstitial}
                />
              ) : null}
            </div>

            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); }}
              className="sm:hidden fixed bottom-8 left-1/2 z-[200010] min-h-[48px] -translate-x-1/2 select-none rounded-lg bg-yellow-400 px-8 py-3 text-lg font-bold text-black"
            >
              החזק לטוס
            </button>
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
