/** Admin rewards catalog — active-only API URLs (default hides legacy/inactive). */

export function adminRewardsCardsUrl(includeInactive = false) {
  return includeInactive
    ? "/api/admin/rewards/cards?includeInactive=true"
    : "/api/admin/rewards/cards";
}

export function adminRewardsSeriesUrl(includeInactive = false) {
  return includeInactive
    ? "/api/admin/rewards/series?includeInactive=true"
    : "/api/admin/rewards/series";
}

/** Shop tab: active purchasable shop cards only (40 in closed catalog). */
export function filterAdminShopCatalogCards(cards) {
  return (cards || []).filter(
    (c) => c.card_type === "shop" && c.is_active !== false && c.can_be_purchased === true
  );
}

export function filterAdminEventCards(cards) {
  return (cards || []).filter((c) => c.card_type === "event");
}

export function eventCardDisplayStatusHe(card) {
  if (card?.card_type !== "event") return "-";
  if (!card.can_be_purchased && !card.can_appear_in_surprise_box) {
    return "תצוגה בלבד / בקרוב";
  }
  return "-";
}

export function countCardsByType(cards) {
  const counts = { shop: 0, achievement: 0, event: 0 };
  for (const c of cards || []) {
    if (counts[c.card_type] != null) counts[c.card_type] += 1;
  }
  return counts;
}
