import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/router";
import { clearArcadeRoomClientState } from "../../lib/arcade/client/arcadeRoomLifecycle.client.js";

/**
 * Leave an arcade room: stop polls, clear stored room id, POST leave, return to lobby.
 *
 * @param {{ roomId: string, stopPolling?: () => void, beforeLeave?: () => void }} options
 */
export function useArcadeRoomExit({ roomId, stopPolling, beforeLeave }) {
  const router = useRouter();
  const [leaveBusy, setLeaveBusy] = useState(false);
  const leaveBusyRef = useRef(false);

  const exitToLobby = useCallback(async () => {
    const id = String(roomId || "").trim();
    if (!id || leaveBusyRef.current) return;
    leaveBusyRef.current = true;
    setLeaveBusy(true);
    beforeLeave?.();
    stopPolling?.();
    clearArcadeRoomClientState(id);
    try {
      await fetch("/api/arcade/rooms/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ roomId: id }),
      });
    } catch {
      /* navigate even if network fails */
    } finally {
      leaveBusyRef.current = false;
      setLeaveBusy(false);
      await router.replace("/student/arcade");
    }
  }, [roomId, stopPolling, beforeLeave, router]);

  return { exitToLobby, leaveBusy };
}
