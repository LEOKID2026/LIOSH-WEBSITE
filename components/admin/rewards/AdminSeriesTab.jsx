import { useCallback, useEffect, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import { ADMIN_LOADING, ADMIN_LOAD_ERROR, apiErrorMessageHe } from "../../../lib/admin-portal/admin-ui.he.js";
import { adminRewardsSeriesUrl } from "../../../lib/admin-portal/admin-rewards-catalog.client.js";
import AdminCatalogArchiveToggle from "./AdminCatalogArchiveToggle.jsx";

export default function AdminSeriesTab({ accessToken }) {
  const [series, setSeries] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [newRow, setNewRow] = useState({ name_he: "", slug: "", display_order: 0, is_active: true });

  const load = useCallback(async () => {
    if (!accessToken) return;
    setPhase("loading");
    const res = await adminAuthFetch(accessToken, adminRewardsSeriesUrl(includeInactive));
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(apiErrorMessageHe(body?.error, ADMIN_LOAD_ERROR));
      setPhase("error");
      return;
    }
    setSeries(Array.isArray(body.series) ? body.series : []);
    setPhase("ok");
  }, [accessToken, includeInactive]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveRow = async (row) => {
    setBusy(row.id);
    setMessage("");
    const res = await adminAuthFetch(accessToken, `/api/admin/rewards/series/${row.id}`, {
      method: "PUT",
      body: JSON.stringify({
        name_he: row.name_he,
        slug: row.slug,
        display_order: Number(row.display_order),
        is_active: row.is_active !== false,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setMessage(apiErrorMessageHe(body?.error, "שמירה נכשלה"));
      return;
    }
    setMessage("סדרה נשמרה.");
    void load();
  };

  const createRow = async () => {
    setBusy("new");
    setMessage("");
    const res = await adminAuthFetch(accessToken, "/api/admin/rewards/series", {
      method: "POST",
      body: JSON.stringify(newRow),
    });
    const body = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setMessage(apiErrorMessageHe(body?.error, "יצירה נכשלה"));
      return;
    }
    setMessage("סדרה חדשה נוצרה.");
    setNewRow({ name_he: "", slug: "", display_order: 0, is_active: true });
    void load();
  };

  if (phase === "loading") return <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>;
  if (phase === "error") return <p className="text-red-300 text-sm text-right">{error}</p>;

  return (
    <div className="text-right overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs text-white/60">
          מוצגות {series.length} סדרות{!includeInactive ? " (פעילות בלבד)" : " (כולל ארכיון)"}
        </p>
        <AdminCatalogArchiveToggle checked={includeInactive} onChange={setIncludeInactive} />
      </div>
      {message ? <p className="text-sm text-emerald-300 mb-3">{message}</p> : null}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs text-right min-w-[520px]">
          <thead>
            <tr className="text-white/60 border-b border-white/10">
              <th className="py-2 px-2">שם</th>
              <th className="py-2 px-2">כינוי מערכת</th>
              <th className="py-2 px-2">סדר</th>
              <th className="py-2 px-2">פעיל</th>
              <th className="py-2 px-2" />
            </tr>
          </thead>
          <tbody>
            {series.map((row) => (
              <tr key={row.id} className="border-b border-white/5">
                <td className="py-2 px-2">
                  <input
                    className="w-full rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
                    value={row.name_he || ""}
                    onChange={(e) =>
                      setSeries((prev) =>
                        prev.map((s) => (s.id === row.id ? { ...s, name_he: e.target.value } : s))
                      )
                    }
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    className="w-full rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
                    value={row.slug || ""}
                    onChange={(e) =>
                      setSeries((prev) =>
                        prev.map((s) => (s.id === row.id ? { ...s, slug: e.target.value } : s))
                      )
                    }
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    type="number"
                    className="w-16 rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
                    value={row.display_order ?? 0}
                    onChange={(e) =>
                      setSeries((prev) =>
                        prev.map((s) => (s.id === row.id ? { ...s, display_order: e.target.value } : s))
                      )
                    }
                  />
                </td>
                <td className="py-2 px-2 text-center">
                  <input
                    type="checkbox"
                    checked={row.is_active !== false}
                    onChange={(e) =>
                      setSeries((prev) =>
                        prev.map((s) => (s.id === row.id ? { ...s, is_active: e.target.checked } : s))
                      )
                    }
                  />
                </td>
                <td className="py-2 px-2">
                  <button
                    type="button"
                    disabled={busy === row.id}
                    onClick={() => void saveRow(row)}
                    className="rounded border border-white/15 px-2 py-1 hover:bg-white/5 disabled:opacity-50"
                  >
                    שמירה
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
        <h4 className="font-bold text-sm">סדרה חדשה</h4>
        <div className="grid sm:grid-cols-3 gap-2">
          <input
            placeholder="שם בעברית"
            className="rounded bg-black/30 border border-white/15 px-2 py-1 text-white text-sm"
            value={newRow.name_he}
            onChange={(e) => setNewRow((r) => ({ ...r, name_he: e.target.value }))}
          />
          <input
            placeholder="כינוי-מערכת"
            className="rounded bg-black/30 border border-white/15 px-2 py-1 text-white text-sm"
            value={newRow.slug}
            onChange={(e) => setNewRow((r) => ({ ...r, slug: e.target.value }))}
          />
          <button
            type="button"
            disabled={busy === "new"}
            onClick={() => void createRow()}
            className="rounded bg-amber-500/30 border border-amber-400/40 px-3 py-1 text-sm font-semibold disabled:opacity-50"
          >
            {busy === "new" ? "יוצר..." : "הוסף סדרה"}
          </button>
        </div>
      </div>
    </div>
  );
}
