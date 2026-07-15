import { useCallback, useEffect, useState } from "react";

/** @param {{ accessToken: string, onMessage?: (msg: string) => void }} props */
export default function GuestArcadeGameToggles({ accessToken, onMessage }) {
  const [games, setGames] = useState([]);
  const [busy, setBusy] = useState(false);

  const headers = useCallback(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }),
    [accessToken]
  );

  const load = useCallback(async () => {
    if (!accessToken) return;
    const res = await fetch("/api/admin/guest/games", { headers: { Authorization: `Bearer ${accessToken}` } });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.ok) {
      setGames(
        (json.games || []).filter((g) => g.category === "online" || String(g.gameKey || "").match(/fourline|ludo|snakes|checkers|chess|domino|bingo/))
      );
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (nextGames) => {
    setBusy(true);
    onMessage?.("");
    try {
      const res = await fetch("/api/admin/guest/games", {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ games: nextGames }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        onMessage?.("שמירת משחקים נכשלה");
        return;
      }
      setGames(nextGames);
      onMessage?.("משחקי ארקייד לאורחים עודכנו");
    } catch {
      onMessage?.("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (gameKey) => {
    const next = games.map((g) =>
      g.gameKey === gameKey ? { ...g, guestPlayable: !g.guestPlayable } : g
    );
    void save(next);
  };

  const setAll = (open) => {
    const next = games.map((g) => ({ ...g, guestPlayable: open }));
    void save(next);
  };

  return (
    <section className="rounded-xl border border-white/15 bg-white/5 p-4 space-y-3 text-right" dir="rtl">
      <h2 className="text-lg font-bold">שליטת ארקייד לאורחים - משחקים</h2>
      <p className="text-xs text-white/60">
        אם הכל פתוח - אורח משחק כמו שחקן רגיל. כיבוי משחק חוסם גישה גם ל-quick-game וגם לחדרים.
      </p>
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          disabled={busy || !games.length}
          onClick={() => setAll(true)}
          className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-sm"
        >
          פתח הכל לאורחים
        </button>
        <button
          type="button"
          disabled={busy || !games.length}
          onClick={() => setAll(false)}
          className="rounded-lg border border-white/25 px-3 py-1 text-sm"
        >
          סגור הכל לאורחים
        </button>
      </div>
      <ul className="space-y-2">
        {games.map((g) => (
          <li key={g.gameKey} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(g.guestPlayable)}
                disabled={busy}
                onChange={() => toggle(g.gameKey)}
              />
              <span>{g.titleHe || g.gameKey}</span>
            </label>
            <span className="text-xs text-white/50 font-mono">{g.gameKey}</span>
          </li>
        ))}
        {!games.length ? <li className="text-sm text-white/50">אין משחקי ארקייד בקטלוג</li> : null}
      </ul>
    </section>
  );
}
