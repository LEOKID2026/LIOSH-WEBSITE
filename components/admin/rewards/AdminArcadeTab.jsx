import { useCallback, useEffect, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import { ADMIN_LOADING, ADMIN_LOAD_ERROR, apiErrorMessageHe } from "../../../lib/admin-portal/admin-ui.he.js";
import { formatArcadeGameKeyHe } from "../../../lib/admin-portal/admin-rewards-ui.he.js";

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

export default function AdminArcadeTab({ accessToken }) {
  const [sessionRow, setSessionRow] = useState(null);
  const [entryRows, setEntryRows] = useState([]);
  const [payoutRows, setPayoutRows] = useState([]);
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

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
      setMessage("נשמר — מטבעות מתרגול");
      void loadAll();
    } finally {
      setBusy("");
    }
  }

  async function saveEntryRow(row) {
    setBusy(`entry-${row.id}`);
    setMessage("");
    try {
      const res = await adminAuthFetch(accessToken, "/api/admin/rewards/economy/entry-costs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          patch: {
            amount: Number(row.amount),
            label_he: row.label_he,
            display_order: Number(row.display_order),
            is_active: row.is_active,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(apiErrorMessageHe(json?.error, "שמירה נכשלה"));
        return;
      }
      setMessage(`נשמר — עלות כניסה ${row.amount}`);
      void loadAll();
    } finally {
      setBusy("");
    }
  }

  async function savePayoutRow(row) {
    setBusy(`payout-${row.id}`);
    setMessage("");
    let parsed;
    try {
      parsed = typeof row.payout_rules_json === "string"
        ? JSON.parse(row.payout_rules_json)
        : row.payout_rules_json;
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
          id: row.id,
          patch: {
            payout_rules_json: parsed,
            is_active: row.is_active,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(apiErrorMessageHe(json?.error, "שמירה נכשלה"));
        return;
      }
      setMessage(`נשמר — ${row.game_key}`);
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

  return (
    <div dir="rtl">
      {message ? <p className="text-emerald-300 text-sm mb-3 text-right">{message}</p> : null}

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
        <div className="space-y-2">
          {entryRows.map((row) => (
            <div key={row.id} className="flex flex-wrap gap-2 items-end border-b border-white/5 pb-2">
              <label className="text-xs text-white/60">
                סכום
                <input
                  type="number"
                  className="block mt-1 w-24 rounded border border-white/15 bg-black/30 px-2 py-1 text-white"
                  value={row.amount}
                  onChange={(e) =>
                    setEntryRows((rows) =>
                      rows.map((r) => (r.id === row.id ? { ...r, amount: e.target.value } : r))
                    )
                  }
                />
              </label>
              <label className="text-xs text-white/60 flex-1 min-w-[120px]">
                תווית
                <input
                  type="text"
                  className="block mt-1 w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-white"
                  value={row.label_he || ""}
                  onChange={(e) =>
                    setEntryRows((rows) =>
                      rows.map((r) => (r.id === row.id ? { ...r, label_he: e.target.value } : r))
                    )
                  }
                />
              </label>
              <label className="text-xs text-white/60 flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={row.is_active !== false}
                  onChange={(e) =>
                    setEntryRows((rows) =>
                      rows.map((r) => (r.id === row.id ? { ...r, is_active: e.target.checked } : r))
                    )
                  }
                />
                פעיל
              </label>
              <AdminSaveButton
                busy={busy === `entry-${row.id}`}
                onClick={() => void saveEntryRow(row)}
                label="שמור"
              />
            </div>
          ))}
        </div>
      </AdminSection>

      <AdminSection title="כללי תשלום משחקי ארקייד">
        <div className="space-y-3">
          {payoutRows.map((row) => (
            <div key={row.id} className="border-b border-white/5 pb-3">
              <p className="text-white font-semibold text-sm mb-1">
                {formatArcadeGameKeyHe(row.game_key, row.arcade_games?.title)}
              </p>
              <textarea
                className="w-full min-h-[80px] rounded border border-white/15 bg-black/30 px-2 py-1 text-white text-xs font-mono"
                dir="ltr"
                value={
                  typeof row.payout_rules_json === "string"
                    ? row.payout_rules_json
                    : JSON.stringify(row.payout_rules_json, null, 2)
                }
                onChange={(e) =>
                  setPayoutRows((rows) =>
                    rows.map((r) =>
                      r.id === row.id ? { ...r, payout_rules_json: e.target.value } : r
                    )
                  )
                }
              />
              <div className="mt-2 flex items-center gap-3">
                <label className="text-xs text-white/60 flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={row.is_active !== false}
                    onChange={(e) =>
                      setPayoutRows((rows) =>
                        rows.map((r) =>
                          r.id === row.id ? { ...r, is_active: e.target.checked } : r
                        )
                      )
                    }
                  />
                  פעיל
                </label>
                <AdminSaveButton
                  busy={busy === `payout-${row.id}`}
                  onClick={() => void savePayoutRow(row)}
                  label="שמור כללי תשלום"
                />
              </div>
            </div>
          ))}
        </div>
      </AdminSection>
    </div>
  );
}
