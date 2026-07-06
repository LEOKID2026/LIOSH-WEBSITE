import { useEffect, useState } from "react";
import { getParentPortalTheme } from "../../lib/parent-ui/parent-portal-theme.client.js";
import { mapParentPanelApiError } from "../../lib/parent-server/parent-api-errors.he.js";

const CATEGORY_LABELS = {
  online: "משחקים מקוונים",
  offline: "משחקים לא מקוונים",
  solo: "משחקים עצמאיים",
};

export default function ChildGamePermissionsPanel({ studentId, accessToken, bright = false }) {
  const T = getParentPortalTheme(bright);
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
        if (!res.ok || !data.ok) throw new Error(mapParentPanelApiError(data.error, "load"));
        setPermissions(data.permissions);
      } catch (err) {
        if (!cancelled) setError(mapParentPanelApiError(err.message, "load"));
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
      if (!res.ok || !data.ok) throw new Error(mapParentPanelApiError(data.error, "save"));
      setPermissions(data.permissions);
    } catch (err) {
      setError(mapParentPanelApiError(err.message, "save"));
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className={T.permissionsBox}>
        <p className={`${T.permissionsHint} text-right`}>טוען הרשאות משחקים...</p>
      </div>
    );
  }

  return (
    <div className={`${T.permissionsBox} space-y-3`}>
      <h3 className={T.permissionsTitle}>הרשאות משחקים</h3>
      <p className={T.permissionsHint}>
        כיבוי קטגוריה נועל את כל המשחקים בה. הילד יראה את הקטגוריה עם הודעת נעילה.
      </p>
      {error ? <p className={`text-xs text-right ${bright ? "text-rose-600" : "text-red-300"}`}>{error}</p> : null}
      <div className="space-y-2">
        {["online", "offline", "solo"].map((key) => {
          const field = `${key}Enabled`;
          const enabled = permissions[field] !== false;
          return (
            <div key={key} className={T.permissionsRow}>
              <button
                type="button"
                disabled={saving === key}
                onClick={() => toggleCategory(key)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                  enabled ? "bg-emerald-500" : bright ? "bg-slate-300" : "bg-white/20"
                } ${saving === key ? "opacity-60" : ""}`}
                aria-pressed={enabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    enabled ? "-translate-x-1" : "-translate-x-6"
                  }`}
                />
              </button>
              <span className={T.permissionsLabel}>{CATEGORY_LABELS[key]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
