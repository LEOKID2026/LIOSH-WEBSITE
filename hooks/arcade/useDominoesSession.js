import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchArcadeRoomDominoesBundle,
  requestDominoesAction,
} from "../../lib/arcade/dominoes/dominoesSessionAdapter";
import { useArcadeSnapshotPollEffect } from "./useArcadeSnapshotPollEffect";
import { handleArcadePollBundleFailure } from "./arcadeSessionPollHelpers.js";
import { useArcadeRoomAccessLostRedirect } from "./useArcadeRoomAccessLostRedirect.js";

function preferNewer(prev, next) {
  if (!next) return prev;
  if (!prev) return next;
  const pr = prev.revision != null ? Number(prev.revision) : 0;
  const nr = next.revision != null ? Number(next.revision) : 0;
  return nr >= pr ? next : prev;
}

/**
 * @param {{ room?: Record<string, unknown>|null, roomId?: string|null }} ctx
 */
export function useDominoesSession(ctx) {
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
  }, [roomId]);

  const fetchBundle = useCallback(() => fetchArcadeRoomDominoesBundle(roomId || ""), [roomId]);

  const onPollBundle = useCallback((b, ctx) => {
    if (handleArcadePollBundleFailure(b, ctx, setBundleError, setRoomAccessLost, roomId)) {
      return;
    }

    const d = b.dominoes;
    const roomSt = b.room?.status != null ? String(b.room.status) : "";
    const gsSt = b.gameSession?.status != null ? String(b.gameSession.status) : "";
    const rev = d?.revision != null ? Number(d.revision) : -1;
    const phase = d?.phase != null ? String(d.phase) : "";
    const chainSig = Array.isArray(d?.chain)
      ? d.chain.map((c) => `${c.tileId}:${c.leftPip}:${c.rightPip}`).join("|")
      : "";
    const handSig = Array.isArray(d?.myHand)
      ? d.myHand.map((t) => `${t.id}:${t.a}:${t.b}`).join(",")
      : "";
    const playerSig = Array.isArray(b.players)
      ? b.players.map((p) => `${p.student_id}:${String(p.display_name ?? "").slice(0, 24)}`).join("|")
      : "";
    const pollSig = `${roomSt}|${gsSt}|${rev}|${phase}|${chainSig}|${handSig}|${playerSig}`;

    const unchanged =
      ctx.bundleLoadedOnceRef.current && pollSig === lastPollSigRef.current && lastPollSigRef.current !== "";

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
    setSnap((prev) => preferNewer(prev, b.dominoes));
  }, [roomId]);

  const { stopPolling } = useArcadeSnapshotPollEffect({
    roomId,
    fetchBundle,
    onBundle: onPollBundle,
  });

  useArcadeRoomAccessLostRedirect(roomAccessLost, stopPolling);

  const submitPlay = useCallback(
    async (tileId, side) => {
      const s = snapRef.current;
      if (!roomId || !s) return { ok: false };
      if (busy) return { ok: false };
      setBusy(true);
      setErr("");
      try {
        const r = await requestDominoesAction(roomId, {
          action: "play",
          tileId,
          side,
          revision: s.revision,
        });
        if (!r.ok) {
          setErr(r.error || "מהלך נכשל");
          return { ok: false };
        }
        if (r.snapshot) setSnap((prev) => preferNewer(prev, r.snapshot));
        else {
          const b = await fetchArcadeRoomDominoesBundle(roomId);
          if (b.ok) {
            if (b.dominoes) setSnap((prev) => preferNewer(prev, b.dominoes));
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
    [roomId, busy],
  );

  const submitPass = useCallback(async () => {
    const s = snapRef.current;
    if (!roomId || !s) return { ok: false };
    if (busy) return { ok: false };
    setBusy(true);
    setErr("");
    try {
      const r = await requestDominoesAction(roomId, {
        action: "pass",
        revision: s.revision,
      });
      if (!r.ok) {
        setErr(r.error || "פעולה נכשלה");
        return { ok: false };
      }
      if (r.snapshot) setSnap((prev) => preferNewer(prev, r.snapshot));
      else {
        const b = await fetchArcadeRoomDominoesBundle(roomId);
        if (b.ok) {
          if (b.dominoes) setSnap((prev) => preferNewer(prev, b.dominoes));
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
  }, [roomId, busy]);

  const vm = useMemo(() => {
    const phase = snap ? String(snap.phase || "").toLowerCase() : "";
    return {
      phase,
      chain: Array.isArray(snap?.chain) ? snap.chain : [],
      openEnds: snap?.openEnds ?? null,
      myHand: Array.isArray(snap?.myHand) ? snap.myHand : [],
      legalPlays: Array.isArray(snap?.legalPlays) ? snap.legalPlays : [],
      turnSeat: null,
      mySeat: snap?.mySeat ?? null,
      winnerSeat: snap?.winnerSeat ?? null,
      revision: snap?.revision ?? 0,
      opponentHandCount: snap?.opponentHandCount ?? 0,
      canClientAct: snap?.canClientAct === true && !busy,
      mustPass: snap?.mustPass === true,
      prizePoolAmount: snap?.prizePoolAmount ?? null,
      mySettlementAmount: snap?.mySettlementAmount ?? null,
    };
  }, [snap, busy]);

  return {
    snapshot: snap,
    vm,
    busy,
    err,
    setErr,
    submitPlay,
    submitPass,
    roomId,
    room: roomRow,
    players,
    gameSession: gameSessionRow,
    bundleLoaded,
    bundleError,
    stopPolling,
  };
}
