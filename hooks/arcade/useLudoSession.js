import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchArcadeRoomLudoBundle, requestLudoGameAction } from "../../lib/arcade/ludo/ludoSessionAdapter";
import { useArcadeSnapshotPollEffect } from "./useArcadeSnapshotPollEffect";
import { handleArcadePollBundleFailure } from "./arcadeSessionPollHelpers.js";
import { useArcadeRoomAccessLostRedirect } from "./useArcadeRoomAccessLostRedirect.js";

/** כמו OV2 `useOv2LudoSession.js` — משך מינימלי לזריקה + הצגת תוצאה */
const OV2_LUDO_LIVE_ROLL_MIN_MS = 2000;
const OV2_LUDO_DICE_FACE_HOLD_MS = 1200;

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

/** @param {Record<string, unknown>|null} snap */
function snapshotResolvedRollFace(snap) {
  if (!snap || typeof snap !== "object") return null;
  const raw =
    snap.dice ??
    (snap.board && typeof snap.board === "object" ? snap.board.dice : undefined) ??
    snap.lastDice ??
    (snap.board && typeof snap.board === "object" ? snap.board.lastDice : undefined);
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 && n <= 6 ? n : null;
}

/**
 * @param {{ room?: Record<string, unknown>|null, roomId?: string|null }} ctx
 */
