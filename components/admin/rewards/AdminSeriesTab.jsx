import { useCallback, useEffect, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import { ADMIN_LOADING, ADMIN_LOAD_ERROR, apiErrorMessageHe } from "../../../lib/admin-portal/admin-ui.he.js";
import { adminRewardsSeriesUrl } from "../../../lib/admin-portal/admin-rewards-catalog.client.js";
import AdminModal, { AdminModalButton } from "../AdminModal.jsx";
import AdminCatalogArchiveToggle from "./AdminCatalogArchiveToggle.jsx";

const inputClass =
  "block w-full mt-1 rounded bg-black/30 border border-white/15 px-2 py-1 text-white text-sm";

const EMPTY_SERIES = { name_he: "", slug: "", display_order: 0, is_active: true };

function SeriesFormFields({ draft, setDraft }) {
  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        שם בעברית
        <input
          className={inputClass}
          value={draft.name_he || ""}
          onChange={(e) => setDraft((r) => ({ ...r, name_he: e.target.value }))}
        />
      </label>
      <label className="block">
        כינוי מערכת (slug)
        <input
          className={inputClass}
          dir="ltr"
          value={draft.slug || ""}
          onChange={(e) => setDraft((r) => ({ ...r, slug: e.target.value }))}
        />
      </label>
      <label className="block">
        סדר תצוגה
        <input
          type="number"
          className={inputClass}
          value={draft.display_order ?? 0}
          onChange={(e) => setDraft((r) => ({ ...r, display_order: e.target.value }))}
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={draft.is_active !== false}
          onChange={(e) => setDraft((r) => ({ ...r, is_active: e.target.checked }))}
        />
        פעיל
      </label>
    </div>
  );
}

export default function AdminSeriesTab({ accessToken }) {
  const [series, setSeries] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState(EMPTY_SERIES);
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState(EMPTY_SERIES);

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

  const closeCreate = () => {
    setCreateOpen(false);
    setCreateDraft(EMPTY_SERIES);
  };

  const closeEdit = () => {
    setEditId(null);
    setEditDraft(EMPTY_SERIES);
  };

  const startEdit = (row) => {
    setMessage("");
    setEditId(row.id);
    setEditDraft({
      name_he: row.name_he || "",
      slug: row.slug || "",
      display_order: row.display_order ?? 0,
      is_active: row.is_active !== false,
    });
  };

  const saveEdit = async () => {
    if (!editId) return;
    setBusy(editId);
    setMessage("");
    const res = await adminAuthFetch(accessToken, `/api/admin/rewards/series/${editId}`, {
      method: "PUT",
      body: JSON.stringify({
        name_he: editDraft.name_he,
        slug: editDraft.slug,
        display_order: Number(editDraft.display_order),
        is_active: editDraft.is_active !== false,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setMessage(apiErrorMessageHe(body?.error, "שמירה נכשלה"));
      return;
    }
    setMessage("סדרה נשמרה.");
    closeEdit();
    void load();
  };

  const createRow = async () => {
    setBusy("new");
    setMessage("");
    const res = await adminAuthFetch(accessToken, "/api/admin/rewards/series", {
      method: "POST",
      body: JSON.stringify(createDraft),
    });
    const body = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setMessage(apiErrorMessageHe(body?.error, "יצירה נכשלה"));
      return;
    }
    setMessage("סדרה חדשה נוצרה.");
    closeCreate();
    void load();
  };

  if (phase === "loading") return <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>;
  if (phase === "error") return <p className="text-red-300 text-sm text-right">{error}</p>;

  const editingRow = series.find((s) => s.id === editId);
  const editTitle = editingRow?.name_he ? `עריכת סדרה: ${editingRow.name_he}` : "עריכת סדרה";
  const modalMessage = message && (createOpen || editId);
  const pageMessage = message && !createOpen && !editId;

  return (
    <div className="text-right overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs text-white/60">
          מוצגות {series.length} סדרות{!includeInactive ? " (פעילות בלבד)" : " (כולל ארכיון)"}
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={() => {
              setMessage("");
              setCreateOpen(true);
              setEditId(null);
            }}
            className="rounded bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-semibold"
          >
            סדרה חדשה
          </button>
          <AdminCatalogArchiveToggle checked={includeInactive} onChange={setIncludeInactive} />
        </div>
      </div>
      {pageMessage ? <p className="text-sm text-emerald-300 mb-3">{pageMessage}</p> : null}

      <div className="overflow-x-auto">
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
                <td className="py-2 px-2">{row.name_he || "-"}</td>
                <td className="py-2 px-2" dir="ltr">
                  {row.slug || "-"}
                </td>
                <td className="py-2 px-2">{row.display_order ?? 0}</td>
                <td className="py-2 px-2">{row.is_active !== false ? "כן" : "לא"}</td>
                <td className="py-2 px-2">
                  <button
                    type="button"
                    onClick={() => startEdit(row)}
                    className="rounded border border-white/15 px-2 py-1 hover:bg-white/5"
                  >
                    עריכה
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminModal
        open={createOpen}
        onClose={closeCreate}
        title="סדרה חדשה"
        size="md"
        footer={
          <>
            <AdminModalButton onClick={closeCreate} disabled={busy === "new"}>
              ביטול
            </AdminModalButton>
            <AdminModalButton
              variant="primary"
              onClick={() => void createRow()}
              disabled={busy === "new"}
              busy={busy === "new"}
              busyLabel="יוצר..."
            >
              הוסף סדרה
            </AdminModalButton>
          </>
        }
      >
        {modalMessage ? (
          <p className={`text-sm mb-3 ${message.includes("נכשל") ? "text-red-300" : "text-emerald-300"}`}>
            {message}
          </p>
        ) : null}
        <SeriesFormFields draft={createDraft} setDraft={setCreateDraft} />
      </AdminModal>

      <AdminModal
        open={!!editId}
        onClose={closeEdit}
        title={editTitle}
        size="md"
        footer={
          <>
            <AdminModalButton onClick={closeEdit} disabled={busy === editId}>
              ביטול
            </AdminModalButton>
            <AdminModalButton
              variant="primary"
              onClick={() => void saveEdit()}
              disabled={busy === editId}
              busy={busy === editId}
              busyLabel="שומר..."
            >
              שמירה
            </AdminModalButton>
          </>
        }
      >
        {modalMessage ? (
          <p className={`text-sm mb-3 ${message.includes("נכשל") ? "text-red-300" : "text-emerald-300"}`}>
            {message}
          </p>
        ) : null}
        <SeriesFormFields draft={editDraft} setDraft={setEditDraft} />
      </AdminModal>
    </div>
  );
}
