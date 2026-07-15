"use client";

import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCheckersSession } from "../../../hooks/arcade/useCheckersSession";
import { useArcadeRoomExit } from "../../../hooks/arcade/useArcadeRoomExit";
import ArcadeGameSocialDock from "../club/ArcadeGameSocialDock.jsx";
import { EMPTY, isKing, pieceSeat } from "../../../lib/arcade/checkers/checkersEngine";
import {
  boardSideLabels,
  shouldFlipCheckersBoard,
  viewToEngineCoord,
} from "../../../lib/arcade/board-orientation";
import StudentAdSlot from "../../student/StudentAdSlot.jsx";

const GAME_TITLE = "דמקה";

const HUD_CONTROL_H = "h-9";
const HUD_CHIP =
  "rounded-lg border border-white/20 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-white/[0.11] active:scale-[0.97]";
const HUD_BTN_BASE = `flex ${HUD_CONTROL_H} shrink-0 items-center justify-center ${HUD_CHIP}`;
const HUD_BTN_SQUARE = `${HUD_BTN_BASE} w-9`;

/** @param {{ onLeave: () => void, disabled?: boolean, busy?: boolean }} props */
function LeaveRow({ onLeave, disabled = false, busy = false }) {
  return (
    <div className="mt-0 flex w-full shrink-0 justify-center border-t border-white/10 px-1 pb-1 pt-2">
      <button
        type="button"
        onClick={onLeave}
        disabled={disabled || busy}
        className="min-h-[2.5rem] w-full max-w-xs rounded-xl border border-rose-500/35 bg-rose-950/35 px-4 py-2 text-sm font-extrabold text-rose-100 disabled:opacity-50 sm:max-w-sm"
      >
        {busy ? "יוצא…" : "עזוב"}
      </button>
    </div>
  );
}

/** @param {{ onBack: () => void, balance: number | null, onOpenHelp: () => void }} props */
function Hud({ onBack, balance, onOpenHelp }) {
  return (
    <header
      dir="rtl"
      className="relative z-20 flex w-full shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.14] bg-gradient-to-b from-zinc-700/90 via-zinc-900/95 to-black/90 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_28px_rgba(0,0,0,0.45)] sm:gap-2 sm:px-2.5 sm:py-2"
    >
      <button type="button" onClick={onBack} className={`${HUD_BTN_BASE} min-w-[3.75rem] px-2 sm:min-w-[4rem]`}>
        <span className="text-xs font-extrabold text-white sm:text-sm">חזרה</span>
      </button>
      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate text-base font-extrabold text-white sm:text-lg">{GAME_TITLE}</h1>
      </div>
      <div
        className={`flex ${HUD_CONTROL_H} min-w-[4.75rem] shrink-0 items-center gap-1 rounded-lg border border-amber-500/35 bg-black/55 px-2`}
      >
        <img src="/images/coin.png" alt="" className="h-6 w-6 object-contain sm:h-7 sm:w-7" />
        <span className="font-mono text-sm font-bold text-amber-100 sm:text-base">{balance === null ? "…" : balance}</span>
      </div>
      <button type="button" onClick={onOpenHelp} className={HUD_BTN_SQUARE} aria-label="עזרה">
        <span className="text-lg text-white/95">?</span>
      </button>
    </header>
  );
}

/** @param {{ open: boolean, onClose: () => void }} props */
function HowToModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog">
      <button type="button" className="absolute inset-0" aria-label="סגור" onClick={onClose} />
      <div
        dir="rtl"
        className="relative z-[1] max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/15 bg-zinc-900 p-4 shadow-2xl"
      >
        <div className="mb-3 flex justify-between border-b border-white/10 pb-2">
          <h2 className="text-lg font-bold text-white">איך משחקים</h2>
          <button type="button" onClick={onClose} className="text-sm text-zinc-300">
            סגור
          </button>
        </div>
        <ul className="list-disc space-y-2 pr-5 text-sm text-zinc-200">
          <li>שחור (מושב שמאלי ברשימה) מתחיל; תורות לסירוגין.</li>
          <li>זזים אלכסונית קדימה; מלכים זזים בכל האלכסונים.</li>
          <li>חובה לאכול אם יש קפיצה זמינה.</li>
          <li>אכילות רצופות עם אותו כלי - ימשיכו את התור עד שאין המשך.</li>
        </ul>
      </div>
    </div>
  );
}

