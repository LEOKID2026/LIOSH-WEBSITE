/**
 * Pre-baked reward card asset paths + persistence (server + scripts).
 */
import {
  mapRewardCardImageFields,
  resolveRewardCardImageUrls,
  resolveRewardCardThumbUrlOrPlaceholder,
  resolveShopCardImageUrl,
  resolveShopCardImageUrlOrPlaceholder,
  rewardCardUrlWithVersion,
} from "../reward-card-image-urls.js";
import { REWARD_CARD_IMAGE_BUCKET } from "./reward-card-image.server.js";

export const REWARD_CARD_PROCESSED_PREFIX = "processed";

export const REWARD_CARD_THUMB_MAX_EDGE = 280;
export const REWARD_CARD_DISPLAY_MAX_EDGE = 960;
export const REWARD_CARD_VARIANT_CACHE_CONTROL = "public, max-age=31536000, immutable";

export {
  mapRewardCardImageFields,
  resolveRewardCardImageUrls,
  resolveRewardCardThumbUrlOrPlaceholder,
  resolveShopCardImageUrl,
  resolveShopCardImageUrlOrPlaceholder,
  rewardCardUrlWithVersion,
};

/**
 * @param {string} cardId
 */
export function rewardCardVariantStoragePaths(cardId) {
  const id = String(cardId || "").trim();
  return {
    original: `${REWARD_CARD_PROCESSED_PREFIX}/${id}/original.webp`,
    thumb: `${REWARD_CARD_PROCESSED_PREFIX}/${id}/thumb.webp`,
    display: `${REWARD_CARD_PROCESSED_PREFIX}/${id}/display.webp`,
    download: `${REWARD_CARD_PROCESSED_PREFIX}/${id}/download.png`,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceRole
 * @param {string} storagePath
 */
export function getRewardCardPublicUrl(serviceRole, storagePath) {
  const { data } = serviceRole.storage.from(REWARD_CARD_IMAGE_BUCKET).getPublicUrl(storagePath);
  return data?.publicUrl || null;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceRole
 * @param {string} cardId
 * @param {{
 *   thumbUrl: string,
 *   thumbAssetKey: string,
 *   displayUrl: string,
 *   displayAssetKey: string,
 *   downloadUrl: string,
 *   downloadAssetKey: string,
 *   originalAssetKey?: string | null,
 *   variantsVersion: number,
 * }} payload
 */
export async function persistRewardCardVariantUrls(serviceRole, cardId, payload) {
  const { data, error } = await serviceRole
    .from("reward_cards")
    .update({
      image_thumb_url: payload.thumbUrl,
      image_thumb_asset_key: payload.thumbAssetKey,
      image_display_url: payload.displayUrl,
      image_display_asset_key: payload.displayAssetKey,
      image_download_url: payload.downloadUrl,
      image_download_asset_key: payload.downloadAssetKey,
      image_original_asset_key: payload.originalAssetKey ?? null,
      image_variants_version: payload.variantsVersion,
      image_url: payload.displayUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cardId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
