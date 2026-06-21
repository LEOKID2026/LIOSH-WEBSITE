import { useEffect, useRef, useState } from "react";
import {
  SOLO_V2_ASSETS,
  SoloV2EndBanner,
  SoloV2Goal,
  SoloV2Hud,
  SoloV2Intro,
  SoloV2Playfield,
  loadImage,
} from "./solo-v2-ui.jsx";

const SCORE_OBSTACLE = 5;
const SCORE_COIN = 10;

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
  const assetsRef = useRef({ leo: null, coin: null, obstacle: null, bg: null });

  const stateRef = useRef({
    leoY: 0,
    leoVy: 0,
    grounded: true,
    obstacles: [],
    coins: [],
    spawnTimer: 0,
    speed: 5,
  });

  const [showIntro, setShowIntro] = useState(!autoStart);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(0);
  const [collected, setCollected] = useState(0);

  useEffect(() => {
    Promise.all([
      loadImage(SOLO_V2_ASSETS.leo),
      loadImage(SOLO_V2_ASSETS.coin),
      loadImage(SOLO_V2_ASSETS.obstacle),
      loadImage(SOLO_V2_ASSETS.bgDay),
    ]).then(([leo, coin, obstacle, bg]) => {
      assetsRef.current = { leo, coin, obstacle, bg };
    });
  }, []);

  const addScore = (pts) => {
    scoreRef.current += pts;
    setScore(scoreRef.current);
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

  const jump = () => {
    const s = stateRef.current;
    if (s.grounded) {
      s.leoVy = -12;
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
    fireSessionEnd();
  };

  const startGame = () => {
    sessionEndFiredRef.current = false;
    playStartedAtRef.current = Date.now();
    scoreRef.current = 0;
    setScore(0);
    setPassed(0);
    setCollected(0);
    setGameOver(false);
    setShowIntro(false);
    stateRef.current = {
      leoY: 0,
      leoVy: 0,
      grounded: true,
      obstacles: [],
      coins: [],
      spawnTimer: 0,
      speed: 5,
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
    const groundY = h - 56;
    const s = stateRef.current;
    const assets = assetsRef.current;
    const leoX = 80;
    const leoW = 56;
    const leoH = 56;

    s.leoVy += 0.58;
    s.leoY += s.leoVy;
    if (s.leoY >= 0) {
      s.leoY = 0;
      s.leoVy = 0;
      s.grounded = true;
    }

    s.spawnTimer += 1;
    if (s.spawnTimer > Math.max(45, 85 - s.speed * 4)) {
      s.spawnTimer = 0;
      s.obstacles.push({
        x: w + 30,
        w: 36,
        h: 40 + Math.random() * 20,
        passed: false,
      });
      if (Math.random() < 0.5) {
        s.coins.push({ x: w + 60, y: groundY - 90 - Math.random() * 50, r: 18 });
      }
    }

    s.obstacles = s.obstacles
      .map((o) => {
        const nx = o.x - s.speed;
        if (!o.passed && nx + o.w < leoX) {
          o.passed = true;
          addScore(SCORE_OBSTACLE);
          setPassed((p) => p + 1);
        }
        return { ...o, x: nx };
      })
      .filter((o) => o.x + o.w > -20);

    s.coins = s.coins
      .map((c) => ({ ...c, x: c.x - s.speed }))
      .filter((c) => {
        if (c.x + c.r < -10) return false;
        const leoBottom = groundY + s.leoY;
        const leoTop = leoBottom - leoH;
        const hit =
          leoX + leoW > c.x - c.r &&
          leoX < c.x + c.r &&
          leoBottom > c.y - c.r &&
          leoTop < c.y + c.r;
        if (hit) {
          addScore(SCORE_COIN);
          setCollected((n) => n + 1);
          return false;
        }
        return true;
      });

    const leoBottom = groundY + s.leoY;
    const leoTop = leoBottom - leoH;
    for (const o of s.obstacles) {
      if (leoX + leoW - 8 > o.x && leoX + 8 < o.x + o.w && leoBottom - 4 > groundY - o.h) {
        endGame();
        return;
      }
    }

    if (scoreRef.current >= 80 && scoreRef.current % 80 === 0) {
      s.speed = Math.min(9, s.speed + 0.02);
    }

    ctx.clearRect(0, 0, w, h);
    if (assets.bg) ctx.drawImage(assets.bg, 0, 0, w, h);
    else {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#38bdf8");
      g.addColorStop(1, "#1e3a8a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.fillStyle = "#4ade80";
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.fillStyle = "#ca8a04";
    ctx.fillRect(0, groundY, w, 8);

    for (const o of s.obstacles) {
      if (assets.obstacle) ctx.drawImage(assets.obstacle, o.x, groundY - o.h, o.w, o.h);
      else {
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(o.x, groundY - o.h, o.w, o.h);
      }
    }

    for (const c of s.coins) {
      if (assets.coin) ctx.drawImage(assets.coin, c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);
      else {
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (assets.leo) ctx.drawImage(assets.leo, leoX, leoTop, leoW, leoH);
    else {
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(leoX, leoTop, leoW, leoH);
    }

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
      className="relative flex h-full min-h-0 flex-1 flex-col items-center gap-2 overflow-hidden px-2 py-2 text-white select-none"
      dir="rtl"
    >
      <SoloV2Goal text="קפצו מעל מכשולים, אספו מטבעות — פגיעה במכשול מסיימת את המשחק!" />
      {!showIntro ? (
        <SoloV2Hud
          rows={[
            { label: "ניקוד", value: score, accent: "text-amber-300" },
            { label: "מכשולים", value: passed },
            { label: "מטבעות", value: collected },
          ]}
        />
      ) : null}

      <SoloV2Playfield bg={SOLO_V2_ASSETS.bgDay} className="max-w-[1180px] w-full">
        {showIntro ? (
          <SoloV2Intro
            title="ליאו קופץ!"
            lines={[
              "לחצו / רווח / קפיצה כדי לקפוץ",
              "+5 על כל מכשול שעברתם",
              "+10 על כל מטבע שאספתם",
              "פגיעה במכשול = סוף משחק",
            ]}
            onStart={startGame}
          />
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
              className="absolute bottom-3 left-3 z-30 min-h-[48px] rounded-xl bg-yellow-400 px-5 py-2 text-base font-bold text-black shadow-lg sm:hidden"
              onClick={jump}
            >
              קפיצה 🦘
            </button>
            {gameOver ? (
              <SoloV2EndBanner
                title="אוי! פגעת במכשול"
                subtitle={`ניקוד: ${score} · מכשולים: ${passed} · מטבעות: ${collected}`}
              />
            ) : null}
          </>
        )}
      </SoloV2Playfield>
    </div>
  );
}
