import { useCallback, useMemo, useRef, useState } from "react";
import DevPrototypeShell from "./DevPrototypeShell.jsx";

const SIZE = 6;
const N = 1;
const E = 2;
const S = 4;
const W = 8;

const START = { r: 0, c: 2 };
const GOAL = { r: 5, c: 2 };

/** @type {Record<string, (rot: number) => number>} */
const MASK = {
  straight: (rot) => (rot % 2 === 0 ? N | S : E | W),
  corner: (rot) => [N | E, E | S, S | W, W | N][rot % 4],
  ramp: (rot) => [N | S, E | S, S | W, W | N][rot % 4],
  goal: () => N | E | S | W,
};

const PALETTE = [
  { type: "straight", label: "ישר", emoji: "➖", count: 5 },
  { type: "corner", label: "פינה", emoji: "↪️", count: 4 },
  { type: "ramp", label: "ירידה", emoji: "↘️", count: 3 },
  { type: "goal", label: "יעד", emoji: "🎯", count: 1 },
];

/** @typedef {{ type: string, rot: number, id: string } | null} Cell */

/**
 * @param {Cell[][]} grid
 * @param {number} r
 * @param {number} c
 */
function cellMask(grid, r, c) {
  if (r === START.r && c === START.c) return S;
  const cell = grid[r]?.[c];
  if (!cell) return 0;
  return MASK[cell.type]?.(cell.rot) ?? 0;
}

const NEIGHBORS = [
  { dr: -1, dc: 0, out: N, inn: S },
  { dr: 0, dc: 1, out: E, inn: W },
  { dr: 1, dc: 0, out: S, inn: N },
  { dr: 0, dc: -1, out: W, inn: E },
];

/**
 * @param {Cell[][]} grid
 */
