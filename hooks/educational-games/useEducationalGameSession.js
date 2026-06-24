import { useCallback, useRef, useState } from "react";

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  return { ok: res.ok && payload?.ok === true, status: res.status, payload };
}

/**
 * @param {string} gameKey
 */
export function useEducationalGameSession(gameKey) {
  const [sessionId, setSessionId] = useState(null);
  const [sessionStartedAtMs, setSessionStartedAtMs] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const startSession = useCallback(
    async (difficulty = null) => {
      setBusy(true);
      setError("");
      try {
        const { ok, payload } = await postJson("/api/student/educational-games/start", {
          gameKey,
          difficulty: difficulty || undefined,
        });
        if (!ok) {
          setError(typeof payload?.error === "string" ? payload.error : "לא ניתן להתחיל משחק");
          return null;
        }
        setSessionId(payload.sessionId);
        const startedMs = payload.startedAt
          ? new Date(payload.startedAt).getTime()
          : Date.now();
        setSessionStartedAtMs(startedMs);
        return payload.sessionId;
      } catch {
        setError("שגיאת רשת");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [gameKey],
  );

  const finishSession = useCallback(
    async (metrics) => {
      if (!sessionId) {
        setError("חסר מזהה משחק");
        return null;
      }
      setBusy(true);
      setError("");
      try {
        const durationMs =
          sessionStartedAtMs != null ? Math.max(0, Date.now() - sessionStartedAtMs) : undefined;
        const { ok, payload } = await postJson("/api/student/educational-games/finish", {
          sessionId,
          metrics: {
            ...metrics,
            gameKey,
            category: "educational",
            durationMs: metrics?.durationMs ?? durationMs,
          },
        });
        if (!ok) {
          setError(typeof payload?.error === "string" ? payload.error : "לא ניתן לשמור תוצאה");
          return null;
        }
        return payload;
      } catch {
        setError("שגיאת רשת");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [sessionId, sessionStartedAtMs, gameKey],
  );

  const resetSession = useCallback(() => {
    setSessionId(null);
    setSessionStartedAtMs(null);
    setError("");
  }, []);

  return {
    sessionId,
    sessionStartedAtMs,
    busy,
    error,
    startSession,
    finishSession,
    resetSession,
  };
}
