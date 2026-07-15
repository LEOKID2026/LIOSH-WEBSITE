import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyPreviewMark,
  BINGO_PRIZE_KEYS,
  buildDeck,
  canClaimPrize,
  computePreviewLineCompletion,
  generateCard,
  applyMark,
  isFullComplete,
  isRowComplete,
  makeEmptyMarks,
} from "../lib/arcade/bingo/ov2BingoEngine";
import {
  callOv2BingoNext,
  cancelOv2BingoRematch,
  claimOv2BingoPrize,
  coalesceOv2BingoLiveSnapshots,
  fetchOv2BingoLiveRoundSnapshot,
  normalizeOv2BingoAuthoritativeSnapshot,
  normalizeMemberRow,
  openOv2BingoSession,
  requestOv2BingoRematch,
  resolveOv2BingoSeatCard,
  OV2_BINGO_PLAY_MODE,
  OV2_BINGO_PRODUCT_GAME_ID,
  resolveOv2BingoPlayMode,
  startOv2BingoNextMatch,
  subscribeOv2BingoAuthoritativeSnapshot,
} from "../lib/arcade/bingo/ov2BingoSessionAdapter";
import {
  loadOv2BingoMarks,
  ov2BingoMarksStorageKey,
  reconcileBingoMarksToCalled,
  saveOv2BingoMarks,
} from "../lib/arcade/bingo/ov2BingoMarksStorage";
import {
  clearArcadeActiveRoom,
  registerArcadeRoomPollStop,
  setArcadeActiveRoom,
} from "../lib/arcade/client/arcadeRoomLifecycle.client.js";
import { useArcadeRoomAccessLostRedirect } from "./arcade/useArcadeRoomAccessLostRedirect.js";

/** @typedef {import("../lib/arcade/bingo/ov2BingoSessionAdapter").Ov2BingoAuthoritativeSnapshot} Ov2BingoAuthoritativeSnapshot */

const OV2_BINGO_GAME_KEY = "bingo";

function initialRoundState() {
  return {
    marks: makeEmptyMarks(),
    called: /** @type {number[]} */ ([]),
    deckPos: 0,
  };
}

function previewDisabledReason(vm) {
  if (vm.deckRemaining <= 0) return "חפיסת הקלפים ריקה";
  return null;
}

/**
 * @param {null|undefined|{
 *   room?: object,
 *   members?: unknown[],
 *   self?: { participant_key?: string, display_name?: string },
 *   reloadRoomContext?: () => void | Promise<void>,
 * }} baseContext
 */
