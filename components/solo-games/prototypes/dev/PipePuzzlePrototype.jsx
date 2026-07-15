import { useMemo, useState } from "react";
import DevPrototypeShell from "./DevPrototypeShell.jsx";

const N = 1;
const E = 2;
const S = 4;
const W = 8;

/** @type {Record<string, (rot: number) => number>} */
const MASK_BY_TYPE = {
  straight: (rot) => (rot % 2 === 0 ? N | S : E | W),
  corner: (rot) => [N | E, E | S, S | W, W | N][rot % 4],
  tee: (rot) => [N | E | S, E | S | W, S | W | N, W | N | E][rot % 4],
  start: () => E,
  end: () => W,
  empty: () => 0,
};

/** @typedef {{ type: string, rot: number, fixed?: boolean }} PipeCell */

/** @returns {PipeCell[][]} */
function createInitialGrid() {
  /** @type {PipeCell[][]} */
  const g = Array.from({ length: 6 }, () =>
    Array.from({ length: 6 }, () => ({ type: "straight", rot: Math.floor(Math.random() * 4) })),
  );

  g[0][0] = { type: "start", rot: 0, fixed: true };
  g[5][5] = { type: "end", rot: 0, fixed: true };

  const layout = [
    ["straight", "corner", "tee", "straight", "corner"],
    ["corner", "tee", "straight", "corner", "straight"],
    ["straight", "straight", "corner", "tee", "straight"],
    ["tee", "corner", "straight", "straight", "corner"],
    ["corner", "straight", "tee", "corner", "straight"],
  ];

  for (let r = 0; r < 5; r += 1) {
    for (let c = 1; c < 6; c += 1) {
      g[r][c] = { type: layout[r][c - 1], rot: Math.floor(Math.random() * 4) };
    }
  }

  g[5][0] = { type: "corner", rot: 1 };
  g[5][1] = { type: "straight", rot: 1 };
  g[5][2] = { type: "tee", rot: 2 };
  g[5][3] = { type: "corner", rot: 2 };
  g[5][4] = { type: "straight", rot: 1 };

  return g;
}

/**
 * @param {PipeCell[][]} grid
 * @param {number} r
 * @param {number} c
 */
function cellMask(grid, r, c) {
  const cell = grid[r]?.[c];
  if (!cell) return 0;
  return MASK_BY_TYPE[cell.type]?.(cell.rot) ?? 0;
}

const NEIGHBORS = [
  { dr: -1, dc: 0, out: N, inn: S },
  { dr: 0, dc: 1, out: E, inn: W },
  { dr: 1, dc: 0, out: S, inn: N },
  { dr: 0, dc: -1, out: W, inn: E },
];

/**
 * @param {PipeCell[][]} grid
 */
