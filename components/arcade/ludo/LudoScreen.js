"use client";

import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLudoSession } from "../../../hooks/arcade/useLudoSession";
import { useArcadeRoomExit } from "../../../hooks/arcade/useArcadeRoomExit";
import ArcadeGameSocialDock from "../club/ArcadeGameSocialDock.jsx";
import LudoBoardView from "../../../lib/arcade/ludo/LudoBoardView";
import LudoSeatStrip from "./LudoSeatStrip";
import StudentAdSlot from "../../student/StudentAdSlot.jsx";

const GAME_TITLE = "לודו";

const HUD_CONTROL_H = "h-9";
const HUD_CHIP =
  "rounded-lg border border-white/20 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-white/[0.11] active:scale-[0.97]";
const HUD_BTN_BASE = `flex ${HUD_CONTROL_H} shrink-0 items-center justify-center ${HUD_CHIP}`;
const HUD_BTN_SQUARE = `${HUD_BTN_BASE} w-9`;

/** @param {{ onLeave: () => void, disabled?: boolean, busy?: boolean }} props */
function LudoLeaveRow({ onLeave, disabled = false, busy = false }) {
  return (
    <div className="mt-0 flex w-full shrink-0 justify-center border-t border-white/10 px-1 pb-1 pt-2 sm:pt-2.5">
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

/** @param {{ onBack: () => void, balance: number | null, onOpenHelp: () => void }} props */
function LudoOv2Hud({ onBack, balance, onOpenHelp }) {
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
        <span className="text-xs font-extrabold leading-none tracking-wide text-white sm:text-sm">חזרה</span>
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
          <img src="/images/coin.png" alt="" className="h-6 w-6 shrink-0 object-contain sm:h-7 sm:w-7" />
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
          <span className="text-lg leading-none text-white/95">?</span>
        </button>
      </div>
    </header>
  );
}

/** @param {{ open: boolean, onClose: () => void }} props */
function LudoHowToModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-3 pb-8 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ludo-howto-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="סגור" onClick={onClose} />
      <div
        dir="rtl"
        className="relative z-[1] max-h-[min(85vh,540px)] w-full max-w-md overflow-y-auto rounded-2xl border border-white/15 bg-gradient-to-b from-zinc-800 to-zinc-950 p-4 text-right shadow-2xl sm:p-5"
      >
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h2 id="ludo-howto-title" className="text-lg font-bold text-white">
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
          <li>בתורך - קוביה נזרקת (בממשק OV2 גם נפתחת זריקה אוטומטית עם אנימציה), ואז בוחרים איזה חייל להזיז.</li>
          <li>רק 6 מוציא כלי מהחצר לשביל.</li>
          <li>6, אכילה או כניסה לבית מהשביל - לפי חוקי המשחק במנוע - תור נוסף.</li>
          <li>כלי שמגיע ליעד הבית מסיים; ארבעה כלים בבית - ניצחון.</li>
        </ul>
      </div>
    </div>
  );
}

