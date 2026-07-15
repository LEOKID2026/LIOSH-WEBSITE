import { useCallback, useEffect, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import { ADMIN_LOADING, ADMIN_LOAD_ERROR, apiErrorMessageHe } from "../../../lib/admin-portal/admin-ui.he.js";
import { formatRarityHe } from "../../../lib/admin-portal/admin-rewards-ui.he.js";
import {
  adminRewardsCardsUrl,
  filterAdminShopCatalogCards,
} from "../../../lib/admin-portal/admin-rewards-catalog.client.js";
import AdminModal, { AdminModalButton } from "../AdminModal.jsx";
import AdminCatalogArchiveToggle from "./AdminCatalogArchiveToggle.jsx";

const inputClass =
  "block w-full mt-1 rounded bg-black/30 border border-white/15 px-2 py-1 text-white text-sm";

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
}

function formatCardPriceDisplay(card, defaultPrices) {
  if (card.use_default_price !== false) {
    const fallback = defaultPrices?.[card.rarity];
    return fallback != null ? `${fallback} (ברירת מחדל)` : "ברירת מחדל";
  }
  return card.price_coins != null ? String(card.price_coins) : "-";
}

export default function AdminShopTab({ accessToken }) {
  const [prices, setPrices] = useState({});
  const [cards, setCards] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [editCardId, setEditCardId] = useState(null);
  const [priceDraft, setPriceDraft] = useState({ use_default_price: true, price_coins: "" });

  const load = useCallback(async () => {
    if (!accessToken) return;
    setPhase("loading");
    try {
      const [settingsRes, cardsRes] = await Promise.all([
        adminAuthFetch(accessToken, "/api/admin/rewards/settings"),
        adminAuthFetch(accessToken, adminRewardsCardsUrl(includeInactive)),
      ]);
      const settingsBody = await settingsRes.json().catch(() => ({}));
      const cardsBody = await cardsRes.json().catch(() => ({}));
      if (!settingsRes.ok || !cardsRes.ok) {
        throw new Error(ADMIN_LOAD_ERROR);
      }
      setPrices(settingsBody.settings?.shop_default_prices || {});
      const allFetched = cardsBody.cards || [];
      setCards(
        includeInactive
          ? allFetched.filter((c) => c.card_type === "shop")
          : filterAdminShopCatalogCards(allFetched)
      );
      setPhase("ok");
    } catch (e) {
      setError(e.message || ADMIN_LOAD_ERROR);
      setPhase("error");
    }
  }, [accessToken, includeInactive]);

  useEffect(() => {
    void load();
  }, [load]);

  const closePriceEdit = () => {
    setEditCardId(null);
    setPriceDraft({ use_default_price: true, price_coins: "" });
  };

  const startPriceEdit = (card) => {
    setMessage("");
    setEditCardId(card.id);
    setPriceDraft({
      use_default_price: card.use_default_price !== false,
      price_coins: card.price_coins ?? "",
    });
  };

  const saveDefaults = async () => {
    setBusy("defaults");
    setMessage("");
    try {
      await saveSetting(accessToken, "shop_default_prices", prices);
      setMessage("מחירי ברירת מחדל נשמרו.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy("");
    }
  };

  const saveCardPrice = async () => {
    if (!editCardId) return;
    const card = cards.find((c) => c.id === editCardId);
    if (!card) return;
    setBusy(editCardId);
    setMessage("");
    const res = await adminAuthFetch(accessToken, `/api/admin/rewards/cards/${editCardId}`, {
      method: "PUT",
      body: JSON.stringify({
        price_coins: priceDraft.price_coins != null && priceDraft.price_coins !== ""
          ? Number(priceDraft.price_coins)
          : null,
        use_default_price: priceDraft.use_default_price !== false,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setMessage(apiErrorMessageHe(body?.error, "שמירה נכשלה"));
      return;
    }
    setMessage(`מחיר ${card.name_he} נשמר.`);
    closePriceEdit();
    void load();
  };

  if (phase === "loading") return <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>;
  if (phase === "error") return <p className="text-red-300 text-sm text-right">{error}</p>;

  const editingCard = cards.find((c) => c.id === editCardId);
  const editTitle = editingCard?.name_he ? `עריכת מחיר: ${editingCard.name_he}` : "עריכת מחיר";
  const modalMessage = message && editCardId;
  const pageMessage = message && !editCardId;

  return (
    <div className="text-right space-y-4 overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-white/60">
          מוצגים {cards.length} קלפי חנות
          {!includeInactive ? " (פעילים וניתנים לרכישה)" : " (כולל ארכיון)"}
        </p>
        <AdminCatalogArchiveToggle checked={includeInactive} onChange={setIncludeInactive} />
      </div>
      {pageMessage ? <p className="text-sm text-emerald-300">{pageMessage}</p> : null}

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm font-bold mb-3">מחירי ברירת מחדל לפי נדירות</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {["regular", "special", "rare", "gold"].map((r) => (
            <label key={r}>
              {formatRarityHe(r)}
              <input
                type="number"
                className="block w-full mt-1 rounded bg-black/30 border border-white/15 px-2 py-1 text-white"
                value={prices[r] ?? 0}
                onChange={(e) => setPrices((p) => ({ ...p, [r]: Number(e.target.value) }))}
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={busy === "defaults"}
          onClick={() => void saveDefaults()}
          className="mt-3 rounded bg-amber-500/30 border border-amber-400/40 px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          שמירה
        </button>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm font-bold mb-3">מחיר לפי קלף</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right min-w-[480px]">
            <thead>
              <tr className="text-white/60 border-b border-white/10">
                <th className="py-2 px-2">שם</th>
                <th className="py-2 px-2">נדירות</th>
                <th className="py-2 px-2">מחיר</th>
                <th className="py-2 px-2">ברירת מחדל</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.id} className="border-b border-white/5">
                  <td className="py-2 px-2">{card.name_he}</td>
                  <td className="py-2 px-2">{formatRarityHe(card.rarity)}</td>
                  <td className="py-2 px-2">{formatCardPriceDisplay(card, prices)}</td>
                  <td className="py-2 px-2">{card.use_default_price !== false ? "כן" : "לא"}</td>
                  <td className="py-2 px-2">
                    <button
                      type="button"
                      onClick={() => startPriceEdit(card)}
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
      </section>

      <AdminModal
        open={!!editCardId}
        onClose={closePriceEdit}
        title={editTitle}
        size="md"
        footer={
          <>
            <AdminModalButton onClick={closePriceEdit} disabled={busy === editCardId}>
              ביטול
            </AdminModalButton>
            <AdminModalButton
              variant="primary"
              onClick={() => void saveCardPrice()}
              disabled={busy === editCardId}
              busy={busy === editCardId}
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
        {editingCard ? (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-white/50 text-xs mb-1">שם הקלף</p>
              <p className="font-semibold">{editingCard.name_he || "-"}</p>
            </div>
            <div>
              <p className="text-white/50 text-xs mb-1">מחיר נוכחי</p>
              <p className="font-semibold text-amber-200">
                {formatCardPriceDisplay(editingCard, prices)}
              </p>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={priceDraft.use_default_price !== false}
                onChange={(e) =>
                  setPriceDraft((d) => ({ ...d, use_default_price: e.target.checked }))
                }
              />
              מחיר ברירת מחדל לפי נדירות
            </label>
            {!priceDraft.use_default_price ? (
              <label className="block">
                מחיר במטבעות
                <input
                  type="number"
                  className={inputClass}
                  value={priceDraft.price_coins ?? ""}
                  onChange={(e) => setPriceDraft((d) => ({ ...d, price_coins: e.target.value }))}
                />
              </label>
            ) : null}
          </div>
        ) : null}
      </AdminModal>
    </div>
  );
}
