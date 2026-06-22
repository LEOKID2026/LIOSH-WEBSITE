import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchArcadeRoomSnakesLaddersBundle,
  requestSnakesAndLaddersGameAction,
} from "../../lib/arcade/snakes-ladders/snakesSessionAdapter";
import { useArcadeSnapshotPollEffect } from "./useArcadeSnapshotPollEffect";
import { handleArcadePollBundleFailure } from "./arcadeSessionPollHelpers.js";
import { useArcadeRoomAccessLostRedirect } from "./useArcadeRoomAccessLostRedirect.js";
import {
  ARCADE_SNAKES_BOARD_EDGES,
  ARCADE_SNAKES_EDGE_HOLD_MS,
  ARCADE_SNAKES_EDGE_LAND_MS,
  ARCADE_SNAKES_WALK_SETTLE_MS,
  ARCADE_SNAKES_WALK_STEP_MS,
  arcadeCellAfterDice,
  arcadeSnakesClassifyEdge,
  findSingleMovedSeat,
  readArcadeSeatPos,
} from "../../lib/arcade/snakes-ladders/arcadeSnakesMotion";

const LIVE_ROLL_MIN_MS = 1400;
const DICE_FACE_HOLD_MS = 900;
/** השהיה אחרי שהקובייה ננעלת על התוצאה, לפני תחילת תנועת הפיון — חייב להירגש כברור למשתמש */
const PAUSE_AFTER_DICE_BEFORE_WALK_MS = 1700;

function preferNewer(prev, next) {
  if (!next) return prev;
  if (!prev) return next;
  const pr = prev.revision != null ? Number(prev.revision) : 0;
  const nr = next.revision != null ? Number(next.revision) : 0;
  return nr >= pr ? next : prev;
}

function sleepMs(ms) {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    window.setTimeout(resolve, ms);
  });
}

