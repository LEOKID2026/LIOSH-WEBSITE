import { useCallback, useRef, useState } from "react";
import DevPrototypeShell from "./DevPrototypeShell.jsx";

const GRID = 6;

const PAIRS = [
  { id: "red", color: "#f87171", glow: "rgba(248,113,113,0.5)", a: [0, 0], b: [5, 5] },
  { id: "blue", color: "#60a5fa", glow: "rgba(96,165,250,0.5)", a: [0, 5], b: [5, 0] },
  { id: "green", color: "#4ade80", glow: "rgba(74,222,128,0.5)", a: [2, 0], b: [2, 5] },
];

/**
 * @param {number} r
 * @param {number} c
 */
function keyOf(r, c) {
  return `${r},${c}`;
}

/** @type {Record<string, string>} */
const ENDPOINT_MAP = (() => {
  /** @type {Record<string, string>} */
  const map = {};
  for (const p of PAIRS) {
    map[keyOf(...p.a)] = p.id;
    map[keyOf(...p.b)] = p.id;
  }
  return map;
})();

/**
 * @param {Record<string, string[]>} paths
 * @param {string} cellKey
 */
function colorAtCell(paths, cellKey) {
  for (const pair of PAIRS) {
    const path = paths[pair.id] || [];
    if (path.includes(cellKey)) return pair.id;
  }
  return null;
}

/**
 * @param {string} a
 * @param {string} b
 */
function adjacent(a, b) {
  const [ar, ac] = a.split(",").map(Number);
  const [br, bc] = b.split(",").map(Number);
  return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
}

