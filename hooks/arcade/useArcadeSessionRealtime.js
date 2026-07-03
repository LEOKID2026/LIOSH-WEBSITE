import { useEffect } from "react";

/**
 * Optional Supabase Realtime nudge for arcade session updates (falls back to polling).
 * @param {string | null} roomId
 * @param {() => void | Promise<void>} onChange
 */
export function useArcadeSessionRealtime(roomId, onChange) {
  useEffect(() => {
    if (!roomId || typeof window === "undefined") return undefined;

    let channel = null;
    let cancelled = false;

    (async () => {
      try {
        const { getLearningSupabaseBrowserClient } = await import("../../lib/learning-supabase/client.js");
        const supabase = getLearningSupabaseBrowserClient();
        channel = supabase
          .channel(`arcade-room-${roomId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "arcade_game_sessions",
              filter: `room_id=eq.${roomId}`,
            },
            () => {
              if (!cancelled) void onChange();
            }
          )
          .subscribe();
      } catch {
        // Realtime unavailable — polling remains the source of truth.
      }
    })();

    return () => {
      cancelled = true;
      if (channel) {
        void channel.unsubscribe();
      }
    };
  }, [roomId, onChange]);
}
