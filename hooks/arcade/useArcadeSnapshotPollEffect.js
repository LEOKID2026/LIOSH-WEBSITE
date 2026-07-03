import { useCallback, useEffect, useRef } from "react";
import {
  clearArcadeActiveRoom,
  registerArcadeRoomPollStop,
  setArcadeActiveRoom,
} from "../../lib/arcade/client/arcadeRoomLifecycle.client.js";
import {
  haltArcadeRoomPolling,
  pollArcadeRoomSnapshot,
  useArcadePollRouteStop,
} from "./arcadeRoomSnapshotPoll";
import { useArcadeSessionRealtime } from "./useArcadeSessionRealtime.js";

/**
 * Standard snapshot poll loop for arcade game session hooks.
 *
 * @param {{
 *   roomId: string | null,
 *   fetchBundle: () => Promise<{ ok: boolean, code?: string, httpStatus?: number, error?: string, [key: string]: unknown }>,
 *   onBundle: (
 *     bundle: { ok: boolean, code?: string, httpStatus?: number, error?: string, [key: string]: unknown },
 *     ctx: { ok: boolean, stopped: boolean, bundleLoadedOnceRef: { current: boolean } },
 *   ) => void,
 *   pollMs?: number,
 *   enableRealtime?: boolean,
 * }} options
 */
export function useArcadeSnapshotPollEffect({
  roomId,
  fetchBundle,
  onBundle,
  pollMs = 1500,
  enableRealtime = true,
}) {
  const joinRecoveryAttemptedRef = useRef(false);
  const pollStoppedRef = useRef(false);
  const pollIntervalRef = useRef(/** @type {ReturnType<typeof setInterval> | null} */ (null));
  const tickInFlightRef = useRef(false);
  const bundleLoadedOnceRef = useRef(false);
  const pollRefs = { pollStoppedRef, joinRecoveryAttemptedRef, bundleLoadedOnceRef };

  const stopPolling = useCallback(() => {
    haltArcadeRoomPolling(pollRefs, pollIntervalRef);
  }, []);

  useEffect(() => registerArcadeRoomPollStop(stopPolling), [stopPolling]);

  useEffect(() => {
    if (!roomId) return undefined;
    setArcadeActiveRoom({ roomId });
    return () => clearArcadeActiveRoom(roomId);
  }, [roomId]);

  useArcadePollRouteStop(stopPolling);

  const activeRoomIdRef = useRef(/** @type {string | null} */ (null));
  const tickRef = useRef(/** @type {(() => Promise<void>) | null} */ (null));

  useEffect(() => {
    if (!roomId) {
      activeRoomIdRef.current = null;
      haltArcadeRoomPolling(pollRefs, pollIntervalRef);
      tickRef.current = null;
      return undefined;
    }
    let cancelled = false;
    if (activeRoomIdRef.current !== roomId) {
      activeRoomIdRef.current = roomId;
      pollStoppedRef.current = false;
      joinRecoveryAttemptedRef.current = false;
      bundleLoadedOnceRef.current = false;
    }
    if (pollStoppedRef.current) return undefined;
    if (pollIntervalRef.current != null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    const tick = async () => {
      if (cancelled || pollStoppedRef.current || tickInFlightRef.current) return;
      tickInFlightRef.current = true;
      try {
        const { bundle: b, stopped } = await pollArcadeRoomSnapshot(pollRefs, roomId, fetchBundle);
        if (cancelled || pollStoppedRef.current) return;
        if (!b.ok) {
          if (stopped) haltArcadeRoomPolling(pollRefs, pollIntervalRef);
          onBundle(b, { ok: false, stopped, bundleLoadedOnceRef });
          return;
        }
        onBundle(b, { ok: true, stopped: false, bundleLoadedOnceRef });
      } finally {
        tickInFlightRef.current = false;
      }
    };

    tickRef.current = tick;
    void tick();
    pollIntervalRef.current = window.setInterval(() => void tick(), pollMs);
    return () => {
      cancelled = true;
      tickRef.current = null;
      if (pollIntervalRef.current != null) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [roomId, fetchBundle, onBundle, pollMs]);

  const onRealtimeChange = useCallback(() => {
    if (tickRef.current) void tickRef.current();
  }, []);

  useArcadeSessionRealtime(enableRealtime ? roomId : null, onRealtimeChange);

  return { stopPolling, bundleLoadedOnceRef };
}
