import { useEffect, useRef, useState } from "react";
import SoloGameMobileFullscreenButton from "../SoloGameMobileFullscreenButton.jsx";
import SoloGameEndInterstitialOverlay from "../SoloGameEndInterstitialOverlay.jsx";
import SoloGamePortraitRecommendationModal from "../SoloGamePortraitRecommendationModal.jsx";
import { useSoloGameMobileFullscreen } from "../../../hooks/solo-games/useSoloGameMobileFullscreen.js";
import { useSoloEngineAudio } from "../../../hooks/solo-games/useSoloGameAudio.js";

const DEFAULT_PLAYER_NAME = "שחקן";

/**
 * @param {{ autoStart?: boolean, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoCatcherEngine({ autoStart = false, onSessionEnd }) {
  const sfx = useSoloEngineAudio();
  const sfxRef = useRef(sfx);
  sfxRef.current = sfx;

  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const pendingSessionEndRef = useRef(null);

  // Movement intent: updated by keyboard (window) + on-screen pads (pointer). Read every frame in updateGame.
  const keysRef = useRef({ left: false, right: false });
  /** When true, keyboard + pads may set keysRef; game loop applies keysRef to Leo. Tied to active run, not React render. */
  const keyboardGateRef = useRef(false);
  const playerNameRef = useRef("");

  // ─────────────────────────────────────────────────────────────────────────────
  // Light wrapper hardening — avoid document-level preventDefault (breaks mobile taps)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const wrapper = document.getElementById("game-wrapper");
    if (!wrapper) return;

    const isInteractive = (t) =>
      t?.closest?.(
        "button, a, input, textarea, select, label, [role='button'], [role='textbox'], [contenteditable='true']"
      );

    const preventMenu = (e) => {
      if (!wrapper.contains(e.target)) return;
      if (isInteractive(e.target)) return;
      e.preventDefault();
    };

    wrapper.addEventListener("contextmenu", preventMenu);

    return () => {
      wrapper.removeEventListener("contextmenu", preventMenu);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Keyboard: single mount lifecycle — never tied to gameRunning (avoids attach/detach bugs on replay)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!keyboardGateRef.current) return;
      if (e.repeat) return;
      const left = e.code === "ArrowLeft" || e.code === "KeyA";
      const right = e.code === "ArrowRight" || e.code === "KeyD";
      if (!left && !right) return;
      e.preventDefault();
      if (left) keysRef.current.left = true;
      if (right) keysRef.current.right = true;
    };

    const onKeyUp = (e) => {
      const left = e.code === "ArrowLeft" || e.code === "KeyA";
      const right = e.code === "ArrowRight" || e.code === "KeyD";
      if (!left && !right) return;
      if (left) keysRef.current.left = false;
      if (right) keysRef.current.right = false;
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("keyup", onKeyUp, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("keyup", onKeyUp, { capture: true });
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Refs + State
  // ─────────────────────────────────────────────────────────────────────────────
  const canvasRef = useRef(null);
  const boardRef = useRef(null);
  const assetsRef = useRef(null);
  const leoRef = useRef(null);
  const itemsRef = useRef([]);
  const currentScoreRef = useRef(0);
  const highScoreRef = useRef(0);
  const runningRef = useRef(false);
  const rafRef = useRef(0);
  const diffTimerRef = useRef({ lastSpawn: 0 });
  const startupRafRef = useRef(0);

  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showIntro, setShowIntro] = useState(!autoStart);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [playerName, setPlayerName] = useState("");
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
    gameKey: "catcher",
    gameRunning,
    showIntro,
    gameOver,
  });

  /** Trimmed field → localStorage `mleo_player_name` → default `שחקן`. Never blocks starting. */
  const resolveEffectivePlayerName = () => {
    const fromField = String(playerName || "").trim();
    if (fromField) return fromField;
    if (typeof window !== "undefined") {
      try {
        const fromLs = String(localStorage.getItem("mleo_player_name") || "").trim();
        if (fromLs) return fromLs;
      } catch {
        /* noop */
      }
    }
    return DEFAULT_PLAYER_NAME;
  };

  const fireSessionEnd = (finalScore) => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    const levelReached = Math.floor(finalScore / 10);
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

  const beginRun = () => {
    sessionEndFiredRef.current = false;
    pendingSessionEndRef.current = null;
    playStartedAtRef.current = Date.now();
    const resolved = resolveEffectivePlayerName();
    setPlayerName(resolved);
    playerNameRef.current = resolved;
    setShowIntro(false);
    syncPortraitPromptForRun();
    setGameRunning(true);
  };

  useEffect(() => {
    if (autoStart) beginRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    playerNameRef.current = playerName;
  }, [playerName]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedHighScore = Number(localStorage.getItem("mleoCatcherHighScore") || 0);
    highScoreRef.current = savedHighScore;
    setHighScore(savedHighScore);
    const stored = JSON.parse(localStorage.getItem("mleoCatcherLeaderboard") || "[]");
    setLeaderboard(stored);
    const savedName = localStorage.getItem("mleo_player_name") || "";
    setPlayerName(savedName);
  }, []);

  const updateLeaderboard = (name, scoreVal) => {
    let stored = JSON.parse(localStorage.getItem("mleoCatcherLeaderboard") || "[]");
    const idx = stored.findIndex((p) => p.name === name);
    if (idx >= 0) {
      if (scoreVal > stored[idx].score) stored[idx].score = scoreVal;
    } else {
      stored.push({ name, score: scoreVal });
    }
    stored = stored.sort((a, b) => b.score - a.score).slice(0, 20);
    localStorage.setItem("mleoCatcherLeaderboard", JSON.stringify(stored));
    setLeaderboard(stored);

    const hs = Number(localStorage.getItem("mleoCatcherHighScore") || 0);
    if (scoreVal > hs) {
      localStorage.setItem("mleoCatcherHighScore", String(scoreVal));
      highScoreRef.current = scoreVal;
      setHighScore(scoreVal);
    }
  };

  function getDifficulty() {
    const s = currentScoreRef.current;
    const level = Math.floor(s / 10);
    const spawnInterval = Math.max(1200 - level * 120, 250);
    const itemSpeed = Math.min(3 + level * 0.5, 9);
    const bombBias = Math.min(0.2 + level * 0.05, 0.6);
    return { spawnInterval, itemSpeed, bombBias, level };
  }

  function getPlayerSpeed() {
    return 5 + Math.min(currentScoreRef.current / 20, 3);
  }

  function preloadAssets() {
    if (assetsRef.current) return assetsRef.current;

    const leoSprite = new window.Image();
    leoSprite.src = "/images/leo.png";

    const coinImg = new window.Image();
    coinImg.src = "/images/leo-logo.png";

    const diamondImg = new window.Image();
    diamondImg.src = "/images/diamond.png";

    const bombImg = new window.Image();
    bombImg.src = "/images/obstacle1.png";

    const bgImg = new window.Image();
    bgImg.src = "/images/game10.png";

    assetsRef.current = { leoSprite, coinImg, diamondImg, bombImg, bgImg };
    return assetsRef.current;
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

  function resetInputState() {
    keysRef.current = { left: false, right: false };
    keyboardGateRef.current = false;
  }

  function initGame() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    leoRef.current = {
      x: canvas.width / 2 - 50,
      y: canvas.height - 120,
      width: 60,
      height: 70,
      dx: 0,
    };
    itemsRef.current = [];
    currentScoreRef.current = 0;
    setScore(0);
    setGameOver(false);
    diffTimerRef.current.lastSpawn = performance.now();
  }

  function spawnItem(diff) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const r = Math.random();
    let type = "coin";
    if (r < diff.bombBias) type = "bomb";
    else if (r < diff.bombBias + 0.25) type = "diamond";

    let size = 40;
    if (type === "bomb") size = 70;
    if (type === "coin") size = 50;
    if (type === "diamond") size = 35;

    const vy = diff.itemSpeed + Math.random() * 0.8;

    itemsRef.current.push({
      x: Math.random() * (canvas.width - size),
      y: -size,
      size,
      type,
      vy,
    });
  }

  function checkCollision(a, b) {
    const leoHitbox = {
      x: a.x + 10,
      y: a.y + 10,
      width: a.width - 20,
      height: a.height - 35,
    };

    const touchingFromAbove =
      b.y + b.size >= leoHitbox.y && b.y <= leoHitbox.y + leoHitbox.height;

    return (
      touchingFromAbove &&
      leoHitbox.x < b.x + b.size &&
      leoHitbox.x + leoHitbox.width > b.x
    );
  }

  function updateGame() {
    if (!runningRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) {
      rafRef.current = requestAnimationFrame(updateGame);
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      rafRef.current = requestAnimationFrame(updateGame);
      return;
    }

    const { leoSprite, coinImg, diamondImg, bombImg, bgImg } = assetsRef.current || {};

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bgImg && bgImg.complete) ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

    const leo = leoRef.current;
    if (leo) {
      const speed = getPlayerSpeed();
      const k = keysRef.current;
      if (k.left && !k.right) leo.dx = -speed;
      else if (k.right && !k.left) leo.dx = speed;
      else leo.dx = 0;

      leo.x += leo.dx;
      if (leo.x < 0) leo.x = 0;
      if (leo.x + leo.width > canvas.width) leo.x = canvas.width - leo.width;

      if (leoSprite && leoSprite.complete) {
        ctx.drawImage(leoSprite, leo.x, leo.y, leo.width, leo.height);
      }
    }

    const items = itemsRef.current;
    const remaining = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      item.y += item.vy;

      if (item.type === "coin" && coinImg?.complete) {
        ctx.drawImage(coinImg, item.x, item.y, item.size, item.size);
      } else if (item.type === "diamond" && diamondImg?.complete) {
        ctx.drawImage(diamondImg, item.x, item.y, item.size, item.size);
      } else if (item.type === "bomb" && bombImg?.complete) {
        ctx.drawImage(bombImg, item.x, item.y, item.size, item.size);
      }

      if (leo && checkCollision(leo, item)) {
        if (item.type === "coin") {
          currentScoreRef.current += 1;
          sfxRef.current.playCoin();
        } else if (item.type === "diamond") {
          currentScoreRef.current += 5;
          sfxRef.current.playDiamond();
        } else if (item.type === "bomb") {
          sfxRef.current.playHit();
          resetInputState();
          runningRef.current = false;
          setGameOver(true);
          pendingSessionEndRef.current = { finalScore: currentScoreRef.current };
        }
        setScore(currentScoreRef.current);
        continue;
      }
      if (item.y > canvas.height) continue;
      remaining.push(item);
    }
    itemsRef.current = remaining;

    const now = performance.now();
    const diff = getDifficulty();
    if (now - diffTimerRef.current.lastSpawn >= diff.spawnInterval) {
      spawnItem(diff);
      diffTimerRef.current.lastSpawn = now;
    }

    const hudPadX = 20;
    let hudY = 30;
    const hudLine = 22;
    ctx.font = "bold 18px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`ניקוד: ${currentScoreRef.current}`, hudPadX, hudY);
    hudY += hudLine;
    ctx.fillText(`רמה: ${diff.level}`, hudPadX, hudY);
    if (highScoreRef.current > 0) {
      hudY += hudLine;
      ctx.fillText(`שיא: ${highScoreRef.current}`, hudPadX, hudY);
    }

    rafRef.current = requestAnimationFrame(updateGame);
  }

  function startGame() {
    preloadAssets();

    let attempts = 0;
    const boot = () => {
      attempts++;
      if (!syncCanvasSize()) {
        if (attempts < 24) {
          requestAnimationFrame(boot);
          return;
        }
        const c = canvasRef.current;
        if (c) {
          const w = Math.min(1180, Math.max(320, Math.floor(window.innerWidth - 48)));
          const landscapeWide = window.innerWidth >= window.innerHeight;
          const h = Math.max(
            240,
            landscapeWide ? Math.floor((w * 9) / 16) : Math.floor(w / 2)
          );
          c.width = w;
          c.height = h;
        }
      }
      keysRef.current = { left: false, right: false };
      initGame();
      runningRef.current = true;
      keyboardGateRef.current = true;
      updateGame();
    };
    boot();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Game loop lifecycle only (no keyboard attach/detach here)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameRunning) return;

    const kick = () => {
      cancelAnimationFrame(startupRafRef.current);
      startupRafRef.current = requestAnimationFrame(() => startGame());
    };
    kick();

    return () => {
      cancelAnimationFrame(startupRafRef.current);
      runningRef.current = false;
      resetInputState();
      cancelAnimationFrame(rafRef.current);
    };
  }, [gameRunning]);

  useEffect(() => {
    if (!gameRunning || showIntro) return;
    const board = boardRef.current;
    if (!board || typeof ResizeObserver === "undefined") return;

    const apply = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      syncCanvasSize();
      const leo = leoRef.current;
      if (leo && canvas.height > 40) {
        leo.y = canvas.height - 120;
        leo.x = Math.max(0, Math.min(leo.x, canvas.width - leo.width));
      }
    };

    apply();
    const ro = new ResizeObserver(() => apply());
    ro.observe(board);
    return () => ro.disconnect();
  }, [gameRunning, showIntro]);

  const setPad = (side, down) => {
    if (!keyboardGateRef.current) return;
    if (side === "left") keysRef.current.left = down;
    if (side === "right") keysRef.current.right = down;
  };

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
              <canvas
                ref={canvasRef}
                className="pointer-events-none absolute inset-0 block h-full w-full touch-none"
                aria-hidden
              />

              {showFullscreenButton ? (
                <div className="pointer-events-auto absolute right-2 top-2 z-[70]">
                  <SoloGameMobileFullscreenButton
                    isFullscreen={isFullscreen}
                    onToggle={toggleFromUserGesture}
                  />
                </div>
              ) : null}

              {gameOver && !onSessionEnd && (
                <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/70">
                  <h2 className="mb-4 text-4xl font-bold text-red-500 sm:text-5xl">סיום משחק</h2>
                </div>
              )}

              {gameOver && onSessionEnd ? (
                <SoloGameEndInterstitialOverlay
                  didWin={false}
                  onDone={completeEndInterstitial}
                />
              ) : null}
            </div>

            {gameRunning && !gameOver && (
              <>
                <button
                  type="button"
                  className="fixed bottom-8 left-4 z-[200010] select-none rounded-lg bg-yellow-400 px-8 py-4 text-lg font-bold text-black"
                  style={{ touchAction: "none" }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    try {
                      e.currentTarget.setPointerCapture?.(e.pointerId);
                    } catch {
                      /* noop */
                    }
                    setPad("left", true);
                  }}
                  onPointerUp={(e) => {
                    setPad("left", false);
                    try {
                      e.currentTarget.releasePointerCapture?.(e.pointerId);
                    } catch {
                      /* noop */
                    }
                  }}
                  onPointerCancel={() => setPad("left", false)}
                  onPointerLeave={(e) => {
                    if (e.buttons === 0) setPad("left", false);
                  }}
                >
                  ◀ שמאל
                </button>
                <button
                  type="button"
                  className="fixed bottom-8 right-4 z-[200010] select-none rounded-lg bg-yellow-400 px-8 py-4 text-lg font-bold text-black"
                  style={{ touchAction: "none" }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    try {
                      e.currentTarget.setPointerCapture?.(e.pointerId);
                    } catch {
                      /* noop */
                    }
                    setPad("right", true);
                  }}
                  onPointerUp={(e) => {
                    setPad("right", false);
                    try {
                      e.currentTarget.releasePointerCapture?.(e.pointerId);
                    } catch {
                      /* noop */
                    }
                  }}
                  onPointerCancel={() => setPad("right", false)}
                  onPointerLeave={(e) => {
                    if (e.buttons === 0) setPad("right", false);
                  }}
                >
                  ימין ▶
                </button>
              </>
            )}
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
