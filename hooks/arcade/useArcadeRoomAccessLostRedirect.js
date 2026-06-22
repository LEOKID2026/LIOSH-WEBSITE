import { useEffect } from "react";
import { useRouter } from "next/router";
import { clearArcadeRoomClientState } from "../../lib/arcade/client/arcadeRoomLifecycle.client.js";

/**
 * Navigate to arcade lobby when room access is lost (403 / finished / left).
 *
 * @param {boolean} roomAccessLost
 * @param {(() => void)|undefined|null} stopPolling
 */
export function useArcadeRoomAccessLostRedirect(roomAccessLost, stopPolling) {
  const router = useRouter();

  useEffect(() => {
    if (!roomAccessLost) return undefined;
    stopPolling?.();
    clearArcadeRoomClientState();
    void router.replace("/student/arcade");
    return undefined;
  }, [roomAccessLost, stopPolling, router]);
}
