/**
 * Pure reward card image URL resolution — safe for client + server + tests.
 */

const DEFAULT_PLACEHOLDER = "/rewards/cards/placeholders/regular/default.svg";

/**
 * @param {string | null | undefined} url
 * @param {number} [version]
 */
export function rewardCardUrlWithVersion(url, version) {
  const raw = String(url || "").trim();
  if (!raw) return null;
  if (!version || version <= 0) return raw;
  const base = raw.split("?")[0];
  return `${base}?v=${version}`;
}

/**
 * @param {{ image_url?: string | null, image_asset_key?: string | null, image_thumb_url?: string | null, image_display_url?: string | null, image_download_url?: string | null, image_variants_version?: number | null } | null | undefined} card
 */
export function resolveRewardCardImageUrls(card) {
  if (!card) {
    return {
      thumb: DEFAULT_PLACEHOLDER,
      display: DEFAULT_PLACEHOLDER,
      download: DEFAULT_PLACEHOLDER,
      original: null,
      variantsReady: false,
    };
  }

  const version = Math.floor(Number(card.image_variants_version) || 0);
  const legacy = String(card.image_url || "").trim();
  const thumbRaw = String(card.image_thumb_url || "").trim();
  const displayRaw = String(card.image_display_url || "").trim();
  const downloadRaw = String(card.image_download_url || "").trim();

  const variantsReady = Boolean(thumbRaw && displayRaw && downloadRaw);
  const display = rewardCardUrlWithVersion(displayRaw || legacy, version) || DEFAULT_PLACEHOLDER;
  const thumb = rewardCardUrlWithVersion(thumbRaw, version) || display;
  const download = rewardCardUrlWithVersion(downloadRaw, version) || display;

  return {
    thumb,
    display,
    download,
    original: legacy || null,
    variantsReady,
  };
}

/**
 * @param {{ image_url?: string | null, image_thumb_url?: string | null, image_display_url?: string | null, image_download_url?: string | null, image_variants_version?: number | null } | null | undefined} card
 */
export function mapRewardCardImageFields(card) {
  const urls = resolveRewardCardImageUrls(card);
  return {
    imageUrl: urls.display,
    imageThumbUrl: urls.thumb,
    imageDisplayUrl: urls.display,
    imageDownloadUrl: urls.download,
    imageVariantsReady: urls.variantsReady,
  };
}

/** @deprecated Use resolveRewardCardImageUrls(card).display */
export function resolveShopCardImageUrl(card) {
  if (!card) return null;
  const urls = resolveRewardCardImageUrls(card);
  if (urls.variantsReady) return urls.display;
  const url = String(card.image_url || "").trim();
  if (url) return url;
  const asset = String(card.image_asset_key || "").trim();
  if (asset.startsWith("/")) return asset;
  return null;
}

export function resolveShopCardImageUrlOrPlaceholder(card) {
  return resolveShopCardImageUrl(card) || DEFAULT_PLACEHOLDER;
}

export function resolveRewardCardThumbUrlOrPlaceholder(card) {
  const urls = resolveRewardCardImageUrls(card);
  return urls.thumb || DEFAULT_PLACEHOLDER;
}

/**
 * Pre-baked variant URLs under reward-cards/processed/{id}/...
 * @param {string | null | undefined} url
 */
export function isPreBakedRewardCardVariantUrl(url) {
  return /\/processed\/[^/?#]+\/(thumb|display|original)\.webp(\?|$)/i.test(String(url || "")) ||
    /\/processed\/[^/?#]+\/download\.png(\?|$)/i.test(String(url || ""));
}
