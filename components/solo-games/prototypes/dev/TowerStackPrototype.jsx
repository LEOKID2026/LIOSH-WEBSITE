import { useCallback, useEffect, useRef, useState } from "react";
import DevPrototypeShell from "./DevPrototypeShell.jsx";

const PLAY_W = 300;
const BLOCK_H = 28;
const SPEED = 2.2;
const MIN_W = 22;

/** @typedef {{ x: number, w: number, color: string }} Block */

const COLORS = ["#f87171", "#60a5fa", "#4ade80", "#fbbf24", "#c084fc", "#fb923c", "#38bdf8", "#f472b6"];

export default function TowerStackPrototype() {
  const rafRef = useRef(null);
  const movingRef = useRef({ x: 0, dir: 1, w: PLAY_W * 0.5 });
  const towerRef = useRef(/** @type {Block[]} */ ([]));

  const [tower, setTower] = useState(/** @type {Block[]} */ ([]));
  const [moving, setMoving] = useState({ x: 0, w: PLAY_W * 0.5 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState("");

  const reset = () => {
    const w = PLAY_W * 0.5;
    towerRef.current = [];
    movingRef.current = { x: 0, dir: 1, w };
    setTower([]);
    setMoving({ x: 0, w });
    setGameOver(false);
    setScore(0);
    setFlash("");
  };

  useEffect(() => {
    towerRef.current = tower;
  }, [tower]);

  useEffect(() => {
    if (gameOver) return;

    const tick = () => {
      const m = movingRef.current;
      let nx = m.x + m.dir * SPEED;
      let ndir = m.dir;
      const maxX = PLAY_W - m.w;
      if (nx <= 0) {
        nx = 0;
        ndir = 1;
      } else if (nx >= maxX) {
        nx = maxX;
        ndir = -1;
      }
      movingRef.current = { ...m, x: nx, dir: ndir };
      setMoving({ x: nx, w: m.w });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gameOver, score]);

  const placeBlock = useCallback(() => {
    if (gameOver) {
      reset();
      return;
    }

    const m = movingRef.current;
    const currentTower = towerRef.current;

    if (!currentTower.length) {
      const first = { x: m.x, w: m.w, color: COLORS[0] };
      towerRef.current = [first];
      setTower([first]);
      setScore(1);
      const w = PLAY_W * 0.5;
      movingRef.current = { x: 0, dir: 1, w };
      setMoving({ x: 0, w });
      return;
    }

    const top = currentTower[currentTower.length - 1];
    const left = Math.max(m.x, top.x);
    const right = Math.min(m.x + m.w, top.x + top.w);
    const overlap = right - left;

    if (overlap <= 0) {
      setGameOver(true);
      setFlash("bad");
      return;
    }

    const newBlock = {
      x: left,
      w: overlap,
      color: COLORS[currentTower.length % COLORS.length],
    };

    const nextTower = [...currentTower, newBlock];
    towerRef.current = nextTower;
    setTower(nextTower);
    setScore(nextTower.length);

    if (overlap < MIN_W) {
      setGameOver(true);
      setFlash("tiny");
      return;
    }

    movingRef.current = { x: 0, dir: 1, w: overlap };
    setMoving({ x: 0, w: overlap });
    setFlash(overlap < top.w * 0.5 ? "warn" : "ok");
    window.setTimeout(() => setFlash(""), 280);
  }, [gameOver]);

  return (
    <DevPrototypeShell
      title="מגדל קוביות"
      subtitle="אבטיפוס · לחיצה להנחה · דיוק = מגדל גבוה"
      headerExtra={
        <span className="rounded-lg bg-black/50 px-2 py-1 text-xs font-bold text-amber-200">
          {score} קומות
        </span>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 p-3 sm:p-4">
        <p className="text-center text-xs font-semibold text-sky-200 sm:text-sm">
          לחצו כשהקובייה מעל המגדל · חפיפה קטנה = קובייה צרה יותר
        </p>

        <div
          className={`relative overflow-hidden rounded-2xl border-4 border-yellow-400 bg-gradient-to-b from-slate-900 to-slate-950 shadow-[0_0_32px_rgba(250,204,21,0.12)] ${
            flash === "bad" ? "ring-4 ring-rose-500 ring-inset" : ""
          }`}
          style={{ width: PLAY_W + 24, height: 400, touchAction: "manipulation" }}
          onClick={placeBlock}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              placeBlock();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="הניחו קובייה"
        >
          {!gameOver ? (
            <div
              className="absolute rounded-md border-2 border-white/40 shadow-lg"
              style={{
                top: 20,
                left: 12 + moving.x,
                width: moving.w,
                height: BLOCK_H,
                backgroundColor: COLORS[tower.length % COLORS.length],
              }}
            />
          ) : null}

          <div className="absolute bottom-6 left-3" style={{ width: PLAY_W, height: 280 }}>
            <div
              className="absolute bottom-0 left-1/2 h-3 -translate-x-1/2 rounded-full bg-slate-600"
              style={{ width: PLAY_W * 0.55 }}
            />
            {tower.map((b, i) => (
              <div
                key={i}
                className="absolute rounded-md border-2 border-slate-900/60 shadow-md"
                style={{
                  left: b.x,
                  bottom: 8 + i * BLOCK_H,
                  width: b.w,
                  height: BLOCK_H,
                  backgroundColor: b.color,
                }}
              />
            ))}
          </div>

          {gameOver ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55">
              <p className="text-xl font-extrabold text-rose-300">Game Over</p>
              <p className="mt-1 text-sm font-semibold text-white/80">
                {flash === "tiny" ? "הקובייה קטנה מדי" : "פספסתם - אין חפיפה"}
              </p>
              <p className="mt-2 text-xs text-white/60">לחצו לשחק שוב</p>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={placeBlock}
          className="min-h-[48px] rounded-xl bg-sky-500 px-8 py-2.5 text-base font-bold text-white shadow-lg active:scale-[0.98]"
        >
          {gameOver ? "שחק שוב" : "הניחו 👆"}
        </button>

        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-white/25 px-3 py-1.5 text-xs font-bold text-white/75"
        >
          איפוס
        </button>
      </div>
    </DevPrototypeShell>
  );
}
