"use client";

import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSnakesLaddersSession } from "../../../hooks/arcade/useSnakesLaddersSession";
import { useArcadeRoomExit } from "../../../hooks/arcade/useArcadeRoomExit";
import ArcadeGameSocialDock from "../club/ArcadeGameSocialDock.jsx";
import { LADDERS, SNAKES } from "../../../lib/arcade/snakes-ladders/snakesLaddersEngine";
import { Ov2ArcadeSnakesPlayfield } from "./ov2ArcadeSnakesBoardView";
import StudentAdSlot from "../../student/StudentAdSlot.jsx";

const GAME_TITLE = "נחשים וסולמות";

const HUD_CONTROL_H = "h-9";
const HUD_CHIP =
  "rounded-lg border border-white/20 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-white/[0.11] active:scale-[0.97]";
const HUD_BTN_BASE = `flex ${HUD_CONTROL_H} shrink-0 items-center justify-center ${HUD_CHIP}`;
const HUD_BTN_SQUARE = `${HUD_BTN_BASE} w-9`;

/** @param {{ onLeave: () => void, disabled?: boolean, busy?: boolean }} props */
function SnakesLeaveRow({ onLeave, disabled = false, busy = false }) {
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
function SnakesOv2Hud({ onBack, balance, onOpenHelp }) {
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
function SnakesHowToModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-3 pb-8 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="snakes-howto-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="סגור" onClick={onClose} />
      <div
        dir="rtl"
        className="relative z-[1] max-h-[min(85vh,540px)] w-full max-w-md overflow-y-auto rounded-2xl border border-white/15 bg-gradient-to-b from-zinc-800 to-zinc-950 p-4 text-right shadow-2xl sm:p-5"
      >
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h2 id="snakes-howto-title" className="text-lg font-bold text-white">
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
          <li>כל שחקן בתורו מזריק קוביה ומתקדם על הלוח לפי המספר.</li>
          <li>נחש מוריד, סולם מעלה - לפי המפה הקלאסית.</li>
          <li>מי שמגיע בדיוק ל-100 מנצח.</li>
          <li>זריקה שחורגת מ-100 לא מזיזה אותך (נשאר באותו משבצת).</li>
          <li>
            שש בקובייה נותן תור נוסף - עד שני ששים ברצף. בשש השלישי ברצף אין תזוזה והתור עובר; אם אחרי שני ששים יוצא מספר אחר - משחקים אותו והתור עובר.
          </li>
        </ul>
      </div>
    </div>
  );
}

