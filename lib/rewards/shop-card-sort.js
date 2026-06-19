/** Stable display order for shop cards: price asc, then rarity, series, name. */

const RARITY_ORDER = { regular: 0, special: 1, rare: 2, gold: 3 };

/**
 * @param {{ priceCoins?: number, rarity?: string, seriesNameHe?: string, nameHe?: string, id?: string }} a
 * @param {{ priceCoins?: number, rarity?: string, seriesNameHe?: string, nameHe?: string, id?: string }} b
 */
export function compareShopCardsByDisplayPrice(a, b) {
  const priceDiff = (a.priceCoins ?? 0) - (b.priceCoins ?? 0);
  if (priceDiff !== 0) return priceDiff;

  const rarityDiff = (RARITY_ORDER[a.rarity] ?? 99) - (RARITY_ORDER[b.rarity] ?? 99);
  if (rarityDiff !== 0) return rarityDiff;

  const seriesCmp = (a.seriesNameHe || "").localeCompare(b.seriesNameHe || "", "he");
  if (seriesCmp !== 0) return seriesCmp;

  const nameCmp = (a.nameHe || "").localeCompare(b.nameHe || "", "he");
  if (nameCmp !== 0) return nameCmp;

  return String(a.id || "").localeCompare(String(b.id || ""));
}

/**
 * @template T
 * @param {T[]} cards
 * @returns {T[]}
 */
export function sortShopCardsByDisplayPrice(cards) {
  return [...cards].sort(compareShopCardsByDisplayPrice);
}
