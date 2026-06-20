import { useCallback, useEffect, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import { ADMIN_LOADING, ADMIN_LOAD_ERROR, apiErrorMessageHe } from "../../../lib/admin-portal/admin-ui.he.js";
import { formatCardTypeHe, formatRarityHe } from "../../../lib/admin-portal/admin-rewards-ui.he.js";
import {
  adminRewardsCardsUrl,
  countCardsByType,
} from "../../../lib/admin-portal/admin-rewards-catalog.client.js";
import AdminCatalogArchiveToggle from "./AdminCatalogArchiveToggle.jsx";

export default function AdminCardsTab({ accessToken }) {
  const [cards, setCards] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({});

  const load = useCallback(async () => {
    if (!accessToken) return;
    setPhase("loading");
    const res = await adminAuthFetch(accessToken, adminRewardsCardsUrl(includeInactive));
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(apiErrorMessageHe(body?.error, ADMIN_LOAD_ERROR));
      setPhase("error");
      return;
    }
    setCards(Array.isArray(body.cards) ? body.cards : []);
    setPhase("ok");
  }, [accessToken, includeInactive]);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (card) => {
    setEditId(card.id);
    setDraft({
      name_he: card.name_he || "",
      description_he: card.description_he || "",
      is_active: card.is_active !== false,
      can_be_purchased: !!card.can_be_purchased,
      can_appear_in_surprise_box: !!card.can_appear_in_surprise_box,
      rarity: card.rarity || "regular",
      card_type: card.card_type || "shop",
    });
  };

  const save = async () => {
    if (!editId) return;
    setBusy(editId);
    setMessage("");
    const res = await adminAuthFetch(accessToken, `/api/admin/rewards/cards/${editId}`, {
      method: "PUT",
      body: JSON.stringify(draft),
    });
    const body = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setMessage(apiErrorMessageHe(body?.error, "שמירה נכשלה"));
      return;
    }
    setMessage("קלף נשמר.");
    setEditId(null);
    void load();
  };

  if (phase === "loading") return <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>;
  if (phase === "error") return <p className="text-red-300 text-sm text-right">{error}</p>;

  const typeCounts = countCardsByType(cards);

  return (
    <div className="text-right overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs text-white/60">
          מוצגים {cards.length} קלפים
          {!includeInactive ? " (פעילים בלבד)" : " (כולל ארכיון)"}
          {" · "}חנות {typeCounts.shop} · הישג {typeCounts.achievement} · אירוע{" "}
          {typeCounts.event}
        </p>
        <AdminCatalogArchiveToggle checked={includeInactive} onChange={setIncludeInactive} />
      </div>
      {message ? <p className="text-sm text-emerald-300 mb-3">{message}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-right min-w-[640px]">
          <thead>
            <tr className="text-white/60 border-b border-white/10">
              <th className="py-2 px-2">שם</th>
              <th className="py-2 px-2">סוג</th>
              <th className="py-2 px-2">נדירות</th>
              <th className="py-2 px-2">פעיל</th>
              <th className="py-2 px-2" />
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => (
              <tr key={card.id} className="border-b border-white/5">
                <td className="py-2 px-2">{card.name_he || "—"}</td>
                <td className="py-2 px-2">{formatCardTypeHe(card.card_type)}</td>
                <td className="py-2 px-2">{formatRarityHe(card.rarity)}</td>
                <td className="py-2 px-2">{card.is_active ? "כן" : "לא"}</td>
                <td className="py-2 px-2">
                  <button
                    type="button"
                    onClick={() => startEdit(card)}
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

      {editId ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <h4 className="font-bold text-sm">עריכת קלף</h4>
          <label className="block text-xs">
            שם בעברית
            <input
              className="block w-full mt-1 rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
              value={draft.name_he}
              onChange={(e) => setDraft((d) => ({ ...d, name_he: e.target.value }))}
            />
          </label>
          <label className="block text-xs">
            תיאור
            <textarea
              className="block w-full mt-1 rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
              rows={2}
              value={draft.description_he}
              onChange={(e) => setDraft((d) => ({ ...d, description_he: e.target.value }))}
            />
          </label>
          <div className="flex flex-wrap gap-4 text-xs">
            <label>
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
              />{" "}
              פעיל
            </label>
            <label>
              <input
                type="checkbox"
                checked={draft.can_be_purchased}
                onChange={(e) => setDraft((d) => ({ ...d, can_be_purchased: e.target.checked }))}
              />{" "}
              בחנות
            </label>
            <label>
              <input
                type="checkbox"
                checked={draft.can_appear_in_surprise_box}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, can_appear_in_surprise_box: e.target.checked }))
                }
              />{" "}
              בקופסה
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setEditId(null)} className="rounded border border-white/15 px-3 py-1 text-xs">
              ביטול
            </button>
            <button
              type="button"
              disabled={busy === editId}
              onClick={() => void save()}
              className="rounded bg-amber-500/30 border border-amber-400/40 px-3 py-1 text-xs font-semibold disabled:opacity-50"
            >
              {busy === editId ? "שומר..." : "שמירה"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
