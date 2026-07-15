import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";

const CATEGORY_LABELS = {
  online: "משחקי אונליין",
  offline: "משחקים לא מקוונים",
  solo: "משחקים רגילים",
  educational: "משחקים חינוכיים",
};

export default function AdminGamesCatalogTab({ accessToken }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    try {
      const res = await adminAuthFetch(accessToken, "/api/admin/games/catalog");
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json.error?.message || json.error?.code || json.error || "טעינה נכשלה");
        setGames([]);
        return;
      }
      setGames(json.games || []);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (gameKey, nextEnabled) => {
    if (!accessToken) return;
    setSavingKey(gameKey);
    try {
      const res = await adminAuthFetch(
        accessToken,
        `/api/admin/games/catalog/${encodeURIComponent(gameKey)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isEnabled: nextEnabled }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json.error?.message || json.error?.code || json.error || "שמירה נכשלה");
        return;
      }
      setGames((prev) =>
        prev.map((g) => (g.game_key === gameKey ? { ...g, is_enabled: nextEnabled } : g))
      );
    } catch {
      setError("שגיאת רשת");
    } finally {
      setSavingKey(null);
    }
  };

  const grouped = ["online", "offline", "solo", "educational"].map((cat) => ({
    category: cat,
    items: games.filter((g) => g.category === cat),
  }));

  if (loading) {
    return <p className="text-white/60 text-sm text-right">טוען משחקים...</p>;
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h2 className="text-lg font-bold text-white">ניהול משחקים (21)</h2>
        <p className="text-sm text-white/60 mt-1">
          כיבוי משחק בודד - מסתיר רק אותו. כיבוי כל המשחקים בקטגוריה - מסתיר את כרטיס הקטגוריה.
        </p>
        <p className="text-sm mt-2">
          <Link href="/admin/games/leo-miners" className="text-amber-200 hover:text-amber-100 underline">
            Leo Miners - הגדרות משחק מלאות (כלכלה, caps, הפעלה)
          </Link>
        </p>
      </div>

      {error ? <p className="text-rose-300 text-sm">{error}</p> : null}

      {grouped.map(({ category, items }) => (
        <section key={category} className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="font-semibold text-amber-200 mb-3">
            {CATEGORY_LABELS[category] || category}
          </h3>
          <div className="space-y-2">
            {items.map((g) => (
              <div
                key={g.game_key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2"
              >
                <div>
                  <p className="font-semibold text-white">
                    {g.emoji ? `${g.emoji} ` : ""}
                    {g.title_he}
                  </p>
                  <p className="text-xs text-white/50">{g.game_key} · {g.route}</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <span className={g.is_enabled ? "text-emerald-300" : "text-rose-300"}>
                    {g.is_enabled ? "פעיל" : "לא פעיל"}
                  </span>
                  <input
                    type="checkbox"
                    checked={g.is_enabled === true}
                    disabled={savingKey === g.game_key}
                    onChange={(e) => toggle(g.game_key, e.target.checked)}
                    className="h-4 w-4"
                  />
                </label>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
