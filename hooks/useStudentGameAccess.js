import { useCallback, useContext, useEffect, useState } from "react";
import { StudentGameAccessContext } from "../contexts/StudentGameAccessContext.jsx";

const EMPTY_GAME_ACCESS = {
  gamesByKey: {},
  categoryState: () => null,
  playableGames: () => [],
  enabledGames: () => [],
  permissions: null,
  isGuest: false,
};

/** @param {object | null} data */
export function buildStudentGameAccessView(data) {
  const gamesByKey = data?.games
    ? Object.fromEntries(data.games.map((g) => [g.gameKey, g]))
    : {};

  const categoryState = (category) => data?.categories?.[category] || null;

  const playableGames = (category) =>
    (data?.games || []).filter((g) => g.category === category && g.playable);

  const enabledGames = (category) =>
    (data?.games || []).filter((g) => g.category === category && g.isEnabled);

  return {
    state: "ready",
    data,
    error: null,
    reload: async () => data,
    gamesByKey,
    categoryState,
    playableGames,
    enabledGames,
    permissions: data?.permissions || null,
    isGuest: data?.isGuest === true,
  };
}

/** @returns {Promise<{ ok: boolean, data: object | null, error: string | null }>} */
export async function fetchStudentGameAccessClient() {
  try {
    const res = await fetch("/api/student/game-access", { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      return { ok: false, data: null, error: json.error || "load_failed" };
    }
    return { ok: true, data: json, error: null };
  } catch {
    return { ok: false, data: null, error: "network_error" };
  }
}

function useStudentGameAccessFetch({ enabled = true } = {}) {
  const [state, setState] = useState(() => (enabled ? "loading" : "ready"));
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!enabled) return null;
    setState("loading");
    setError(null);
    const result = await fetchStudentGameAccessClient();
    if (!result.ok) {
      setState("error");
      setError(result.error);
      setData(null);
      return null;
    }
    setData(result.data);
    setState("ready");
    return result.data;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    void reload();
  }, [enabled, reload]);

  if (state === "ready" && data) {
    return { ...buildStudentGameAccessView(data), reload };
  }

  return {
    state,
    data: null,
    error,
    reload,
    ...EMPTY_GAME_ACCESS,
  };
}

/**
 * Loads /api/student/game-access for the logged-in student.
 * Uses gate-prefetched context when available.
 */
export function useStudentGameAccess() {
  const ctx = useContext(StudentGameAccessContext);
  const local = useStudentGameAccessFetch({ enabled: !ctx });
  return ctx || local;
}