export default function ConnectColorsPrototype() {
  const gridRef = useRef(null);
  const dragRef = useRef(null);

  const [paths, setPaths] = useState(() => {
    /** @type {Record<string, string[]>} */
    const initial = {};
    for (const p of PAIRS) initial[p.id] = [];
    return initial;
  });
  const [activeColor, setActiveColor] = useState(null);
  const [invalidFlash, setInvalidFlash] = useState(false);
  const [dragPreview, setDragPreview] = useState(null);

  const endpointMap = ENDPOINT_MAP;

  const tryExtend = useCallback((colorId, cellKey, currentPaths) => {
    const path = [...(currentPaths[colorId] || [])];
    if (!path.length) {
      const pair = PAIRS.find((p) => p.id === colorId);
      if (!pair) return null;
      if (cellKey !== keyOf(...pair.a) && cellKey !== keyOf(...pair.b)) return null;
      return { ...currentPaths, [colorId]: [cellKey] };
    }

    const last = path[path.length - 1];
    if (cellKey === last) return currentPaths;

    if (path.length > 1 && cellKey === path[path.length - 2]) {
      return { ...currentPaths, [colorId]: path.slice(0, -1) };
    }

    if (!adjacent(last, cellKey)) return null;

    const occupant = colorAtCell(
      Object.fromEntries(
        Object.entries(currentPaths).map(([id, p]) => [id, id === colorId ? [] : p]),
      ),
      cellKey,
    );
    if (occupant) return null;

    for (const pair of PAIRS) {
      if (pair.id === colorId) continue;
      const epA = keyOf(...pair.a);
      const epB = keyOf(...pair.b);
      if ((cellKey === epA || cellKey === epB) && !(currentPaths[pair.id] || []).includes(cellKey)) {
        return null;
      }
    }

    if (path.includes(cellKey)) return null;

    return { ...currentPaths, [colorId]: [...path, cellKey] };
  }, []);

  const cellFromPoint = (clientX, clientY) => {
    const gridEl = gridRef.current;
    if (!gridEl) return null;
    const rect = gridEl.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    if (relX < 0 || relY < 0 || relX > rect.width || relY > rect.height) return null;
    const c = Math.floor((relX / rect.width) * GRID);
    const r = Math.floor((relY / rect.height) * GRID);
    if (r < 0 || c < 0 || r >= GRID || c >= GRID) return null;
    return keyOf(r, c);
  };

  const onPointerDown = (e) => {
    const cellKey = cellFromPoint(e.clientX, e.clientY);
    if (!cellKey) return;

    let colorId = endpointMap[cellKey];
    if (!colorId) colorId = colorAtCell(paths, cellKey);
    if (!colorId) return;

    dragRef.current = { pointerId: e.pointerId, colorId };
    setActiveColor(colorId);
    e.currentTarget.setPointerCapture?.(e.pointerId);

    setPaths((prev) => {
      const next = tryExtend(colorId, cellKey, prev);
      return next || prev;
    });
  };

  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const cellKey = cellFromPoint(e.clientX, e.clientY);
    setDragPreview(cellKey);
    if (!cellKey) return;

    setPaths((prev) => {
      const next = tryExtend(drag.colorId, cellKey, prev);
      if (!next) {
        setInvalidFlash(true);
        window.setTimeout(() => setInvalidFlash(false), 200);
        return prev;
      }
      return next;
    });
  };

  const onPointerUp = (e) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      setActiveColor(null);
      setDragPreview(null);
    }
  };

  const resetAll = () => {
    const initial = {};
    for (const p of PAIRS) initial[p.id] = [];
    setPaths(initial);
    setActiveColor(null);
    setDragPreview(null);
  };

  const completed = PAIRS.filter((p) => {
    const path = paths[p.id] || [];
    if (path.length < 2) return false;
    const hasA = path.includes(keyOf(...p.a));
    const hasB = path.includes(keyOf(...p.b));
    return hasA && hasB;
  }).length;

  return (
    <DevPrototypeShell
      title="חיבור צבעים"
      subtitle="אבטיפוס · חברו זוגות בלי התנגשות"
      headerExtra={
        <button
          type="button"
          onClick={resetAll}
          className="rounded-lg border border-white/25 px-2 py-1 text-[11px] font-bold text-white/85"
        >
          נקה
        </button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-auto p-3 sm:p-4">
        <p className="text-center text-xs font-semibold text-violet-200 sm:text-sm">
          גררו מנקודה לנקודה · {completed}/{PAIRS.length} זוגות מחוברים
        </p>

        <div
          ref={gridRef}
          dir="ltr"
          className={`relative grid aspect-square w-full max-w-[min(100%,420px)] gap-[3px] rounded-2xl border-4 border-yellow-400 bg-slate-950/90 p-2 touch-none sm:gap-1 sm:p-2.5 ${
            invalidFlash ? "ring-4 ring-rose-500 ring-inset" : ""
          }`}
          style={{
            direction: "ltr",
            gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${GRID}, minmax(0, 1fr))`,
            touchAction: "none",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {Array.from({ length: GRID * GRID }, (_, idx) => {
            const r = Math.floor(idx / GRID);
            const c = idx % GRID;
            const cellKey = keyOf(r, c);
            const colorId = colorAtCell(paths, cellKey);
            const pair = PAIRS.find((p) => p.id === colorId);
            const isEndpoint = endpointMap[cellKey];
            const epPair = PAIRS.find(
              (p) => keyOf(...p.a) === cellKey || keyOf(...p.b) === cellKey,
            );
            const previewConflict =
              dragPreview === cellKey &&
              activeColor &&
              !tryExtend(activeColor, cellKey, paths);

            return (
              <div
                key={cellKey}
                className={`relative rounded-md border ${
                  previewConflict
                    ? "border-rose-400 bg-rose-950/40"
                    : "border-slate-600/50 bg-slate-800/70"
                }`}
              >
                {pair && !isEndpoint ? (
                  <div
                    className="absolute inset-[15%] rounded-md"
                    style={{
                      backgroundColor: pair.color,
                      boxShadow: `0 0 10px ${pair.glow}`,
                    }}
                  />
                ) : null}
                {epPair ? (
                  <div
                    className={`absolute inset-0 m-auto h-[58%] w-[58%] rounded-full border-2 border-white/40 ${
                      activeColor === epPair.id ? "scale-110 ring-2 ring-white/60" : ""
                    }`}
                    style={{
                      backgroundColor: epPair.color,
                      boxShadow: `0 0 14px ${epPair.glow}`,
                    }}
                  />
                ) : null}
              </div>
            );
          })}

          <svg className="pointer-events-none absolute inset-2 sm:inset-2.5" viewBox={`0 0 ${GRID} ${GRID}`} preserveAspectRatio="none">
            {PAIRS.map((pair) => {
              const path = paths[pair.id] || [];
              if (path.length < 2) return null;
              const pts = path
                .map((k) => {
                  const [pr, pc] = k.split(",").map(Number);
                  return `${pc + 0.5},${pr + 0.5}`;
                })
                .join(" ");
              return (
                <polyline
                  key={pair.id}
                  points={pts}
                  fill="none"
                  stroke={pair.color}
                  strokeWidth="0.35"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.95"
                />
              );
            })}
          </svg>
        </div>

        <div className="flex flex-wrap justify-center gap-3 text-[11px] font-bold sm:text-xs">
          {PAIRS.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1.5 rounded-lg bg-black/40 px-2 py-1">
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
              {p.id === "red" ? "אדום" : p.id === "blue" ? "כחול" : "ירוק"}
            </span>
          ))}
        </div>
      </div>
    </DevPrototypeShell>
  );
}
