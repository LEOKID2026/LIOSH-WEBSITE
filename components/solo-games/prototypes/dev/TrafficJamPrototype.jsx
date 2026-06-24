import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DevPrototypeShell from "./DevPrototypeShell.jsx";

const SIZE = 6;

/**
 * @typedef {{ id: string, r: number, c: number, len: number, horiz: boolean, target?: boolean, color: string }} Car
 */

/** @returns {Car[]} */
function createPuzzle() {
  return [
    { id: "target", r: 2, c: 0, len: 2, horiz: true, target: true, color: "#f87171" },
    { id: "v1", r: 0, c: 2, len: 4, horiz: false, color: "#60a5fa" },
    { id: "h1", r: 2, c: 4, len: 2, horiz: true, color: "#a78bfa" },
    { id: "h2", r: 1, c: 0, len: 2, horiz: true, color: "#fbbf24" },
    { id: "v2", r: 0, c: 4, len: 2, horiz: false, color: "#34d399" },
    { id: "v3", r: 4, c: 3, len: 2, horiz: false, color: "#fb923c" },
    { id: "h3", r: 5, c: 0, len: 3, horiz: true, color: "#38bdf8" },
  ];
}

/**
 * @param {Car[]} cars
 */
function buildOccupancy(cars) {
  /** @type {(string | null)[][]} */
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  for (const car of cars) {
    for (let i = 0; i < car.len; i += 1) {
      const r = car.horiz ? car.r : car.r + i;
      const c = car.horiz ? car.c + i : car.c;
      if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) grid[r][c] = car.id;
    }
  }
  return grid;
}

/**
 * @param {Car} car
 * @param {number} nr
 * @param {number} nc
 * @param {Car[]} cars
 */
function canPlace(car, nr, nc, cars) {
  if (car.horiz) {
    if (nc < 0 || nc + car.len > SIZE) return false;
    if (nr < 0 || nr >= SIZE) return false;
  } else {
    if (nr < 0 || nr + car.len > SIZE) return false;
    if (nc < 0 || nc >= SIZE) return false;
  }

  for (let i = 0; i < car.len; i += 1) {
    const r = car.horiz ? nr : nr + i;
    const c = car.horiz ? nc + i : nc;
    for (const other of cars) {
      if (other.id === car.id) continue;
      for (let j = 0; j < other.len; j += 1) {
        const or = other.horiz ? other.r : other.r + j;
        const oc = other.horiz ? other.c + j : other.c;
        if (or === r && oc === c) return false;
      }
    }
  }
  return true;
}

/**
 * @param {Car[]} cars
 */
function targetEscaped(cars) {
  const target = cars.find((c) => c.target);
  if (!target || !target.horiz) return false;
  return target.c + target.len >= SIZE;
}

