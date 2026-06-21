/**
 * Shop card images — re-exports shared URL resolver (DB variants + legacy fallback).
 */
export {
  resolveShopCardImageUrl,
  resolveShopCardImageUrlOrPlaceholder,
  resolveRewardCardImageUrls,
  mapRewardCardImageFields,
  resolveRewardCardThumbUrlOrPlaceholder,
} from "./reward-card-image-urls.js";

/** @deprecated Use resolveShopCardImageUrl — kept for import stability */
export const LEO_SHOP_CARD_IMAGES = {};
