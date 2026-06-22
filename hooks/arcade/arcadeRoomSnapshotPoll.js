/**
 * Shared snapshot polling for arcade game sessions.
 * Stops polling after persistent 403 (e.g. player left the room).
 * Join recovery runs only on first load when the user opened a game URL directly.
 */
import { useEffect } from "react";
import { useRouter } from "next/router";
import {
  clearArcadeActiveRoom,
  registerArcadeRoomPollStop,
} from "../../lib/arcade/client/arcadeRoomLifecycle.client.js";
import { isArcadeRoomAccessDenied } from "./arcadeSessionPollHelpers.js";

/**
 * @typedef {object} ArcadeBundleResult
 * @property {boolean} ok
 * @property {string} [code]
 * @property {number} [httpStatus]
 * @property {string} [error]
 */

/**
 * @param {{
 *   pollStoppedRef: { current: boolean },
 *   joinRecoveryAttemptedRef: { current: boolean },
 *   bundleLoadedOnceRef: { current: boolean },
 * }} refs
 * @param {string} roomId
 * @param {() => Promise<ArcadeBundleResult>} fetchBundle
 */
export async function pollArcadeRoomSnapshot(refs, roomId, fetchBundle) {
  if (refs.pollStoppedRef.current) {
    return { bundle: /** @type {ArcadeBundleResult} */ ({ ok: false, code: "poll_stopped" }), stopped: true };
  }

  let bundle = await fetchBundle();

  if (!bundle.ok && isArcadeRoomAccessDenied(bundle)) {
    if (!refs.joinRecoveryAttemptedRef.current && !refs.bundleLoadedOnceRef.current) {
      refs.joinRecoveryAttemptedRef.current = true;
      try {
        await fetch("/api/arcade/rooms/join", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId }),
        });
      } catch {
        /* */
      }
      bundle = await fetchBundle();
    } else if (!refs.joinRecoveryAttemptedRef.current) {
      refs.joinRecoveryAttemptedRef.current = true;
    }

    if (!bundle.ok && isArcadeRoomAccessDenied(bundle)) {
      refs.pollStoppedRef.current = true;
      clearArcadeActiveRoom(roomId);
      return { bundle, stopped: true };
    }
  }

  return { bundle, stopped: false };
}

/**
 * @param {{
 *   pollStoppedRef: { current: boolean },
 *   joinRecoveryAttemptedRef?: { current: boolean },
 *   bundleLoadedOnceRef?: { current: boolean },
 * }} refs
 * @param {{ current: ReturnType<typeof setInterval> | null }} [intervalRef]
 */
export function haltArcadeRoomPolling(refs, intervalRef) {
  refs.pollStoppedRef.current = true;
  if (intervalRef?.current != null) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
}

/** @deprecated use haltArcadeRoomPolling */
export function stopArcadeRoomPolling(refs) {
  haltArcadeRoomPolling(refs);
}

/**
 * Stop snapshot polling as soon as the user navigates away from the game page.
 * @param {() => void} stopPolling
 */
export function useArcadePollRouteStop(stopPolling) {
  const router = useRouter();

  useEffect(() => {
    const onRoute = () => stopPolling();
    router.events.on("routeChangeStart", onRoute);
    return () => router.events.off("routeChangeStart", onRoute);
  }, [router.events, stopPolling]);
}
