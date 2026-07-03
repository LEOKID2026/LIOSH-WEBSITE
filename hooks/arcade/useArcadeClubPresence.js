import { useEffect } from "react";

/** Heartbeat + pending invite banner */
export function useArcadeClubPresence() {
  useEffect(() => {
    const tick = () => {
      void fetch("/api/arcade/presence/heartbeat", { method: "POST" });
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
}

/** @param {{ onInvite: (invite: object) => void }} opts */
export function useArcadeClubInvites({ onInvite }) {
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const res = await fetch("/api/arcade/invites");
      const json = await res.json().catch(() => ({}));
      if (cancelled || !json?.ok) return;
      const first = (json.invites || [])[0];
      if (first && onInvite) onInvite(first);
    };

    poll();
    const id = setInterval(poll, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [onInvite]);
}
