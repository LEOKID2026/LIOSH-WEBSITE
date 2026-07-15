"use client";

import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BINGO_PRIZE_KEYS } from "../../../lib/arcade/bingo/ov2BingoEngine";
import { getOv2BingoSeatStyle } from "../../../lib/arcade/bingo/ov2BingoSeatColors";
import { OV2_BINGO_PLAY_MODE, OV2_BINGO_PRODUCT_GAME_ID } from "../../../lib/arcade/bingo/ov2BingoSessionAdapter";
import { useArcadeBingoSession } from "../../../hooks/useArcadeBingoSession";
import { useArcadeRoomExit } from "../../../hooks/arcade/useArcadeRoomExit";
import ArcadeGameSocialDock from "../club/ArcadeGameSocialDock.jsx";
import Ov2BingoCard from "./Ov2BingoCard";
import Ov2BingoFinishModal from "./Ov2BingoFinishModal";
import Ov2GameStatusStrip from "./Ov2GameStatusStrip";
import StudentAdSlot from "../../student/StudentAdSlot.jsx";

/** @param {number|null|undefined} ms */
function fmtCountdown(ms) {
  if (ms == null) return "-";
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s >= 120) return `${Math.ceil(s / 60)} דק'`;
  if (s >= 60) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return `${s} שנ'`;
}

/**
 * @param {{ roomId: string }} props
 */
