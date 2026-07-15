import { useCallback, useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import AdminShell from "../../../components/admin/AdminShell";
import GuestArcadeGameToggles from "../../../components/admin/guest/GuestArcadeGameToggles.jsx";
import GuestFeaturePermissionsPanel from "../../../components/admin/guest/GuestFeaturePermissionsPanel.jsx";
import { useAdminSession } from "../../../lib/admin-portal/use-admin-session";
import { ADMIN_LOADING } from "../../../lib/admin-portal/admin-ui.he.js";

export default function AdminGuestPage() {
  const { state, accessToken } = useAdminSession();
  const [settings, setSettings] = useState(null);
  const [guests, setGuests] = useState([]);
  const [searchLeo, setSearchLeo] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }),
    [accessToken]
  );

  const loadAll = useCallback(async () => {
    if (!accessToken) return;
    setBusy(true);
    setMessage("");
    try {
      const [settingsRes, listRes] = await Promise.all([
        fetch("/api/admin/guest/settings", { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch(`/api/admin/guest/list${searchLeo ? `?leoNumber=${encodeURIComponent(searchLeo)}` : ""}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);
      const settingsJson = await settingsRes.json();
      const listJson = await listRes.json();
      if (settingsRes.ok && settingsJson.ok) setSettings(settingsJson.settings);
      if (listRes.ok && listJson.ok) setGuests(listJson.guests || []);
      if (!settingsRes.ok || !listRes.ok) setMessage("שגיאה בטעינת נתוני אורח");
    } catch {
      setMessage("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  }, [accessToken, searchLeo]);

  useEffect(() => {
    if (state === "ready" && accessToken) void loadAll();
  }, [state, accessToken, loadAll]);

  const saveSettings = async () => {
    if (!settings) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/guest/settings", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          guestModeEnabled: settings.guestModeEnabled ?? settings.enabled,
          defaults: settings.defaults,
          economy: settings.economy,
          surpriseBox: settings.surpriseBox,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setMessage("שמירה נכשלה");
        return;
      }
      setSettings(json.settings || settings);
      setMessage("נשמר");
    } catch {
      setMessage("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <AdminShell title="מצב אורח" showLogout>
        {state === "loading" ? (
          <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>
        ) : (
          <div className="space-y-6 text-right" dir="rtl">
            {message ? <p className="text-sm text-amber-200">{message}</p> : null}

            {settings ? (
              <section className="rounded-xl border border-white/15 bg-white/5 p-4 space-y-3">
                <h2 className="text-lg font-bold">הגדרות כלליות</h2>
                <label className="flex items-center gap-2 justify-end">
                  <span>מצב אורח פעיל</span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.guestModeEnabled ?? settings.enabled)}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, guestModeEnabled: e.target.checked, enabled: e.target.checked }))
                    }
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm">
                    משחקים לקטגוריה
                    <input
                      className="mt-1 w-full rounded bg-black/30 border border-white/20 px-2 py-1"
                      type="number"
                      min={1}
                      max={20}
                      value={settings.defaults?.gamesPerCategory ?? 2}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          defaults: { ...prev.defaults, gamesPerCategory: Number(e.target.value) },
                        }))
                      }
                    />
                  </label>
                  <label className="text-sm">
                    נושאים למקצוע
                    <input
                      className="mt-1 w-full rounded bg-black/30 border border-white/20 px-2 py-1"
                      type="number"
                      min={1}
                      max={20}
                      value={settings.defaults?.topicsPerSubject ?? 2}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          defaults: { ...prev.defaults, topicsPerSubject: Number(e.target.value) },
                        }))
                      }
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2 justify-end text-sm">
                  <span>חנות פתוחה</span>
                  <input
                    type="checkbox"
                    checked={settings.economy?.shopEnabled !== false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        economy: { ...prev.economy, shopEnabled: e.target.checked },
                      }))
                    }
                  />
                </label>
                <label className="flex items-center gap-2 justify-end text-sm">
                  <span>קלפים פתוחים</span>
                  <input
                    type="checkbox"
                    checked={settings.economy?.cardsEnabled !== false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        economy: { ...prev.economy, cardsEnabled: e.target.checked },
                      }))
                    }
                  />
                </label>
                <label className="text-sm block">
                  קופסת הפתעה - מקסימום צבירה
                  <input
                    className="mt-1 w-full rounded bg-black/30 border border-white/20 px-2 py-1"
                    type="number"
                    min={1}
                    max={3}
                    value={settings.surpriseBox?.max_pending_boxes ?? 1}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        surpriseBox: { ...prev.surpriseBox, max_pending_boxes: Number(e.target.value) },
                      }))
                    }
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveSettings()}
                  className="rounded-lg bg-amber-500 text-black font-semibold px-4 py-2 disabled:opacity-60"
                >
                  שמור הגדרות
                </button>
              </section>
            ) : null}

            {accessToken ? (
              <>
                <GuestArcadeGameToggles accessToken={accessToken} onMessage={setMessage} />
                <GuestFeaturePermissionsPanel accessToken={accessToken} onMessage={setMessage} />
              </>
            ) : null}

            <section className="rounded-xl border border-white/15 bg-white/5 p-4 space-y-3">
              <h2 className="text-lg font-bold">רשימת אורחים</h2>
              <div className="flex gap-2 justify-end">
                <input
                  className="rounded bg-black/30 border border-white/20 px-3 py-1"
                  placeholder="חיפוש לפי מספר ליאו (8 ספרות)"
                  value={searchLeo}
                  onChange={(e) => setSearchLeo(e.target.value.replace(/\D/g, "").slice(0, 8))}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void loadAll()}
                  className="rounded-lg border border-white/25 px-3 py-1"
                >
                  חפש
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/60 border-b border-white/10">
                      <th className="py-2 px-2">מספר ליאו</th>
                      <th className="py-2 px-2">סטטוס</th>
                      <th className="py-2 px-2">מטבעות</th>
                      <th className="py-2 px-2">קלפים</th>
                      <th className="py-2 px-2">נראה לאחרונה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.map((g) => (
                      <tr key={g.id} className="border-b border-white/5">
                        <td className="py-2 px-2 font-mono">{g.leoNumber || "-"}</td>
                        <td className="py-2 px-2">{g.guestStatus}</td>
                        <td className="py-2 px-2">{g.coinBalance}</td>
                        <td className="py-2 px-2">{g.cardCount}</td>
                        <td className="py-2 px-2">{g.guestLastSeenAt ? new Date(g.guestLastSeenAt).toLocaleString("he-IL") : "-"}</td>
                      </tr>
                    ))}
                    {!guests.length ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-white/50">
                          אין אורחים
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </AdminShell>
    </Layout>
  );
}