export default function TrafficJamPrototype() {
  const [cars, setCars] = useState(() => createPuzzle());
  const [won, setWon] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const dragRef = useRef(null);
  const gridRef = useRef(null);

  const occupancy = useMemo(() => buildOccupancy(cars), [cars]);

  const reset = () => {
    setCars(createPuzzle());
    setWon(false);
    setActiveId(null);
  };

  const moveCar = useCallback((carId, nr, nc) => {
    setCars((prev) => {
      const car = prev.find((c) => c.id === carId);
      if (!car) return prev;
      if (!canPlace(car, nr, nc, prev)) return prev;
      const next = prev.map((c) => (c.id === carId ? { ...c, r: nr, c: nc } : c));
      return next;
    });
  }, []);

  useEffect(() => {
    if (targetEscaped(cars)) setWon(true);
  }, [cars]);

  const onPointerDown = (e, car) => {
    if (won) return;
    dragRef.current = {
      carId: car.id,
      pointerId: e.pointerId,
      startR: car.r,
      startC: car.c,
      horiz: car.horiz,
    };
    setActiveId(car.id);
    gridRef.current?.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const el = gridRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cellW = rect.width / SIZE;
    const cellH = rect.height / SIZE;

    const dx = e.clientX - rect.left - d.startC * cellW - (d.horiz ? cellW * 0.5 : 0);
    const dy = e.clientY - rect.top - d.startR * cellH - (d.horiz ? 0 : cellH * 0.5);

    let nr = d.startR;
    let nc = d.startC;
    if (d.horiz) {
      nc = d.startC + Math.round(dx / cellW);
    } else {
      nr = d.startR + Math.round(dy / cellH);
    }
    moveCar(d.carId, nr, nc);
  };

  const onPointerUp = (e) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      gridRef.current?.releasePointerCapture?.(e.pointerId);
      dragRef.current = null;
    }
    setActiveId(null);
  };

  return (
    <DevPrototypeShell
      title="פקק תנועה"
      subtitle="אבטיפוס · גררו רכבים בכיוון שלהם · הוציאו את האדום"
      headerExtra={
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-white/25 px-2 py-1 text-[11px] font-bold text-white/85"
        >
          איפוס
        </button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-auto p-3 sm:p-4">
        <p className="text-center text-xs font-semibold text-rose-200 sm:text-sm">
          🚗 האדום צריך לצאת דרך היציאה → · גררו רק לאורך הרכב
        </p>

        <div className="relative w-full max-w-[min(100%,420px)]">
          <div
            ref={gridRef}
            dir="ltr"
            className="relative aspect-square w-full rounded-2xl border-4 border-yellow-400 bg-slate-800/90 shadow-[0_0_32px_rgba(250,204,21,0.12)]"
            style={{ touchAction: "none" }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* grid lines */}
            <div
              className="pointer-events-none absolute inset-0 grid gap-px p-1"
              style={{
                gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
                gridTemplateRows: `repeat(${SIZE}, 1fr)`,
              }}
            >
              {Array.from({ length: SIZE * SIZE }).map((_, i) => (
                <div key={i} className="rounded-sm border border-slate-600/40 bg-slate-900/50" />
              ))}
            </div>

            {/* exit marker */}
            <div
              className="pointer-events-none absolute top-0 flex items-center justify-center"
              style={{
                left: "100%",
                width: "14%",
                top: `${(2 / SIZE) * 100}%`,
                height: `${(1 / SIZE) * 100}%`,
              }}
            >
              <span className="text-lg font-black text-emerald-400 sm:text-xl">→</span>
            </div>

            {cars.map((car) => {
              const left = (car.c / SIZE) * 100;
              const top = (car.r / SIZE) * 100;
              const width = car.horiz ? (car.len / SIZE) * 100 : 100 / SIZE;
              const height = car.horiz ? 100 / SIZE : (car.len / SIZE) * 100;
              const isActive = activeId === car.id;

              return (
                <button
                  key={car.id}
                  type="button"
                  onPointerDown={(e) => onPointerDown(e, car)}
                  className={`absolute touch-none rounded-md border-2 shadow-md transition-shadow ${
                    car.target
                      ? "border-rose-200 ring-2 ring-rose-400/60"
                      : "border-slate-900/80"
                  } ${isActive ? "z-20 scale-[1.02] shadow-lg" : "z-10"}`}
                  style={{
                    left: `calc(${left}% + 4px)`,
                    top: `calc(${top}% + 4px)`,
                    width: `calc(${width}% - 8px)`,
                    height: `calc(${height}% - 8px)`,
                    backgroundColor: car.color,
                    touchAction: "none",
                  }}
                  aria-label={car.target ? "רכב מטרה" : "רכב"}
                >
                  <span className="flex h-full items-center justify-center text-lg sm:text-xl">
                    {car.target ? "🚗" : "🚙"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {won ? (
          <p className="text-center text-base font-bold text-emerald-300">יצאתם! הרכב האדום בחוץ 🎉</p>
        ) : (
          <p className="text-center text-xs font-semibold text-white/55">
            תאים תפוסים: {occupancy.flat().filter(Boolean).length} · שלב אחד לבדיקה
          </p>
        )}
      </div>
    </DevPrototypeShell>
  );
}