function simulateWater(grid) {
  const size = grid.length;
  const visited = new Set();
  const order = [];
  const queue = [[0, 0]];
  visited.add("0,0");

  while (queue.length) {
    const [r, c] = queue.shift();
    order.push([r, c]);
    const mask = cellMask(grid, r, c);

    for (const { dr, dc, out, inn } of NEIGHBORS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
      const key = `${nr},${nc}`;
      if (visited.has(key)) continue;
      const nMask = cellMask(grid, nr, nc);
      if ((mask & out) && (nMask & inn)) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }

  const reachedEnd = visited.has(`${size - 1},${size - 1}`);
  return { visited, order, reachedEnd };
}

/** @param {number} mask */
function pipeSvgPaths(mask) {
  const cx = 50;
  const cy = 50;
  const paths = [];
  if (mask & N) paths.push(`M ${cx} ${cy} L ${cx} 8`);
  if (mask & E) paths.push(`M ${cx} ${cy} L 92 ${cy}`);
  if (mask & S) paths.push(`M ${cx} ${cy} L ${cx} 92`);
  if (mask & W) paths.push(`M ${cx} ${cy} L 8 ${cy}`);
  return paths;
}

export default function PipePuzzlePrototype() {
  const [grid, setGrid] = useState(() => createInitialGrid());
  const [flow, setFlow] = useState(null);
  const [status, setStatus] = useState("");

  const water = useMemo(() => (flow ? simulateWater(grid) : null), [flow, grid]);

  const rotateCell = (r, c) => {
    setFlow(null);
    setStatus("");
    setGrid((prev) => {
      const cell = prev[r][c];
      if (!cell || cell.fixed || cell.type === "empty") return prev;
      const next = prev.map((row) => row.map((x) => ({ ...x })));
      next[r][c].rot = (next[r][c].rot + 1) % 4;
      return next;
    });
  };

  const checkWater = () => {
    const result = simulateWater(grid);
    setFlow(result.order.map(([r, c]) => `${r},${c}`));
    setStatus(result.reachedEnd ? "המים זורמים! 💧" : "אין חיבור מלא - סובבו עוד צינורות");
  };

  const resetPuzzle = () => {
    setGrid(createInitialGrid());
    setFlow(null);
    setStatus("");
  };

  return (
    <DevPrototypeShell
      title="צינורות מים"
      subtitle="אבטיפוס · לחיצה לסיבוב · בדיקת זרימה"
      headerExtra={
        <button
          type="button"
          onClick={resetPuzzle}
          className="rounded-lg border border-white/25 px-2 py-1 text-[11px] font-bold text-white/85"
        >
          איפוס
        </button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-auto p-3 sm:p-4">
        <p className="text-center text-xs font-semibold text-sky-200 sm:text-sm">
          🚰 התחלה ↖ · 🏁 סיום ↘ · לחצו על צינור לסיבוב
        </p>

        <div
          dir="ltr"
          className="grid aspect-square w-full max-w-[min(100%,420px)] gap-1 rounded-2xl border-4 border-yellow-400 bg-slate-950/90 p-2 shadow-[0_0_32px_rgba(250,204,21,0.12)] sm:gap-1.5 sm:p-2.5"
          style={{
            direction: "ltr",
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            gridTemplateRows: "repeat(6, minmax(0, 1fr))",
          }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const key = `${r},${c}`;
              const filled = flow?.includes(key);
              const mask = cellMask(grid, r, c);
              const isStart = cell.type === "start";
              const isEnd = cell.type === "end";

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => rotateCell(r, c)}
                  disabled={cell.fixed}
                  className={`relative flex aspect-square items-center justify-center rounded-lg border-2 transition-colors ${
                    filled
                      ? "border-sky-300 bg-sky-500/35"
                      : "border-slate-600/60 bg-slate-800/80 hover:bg-slate-700/80"
                  } ${cell.fixed ? "cursor-default" : "cursor-pointer active:scale-95"}`}
                  style={{ touchAction: "manipulation" }}
                  aria-label={`צינור ${r + 1},${c + 1}`}
                >
                  {isStart ? (
                    <span className="text-lg sm:text-xl">🚰</span>
                  ) : isEnd ? (
                    <span className="text-lg sm:text-xl">🏁</span>
                  ) : (
                    <svg viewBox="0 0 100 100" className="h-[82%] w-[82%]">
                      {pipeSvgPaths(mask).map((d, i) => (
                        <path
                          key={i}
                          d={d}
                          stroke={filled ? "#38bdf8" : "#94a3b8"}
                          strokeWidth="14"
                          strokeLinecap="round"
                          fill="none"
                        />
                      ))}
                    </svg>
                  )}
                </button>
              );
            }),
          )}
        </div>

        <button
          type="button"
          onClick={checkWater}
          className="min-h-[48px] rounded-xl bg-sky-500 px-8 py-2.5 text-base font-bold text-white shadow-lg active:scale-[0.98]"
        >
          בדוק מים 💧
        </button>

        {status ? (
          <p
            className={`text-center text-sm font-bold ${status.includes("זורמים") ? "text-emerald-300" : "text-amber-200"}`}
          >
            {status}
          </p>
        ) : null}
      </div>
    </DevPrototypeShell>
  );
}
