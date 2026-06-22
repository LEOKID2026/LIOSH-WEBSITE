import { useCallback, useEffect, useRef, useState } from "react";
import { fetchArcadePlaceholderBundle } from "../../lib/arcade/placeholder/placeholderSessionAdapter";
import { useArcadeSnapshotPollEffect } from "./useArcadeSnapshotPollEffect";

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
  const lastPollSigRef = useRef("");

  useEffect(() => {
    setPlaceholder(null);
    setRoom(null);
    setPlayers([]);
    setGameSession(null);
    setBundleLoaded(false);
    setBundleError("");
    lastPollSigRef.current = "";
  }, [roomId]);

  const fetchBundle = useCallback(() => fetchArcadePlaceholderBundle(roomId), [roomId]);

  const onPollBundle = useCallback((b, ctx) => {
    if (!ctx.ok) {
      if (!ctx.bundleLoadedOnceRef.current) {
        const msg =
          b.code === "forbidden"
            ? "אין גישה לחדר (לא רשום כשחקן)."
            : b.error || b.code || "טעינת החדר נכשלה";
        setBundleError(msg);
      }
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
  }, []);

  const { stopPolling } = useArcadeSnapshotPollEffect({
    roomId: roomId || null,
    fetchBundle,
    onBundle: onPollBundle,
    pollMs: 2000,
  });

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
