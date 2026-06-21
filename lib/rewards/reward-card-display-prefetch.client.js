/**
 * Prefetch reward card display/thumb URLs into the browser image cache (modal navigation).
 */

/** @type {Set<string>} */
const prefetchedUrls = new Set();
/** @type {Map<string, Promise<boolean>>} */
const inFlight = new Map();

/**
 * @param {string | null | undefined} url
 * @returns {Promise<boolean>}
 */
export function prefetchRewardCardImageUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return Promise.resolve(false);
  if (typeof Image === "undefined") return Promise.resolve(false);

  const cacheKey = raw.split("?")[0];
  if (prefetchedUrls.has(cacheKey)) return Promise.resolve(true);

  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  const promise = new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      prefetchedUrls.add(cacheKey);
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = raw;
  }).finally(() => {
    inFlight.delete(cacheKey);
  });

  inFlight.set(cacheKey, promise);
  return promise;
}

/**
 * Prefetch display URLs for current, previous, and next cards in a modal list.
 * @param {object[]} cards
 * @param {number} centerIndex
 */
export function prefetchRewardCardNeighbors(cards, centerIndex) {
  if (!Array.isArray(cards) || cards.length === 0) return;

  const indices = new Set([
    centerIndex,
    centerIndex - 1,
    centerIndex + 1,
    centerIndex + 2,
    centerIndex - 2,
  ]);

  for (const index of indices) {
    if (index < 0 || index >= cards.length) continue;
    const card = cards[index];
    if (!card) continue;
    const display = String(card.imageDisplayUrl || card.imageUrl || "").trim();
    if (display) void prefetchRewardCardImageUrl(display);
  }
}

/** Test helper — clear module caches. */
export function clearRewardCardDisplayPrefetchCache() {
  prefetchedUrls.clear();
  inFlight.clear();
}
