import { useCallback, useEffect, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import { ADMIN_LOADING, ADMIN_LOAD_ERROR, apiErrorMessageHe } from "../../../lib/admin-portal/admin-ui.he.js";
import { formatRarityHe } from "../../../lib/admin-portal/admin-rewards-ui.he.js";

async function loadSettings(token) {
  const res = await adminAuthFetch(token, "/api/admin/rewards/settings");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessageHe(body?.error, ADMIN_LOAD_ERROR));
  return body.settings || {};
}

async function saveSetting(token, key, value) {
  const res = await adminAuthFetch(token, "/api/admin/rewards/settings", {
    method: "PUT",
    body: JSON.stringify({ key, value }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessageHe(body?.error, "שמירה נכשלה"));
  return body;
}

export default function AdminBoxTab({ accessToken }) {
  const [settings, setSettings] = useState(null);
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!accessToken) return;
    setPhase("loading");
    try {
      const s = await loadSettings(accessToken);
      setSettings(s);
      setPhase("ok");
    } catch (e) {
      setError(e.message || ADMIN_LOAD_ERROR);
      setPhase("error");
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const general = settings?.surprise_box_general_settings || {};
  const coinRewards = settings?.surprise_box_coin_rewards || [];
  const rarityWeights = settings?.surprise_box_card_rarity_weights || {};

  const saveGeneral = async () => {
    setBusy(true);
    setMessage("");
    try {
      await saveSetting(accessToken, "surprise_box_general_settings", general);
      setMessage("הגדרות קופסה נשמרו.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveWeights = async () => {
    setBusy(true);
    setMessage("");
    try {
      await saveSetting(accessToken, "surprise_box_card_rarity_weights", rarityWeights);
      setMessage("משקלי נדירות נשמרו.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveCoins = async () => {
    setBusy(true);
    setMessage("");
    try {
      await saveSetting(accessToken, "surprise_box_coin_rewards", coinRewards);
      setMessage("פרסי מטבעות בקופסה נשמרו.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (phase === "loading") return <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>;
  if (phase === "error") return <p className="text-red-300 text-sm text-right">{error}</p>;

  return (
    <div className="text-right space-y-4 overflow-x-hidden">
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm font-bold mb-3">הגדרות כלליות</h3>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <label>
            מרווח בין קופסאות (דקות)
            <input
              type="number"
              className="block w-full mt-1 rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
              value={general.box_interval_minutes ?? 180}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  surprise_box_general_settings: {
                    ...general,
                    box_interval_minutes: Number(e.target.value),
                  },
                }))
              }
            />
          </label>
          <label className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              checked={general.first_box_immediate !== false}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  surprise_box_general_settings: {
                    ...general,
                    first_box_immediate: e.target.checked,
                  },
                }))
              }
            />
            קופסה ראשונה מיד
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={general.prevent_duplicate_in_box !== false}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  surprise_box_general_settings: {
                    ...general,
                    prevent_duplicate_in_box: e.target.checked,
                  },
                }))
              }
            />
            מניעת כפילות בקופסה
          </label>
          <label>
            מקסימום קופסאות נצברות לילד
            <select
              className="block w-full mt-1 rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
              value={general.max_pending_boxes ?? 1}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  surprise_box_general_settings: {
                    ...general,
                    max_pending_boxes: Number(e.target.value),
                  },
                }))
              }
            >
              {[1, 2, 3, 5, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            מספר קלפים בפתיחת קופסה
            <select
              className="block w-full mt-1 rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
              value={general.cards_per_open ?? 2}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  surprise_box_general_settings: {
                    ...general,
                    cards_per_open: Number(e.target.value),
                  },
                }))
              }
            >
              {[0, 1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            מספר פרסי מטבעות בפתיחת קופסה
            <select
              className="block w-full mt-1 rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
              value={general.coin_prizes_per_open ?? 1}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  surprise_box_general_settings: {
                    ...general,
                    coin_prizes_per_open: Number(e.target.value),
                  },
                }))
              }
            >
              {[0, 1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-[11px] text-white/50 mt-2">
          חייב להיות לפחות פרס אחד (קלפים + מטבעות). סכומי המטבעות נקבעים בטבלת פרסי מטבעות למטה.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveGeneral()}
          className="mt-3 rounded bg-amber-500/30 border border-amber-400/40 px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          שמירת הגדרות כלליות
        </button>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm font-bold mb-3">משקלי נדירות בקופסה</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {["regular", "special", "rare", "gold"].map((r) => (
            <label key={r}>
              {formatRarityHe(r)}
              <input
                type="number"
                className="block w-full mt-1 rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
                value={rarityWeights[r] ?? 0}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    surprise_box_card_rarity_weights: {
                      ...rarityWeights,
                      [r]: Number(e.target.value),
                    },
                  }))
                }
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveWeights()}
          className="mt-3 rounded bg-amber-500/30 border border-amber-400/40 px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          שמירת משקלים
        </button>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm font-bold mb-3">פרסי מטבעות (סכום + משקל)</h3>
        <div className="space-y-2">
          {coinRewards.map((row, i) => (
            <div key={i} className="flex gap-2 justify-end">
              <input
                type="number"
                placeholder="משקל"
                className="w-24 rounded bg-black/30 border border-white/15 px-2 py-1 text-white text-xs"
                value={row.weight ?? 0}
                onChange={(e) => {
                  const next = [...coinRewards];
                  next[i] = { ...next[i], weight: Number(e.target.value) };
                  setSettings((s) => ({ ...s, surprise_box_coin_rewards: next }));
                }}
              />
              <input
                type="number"
                placeholder="סכום"
                className="w-24 rounded bg-black/30 border border-white/15 px-2 py-1 text-white text-xs"
                value={row.amount ?? 0}
                onChange={(e) => {
                  const next = [...coinRewards];
                  next[i] = { ...next[i], amount: Number(e.target.value) };
                  setSettings((s) => ({ ...s, surprise_box_coin_rewards: next }));
                }}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveCoins()}
          className="mt-3 rounded bg-amber-500/30 border border-amber-400/40 px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          שמירת פרסי מטבעות
        </button>
      </section>
    </div>
  );
}
