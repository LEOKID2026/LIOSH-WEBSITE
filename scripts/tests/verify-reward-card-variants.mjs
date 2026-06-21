#!/usr/bin/env node
/**
 * Verify pre-baked reward card variants in DB + storage URLs.
 *
 * Usage:
 *   node --env-file=.env.local scripts/tests/verify-reward-card-variants.mjs
 *   node scripts/tests/verify-reward-card-variants.mjs --local-only
 */
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import {
  isPreBakedRewardCardVariantUrl,
  mapRewardCardImageFields,
  resolveRewardCardImageUrls,
  rewardCardUrlWithVersion,
} from "../../lib/rewards/reward-card-image-urls.js";
import { resolveRewardCardDisplaySource } from "../../lib/rewards/reward-card-image-process.client.js";
import { rewardCardVariantStoragePaths } from "../../lib/rewards/server/reward-card-assets.server.js";

const localOnly = process.argv.includes("--local-only");

function ok(label) {
  console.log(`  ok  ${label}`);
}

assert.equal(
  rewardCardVariantStoragePaths("abc-123").thumb,
  "processed/abc-123/thumb.webp"
);
assert.equal(
  rewardCardVariantStoragePaths("abc-123").download,
  "processed/abc-123/download.png"
);
ok("deterministic storage paths");

const versioned = rewardCardUrlWithVersion("https://x.test/processed/id/thumb.webp", 42);
assert.equal(versioned, "https://x.test/processed/id/thumb.webp?v=42");
ok("rewardCardUrlWithVersion cache bust");

const readyCard = {
  image_url: "https://legacy.example/shop/a.webp",
  image_thumb_url: "https://cdn.example/processed/id/thumb.webp",
  image_display_url: "https://cdn.example/processed/id/display.webp",
  image_download_url: "https://cdn.example/processed/id/download.png",
  image_variants_version: 7,
};
const urls = resolveRewardCardImageUrls(readyCard);
assert.equal(urls.variantsReady, true);
assert.match(urls.thumb, /thumb\.webp\?v=7$/);
assert.match(urls.display, /display\.webp\?v=7$/);
assert.match(urls.download, /download\.png\?v=7$/);
ok("resolveRewardCardImageUrls with variants");

const mapped = mapRewardCardImageFields(readyCard);
assert.equal(mapped.imageVariantsReady, true);
assert.equal(mapped.imageThumbUrl, urls.thumb);
assert.equal(mapped.imageDisplayUrl, urls.display);
ok("mapRewardCardImageFields");

assert.equal(isPreBakedRewardCardVariantUrl(urls.thumb), true);
assert.equal(isPreBakedRewardCardVariantUrl("https://x/shop/foo.webp"), false);
ok("isPreBakedRewardCardVariantUrl");

const bakedDisplay = resolveRewardCardDisplaySource(urls.display);
assert.equal(bakedDisplay.immediate, urls.display);
assert.equal(bakedDisplay.upgrade, null);
ok("resolveRewardCardDisplaySource skips pre-baked URLs (no canvas upgrade)");

const legacy = resolveRewardCardDisplaySource("https://cdn.example/shop/card.webp");
assert.equal(legacy.immediate, "https://cdn.example/shop/card.webp");
assert.notEqual(legacy.upgrade, null);
ok("legacy URLs still schedule canvas fallback");

async function verifyLiveDb() {
  const supabaseUrl = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const serviceKey = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.log("\nSkipping live DB checks (missing env).");
    return;
  }

  const serviceRole = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: cards, error } = await serviceRole
    .from("reward_cards")
    .select(
      "id, card_key, image_url, image_asset_key, image_thumb_url, image_display_url, image_download_url, image_variants_version"
    );

  if (error) {
    if (/image_thumb_url|column/.test(error.message)) {
      console.error("\nMigration 068 not applied:", error.message);
      process.exit(1);
    }
    throw new Error(error.message);
  }

  const withSource = (cards || []).filter((c) => {
    const url = String(c.image_url || "").split("?")[0];
    return url && !/\.svg(\?|$)/i.test(url);
  });

  const missing = withSource.filter(
    (c) => !c.image_thumb_url || !c.image_display_url || !c.image_download_url
  );

  if (missing.length) {
    console.error(`\n${missing.length} cards missing variants (run process-all-reward-card-variants.mjs):`);
    for (const c of missing.slice(0, 20)) {
      console.error(`  - ${c.card_key} (${c.id})`);
    }
    if (missing.length > 20) console.error(`  ... and ${missing.length - 20} more`);
    process.exit(1);
  }

  ok(`live DB: all ${withSource.length} image cards have thumb/display/download`);

  let headOk = 0;
  for (const card of withSource.slice(0, 12)) {
    const fields = mapRewardCardImageFields(card);
    for (const label of ["imageThumbUrl", "imageDisplayUrl", "imageDownloadUrl"]) {
      const url = fields[label].split("?")[0];
      const res = await fetch(url, { method: "HEAD", redirect: "follow" });
      assert.ok(res.ok, `${card.card_key} ${label} HEAD ${res.status}`);
      headOk += 1;
    }
  }
  ok(`live storage HEAD: ${headOk} variant URLs reachable (sample)`);
}

if (localOnly) {
  console.log("\nverify-reward-card-variants: local checks passed");
} else {
  await verifyLiveDb();
  console.log("\nverify-reward-card-variants: all passed");
}