/** @param {{ roomId: string }} props */
export default function LudoScreen({ roomId }) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const session = useLudoSession({ roomId });
  const {
    snapshot,
    vm,
    busy,
    err,
    setErr,
    rollDice,
    movePiece,
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

  const showLobbyWait = room?.status === "waiting";
  const showSessionInitError =
    bundleLoaded && room?.status === "active" && !snapshot && !gameSession;
  const showBoardLoading =
    !showLobbyWait && room?.status === "active" && !snapshot && !showSessionInitError;

  const seatLabels = useMemo(() => {
    const out = ["", "", "", ""];
    const members = Array.isArray(players) ? players : [];
    for (const m of members) {
      const si = Number(m?.seat_index);
      if (!Number.isInteger(si) || si < 0 || si > 3) continue;
      const dn = String(m?.display_name ?? "").trim();
      out[si] = dn || `שחקן ${si + 1}`;
    }
    return out.map((label, i) => label || `מושב ${i + 1}`);
  }, [players]);

  const onDice = useCallback(async () => {
    if (vm.phase !== "playing" || busy || !vm.canClientRoll) return;
    setErr("");
    await rollDice();
  }, [vm.phase, vm.canClientRoll, busy, rollDice, setErr]);

  const onPiece = useCallback(
    async (pieceIndex) => {
      if (vm.phase !== "playing" || busy || !vm.canClientMovePiece) return;
      setErr("");
      await movePiece(pieceIndex);
    },
    [vm.phase, vm.canClientMovePiece, busy, movePiece, setErr],
  );

  const finished = vm.phase === "finished";
  const didIWin = vm.mySeat != null && vm.winnerSeat != null && vm.winnerSeat === vm.mySeat;

  const seatStripActiveIndex =
    vm.phase === "playing" && vm.turnSeat != null && !finished ? vm.turnSeat : null;

  const boardForView = useMemo(() => {
    const b = vm.board && typeof vm.board === "object" ? vm.board : {};
    return {
      ...b,
      activeSeats: Array.isArray(b.activeSeats) ? b.activeSeats : [],
      pieces: b.pieces && typeof b.pieces === "object" ? b.pieces : {},
      turnSeat: vm.turnSeat,
      dice: vm.dice,
      lastDice: vm.lastDice,
    };
  }, [vm.board, vm.turnSeat, vm.dice, vm.lastDice]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950 px-2 pt-2">
      <LudoOv2Hud onBack={goBack} balance={balance} onOpenHelp={() => setHelpOpen(true)} />
      <LudoHowToModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {bundleError ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-4 py-6 text-center">
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
            <div className="flex min-h-[40vh] flex-col items-center justify-center text-sm text-zinc-400">טוען חדר…</div>
          ) : showLobbyWait ? (
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden px-0.5 sm:gap-1">
              <LudoSeatStrip count={4} labels={seatLabels} activeIndex={null} selfIndex={vm.mySeat} />
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 text-center text-sm text-zinc-400">
                <p>ממתין לשחקנים…</p>
                <p className="mt-2 text-xs text-zinc-500">כשהחדר מתמלא, המשחק ייפתח אוטומטית.</p>
              </div>
            </div>
          ) : showSessionInitError ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center text-sm text-red-300">
              <p className="font-medium">שגיאה: המשחק לא אותחל לחדר הזה</p>
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
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden px-0.5 sm:gap-1">
              {err ? (
                <div className="shrink-0 rounded-md border border-red-500/20 bg-red-950/20 px-2 py-1.5 text-[11px] text-red-200/95">
                  <span>{err}</span>{" "}
                  <button type="button" className="text-red-300 underline" onClick={() => setErr("")}>
                    סגור
                  </button>
                </div>
              ) : null}

              <LudoSeatStrip
                count={4}
                labels={seatLabels}
                activeIndex={seatStripActiveIndex}
                selfIndex={vm.mySeat}
              />

              <div className="relative min-h-0 w-full flex-1 overflow-hidden">
                <LudoBoardView
                  board={boardForView}
                  mySeat={vm.mySeat}
                  diceValue={vm.dicePresentation}
                  diceRolling={vm.diceRolling}
                  diceSeat={vm.turnSeat}
                  diceClickable={vm.canClientRoll && !busy}
                  onDiceClick={() => void onDice()}
                  onPieceClick={(idx) => void onPiece(idx)}
                  disableHighlights={busy || !vm.canClientMovePiece}
                  readOnlyPresentation={vm.phase !== "playing"}
                  legalMovablePieceIndices={vm.legalMovablePieceIndices}
                  preferRectangularLayout
                />
              </div>

              {finished ? (
                <div className="shrink-0 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-3 text-center">
                  <p className="text-lg font-bold text-zinc-100">{didIWin ? "ניצחת!" : "הפסדת"}</p>
                  <p className="mt-1 text-sm text-zinc-400">סיום משחק · ללא פרס מטבעות בארקייד זה</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {room ? (
          <>
            <ArcadeGameSocialDock roomId={roomId} gameSession={gameSession} />
            <LudoLeaveRow onLeave={onLeaveRoom} busy={leaveBusy} disabled={!String(roomId || "").trim()} />
          </>
        ) : null}

        <StudentAdSlot variant="dvh" dataAdSlot="arcade-ad-reserved" />
      </div>
    </div>
  );
}
