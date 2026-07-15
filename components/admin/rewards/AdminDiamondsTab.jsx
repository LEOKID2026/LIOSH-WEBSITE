import { useCallback, useEffect, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";

const MODE_OPTIONS = [
  { value: "win_only", label: "ניצחון / ניקוד" },
  { value: "in_game_collect", label: "איסוף במשחק" },
];

function newClientRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyTier() {
  return { minScore: 500, amount: 1 };
}

export default function AdminDiamondsTab({ accessToken }) {
  const [settings, setSettings] = useState(null);
  const [soloGames, setSoloGames] = useState([]);
  const [boxRewards, setBoxRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentInfo, setStudentInfo] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [savingGameKey, setSavingGameKey] = useState("");
  const [message, setMessage] = useState("");

  const loadAll = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    try {
      const [settingsRes, soloRes, boxRes] = await Promise.all([
        adminAuthFetch(accessToken, "/api/admin/rewards/diamonds/settings"),
        adminAuthFetch(accessToken, "/api/admin/rewards/diamonds/solo-rules"),
        adminAuthFetch(accessToken, "/api/admin/rewards/diamonds/surprise-box"),
      ]);
      const settingsJson = await settingsRes.json().catch(() => ({}));
      const soloJson = await soloRes.json().catch(() => ({}));
      const boxJson = await boxRes.json().catch(() => ({}));

      if (!settingsRes.ok || !settingsJson.ok) {
        setError(settingsJson.error || "טעינת הגדרות נכשלה");
        return;
      }
      if (!soloRes.ok || !soloJson.ok) {
        setError(soloJson.error || "טעינת חוקי solo נכשלה");
        return;
      }
      if (!boxRes.ok || !boxJson.ok) {
        setError(boxJson.error || "טעינת קופסת הפתעה נכשלה");
        return;
      }

      setSettings(settingsJson.settings || null);
      setSoloGames(soloJson.games || []);
      setBoxRewards(Array.isArray(boxJson.rewards) ? boxJson.rewards : []);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const saveSettings = async (patch) => {
    if (!accessToken) return;
    setBusy(true);
    setError("");
    try {
      const res = await adminAuthFetch(accessToken, "/api/admin/rewards/diamonds/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json.error || "שמירה נכשלה");
        return;
      }
      setSettings(json.settings);
      setMessage("הגדרות מערכת נשמרו");
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  const patchSoloGame = (gameKey, patch) => {
    setSoloGames((prev) =>
      prev.map((g) =>
        g.gameKey === gameKey
          ? { ...g, diamondRules: { ...g.diamondRules, ...patch } }
          : g
      )
    );
  };

  const patchSoloTier = (gameKey, tierIndex, patch) => {
    setSoloGames((prev) =>
      prev.map((g) => {
        if (g.gameKey !== gameKey) return g;
        const tiers = [...(g.diamondRules?.tiers || [{ minScore: 500, amount: 1 }])];
        tiers[tierIndex] = { ...tiers[tierIndex], ...patch };
        return { ...g, diamondRules: { ...g.diamondRules, tiers } };
      })
    );
  };

  const saveSoloGame = async (gameKey) => {
    const row = soloGames.find((g) => g.gameKey === gameKey);
    if (!row || !accessToken) return;
    setSavingGameKey(gameKey);
    setError("");
    setMessage("");
    try {
      const res = await adminAuthFetch(accessToken, "/api/admin/rewards/diamonds/solo-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameKey, diamondRules: row.diamondRules }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json.error || json.messageHe || "שמירת חוקי solo נכשלה");
        return;
      }
      setSoloGames((prev) =>
        prev.map((g) =>
          g.gameKey === gameKey ? { ...g, diamondRules: json.diamondRules } : g
        )
      );
      setMessage(`חוקי יהלומים נשמרו - ${row.titleHe || gameKey}`);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setSavingGameKey("");
    }
  };

  const saveBoxRewards = async () => {
    if (!accessToken) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await adminAuthFetch(accessToken, "/api/admin/rewards/diamonds/surprise-box", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewards: boxRewards }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json.error || json.messageHe || "שמירת פרסי קופסה נכשלה");
        return;
      }
      setBoxRewards(json.rewards || []);
      setMessage("פרסי יהלומים בקופסת הפתעה נשמרו");
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  const loadStudent = async () => {
    const id = studentId.trim();
    if (!id || !accessToken) return;
    setBusy(true);
    setError("");
    setStudentInfo(null);
    try {
      const res = await adminAuthFetch(
        accessToken,
        `/api/admin/students/${encodeURIComponent(id)}/diamonds`
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json.error || "ילד לא נמצא");
        return;
      }
      setStudentInfo(json);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  const submitAdjust = async () => {
    const id = studentId.trim();
    const amount = Number(adjustAmount);
    const note = adjustNote.trim();
    if (!id || !accessToken || !Number.isInteger(amount) || amount === 0 || !note) {
      setError("יש למלא מזהה ילד, סכום שלם (חיובי/שלילי) וסיבה");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await adminAuthFetch(
        accessToken,
        `/api/admin/students/${encodeURIComponent(id)}/diamonds/adjust`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            note,
            clientRequestId: newClientRequestId(),
          }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json.error || "עדכון נכשל");
        return;
      }
      setMessage(
        json.duplicate
          ? "בקשה כפולה - לא בוצע שינוי נוסף"
          : `יתרה עודכנה: ${json.balanceAfter}`
      );
      await loadStudent();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-white/60 text-sm text-right">טוען יהלומים...</p>;
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h2 className="text-lg font-bold text-white">יהלומים</h2>
        <p className="text-sm text-white/60 mt-1">
          שליטה מלאה על חוקי solo, קופסת הפתעה ועדכון ידני - נפרד ממטבעות.
        </p>
      </div>

      {error ? <p className="text-rose-300 text-sm">{error}</p> : null}
      {message ? <p className="text-emerald-300 text-sm">{message}</p> : null}

      <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h3 className="font-semibold text-amber-200">הגדרות מערכת</h3>
        <label className="flex items-center justify-between gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings?.system_enabled !== false}
            disabled={busy}
            onChange={(e) => saveSettings({ system_enabled: e.target.checked })}
            className="h-4 w-4"
          />
          <span>מערכת יהלומים פעילה</span>
        </label>
        <p className="text-xs text-white/50">
          daily_cap_mode: {settings?.daily_cap_mode || "none"}
        </p>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
        <h3 className="font-semibold text-amber-200">חוקי יהלומים - 10 משחקי Solo</h3>
        <p className="text-xs text-white/50">
          שינוי כאן משפיע ישירות על סיום משחק (diamondRules ב-payout_rules_json). מטבעות לא משתנים.
        </p>
        <div className="space-y-3">
          {soloGames.map((game) => {
            const rules = game.diamondRules || {};
            const tiers = rules.tiers?.length ? rules.tiers : [emptyTier()];
            const isCollect = rules.mode === "in_game_collect";
            return (
              <div
                key={game.gameKey}
                className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white">{game.titleHe}</p>
                  <span className="text-xs text-white/40">{game.gameKey}</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center justify-between gap-2">
                    <input
                      type="checkbox"
                      checked={rules.enabled === true}
                      onChange={(e) =>
                        patchSoloGame(game.gameKey, { enabled: e.target.checked })
                      }
                    />
                    <span>פעיל</span>
                  </label>
                  <label>
                    סוג חוק
                    <select
                      className="block w-full mt-1 rounded bg-black/40 border border-white/20 px-2 py-1 text-white"
                      value={rules.mode || "win_only"}
                      onChange={(e) => patchSoloGame(game.gameKey, { mode: e.target.value })}
                    >
                      {MODE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    מקסימום למשחק
                    <input
                      type="number"
                      min={0}
                      className="block w-full mt-1 rounded bg-black/40 border border-white/20 px-2 py-1 text-white"
                      value={rules.maxPerSession ?? 0}
                      onChange={(e) =>
                        patchSoloGame(game.gameKey, {
                          maxPerSession: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  {!isCollect ? (
                    <>
                      <label>
                        כמות קבועה
                        <input
                          type="number"
                          min={0}
                          className="block w-full mt-1 rounded bg-black/40 border border-white/20 px-2 py-1 text-white"
                          value={rules.fixedAmount ?? 0}
                          onChange={(e) =>
                            patchSoloGame(game.gameKey, {
                              fixedAmount: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="flex items-center justify-between gap-2 sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={rules.onlyOnWin === true}
                          onChange={(e) =>
                            patchSoloGame(game.gameKey, { onlyOnWin: e.target.checked })
                          }
                        />
                        <span>רק בניצחון</span>
                      </label>
                      <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                        <p className="text-white/60">דרגות לפי ניקוד (אופציונלי)</p>
                        {tiers.map((tier, i) => (
                          <div key={i} className="flex gap-2 justify-end">
                            <input
                              type="number"
                              placeholder="יהלומים"
                              className="w-24 rounded bg-black/40 border border-white/20 px-2 py-1 text-white"
                              value={tier.amount ?? 0}
                              onChange={(e) =>
                                patchSoloTier(game.gameKey, i, {
                                  amount: Number(e.target.value),
                                })
                              }
                            />
                            <input
                              type="number"
                              placeholder="ניקוד מינימלי"
                              className="w-28 rounded bg-black/40 border border-white/20 px-2 py-1 text-white"
                              value={tier.minScore ?? 0}
                              onChange={(e) =>
                                patchSoloTier(game.gameKey, i, {
                                  minScore: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <label>
                      מכפיל איסוף במשחק
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        className="block w-full mt-1 rounded bg-black/40 border border-white/20 px-2 py-1 text-white"
                        value={rules.inGameCollectMultiplier ?? 1}
                        onChange={(e) =>
                          patchSoloGame(game.gameKey, {
                            inGameCollectMultiplier: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  )}
                </div>
                <button
                  type="button"
                  disabled={savingGameKey === game.gameKey}
                  onClick={() => saveSoloGame(game.gameKey)}
                  className="rounded bg-amber-500/30 border border-amber-400/40 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  {savingGameKey === game.gameKey ? "שומר..." : "שמור משחק"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h3 className="font-semibold text-amber-200">קופסת הפתעה - פרסי יהלומים</h3>
        <p className="text-xs text-white/50">
          סכום + משקל (weighted pick). שינוי כאן משפיע על פתיחת קופסה בפועל.
        </p>
        <div className="space-y-2">
          {boxRewards.map((row, i) => (
            <div key={i} className="flex gap-2 justify-end">
              <button
                type="button"
                className="text-rose-300 text-xs px-2"
                onClick={() => setBoxRewards((prev) => prev.filter((_, idx) => idx !== i))}
              >
                הסר
              </button>
              <input
                type="number"
                placeholder="משקל"
                className="w-24 rounded bg-black/40 border border-white/20 px-2 py-1 text-white text-xs"
                value={row.weight ?? 0}
                onChange={(e) => {
                  const next = [...boxRewards];
                  next[i] = { ...next[i], weight: Number(e.target.value) };
                  setBoxRewards(next);
                }}
              />
              <input
                type="number"
                placeholder="יהלומים"
                className="w-24 rounded bg-black/40 border border-white/20 px-2 py-1 text-white text-xs"
                value={row.amount ?? 0}
                onChange={(e) => {
                  const next = [...boxRewards];
                  next[i] = { ...next[i], amount: Number(e.target.value) };
                  setBoxRewards(next);
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border border-white/20 px-3 py-1.5 text-xs"
            onClick={() => setBoxRewards((prev) => [...prev, { amount: 1, weight: 10 }])}
          >
            הוסף פרס
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={saveBoxRewards}
            className="rounded bg-amber-500/30 border border-amber-400/40 px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            שמור פרסי קופסה
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h3 className="font-semibold text-amber-200">עדכון ידני + יתרה</h3>
        <div className="flex flex-wrap gap-2">
          <input
            className="flex-1 min-w-[200px] rounded bg-black/40 border border-white/20 px-3 py-2 text-sm"
            placeholder="מזהה ילד (UUID)"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={loadStudent}
            className="rounded bg-white/10 px-4 py-2 text-sm disabled:opacity-60"
          >
            טען
          </button>
        </div>

        {studentInfo ? (
          <div className="text-sm text-white/80 space-y-1">
            <p>{studentInfo.student?.fullName}</p>
            <p>יתרה: {studentInfo.balance?.balance ?? 0} 💎</p>
            {(studentInfo.transactions || []).slice(0, 3).map((tx) => (
              <p key={tx.id} className="text-xs text-white/50">
                {tx.direction} {tx.amount} · {tx.reason}
              </p>
            ))}
          </div>
        ) : null}

        <div className="grid sm:grid-cols-2 gap-2">
          <input
            className="rounded bg-black/40 border border-white/20 px-3 py-2 text-sm"
            placeholder="סכום (+/-)"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
          />
          <input
            className="rounded bg-black/40 border border-white/20 px-3 py-2 text-sm sm:col-span-2"
            placeholder="סיבה (חובה)"
            value={adjustNote}
            onChange={(e) => setAdjustNote(e.target.value)}
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={submitAdjust}
          className="rounded bg-amber-500 text-black px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          עדכן יהלומים
        </button>
      </section>
    </div>
  );
}
