"use client";

import { useRouter } from "next/router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  fourLineColumnPlayable,
  OV2_FOURLINE_COLS,
  OV2_FOURLINE_ROWS,
  parseFourLineCells,
} from "../../../lib/arcade/fourline/fourlineClientLegality";
import { useFourlineSession } from "../../../hooks/arcade/useFourlineSession";
import { useArcadeRoomExit } from "../../../hooks/arcade/useArcadeRoomExit";
import ArcadeGameSocialDock from "../club/ArcadeGameSocialDock.jsx";
import StudentAdSlot from "../../student/StudentAdSlot.jsx";

const DROP_MS = 155;
const WIN_FREEZE_MS = 280;
const MOVE_PULSE_MS = 220;

const GAME_TITLE = "ארבע בשורה";

/**
 * @param {{ onLeave: () => void, disabled?: boolean, busy?: boolean }} props
 */
function FourlineLeaveRow({ onLeave, disabled = false, busy = false }) {
  return (
    <div className="mt-3 flex w-full shrink-0 justify-center px-1 pb-1 sm:mt-4">
      <button
        type="button"
        onClick={onLeave}
        disabled={disabled || busy}
        className="min-h-[2.5rem] w-full max-w-xs rounded-xl border border-rose-500/35 bg-rose-950/35 px-4 py-2 text-sm font-extrabold text-rose-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-rose-950/55 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-sm sm:text-base"
      >
        {busy ? "יוצא…" : "עזוב"}
      </button>
    </div>
  );
}

/** מסגרת אחידה — גובה נמוך יותר (ציר Y), רוחב קומפקטי (ציר X) */
const HUD_CONTROL_H = "h-9";
const HUD_CHIP =
  "rounded-lg border border-white/20 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-white/[0.11] active:scale-[0.97]";
const HUD_BTN_BASE = `flex ${HUD_CONTROL_H} shrink-0 items-center justify-center ${HUD_CHIP}`;
const HUD_BTN_SQUARE = `${HUD_BTN_BASE} w-9`;

/**
 * סרגל עליון בסגנון OV2: חזרה, שם משחק בעברית, מטבעות, עזרה
 * @param {{ onBack: () => void, balance: number | null, onOpenHelp: () => void }} props
 */
function FourlineOv2Hud({ onBack, balance, onOpenHelp }) {
  return (
    <header
      dir="rtl"
      className="relative z-20 flex w-full shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.14] bg-gradient-to-b from-zinc-700/90 via-zinc-900/95 to-black/90 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_28px_rgba(0,0,0,0.45)] sm:gap-2 sm:px-2.5 sm:py-2"
    >
      <button
        type="button"
        onClick={onBack}
        className={`${HUD_BTN_BASE} min-w-[3.75rem] px-2 sm:min-w-[4rem]`}
        aria-label="חזרה"
        title="חזרה"
      >
        <span className="text-xs font-extrabold leading-none tracking-wide text-white sm:text-sm">
          חזרה
        </span>
      </button>

      <div className="min-w-0 flex-1 px-0.5 text-center">
        <h1 className="truncate text-base font-extrabold leading-tight text-white drop-shadow-sm sm:text-lg lg:text-xl">
          {GAME_TITLE}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <div
          className={`flex ${HUD_CONTROL_H} min-w-[4.75rem] max-w-[9rem] shrink-0 items-center gap-1 rounded-lg border border-amber-500/35 bg-black/55 px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:min-w-[5rem] sm:px-2.5`}
          title="יתרת מטבעות"
        >
          <img
            src="/images/coin.png"
            alt=""
            className="h-6 w-6 shrink-0 object-contain sm:h-7 sm:w-7"
          />
          <span className="min-w-0 truncate font-mono text-sm font-bold tabular-nums leading-none text-amber-100 sm:text-base">
            {balance === null ? "…" : balance}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenHelp}
          className={HUD_BTN_SQUARE}
          aria-label="איך משחקים"
          title="איך משחקים"
        >
          <span
            className="font-serif text-[17px] font-semibold italic leading-none text-zinc-50 sm:text-[19px]"
            aria-hidden
          >
            i
          </span>
        </button>
      </div>
    </header>
  );
}

