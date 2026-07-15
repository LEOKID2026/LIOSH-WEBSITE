import { useRef, useState } from "react";
import DevPrototypeShell from "./DevPrototypeShell.jsx";

/**
 * @typedef {{ id: string, name: string, color: string, w: number, h: number, clip: string, x: number, y: number, rot: number }} Piece
 */

const INITIAL_PIECES = /** @type {Piece[]} */ ([
  {
    id: "tri1",
    name: "משולש גדול",
    color: "#f87171",
    w: 90,
    h: 90,
    clip: "polygon(50% 0%, 0% 100%, 100% 100%)",
    x: 12,
    y: 78,
    rot: 0,
  },
  {
    id: "tri2",
    name: "משולש בינוני",
    color: "#60a5fa",
    w: 64,
    h: 64,
    clip: "polygon(50% 0%, 0% 100%, 100% 100%)",
    x: 28,
    y: 78,
    rot: 180,
  },
  {
    id: "tri3",
    name: "משולש קטן",
    color: "#4ade80",
    w: 46,
    h: 46,
    clip: "polygon(50% 0%, 0% 100%, 100% 100%)",
    x: 44,
    y: 78,
    rot: 90,
  },
  {
    id: "sq",
    name: "ריבוע",
    color: "#fbbf24",
    w: 46,
    h: 46,
    clip: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
    x: 58,
    y: 78,
    rot: 0,
  },
  {
    id: "para",
    name: "מקבילית",
    color: "#c084fc",
    w: 70,
    h: 40,
    clip: "polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)",
    x: 72,
    y: 78,
    rot: 0,
  },
  {
    id: "tri4",
    name: "משולש 2",
    color: "#fb923c",
    w: 46,
    h: 46,
    clip: "polygon(50% 0%, 0% 100%, 100% 100%)",
    x: 86,
    y: 78,
    rot: 270,
  },
]);

export default function TangramPrototype() {
  const boardRef = useRef(null);
  const dragRef = useRef(null);
  const lastTapRef = useRef(0);

  const [pieces, setPieces] = useState(INITIAL_PIECES);
  const [selected, setSelected] = useState(null);

  const rotatePiece = (id) => {
    setPieces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rot: (p.rot + 45) % 360 } : p)),
    );
  };

  const resetPieces = () => {
    setPieces(INITIAL_PIECES.map((p) => ({ ...p })));
    setSelected(null);
  };

  const onPointerDown = (piece, e) => {
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    dragRef.current = {
      id: piece.id,
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left - (piece.x / 100) * rect.width,
      offsetY: e.clientY - rect.top - (piece.y / 100) * rect.height,
    };
    setSelected(piece.id);
    board.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const x = ((e.clientX - rect.left - d.offsetX) / rect.width) * 100;
    const y = ((e.clientY - rect.top - d.offsetY) / rect.height) * 100;
    setPieces((prev) =>
      prev.map((p) =>
        p.id === d.id ? { ...p, x: Math.max(2, Math.min(92, x)), y: Math.max(8, Math.min(92, y)) } : p,
      ),
    );
  };

  const onPointerUp = (e) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      boardRef.current?.releasePointerCapture?.(e.pointerId);
      dragRef.current = null;
    }
  };

  const onPieceClick = (id) => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) rotatePiece(id);
    lastTapRef.current = now;
  };

  return (
    <DevPrototypeShell
      title="טנגרם"
      subtitle="אבטיפוס · גררו חלקים · לחיצה כפולה לסיבוב"
      headerExtra={
        <button
          type="button"
          onClick={resetPieces}
          className="rounded-lg border border-white/25 px-2 py-1 text-[11px] font-bold text-white/85"
        >
          איפוס
        </button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2 p-2 sm:p-4">
        <p className="text-center text-xs font-semibold text-emerald-200 sm:text-sm">
          מלאו את צורת היעד · לחיצה כפולה = סיבוב 45°
        </p>

        <div
          ref={boardRef}
          className="relative aspect-[4/5] w-full max-w-[min(100%,400px)] touch-none overflow-hidden rounded-2xl border-4 border-yellow-400 bg-slate-950/90 shadow-[0_0_32px_rgba(250,204,21,0.12)]"
          style={{ touchAction: "none" }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* target silhouette - simple cat/house hybrid outline */}
          <svg
            viewBox="0 0 200 240"
            className="pointer-events-none absolute inset-[8%] h-[84%] w-[84%] opacity-40"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              d="M100 20 L170 90 L150 220 L50 220 L30 90 Z"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="3"
              strokeDasharray="8 6"
            />
            <path
              d="M55 90 L75 50 L95 90 M105 90 L125 50 L145 90"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="3"
              strokeDasharray="6 5"
            />
            <text x="100" y="130" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="bold">
              יעד
            </text>
          </svg>

          {pieces.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onPointerDown={(e) => onPointerDown(p, e)}
              onClick={() => onPieceClick(p.id)}
              className={`absolute cursor-grab shadow-lg active:cursor-grabbing ${
                selected === p.id ? "ring-2 ring-sky-300 ring-offset-1 ring-offset-slate-900" : ""
              }`}
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.w,
                height: p.h,
                transform: `translate(-50%, -50%) rotate(${p.rot}deg)`,
                backgroundColor: p.color,
                clipPath: p.clip,
                opacity: 0.92,
              }}
            />
          ))}
        </div>

        {selected ? (
          <button
            type="button"
            onClick={() => rotatePiece(selected)}
            className="min-h-[44px] rounded-xl border-2 border-sky-400 bg-sky-500/25 px-5 py-2 text-sm font-bold text-sky-100"
          >
            ↻ סובב חלק נבחר
          </button>
        ) : null}

        <p className="text-center text-[10px] text-white/45 sm:text-xs">
          אין בדיקת התאמה מושלמת - רק תחושת גרירה ו-layout
        </p>
      </div>
    </DevPrototypeShell>
  );
}