export function useArcadeBingoSession(baseContext) {
  const room = baseContext?.room && typeof baseContext.room === "object" ? baseContext.room : null;
  const roomId = room?.id != null ? String(room.id) : null;
  const roomProductId = room?.product_game_id != null ? String(room.product_game_id) : null;
  const roomGameKey = room?.game_key != null ? String(room.game_key).trim().toLowerCase() : OV2_BINGO_GAME_KEY;
  const isBingoRoom =
    roomProductId === OV2_BINGO_PRODUCT_GAME_ID &&
    (!roomGameKey || roomGameKey === OV2_BINGO_GAME_KEY);
  const members = Array.isArray(baseContext?.members) ? baseContext.members : [];
  const selfKey = baseContext?.self?.participant_key?.trim() || null;
  const reloadRoomContext = baseContext?.reloadRoomContext;

  /** @type {Ov2BingoAuthoritativeSnapshot|null} */
  const [liveSnapshot, setLiveSnapshot] = useState(null);
  const [roomAccessLost, setRoomAccessLost] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const callInFlightRef = useRef(false);
  const lastAutoCallKeyRef = useRef(/** @type {string|null} */ (null));
  const livePollStopRef = useRef(/** @type {(() => void) | null} */ (null));

  const playMode = useMemo(() => {
    return resolveOv2BingoPlayMode(
      roomId ? { room: { id: roomId } } : null,
      liveSnapshot
    );
  }, [roomId, liveSnapshot]);

  const previewSeed = `${roomId ?? "no-room"}:ov2-bingo-preview:v1`;
  const previewCard = useMemo(() => generateCard(previewSeed), [previewSeed]);
  const previewDeck = useMemo(() => buildDeck(previewSeed), [previewSeed]);

  const [previewRound, setPreviewRound] = useState(initialRoundState);
  const [liveMarks, setLiveMarks] = useState(() => makeEmptyMarks());
  const loadedMarksStorageKeyRef = useRef("");

  useEffect(() => {
    setPreviewRound(initialRoundState());
  }, [previewSeed]);

  const marksStorageKey = useMemo(() => {
    if (!roomId || !selfKey || !liveSnapshot?.sessionId) return "";
    return ov2BingoMarksStorageKey(roomId, liveSnapshot.sessionId, selfKey);
  }, [roomId, selfKey, liveSnapshot?.sessionId]);

  useEffect(() => {
    if (!roomId || !isBingoRoom) {
      livePollStopRef.current?.();
      livePollStopRef.current = null;
      setLiveSnapshot(null);
      setRoomAccessLost(false);
      lastAutoCallKeyRef.current = null;
      return undefined;
    }
    let cancelled = false;
    setRoomAccessLost(false);
    setArcadeActiveRoom({ roomId, gameKey: OV2_BINGO_GAME_KEY });

    void (async () => {
      const result = await fetchOv2BingoLiveRoundSnapshot(roomId, { viewerParticipantKey: selfKey ?? "" });
      if (cancelled) return;
      if (!result.ok) {
        if (result.forbidden) {
          clearArcadeActiveRoom(roomId);
          setRoomAccessLost(true);
        } else {
          setLiveSnapshot(null);
        }
        return;
      }
      setLiveSnapshot(prev => coalesceOv2BingoLiveSnapshots(prev, result.snapshot, selfKey ?? ""));
    })();

    const unsub = subscribeOv2BingoAuthoritativeSnapshot(roomId, {
      viewerParticipantKey: selfKey ?? "",
      onSnapshot: s => {
        if (!cancelled) setLiveSnapshot(prev => coalesceOv2BingoLiveSnapshots(prev, s, selfKey ?? ""));
      },
      onAccessLost: () => {
        if (cancelled) return;
        clearArcadeActiveRoom(roomId);
        setRoomAccessLost(true);
      },
    });
    livePollStopRef.current = unsub;

    return () => {
      cancelled = true;
      unsub();
      livePollStopRef.current = null;
      clearArcadeActiveRoom(roomId);
    };
  }, [roomId, isBingoRoom, selfKey]);

  const stopLivePolling = useCallback(() => {
    livePollStopRef.current?.();
    livePollStopRef.current = null;
  }, []);

  useEffect(() => registerArcadeRoomPollStop(stopLivePolling), [stopLivePolling]);

  useArcadeRoomAccessLostRedirect(roomAccessLost, stopLivePolling);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const t = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  const myLiveSeatIndex = useMemo(() => {
    if (!liveSnapshot || !selfKey) return null;
    const m = liveSnapshot.members.find(mm => mm.participantKey === selfKey);
    return m?.seatIndex ?? null;
  }, [liveSnapshot, selfKey]);

  const liveCard = useMemo(() => {
    if (!liveSnapshot || myLiveSeatIndex == null) return null;
    return resolveOv2BingoSeatCard(
      liveSnapshot.deckCardsBySeat,
      liveSnapshot.seed,
      liveSnapshot.roundId,
      myLiveSeatIndex
    );
  }, [liveSnapshot, myLiveSeatIndex]);

  useEffect(() => {
    const activeLive =
      playMode === OV2_BINGO_PLAY_MODE.LIVE_MATCH_ACTIVE && Boolean(marksStorageKey) && Boolean(liveCard);

    if (!activeLive) {
      if (playMode !== OV2_BINGO_PLAY_MODE.LIVE_MATCH_ACTIVE) {
        loadedMarksStorageKeyRef.current = "";
      }
      if (!marksStorageKey || !liveCard) {
        setLiveMarks(makeEmptyMarks());
      }
      return;
    }

    const called = liveSnapshot?.calledNumbers ?? [];
    if (loadedMarksStorageKeyRef.current !== marksStorageKey) {
      loadedMarksStorageKeyRef.current = marksStorageKey;
      const raw = loadOv2BingoMarks(marksStorageKey);
      const base = raw && raw.length === 25 ? [...raw] : makeEmptyMarks();
      // Avoid stripping persisted marks while `called` is still empty (e.g. first snapshot after refresh).
      setLiveMarks(called.length > 0 ? reconcileBingoMarksToCalled(liveCard, base, called) : base);
      return;
    }

    setLiveMarks(prev =>
      called.length > 0 ? reconcileBingoMarksToCalled(liveCard, prev, called) : prev
    );
  }, [playMode, marksStorageKey, liveCard, liveSnapshot?.calledNumbers]);

  const nextCallDue = useMemo(() => {
    if (!liveSnapshot?.nextCallAtIso) return true;
    const t = Date.parse(liveSnapshot.nextCallAtIso);
    if (!Number.isFinite(t)) return true;
    return nowMs >= t;
  }, [liveSnapshot, nowMs]);

  const canCallNextNow = useMemo(() => {
    if (!liveSnapshot || !nextCallDue) return false;
    return Boolean(liveSnapshot.canCallNext);
  }, [liveSnapshot, nextCallDue]);

  useEffect(() => {
    if (!roomId) return;
    if (playMode !== OV2_BINGO_PLAY_MODE.LIVE_MATCH_ACTIVE || !liveSnapshot || !selfKey) return;
    if (liveSnapshot.sessionPhase !== "playing") return;
    if (!canCallNextNow || callInFlightRef.current) return;

    const key = `${liveSnapshot.sessionId}:${liveSnapshot.revision}:${liveSnapshot.deckPosition}`;
    if (lastAutoCallKeyRef.current === key) return;

    callInFlightRef.current = true;
    lastAutoCallKeyRef.current = key;
    void (async () => {
      try {
        const r = await callOv2BingoNext(roomId, selfKey, liveSnapshot.revision);
        if (r.ok && "snapshot" in r && r.snapshot) {
          setLiveSnapshot(prev => coalesceOv2BingoLiveSnapshots(prev, r.snapshot, selfKey));
        } else {
          lastAutoCallKeyRef.current = null;
        }
      } catch {
        lastAutoCallKeyRef.current = null;
      } finally {
        callInFlightRef.current = false;
      }
    })();
  }, [playMode, liveSnapshot, selfKey, roomId, canCallNextNow]);

  const callNextPreviewNumber = useCallback(() => {
    setPreviewRound(prev => {
      if (prev.deckPos >= previewDeck.length) return prev;
      const n = previewDeck[prev.deckPos];
      return {
        marks: prev.marks,
        called: [...prev.called, n],
        deckPos: prev.deckPos + 1,
      };
    });
  }, [previewDeck]);

  const resetPreviewRound = useCallback(() => {
    setPreviewRound(initialRoundState());
  }, []);

  const onCellClick = useCallback(
    n => {
      if (playMode === OV2_BINGO_PLAY_MODE.PREVIEW_LOCAL) {
        setPreviewRound(prev => {
          const { marks: next, changed } = applyPreviewMark(previewCard, prev.marks, n, new Set(prev.called));
          if (!changed) return prev;
          return { ...prev, marks: next };
        });
        return;
      }
      if (playMode === OV2_BINGO_PLAY_MODE.LIVE_MATCH_ACTIVE && liveCard && liveSnapshot) {
        const calledSet = new Set(liveSnapshot.calledNumbers ?? []);
        if (!calledSet.has(n)) return;
        setLiveMarks(prev => {
          const { marks: next, changed } = applyMark(liveCard, prev, n);
          if (!changed) return prev;
          const key = ov2BingoMarksStorageKey(roomId ?? "", liveSnapshot.sessionId ?? "", selfKey ?? "");
          if (key) saveOv2BingoMarks(key, next);
          return next;
        });
      }
    },
    [playMode, previewCard, liveCard, liveSnapshot, roomId, selfKey]
  );

  const refreshLiveSnapshot = useCallback(async () => {
    if (!roomId || !isBingoRoom) return;
    const result = await fetchOv2BingoLiveRoundSnapshot(roomId, { viewerParticipantKey: selfKey ?? "" });
    if (!result.ok) {
      if (result.forbidden) {
        clearArcadeActiveRoom(roomId);
        setRoomAccessLost(true);
      }
      return;
    }
    setLiveSnapshot(prev => coalesceOv2BingoLiveSnapshots(prev, result.snapshot, selfKey ?? ""));
  }, [roomId, isBingoRoom, selfKey]);

  const openSession = useCallback(async () => {
    if (!roomId || !selfKey) return { ok: false, error: "לא מוכן" };
    const r = await openOv2BingoSession(roomId, selfKey);
    if (r.ok && r.snapshot) {
      setLiveSnapshot(prev => coalesceOv2BingoLiveSnapshots(prev, r.snapshot, selfKey));
    }
    await refreshLiveSnapshot();
    if (typeof reloadRoomContext === "function") void Promise.resolve(reloadRoomContext());
    return r;
  }, [roomId, selfKey, refreshLiveSnapshot, reloadRoomContext]);

  const callNextManual = useCallback(async () => {
    if (!roomId || !selfKey || !liveSnapshot) return { ok: false, error: "לא מוכן" };
    const r = await callOv2BingoNext(roomId, selfKey, liveSnapshot.revision);
    if (r.ok && "snapshot" in r && r.snapshot) {
      setLiveSnapshot(prev => coalesceOv2BingoLiveSnapshots(prev, r.snapshot, selfKey));
    }
    return r;
  }, [roomId, selfKey, liveSnapshot]);

  const requestRematch = useCallback(async () => {
    if (!roomId || !selfKey) return { ok: false, error: "לא מוכן" };
    const r = await requestOv2BingoRematch(roomId, selfKey);
    await refreshLiveSnapshot();
    if (typeof reloadRoomContext === "function") void Promise.resolve(reloadRoomContext());
    return r;
  }, [roomId, selfKey, refreshLiveSnapshot, reloadRoomContext]);

  const cancelRematch = useCallback(async () => {
    if (!roomId || !selfKey) return { ok: false, error: "לא מוכן" };
    const r = await cancelOv2BingoRematch(roomId, selfKey);
    await refreshLiveSnapshot();
    if (typeof reloadRoomContext === "function") void Promise.resolve(reloadRoomContext());
    return r;
  }, [roomId, selfKey, refreshLiveSnapshot, reloadRoomContext]);

  const startNextMatch = useCallback(async () => {
    if (!roomId || !selfKey) return { ok: false, error: "לא מוכן" };
    const seq =
      room?.match_seq != null && Number.isFinite(Number(room.match_seq)) ? Math.floor(Number(room.match_seq)) : null;
    const r = await startOv2BingoNextMatch(roomId, selfKey, seq);
    await refreshLiveSnapshot();
    if (typeof reloadRoomContext === "function") void Promise.resolve(reloadRoomContext());
    return r;
  }, [roomId, selfKey, room?.match_seq, refreshLiveSnapshot, reloadRoomContext]);

  const claimPrize = useCallback(
    async prizeKey => {
      if (!roomId || !selfKey || !liveSnapshot) return { ok: false, error: "לא מוכן" };
      const pk = String(prizeKey ?? "").trim();
      const r = await claimOv2BingoPrize(roomId, pk, selfKey, liveSnapshot.revision);
      if (r.ok && "snapshot" in r && r.snapshot) {
        setLiveSnapshot(prev => coalesceOv2BingoLiveSnapshots(prev, r.snapshot, selfKey));
      }
      await refreshLiveSnapshot();
      return r;
    },
    [roomId, selfKey, liveSnapshot, refreshLiveSnapshot]
  );

  const rebindSnapshotFromServerPayload = useCallback(
    raw => {
      const s = normalizeOv2BingoAuthoritativeSnapshot(raw, { viewerParticipantKey: selfKey ?? "" });
      if (s) setLiveSnapshot(prev => coalesceOv2BingoLiveSnapshots(prev, s, selfKey ?? ""));
    },
    [selfKey]
  );

  const membersVm = useMemo(() => {
    if (liveSnapshot && Array.isArray(liveSnapshot.members)) return liveSnapshot.members;
    return members.map(normalizeMemberRow);
  }, [liveSnapshot, members]);

  const vm = useMemo(() => {
    if (playMode === OV2_BINGO_PLAY_MODE.LIVE_ROOM_NO_MATCH_YET) {
      const life = room?.lifecycle_phase != null ? String(room.lifecycle_phase) : "";
      const ctxHostPk = room?.host_participant_key != null ? String(room.host_participant_key).trim() : "";
      const ctxIsHost = Boolean(selfKey && ctxHostPk && selfKey === ctxHostPk);
      const allowHostOpenOverride = ctxIsHost && life === "active";
      let phaseLine = "ממתינים שהמארח יפתח משחק בינגו.";
      if (life === "lobby") phaseLine = "ממתינים לשחקנים - המארח צריך להתחיל את המשחק מהלובי.";
      else if (life === "pending_start" || life === "pending_stakes") phaseLine = "ממתינים להימור מכל השחקנים.";
      else if (life === "active")
        phaseLine = liveSnapshot?.canOpenSession
          ? "החדר מוכן - המארח יכול לפתוח בינגו כשלפחות שני שחקנים יושבים ומוכנים."
          : "ממתינים שהמארח יפתח בינגו.";
      /** @type {Record<string, string|null>} */
      const roomNoMatchPrizeDisabled = {};
      for (const pk of BINGO_PRIZE_KEYS) {
        roomNoMatchPrizeDisabled[pk] = "אין סיבוב בינגו פעיל עדיין";
      }
      const emptyMarks = makeEmptyMarks();
      return {
        playMode,
        isLive: true,
        card: previewCard,
        marks: emptyMarks,
        called: /** @type {number[]} */ ([]),
        calledSet: new Set(),
        lastCalled: null,
        phaseLine,
        deckRemaining: previewDeck.length,
        deckTotal: previewDeck.length,
        previewLine: { completedRowIndexes: [], hasAnyRow: false, isFull: false },
        authoritativeSnapshot: liveSnapshot,
        revision: liveSnapshot?.revision ?? 0,
        nextCallAtIso: liveSnapshot?.nextCallAtIso ?? null,
        msUntilNextCall: null,
        announcement: null,
        walkoverPayoutAmount: null,
        winner: null,
        availablePrizeKeys: [],
        claims: [],
        membersVm,
        selfClaimedPrizeKeys: [],
        prizeDisabledByKey: roomNoMatchPrizeDisabled,
        roomLifecyclePhase: life || null,
        roomActiveSessionId: room?.active_session_id != null ? String(room.active_session_id) : null,
        callerSeatIndex: liveSnapshot?.callerSeatIndex ?? null,
        callerParticipantKey: liveSnapshot?.callerParticipantKey ?? null,
        sessionPhase: liveSnapshot?.sessionPhase ?? null,
        canOpenSession: liveSnapshot?.canOpenSession ?? false,
        canCallNext: false,
        canCallNextNow: false,
        canClaimAnyPrize: false,
        canRequestRematch: false,
        canCancelRematch: false,
        canStartNextMatch: false,
        cardIsAuthoritative: false,
        disabledReasons: {
          openSession: !selfKey
            ? "אין מזהה שחקן"
            : liveSnapshot && !liveSnapshot.canOpenSession && !allowHostOpenOverride
              ? "לא ניתן לפתוח כעת"
              : null,
          callNext: "הקריאות מתחילות אחרי שהמארח פותח את הסיבוב.",
          claim: "אין משחק חי",
          rematch: "אין משחק שהסתיים",
          startNextMatch: "לא מארח או לא מוכן",
        },
      };
    }

    if (playMode === OV2_BINGO_PLAY_MODE.PREVIEW_LOCAL) {
      const linePreview = computePreviewLineCompletion(previewRound.marks);
      const previewCalledSet = new Set(previewRound.called);
      const previewLast = previewRound.called.length ? previewRound.called[previewRound.called.length - 1] : null;
      let phaseLine = "פתחו חדרים משותפים כדי לשחק בינגו אונליין.";
      /** @type {Record<string, string|null>} */
      const previewPrizeDisabled = {};
      for (const pk of BINGO_PRIZE_KEYS) {
        previewPrizeDisabled[pk] = "לא בחדר בינגו חי";
      }

      return {
        playMode,
        isLive: false,
        card: previewCard,
        marks: previewRound.marks,
        called: previewRound.called,
        calledSet: previewCalledSet,
        lastCalled: previewLast,
        phaseLine,
        deckRemaining: Math.max(0, previewDeck.length - previewRound.deckPos),
        deckTotal: previewDeck.length,
        previewLine: linePreview,
        authoritativeSnapshot: liveSnapshot,
        revision: liveSnapshot?.revision ?? 0,
        nextCallAtIso: liveSnapshot?.nextCallAtIso ?? null,
        msUntilNextCall: null,
        announcement: null,
        walkoverPayoutAmount: null,
        winner: null,
        availablePrizeKeys: [],
        claims: [],
        membersVm,
        selfClaimedPrizeKeys: [],
        prizeDisabledByKey: previewPrizeDisabled,
        roomLifecyclePhase: null,
        roomActiveSessionId: null,
        callerSeatIndex: liveSnapshot?.callerSeatIndex ?? null,
        callerParticipantKey: liveSnapshot?.callerParticipantKey ?? null,
        sessionPhase: liveSnapshot?.sessionPhase ?? null,
        canOpenSession: false,
        canCallNext: false,
        canCallNextNow: false,
        canClaimAnyPrize: false,
        canRequestRematch: false,
        canCancelRematch: false,
        canStartNextMatch: false,
        cardIsAuthoritative: false,
        disabledReasons: {
          openSession: "לא מחובר לחדר",
          callNext: "לא מחובר לחדר",
          claim: "אין משחק חי",
          rematch: "אין משחק שהסתיים",
          startNextMatch: "לא מארח או לא מוכן",
        },
      };
    }

    const snap = liveSnapshot;
    const called = snap?.calledNumbers ?? [];
    const lastCalledLive = snap?.lastNumber ?? (called.length ? called[called.length - 1] : null);
    const deckTotal = snap?.deckTotal ?? 75;
    const deckRem = Math.max(0, deckTotal - (snap?.deckPosition ?? 0));
    let msUntilNextCall = null;
    if (snap?.nextCallAtIso) {
      const t = Date.parse(snap.nextCallAtIso);
      if (Number.isFinite(t)) msUntilNextCall = Math.max(0, t - nowMs);
    }

    const dr = {
      openSession: snap?.canOpenSession ? null : snap?.roomLifecyclePhase !== "active" ? "החדר לא פעיל" : "כבר יש סשן פעיל או שלא ניתן לפתוח",
      callNext: snap?.canCallNext ? (nextCallDue ? null : "ממתינים לטיימר הקריאה") : "רק הקורא יכול למשוך מספר",
      claim: snap?.sessionPhase === "playing" ? (!liveCard ? "אין כרטיס (נדרש מושב)" : null) : "המשחק לא בעיצומו",
      rematch: snap?.canRequestRematch ? null : snap?.sessionPhase === "finished" ? "לא ניתן לבקש משחק חוזר כעת" : "משחק חוזר לא זמין",
      cancelRematch: snap?.canCancelRematch ? null : "אין מה לבטל",
      startNextMatch: snap?.canStartNextMatch ? null : "לא מארח או לא מוכן",
    };

    const selfClaimedPrizeKeys =
      selfKey && snap?.claims?.length
        ? snap.claims.filter(c => c.claimedByParticipantKey === selfKey).map(c => c.prizeKey)
        : [];

    const takenPrizeKeys = new Set((snap?.claims ?? []).map(c => c.prizeKey));
    const existingClaimsForEngine = (snap?.claims ?? []).map(c => ({
      prize_key: c.prizeKey,
      amount: c.amount,
    }));

    /** @type {Record<string, string|null>} */
    const prizeDisabledByKey = {};
    for (const pk of BINGO_PRIZE_KEYS) {
      if (snap?.sessionPhase === "finished") prizeDisabledByKey[pk] = "המשחק הסתיים";
      else if (dr.claim) prizeDisabledByKey[pk] = dr.claim;
      else if (takenPrizeKeys.has(pk)) prizeDisabledByKey[pk] = "כבר נתבע";
      else if (!liveCard) prizeDisabledByKey[pk] = "אין כרטיס (נדרש מושב)";
      else if (
        !canClaimPrize({
          prizeKey: pk,
          card: liveCard,
          called,
          existingClaims: existingClaimsForEngine,
        })
      ) {
        prizeDisabledByKey[pk] = "עדיין לא זכאי";
      } else if (pk === "full") {
        prizeDisabledByKey[pk] = isFullComplete(liveMarks) ? null : "עדיין לא זכאי";
      } else {
        const m = /^row([1-5])$/.exec(pk);
        const ri = m ? Number(m[1]) - 1 : -1;
        prizeDisabledByKey[pk] =
          ri >= 0 && isRowComplete(liveMarks, ri) ? null : "עדיין לא זכאי";
      }
    }

    let phaseLine = "משחק פעיל - המספרים נקראים בשרת.";
    if (snap?.sessionPhase === "playing") phaseLine = "משחק פעיל";
    else if (snap?.sessionPhase === "finished") phaseLine = "הסתיים";

    return {
      playMode,
      isLive: true,
      card: liveCard || previewCard,
      marks: liveMarks,
      called,
      calledSet: new Set(called),
      lastCalled: lastCalledLive,
      phaseLine,
      deckRemaining: deckRem,
      deckTotal,
      previewLine: { completedRowIndexes: [], hasAnyRow: false, isFull: false },
      authoritativeSnapshot: snap,
      revision: snap?.revision ?? 0,
      nextCallAtIso: snap?.nextCallAtIso ?? null,
      msUntilNextCall,
      announcement: null,
      walkoverPayoutAmount: snap?.walkoverPayoutAmount ?? null,
      winner: snap?.winner ?? null,
      availablePrizeKeys: [],
      claims: snap?.claims ?? [],
      membersVm,
      selfClaimedPrizeKeys,
      prizeDisabledByKey,
      roomLifecyclePhase: snap?.roomLifecyclePhase ?? null,
      roomActiveSessionId: snap?.roomActiveSessionId ?? null,
      callerSeatIndex: snap?.callerSeatIndex ?? null,
      callerParticipantKey: snap?.callerParticipantKey ?? null,
      sessionPhase: snap?.sessionPhase ?? null,
      canOpenSession: snap?.canOpenSession ?? false,
      canCallNext: snap?.canCallNext ?? false,
      canCallNextNow,
      canClaimAnyPrize: false,
      canRequestRematch: snap?.canRequestRematch ?? false,
      canCancelRematch: snap?.canCancelRematch ?? false,
      canStartNextMatch: snap?.canStartNextMatch ?? false,
      cardIsAuthoritative: Boolean(liveCard),
      disabledReasons: dr,
    };
  }, [
    playMode,
    previewCard,
    previewRound.marks,
    previewRound.called,
    previewRound.deckPos,
    previewDeck.length,
    liveSnapshot,
    liveCard,
    liveMarks,
    canCallNextNow,
    nextCallDue,
    nowMs,
    selfKey,
    room,
    membersVm,
  ]);

  const previewDisableCall = previewDisabledReason({
    deckRemaining: Math.max(0, previewDeck.length - previewRound.deckPos),
  });

  return {
    /** @type {(typeof OV2_BINGO_PLAY_MODE)[keyof typeof OV2_BINGO_PLAY_MODE]} */
    playMode,
    vm,
    liveSnapshot,
    members,
    room,
    selfKey,
    callNextPreviewNumber,
    resetPreviewRound,
    onCellClick,
    onToggleMark: onCellClick,
    previewDisabledReasonCallNext: previewDisableCall,
    actions: {
      refreshLiveSnapshot,
      openSession,
      callNextManual,
      claimPrize,
      requestRematch,
      cancelRematch,
      startNextMatch,
    },
    stopLivePolling,
    rebindSnapshotFromServerPayload,
  };
}