function simulatePath(grid) {
  const path = [{ ...START }];
  const visited = new Set([`${START.r},${START.c}`]);
  let r = START.r;
  let c = START.c;
  let safety = 40;

  while (safety-- > 0) {
    if (r === GOAL.r && c === GOAL.c) return { path, reached: true };
    const mask = cellMask(grid, r, c);
    let moved = false;

    for (const { dr, dc, out, inn } of NEIGHBORS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= SIZE || nc >= SIZE) continue;
      const key = `${nr},${nc}`;
      if (visited.has(key)) continue;
      const nMask = cellMask(grid, nr, nc);
      if ((mask & out) && (nMask & inn)) {
        r = nr;
        c = nc;
        path.push({ r, c });
        visited.add(key);
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }

  return { path, reached: r === GOAL.r && c === GOAL.c };
}

/** @returns {Cell[][]} */
function emptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

/** @param {number} mask */
function trackPaths(mask, type) {
  const cx = 50;
  const cy = 50;
  const paths = [];
  if (mask & N) paths.push(`M ${cx} ${cy} L ${cx} 8`);
  if (mask & E) paths.push(`M ${cx} ${cy} L 92 ${cy}`);
  if (mask & S) paths.push(`M ${cx} ${cy} L ${cx} 92`);
  if (mask & W) paths.push(`M ${cx} ${cy} L 8 ${cy}`);
  if (type === "ramp") {
    paths.push(`M 20 20 L 80 80`);
  }
  return paths;
}

export default function MarbleRunPrototype() {
  const idRef = useRef(0);
  const dragRef = useRef(null);

  const [grid, setGrid] = useState(() => emptyGrid());
  const [stock, setStock] = useState(() =>
    Object.fromEntries(PALETTE.map((p) => [p.type, p.count])),
  );
  const [selected, setSelected] = useState(null);
  const [ballPath, setBallPath] = useState(null);
  const [ballStep, setBallStep] = useState(-1);
  const [status, setStatus] = useState("");
  const [running, setRunning] = useState(false);

  const pathSet = useMemo(
    () => new Set(ballPath?.map((p) => `${p.r},${p.c}`) ?? []),
    [ballPath],
  );

  const resetBoard = () => {
    setGrid(emptyGrid());
    setStock(Object.fromEntries(PALETTE.map((p) => [p.type, p.count])));
    setSelected(null);
    setBallPath(null);
    setBallStep(-1);
    setStatus("");
    setRunning(false);
  };

  const placePiece = (r, c, type) => {
    if (running) return;
    if (r === START.r && c === START.c) return;
    if (grid[r][c]) return;
    if ((stock[type] ?? 0) <= 0) return;
    if (type === "goal" && (r !== GOAL.r || c !== GOAL.c)) {
      setStatus("יעד - רק בתא הסיום 🎯");
      return;
    }

    idRef.current += 1;
    setGrid((prev) => {
      const next = prev.map((row) => row.map((x) => (x ? { ...x } : null)));
      next[r][c] = { type, rot: 0, id: String(idRef.current) };
      return next;
    });
    setStock((s) => ({ ...s, [type]: s[type] - 1 }));
    setBallPath(null);
    setBallStep(-1);
    setStatus("");
  };

  const rotateCell = (r, c) => {
    if (running) return;
    const cell = grid[r][c];
    if (!cell || cell.type === "goal") return;
    setGrid((prev) => {
      const next = prev.map((row) => row.map((x) => (x ? { ...x } : null)));
      next[r][c] = { ...cell, rot: (cell.rot + 1) % 4 };
      return next;
    });
    setBallPath(null);
    setBallStep(-1);
  };

  const onCellClick = (r, c) => {
    if (running) return;
    if (grid[r][c]) {
      rotateCell(r, c);
      return;
    }
    if (selected) placePiece(r, c, selected);
  };

  const runMarble = useCallback(() => {
    const result = simulatePath(grid);
    setBallPath(result.path);
    setBallStep(0);
    setRunning(true);
    setStatus(result.reached ? "…הכדור רץ" : "…הכדור נעצר");

    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      setBallStep(step);
      if (step >= result.path.length - 1) {
        window.clearInterval(timer);
        setRunning(false);
        setStatus(result.reached ? "הגעתם ליעד! 🎉" : "אין מסלול מלא - נסו שוב");
      }
    }, 280);
  }, [grid]);

  const onPalettePointerDown = (type) => {
    if (running || (stock[type] ?? 0) <= 0) return;
    setSelected(type);
    dragRef.current = { type };
  };

  const onGridPointerUp = (r, c) => {
    const d = dragRef.current;
    if (d && !grid[r][c]) placePiece(r, c, d.type);
    dragRef.current = null;
  };

  return (
    <DevPrototypeShell
      title="מסילת כדור"
      subtitle="אבטיפוס · בחרו חלק · הניחו · הפעילו"
      headerExtra={
        <button
          type="button"
          onClick={resetBoard}
          className="rounded-lg border border-white/25 px-2 py-1 text-[11px] font-bold text-white/85"
        >
          איפוס
        </button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-auto p-3 sm:gap-3 sm:p-4">
        <p className="text-center text-xs font-semibold text-amber-200 sm:text-sm">
          🔴 התחלה למעלה · 🎯 יעד למטה · לחיצה על חלק = סיבוב
        </p>

        <div
          dir="ltr"
          className="grid aspect-square w-full max-w-[min(100%,380px)] gap-1 rounded-2xl border-4 border-yellow-400 bg-slate-950/90 p-2 sm:gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${SIZE}, 1fr)`,
          }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const key = `${r},${c}`;
              const isStart = r === START.r && c === START.c;
              const isGoal = r === GOAL.r && c === GOAL.c;
              const onPath = pathSet.has(key);
              const ballHere = ballPath && ballStep >= 0 && ballPath[ballStep]?.r === r && ballPath[ballStep]?.c === c;
              const mask = cell ? cellMask(grid, r, c) : isStart ? S : 0;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onCellClick(r, c)}
                  onPointerUp={() => onGridPointerUp(r, c)}
                  disabled={running && !cell && !isStart}
                  className={`relative flex aspect-square items-center justify-center rounded-lg border-2 transition-colors ${
                    ballHere
                      ? "border-amber-300 bg-amber-500/40"
                      : onPath
                        ? "border-orange-400/50 bg-orange-500/15"
                        : "border-slate-600/60 bg-slate-800/80 hover:bg-slate-700/70"
                  } active:scale-95`}
                  style={{ touchAction: "manipulation" }}
                >
                  {isStart ? (
                    <span className="text-base sm:text-lg">🔴</span>
                  ) : isGoal && !cell ? (
                    <span className="text-base opacity-50 sm:text-lg">🎯</span>
                  ) : cell ? (
                    <>
                      <svg viewBox="0 0 100 100" className="h-[78%] w-[78%]">
                        {trackPaths(mask, cell.type).map((d, i) => (
                          <path
                            key={i}
                            d={d}
                            stroke={cell.type === "goal" ? "#4ade80" : "#fbbf24"}
                            strokeWidth={cell.type === "ramp" && i === trackPaths(mask, cell.type).length - 1 ? 6 : 12}
                            strokeLinecap="round"
                            fill="none"
                            opacity={cell.type === "ramp" && i === trackPaths(mask, cell.type).length - 1 ? 0.85 : 1}
                          />
                        ))}
                      </svg>
                      {cell.type === "goal" ? (
                        <span className="absolute text-xs sm:text-sm">🎯</span>
                      ) : null}
                    </>
                  ) : null}
                  {ballHere ? (
                    <span className="absolute text-lg drop-shadow sm:text-xl">⚪</span>
                  ) : null}
                </button>
              );
            }),
          )}
        </div>

        <div className="flex w-full max-w-[min(100%,380px)] flex-wrap justify-center gap-2">
          {PALETTE.map((p) => (
            <button
              key={p.type}
              type="button"
              disabled={(stock[p.type] ?? 0) <= 0 || running}
              onClick={() => setSelected(p.type)}
              onPointerDown={() => onPalettePointerDown(p.type)}
              className={`flex min-h-[52px] min-w-[72px] flex-col items-center justify-center rounded-xl border-2 px-2 py-1.5 text-xs font-bold transition ${
                selected === p.type
                  ? "border-sky-300 bg-sky-500/30 text-white"
                  : "border-slate-600 bg-slate-800/90 text-white/85"
              } disabled:opacity-35`}
            >
              <span className="text-lg">{p.emoji}</span>
              <span>{p.label}</span>
              <span className="text-[10px] text-white/55">×{stock[p.type]}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={runMarble}
          disabled={running}
          className="min-h-[48px] rounded-xl bg-amber-500 px-8 py-2.5 text-base font-bold text-slate-900 shadow-lg active:scale-[0.98] disabled:opacity-50"
        >
          הפעל ⚪
        </button>

        {status ? (
          <p
            className={`text-center text-sm font-bold ${
              status.includes("יעד") ? "text-emerald-300" : "text-amber-200"
            }`}
          >
            {status}
          </p>
        ) : null}
      </div>
    </DevPrototypeShell>
  );
}
