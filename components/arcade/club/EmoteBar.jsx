import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Safe preset messages / emotes inside an arcade room.
 * @param {{ roomId: string, emotes?: Array<{ studentId?: string, textHe?: string, emoji?: string, expiresAt?: string }>, className?: string }} props
 */
export default function EmoteBar({ roomId, emotes = [], className = "" }) {
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [localBubble, setLocalBubble] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/arcade/safe-messages");
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (json?.featureLocked) setLocked(true);
      else setMessages(json.messages || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleEmotes = useMemo(() => {
    const now = Date.now();
    const fromState = (emotes || []).filter((e) => {
      if (!e?.expiresAt) return true;
      return new Date(e.expiresAt).getTime() > now;
    });
    return localBubble ? [...fromState, localBubble] : fromState;
  }, [emotes, localBubble]);

  useEffect(() => {
    if (!localBubble) return undefined;
    const id = setTimeout(() => setLocalBubble(null), 10_000);
    return () => clearTimeout(id);
  }, [localBubble]);

  const send = useCallback(
    async (messageId, preview) => {
      if (!roomId || busy) return;
      setBusy(true);
      try {
        const res = await fetch(`/api/arcade/rooms/${encodeURIComponent(roomId)}/send-message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId }),
        });
        const json = await res.json().catch(() => ({}));
        if (json.ok) {
          setLocalBubble({
            textHe: preview.textHe,
            emoji: preview.emoji,
            expiresAt: new Date(Date.now() + 10_000).toISOString(),
          });
          setOpen(false);
        }
      } finally {
        setBusy(false);
      }
    },
    [roomId, busy]
  );

  if (locked || !roomId) return null;

  return (
    <div className={`relative text-right ${className}`} dir="rtl">
      {visibleEmotes.length ? (
        <div className="mb-2 flex flex-wrap gap-2 justify-center">
          {visibleEmotes.slice(-3).map((e, i) => (
            <span
              key={`${e.textHe}-${i}`}
              className="animate-pulse rounded-full border border-white/20 bg-zinc-800/90 px-3 py-1 text-sm shadow-lg"
            >
              {e.emoji ? `${e.emoji} ` : ""}
              {e.textHe}
            </span>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-white/20 bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
      >
        😊 הודעה
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 right-0 z-30 mb-2 rounded-xl border border-white/15 bg-zinc-900 p-2 shadow-xl">
          <div className="flex flex-wrap gap-1.5 justify-end">
            {messages.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={busy}
                onClick={() => void send(m.id, m)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
              >
                {m.emoji ? `${m.emoji} ` : ""}
                {m.textHe}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
