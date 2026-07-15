"use client";

import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useArcadePlaceholderSession } from "../../../hooks/arcade/useArcadePlaceholderSession";
import { useArcadeRoomExit } from "../../../hooks/arcade/useArcadeRoomExit";
import StudentAdSlot from "../../student/StudentAdSlot.jsx";

const HUD_CONTROL_H = "h-9";
const HUD_CHIP =
  "rounded-lg border border-white/20 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-white/[0.11] active:scale-[0.97]";
const HUD_BTN_BASE = `flex ${HUD_CONTROL_H} shrink-0 items-center justify-center ${HUD_CHIP}`;

/** @param {{ onLeave: () => void, disabled?: boolean, busy?: boolean }} props */
function PlaceholderLeaveRow({ onLeave, disabled = false, busy = false }) {
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

/** @param {{ onBack: () => void, balance: number | null, title: string }} props */
function PlaceholderHud({ onBack, balance, title }) {
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
      >
        <span className="text-xs font-extrabold leading-none tracking-wide text-white sm:text-sm">חזרה</span>
      </button>

      <div className="min-w-0 flex-1 px-0.5 text-center">
        <h1 className="truncate text-base font-extrabold leading-tight text-white drop-shadow-sm sm:text-lg lg:text-xl">
          {title}
        </h1>
      </div>

      <div
        className={`flex ${HUD_CONTROL_H} min-w-[4.75rem] max-w-[9rem] shrink-0 items-center gap-1 rounded-lg border border-amber-500/35 bg-black/55 px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:min-w-[5rem] sm:px-2.5`}
        title="יתרת מטבעות"
      >
        <img src="/images/coin.png" alt="" className="h-6 w-6 shrink-0 object-contain sm:h-7 sm:w-7" />
        <span className="min-w-0 truncate font-mono text-sm font-bold tabular-nums leading-none text-amber-100 sm:text-base">
          {balance === null ? "…" : balance}
        </span>
      </div>
    </header>
  );
}

/** @param {{ roomId: string, title: string }} props */
export default function ArcadePlaceholderScreen({ roomId, title }) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const { placeholder, room, players, bundleLoaded, bundleError, stopPolling } = useArcadePlaceholderSession({ roomId });

  const [balance, setBalance] = useState(/** @type {number|null} */ (null));
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

  const board =
    placeholder?.board && typeof placeholder.board === "object"
      ? /** @type {Record<string, unknown>} */ (placeholder.board)
      : {};
  const message =
    typeof board.message === "string" && board.message.trim()
      ? board.message
      : "גרסת ארקייד - חיבור חדר פעיל; חוקי משחק מלאים יתווספו בשלב הבא.";

  const waiting = room?.status === "waiting";
  const phase = placeholder?.phase != null ? String(placeholder.phase) : "";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950 px-2 pt-2">
      <PlaceholderHud onBack={goBack} balance={balance} title={title} />

      <div className="min-h-0 flex flex-1 flex-col overflow-y-auto px-1 pb-4 pt-4">
        {bundleError ? (
          <p className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">{bundleError}</p>
        ) : null}

        {waiting ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-6 text-center text-amber-100">
            <p className="text-lg font-bold">ממתינים לשחקן נוסף…</p>
            <p className="mt-2 text-sm text-amber-200/90">כשהחדר יתמלא ייפתח מצב משחק</p>
          </div>
        ) : null}

        {!waiting && bundleLoaded && placeholder ? (
          <div className="space-y-4 rounded-xl border border-white/10 bg-zinc-900/40 p-4 text-zinc-100">
            <p className="text-sm leading-relaxed text-zinc-300">{message}</p>
            {phase === "finished" ? (
              <p className="text-amber-200">הסשן הסתיים</p>
            ) : (
              <p className="text-xs text-zinc-500">מזהה סשן: {String(placeholder.sessionId || "").slice(0, 8)}…</p>
            )}
            {Array.isArray(players) && players.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-semibold text-zinc-200">שחקנים בחדר</p>
                <ul className="space-y-1 text-sm text-zinc-300">
                  {players.map((p) => (
                    <li key={String(p.student_id)}>
                      {String(p.display_name || "").trim() || "שחקן"} - מושב {(Number(p.seat_index) || 0) + 1}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {!waiting && bundleLoaded && !placeholder ? (
          <p className="text-center text-sm text-zinc-400">טוען מצב משחק…</p>
        ) : null}
      </div>

      {room ? <PlaceholderLeaveRow onLeave={onLeaveRoom} busy={leaveBusy} disabled={!String(roomId || "").trim()} /> : null}
      <StudentAdSlot variant="dvh" dataAdSlot="arcade-ad-reserved" />
    </div>
  );
}