/**
 * @param {{ open: boolean, onClose: () => void }} props
 */
function FourlineHowToModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-3 pb-8 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fourline-howto-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="סגור"
        onClick={onClose}
      />
      <div
        dir="rtl"
        className="relative z-[1] max-h-[min(85vh,540px)] w-full max-w-md overflow-y-auto rounded-2xl border border-white/15 bg-gradient-to-b from-zinc-800 to-zinc-950 p-4 text-right shadow-2xl sm:p-5"
      >
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h2 id="fourline-howto-title" className="text-lg font-bold text-white">
              איך משחקים
            </h2>
            <p className="mt-0.5 text-xs text-amber-300/90">{GAME_TITLE}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-white/20 px-2.5 py-1 text-sm text-zinc-200 hover:bg-white/10"
          >
            סגור
          </button>
        </div>
        <ul className="list-disc space-y-2 pr-5 text-sm leading-relaxed text-zinc-200">
          <li>כל שחקן בוחר עמודה; הדיסקית נופלת לתחתית העמודה.</li>
          <li>מטרת המשחק: לחבר ארבע דיסקיות בשורה - אופקית, אנכית או אלכסון.</li>
          <li>כחול מתחיל; אחרי כל מהלך התור עובר לזהב והחזרה.</li>
          <li>אם הלוח מתמלא ואין ארבע בשורה - תיקו.</li>
        </ul>
      </div>
    </div>
  );
}

/** @param {(null|0|1)[]} cells @param {number} row @param {number} col @param {0|1} seat */
function fourLineWinningIndicesFromLastMove(cells, row, col, seat) {
  if (!Number.isInteger(row) || !Number.isInteger(col)) return [];
  const idx = row * OV2_FOURLINE_COLS + col;
  if (cells[idx] !== seat) return [];
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (const [dr, dc] of dirs) {
    const line = [];
    let r = row;
    let c = col;
    while (
      r >= 0 &&
      r < OV2_FOURLINE_ROWS &&
      c >= 0 &&
      c < OV2_FOURLINE_COLS &&
      cells[r * OV2_FOURLINE_COLS + c] === seat
    ) {
      line.push(r * OV2_FOURLINE_COLS + c);
      r -= dr;
      c -= dc;
    }
    r = row + dr;
    c = col + dc;
    while (
      r >= 0 &&
      r < OV2_FOURLINE_ROWS &&
      c >= 0 &&
      c < OV2_FOURLINE_COLS &&
      cells[r * OV2_FOURLINE_COLS + c] === seat
    ) {
      line.push(r * OV2_FOURLINE_COLS + c);
      r += dr;
      c += dc;
    }
    if (line.length >= 4) return line;
  }
  return [];
}

/** @param {{ seat: null|0|1, hideDisc?: boolean, isWinning?: boolean }} props */
function CellDisc({ seat, hideDisc = false, isWinning = false }) {
  return (
    <div
      className={`relative flex aspect-square w-full max-w-[3.25rem] items-center justify-center rounded-full sm:max-w-none ${
        isWinning
          ? "shadow-[inset_0_3px_10px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(52,211,153,0.38),0_0_12px_rgba(45,212,191,0.14)]"
          : "shadow-[inset_0_3px_10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.35)]"
      }`}
      style={{
        background: isWinning
          ? "radial-gradient(ellipse at 50% 34%, rgba(55,55,62,0.75) 0%, rgba(22,22,26,0.97) 52%, rgba(8,8,10,0.92) 100%)"
          : "radial-gradient(ellipse at 50% 32%, rgba(72,73,82,0.88) 0%, rgba(35,36,42,0.98) 45%, rgba(18,18,22,1) 100%)",
      }}
    >
      {seat === 0 || seat === 1 ? (
        <div
          className={`absolute inset-[10%] rounded-full border transition-opacity duration-75 ${
            seat === 0
              ? "border-sky-300/25 bg-gradient-to-b from-sky-100 to-blue-800 shadow-[0_2px_8px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.32),inset_0_-1px_0_rgba(15,23,42,0.45)]"
              : "border-amber-300/22 bg-gradient-to-b from-amber-50 to-amber-700 shadow-[0_2px_8px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(120,53,15,0.35)]"
          } ${hideDisc ? "opacity-0" : "opacity-100"}`}
        />
      ) : null}
    </div>
  );
}