export default function ArcadeBingoScreen({ roomId: roomIdProp }) {
  const router = useRouter();
  const roomId = String(roomIdProp || "").trim();

  const [bundle, setBundle] = useState(/** @type {Record<string, unknown>|null} */ (null));
  const [bundleErr, setBundleErr] = useState("");

  const [exitErr, setExitErr] = useState("");

  const reloadBundle = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/arcade/rooms/${encodeURIComponent(roomId)}/snapshot`, {
        credentials: "same-origin",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        setBundle(null);
        setBundleErr(typeof j?.error === "string" ? j.error : "לא ניתן לטעון את החדר");
        return;
      }
      setBundle(j);
      setBundleErr("");
    } catch (e) {
      setBundleErr(e instanceof Error ? e.message : "שגיאת רשת");
      setBundle(null);
    }
  }, [roomId]);

  useEffect(() => {
    void reloadBundle();
  }, [reloadBundle]);

  const contextInput = useMemo(() => {
    if (!bundle?.room) return undefined;
    const r = /** @type {Record<string, unknown>} */ (bundle.room);
    const players = Array.isArray(bundle.players) ? bundle.players : [];
    const membership = bundle.membership && typeof bundle.membership === "object" ? bundle.membership : null;
    const selfId = membership?.student_id != null ? String(membership.student_id) : "";
    const selfPl = players.find((p) => p && String(p.student_id) === selfId);
    const status = r.status != null ? String(r.status) : "";
    const lifecycle =
      status === "waiting" ? "lobby" : status === "active" ? "active" : status === "finished" ? "finished" : "active";
    const gs = bundle.gameSession && typeof bundle.gameSession === "object" ? bundle.gameSession : null;
    return {
      room: {
        id: String(r.id ?? ""),
        game_key: r.game_key != null ? String(r.game_key) : "bingo",
        host_participant_key: String(r.host_student_id ?? ""),
        lifecycle_phase: lifecycle,
        match_seq: 1,
        product_game_id: OV2_BINGO_PRODUCT_GAME_ID,
        active_session_id: gs?.id != null ? String(gs.id) : null,
      },
      members: players.map((p) => ({
        participant_key: String(p.student_id ?? ""),
        display_name: String(p.display_name ?? ""),
        seat_index: Number(p.seat_index),
        is_ready: true,
        wallet_state: "committed",
        amount_locked: Math.floor(Number(r.entry_cost ?? 0)),
      })),
      self: {
        participant_key: selfId,
        display_name: String(selfPl?.display_name ?? "").trim(),
      },
      reloadRoomContext: reloadBundle,
    };
  }, [bundle, reloadBundle]);

  const session = useArcadeBingoSession(contextInput);
  const { vm, actions, selfKey, callNextPreviewNumber, resetPreviewRound, onToggleMark, previewDisabledReasonCallNext, stopLivePolling } =
    session;

  const { exitToLobby, leaveBusy: exitBusy } = useArcadeRoomExit({
    roomId,
    stopPolling: stopLivePolling,
  });

  const onLeaveToLobby = exitToLobby;
  const leaveToLobbyBusy = exitBusy;
  const [claimPendingKey, setClaimPendingKey] = useState(/** @type {string|null} */ (null));
  const claimFlightRef = useRef(false);
  const [finishModalDismissedForSessionId, setFinishModalDismissedForSessionId] = useState("");
  const [rematchBusy, setRematchBusy] = useState(false);
  const [startNextBusy, setStartNextBusy] = useState(false);
  const pk = selfKey != null ? String(selfKey).trim() : "";
  const hostPk =
    contextInput?.room && typeof contextInput.room === "object" && contextInput.room.host_participant_key != null
      ? String(contextInput.room.host_participant_key).trim()
      : "";
  const isHost = Boolean(pk && hostPk && pk === hostPk);

  const isRoomShell = vm.playMode === OV2_BINGO_PLAY_MODE.LIVE_ROOM_NO_MATCH_YET;
  const isLiveMatch = vm.playMode === OV2_BINGO_PLAY_MODE.LIVE_MATCH_ACTIVE;
  const stripTone = isLiveMatch ? "emerald" : isRoomShell ? "amber" : "neutral";
  const stripTitle = isLiveMatch ? "בינגו · משחק חי" : isRoomShell ? "בינגו · חדר" : "בינגו";

  const prizeLabels = useMemo(
    () => ({
      row1: "שורה 1",
      row2: "שורה 2",
      row3: "שורה 3",
      row4: "שורה 4",
      row5: "שורה 5",
      full: "מלא",
    }),
    []
  );

  const finishSessionId = useMemo(() => {
    const s = vm.authoritativeSnapshot?.sessionId;
    return s != null && String(s).trim() ? String(s).trim() : "";
  }, [vm.authoritativeSnapshot?.sessionId]);

  useEffect(() => {
    setFinishModalDismissedForSessionId("");
  }, [finishSessionId]);

  const finishModalClaims = useMemo(() => {
    return (vm.claims || []).map(c => ({
      prizeKey: String(c.prizeKey || "").trim(),
      claimedByName: String(c.claimedByName || "").trim() || "שחקן",
      amount: Math.floor(Number(c.amount) || 0),
      seatIndex: c.seatIndex,
    }));
  }, [vm.claims]);

  const showFinishModal = Boolean(
    vm.isLive &&
      isLiveMatch &&
      vm.sessionPhase === "finished" &&
      finishSessionId &&
      finishModalDismissedForSessionId !== finishSessionId
  );

  const claimByPrizeKey = useMemo(() => {
    /** @type {Record<string, { seatIndex: number, amount: number, claimedByName: string }>} */
    const m = {};
    const seatByPk = new Map(
      (vm.membersVm || []).map(mem => [String(mem?.participantKey || "").trim(), mem?.seatIndex])
    );
    for (const c of vm.claims || []) {
      const pk = String(c.prizeKey || "").trim();
      if (!pk) continue;
      const claimer = String(c.claimedByParticipantKey || "").trim();
      let seatIndex = Number(c.seatIndex);
      const memSeat = claimer ? seatByPk.get(claimer) : null;
      if (memSeat != null && Number.isInteger(memSeat) && memSeat >= 0 && memSeat <= 7) {
        seatIndex = memSeat;
      } else if (!Number.isInteger(seatIndex) || seatIndex < 0 || seatIndex > 7) {
        seatIndex = 0;
      }
      m[pk] = {
        seatIndex,
        amount: Number(c.amount) || 0,
        claimedByName: String(c.claimedByName || "").trim(),
      };
    }
    return m;
  }, [vm.claims, vm.membersVm]);

  const seatSlots = useMemo(() => {
    const slots = [];
    for (let i = 0; i < 8; i++) {
      const member = vm.membersVm.find(m => m.seatIndex === i) || null;
      slots.push({ seatIndex: i, member });
    }
    return slots;
  }, [vm.membersVm]);

  const onRequestRematch = useCallback(async () => {
    if (!roomId || rematchBusy) return;
    setRematchBusy(true);
    setExitErr("");
    try {
      const r = await actions.requestRematch();
      if (!r.ok) setExitErr(r.error || "בקשת משחק חוזר נכשלה");
    } finally {
      setRematchBusy(false);
    }
  }, [roomId, rematchBusy, actions]);

  const onCancelRematch = useCallback(async () => {
    if (!roomId || rematchBusy) return;
    setRematchBusy(true);
    setExitErr("");
    try {
      const r = await actions.cancelRematch();
      if (!r.ok) setExitErr(r.error || "לא ניתן לבטל משחק חוזר");
    } finally {
      setRematchBusy(false);
    }
  }, [roomId, rematchBusy, actions]);

  const onStartNext = useCallback(async () => {
    if (!roomId || !isHost || startNextBusy) return;
    setStartNextBusy(true);
    setExitErr("");
    try {
      const r = await actions.startNextMatch();
      if (!r.ok) {
        setExitErr(r.error || "לא ניתן להתחיל משחק הבא");
        return;
      }
      await router.push("/student/arcade");
    } catch (e) {
      setExitErr(e?.message || String(e) || "לא ניתן להתחיל משחק הבא.");
    } finally {
      setStartNextBusy(false);
    }
  }, [roomId, isHost, startNextBusy, actions, router]);

  const onExitToLobby = exitToLobby;

  const onClaim = useCallback(
    async prizeKey => {
      const pk = String(prizeKey ?? "").trim();
      if (!pk || claimFlightRef.current) return;
      claimFlightRef.current = true;
      setClaimPendingKey(pk);
      try {
        await actions.claimPrize(pk);
      } finally {
        claimFlightRef.current = false;
        setClaimPendingKey(null);
      }
    },
    [actions]
  );

  const cardFooterHint = useMemo(() => {
    if (!vm.isLive) return null;
    if (!vm.cardIsAuthoritative) return "ישבו במושב בלובי כדי לראות את הכרטיס שלכם לסיבוב הזה.";
    return null;
  }, [vm.isLive, vm.cardIsAuthoritative]);

  const phaseHeader = useMemo(() => {
    const life = vm.roomLifecyclePhase || "";
    const sp = vm.sessionPhase || "";
    const snapSid =
      vm.authoritativeSnapshot && vm.authoritativeSnapshot.sessionId != null
        ? String(vm.authoritativeSnapshot.sessionId).trim()
        : "";
    if (isLiveMatch && sp === "playing") return "משחק פעיל";
    if (isLiveMatch && sp === "finished") return "הסתיים";
    if (life === "lobby") return "ממתינים לשחקנים";
    if (life === "pending_start" || life === "pending_stakes") return "ממתינים להימור מכל השחקנים";
    if (life === "active" && !vm.roomActiveSessionId && !snapSid) return "ממתינים שהמארח יפתח בינגו";
    if (life === "active" && (vm.roomActiveSessionId || snapSid)) return "משחק";
    return sp || life || "-";
  }, [isLiveMatch, vm.roomLifecyclePhase, vm.sessionPhase, vm.roomActiveSessionId, vm.authoritativeSnapshot]);

  const playingLive = Boolean(vm.isLive && isLiveMatch && vm.sessionPhase === "playing");
  const isFinishedLive = Boolean(vm.isLive && isLiveMatch && vm.sessionPhase === "finished");
  const liveExceptionUi = Boolean(vm.isLive && !playingLive && !isFinishedLive);

  if (!roomId) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center p-4 text-sm text-zinc-400" dir="rtl">
        חסר מזהה חדר
      </div>
    );
  }

  if (bundleErr && !bundle) {
    return (
      <div
        className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-zinc-300"
        dir="rtl"
      >
        <p>{bundleErr}</p>
        <button type="button" className="text-sky-400 underline" onClick={() => void reloadBundle()}>
          נסה שוב
        </button>
      </div>
    );
  }

  if (!bundle?.room) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center p-4 text-sm text-zinc-400" dir="rtl">
        טוען…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col gap-0.5 overflow-hidden overscroll-y-contain px-0.5 sm:gap-1 sm:px-1">
      <Ov2GameStatusStrip title={stripTitle} subtitle={vm.phaseLine} tone={stripTone} compact={Boolean(vm.isLive)} />

      {vm.isLive ? (
        <ArcadeGameSocialDock
          roomId={roomId}
          gameSession={
            bundle?.gameSession && typeof bundle.gameSession === "object" ? bundle.gameSession : null
          }
        />
      ) : null}

      {vm.isLive && onLeaveToLobby ? (
        <div className="flex shrink-0 justify-end px-0.5 pt-0.5">
          <button
            type="button"
            disabled={leaveToLobbyBusy}
            onClick={() => void onLeaveToLobby()}
            className="text-[10px] font-semibold text-red-200/95 underline decoration-red-400/50 disabled:opacity-45 sm:text-[11px]"
          >
            {leaveToLobbyBusy ? "יוצא…" : "עזוב משחק"}
          </button>
        </div>
      ) : null}

      <div
        className="shrink-0 overflow-x-auto rounded-lg border border-white/10 bg-black/35 py-0.5 [scrollbar-width:thin] sm:py-1"
        aria-label="מושבים"
      >
        <div className="flex min-w-max gap-1 px-1">
          {seatSlots.map(({ seatIndex, member }) => {
            const seatStyle = getOv2BingoSeatStyle(seatIndex);
            const you = Boolean(selfKey && member?.participantKey === selfKey);
            const isCaller = vm.callerSeatIndex != null && vm.callerSeatIndex === seatIndex;
            const isWinner =
              Boolean(vm.winner?.participantKey && member?.participantKey && vm.winner.participantKey === member.participantKey);
            const label = member?.displayName?.trim() || (member ? "שחקן" : "ריק");
            return (
              <div
                key={seatIndex}
                className={[
                  "flex min-h-[2.5rem] w-[5.25rem] shrink-0 flex-col justify-center rounded-md border px-1.5 py-1 text-[9px] leading-tight sm:min-h-[2.8125rem] sm:w-[6rem] sm:py-1.5 sm:text-[10px]",
                  member
                    ? [seatStyle.border, seatStyle.bg].join(" ")
                    : [seatStyle.border, "bg-black/35 text-zinc-400"].join(" "),
                  you ? "ring-1 ring-sky-400/80" : "",
                  isCaller ? "ring-1 ring-amber-300/70" : "",
                  isWinner ? "ring-1 ring-emerald-400/60" : "",
                ].join(" ")}
                title={member ? `${label}${member.isReady ? " · מוכן" : ""}` : `מושב ${seatIndex + 1} · פנוי`}
              >
                <div className={`truncate font-semibold ${member ? seatStyle.text : "text-zinc-400"}`}>{label}</div>
                <div className="mt-1 text-[8px]">
                  {member ? (
                    <span className={member.isReady ? "text-emerald-300" : "text-zinc-500"}>
                      {member.isReady ? "מוכן" : "ממתין"}
                    </span>
                  ) : (
                    <span className="text-zinc-600">פנוי</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {playingLive ? (
        <div
          className="flex shrink-0 flex-nowrap items-stretch gap-2 overflow-x-auto rounded-lg border border-white/10 bg-black/30 px-2 py-2 [scrollbar-width:thin] sm:gap-3 sm:px-4 sm:py-3"
          aria-label="סטטיסטיקות משחק חי"
        >
          <span className="flex h-[2.25rem] max-h-[2.25rem] min-w-[5.5rem] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-white/10 bg-black/40 px-3 py-0 text-xs leading-tight text-zinc-400 sm:h-[2.5rem] sm:max-h-[2.5rem] sm:min-w-0 sm:px-4 sm:text-sm">
            <span className="font-semibold text-zinc-500">אחרון</span>
            <span className="font-mono font-semibold text-amber-100">{vm.lastCalled ?? "-"}</span>
          </span>
          <span className="flex h-[2.25rem] max-h-[2.25rem] min-w-[5.5rem] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-white/10 bg-black/40 px-3 py-0 text-xs leading-tight text-zinc-400 sm:h-[2.5rem] sm:max-h-[2.5rem] sm:min-w-0 sm:px-4 sm:text-sm">
            <span className="font-semibold text-zinc-500">הבא</span>
            <span className="font-mono font-semibold text-zinc-100">{fmtCountdown(vm.msUntilNextCall)}</span>
          </span>
          <span className="flex h-[2.25rem] max-h-[2.25rem] min-w-[5.5rem] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-white/10 bg-black/40 px-3 py-0 text-xs leading-tight text-zinc-400 sm:h-[2.5rem] sm:max-h-[2.5rem] sm:min-w-0 sm:px-4 sm:text-sm">
            <span className="font-semibold text-zinc-500">חפיסה</span>
            <span className="font-mono font-semibold text-zinc-200">
              {vm.deckRemaining}/{vm.deckTotal}
            </span>
          </span>
        </div>
      ) : null}

      {isFinishedLive ? (
        <div
          className="flex shrink-0 flex-nowrap items-stretch gap-2 overflow-x-auto rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 [scrollbar-width:thin] sm:gap-3 sm:px-3 sm:py-2"
          aria-label="סיכום תוצאות משחק"
        >
          <span className="flex h-[2rem] max-h-[2rem] min-w-[5rem] flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-white/10 bg-black/40 px-2 py-0 text-[10px] leading-tight text-zinc-400 sm:h-[2.25rem] sm:max-h-[2.25rem] sm:min-w-0 sm:text-xs">
            <span className="font-semibold text-zinc-500">אחרון</span>
            <span className="font-mono font-semibold text-amber-100">{vm.lastCalled ?? "-"}</span>
          </span>
          <span className="flex h-[2rem] max-h-[2rem] min-w-[5rem] flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-white/10 bg-black/40 px-2 py-0 text-[10px] leading-tight text-zinc-400 sm:h-[2.25rem] sm:max-h-[2.25rem] sm:min-w-0 sm:text-xs">
            <span className="font-semibold text-zinc-500">הבא</span>
            <span className="font-mono font-semibold text-zinc-300">-</span>
          </span>
          <span className="flex h-[2rem] max-h-[2rem] min-w-[5rem] flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-white/10 bg-black/40 px-2 py-0 text-[10px] leading-tight text-zinc-400 sm:h-[2.25rem] sm:max-h-[2.25rem] sm:min-w-0 sm:text-xs">
            <span className="font-semibold text-zinc-500">חפיסה</span>
            <span className="font-mono font-semibold text-zinc-200">
              {vm.deckRemaining}/{vm.deckTotal}
            </span>
          </span>
        </div>
      ) : null}

      {vm.isLive && liveExceptionUi ? (
        <div className="shrink-0 rounded-lg border border-white/10 bg-black/35 px-2 py-1.5 sm:flex sm:items-start sm:gap-4 sm:py-2">
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-[10px]">מצב</div>
            <div className="mt-0.5 text-[11px] font-semibold leading-snug text-zinc-100 sm:text-xs">{phaseHeader}</div>
            {vm.phaseLine ? <p className="mt-0.5 text-[9px] leading-snug text-zinc-400 sm:text-[10px]">{vm.phaseLine}</p> : null}
          </div>
          {!playingLive && isLiveMatch && vm.sessionPhase !== "playing" ? (
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/10 pt-2 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <div>
                <div className="text-[9px] font-semibold text-zinc-500">נקרא לאחרונה</div>
                <div className="font-mono text-sm text-amber-100">{vm.lastCalled ?? "-"}</div>
              </div>
              <div>
                <div className="text-[9px] font-semibold text-zinc-500">הבא</div>
                <div className="font-mono text-sm text-zinc-100">{fmtCountdown(vm.msUntilNextCall)}</div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {!vm.isLive ? (
        <div className="grid shrink-0 gap-1 rounded-lg border border-white/10 bg-black/30 px-1.5 py-1 sm:grid-cols-3 sm:px-2 sm:py-1.5">
          <div className="text-[9px] text-zinc-300 sm:text-[10px]">
            <div className="font-semibold text-zinc-500">שלב</div>
            <div className="mt-0.5 text-zinc-100">{phaseHeader}</div>
          </div>
          <div className="text-[9px] text-zinc-300 sm:text-[10px]">
            <div className="font-semibold text-zinc-500">אחרון</div>
            <div className="mt-0.5 font-mono text-xs text-amber-100 sm:text-sm">{vm.lastCalled ?? "-"}</div>
          </div>
          <div className="text-[9px] text-zinc-300 sm:text-[10px]">
            <div className="font-semibold text-zinc-500">הבא</div>
            <div className="mt-0.5 font-mono text-xs text-zinc-100 sm:text-sm">-</div>
          </div>
        </div>
      ) : null}

      {!vm.isLive ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 rounded-lg border border-white/10 bg-black/30 px-1.5 py-1">
          <div className="mr-auto text-[10px] text-zinc-500">
            חפיסה {vm.deckRemaining}/{vm.deckTotal}
          </div>
          <button
            type="button"
            onClick={() => resetPreviewRound()}
            className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white sm:py-1"
          >
            איפוס
          </button>
          <button
            type="button"
            onClick={() => callNextPreviewNumber()}
            disabled={vm.deckRemaining <= 0 || Boolean(previewDisabledReasonCallNext)}
            title={previewDisabledReasonCallNext || undefined}
            className="rounded-md border border-amber-500/40 bg-amber-900/40 px-2 py-0.5 text-[10px] font-semibold text-amber-100 disabled:opacity-40 sm:py-1"
          >
            קרא הבא
          </button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden sm:gap-1 lg:grid lg:h-full lg:min-h-0 lg:grid-cols-5 lg:grid-rows-1 lg:auto-rows-[minmax(0,1fr)] lg:gap-1.5">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-black/25 p-1 lg:col-span-3 lg:min-h-0 lg:h-full">
          <div className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-[10px]">הכרטיס שלך</div>
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-0.5 sm:py-1">
            <Ov2BingoCard
              card={vm.card}
              called={vm.called}
              marks={vm.marks}
              onToggleMark={onToggleMark}
              disabled={vm.isLive && !vm.cardIsAuthoritative}
            />
          </div>
          {cardFooterHint ? (
            <p className="shrink-0 text-center text-[9px] text-amber-200/90 sm:text-[10px]">{cardFooterHint}</p>
          ) : null}
        </div>

        <div className="flex min-h-0 min-w-0 max-h-[min(44svh,14rem)] shrink overflow-y-auto flex-col gap-0.5 sm:max-h-none sm:shrink-0 sm:overflow-y-visible sm:gap-1 lg:col-span-2 lg:flex lg:h-full lg:max-h-none lg:min-h-0 lg:shrink-0 lg:flex-col lg:overflow-hidden">
          <div className="flex h-[min(7.875rem,32svh)] max-h-[min(7.875rem,34svh)] shrink-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-black/25 px-1.5 py-1 sm:h-[11.5rem] sm:max-h-[11.5rem] sm:px-2 sm:py-1.5 lg:max-h-[min(30vh,10.5rem)] lg:shrink-0">
            <div className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-[10px]">
              מספרים שנקראו
            </div>
            <div className="mt-0.5 min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5 [scrollbar-width:thin]">
              {vm.called.length ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(1.5625rem,1fr))] gap-[3px] sm:grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] sm:gap-2">
                  {vm.called.map((n, i) => (
                    <span
                      key={`${n}-${i}`}
                      className={`rounded border px-1 py-0.5 text-center text-[10px] font-semibold leading-tight sm:flex sm:min-h-0 sm:items-center sm:justify-center sm:px-1.5 sm:py-1 sm:text-sm sm:leading-normal ${
                        i === vm.called.length - 1
                          ? "border-amber-400 bg-amber-700/85 text-white"
                          : "border-white/10 bg-white/10 text-zinc-200"
                      }`}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[9px] text-zinc-500 sm:text-[10px]">
                  {vm.isLive ? "ממתינים שהקורא ימשוך מספר." : "הצטרפו לחדר בינגו מחדרים משותפים כדי לשחק חי."}
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0 rounded-lg border border-white/10 bg-black/25 px-1.5 py-1 sm:px-2 sm:py-1.5 lg:shrink-0">
            <div className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-[10px]">תביעת פרס</div>
            <div className="mt-0.5 grid grid-cols-3 gap-0.5 sm:grid-cols-6 sm:gap-1">
              {BINGO_PRIZE_KEYS.map(pk => {
                const disableReason = vm.prizeDisabledByKey[pk];
                const claimed = claimByPrizeKey[pk];
                const winStyle = claimed ? getOv2BingoSeatStyle(claimed.seatIndex).prize : "";
                const hardBlocked =
                  !isLiveMatch ||
                  vm.sessionPhase !== "playing" ||
                  (disableReason != null && disableReason !== "כבר נתבע");
                const disabled = hardBlocked || Boolean(claimed) || claimPendingKey !== null;
                return (
                  <button
                    key={pk}
                    type="button"
                    disabled={disabled}
                    title={
                      claimed
                        ? `ניצח · מושב ${claimed.seatIndex + 1}${claimed.claimedByName ? ` · ${claimed.claimedByName}` : ""}`
                        : disableReason != null
                          ? disableReason
                          : `תביע ${prizeLabels[pk]}`
                    }
                    onClick={() => void onClaim(pk)}
                    className={[
                      "rounded-md border px-1 py-1 text-[9px] font-semibold sm:py-1.5 sm:text-[10px]",
                      claimed
                        ? `${winStyle} cursor-not-allowed opacity-95`
                        : hardBlocked
                          ? "cursor-not-allowed border-white/10 bg-white/5 text-zinc-500 opacity-80"
                          : "border-white/15 bg-black/30 text-zinc-200 hover:bg-white/10",
                    ].join(" ")}
                  >
                    {prizeLabels[pk]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Ov2BingoFinishModal
        open={showFinishModal}
        onDismiss={() => setFinishModalDismissedForSessionId(finishSessionId)}
        prizeLabels={prizeLabels}
        claims={finishModalClaims}
        winner={vm.winner}
        walkoverPayoutAmount={vm.walkoverPayoutAmount ?? null}
        vaultClaimBusy={false}
        selfKey={pk}
        isHost={isHost}
        canRequestRematch={Boolean(vm.canRequestRematch)}
        canCancelRematch={Boolean(vm.canCancelRematch)}
        canStartNextMatch={Boolean(vm.canStartNextMatch)}
        rematchBusy={rematchBusy}
        startNextBusy={startNextBusy}
        exitBusy={exitBusy}
        exitErr={exitErr}
        onRequestRematch={onRequestRematch}
        onCancelRematch={onCancelRematch}
        onStartNext={onStartNext}
        onLeaveTable={onExitToLobby}
      />

      <StudentAdSlot variant="dvh" dataAdSlot="arcade-ad-reserved" />
    </div>
  );
}
