import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DevPrototypeShell from "./DevPrototypeShell.jsx";

/** @typedef {{ id: string, emoji: string, weight: number, label: string }} ItemDef */
/** @typedef {{ id: string, itemId: string }} PlacedItem */

const ITEMS = /** @type {ItemDef[]} */ ([
  { id: "apple", emoji: "🍎", weight: 2, label: "2" },
  { id: "orange", emoji: "🍊", weight: 3, label: "3" },
  { id: "star", emoji: "⭐", weight: 1, label: "1" },
  { id: "rock", emoji: "🪨", weight: 5, label: "5" },
  { id: "bear", emoji: "🧸", weight: 2, label: "2" },
  { id: "ball", emoji: "⚽", weight: 4, label: "4" },
  { id: "feather", emoji: "🪶", weight: 1, label: "1" },
  { id: "book", emoji: "📚", weight: 3, label: "3" },
]);

const BALANCE_TOLERANCE = 0.5;

export default function BalanceScalePrototype() {
  const idRef = useRef(0);
  const dragRef = useRef(null);

  const [pool, setPool] = useState(() => ITEMS.map((i) => i.id));
  const [left, setLeft] = useState(/** @type {PlacedItem[]} */ ([]));
  const [right, setRight] = useState(/** @type {PlacedItem[]} */ ([]));
  const [showWeights, setShowWeights] = useState(true);
  const [balancedFlash, setBalancedFlash] = useState(false);
  const [dragOver, setDragOver] = useState(null);

  const itemMap = useMemo(() => Object.fromEntries(ITEMS.map((i) => [i.id, i])), []);

  const leftWeight = left.reduce((s, p) => s + (itemMap[p.itemId]?.weight ?? 0), 0);
  const rightWeight = right.reduce((s, p) => s + (itemMap[p.itemId]?.weight ?? 0), 0);
  const diff = rightWeight - leftWeight;
  const tilt = Math.max(-18, Math.min(18, diff * 4));
  const isBalanced = left.length > 0 && right.length > 0 && Math.abs(diff) <= BALANCE_TOLERANCE;

  useEffect(() => {
    if (!isBalanced) return;
    setBalancedFlash(true);
    const t = window.setTimeout(() => setBalancedFlash(false), 2200);
    return () => window.clearTimeout(t);
  }, [isBalanced, leftWeight, rightWeight]);

  const reset = () => {
    setPool(ITEMS.map((i) => i.id));
    setLeft([]);
    setRight([]);
    setBalancedFlash(false);
  };

  const removeFromSide = (side, placedId) => {
    const setter = side === "left" ? setLeft : setRight;
    setter((prev) => {
      const found = prev.find((p) => p.id === placedId);
      if (found) setPool((poolPrev) => [...poolPrev, found.itemId]);
      return prev.filter((p) => p.id !== placedId);
    });
  };

  const placeOnSide = useCallback((side, itemId) => {
    idRef.current += 1;
    const placed = { id: String(idRef.current), itemId };
    setPool((p) => p.filter((id) => id !== itemId));
    if (side === "left") setLeft((l) => [...l, placed]);
    else setRight((r) => [...r, placed]);
  }, []);

  const onPoolPointerDown = (itemId, e) => {
    dragRef.current = { itemId, from: "pool" };
    e.preventDefault();
  };

  const onSideDrop = (side) => {
    const d = dragRef.current;
    if (!d) return;
    if (d.from === "pool") placeOnSide(side, d.itemId);
    else if (d.from !== side) {
      const setterFrom = d.from === "left" ? setLeft : setRight;
      setterFrom((prev) => {
        const found = prev.find((p) => p.id === d.placedId);
        if (!found) return prev;
        placeOnSide(side, found.itemId);
        return prev.filter((p) => p.id !== d.placedId);
      });
    }
    dragRef.current = null;
    setDragOver(null);
  };

  const renderSideItems = (items, side) =>
    items.map((p) => {
      const item = itemMap[p.itemId];
      if (!item) return null;
      return (
        <button
          key={p.id}
          type="button"
          onPointerDown={(e) => {
            dragRef.current = { from: side, placedId: p.id, itemId: p.itemId };
            e.preventDefault();
          }}
          onClick={() => removeFromSide(side, p.id)}
          className="flex h-11 w-11 flex-col items-center justify-center rounded-xl border-2 border-white/20 bg-slate-700/90 text-lg shadow-md active:scale-95 sm:h-12 sm:w-12"
          title="לחצו להחזרה למגש"
        >
          {item.emoji}
          {showWeights ? (
            <span className="text-[9px] font-bold text-amber-200">{item.label}</span>
          ) : null}
        </button>
      );
    });

  return (
    <DevPrototypeShell
      title="מאזניים"
      subtitle="אבטיפוס · גררו חפצים · אזנו את המאזניים"
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
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-auto p-3 sm:gap-3 sm:p-4">
        <label className="flex items-center gap-2 text-xs font-semibold text-white/70">
          <input
            type="checkbox"
            checked={showWeights}
            onChange={(e) => setShowWeights(e.target.checked)}
            className="h-4 w-4"
          />
          הצג משקלים (לבדיקה)
        </label>

        <div className="relative flex w-full max-w-[400px] flex-1 flex-col items-center justify-center">
          {balancedFlash ? (
            <div className="absolute top-2 z-20 rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-extrabold text-white shadow-lg">
              מאוזן! ⚖️🎉
            </div>
          ) : null}

          <div
            className="relative w-full transition-transform duration-500 ease-out"
            style={{ transform: `rotate(${tilt}deg)` }}
          >
            {/* beam */}
            <div className="mx-auto h-3 w-[88%] rounded-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 shadow-md" />
            {/* fulcrum */}
            <div className="mx-auto -mt-1 h-0 w-0 border-x-[20px] border-b-[28px] border-x-transparent border-b-slate-400" />

            <div className="mt-1 flex justify-between gap-2 px-1">
              {/* left pan */}
              <div
                data-side="left"
                className={`flex min-h-[100px] flex-1 flex-col items-center gap-2 rounded-2xl border-4 p-2 transition-colors ${
                  dragOver === "left" ? "border-sky-300 bg-sky-500/20" : "border-yellow-400/80 bg-slate-800/60"
                }`}
                onPointerUp={() => onSideDrop("left")}
                onPointerEnter={() => dragRef.current && setDragOver("left")}
                onPointerLeave={() => setDragOver(null)}
              >
                <span className="text-[10px] font-bold text-white/50">שמאל · {leftWeight}</span>
                <div className="flex flex-wrap justify-center gap-1.5">{renderSideItems(left, "left")}</div>
              </div>

              {/* right pan */}
              <div
                data-side="right"
                className={`flex min-h-[100px] flex-1 flex-col items-center gap-2 rounded-2xl border-4 p-2 transition-colors ${
                  dragOver === "right" ? "border-sky-300 bg-sky-500/20" : "border-blue-400/80 bg-slate-800/60"
                }`}
                onPointerUp={() => onSideDrop("right")}
                onPointerEnter={() => dragRef.current && setDragOver("right")}
                onPointerLeave={() => setDragOver(null)}
              >
                <span className="text-[10px] font-bold text-white/50">ימין · {rightWeight}</span>
                <div className="flex flex-wrap justify-center gap-1.5">{renderSideItems(right, "right")}</div>
              </div>
            </div>
          </div>

          <p className="mt-3 text-center text-xs font-semibold text-white/55">
            {Math.abs(diff) < 0.01
              ? "שוויון!"
              : diff > 0
                ? "הצד ימין כבד יותר ↘"
                : "הצד שמאל כבד יותר ↙"}
          </p>
        </div>

        {/* item tray */}
        <div className="w-full max-w-[400px] shrink-0 rounded-2xl border-4 border-yellow-400 bg-slate-950/80 p-3">
          <p className="mb-2 text-center text-xs font-bold text-amber-200">מגש חפצים - גררו לצד</p>
          <div className="flex flex-wrap justify-center gap-2">
            {pool.map((itemId) => {
              const item = itemMap[itemId];
              if (!item) return null;
              return (
                <button
                  key={itemId}
                  type="button"
                  onPointerDown={(e) => onPoolPointerDown(itemId, e)}
                  onPointerUp={(e) => {
                    const el = document.elementFromPoint(e.clientX, e.clientY);
                    if (el?.closest?.("[data-side=left]")) onSideDrop("left");
                    else if (el?.closest?.("[data-side=right]")) onSideDrop("right");
                  }}
                  className="flex h-14 w-14 flex-col items-center justify-center rounded-xl border-2 border-white/25 bg-slate-700 text-xl shadow active:scale-95 sm:h-16 sm:w-16"
                >
                  {item.emoji}
                  {showWeights ? (
                    <span className="text-[10px] font-bold text-amber-200">{item.label}</span>
                  ) : null}
                </button>
              );
            })}
            {!pool.length ? (
              <p className="py-2 text-xs text-white/45">כל החפצים על המאזניים</p>
            ) : null}
          </div>
          <p className="mt-2 text-center text-[10px] text-white/45">
            לחצו על חפץ במאזניים להחזרה · או גררו מהמגש
          </p>
        </div>
      </div>
    </DevPrototypeShell>
  );
}
