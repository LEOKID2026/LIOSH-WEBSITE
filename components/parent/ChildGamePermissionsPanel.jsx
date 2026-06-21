import { useEffect, useState } from "react";

const CATEGORY_LABELS = {
  online: "משחקים מקוונים",
  offline: "משחקים לא מקוונים",
  solo: "משחקים עצמאיים",
};

export default function ChildGamePermissionsPanel({ studentId, accessToken }) {
  const [permissions, setPermissions] = useState({
    onlineEnabled: true,
    offlineEnabled: true,
    soloEnabled: true,
  });
  const [saving, setSaving] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!studentId || !accessToken) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/parent/students/${studentId}/game-permissions`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok) throw new Error(data.error || "שגיאה בטעינה");
        setPermissions(data.permissions);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [studentId, accessToken]);

  async function toggleCategory(key) {
    const field = `${key}Enabled`;
    const nextValue = !permissions[field];
    setSaving(key);
    setError("");

    try {
      const res = await fetch(`/api/parent/students/${studentId}/game-permissions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ [field]: nextValue }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "שגיאה בשמירה");
      setPermissions(data.permissions);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs text-white/50 text-right">טוען הרשאות משחקים...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white text-right">הרשאות משחקים</h3>
      <p className="text-xs text-white/50 text-right">
        כיבוי קטגוריה נועל את כל המשחקים בה. הילד יראה את הקטגוריה עם הודעת נעילה.
      </p>
      {error ? <p className="text-xs text-red-300 text-right">{error}</p> : null}
      <div className="space-y-2">
        {["online", "offline", "solo"].map((key) => {
          const field = `${key}Enabled`;
          const enabled = permissions[field] !== false;
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
            >
              <button
                type="button"
                disabled={saving === key}
                onClick={() => toggleCategory(key)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                  enabled ? "bg-emerald-500" : "bg-white/20"
                } ${saving === key ? "opacity-60" : ""}`}
                aria-pressed={enabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    enabled ? "-translate-x-1" : "-translate-x-6"
                  }`}
                />
              </button>
              <span className="text-sm text-white text-right flex-1">{CATEGORY_LABELS[key]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
