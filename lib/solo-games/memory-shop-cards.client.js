import { resolveShopCardImageUrl } from "../rewards/reward-card-image-urls.js";

const SHOP_CARDS_API = "/api/student/rewards/cards/shop";
const PLACEHOLDER = "/rewards/cards/placeholders/regular/default.svg";

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isShopCardOnly(card) {
  const type = String(card?.cardType || card?.card_type || "").trim();
  return type === "shop";
}

function hasValidImageUrl(src) {
  if (!src) return false;
  if (src === PLACEHOLDER) return false;
  if (/\/placeholders\//i.test(src)) return false;
  return true;
}

/**
 * @param {Record<string, unknown>} card
 * @returns {{ pairKey: string, src: string, preBaked: boolean, nameHe: string } | null}
 */
function mapShopCardForMemory(card) {
  if (!isShopCardOnly(card)) return null;

  const src = resolveShopCardImageUrl({
    image_url: card.imageUrl || card.image_url || null,
    image_thumb_url: card.imageThumbUrl || card.image_thumb_url || null,
    image_display_url: card.imageDisplayUrl || card.image_display_url || null,
    image_download_url: card.imageDownloadUrl || card.image_download_url || null,
    image_variants_version: card.imageVariantsVersion ?? card.image_variants_version ?? null,
    image_asset_key: card.imageAssetKey || card.image_asset_key || null,
  });

  if (!hasValidImageUrl(src)) return null;

  const pairKey = String(card.cardKey || card.card_key || card.id || "").trim();
  if (!pairKey) return null;

  return {
    pairKey,
    src,
    preBaked: card.imageVariantsReady === true,
    nameHe: String(card.nameHe || card.name_he || "").trim(),
  };
}

/**
 * Load active shop cards from the existing student shop API.
 * @returns {Promise<{ pairKey: string, src: string, preBaked: boolean, nameHe: string }[]>}
 */
export async function fetchShopCardsForMemory() {
  try {
    const res = await fetch(SHOP_CARDS_API, { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) return [];
    const payload = await res.json().catch(() => ({}));
    if (!payload?.ok || !Array.isArray(payload.shop)) return [];

    const uniq = new Map();
    for (const card of payload.shop) {
      const mapped = mapShopCardForMemory(card);
      if (mapped && !uniq.has(mapped.pairKey)) uniq.set(mapped.pairKey, mapped);
    }
    return shuffle([...uniq.values()]);
  } catch {
    return [];
  }
}

/**
 * Pick N random shop pairs and build a shuffled memory deck.
 * Shop cards only — no fallback to non-shop images.
 * @param {number} pairCount
 * @returns {Promise<{ ok: true, deck: object[] } | { ok: false, reason: string }>}
 */
export async function buildMemoryDeckFromShop(pairCount) {
  const need = Math.max(1, Math.floor(Number(pairCount) || 1));
  const shopPool = await fetchShopCardsForMemory();

  if (shopPool.length < need) {
    return { ok: false, reason: "insufficient_shop_cards" };
  }

  const finalPairs = shuffle(shopPool).slice(0, need);
  const deckItems = [];
  for (const item of finalPairs) {
    deckItems.push(item, { ...item });
  }

  const deck = shuffle(deckItems).map((item, index) => ({
    id: index,
    pairKey: item.pairKey,
    src: item.src,
    preBaked: item.preBaked,
    nameHe: item.nameHe,
  }));

  return { ok: true, deck };
}
