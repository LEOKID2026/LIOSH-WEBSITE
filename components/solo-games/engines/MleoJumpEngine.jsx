import { useEffect, useRef, useState } from "react";
import SoloGameMobileFullscreenButton from "../SoloGameMobileFullscreenButton.jsx";
import SoloGameEndInterstitialOverlay from "../SoloGameEndInterstitialOverlay.jsx";
import SoloGamePortraitRecommendationModal from "../SoloGamePortraitRecommendationModal.jsx";
import { useSoloGameMobileFullscreen } from "../../../hooks/solo-games/useSoloGameMobileFullscreen.js";
import { useSoloEngineAudio } from "../../../hooks/solo-games/useSoloGameAudio.js";

const BG_IMAGES = ["/images/game-day.png", "/images/game1.png", "/images/game2.png", "/images/game-park.png"];
const IMG_LEO = "/images/leo.png";
const IMG_COIN = "/images/coin.png";
const IMG_COIN2 = "/images/coin2.png";
const IMG_DIAMOND = "/images/diamond.png";
const IMG_MAGNET = "/images/magnet.png";
const IMG_OBSTACLE = "/images/obstacle.png";

const SCORE_OBSTACLE = 5;
const SCORE_COIN = 10;
const SCORE_DIAMOND = 25;
const SCORE_COMBO_EVERY = 5;
const SCORE_COMBO_BONUS = 3;
const MAGNET_MS = 5000;
const MAGNET_RANGE_BASE = 150;
const MAGNET_PULL = 4.5;

const COINS_PER_LEVEL = 30;
const FIRST_SPAWN_DELAY_MS = 2400;
const BASE_SPEED = 1.35;
const SPEED_PER_LEVEL = 0.2;
const LEO_HITBOX_SCALE = 0.72;
const OBSTACLE_HITBOX_SCALE = 0.78;

/** @param {number} level @param {number} scale */
function getSpawnGapRange(level, scale) {
  const lvl = Math.max(1, level);
  const minBase = Math.max(150, 280 - (lvl - 1) * 16);
  const maxBase = Math.max(minBase + 70, 380 - (lvl - 1) * 20);
  return { min: minBase * scale, max: maxBase * scale };
}

/** @param {number} level @param {number} scale */
function pickNextSpawnGap(level, scale) {
  const { min, max } = getSpawnGapRange(level, scale);
  return min + Math.random() * (max - min);
}

/** @param {{ x: number, y: number, w: number, h: number }} rect @param {number} shrink */
function shrinkHitbox(rect, shrink) {
  const padX = (rect.w * (1 - shrink)) / 2;
  const padY = (rect.h * (1 - shrink)) / 2;
  return {
    x: rect.x + padX,
    y: rect.y + padY,
    w: rect.w * shrink,
    h: rect.h * shrink,
  };
}

