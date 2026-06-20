import { useCallback, useEffect, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import { ADMIN_LOADING, ADMIN_LOAD_ERROR, apiErrorMessageHe } from "../../../lib/admin-portal/admin-ui.he.js";

export default function AdminGeneralTab({ accessToken }) {
  const [systemEnabled, setSystemEnabled] = useState(false);
  const [general, setGeneral] = useState({});
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!accessToken) return;
    setPhase("loading");
    const res = await adminAuthFetch(accessToken, "/api/admin/rewards/settings");
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(apiErrorMessageHe(body?.error, ADMIN_LOAD_ERROR));
      setPhase("error");
      return;
    }
    const s = body.settings || {};
    setSystemEnabled(s.system_enabled === true);
    setGeneral(s.surprise_box_general_settings || {});
    setPhase("ok");
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    setMessage("");
    try {
      const sysRes = await adminAuthFetch(accessToken, "/api/admin/rewards/settings", {
        method: "PUT",
        body: JSON.stringify({ key: "system_enabled", value: systemEnabled }),
      });
      const boxRes = await adminAuthFetch(accessToken, "/api/admin/rewards/settings", {
        method: "PUT",
        body: JSON.stringify({ key: "surprise_box_general_settings", value: general }),
      });
      if (!sysRes.ok || !boxRes.ok) throw new Error("שמירה נכשלה");
      setMessage("הגדרות כלליות נשמרו.");
    } catch (e) {
      setMessage(e.message || "שמירה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  if (phase === "loading") return <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>;
  if (phase === "error") return <p className="text-red-300 text-sm text-right">{error}</p>;

  return (
    <div className="text-right overflow-x-hidden">
      {message ? <p className="text-sm text-emerald-300 mb-3">{message}</p> : null}
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={systemEnabled}
            onChange={(e) => setSystemEnabled(e.target.checked)}
          />
          מערכת קלפים פעילה (במאגר הנתונים)
        </label>
        <p className="text-xs text-white/50">
          דגל קלפים בשרת חייב להיות פעיל כדי שהממשק יוצג להורים וילדים. הגדרה זו שולטת גם בפעולות השרת.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <label>
            מרווח קופסה (דקות)
            <input
              type="number"
              className="block w-full mt-1 rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
              value={general.box_interval_minutes ?? 180}
              onChange={(e) =>
                setGeneral((g) => ({ ...g, box_interval_minutes: Number(e.target.value) }))
              }
            />
          </label>
          <label className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              checked={general.first_box_immediate !== false}
              onChange={(e) => setGeneral((g) => ({ ...g, first_box_immediate: e.target.checked }))}
            />
            קופסה ראשונה מיד לילד חדש
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded bg-amber-500/30 border border-amber-400/40 px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {busy ? "שומר..." : "שמירה"}
        </button>
      </section>
    </div>
  );
}
