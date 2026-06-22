import { useCallback, useEffect, useRef, useState } from "react";
import { fetchArcadePlaceholderBundle } from "../../lib/arcade/placeholder/placeholderSessionAdapter";
import { useArcadeSnapshotPollEffect } from "./useArcadeSnapshotPollEffect";
import { handleArcadePollBundleFailure } from "./arcadeSessionPollHelpers.js";
import { useArcadeRoomAccessLostRedirect } from "./useArcadeRoomAccessLostRedirect.js";

/**
 * @param {{ roomId: string }} ctx
 */
export function useArcadePlaceholderSession(ctx) {
  const roomId = String(ctx?.roomId || "").trim();

  const [placeholder, setPlaceholder] = useState(/** @type {Record<string, unknown>|null} */ (null));
  const [room, setRoom] = useState(/** @type {Record<string, unknown>|null} */ (null));
  const [players, setPlayers] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [gameSession, setGameSession] = useState(/** @type {Record<string, unknown>|null} */ (null));
  const [bundleLoaded, setBundleLoaded] = useState(false);
  const [bundleError, setBundleError] = useState("");
  const [roomAccessLost, setRoomAccessLost] = useState(false);
  const lastPollSigRef = useRef("");

  useEffect(() => {
    setPlaceholder(null);
    setRoom(null);
    setPlayers([]);
    setGameSession(null);
    setBundleLoaded(false);
    setBundleError("");
    setRoomAccessLost(false);
    lastPollSigRef.current = "";
  }, [roomId]);

  const fetchBundle = useCallback(() => fetchArcadePlaceholderBundle(roomId), [roomId]);

  const onPollBundle = useCallback(
    (b, ctx) => {
      if (handleArcadePollBundleFailure(b, ctx, setBundleError, setRoomAccessLost, roomId)) {
        return;
      }

      const ph = b.arcadePlaceholder;
      const roomSt = b.room?.status != null ? String(b.room.status) : "";
      const gsSt = b.gameSession?.status != null ? String(b.gameSession.status) : "";
      const rev = ph?.revision != null ? Number(ph.revision) : -1;
      const playerSig = Array.isArray(b.players)
        ? b.players.map((p) => `${p.student_id}`).join("|")
        : "";
      const pollSig = `${roomSt}|${gsSt}|${rev}|${playerSig}`;

      if (ctx.bundleLoadedOnceRef.current && pollSig === lastPollSigRef.current && lastPollSigRef.current !== "") {
        return;
      }
      lastPollSigRef.current = pollSig;

      setBundleError("");
      ctx.bundleLoadedOnceRef.current = true;
      setBundleLoaded(true);
      setRoom(b.room);
      setPlayers(b.players || []);
      setGameSession(b.gameSession ?? null);
      setPlaceholder(ph);
    },
    [roomId],
  );

  const { stopPolling } = useArcadeSnapshotPollEffect({
    roomId: roomId || null,
    fetchBundle,
    onBundle: onPollBundle,
    pollMs: 2000,
  });

  useArcadeRoomAccessLostRedirect(roomAccessLost, stopPolling);

  return {
    placeholder,
    room,
    players,
    gameSession,
    bundleLoaded,
    bundleError,
    stopPolling,
  };
}
