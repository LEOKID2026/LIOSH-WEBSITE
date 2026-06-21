#!/usr/bin/env node
/**
 * URL resolution + modal prefetch helpers for reward card images (#4).
 * Run: node scripts/tests/reward-card-image-urls-selftest.mjs
 */
import assert from "node:assert/strict";
import {
  mapRewardCardImageFields,
  resolveRewardCardImageUrls,
  resolveRewardCardLegacyFallbackUrl,
} from "../../lib/rewards/reward-card-image-urls.js";
import {
  clearRewardCardDisplayPrefetchCache,
  prefetchRewardCardImageUrl,
} from "../../lib/rewards/reward-card-display-prefetch.client.js";

const DEFAULT_PLACEHOLDER = "/rewards/cards/placeholders/regular/default.svg";

assert.equal(
  resolveRewardCardLegacyFallbackUrl("/rewards/cards/shop/animals/fox_clever.svg", false),
  DEFAULT_PLACEHOLDER
);
assert.equal(
  resolveRewardCardLegacyFallbackUrl("/rewards/cards/shop/professions/leo_scientist.webp", false),
  "/rewards/cards/shop/professions/leo_scientist.webp"
);

const withoutVariants = mapRewardCardImageFields({
  image_url: "/rewards/cards/shop/animals/fox_clever.svg",
});
assert.equal(withoutVariants.imageThumbUrl, DEFAULT_PLACEHOLDER);
assert.equal(withoutVariants.imageVariantsReady, false);

const withVariants = resolveRewardCardImageUrls({
  image_url: "/rewards/cards/shop/animals/fox_clever.svg",
  image_thumb_url: "https://example.com/processed/x/thumb.webp",
  image_display_url: "https://example.com/processed/x/display.webp",
  image_download_url: "https://example.com/processed/x/download.png",
  image_variants_version: 2,
});
assert.equal(withVariants.variantsReady, true);
assert.match(withVariants.thumb, /thumb\.webp/);

clearRewardCardDisplayPrefetchCache();
const prefetchResult = await prefetchRewardCardImageUrl("https://example.com/processed/x/display.webp?v=1");
assert.equal(prefetchResult, false);

console.log("reward-card-image-urls-selftest: ok");