/** זוג פריימים כדי לאפשר ל-React לצייר את פני הקובייה לפני השהיית המהלך */
function yieldPaintFrames() {
  if (typeof window === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * @param {{ room?: Record<string, unknown>|null, roomId?: string|null }} ctx
 */
export function useSnakesLaddersSession(ctx) {
  const room = ctx?.room && typeof ctx.room === "object" ? ctx.room : null;
  const roomId =
    ctx?.roomId != null && String(ctx.roomId).trim()
      ? String(ctx.roomId).trim()
      : room?.id != null
        ? String(room.id)
        : null;

  const [snap, setSnap] = useState(null);
  const [roomRow, setRoomRow] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameSessionRow, setGameSessionRow] = useState(null);
  const [bundleLoaded, setBundleLoaded] = useState(false);
  const [bundleError, setBundleError] = useState("");
  const [roomAccessLost, setRoomAccessLost] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const lastPollSigRef = useRef("");
  const snapRef = useRef(null);
  snapRef.current = snap;

  const boardEdgesRef = useRef(ARCADE_SNAKES_BOARD_EDGES);
  boardEdgesRef.current = ARCADE_SNAKES_BOARD_EDGES;

  const pawnWalkTimersRef = useRef(/** @type {number[]} */ ([]));
  const lastWalkRevisionRef = useRef(/** @type {number|null} */ (null));
  const prevSnapPollRef = useRef(null);

  const [pawnMotion, setPawnMotion] = useState(
    /** @type {null | { key: number, seat: number, displayCell: number, phase: 'walk' | 'edge_hold' | 'edge_land', preCell: number, finalCell: number, kind: 'ladder' | 'snake' | null }} */ (
      null
    )
  );
  /** עד תחילת אנימציה מה-poll (השהיה לפני walk) — השרת כבר מחזיר turnSeat הבא */
  const [pendingTurnVisualSeat, setPendingTurnVisualSeat] = useState(/** @type {number|null} */ (null));

  const clearPawnWalkTimers = useCallback(() => {
    pawnWalkTimersRef.current.forEach((id) => window.clearTimeout(id));
    pawnWalkTimersRef.current = [];
  }, []);

  const schedulePawnWalkFromPrevNext = useCallback(
    (prev, next, seat) => {
      if (!prev || !next || seat < 0 || seat > 3) return;
      const nextRev = next.revision != null ? Number(next.revision) : NaN;
      if (!Number.isFinite(nextRev)) return;
      if (lastWalkRevisionRef.current === nextRev) return;

      const dice = next.lastRoll != null ? Math.floor(Number(next.lastRoll)) : null;
      if (dice == null || dice < 1 || dice > 6) return;
      const oldP = readArcadeSeatPos(prev, seat);
      const newP = readArcadeSeatPos(next, seat);
      if (oldP == null || newP == null || oldP === newP) return;
      const preCell = arcadeCellAfterDice(oldP, dice);
      if (preCell == null) return;

      lastWalkRevisionRef.current = nextRev;
      clearPawnWalkTimers();

      /** @type {number[]} */
      const path = [];
      const start = oldP === 0 ? 1 : oldP + 1;
      for (let c = start; c <= preCell; c += 1) path.push(c);
      const kind =
        preCell !== newP ? arcadeSnakesClassifyEdge(preCell, newP, boardEdgesRef.current) : null;
      const key = Date.now();
      const pushTid = (tid) => {
        pawnWalkTimersRef.current.push(tid);
      };
      setPawnMotion({
        key,
        seat,
        displayCell: oldP,
        phase: "walk",
        preCell,
        finalCell: newP,
        kind,
      });
      path.forEach((cell, i) => {
        const tid = window.setTimeout(() => {
          setPawnMotion((cur) => (cur && cur.key === key ? { ...cur, displayCell: cell, phase: "walk" } : cur));
        }, (i + 1) * ARCADE_SNAKES_WALK_STEP_MS);
        pushTid(tid);
      });
      const afterWalk = path.length * ARCADE_SNAKES_WALK_STEP_MS;
      if (kind && preCell !== newP) {
        pushTid(
          window.setTimeout(() => {
            setPawnMotion((cur) =>
              cur && cur.key === key ? { ...cur, displayCell: preCell, phase: "edge_hold" } : cur
            );
          }, afterWalk)
        );
        pushTid(
          window.setTimeout(() => {
            setPawnMotion((cur) =>
              cur && cur.key === key ? { ...cur, displayCell: newP, phase: "edge_land" } : cur
            );
          }, afterWalk + ARCADE_SNAKES_EDGE_HOLD_MS)
        );
        pushTid(
          window.setTimeout(() => {
            setPawnMotion((cur) => (cur && cur.key === key ? null : cur));
          }, afterWalk + ARCADE_SNAKES_EDGE_HOLD_MS + ARCADE_SNAKES_EDGE_LAND_MS)
        );
      } else {
        pushTid(
          window.setTimeout(() => {
            setPawnMotion((cur) => (cur && cur.key === key ? null : cur));
          }, afterWalk + ARCADE_SNAKES_WALK_SETTLE_MS)
        );
      }
    },
    [clearPawnWalkTimers]
  );

  const [diceRolling, setDiceRolling] = useState(false);
  const [liveSpinTick, setLiveSpinTick] = useState(1);
  const [liveRollServerFace, setLiveRollServerFace] = useState(/** @type {number|null} */ (null));
  const [liveDiceRevealHold, setLiveDiceRevealHold] = useState(
    /** @type {{ face: number; until: number } | null} */ (null)
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const diceRollingRef = useRef(false);

  useEffect(() => {
    setSnap(null);
    setRoomRow(null);
    setPlayers([]);
    setGameSessionRow(null);
    setBundleLoaded(false);
    setBundleError("");
    setRoomAccessLost(false);
    setErr("");
    lastPollSigRef.current = "";
    setDiceRolling(false);
    diceRollingRef.current = false;
    setLiveRollServerFace(null);
    setLiveDiceRevealHold(null);
    clearPawnWalkTimers();
    setPawnMotion(null);
    lastWalkRevisionRef.current = null;
    prevSnapPollRef.current = null;
    setPendingTurnVisualSeat(null);
  }, [roomId, clearPawnWalkTimers]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const t = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!liveDiceRevealHold) return;
    if (nowMs < liveDiceRevealHold.until) return;
    setLiveDiceRevealHold(null);
  }, [nowMs, liveDiceRevealHold]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!diceRolling || liveRollServerFace != null) return undefined;
    const id = window.setInterval(() => {
      setLiveSpinTick((prev) => {
        let n = prev;
        for (let i = 0; i < 8 && n === prev; i += 1) {
          n = 1 + Math.floor(Math.random() * 6);
        }
        return n;
      });
    }, 85);
    return () => window.clearInterval(id);
  }, [diceRolling, liveRollServerFace]);

  const fetchBundle = useCallback(() => fetchArcadeRoomSnakesLaddersBundle(roomId || ""), [roomId]);

  const onPollBundle = useCallback((b, ctx) => {
    if (handleArcadePollBundleFailure(b, ctx, setBundleError, setRoomAccessLost, roomId)) {
      return;
    }

    const sl = b.snakesAndLadders;
    const roomSt = b.room?.status != null ? String(b.room.status) : "";
    const gsSt = b.gameSession?.status != null ? String(b.gameSession.status) : "";
    const rev = sl?.revision != null ? Number(sl.revision) : -1;
    const phase = sl?.phase != null ? String(sl.phase) : "";
    const ts = sl?.turnSeat != null ? String(sl.turnSeat) : "";
    const lr = sl?.lastRoll != null ? String(sl.lastRoll) : "";
    const playerSig = Array.isArray(b.players)
      ? b.players.map((p) => `${p.student_id}:${String(p.display_name ?? "").slice(0, 24)}`).join("|")
      : "";
    const flexWaitSig = `${b.room?.flex_auto_start_at ?? ""}|${b.room?.start_window_started_at ?? ""}`;
    const pollSig = `${roomSt}|${gsSt}|${rev}|${phase}|${ts}|${lr}|${playerSig}|${flexWaitSig}`;

    const unchanged =
      ctx.bundleLoadedOnceRef.current &&
      pollSig === lastPollSigRef.current &&
      lastPollSigRef.current !== "";

    if (unchanged) {
      return;
    }
    lastPollSigRef.current = pollSig;

    setBundleError("");
    ctx.bundleLoadedOnceRef.current = true;
    setBundleLoaded(true);
    setRoomRow(b.room);
    setPlayers(b.players || []);
    setGameSessionRow(b.gameSession ?? null);
    setSnap((prev) => preferNewer(prev, b.snakesAndLadders));
  }, [roomId]);

  const { stopPolling } = useArcadeSnapshotPollEffect({
    roomId,
    fetchBundle,
    onBundle: onPollBundle,
  });

  useArcadeRoomAccessLostRedirect(roomAccessLost, stopPolling);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const prev = prevSnapPollRef.current;
    const next = snap;
    if (
      prev &&
      next &&
      prev.revision != null &&
      next.revision != null &&
      Number(next.revision) > Number(prev.revision)
    ) {
      const prevPhase = String(prev.phase || "").toLowerCase();
      const nextPhase = String(next.phase || "").toLowerCase();
      const playingChain =
        (prevPhase === "playing" && nextPhase === "playing") ||
        (prevPhase === "playing" && nextPhase === "finished");
      if (playingChain) {
        const moved = findSingleMovedSeat(prev, next);
        if (moved != null) {
          const nextRev = next.revision != null ? Number(next.revision) : NaN;
          const alreadyHandledLocally =
            Number.isFinite(nextRev) && lastWalkRevisionRef.current === nextRev;
          if (!alreadyHandledLocally) {
            setPendingTurnVisualSeat(moved);
            const tid = window.setTimeout(() => {
              schedulePawnWalkFromPrevNext(prev, next, moved);
            }, PAUSE_AFTER_DICE_BEFORE_WALK_MS);
            pawnWalkTimersRef.current.push(tid);
          }
        }
      }
    }
    prevSnapPollRef.current = next;
  }, [snap, schedulePawnWalkFromPrevNext]);

  useEffect(() => {
    if (pawnMotion != null) setPendingTurnVisualSeat(null);
  }, [pawnMotion]);

  const rollDice = useCallback(async () => {
    const s = snapRef.current;
    if (!roomId || !s) return { ok: false };
    if (diceRollingRef.current) return { ok: false };
    if (!s.canClientRoll) return { ok: false };

    const t0 = typeof Date.now === "function" ? Date.now() : 0;
    clearPawnWalkTimers();
    setPendingTurnVisualSeat(null);
    setLiveRollServerFace(null);
    setDiceRolling(true);
    diceRollingRef.current = true;
    setErr("");

    try {
      const r = await requestSnakesAndLaddersGameAction(roomId, { action: "roll", revision: s.revision });
      if (!r.ok) {
        setErr(r.error || "פעולה נכשלה");
        return { ok: false };
      }
      const nextSnap = r.snapshot;
      const face =
        nextSnap?.lastRoll != null && !Number.isNaN(Number(nextSnap.lastRoll))
          ? Number(nextSnap.lastRoll)
          : null;
      if (face != null) {
        setLiveRollServerFace(face);
        setLiveSpinTick(face);
      }
      const wait = Math.max(0, LIVE_ROLL_MIN_MS - (Date.now() - t0));
      await sleepMs(wait);

      if (r.ok && nextSnap) {
        setDiceRolling(false);
        diceRollingRef.current = false;
        setLiveRollServerFace(null);
        if (face != null) {
          setLiveDiceRevealHold({ face, until: Date.now() + DICE_FACE_HOLD_MS + PAUSE_AFTER_DICE_BEFORE_WALK_MS });
        }
        await yieldPaintFrames();
        await sleepMs(PAUSE_AFTER_DICE_BEFORE_WALK_MS);

        if (s && nextSnap.lastRoll != null && s.turnSeat != null && !Number.isNaN(Number(s.turnSeat))) {
          const roller = Math.floor(Number(s.turnSeat));
          if (roller >= 0 && roller <= 3) {
            schedulePawnWalkFromPrevNext(s, nextSnap, roller);
          }
        }
        setSnap((prev) => preferNewer(prev, nextSnap));
      } else if (r.ok && !nextSnap) {
        const b = await fetchArcadeRoomSnakesLaddersBundle(roomId);
        if (b.ok) {
          if (b.snakesAndLadders) setSnap((prev) => preferNewer(prev, b.snakesAndLadders));
          if (b.room) setRoomRow(b.room);
          if (b.players) setPlayers(b.players);
          setGameSessionRow(b.gameSession ?? null);
        }
      }
      return { ok: true };
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      return { ok: false };
    } finally {
      setLiveRollServerFace(null);
      if (diceRollingRef.current) {
        setDiceRolling(false);
        diceRollingRef.current = false;
      }
    }
  }, [roomId, clearPawnWalkTimers, schedulePawnWalkFromPrevNext]);

  const vm = useMemo(() => {
    const phase = snap ? String(snap.phase || "").toLowerCase() : "";
    const liveDiceDisplayValue =
      phase === "playing" && diceRolling
        ? liveSpinTick
        : phase === "playing" &&
            liveDiceRevealHold != null &&
            nowMs < liveDiceRevealHold.until
          ? liveDiceRevealHold.face
          : undefined;

    let dicePresentation = null;
    if (liveDiceDisplayValue != null && typeof liveDiceDisplayValue === "number") {
      dicePresentation = liveDiceDisplayValue;
    } else if (snap?.lastRoll != null && !Number.isNaN(Number(snap.lastRoll))) {
      dicePresentation = Number(snap.lastRoll);
    }

    /** @type {Record<string, number>} */
    const positionRecord = {};
    const acts = Array.isArray(snap?.activeSeats) ? snap.activeSeats : [];
    const pos = Array.isArray(snap?.positions) ? snap.positions : [];
    for (let i = 0; i < acts.length && i < pos.length; i += 1) {
      const seat = acts[i];
      if (pos[i] == null) continue;
      positionRecord[String(seat)] = Number(pos[i]);
    }
    if (pawnMotion) {
      positionRecord[String(pawnMotion.seat)] = pawnMotion.displayCell;
    }

    /** תור להצגה בלבד — לא עובר לשחקן הבא עד סיום תנועת הפיון (כמו OV2) */
    const turnSeatForUi =
      pawnMotion != null
        ? pawnMotion.seat
        : pendingTurnVisualSeat != null
          ? pendingTurnVisualSeat
          : snap?.turnSeat ?? null;

    const motionBlocking = Boolean(pawnMotion) || pendingTurnVisualSeat != null;

    return {
      phase,
      turnSeat: snap?.turnSeat ?? null,
      turnSeatForUi,
      mySeat: snap?.mySeat ?? null,
      winnerSeat: snap?.winnerSeat ?? null,
      revision: snap?.revision ?? 0,
      sessionId: snap?.sessionId != null ? String(snap.sessionId) : "",
      positions: Array.isArray(snap?.positions) ? snap.positions : [],
      activeSeats: Array.isArray(snap?.activeSeats) ? snap.activeSeats : [],
      positionsForBoard: positionRecord,
      pawnMotion,
      dicePresentation,
      diceRolling,
      canClientRoll: snap?.canClientRoll === true && !diceRolling && !motionBlocking,
      boardViewReadOnly: snap?.boardViewReadOnly === true,
    };
  }, [snap, diceRolling, liveSpinTick, liveDiceRevealHold, nowMs, pawnMotion, pendingTurnVisualSeat]);

  useEffect(
    () => () => {
      clearPawnWalkTimers();
    },
    [clearPawnWalkTimers]
  );

  return {
    snapshot: snap,
    vm,
    busy,
    err,
    setErr,
    rollDice,
    roomId,
    room: roomRow,
    players,
    gameSession: gameSessionRow,
    bundleLoaded,
    bundleError,
    stopPolling,
  };
}
