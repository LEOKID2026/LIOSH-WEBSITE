import { useCallback, useEffect, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import { ADMIN_LOADING, ADMIN_LOAD_ERROR, apiErrorMessageHe } from "../../../lib/admin-portal/admin-ui.he.js";
import { formatRarityHe } from "../../../lib/admin-portal/admin-rewards-ui.he.js";

export default function AdminDuplicatesTab({ accessToken }) {
  const [threshold, setThreshold] = useState(10);
  const [values, setValues] = useState({});
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
    setThreshold(Number(s.duplicate_threshold ?? 10));
    setValues(s.duplicate_conversion_values || {});
    setPhase("ok");
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    setMessage("");
    try {
      const tRes = await adminAuthFetch(accessToken, "/api/admin/rewards/settings", {
        method: "PUT",
        body: JSON.stringify({ key: "duplicate_threshold", value: threshold }),
      });
      const vRes = await adminAuthFetch(accessToken, "/api/admin/rewards/settings", {
        method: "PUT",
        body: JSON.stringify({ key: "duplicate_conversion_values", value: values }),
      });
      if (!tRes.ok || !vRes.ok) throw new Error("שמירה נכשלה");
      setMessage("הגדרות כפילויות נשמרו.");
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
        <label className="block text-xs text-white/70">
          סף כפילויות להמרה
          <input
            type="number"
            className="block w-32 mt-1 rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
        </label>
        <div>
          <p className="text-xs font-bold mb-2">ערך המרה לפי נדירות (מטבעות)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {["regular", "special", "rare", "gold"].map((r) => (
              <label key={r}>
                {formatRarityHe(r)}
                <input
                  type="number"
                  className="block w-full mt-1 rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
                  value={values[r] ?? 0}
                  onChange={(e) => setValues((v) => ({ ...v, [r]: Number(e.target.value) }))}
                />
              </label>
            ))}
          </div>
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