/** @param {{ roomId: string }} props */
export default function SnakesLaddersScreen({ roomId }) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const session = useSnakesLaddersSession({ roomId });
  const {
    snapshot,
    vm,
    err,
    setErr,
    rollDice,
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
  const [waitTick, setWaitTick] = useState(0);

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

  const flexDeadlineMs = useMemo(() => {
    const raw = room?.flex_auto_start_at;
    if (raw == null || raw === "") return NaN;
    const t = new Date(String(raw)).getTime();
    return Number.isFinite(t) ? t : NaN;
  }, [room?.flex_auto_start_at]);

  const showLobbyWait = room?.status === "waiting";
  const hasFlexDeadline = Number.isFinite(flexDeadlineMs);

  useEffect(() => {
    if (!showLobbyWait || !hasFlexDeadline) return undefined;
    const id = window.setInterval(() => setWaitTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, [showLobbyWait, hasFlexDeadline]);

  const waitSecondsLeft = useMemo(() => {
    if (!hasFlexDeadline) return null;
    return Math.max(0, Math.ceil((flexDeadlineMs - Date.now()) / 1000));
  }, [hasFlexDeadline, flexDeadlineMs, waitTick]);

  const goBack = useCallback(() => {
    const r = routerRef.current;
    if (typeof window !== "undefined" && window.history.length > 1) {
      r.back();
    } else {
      void r.replace("/student/arcade");
    }
  }, []);

  const showSessionInitError =
    bundleLoaded && room?.status === "active" && !snapshot && !gameSession;
  const showBoardLoading =
    !showLobbyWait && room?.status === "active" && !snapshot && !showSessionInitError;

  const onDice = useCallback(async () => {
    if (vm.phase !== "playing" || !vm.canClientRoll) return;
    setErr("");
    await rollDice();
  }, [vm.phase, vm.canClientRoll, rollDice, setErr]);

  const finished = vm.phase === "finished";
  const didIWin = vm.mySeat != null && vm.winnerSeat != null && vm.winnerSeat === vm.mySeat;

  const edges = useMemo(
    () => ({
      ladders: Object.fromEntries(LADDERS),
      snakes: Object.fromEntries(SNAKES),
    }),
    [],
  );

  const positionsRecord = vm.positionsForBoard != null ? vm.positionsForBoard : {};

  const memberBySeat = useMemo(() => {
    /** @type {Map<number, { display_name?: string }>} */
    const m = new Map();
    const members = Array.isArray(players) ? players : [];
    for (const p of members) {
      const si = Number(p?.seat_index);
      if (!Number.isInteger(si) || si < 0 || si > 3) continue;
      m.set(si, { display_name: p?.display_name });
    }
    return m;
  }, [players]);

  const diceValue =
    vm.dicePresentation != null && Number.isFinite(Number(vm.dicePresentation))
      ? Number(vm.dicePresentation)
      : null;
  const diceEmphasized =
    vm.phase === "playing" && (Boolean(vm.canClientRoll) || Boolean(vm.diceRolling));
  const rollDisabled =
    finished || vm.boardViewReadOnly || !vm.canClientRoll || vm.diceRolling;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950 px-2 pt-2">
      <SnakesOv2Hud onBack={goBack} balance={balance} onOpenHelp={() => setHelpOpen(true)} />
      <SnakesHowToModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      <div className="min-h-0 flex flex-1 flex-col overflow-y-auto overflow-x-hidden pb-2">
        {bundleError ? (
          <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">
            {bundleError}
          </p>
        ) : null}

        {showLobbyWait ? (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-6 text-center text-amber-100">
            {hasFlexDeadline && waitSecondsLeft != null ? (
              <>
                <p className="text-lg font-bold tabular-nums">
                  המשחק יתחיל בעוד {waitSecondsLeft} {waitSecondsLeft === 1 ? "שנייה" : "שניות"}
                </p>
                <p className="mt-2 text-sm text-amber-200/90">
                  אם החדר יתמלא לפני כן - המשחק יתחיל מיד
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold">ממתינים לשחקן נוסף…</p>
                <p className="mt-2 text-sm text-amber-200/90">כשהחדר יתמלא המשחק יתחיל אוטומטית</p>
              </>
            )}
          </div>
        ) : null}

        {showSessionInitError ? (
          <p className="mt-4 text-center text-sm text-rose-200">לא ניתן לטעון את מצב המשחק - נסה לרענן</p>
        ) : null}

        {showBoardLoading ? (
          <p className="mt-6 text-center text-zinc-400">טוען לוח…</p>
        ) : null}

        {!showLobbyWait && snapshot ? (
          <div className="mt-2 flex min-h-0 min-w-0 flex-1 flex-col">
            <Ov2ArcadeSnakesPlayfield
              edges={edges}
              positions={positionsRecord}
              pawnMotion={vm.pawnMotion}
              turnSeat={vm.turnSeatForUi ?? vm.turnSeat ?? null}
              mySeat={vm.mySeat ?? null}
              memberBySeat={memberBySeat}
              diceValue={diceValue}
              diceEmphasized={diceEmphasized}
              finished={finished}
              onRoll={() => void onDice()}
              rollDisabled={rollDisabled}
              err={err || undefined}
            />
            {finished ? (
              <p className="mt-2 shrink-0 text-center text-lg font-bold text-amber-200">
                {didIWin ? "ניצחת!" : `מנצח: מושב ${(vm.winnerSeat ?? 0) + 1}`}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {room ? (
        <>
          <ArcadeGameSocialDock roomId={roomId} gameSession={gameSession} />
          <SnakesLeaveRow onLeave={onLeaveRoom} busy={leaveBusy} disabled={!String(roomId || "").trim()} />
        </>
      ) : null}
      <StudentAdSlot variant="dvh" dataAdSlot="arcade-ad-reserved" />
    </div>
  );
}
