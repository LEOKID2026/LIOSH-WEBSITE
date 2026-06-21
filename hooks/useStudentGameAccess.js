import { useCallback, useEffect, useState } from "react";

/**
 * Loads /api/student/game-access for the logged-in student.
 */
export function useStudentGameAccess() {
  const [state, setState] = useState("loading");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/student/game-access", { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setState("error");
        setError(json.error || "load_failed");
        setData(null);
        return null;
      }
      setData(json);
      setState("ready");
      return json;
    } catch {
      setState("error");
      setError("network_error");
      setData(null);
      return null;
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const gamesByKey = data?.games
    ? Object.fromEntries(data.games.map((g) => [g.gameKey, g]))
    : {};

  const categoryState = (category) => data?.categories?.[category] || null;

  const playableGames = (category) =>
    (data?.games || []).filter((g) => g.category === category && g.playable);

  const enabledGames = (category) =>
    (data?.games || []).filter((g) => g.category === category && g.isEnabled);

  return {
    state,
    data,
    error,
    reload,
    gamesByKey,
    categoryState,
    playableGames,
    enabledGames,
    permissions: data?.permissions || null,
  };
}
