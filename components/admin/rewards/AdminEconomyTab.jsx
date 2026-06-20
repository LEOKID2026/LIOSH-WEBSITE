import { useCallback, useEffect, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import { ADMIN_LOADING, ADMIN_LOAD_ERROR, apiErrorMessageHe } from "../../../lib/admin-portal/admin-ui.he.js";
import {
  formatEconomyEntityKeyHe,
  formatEconomyFieldNameHe,
  formatEconomySettingAreaHe,
} from "../../../lib/admin-portal/admin-rewards-ui.he.js";

const GRADE_BANDS = [
  { value: "g12", label: "כיתות א׳–ב׳" },
  { value: "g34", label: "כיתות ג׳–ד׳" },
  { value: "g56", label: "כיתות ה׳–ו׳" },
];

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

export default function AdminEconomyTab({ accessToken, onNavigateTab }) {
  const [band, setBand] = useState("g34");
  const [dailyRows, setDailyRows] = useState([]);
  const [monthlyRows, setMonthlyRows] = useState([]);
  const [globalRow, setGlobalRow] = useState(null);
  const [changeLog, setChangeLog] = useState([]);
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const loadAll = useCallback(async () => {
    if (!accessToken) return;
    setPhase("loading");
    setError("");
    try {
      const [dailyRes, monthlyRes, globalRes, logRes] = await Promise.all([
        adminAuthFetch(accessToken, "/api/admin/rewards/economy/daily-missions"),
        adminAuthFetch(accessToken, "/api/admin/rewards/economy/monthly-tiers"),
        adminAuthFetch(accessToken, "/api/admin/rewards/economy/global-settings"),
        adminAuthFetch(accessToken, "/api/admin/rewards/economy/change-log?limit=20"),
      ]);
      const [daily, monthly, global, log] = await Promise.all([
        dailyRes.json().catch(() => ({})),
        monthlyRes.json().catch(() => ({})),
        globalRes.json().catch(() => ({})),
        logRes.json().catch(() => ({})),
      ]);
      if (!dailyRes.ok || !monthlyRes.ok) {
        setError(apiErrorMessageHe(daily?.error || monthly?.error, ADMIN_LOAD_ERROR));
        setPhase("error");
        return;
      }
      setDailyRows(Array.isArray(daily.rows) ? daily.rows : []);
      setMonthlyRows(Array.isArray(monthly.rows) ? monthly.rows : []);
      setGlobalRow(global.row || null);
      setChangeLog(Array.isArray(log.rows) ? log.rows : []);
      setPhase("ok");
    } catch {
      setError(ADMIN_LOAD_ERROR);
      setPhase("error");
    }
  }, [accessToken]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const filteredDaily = dailyRows.filter((r) => r.grade_band === band);

  const saveDaily = async (row) => {
    setBusy(`daily:${row.id}`);
    setMessage("");
    const res = await adminAuthFetch(accessToken, "/api/admin/rewards/economy/daily-missions", {
      method: "PUT",
      body: JSON.stringify({
        id: row.id,
        patch: {
          text_he: row.text_he,
          target_value: Number(row.target_value),
          reward_coins: Number(row.reward_coins),
          is_active: row.is_active,
          display_order: Number(row.display_order),
        },
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setMessage(apiErrorMessageHe(body?.error, "שמירה נכשלה"));
      return;
    }
    setMessage("משימה יומית נשמרה — השינוי יחול על פרסים עתידיים בלבד.");
    void loadAll();
  };

  const saveMonthly = async (row) => {
    setBusy(`monthly:${row.id}`);
    setMessage("");
    const res = await adminAuthFetch(accessToken, "/api/admin/rewards/economy/monthly-tiers", {
      method: "PUT",
      body: JSON.stringify({
        id: row.id,
        patch: {
          minutes_threshold: Number(row.minutes_threshold),
          reward_coins: Number(row.reward_coins),
          label_he: row.label_he,
          is_active: row.is_active,
          display_order: Number(row.display_order),
        },
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setMessage(apiErrorMessageHe(body?.error, "שמירה נכשלה"));
      return;
    }
    setMessage("מדרגת התמדה נשמרה — השינוי יחול על פרסים עתידיים בלבד.");
    void loadAll();
  };

  const saveGlobal = async () => {
    if (!globalRow?.id) return;
    setBusy("global");
    setMessage("");
    const res = await adminAuthFetch(accessToken, "/api/admin/rewards/economy/global-settings", {
      method: "PUT",
      body: JSON.stringify({
        monthly_minutes_cap: Number(globalRow.monthly_minutes_cap),
        monthly_coins_cap: Number(globalRow.monthly_coins_cap),
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setMessage(apiErrorMessageHe(body?.error, "שמירה נכשלה"));
      return;
    }
    setMessage("תקרות גלובליות נשמרו.");
    void loadAll();
  };

  if (phase === "loading") return <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>;
  if (phase === "error") return <p className="text-red-300 text-sm text-right">{error}</p>;

  return (
    <div className="text-right">
      <p className="text-xs text-amber-200/80 mb-4">
        שינוי יחול על פרסים עתידיים בלבד — לא על מטבעות שכבר ניתנו.
      </p>
      {message ? <p className="text-sm text-emerald-300 mb-3">{message}</p> : null}

      <AdminSection title="משימות יומיות">
        <div className="flex flex-wrap gap-2 mb-3 justify-end">
          {GRADE_BANDS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setBand(g.value)}
              className={
                band === g.value
                  ? "rounded-lg bg-white/15 px-3 py-1 text-xs font-semibold"
                  : "rounded-lg border border-white/15 px-3 py-1 text-xs text-white/70"
              }
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right min-w-[520px]">
            <thead>
              <tr className="text-white/60 border-b border-white/10">
                <th className="py-2 px-2">טקסט לילד</th>
                <th className="py-2 px-2">יעד</th>
                <th className="py-2 px-2">מטבעות</th>
                <th className="py-2 px-2">פעיל</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {filteredDaily.map((row) => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="py-2 px-2">
                    <input
                      className="w-full rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
                      value={row.text_he || ""}
                      onChange={(e) =>
                        setDailyRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, text_he: e.target.value } : r))
                        )
                      }
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      className="w-20 rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
                      value={row.target_value ?? ""}
                      onChange={(e) =>
                        setDailyRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, target_value: e.target.value } : r
                          )
                        )
                      }
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      className="w-20 rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
                      value={row.reward_coins ?? ""}
                      onChange={(e) =>
                        setDailyRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, reward_coins: e.target.value } : r
                          )
                        )
                      }
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.is_active !== false}
                      onChange={(e) =>
                        setDailyRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, is_active: e.target.checked } : r
                          )
                        )
                      }
                    />
                  </td>
                  <td className="py-2 px-2">
                    <AdminSaveButton busy={busy === `daily:${row.id}`} onClick={() => void saveDaily(row)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <AdminSection title="התמדה חודשית">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right min-w-[480px]">
            <thead>
              <tr className="text-white/60 border-b border-white/10">
                <th className="py-2 px-2">דקות</th>
                <th className="py-2 px-2">מטבעות</th>
                <th className="py-2 px-2">שם לילד</th>
                <th className="py-2 px-2">פעיל</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {monthlyRows.map((row) => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      className="w-20 rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
                      value={row.minutes_threshold ?? ""}
                      onChange={(e) =>
                        setMonthlyRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, minutes_threshold: e.target.value } : r
                          )
                        )
                      }
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      className="w-24 rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
                      value={row.reward_coins ?? ""}
                      onChange={(e) =>
                        setMonthlyRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, reward_coins: e.target.value } : r
                          )
                        )
                      }
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      className="w-full rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
                      value={row.label_he || ""}
                      onChange={(e) =>
                        setMonthlyRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, label_he: e.target.value } : r
                          )
                        )
                      }
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.is_active !== false}
                      onChange={(e) =>
                        setMonthlyRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, is_active: e.target.checked } : r
                          )
                        )
                      }
                    />
                  </td>
                  <td className="py-2 px-2">
                    <AdminSaveButton busy={busy === `monthly:${row.id}`} onClick={() => void saveMonthly(row)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <AdminSection title="תקרות גלובליות">
        {globalRow ? (
          <div className="flex flex-wrap gap-4 items-end justify-end">
            <label className="text-xs text-white/70">
              תקרת דקות חודשית
              <input
                type="number"
                className="block mt-1 w-32 rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
                value={globalRow.monthly_minutes_cap ?? ""}
                onChange={(e) =>
                  setGlobalRow((prev) => ({ ...prev, monthly_minutes_cap: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-white/70">
              תקרת מטבעות חודשית
              <input
                type="number"
                className="block mt-1 w-32 rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
                value={globalRow.monthly_coins_cap ?? ""}
                onChange={(e) =>
                  setGlobalRow((prev) => ({ ...prev, monthly_coins_cap: e.target.value }))
                }
              />
            </label>
            <AdminSaveButton busy={busy === "global"} onClick={() => void saveGlobal()} />
          </div>
        ) : (
          <p className="text-white/50 text-sm">אין הגדרות גלובליות — יש להריץ את עדכון מסד הנתונים של מערכת הקלפים.</p>
        )}
      </AdminSection>

      <AdminSection title="קישורים מהירים">
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={() => onNavigateTab?.("box")}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5"
          >
            הגדרות קופסת הפתעה ←
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab?.("shop")}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5"
          >
            הגדרות חנות ←
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab?.("duplicates")}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5"
          >
            הגדרות כפילויות ←
          </button>
        </div>
      </AdminSection>

      <AdminSection title="יומן שינויים">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right min-w-[600px]">
            <thead>
              <tr className="text-white/60 border-b border-white/10">
                <th className="py-2 px-2">מתי</th>
                <th className="py-2 px-2">אזור</th>
                <th className="py-2 px-2">ישות</th>
                <th className="py-2 px-2">שדה</th>
              </tr>
            </thead>
            <tbody>
              {changeLog.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-white/50 text-center">
                    אין רשומות עדיין
                  </td>
                </tr>
              ) : (
                changeLog.map((row) => (
                  <tr key={row.id} className="border-b border-white/5">
                    <td className="py-2 px-2 whitespace-nowrap">
                      {row.created_at ? new Date(row.created_at).toLocaleString("he-IL") : "—"}
                    </td>
                    <td className="py-2 px-2">{formatEconomySettingAreaHe(row.setting_area)}</td>
                    <td className="py-2 px-2">{formatEconomyEntityKeyHe(row.entity_key)}</td>
                    <td className="py-2 px-2">{formatEconomyFieldNameHe(row.field_name)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </div>
  );
}