/** @param {{ seat: 0|1, className?: string }} props */
function GhostOrMiniDisc({ seat, className = "" }) {
  const cls =
    seat === 0
      ? "border-sky-400/35 bg-gradient-to-b from-sky-100/85 to-blue-800/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
      : "border-amber-400/28 bg-gradient-to-b from-amber-50/85 to-amber-700/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]";
  return (
    <div
      className={`pointer-events-none aspect-square w-[42%] max-w-[1.65rem] rounded-full opacity-75 ${cls} ${className}`}
      aria-hidden
    />
  );
}

/**
 * @param {{
 *   seat0Label: string,
 *   seat1Label: string,
 *   mySeat: null|0|1,
 *   indicatorSeat: null|0|1,
 *   phase: string,
 * }} props
 */
function FourLinePlayerHeader({ seat0Label, seat1Label, mySeat, indicatorSeat, phase }) {
  const playing = phase === "playing";
  const active0 = playing && indicatorSeat === 0;
  const active1 = playing && indicatorSeat === 1;

  const lineForSeat = (seat) => {
    if (phase === "finished") return "סיום";
    if (!playing) return "";
    if (indicatorSeat !== seat) return "ממתין";
    return "תורך";
  };

  const line0 = lineForSeat(0);
  const line1 = lineForSeat(1);

  return (
    <div className="mb-2.5 grid w-full shrink-0 grid-cols-2 gap-1.5 sm:mb-3 sm:gap-1">
      <div
        className={`min-w-0 rounded-lg border px-2 py-1.5 sm:px-2.5 sm:py-1.5 ${
          active0
            ? "border-sky-400/45 bg-gradient-to-br from-sky-950/55 to-zinc-900/90 shadow-[0_0_0_1px_rgba(56,189,248,0.2)]"
            : "border-white/[0.1] bg-zinc-900/55"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="h-6 w-6 shrink-0 rounded-full border border-sky-400/25 bg-gradient-to-b from-sky-200 to-blue-700 shadow-sm"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-sky-200/95">כחול</span>
              {mySeat === 0 ? (
                <span className="rounded bg-sky-500/25 px-1 py-px text-[9px] font-semibold uppercase text-sky-100">אתה</span>
              ) : mySeat === 1 ? (
                <span className="rounded bg-zinc-700/50 px-1 py-px text-[9px] font-medium text-zinc-400">יריב</span>
              ) : null}
            </div>
            <p className="truncate text-[11px] font-medium leading-tight text-zinc-100 sm:text-xs" title={seat0Label}>
              {seat0Label}
            </p>
          </div>
        </div>
        <div className="mt-1 flex min-h-[1.125rem] items-end">
          {line0 ? (
            <p
              className={`min-w-0 truncate text-[8px] font-semibold uppercase leading-tight tracking-wide tabular-nums sm:text-[9px] ${
                phase === "finished" ? "text-zinc-500" : active0 ? "text-sky-300/95" : "text-zinc-500"
              }`}
            >
              {line0}
            </p>
          ) : null}
        </div>
      </div>
      <div
        className={`min-w-0 rounded-lg border px-2 py-1.5 sm:px-2.5 sm:py-1.5 ${
          active1
            ? "border-amber-400/45 bg-gradient-to-br from-amber-950/45 to-zinc-900/90 shadow-[0_0_0_1px_rgba(251,191,36,0.2)]"
            : "border-white/[0.1] bg-zinc-900/55"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="h-6 w-6 shrink-0 rounded-full border border-amber-400/25 bg-gradient-to-b from-amber-100 to-amber-700 shadow-sm"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-200/95">זהב</span>
              {mySeat === 1 ? (
                <span className="rounded bg-amber-500/25 px-1 py-px text-[9px] font-semibold uppercase text-amber-100">אתה</span>
              ) : mySeat === 0 ? (
                <span className="rounded bg-zinc-700/50 px-1 py-px text-[9px] font-medium text-zinc-400">יריב</span>
              ) : null}
            </div>
            <p className="truncate text-[11px] font-medium leading-tight text-zinc-100 sm:text-xs" title={seat1Label}>
              {seat1Label}
            </p>
          </div>
        </div>
        <div className="mt-1 flex min-h-[1.125rem] items-end">
          {line1 ? (
            <p
              className={`min-w-0 truncate text-[8px] font-semibold uppercase leading-tight tracking-wide tabular-nums sm:text-[9px] ${
                phase === "finished" ? "text-zinc-500" : active1 ? "text-amber-300/95" : "text-zinc-500"
              }`}
            >
              {line1}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** @param {{ roomId: string }} props */
export default function FourlineScreen({ roomId }) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const session = useFourlineSession({ roomId });
  const {
    snapshot,
    vm,
    busy,
    err,
    setErr,
    playColumn,
    room,
    players,
    gameSession,
    bundleLoaded,
    bundleError,
    stopPolling,
  } = session;

  const [balance, setBalance] = useState(/** @type {number|null} */ (null));
  const [helpOpen, setHelpOpen] = useState(false);

  const { exitToLobby, leaveBusy } = useArcadeRoomExit({ roomId, stopPolling });
  const onLeaveRoom = exitToLobby;

  const [hoverCol, setHoverCol] = useState(/** @type {number|null} */ (null));
  const [movePulseCol, setMovePulseCol] = useState(/** @type {number|null} */ (null));
  const [dropAnim, setDropAnim] = useState(
    /** @type {null | { key: string; row: number; col: number; seat: 0|1 }} */ (null),
  );
  const [dropTranslatePx, setDropTranslatePx] = useState(0);
  const [winFreeze, setWinFreeze] = useState(false);
  const [cellStridePx, setCellStridePx] = useState(0);
  const prevRevisionRef = useRef(/** @type {number|null} */ (null));
  const prevLmKeyRef = useRef("");
  const lmPulseInitRef = useRef(false);
  const prevPhaseRef = useRef("");
  const firstCellRef = useRef(/** @type {HTMLDivElement|null} */ (null));

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/arcade/balance", { credentials: "same-origin" });
        const j = await res.json().catch(() => ({}));
        if (cancelled || !j?.ok || j.balance == null) return;
        setBalance(Number(j.balance));
      } catch {
        if (!cancelled) setBalance(null);
      }
    };
    void tick();
    const id = setInterval(() => void tick(), 25000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const goBack = useCallback(() => {
    const r = routerRef.current;
    if (typeof window !== "undefined" && window.history.length > 1) {
      r.back();
    } else {
      void r.replace("/student/arcade");
    }
  }, []);

  const cells = useMemo(() => parseFourLineCells(vm.cells), [vm.cells]);

  const seatDisplayName = useMemo(() => {
    /** @type {{ 0: string, 1: string }} */
    const out = { 0: "", 1: "" };
    const members = Array.isArray(players) ? players : [];
    for (const m of members) {
      const si = m?.seat_index;
      if (si !== 0 && si !== 1) continue;
      const dn = String(m?.display_name ?? "").trim();
      out[si] = dn || `שחקן ${si + 1}`;
    }
    return out;
  }, [players]);

  const seat0Label = seatDisplayName[0];
  const seat1Label = seatDisplayName[1];

  const onColumn = useCallback(
    async (col) => {
      if (vm.phase !== "playing" || busy) return;
      if (vm.mySeat == null || vm.turnSeat !== vm.mySeat) return;
      if (!fourLineColumnPlayable(col, cells)) {
        setErr("העמודה מלאה.");
        return;
      }
      setErr("");
      await playColumn(col);
    },
    [vm, busy, cells, playColumn, setErr],
  );

  const finished = vm.phase === "finished";
  const didIWin = vm.mySeat != null && vm.winnerSeat != null && vm.winnerSeat === vm.mySeat;
  const isDraw = finished && vm.winnerSeat == null;

  /** אחרי סיום עם זיכוי — רענון יתרה בתצוגת ה-HUD */
  useEffect(() => {
    if (!finished) return;
    const credited =
      snapshot?.mySettlementAmount != null && Number(snapshot.mySettlementAmount) > 0;
    if (!credited) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/arcade/balance", { credentials: "same-origin" });
          const j = await res.json().catch(() => ({}));
          if (cancelled || !j?.ok || j.balance == null) return;
          setBalance(Number(j.balance));
        } catch {
          /* */
        }
      })();
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [finished, snapshot?.mySettlementAmount, vm.sessionId]);

  const canPickColumn = vm.phase === "playing" && vm.mySeat === vm.turnSeat && !busy;

  const indicatorSeat = useMemo(() => {
    if (vm.phase !== "playing") return null;
    const t = vm.turnSeat;
    return t === 0 || t === 1 ? t : null;
  }, [vm.phase, vm.turnSeat]);

  const winHighlightSet = useMemo(() => {
    if (vm.phase !== "finished" || vm.winnerSeat == null) return null;
    const w = vm.winnerSeat;
    const lm = vm.lastMove;
    if (!lm || lm.row == null || lm.col == null) return null;
    const idxs = fourLineWinningIndicesFromLastMove(cells, lm.row, lm.col, w);
    return idxs.length >= 4 ? new Set(idxs) : null;
  }, [vm.phase, vm.winnerSeat, vm.lastMove, cells]);

  useEffect(() => {
    prevRevisionRef.current = null;
    prevLmKeyRef.current = "";
    lmPulseInitRef.current = false;
    prevPhaseRef.current = "";
  }, [vm.sessionId]);

  useEffect(() => {
    if (prevRevisionRef.current === null) {
      prevRevisionRef.current = vm.revision;
      return;
    }
    if (vm.revision === prevRevisionRef.current) return;
    prevRevisionRef.current = vm.revision;
    const lm = vm.lastMove;
    if (!lm || lm.row == null || lm.col == null) return;
    const seat = cells[lm.row * OV2_FOURLINE_COLS + lm.col];
    if (seat !== 0 && seat !== 1) return;
    const key = `${vm.revision}-${lm.row}-${lm.col}`;
    setDropAnim({ key, row: lm.row, col: lm.col, seat });
    const t = window.setTimeout(() => setDropAnim(null), DROP_MS);
    return () => clearTimeout(t);
  }, [vm.revision, vm.lastMove, cells]);

  useEffect(() => {
    if (!dropAnim) {
      setDropTranslatePx(0);
      return;
    }
    setDropTranslatePx(0);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDropTranslatePx(dropAnim.row * cellStridePx);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [dropAnim, cellStridePx]);

  useEffect(() => {
    const lm = vm.lastMove;
    if (!lm || lm.row == null || lm.col == null) return;
    const key = `${vm.revision}-${lm.row}-${lm.col}`;
    if (!lmPulseInitRef.current) {
      lmPulseInitRef.current = true;
      prevLmKeyRef.current = key;
      return;
    }
    if (key === prevLmKeyRef.current) return;
    prevLmKeyRef.current = key;
    setMovePulseCol(lm.col);
    const t = window.setTimeout(() => setMovePulseCol(null), MOVE_PULSE_MS);
    return () => clearTimeout(t);
  }, [vm.lastMove, vm.revision]);

  useEffect(() => {
    const p = vm.phase;
    const was = prevPhaseRef.current;
    prevPhaseRef.current = p;
    if (p === "finished" && vm.winnerSeat != null && was !== "finished") {
      setWinFreeze(true);
      const t = window.setTimeout(() => setWinFreeze(false), WIN_FREEZE_MS);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [vm.phase, vm.winnerSeat, vm.sessionId]);

  useLayoutEffect(() => {
    const el = firstCellRef.current;
    if (!el) return undefined;
    const measure = () => {
      const h = el.getBoundingClientRect().height;
      const wrap = el.closest("[data-fl-cells]");
      let gap = 4;
      if (wrap && wrap instanceof HTMLElement) {
        const g = window.getComputedStyle(wrap).gap;
        const parsed = parseFloat(g);
        if (Number.isFinite(parsed)) gap = parsed;
      }
      setCellStridePx(Math.max(0, Math.round(h + gap)));
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [cells]);

  const ghostSeat =
    vm.phase === "playing" && (indicatorSeat === 0 || indicatorSeat === 1) ? indicatorSeat : null;

  const lastMoveSeatForPulse = useMemo(() => {
    const lm = vm.lastMove;
    if (!lm || lm.row == null || lm.col == null) return null;
    const s = cells[lm.row * OV2_FOURLINE_COLS + lm.col];
    return s === 0 || s === 1 ? s : null;
  }, [vm.lastMove, cells]);

  const turnBoardGlow =
    vm.phase === "playing" && (indicatorSeat === 0 || indicatorSeat === 1)
      ? indicatorSeat === 0
        ? "shadow-[0_0_0_1px_rgba(56,189,248,0.28),0_0_22px_rgba(56,189,248,0.1)]"
        : "shadow-[0_0_0_1px_rgba(251,191,36,0.26),0_0_22px_rgba(245,158,11,0.09)]"
      : "";

  const showLobbyWait = room?.status === "waiting";
  /** חדר active בלי session — מצב שבור; לא להציג "טוען לוח…" לנצח */
  const showSessionInitError =
    bundleLoaded && room?.status === "active" && !snapshot && !gameSession;
  const showBoardLoading =
    !showLobbyWait && room?.status === "active" && !snapshot && !showSessionInitError;

  /** לוח + עזוב מתחתיו — במצבים אחרים נראה עזוב בתחתית גלילת התוכן */
  const showGameBoardUi =
    Boolean(room) && !showLobbyWait && !showSessionInitError && !showBoardLoading;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950 px-2 pt-2">
      <FourlineOv2Hud onBack={goBack} balance={balance} onOpenHelp={() => setHelpOpen(true)} />
      <FourlineHowToModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]"
          style={{
            paddingBottom: "max(6px, env(safe-area-inset-bottom, 0px))",
          }}
        >
          {bundleError ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 text-center">
              <p className="max-w-md text-sm leading-relaxed text-red-200/95">{bundleError}</p>
              <button
                type="button"
                onClick={() => void router.replace("/student/arcade")}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
              >
                חזרה למשחקים
              </button>
            </div>
          ) : !room ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center text-sm text-zinc-400">
              טוען חדר…
            </div>
          ) : showLobbyWait ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center px-2 text-center text-sm text-zinc-400">
              <p>ממתין לשחקן שני…</p>
              <p className="mt-2 text-xs text-zinc-500">כשהיריב מצטרף, המשחק ייפתח אוטומטית.</p>
            </div>
          ) : showSessionInitError ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center text-sm text-red-300">
              <p className="font-medium">שגיאה: המשחק לא אותחל לחדר הזה</p>
              <p className="mt-2 text-xs text-zinc-500">נסה שוב מאוחר יותר או חזור אחורה.</p>
              <button
                type="button"
                onClick={goBack}
                className="mt-4 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
              >
                חזרה
              </button>
            </div>
          ) : showBoardLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-400">טוען לוח…</div>
          ) : (
            <>
              {err ? (
                <div className="rounded-md border border-red-500/20 bg-red-950/20 px-2 py-1.5 text-[11px] text-red-200/95">
                  <span>{err}</span>{" "}
                  <button type="button" className="text-red-300 underline" onClick={() => setErr("")}>
                    סגור
                  </button>
                </div>
              ) : null}

              <div className="mt-2 flex min-h-0 flex-col gap-0 overflow-x-hidden">
                {snapshot ? (
                  <FourLinePlayerHeader
                    seat0Label={seat0Label}
                    seat1Label={seat1Label}
                    mySeat={vm.mySeat}
                    indicatorSeat={indicatorSeat}
                    phase={vm.phase}
                  />
                ) : null}

                <div className="flex min-h-0 min-w-0 flex-col sm:min-h-0 sm:flex-1 sm:justify-center">
                  <div
                    className={`relative mx-auto w-full max-w-lg rounded-2xl border border-zinc-600/25 bg-gradient-to-b from-zinc-800/55 to-zinc-900/90 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition-[transform,opacity,box-shadow] duration-200 sm:max-w-[min(100%,min(42rem,65dvh))] ${turnBoardGlow} ${
                      winFreeze ? "scale-[0.998] opacity-[0.97]" : "scale-100 opacity-100"
                    }`}
                  >
                    <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 sm:mb-1">
                      לוח 7×6
                    </p>
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1 md:gap-1.5">
                      {Array.from({ length: OV2_FOURLINE_COLS }, (_, c) => {
                        const playable = canPickColumn && fourLineColumnPlayable(c, cells);
                        const showGhost =
                          hoverCol === c &&
                          ghostSeat != null &&
                          vm.phase === "playing" &&
                          fourLineColumnPlayable(c, cells);
                        const hoverTintSeat =
                          hoverCol === c && ghostSeat != null && vm.phase === "playing" && fourLineColumnPlayable(c, cells)
                            ? ghostSeat
                            : null;
                        const pulseTintSeat = movePulseCol === c && hoverCol !== c ? lastMoveSeatForPulse : null;
                        const tintSeat = hoverTintSeat ?? pulseTintSeat;
                        const colTint =
                          tintSeat === 0 ? "bg-sky-500/10" : tintSeat === 1 ? "bg-amber-400/08" : "bg-transparent";
                        return (
                          <div
                            key={c}
                            data-fl-col
                            className={`relative flex min-w-0 flex-col gap-0.5 overflow-visible rounded-md transition-[background-color] duration-150 sm:gap-0.5 md:gap-1 ${colTint}`}
                            onPointerEnter={() => {
                              if (vm.phase !== "playing") return;
                              setHoverCol(c);
                            }}
                            onPointerLeave={() => setHoverCol(null)}
                          >
                            <button
                              type="button"
                              disabled={!playable}
                              aria-label={`עמודה ${c + 1}`}
                              onClick={() => void onColumn(c)}
                              className={`relative z-10 flex h-8 min-h-[2rem] items-center justify-center rounded-md border text-[11px] font-bold transition sm:h-9 ${
                                playable
                                  ? "border-sky-500/40 bg-sky-950/50 text-sky-100 shadow-sm active:scale-[0.97]"
                                  : "cursor-not-allowed border-white/[0.08] bg-zinc-950/50 text-zinc-500 opacity-55"
                              }`}
                            >
                              ▼
                            </button>
                            <div className="relative flex min-h-0 flex-col gap-0.5 overflow-visible sm:gap-0.5 md:gap-1" data-fl-cells>
                              {showGhost ? (
                                <div className="pointer-events-none absolute left-0 right-0 top-0 z-[15] flex justify-center overflow-visible">
                                  <GhostOrMiniDisc seat={ghostSeat} />
                                </div>
                              ) : null}
                              {dropAnim && dropAnim.col === c && cellStridePx > 0 ? (
                                <div
                                  className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-center overflow-visible will-change-transform"
                                  style={{
                                    transform: `translateZ(0) translateY(${dropTranslatePx}px)`,
                                    transition:
                                      dropTranslatePx === 0
                                        ? "none"
                                        : `transform ${DROP_MS}ms cubic-bezier(0.33, 1, 0.68, 1)`,
                                  }}
                                >
                                  <div
                                    className={`aspect-square w-[55%] max-w-[2.75rem] rounded-full sm:w-[58%] sm:max-w-none ${
                                      dropAnim.seat === 0
                                        ? "border border-sky-300/25 bg-gradient-to-b from-sky-100 to-blue-800 shadow-[0_3px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.3)]"
                                        : "border border-amber-300/22 bg-gradient-to-b from-amber-50 to-amber-700 shadow-[0_3px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.28)]"
                                    }`}
                                  />
                                </div>
                              ) : null}
                              {Array.from({ length: OV2_FOURLINE_ROWS }, (_, ri) => {
                                const r = ri;
                                const idx = r * OV2_FOURLINE_COLS + c;
                                const v = cells[idx];
                                const hideDrop =
                                  Boolean(dropAnim && dropAnim.row === r && dropAnim.col === c) && cellStridePx > 0;
                                const isWin = winHighlightSet != null && winHighlightSet.has(idx);
                                return (
                                  <div key={r} ref={c === 0 && r === 0 ? firstCellRef : undefined} className="min-w-0 px-px sm:px-0.5">
                                    <CellDisc seat={v} hideDisc={hideDrop} isWinning={isWin} />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <ArcadeGameSocialDock roomId={roomId} gameSession={gameSession} />
                <FourlineLeaveRow onLeave={onLeaveRoom} busy={leaveBusy} disabled={!String(roomId || "").trim()} />

                {finished ? (
                  <div className="mt-3 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-3 text-center sm:mt-4">
                    <p className="text-lg font-bold text-zinc-100">
                      {isDraw ? "תיקו" : didIWin ? "ניצחת!" : "הפסדת"}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {isDraw
                        ? "הלוח התמלא."
                        : didIWin
                          ? snapshot?.walkaway
                            ? "היריב יצא מהמשחק - ניצחון טכני."
                            : "ארבע בשורה."
                          : "היריב חיבר ארבע."}
                    </p>
                    {didIWin && Number(snapshot?.mySettlementAmount) > 0 ? (
                      <div className="mt-3 space-y-1">
                        <p className="text-base font-extrabold text-amber-200">
                          +{snapshot.mySettlementAmount} מטבעות זכייה
                        </p>
                        {Number(snapshot?.entryCost) > 0 ? (
                          <p className="text-[11px] font-medium text-amber-100/75">
                            קופה מלאה: {snapshot.mySettlementAmount} מטבעות (כניסה {snapshot.entryCost} לכל שחקן)
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {isDraw &&
                    snapshot?.mySettlementAmount != null &&
                    Number(snapshot.mySettlementAmount) > 0 ? (
                      <p className="mt-3 text-sm font-semibold text-amber-100/95">
                        הוחזרו {snapshot.mySettlementAmount} מטבעות (תיקו)
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </>
          )}

          {!showGameBoardUi ? (
            <>
              <ArcadeGameSocialDock roomId={roomId} gameSession={gameSession} />
              <FourlineLeaveRow onLeave={onLeaveRoom} busy={leaveBusy} disabled={!String(roomId || "").trim()} />
            </>
          ) : null}
        </div>

        <StudentAdSlot variant="dvh" dataAdSlot="arcade-ad-reserved" />
      </div>
    </div>
  );
}