/** @param {{ p: number }} props */
function PieceGlyph({ p }) {
  if (p === EMPTY) return null;
  const isBlack = pieceSeat(p) === 0;
  const k = isKing(p);
  const ring = isBlack ? "bg-zinc-900 ring-amber-700/40" : "bg-zinc-100 ring-zinc-400";
  return (
    <span
      className={`inline-flex h-[min(8vw,36px)] w-[min(8vw,36px)] items-center justify-center rounded-full ring-2 ${ring}`}
    >
      <span className={`text-[min(4vw,18px)] font-black ${isBlack ? "text-amber-200" : "text-zinc-800"}`}>
        {k ? "♔" : ""}
      </span>
    </span>
  );
}

/** @param {{ roomId: string }} props */
export default function CheckersScreen({ roomId }) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const session = useCheckersSession({ roomId });
  const { snapshot, vm, busy, err, setErr, submitMove, room, players, gameSession, bundleLoaded, bundleError, stopPolling } =
    session;

  const [balance, setBalance] = useState(/** @type {number|null} */ (null));
  const [helpOpen, setHelpOpen] = useState(false);
  const { exitToLobby, leaveBusy } = useArcadeRoomExit({ roomId, stopPolling });
  const onLeaveRoom = exitToLobby;
  /** @type {[{ r: number, c: number } | null, React.Dispatch<React.SetStateAction<{ r: number, c: number } | null>>]} */
  const [pick, setPick] = useState(/** @type {{ r: number, c: number } | null} */ (null));

  useEffect(() => {
    setPick(null);
  }, [vm.revision, vm.phase]);

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
    if (typeof window !== "undefined" && window.history.length > 1) r.back();
    else void r.replace("/student/arcade");
  }, []);

  const showLobbyWait = room?.status === "waiting";
  const showSessionInitError = bundleLoaded && room?.status === "active" && !snapshot && !gameSession;
  const showBoardLoading = !showLobbyWait && room?.status === "active" && !snapshot && !showSessionInitError;

  const seatLabels = useMemo(() => {
    const out = ["", ""];
    for (const m of players || []) {
      const si = Number(m?.seat_index);
      if (si !== 0 && si !== 1) continue;
      out[si] = String(m?.display_name ?? "").trim() || `שחקן ${si + 1}`;
    }
    return [out[0] || "שחור", out[1] || "לבן"];
  }, [players]);

  const onCellClick = useCallback(
    async (r, c) => {
      if (busy || vm.phase !== "playing" || !vm.canClientMove) return;
      const grid = vm.grid;
      if (!Array.isArray(grid) || !grid[r]) return;
      const cell = grid[r][c];
      const my = vm.mySeat;
      if (my !== 0 && my !== 1) return;

      if (pick == null) {
        if (cell === EMPTY) return;
        if (pieceSeat(cell) !== my) return;
        if (vm.mustContinueFrom && (r !== vm.mustContinueFrom.r || c !== vm.mustContinueFrom.c)) return;
        setPick({ r, c });
        setErr("");
        return;
      }

      if (pick.r === r && pick.c === c) {
        setPick(null);
        return;
      }

      setErr("");
      const res = await submitMove(pick.r, pick.c, r, c);
      if (res.ok) setPick(null);
    },
    [busy, vm, pick, submitMove, setErr],
  );

  const highlightTo = useMemo(() => {
    if (!pick || !vm.legalMoves?.length) return new Set();
    const s = new Set();
    for (const m of vm.legalMoves) {
      if (m.fromR === pick.r && m.fromC === pick.c) {
        s.add(`${m.toR},${m.toC}`);
      }
    }
    return s;
  }, [pick, vm.legalMoves]);

  const finished = vm.phase === "finished";
  const didIWin = vm.mySeat != null && vm.winnerSeat != null && vm.winnerSeat === vm.mySeat;
  const flipBoard = shouldFlipCheckersBoard(vm.mySeat);
  const sideLabels = boardSideLabels(seatLabels, vm.mySeat, [
    { seat: 0, color: "שחור" },
    { seat: 1, color: "לבן" },
  ]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950 px-2 pt-2">
      <Hud onBack={goBack} balance={balance} onOpenHelp={() => setHelpOpen(true)} />
      <HowToModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      <div className="min-h-0 flex flex-1 flex-col overflow-y-auto pb-2">
        {bundleError ? (
          <p className="mt-2 rounded border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">{bundleError}</p>
        ) : null}

        {showLobbyWait ? (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-6 text-center text-amber-100">
            <p className="text-lg font-bold">ממתינים לשחקן…</p>
            <p className="mt-2 text-sm text-amber-200/90">דמקה - שני שחקנים</p>
          </div>
        ) : null}

        {showSessionInitError ? (
          <p className="mt-4 text-center text-sm text-rose-200">לא ניתן לטעון את הלוח - נסה לרענן</p>
        ) : null}
        {showBoardLoading ? <p className="mt-6 text-center text-zinc-400">טוען…</p> : null}

        {!showLobbyWait && snapshot ? (
          <>
            <p className="mt-2 text-center text-xs text-zinc-500 sm:text-sm">
              {sideLabels.top.name} · {sideLabels.top.color}
            </p>

            <div className="mx-auto mt-2 w-full max-w-[min(96vw,420px)] border border-amber-900/40 p-1">
              <div className="grid grid-cols-8 gap-px bg-zinc-800 p-px">
                {Array.from({ length: 8 }, (_, viewR) =>
                  Array.from({ length: 8 }, (_, viewC) => {
                    const { r, c } = viewToEngineCoord(viewR, viewC, flipBoard);
                    const isDark = (r + c) % 2 === 1;
                    const piece = vm.grid[r]?.[c] ?? 0;
                    const hl = pick?.r === r && pick?.c === c;
                    const canLand = highlightTo.has(`${r},${c}`);
                    return (
                      <button
                        key={`${viewR}-${viewC}`}
                        type="button"
                        disabled={vm.phase !== "playing" || busy}
                        onClick={() => void onCellClick(r, c)}
                        className={`relative flex aspect-square items-center justify-center ${
                          isDark ? "bg-amber-900/55" : "bg-amber-100/25"
                        } ${hl ? "ring-2 ring-amber-300" : ""} ${canLand ? "ring-2 ring-emerald-400/80" : ""}`}
                      >
                        {piece !== EMPTY ? <PieceGlyph p={piece} /> : null}
                      </button>
                    );
                  }),
                ).flat()}
              </div>
            </div>

            <p className="mt-2 text-center text-xs font-semibold text-amber-100/90 sm:text-sm">
              {sideLabels.bottom.name} · {sideLabels.bottom.color} (אתה)
            </p>

            <div className="mt-4 space-y-2 text-center">
              {vm.mustContinueFrom ? (
                <p className="text-sm font-bold text-amber-200">יש להמשיך אכילה מאותו כלי</p>
              ) : null}
              {err ? <p className="text-sm text-rose-300">{err}</p> : null}
              {finished ? (
                <p className="text-lg font-bold text-amber-200">
                  {didIWin ? "ניצחת!" : vm.winnerSeat != null ? `מנצח: מושב ${vm.winnerSeat + 1}` : "המשחק נגמר"}
                </p>
              ) : (
                <p className="text-sm text-zinc-400">
                  {vm.canClientMove ? "בחר כלי ואז יעד" : busy ? "שולח…" : "המתן לתורך"}
                </p>
              )}
            </div>
          </>
        ) : null}
      </div>

      {room ? (
        <>
          <ArcadeGameSocialDock roomId={roomId} gameSession={gameSession} />
          <LeaveRow onLeave={onLeaveRoom} busy={leaveBusy} disabled={!String(roomId || "").trim()} />
        </>
      ) : null}
      <StudentAdSlot variant="dvh" dataAdSlot="arcade-ad-reserved" />
    </div>
  );
}