/**
 * @param {{ autoStart?: boolean, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoJumpEngine({ autoStart = false, onSessionEnd }) {
  const sfx = useSoloEngineAudio();

  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const pendingSessionEndRef = useRef(null);
  const canvasRef = useRef(null);
  const boardRef = useRef(null);
  const rafRef = useRef(null);
  const runningRef = useRef(false);

  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const coinsCollectedRef = useRef(0);
  const passedRef = useRef(0);
  const comboRef = useRef(0);
  const magnetUntilRef = useRef(0);

  const assetsRef = useRef({
    bgs: [],
    leo: null,
    coin: null,
    coin2: null,
    diamond: null,
    magnet: null,
    obstacle: null,
  });

  const worldRef = useRef({
    leoY: 0,
    leoVy: 0,
    grounded: true,
    obstacles: [],
    items: [],
    distanceSinceSpawn: 0,
    nextSpawnGap: 280,
    gameElapsedMs: 0,
    ambientTimer: 0,
    speed: BASE_SPEED,
    bgIndex: 0,
    bgX: 0,
    showLevelUpUntil: 0,
    w: 800,
    h: 400,
    scale: 1,
    leoX: 96,
    leoW: 70,
    leoH: 70,
    groundY: 344,
  });

  const [showIntro, setShowIntro] = useState(!autoStart);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const {
    isFullscreen,
    showPortraitPrompt,
    dismissPortraitPrompt,
    syncPortraitPromptForRun,
    enterFromUserGesture,
    toggleFromUserGesture,
    showFullscreenButton,
  } = useSoloGameMobileFullscreen({
    gameKey: "leo-jump",
    gameRunning,
    showIntro,
    gameOver,
  });

  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [passed, setPassed] = useState(0);
  const [collected, setCollected] = useState(0);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [magnetSec, setMagnetSec] = useState(0);
  const [levelFlash, setLevelFlash] = useState(false);

  useEffect(() => {
    const loadImage = (src) =>
      new Promise((res) => {
        const img = new window.Image();
        img.onload = () => res(img);
        img.onerror = () => res(null);
        img.src = src;
        if (img.complete) res(img);
      });

    Promise.all(BG_IMAGES.map(loadImage)).then((imgs) => {
      assetsRef.current.bgs = imgs.filter(Boolean);
    });
    loadImage(IMG_LEO).then((img) => {
      assetsRef.current.leo = img;
    });
    loadImage(IMG_COIN).then((img) => {
      assetsRef.current.coin = img;
    });
    loadImage(IMG_COIN2).then((img) => {
      assetsRef.current.coin2 = img;
    });
    loadImage(IMG_DIAMOND).then((img) => {
      assetsRef.current.diamond = img;
    });
    loadImage(IMG_MAGNET).then((img) => {
      assetsRef.current.magnet = img;
    });
    loadImage(IMG_OBSTACLE).then((img) => {
      assetsRef.current.obstacle = img;
    });
  }, []);

  useEffect(() => {
    const wrapper = document.getElementById("game-wrapper");
    if (!wrapper) return undefined;
    const preventMenu = (e) => {
      if (e.target?.closest?.("button")) return;
      e.preventDefault();
    };
    wrapper.addEventListener("contextmenu", preventMenu);
    return () => wrapper.removeEventListener("contextmenu", preventMenu);
  }, []);

  const syncCanvasSize = () => {
    const board = boardRef.current;
    const canvas = canvasRef.current;
    if (!board || !canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = board.clientWidth || 800;
    const h = board.clientHeight || 400;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
    }
    const scale = Math.max(0.75, Math.min(w, h) / 420);
    worldRef.current.w = w;
    worldRef.current.h = h;
    worldRef.current.scale = scale;
    worldRef.current.leoW = Math.round(72 * scale);
    worldRef.current.leoH = Math.round(72 * scale);
    worldRef.current.leoX = Math.round(w * 0.12);
    worldRef.current.groundY = h - Math.round(52 * scale);
  };

  const applyDifficulty = (lvl) => {
    const w = worldRef.current;
    w.speed = BASE_SPEED + (lvl - 1) * SPEED_PER_LEVEL;
  };

  const triggerLevelUp = (newLevel) => {
    sfx.playLevelUp();
    levelRef.current = newLevel;
    setLevel(newLevel);
    applyDifficulty(newLevel);
    const w = worldRef.current;
    w.bgIndex = (newLevel - 1) % Math.max(1, assetsRef.current.bgs.length);
    w.showLevelUpUntil = Date.now() + 1800;
    w.nextSpawnGap = pickNextSpawnGap(newLevel, w.scale);
    setLevelFlash(true);
    setTimeout(() => setLevelFlash(false), 1800);
  };

  const checkLevelFromCoins = () => {
    const newLevel = Math.floor(coinsCollectedRef.current / COINS_PER_LEVEL) + 1;
    if (newLevel > levelRef.current) triggerLevelUp(newLevel);
  };

  const addScore = (pts, reason) => {
    if (pts <= 0) return;
    scoreRef.current += pts;
    setScore(scoreRef.current);

    if (reason === "obstacle") {
      comboRef.current += 1;
      if (comboRef.current > 0 && comboRef.current % SCORE_COMBO_EVERY === 0) {
        scoreRef.current += SCORE_COMBO_BONUS;
        setScore(scoreRef.current);
        sfx.playCombo();
      }
    }
  };

  const magnetActive = () => Date.now() < magnetUntilRef.current;

  const magnetRange = () => MAGNET_RANGE_BASE * worldRef.current.scale;

  const leoBox = () => {
    const w = worldRef.current;
    const bottom = w.groundY + w.leoY;
    return {
      x: w.leoX,
      y: bottom - w.leoH,
      w: w.leoW,
      h: w.leoH,
      cx: w.leoX + w.leoW / 2,
      cy: bottom - w.leoH / 2,
    };
  };

  const hits = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  const pullTowardLeo = (item) => {
    const box = leoBox();
    const dx = box.cx - item.x;
    const dy = box.cy - item.y;
    const dist = Math.hypot(dx, dy) || 1;
    item.x += (dx / dist) * MAGNET_PULL * worldRef.current.scale;
    item.y += (dy / dist) * MAGNET_PULL * worldRef.current.scale;
  };

  const tryCollect = (item) => {
    const box = leoBox();
    const size = item.size;
    const itemBox = { x: item.x, y: item.y, w: size, h: size };
    const inMagnet =
      magnetActive() &&
      Math.abs(box.cx - (item.x + size / 2)) < magnetRange() &&
      Math.abs(box.cy - (item.y + size / 2)) < magnetRange();
    if (!hits(box, itemBox) && !inMagnet) return false;

    if (item.type === "magnet") {
      magnetUntilRef.current = Date.now() + MAGNET_MS;
      return true;
    }
    if (item.type === "diamond") {
      addScore(SCORE_DIAMOND, "item");
      setCollected((n) => n + 1);
      return true;
    }
    addScore(SCORE_COIN, "item");
    setCollected((n) => n + 1);
    sfx.playCoin();
    coinsCollectedRef.current += 1;
    setCoinsCollected(coinsCollectedRef.current);
    checkLevelFromCoins();
    return true;
  };

  const spawnObstacleGroup = () => {
    const w = worldRef.current;
    const { w: cw, groundY, scale } = w;
    const oh = Math.round((42 + Math.random() * 22) * scale);
    const ow = Math.round(38 * scale);
    const ox = cw + 36;

    w.obstacles.push({ x: ox, w: ow, h: oh, passed: false });
    const itemSize = Math.round(34 * scale);

    if (Math.random() < 0.72) {
      w.items.push({
        type: Math.random() < 0.35 ? "coin2" : "coin",
        x: ox + ow + 28 + Math.random() * 40,
        y: groundY - Math.round(28 * scale),
        size: itemSize,
      });
    }
    if (Math.random() < 0.55) {
      w.items.push({
        type: "coin",
        x: ox + ow * 0.35,
        y: groundY - oh - Math.round(52 * scale),
        size: itemSize,
      });
    }
    if (Math.random() < 0.14) {
      w.items.push({
        type: "diamond",
        x: ox + ow + 18,
        y: groundY - oh - Math.round(64 * scale),
        size: Math.round(36 * scale),
      });
    }
  };

  const spawnAmbientItem = () => {
    const w = worldRef.current;
    const { w: cw, groundY, scale } = w;
    const roll = Math.random();
    const yBand = groundY - Math.round((30 + Math.random() * 110) * scale);
    const size = Math.round(34 * scale);

    if (roll < 0.62) {
      w.items.push({ type: roll < 0.2 ? "coin2" : "coin", x: cw + 24, y: yBand, size });
    } else if (roll < 0.74) {
      w.items.push({ type: "diamond", x: cw + 24, y: yBand - 20 * scale, size: Math.round(36 * scale) });
    } else if (roll < 0.8) {
      w.items.push({ type: "magnet", x: cw + 24, y: yBand, size: Math.round(40 * scale) });
    }
  };

  const fireSessionEnd = () => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    onSessionEnd({
      score: scoreRef.current,
      didWin: false,
      levelReached: Math.floor(scoreRef.current / 10),
      durationMs:
        playStartedAtRef.current != null
          ? Math.max(0, Date.now() - playStartedAtRef.current)
          : undefined,
    });
  };

  const endGame = () => {
    runningRef.current = false;
    setGameRunning(false);
    setGameOver(true);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    pendingSessionEndRef.current = { done: true };
  };

  const completeEndInterstitial = () => {
    if (!pendingSessionEndRef.current) return;
    pendingSessionEndRef.current = null;
    fireSessionEnd();
  };

  const jump = () => {
    const s = worldRef.current;
    if (!runningRef.current || !s.grounded) return;
    sfx.playJump();
    s.leoVy = -11.5 * Math.max(0.9, s.scale);
    s.grounded = false;
  };

  const resetWorld = () => {
    scoreRef.current = 0;
    levelRef.current = 1;
    coinsCollectedRef.current = 0;
    passedRef.current = 0;
    comboRef.current = 0;
    magnetUntilRef.current = 0;
    setScore(0);
    setLevel(1);
    setPassed(0);
    setCollected(0);
    setCoinsCollected(0);
    setMagnetSec(0);
    setLevelFlash(false);

    const w = worldRef.current;
    w.leoY = 0;
    w.leoVy = 0;
    w.grounded = true;
    w.obstacles = [];
    w.items = [];
    w.distanceSinceSpawn = 0;
    w.gameElapsedMs = 0;
    w.ambientTimer = 0;
    w.bgX = 0;
    w.bgIndex = 0;
    w.showLevelUpUntil = 0;
    applyDifficulty(1);
    w.nextSpawnGap = pickNextSpawnGap(1, w.scale);
  };

  const startGame = () => {
    sessionEndFiredRef.current = false;
    pendingSessionEndRef.current = null;
    playStartedAtRef.current = Date.now();
    setShowIntro(false);
    setGameOver(false);
    resetWorld();
    syncCanvasSize();
    worldRef.current.nextSpawnGap = pickNextSpawnGap(1, worldRef.current.scale);
    syncPortraitPromptForRun();
    setGameRunning(true);
    runningRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  };

  const loop = () => {
    if (!runningRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const assets = assetsRef.current;
    const s = worldRef.current;
    const { w, h, groundY, scale, leoX, leoW, leoH } = s;

    s.leoVy += 0.55 * scale;
    s.leoY += s.leoVy;
    if (s.leoY >= 0) {
      s.leoY = 0;
      s.leoVy = 0;
      s.grounded = true;
    }

    s.gameElapsedMs += 1000 / 60;
    if (s.gameElapsedMs >= FIRST_SPAWN_DELAY_MS) {
      s.distanceSinceSpawn += s.speed * scale;
      if (s.distanceSinceSpawn >= s.nextSpawnGap) {
        spawnObstacleGroup();
        s.distanceSinceSpawn = 0;
        s.nextSpawnGap = pickNextSpawnGap(levelRef.current, scale);
      }
    }

    s.ambientTimer += 1;
    if (s.ambientTimer >= Math.max(28, 52 - levelRef.current * 2)) {
      s.ambientTimer = 0;
      if (Math.random() < 0.55) spawnAmbientItem();
    }

    s.bgX -= 0.9 * s.speed * scale;
    if (s.bgX <= -w) s.bgX = 0;

    s.obstacles = s.obstacles
      .map((o) => {
        const nx = o.x - s.speed * scale;
        if (!o.passed && nx + o.w < leoX) {
          o.passed = true;
          passedRef.current += 1;
          setPassed(passedRef.current);
          addScore(SCORE_OBSTACLE, "obstacle");
        }
        return { ...o, x: nx };
      })
      .filter((o) => o.x + o.w > -30);

    const nextItems = [];
    for (const item of s.items) {
      const moved = { ...item, x: item.x - s.speed * scale };
      if (magnetActive() && item.type !== "magnet") pullTowardLeo(moved);
      if (moved.x + moved.size < -20) continue;
      if (tryCollect(moved)) continue;
      nextItems.push(moved);
    }
    s.items = nextItems;

    const leoBottom = groundY + s.leoY;
    const leoTop = leoBottom - leoH;
    const leoHit = shrinkHitbox({ x: leoX, y: leoTop, w: leoW, h: leoH }, LEO_HITBOX_SCALE);
    for (const o of s.obstacles) {
      const obsTop = groundY - o.h;
      const obsHit = shrinkHitbox({ x: o.x, y: obsTop, w: o.w, h: o.h }, OBSTACLE_HITBOX_SCALE);
      if (hits(leoHit, obsHit)) {
        endGame();
        return;
      }
    }

    const remain = Math.max(0, Math.ceil((magnetUntilRef.current - Date.now()) / 1000));
    if (remain !== magnetSec) setMagnetSec(remain);

    ctx.clearRect(0, 0, w, h);
    const bg = assets.bgs[s.bgIndex];
    if (bg) {
      ctx.drawImage(bg, Math.round(s.bgX), 0, w, h);
      ctx.drawImage(bg, Math.round(s.bgX + w), 0, w, h);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#7dd3fc");
      g.addColorStop(1, "#1e3a8a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.fillStyle = "#4ade80";
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.fillStyle = "#ca8a04";
    ctx.fillRect(0, groundY, w, Math.round(8 * scale));

    for (const o of s.obstacles) {
      if (assets.obstacle) {
        ctx.drawImage(assets.obstacle, o.x, groundY - o.h, o.w, o.h);
      } else {
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(o.x, groundY - o.h, o.w, o.h);
      }
    }

    for (const item of s.items) {
      let img = assets.coin;
      if (item.type === "coin2") img = assets.coin2 || assets.coin;
      if (item.type === "diamond") img = assets.diamond;
      if (item.type === "magnet") img = assets.magnet;
      if (img) ctx.drawImage(img, item.x, item.y, item.size, item.size);
    }

    if (assets.leo) ctx.drawImage(assets.leo, leoX, leoTop, leoW, leoH);
    else {
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(leoX, leoTop, leoW, leoH);
    }

    if (magnetActive()) {
      ctx.save();
      ctx.strokeStyle = "rgba(96,165,250,0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(leoX + leoW / 2, leoTop + leoH / 2, magnetRange(), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (Date.now() < s.showLevelUpUntil) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fde047";
      ctx.font = `bold ${Math.round(36 * scale)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`רמה ${levelRef.current}!`, w / 2, h * 0.28);
      ctx.restore();
    }

    rafRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    if (!gameRunning || showIntro) return undefined;
    syncCanvasSize();
    const board = boardRef.current;
    if (!board || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", syncCanvasSize);
      return () => window.removeEventListener("resize", syncCanvasSize);
    }
    const ro = new ResizeObserver(() => syncCanvasSize());
    ro.observe(board);
    return () => ro.disconnect();
  }, [gameRunning, showIntro]);

  useEffect(() => {
    const onKey = (e) => {
      if (!runningRef.current) return;
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (autoStart) startGame();
    return () => {
      runningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return (
    <div
      id="game-wrapper"
      className="relative isolate flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-gray-900 text-white select-none solo-game-mobile-fullscreen-shell"
      dir="rtl"
    >
      {!showIntro && (
        <div className="flex min-h-0 w-full flex-1 flex-col px-1 pb-2 pt-1">
          <div className="pointer-events-none absolute left-1/2 top-2 z-20 hidden max-w-[95vw] -translate-x-1/2 rounded-lg bg-black/60 px-4 py-2 text-sm font-bold sm:text-lg">
            ניקוד: {score} | רמה: {level} | מטבעות: {coinsCollected}
            {magnetSec > 0 ? ` | 🧲 מגנט: ${magnetSec}s` : ""}
          </div>
          <div className="pointer-events-none absolute bottom-36 left-1/2 z-20 max-w-[95vw] -translate-x-1/2 rounded-md bg-black/60 px-3 py-1 text-xs font-bold sm:hidden">
            ניקוד: {score} | רמה: {level} | 🪙 {coinsCollected}
            {magnetSec > 0 ? ` | 🧲 ${magnetSec}s` : ""}
          </div>

          <div
            ref={boardRef}
            className="relative z-0 mx-auto flex h-full min-h-0 w-full max-w-[1180px] flex-1 overflow-hidden rounded-lg border-4 border-yellow-400 bg-black/30 shadow-lg"
            onPointerDown={(e) => {
              if (e.target?.closest?.("button")) return;
              e.preventDefault();
              jump();
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

            <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none" />

            {levelFlash ? (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-start justify-center pt-[18%]">
                <span className="rounded-xl bg-yellow-400/90 px-4 py-2 text-lg font-extrabold text-black shadow-lg">
                  רמה {level}!
                </span>
              </div>
            ) : null}

            {gameOver ? (
              <SoloGameEndInterstitialOverlay
                didWin={false}
                onDone={completeEndInterstitial}
              />
            ) : null}
          </div>

          {gameRunning && !gameOver ? (
            <button
              type="button"
              className="fixed bottom-8 left-1/2 z-[200010] min-h-[48px] -translate-x-1/2 rounded-lg bg-yellow-400 px-10 py-3 text-lg font-bold text-black sm:hidden"
              style={{ touchAction: "none" }}
              onPointerDown={(e) => {
                e.preventDefault();
                jump();
              }}
            >
              קפיצה 🦘
            </button>
          ) : null}
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
