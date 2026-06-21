import { useEffect, useRef, useState } from "react";

/**
 * @param {{ autoStart?: boolean, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoJumpEngine({ autoStart = false, onSessionEnd }) {
  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const runningRef = useRef(false);
  const scoreRef = useRef(0);

  const stateRef = useRef({
    leoY: 0,
    leoVy: 0,
    grounded: true,
    obstacles: [],
    coins: [],
    spawnTimer: 0,
    speed: 4,
    tick: 0,
  });

  const [showIntro, setShowIntro] = useState(!autoStart);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  const fireSessionEnd = (finalScore) => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    onSessionEnd({
      score: finalScore,
      didWin: false,
      levelReached: Math.floor(finalScore / 10),
      durationMs:
        playStartedAtRef.current != null
          ? Math.max(0, Date.now() - playStartedAtRef.current)
          : undefined,
    });
  };

  const jump = () => {
    const s = stateRef.current;
    if (s.grounded) {
      s.leoVy = -11;
      s.grounded = false;
    }
  };

  const stopLoop = () => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const endGame = () => {
    stopLoop();
    setGameOver(true);
    fireSessionEnd(scoreRef.current);
  };

  const startGame = () => {
    sessionEndFiredRef.current = false;
    playStartedAtRef.current = Date.now();
    scoreRef.current = 0;
    setScore(0);
    setGameOver(false);
    setShowIntro(false);
    stateRef.current = {
      leoY: 0,
      leoVy: 0,
      grounded: true,
      obstacles: [],
      coins: [],
      spawnTimer: 0,
      speed: 4,
      tick: 0,
    };
    runningRef.current = true;
    loop();
  };

  const loop = () => {
    if (!runningRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const groundY = h - 48;
    const s = stateRef.current;

    s.tick += 1;
    if (s.tick % 8 === 0) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      if (scoreRef.current % 100 === 0) s.speed += 0.3;
    }

    s.leoVy += 0.55;
    s.leoY += s.leoVy;
    if (s.leoY >= 0) {
      s.leoY = 0;
      s.leoVy = 0;
      s.grounded = true;
    }

    s.spawnTimer += 1;
    if (s.spawnTimer > 70 - Math.min(30, s.speed * 2)) {
      s.spawnTimer = 0;
      s.obstacles.push({ x: w + 20, w: 28 + Math.random() * 18, h: 36 + Math.random() * 24 });
      if (Math.random() < 0.45) {
        s.coins.push({ x: w + 40, y: groundY - 70 - Math.random() * 40, r: 14 });
      }
    }

    s.obstacles = s.obstacles
      .map((o) => ({ ...o, x: o.x - s.speed }))
      .filter((o) => o.x + o.w > -10);
    s.coins = s.coins
      .map((c) => ({ ...c, x: c.x - s.speed }))
      .filter((c) => c.x + c.r > -10);

    const leoX = 72;
    const leoBottom = groundY + s.leoY;
    const leoTop = leoBottom - 52;
    const leoW = 48;

    for (const o of s.obstacles) {
      if (leoX + leoW > o.x && leoX < o.x + o.w && leoBottom > groundY - o.h) {
        endGame();
        return;
      }
    }

    s.coins = s.coins.filter((c) => {
      const hit =
        leoX + leoW > c.x - c.r &&
        leoX < c.x + c.r &&
        leoBottom > c.y - c.r &&
        leoTop < c.y + c.r;
      if (hit) {
        scoreRef.current += 5;
        setScore(scoreRef.current);
      }
      return !hit;
    });

    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#0c4a6e");
    grad.addColorStop(1, "#172554");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#365314";
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.fillStyle = "#ca8a04";
    ctx.fillRect(0, groundY, w, 6);

    ctx.fillStyle = "#ef4444";
    for (const o of s.obstacles) {
      ctx.fillRect(o.x, groundY - o.h, o.w, o.h);
    }

    ctx.fillStyle = "#fbbf24";
    for (const c of s.coins) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#fde68a";
    ctx.fillRect(leoX, leoTop, leoW, 52);
    ctx.fillStyle = "#000";
    ctx.fillRect(leoX + 32, leoTop + 12, 8, 8);

    rafRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      stopLoop();
    };
  }, []);

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
    if (autoStart && !runningRef.current && !gameOver && !showIntro) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return (
    <div
      id="game-wrapper"
      className="relative flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-gray-900 text-white select-none px-2 py-2"
      dir="rtl"
    >
      <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-lg bg-black/60 px-4 py-2 text-base font-bold">
        ניקוד: {score}
      </div>

      <div className="relative flex min-h-0 w-full max-w-[1180px] flex-1 overflow-hidden rounded-lg border-4 border-yellow-400 bg-black/30">
        {showIntro ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-lg font-bold">קפצו מעל מכשולים ואספו מטבעות!</p>
            <button
              type="button"
              onClick={startGame}
              className="min-h-[48px] rounded-xl bg-yellow-400 px-8 py-3 font-bold text-black"
            >
              התחל
            </button>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              className="block h-full w-full touch-none"
              onPointerDown={(e) => {
                e.preventDefault();
                jump();
              }}
            />
            <button
              type="button"
              className="absolute bottom-4 left-4 z-30 min-h-[48px] rounded-xl bg-yellow-400 px-6 py-3 font-bold text-black sm:hidden"
              onClick={jump}
            >
              קפיצה
            </button>
            {gameOver ? (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 text-xl font-bold">
                המשחק נגמר!
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
