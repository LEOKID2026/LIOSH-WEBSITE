import { useCallback, useEffect, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import { ADMIN_LOADING, ADMIN_LOAD_ERROR, apiErrorMessageHe } from "../../../lib/admin-portal/admin-ui.he.js";
import { formatArcadeGameKeyHe } from "../../../lib/admin-portal/admin-rewards-ui.he.js";
import AdminModal, { AdminModalButton } from "../AdminModal.jsx";

const inputClass =
  "block w-full mt-1 rounded bg-black/30 border border-white/15 px-2 py-1 text-white text-sm";

function AdminSection({ title, children }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-4">
      <h3 className="text-sm font-bold text-white mb-3 text-right">{title}</h3>
      {children}
    </section>
  );
}

function AdminSaveButton({ busy, onClick, label = "שמירה" }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="rounded-lg bg-amber-500/30 border border-amber-400/40 px-4 py-2 text-sm font-semibold text-amber-100 disabled:opacity-50"
    >
      {busy ? "שומר..." : label}
    </button>
  );
}

function EntryCostFormFields({ draft, setDraft }) {
  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        סכום
        <input
          type="number"
          className={inputClass}
          value={draft.amount ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
        />
      </label>
      <label className="block">
        תווית
        <input
          type="text"
          className={inputClass}
          value={draft.label_he || ""}
          onChange={(e) => setDraft((d) => ({ ...d, label_he: e.target.value }))}
        />
      </label>
      <label className="block">
        סדר תצוגה
        <input
          type="number"
          className={inputClass}
          value={draft.display_order ?? 0}
          onChange={(e) => setDraft((d) => ({ ...d, display_order: e.target.value }))}
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={draft.is_active !== false}
          onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
        />
        פעיל
      </label>
    </div>
  );
}

function PayoutRulesFormFields({ draft, setDraft }) {
  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        כללי תשלום (JSON)
        <textarea
          className={`${inputClass} min-h-[120px] font-mono text-xs`}
          dir="ltr"
          value={draft.payout_rules_json ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, payout_rules_json: e.target.value }))}
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={draft.is_active !== false}
          onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
        />
        פעיל
      </label>
    </div>
  );
}

