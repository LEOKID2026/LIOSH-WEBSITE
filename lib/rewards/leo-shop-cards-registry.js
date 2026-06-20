/**
 * Shop card images — DB image_url is the single runtime source.
 * Registry removed; placeholder only when image_url missing.
 */

const DEFAULT_PLACEHOLDER = "/rewards/cards/placeholders/regular/default.svg";

/**
 * @param {{ card_key?: string | null, image_url?: string | null, image_asset_key?: string | null } | null | undefined} card
 * @returns {string | null}
 */
export function resolveShopCardImageUrl(card) {
  if (!card) return null;
  const url = String(card.image_url || "").trim();
  if (url) return url;
  const asset = String(card.image_asset_key || "").trim();
  if (asset.startsWith("/")) return asset;
  return null;
}

export function resolveShopCardImageUrlOrPlaceholder(card) {
  return resolveShopCardImageUrl(card) || DEFAULT_PLACEHOLDER;
}

/** @deprecated Use resolveShopCardImageUrl — kept for import stability */
export const LEO_SHOP_CARD_IMAGES = {};
