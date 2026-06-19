import { useCallback, useEffect, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import { ADMIN_LOADING, ADMIN_LOAD_ERROR, apiErrorMessageHe } from "../../../lib/admin-portal/admin-ui.he.js";
import {
  adminRewardsCardsUrl,
  eventCardDisplayStatusHe,
  filterAdminEventCards,
} from "../../../lib/admin-portal/admin-rewards-catalog.client.js";
import AdminCatalogArchiveToggle from "./AdminCatalogArchiveToggle.jsx";

export default function AdminEventsTab({ accessToken }) {
  const [cards, setCards] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

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
    setCards(filterAdminEventCards(body.cards));
    setPhase("ok");
  }, [accessToken, includeInactive]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (card) => {
    setBusy(card.id);
    setMessage("");
    const res = await adminAuthFetch(accessToken, `/api/admin/rewards/cards/${card.id}`, {
      method: "PUT",
      body: JSON.stringify({
        name_he: card.name_he,
        is_active: card.is_active !== false,
        starts_at: card.starts_at || null,
        ends_at: card.ends_at || null,
        can_be_purchased: !!card.can_be_purchased,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setMessage(apiErrorMessageHe(body?.error, "שמירה נכשלה"));
      return;
    }
    setMessage("קלף אירוע נשמר.");
    void load();
  };

  if (phase === "loading") return <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>;
  if (phase === "error") return <p className="text-red-300 text-sm text-right">{error}</p>;

  return (
    <div className="text-right overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs text-white/60">
          {cards.length} קלפי אירוע · תצוגה בנעולים/סדרות בלבד, לא בחנות ולא בקופסה
        </p>
        <AdminCatalogArchiveToggle checked={includeInactive} onChange={setIncludeInactive} />
      </div>
      {message ? <p className="text-sm text-emerald-300 mb-3">{message}</p> : null}
      {cards.length === 0 ? (
        <p className="text-white/50 text-sm">אין קלפי אירוע במערכת.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right min-w-[640px]">
            <thead>
              <tr className="text-white/60 border-b border-white/10">
                <th className="py-2 px-2">שם</th>
                <th className="py-2 px-2">סדרה</th>
                <th className="py-2 px-2">סטטוס</th>
                <th className="py-2 px-2">התחלה</th>
                <th className="py-2 px-2">סיום</th>
                <th className="py-2 px-2">פעיל</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.id} className="border-b border-white/5">
                  <td className="py-2 px-2">
                    <input
                      className="w-full rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
                      value={card.name_he || ""}
                      onChange={(e) =>
                        setCards((prev) =>
                          prev.map((c) => (c.id === card.id ? { ...c, name_he: e.target.value } : c))
                        )
                      }
                    />
                  </td>
                  <td className="py-2 px-2 whitespace-nowrap">
                    {card.reward_card_series?.name_he || "—"}
                  </td>
                  <td className="py-2 px-2 whitespace-nowrap text-amber-200/90">
                    {eventCardDisplayStatusHe(card)}
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="datetime-local"
                      className="rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
                      value={card.starts_at ? card.starts_at.slice(0, 16) : ""}
                      onChange={(e) =>
                        setCards((prev) =>
                          prev.map((c) =>
                            c.id === card.id
                              ? { ...c, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null }
                              : c
                          )
                        )
                      }
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="datetime-local"
                      className="rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
                      value={card.ends_at ? card.ends_at.slice(0, 16) : ""}
                      onChange={(e) =>
                        setCards((prev) =>
                          prev.map((c) =>
                            c.id === card.id
                              ? { ...c, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null }
                              : c
                          )
                        )
                      }
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={card.is_active !== false}
                      onChange={(e) =>
                        setCards((prev) =>
                          prev.map((c) => (c.id === card.id ? { ...c, is_active: e.target.checked } : c))
                        )
                      }
                    />
                  </td>
                  <td className="py-2 px-2">
                    <button
                      type="button"
                      disabled={busy === card.id}
                      onClick={() => void save(card)}
                      className="rounded border border-white/15 px-2 py-1 disabled:opacity-50"
                    >
                      שמירה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
