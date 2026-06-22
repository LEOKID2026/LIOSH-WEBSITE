// pages/mleo-catcher.js
import { useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import Image from "next/image";
import { useRouter } from "next/router";

const DEFAULT_PLAYER_NAME = "שחקן";

export default function MleoCatcher() {
  const router = useRouter();

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
  const runningRef = useRef(false);
  const rafRef = useRef(0);
  const diffTimerRef = useRef({ lastSpawn: 0 });
  const startupRafRef = useRef(0);

  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);

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

  const beginRun = () => {
    const resolved = resolveEffectivePlayerName();
    setPlayerName(resolved);
    playerNameRef.current = resolved;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("mleo_player_name", resolved);
      }
    } catch {
      /* noop */
    }
    updateLeaderboard(resolved, 0);
    setShowIntro(false);
    setGameRunning(true);
  };

  useEffect(() => {
    playerNameRef.current = playerName;
  }, [playerName]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedHighScore = Number(localStorage.getItem("mleoCatcherHighScore") || 0);
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
        if (item.type === "coin") currentScoreRef.current += 1;
        else if (item.type === "diamond") currentScoreRef.current += 5;
        else if (item.type === "bomb") {
          resetInputState();
          runningRef.current = false;
          setGameOver(true);
          updateLeaderboard(playerNameRef.current, currentScoreRef.current);
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

    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(`רמה: ${diff.level}`, 16, 28);

    rafRef.current = requestAnimationFrame(updateGame);
  }

  function startGame() {
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const wrapper = document.getElementById("game-wrapper");
    if (isMobile && wrapper?.requestFullscreen) wrapper.requestFullscreen().catch(() => {});
    else if (isMobile && wrapper?.webkitRequestFullscreen) wrapper.webkitRequestFullscreen?.();

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

  const exitToGameHub = () => {
    if (typeof document !== "undefined") {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else if (document.webkitFullscreenElement) document.webkitExitFullscreen?.();
    }
    resetInputState();
    setGameRunning(false);
    setGameOver(false);
    setShowIntro(true);
    router.push("/game");
  };

  return (
    <Layout>
      <div
        id="game-wrapper"
        className="relative isolate flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white select-none"
        dir="rtl"
      >
        {showIntro && (
          <div
            className="pointer-events-auto absolute inset-0 z-[200000] flex flex-col items-center justify-center overflow-y-auto bg-gray-900 p-6 text-center"
            style={{ touchAction: "manipulation" }}
          >
            <Image src="/images/leo-intro.png" alt="ליאו" width={220} height={220} className="mb-6 animate-bounce" />
            <h1 className="mb-2 text-4xl font-bold text-yellow-400 sm:text-5xl">🎯 תופס עם ליאו</h1>
            <p className="mb-4 text-base text-gray-200 sm:text-lg">
              הזיזו את ליאו, תפסו מטבעות ויהלומים, והתרחקו מפצצות!
            </p>

            <input
              type="text"
              placeholder="מה השם שלכם? (אופציונלי)"
              value={playerName}
              onChange={(e) => {
                const newName = e.target.value;
                setPlayerName(newName);
                if (typeof window !== "undefined") {
                  const t = String(newName || "").trim();
                  if (t) {
                    try {
                      localStorage.setItem("mleo_player_name", t);
                    } catch {
                      /* noop */
                    }
                  }
                  /* Empty field: do not clear LS — beginRun still resolves from LS or default. */
                }
              }}
              className="mb-4 w-64 max-w-[90vw] rounded px-4 py-2 text-center text-black"
              autoComplete="off"
            />

            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={beginRun}
                className="animate-pulse rounded-lg bg-yellow-400 px-8 py-4 text-xl font-bold text-black shadow-lg transition hover:scale-105"
                style={{ touchAction: "manipulation" }}
              >
                ▶ התחלה
              </button>
              <button
                type="button"
                onClick={exitToGameHub}
                className="rounded-lg bg-gray-700 px-8 py-4 text-xl font-bold text-white shadow-lg transition hover:bg-gray-600"
                style={{ touchAction: "manipulation" }}
              >
                ✖ חזרה למשחקים
              </button>
            </div>
          </div>
        )}

        {!showIntro && (
          <>
            <div className="pointer-events-none absolute left-1/2 top-2 z-20 hidden max-w-[95vw] -translate-x-1/2 rounded-lg bg-black/60 px-4 py-2 text-lg font-bold sm:block">
              ניקוד: {score} | שיא: {highScore}
            </div>
            <div className="pointer-events-none absolute bottom-40 left-1/2 z-20 max-w-[95vw] -translate-x-1/2 rounded-md bg-black/60 px-3 py-1 text-base font-bold sm:hidden">
              ניקוד: {score} | שיא: {highScore}
            </div>

            <div
              ref={boardRef}
              className="relative z-0 mx-auto aspect-[2/1] w-[min(100vw-1rem,1180px)] max-h-[min(68vh,calc(100vw*0.5))] overflow-hidden rounded-lg border-4 border-yellow-400 bg-black/30 shadow-lg landscape:max-lg:aspect-video landscape:max-lg:max-h-[min(82vh,min(56.25vw,calc((100vw-1rem)*9/16)))] sm:max-h-[min(78vh,620px)]"
            >
              <canvas
                ref={canvasRef}
                className="pointer-events-none absolute inset-0 block h-full w-full touch-none"
                aria-hidden
              />

              {gameOver && (
                <div
                  className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/70"
                  style={{ touchAction: "manipulation" }}
                >
                  <h2 className="mb-4 text-4xl font-bold text-red-500 sm:text-5xl">סיום משחק</h2>
                  <button
                    type="button"
                    className="relative z-50 rounded bg-yellow-400 px-6 py-3 text-base font-bold text-black sm:text-lg"
                    onClick={() => {
                      resetInputState();
                      setGameRunning(false);
                      setGameOver(false);
                      setTimeout(() => setGameRunning(true), 50);
                    }}
                    style={{ touchAction: "manipulation" }}
                  >
                    שחקו שוב
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={exitToGameHub}
              className="fixed right-4 top-4 z-[200010] rounded-lg bg-yellow-400 px-6 py-4 text-lg font-bold text-black sm:text-xl"
              style={{ touchAction: "manipulation" }}
            >
              יציאה
            </button>

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
          </>
        )}
      </div>
    </Layout>
  );
}