export default function AdminArcadeTab({ accessToken }) {
  const [sessionRow, setSessionRow] = useState(null);
  const [entryRows, setEntryRows] = useState([]);
  const [payoutRows, setPayoutRows] = useState([]);
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [editKind, setEditKind] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState({});

  const loadAll = useCallback(async () => {
    if (!accessToken) return;
    setPhase("loading");
    setError("");
    try {
      const [sessionRes, entryRes, payoutRes] = await Promise.all([
        adminAuthFetch(accessToken, "/api/admin/rewards/economy/session-coins"),
        adminAuthFetch(accessToken, "/api/admin/rewards/economy/entry-costs"),
        adminAuthFetch(accessToken, "/api/admin/rewards/economy/arcade-payout-rules"),
      ]);
      const [session, entry, payout] = await Promise.all([
        sessionRes.json().catch(() => ({})),
        entryRes.json().catch(() => ({})),
        payoutRes.json().catch(() => ({})),
      ]);
      if (!sessionRes.ok || !entryRes.ok || !payoutRes.ok) {
        setError(apiErrorMessageHe(session?.error || entry?.error || payout?.error, ADMIN_LOAD_ERROR));
        setPhase("error");
        return;
      }
      setSessionRow(session.row || null);
      setEntryRows(Array.isArray(entry.rows) ? entry.rows : []);
      setPayoutRows(Array.isArray(payout.rows) ? payout.rows : []);
      setPhase("ok");
    } catch {
      setError(ADMIN_LOAD_ERROR);
      setPhase("error");
    }
  }, [accessToken]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const closeEdit = () => {
    setEditKind(null);
    setEditId(null);
    setEditDraft({});
  };

  const startEntryEdit = (row) => {
    setMessage("");
    setEditKind("entry");
    setEditId(row.id);
    setEditDraft({
      amount: row.amount ?? "",
      label_he: row.label_he || "",
      display_order: row.display_order ?? 0,
      is_active: row.is_active !== false,
    });
  };

  const startPayoutEdit = (row) => {
    setMessage("");
    setEditKind("payout");
    setEditId(row.id);
    setEditDraft({
      payout_rules_json:
        typeof row.payout_rules_json === "string"
          ? row.payout_rules_json
          : JSON.stringify(row.payout_rules_json, null, 2),
      is_active: row.is_active !== false,
    });
  };

  async function saveSession() {
    if (!sessionRow?.id) return;
    setBusy("session");
    setMessage("");
    try {
      const res = await adminAuthFetch(accessToken, "/api/admin/rewards/economy/session-coins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patch: {
            base_coins: Number(sessionRow.base_coins),
            bonus_80_coins: Number(sessionRow.bonus_80_coins),
            bonus_95_coins: Number(sessionRow.bonus_95_coins),
            daily_cap: Number(sessionRow.daily_cap),
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(apiErrorMessageHe(json?.error, "שמירה נכשלה"));
        return;
      }
      setSessionRow(json.row || sessionRow);
      setMessage("נשמר - מטבעות מתרגול");
      void loadAll();
    } finally {
      setBusy("");
    }
  }

  async function saveEntryEdit() {
    if (!editId || editKind !== "entry") return;
    setBusy(`entry-${editId}`);
    setMessage("");
    try {
      const res = await adminAuthFetch(accessToken, "/api/admin/rewards/economy/entry-costs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId,
          patch: {
            amount: Number(editDraft.amount),
            label_he: editDraft.label_he,
            display_order: Number(editDraft.display_order),
            is_active: editDraft.is_active,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(apiErrorMessageHe(json?.error, "שמירה נכשלה"));
        return;
      }
      setMessage(`נשמר - עלות כניסה ${editDraft.amount}`);
      closeEdit();
      void loadAll();
    } finally {
      setBusy("");
    }
  }

  async function savePayoutEdit() {
    if (!editId || editKind !== "payout") return;
    setBusy(`payout-${editId}`);
    setMessage("");
    let parsed;
    try {
      parsed = JSON.parse(editDraft.payout_rules_json);
    } catch {
      setMessage("מבנה כללי התשלום לא תקין");
      setBusy("");
      return;
    }
    try {
      const res = await adminAuthFetch(accessToken, "/api/admin/rewards/economy/arcade-payout-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId,
          patch: {
            payout_rules_json: parsed,
            is_active: editDraft.is_active,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(apiErrorMessageHe(json?.error, "שמירה נכשלה"));
        return;
      }
      const row = payoutRows.find((r) => r.id === editId);
      setMessage(`נשמר - ${row?.game_key || "משחק"}`);
      closeEdit();
      void loadAll();
    } finally {
      setBusy("");
    }
  }

  if (phase === "loading") {
    return <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>;
  }
  if (phase === "error") {
    return <p className="text-red-300 text-sm text-right">{error}</p>;
  }

  const editingEntry = editKind === "entry" ? entryRows.find((r) => r.id === editId) : null;
  const editingPayout = editKind === "payout" ? payoutRows.find((r) => r.id === editId) : null;
  const editBusy =
    editKind === "entry" ? busy === `entry-${editId}` : editKind === "payout" ? busy === `payout-${editId}` : false;
  const modalMessage = message && editId;
  const pageMessage = message && !editId;

  const editTitle =
    editKind === "entry"
      ? editingEntry?.label_he
        ? `עריכת עלות כניסה: ${editingEntry.label_he}`
        : "עריכת עלות כניסה"
      : editingPayout
        ? `עריכת תשלום: ${formatArcadeGameKeyHe(editingPayout.game_key, editingPayout.arcade_games?.title)}`
        : "עריכת כללי תשלום";

  const handleSaveEdit = () => {
    if (editKind === "entry") void saveEntryEdit();
    else if (editKind === "payout") void savePayoutEdit();
  };

  return (
    <div dir="rtl">
      {pageMessage ? <p className="text-emerald-300 text-sm mb-3 text-right">{pageMessage}</p> : null}

      <AdminSection title="מטבעות מתרגול (נוסחה + תקרה יומית)">
        {sessionRow ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              ["base_coins", "בסיס"],
              ["bonus_80_coins", "בונוס 80%"],
              ["bonus_95_coins", "בונוס 95%"],
              ["daily_cap", "תקרה יומית"],
            ].map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-white/60 text-xs">{label}</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-white"
                  value={sessionRow[key] ?? ""}
                  onChange={(e) =>
                    setSessionRow((r) => ({ ...r, [key]: e.target.value }))
                  }
                />
              </label>
            ))}
          </div>
        ) : (
          <p className="text-white/50 text-sm">אין שורה במאגר הנתונים</p>
        )}
        <div className="mt-3">
          <AdminSaveButton busy={busy === "session"} onClick={() => void saveSession()} />
        </div>
      </AdminSection>

      <AdminSection title="עלויות כניסה לארקייד">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right min-w-[420px]">
            <thead>
              <tr className="text-white/60 border-b border-white/10">
                <th className="py-2 px-2">סכום</th>
                <th className="py-2 px-2">תווית</th>
                <th className="py-2 px-2">פעיל</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {entryRows.map((row) => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="py-2 px-2">{row.amount ?? "-"}</td>
                  <td className="py-2 px-2">{row.label_he || "-"}</td>
                  <td className="py-2 px-2">{row.is_active !== false ? "כן" : "לא"}</td>
                  <td className="py-2 px-2">
                    <button
                      type="button"
                      onClick={() => startEntryEdit(row)}
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
      </AdminSection>

      <AdminSection title="כללי תשלום משחקי ארקייד">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right min-w-[420px]">
            <thead>
              <tr className="text-white/60 border-b border-white/10">
                <th className="py-2 px-2">משחק</th>
                <th className="py-2 px-2">פעיל</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {payoutRows.map((row) => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="py-2 px-2">
                    {formatArcadeGameKeyHe(row.game_key, row.arcade_games?.title)}
                  </td>
                  <td className="py-2 px-2">{row.is_active !== false ? "כן" : "לא"}</td>
                  <td className="py-2 px-2">
                    <button
                      type="button"
                      onClick={() => startPayoutEdit(row)}
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
      </AdminSection>

      <AdminModal
        open={!!editId}
        onClose={closeEdit}
        title={editTitle}
        size={editKind === "payout" ? "lg" : "md"}
        footer={
          <>
            <AdminModalButton onClick={closeEdit} disabled={editBusy}>
              ביטול
            </AdminModalButton>
            <AdminModalButton
              variant="primary"
              onClick={handleSaveEdit}
              disabled={editBusy}
              busy={editBusy}
              busyLabel="שומר..."
            >
              שמירה
            </AdminModalButton>
          </>
        }
      >
        {modalMessage ? (
          <p className={`text-sm mb-3 ${message.includes("נכשל") || message.includes("לא תקין") ? "text-red-300" : "text-emerald-300"}`}>
            {message}
          </p>
        ) : null}
        {editKind === "entry" ? (
          <EntryCostFormFields draft={editDraft} setDraft={setEditDraft} />
        ) : editKind === "payout" ? (
          <PayoutRulesFormFields draft={editDraft} setDraft={setEditDraft} />
        ) : null}
      </AdminModal>
    </div>
  );
}
