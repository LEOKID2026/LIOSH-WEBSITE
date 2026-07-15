import { useCallback, useEffect, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import { ADMIN_LOADING, ADMIN_LOAD_ERROR, apiErrorMessageHe } from "../../../lib/admin-portal/admin-ui.he.js";

export default function AdminDuplicatesTab({ accessToken }) {
  const [sellbackPercent, setSellbackPercent] = useState(25);
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
    setSellbackPercent(Number(s.duplicate_sellback_percent ?? 25));
    setPhase("ok");
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    setMessage("");
    try {
      const res = await adminAuthFetch(accessToken, "/api/admin/rewards/settings", {
        method: "PUT",
        body: JSON.stringify({ key: "duplicate_sellback_percent", value: sellbackPercent }),
      });
      if (!res.ok) throw new Error("שמירה נכשלה");
      setMessage("הגדרות מכירת כפילויות נשמרו.");
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
        <p className="text-sm text-white/75 leading-relaxed">
          הילד/ה יכול/ה למכור עותק כפול של קלף חנות ידנית - רק מהכפתור בחנות, ותמיד נשאר עותק אחד באוסף.
          המרת 10 כפילויות אוטומטית בוטלה.
        </p>
        <label className="block text-xs text-white/70">
          אחוז מכירת קלפים כפולים
          <input
            type="number"
            min={0}
            max={100}
            className="block w-32 mt-1 rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
            value={sellbackPercent}
            onChange={(e) => setSellbackPercent(Number(e.target.value))}
          />
        </label>
        <p className="text-xs text-white/55">
          שווי מכירה = floor(מחיר הקלף × אחוז ÷ 100). לדוגמה: קלף ב-100 מטבעות ו-25% → 25 מטבעות.
        </p>
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