export function useLudoSession(ctx) {
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

  const [diceRolling, setDiceRolling] = useState(false);
  const [liveSpinTick, setLiveSpinTick] = useState(1);
  const [liveRollServerFace, setLiveRollServerFace] = useState(/** @type {number|null} */ (null));
  const [liveDiceRevealHold, setLiveDiceRevealHold] = useState(
    /** @type {{ face: number; until: number } | null} */ (null)
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const diceRollingRef = useRef(false);
  const liveAutoRollCompletedKeyRef = useRef(/** @type {string|null} */ (null));
  const liveAutoRollPendingKeyRef = useRef(/** @type {string|null} */ (null));

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
    liveAutoRollCompletedKeyRef.current = null;
    liveAutoRollPendingKeyRef.current = null;
  }, [roomId]);

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

  const fetchBundle = useCallback(() => fetchArcadeRoomLudoBundle(roomId || ""), [roomId]);

  const onPollBundle = useCallback((b, ctx) => {
    if (handleArcadePollBundleFailure(b, ctx, setBundleError, setRoomAccessLost, roomId)) {
      return;
    }

    const ld = b.ludo;
    const roomSt = b.room?.status != null ? String(b.room.status) : "";
    const gsSt = b.gameSession?.status != null ? String(b.gameSession.status) : "";
    const rev = ld?.revision != null ? Number(ld.revision) : -1;
    const phase = ld?.phase != null ? String(ld.phase) : "";
    const ts = ld?.turnSeat != null ? String(ld.turnSeat) : "";
    const di = ld?.dice != null ? String(ld.dice) : "";
    const playerSig = Array.isArray(b.players)
      ? b.players.map((p) => `${p.student_id}:${String(p.display_name ?? "").slice(0, 24)}`).join("|")
      : "";
    const pollSig = `${roomSt}|${gsSt}|${rev}|${phase}|${ts}|${di}|${playerSig}`;

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
    setSnap((prev) => preferNewer(prev, b.ludo));
  }, [roomId]);

  const { stopPolling } = useArcadeSnapshotPollEffect({
    roomId,
    fetchBundle,
    onBundle: onPollBundle,
  });

  useArcadeRoomAccessLostRedirect(roomAccessLost, stopPolling);

  const runLiveRoll = useCallback(async () => {
    const s = snapRef.current;
    if (!roomId || !s) return { ok: false };
    if (diceRollingRef.current) return { ok: false };
    if (!s.canClientRoll || s.dice != null) return { ok: false };

    const t0 = typeof Date.now === "function" ? Date.now() : 0;
    setLiveRollServerFace(null);
    setDiceRolling(true);
    diceRollingRef.current = true;
    setErr("");

    try {
      const r = await requestLudoGameAction(roomId, { action: "roll", revision: s.revision });
      if (!r.ok) {
        setErr(r.error || "פעולה נכשלה");
        return { ok: false };
      }
      const nextSnap = r.snapshot;
      const face = nextSnap ? snapshotResolvedRollFace(nextSnap) : null;
      if (face != null) {
        setLiveRollServerFace(face);
        setLiveSpinTick(face);
      }
      const wait = Math.max(0, OV2_LUDO_LIVE_ROLL_MIN_MS - (Date.now() - t0));
      await sleepMs(wait);

      if (r.ok && nextSnap) {
        setSnap((prev) => preferNewer(prev, nextSnap));
        const hasDice = nextSnap.dice != null && !Number.isNaN(Number(nextSnap.dice));
        if (!hasDice && face != null) {
          setLiveDiceRevealHold({ face, until: Date.now() + OV2_LUDO_DICE_FACE_HOLD_MS });
        }
      } else if (r.ok && !nextSnap) {
        const b = await fetchArcadeRoomLudoBundle(roomId);
        if (b.ok) {
          if (b.ludo) setSnap((prev) => preferNewer(prev, b.ludo));
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
      setDiceRolling(false);
      diceRollingRef.current = false;
    }
  }, [roomId]);

  const rollDice = useCallback(async () => {
    if (diceRolling) return { ok: false };
    return runLiveRoll();
  }, [diceRolling, runLiveRoll]);

  /** OV2: בתחילת תור — זריקה אוטומטית עם אותה אנימציה (לא מזיזים כלים בשביל המשתמש) */
  useEffect(() => {
    if (!roomId || !snap) return undefined;
    if (String(snap.phase || "").toLowerCase() !== "playing") return undefined;
    if (!snap.canClientRoll || snap.dice != null || diceRolling) return undefined;

    const sessionId = String(snap.sessionId || "").trim();
    const liveTurnSeat = snap.turnSeat != null ? Number(snap.turnSeat) : null;
    const rev = Number(snap.revision);
    if (!sessionId || liveTurnSeat == null || !Number.isFinite(rev)) return undefined;

    const autoKey = `${sessionId}|${liveTurnSeat}|${rev}|autoroll`;
    if (liveAutoRollCompletedKeyRef.current === autoKey) return undefined;
    if (liveAutoRollPendingKeyRef.current === autoKey) return undefined;

    liveAutoRollPendingKeyRef.current = autoKey;
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        const clearPendingIfMatch = () => {
          if (liveAutoRollPendingKeyRef.current === autoKey) {
            liveAutoRollPendingKeyRef.current = null;
          }
        };
        if (cancelled) {
          clearPendingIfMatch();
          return;
        }
        const cur = snapRef.current;
        if (
          !cur ||
          String(cur.phase || "").toLowerCase() !== "playing" ||
          !cur.canClientRoll ||
          cur.dice != null
        ) {
          liveAutoRollCompletedKeyRef.current = autoKey;
          clearPendingIfMatch();
          return;
        }
        const sid = String(cur.sessionId || "").trim();
        const seat = cur.turnSeat != null ? Number(cur.turnSeat) : null;
        const snapRev = Number(cur.revision);
        if (sid !== sessionId || seat !== liveTurnSeat || snapRev !== rev) {
          clearPendingIfMatch();
          return;
        }
        const ok = (await runLiveRoll()).ok;
        if (ok) {
          liveAutoRollCompletedKeyRef.current = autoKey;
        }
        clearPendingIfMatch();
      })();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      if (liveAutoRollPendingKeyRef.current === autoKey) {
        liveAutoRollPendingKeyRef.current = null;
      }
    };
  }, [roomId, snap, diceRolling, runLiveRoll]);

  useEffect(() => {
    if (!snap) return;
    if (String(snap.phase || "").toLowerCase() !== "playing") return;
    const sessionId = String(snap.sessionId || "").trim();
    const liveTurnSeat = snap.turnSeat != null ? Number(snap.turnSeat) : null;
    const rev = Number(snap.revision);
    if (!sessionId || liveTurnSeat == null || !Number.isFinite(rev)) return;
    const autoKey = `${sessionId}|${liveTurnSeat}|${rev}|autoroll`;
    const stillRollable = snap.canClientRoll === true && snap.dice == null;
    if (stillRollable) return;
    liveAutoRollCompletedKeyRef.current = autoKey;
    if (liveAutoRollPendingKeyRef.current === autoKey) {
      liveAutoRollPendingKeyRef.current = null;
    }
  }, [snap]);

  const movePiece = useCallback(
    async (pieceIndex) => {
      const s = snapRef.current;
      if (!roomId || !s) return { ok: false };
      if (busy || diceRolling) return { ok: false };
      setBusy(true);
      setErr("");
      try {
        const r = await requestLudoGameAction(roomId, {
          action: "move",
          pieceIndex,
          revision: s.revision,
        });
        if (!r.ok) {
          setErr(r.error || "מהלך נכשל");
          return { ok: false };
        }
        if (r.snapshot) setSnap((prev) => preferNewer(prev, r.snapshot));
        else {
          const b = await fetchArcadeRoomLudoBundle(roomId);
          if (b.ok) {
            if (b.ludo) setSnap((prev) => preferNewer(prev, b.ludo));
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
        setBusy(false);
      }
    },
    [roomId, busy, diceRolling],
  );

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
    } else if (snap?.dice != null && !Number.isNaN(Number(snap.dice))) {
      dicePresentation = Number(snap.dice);
    }

    return {
      phase,
      board: snap?.board ?? {},
      turnSeat: snap?.turnSeat ?? null,
      mySeat: snap?.mySeat ?? null,
      winnerSeat: snap?.winnerSeat ?? null,
      revision: snap?.revision ?? 0,
      sessionId: snap?.sessionId != null ? String(snap.sessionId) : "",
      dice: snap?.dice ?? null,
      lastDice: snap?.lastDice ?? null,
      dicePresentation,
      diceRolling,
      canClientRoll: snap?.canClientRoll === true && !diceRolling,
      canClientMovePiece: snap?.canClientMovePiece === true && !busy && !diceRolling,
      legalMovablePieceIndices: Array.isArray(snap?.legalMovablePieceIndices)
        ? snap.legalMovablePieceIndices
        : null,
    };
  }, [snap, diceRolling, liveSpinTick, liveDiceRevealHold, nowMs, busy]);

  return {
    snapshot: snap,
    vm,
    busy,
    err,
    setErr,
    rollDice,
    movePiece,
    roomId,
    room: roomRow,
    players,
    gameSession: gameSessionRow,
    bundleLoaded,
    bundleError,
    stopPolling,
  };
}
