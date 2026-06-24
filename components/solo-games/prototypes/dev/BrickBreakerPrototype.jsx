import { useEffect, useRef, useState } from "react";
import DevPrototypeShell from "./DevPrototypeShell.jsx";

const COLS = 8;
const ROWS = 5;
const BRICK_W = 42;
const BRICK_H = 18;
const PADDLE_W = 88;
const PADDLE_H = 14;
const BALL_R = 7;
const BALL_SPEED = 4.2;

const BRICK_COLORS = ["#f87171", "#fb923c", "#fbbf24", "#4ade80", "#60a5fa", "#c084fc"];

/** @typedef {{ c: number, r: number, alive: boolean }} Brick */

/** @returns {Brick[]} */
function createBricks() {
  /** @type {Brick[]} */
  const list = [];
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      list.push({ c, r, alive: true });
    }
  }
  return list;
}

export default function BrickBreakerPrototype() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const rafRef = useRef(null);

  const stateRef = useRef({
    w: 360,
    h: 480,
    paddleX: 136,
    ballX: 180,
    ballY: 400,
    ballVx: BALL_SPEED * 0.7,
    ballVy: -BALL_SPEED,
    bricks: createBricks(),
    running: true,
  });

  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [score, setScore] = useState(0);

  const resetGame = () => {
    stateRef.current = {
      w: stateRef.current.w,
      h: stateRef.current.h,
      paddleX: stateRef.current.w / 2 - PADDLE_W / 2,
      ballX: stateRef.current.w / 2,
      ballY: stateRef.current.h - 80,
      ballVx: BALL_SPEED * 0.7,
      ballVy: -BALL_SPEED,
      bricks: createBricks(),
      running: true,
    };
    setGameOver(false);
    setWon(false);
    setScore(0);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stateRef.current.w = rect.width;
      stateRef.current.h = rect.height;
    };

    resize();
    window.addEventListener("resize", resize);

    const tick = () => {
      const s = stateRef.current;
      if (!s.running) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      s.ballX += s.ballVx;
      s.ballY += s.ballVy;

      if (s.ballX - BALL_R <= 0) {
        s.ballX = BALL_R;
        s.ballVx = Math.abs(s.ballVx);
      }
      if (s.ballX + BALL_R >= s.w) {
        s.ballX = s.w - BALL_R;
        s.ballVx = -Math.abs(s.ballVx);
      }
      if (s.ballY - BALL_R <= 0) {
        s.ballY = BALL_R;
        s.ballVy = Math.abs(s.ballVy);
      }

      if (s.ballY + BALL_R >= s.h) {
        s.running = false;
        setGameOver(true);
      }

      const padTop = s.h - 36;
      if (
        s.ballVy > 0 &&
        s.ballY + BALL_R >= padTop &&
        s.ballY - BALL_R <= padTop + PADDLE_H &&
        s.ballX >= s.paddleX &&
        s.ballX <= s.paddleX + PADDLE_W
      ) {
        s.ballY = padTop - BALL_R;
        const hit = (s.ballX - (s.paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
        s.ballVx = hit * BALL_SPEED * 1.1;
        s.ballVy = -Math.abs(s.ballVy);
      }

      const offsetX = (s.w - COLS * (BRICK_W + 4)) / 2;
      const offsetY = 48;
      for (const b of s.bricks) {
        if (!b.alive) continue;
        const bx = offsetX + b.c * (BRICK_W + 4);
        const by = offsetY + b.r * (BRICK_H + 4);
        if (
          s.ballX + BALL_R > bx &&
          s.ballX - BALL_R < bx + BRICK_W &&
          s.ballY + BALL_R > by &&
          s.ballY - BALL_R < by + BRICK_H
        ) {
          b.alive = false;
          s.ballVy *= -1;
          setScore((sc) => sc + 10);
        }
      }

      if (s.bricks.every((b) => !b.alive)) {
        s.running = false;
        setWon(true);
      }

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, s.w, s.h);

      for (const b of s.bricks) {
        if (!b.alive) continue;
        const bx = offsetX + b.c * (BRICK_W + 4);
        const by = offsetY + b.r * (BRICK_H + 4);
        ctx.fillStyle = BRICK_COLORS[(b.r + b.c) % BRICK_COLORS.length];
        ctx.fillRect(bx, by, BRICK_W, BRICK_H);
      }

      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(s.paddleX, padTop, PADDLE_W, PADDLE_H);

      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(s.ballX, s.ballY, BALL_R, 0, Math.PI * 2);
      ctx.fill();

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const movePaddle = (clientX) => {
    const wrap = wrapRef.current;
    if (!wrap || !stateRef.current.running) return;
    const rect = wrap.getBoundingClientRect();
    const x = clientX - rect.left - PADDLE_W / 2;
    stateRef.current.paddleX = Math.max(0, Math.min(stateRef.current.w - PADDLE_W, x));
  };

  return (
    <DevPrototypeShell
      title="שובר לבנים"
      subtitle="אבטיפוס · הזיזו מחבט · שברו לבנים"
      headerExtra={
        <span className="rounded-lg bg-black/50 px-2 py-1 text-xs font-bold text-amber-200">{score}</span>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2 p-2 sm:p-3">
        <p className="text-center text-xs font-semibold text-sky-200 sm:text-sm">
          גררו/הזיזו למטה · אל תפספסו את הכדור
        </p>

        <div
          ref={wrapRef}
          className="relative min-h-0 w-full max-w-[380px] flex-1"
          style={{ touchAction: "none" }}
        >
          <canvas
            ref={canvasRef}
            className="h-full w-full touch-none rounded-2xl border-4 border-yellow-400 shadow-[0_0_32px_rgba(250,204,21,0.12)]"
            onPointerMove={(e) => movePaddle(e.clientX)}
            onPointerDown={(e) => {
              movePaddle(e.clientX);
              e.currentTarget.setPointerCapture?.(e.pointerId);
            }}
            onPointerUp={(e) => {
              if (gameOver || won) resetGame();
            }}
          />

          {gameOver ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/55">
              <p className="text-xl font-extrabold text-rose-300">הכדור נפל!</p>
              <p className="mt-1 text-sm text-white/75">לחצו לשחק שוב</p>
            </div>
          ) : null}

          {won ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/55">
              <p className="text-xl font-extrabold text-emerald-300">כל הלבנים נשברו! 🎉</p>
              <p className="mt-1 text-sm text-white/75">לחצו לשחק שוב</p>
            </div>
          ) : null}
        </div>
      </div>
    </DevPrototypeShell>
  );
}
