#!/usr/bin/env node
/**
 * Verify new cards ZIP batch after apply-and-upload-new-cards-zip.mjs
 *
 * Usage:
 *   node --env-file=.env.local scripts/verify-new-cards-zip.mjs
 */
import { createClient } from "@supabase/supabase-js";
import {
  EXISTING_IMAGE_UPDATES,
  FIX_NEW_CARDS,
  NEW_CARDS,
  SKIPPED_SOURCES,
  storagePathFor,
} from "./new-cards-zip-manifest.mjs";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_LEARNING_SUPABASE_URL or LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function main() {
  const supabase = getSupabase();
  const allKeys = [
    ...NEW_CARDS.map((c) => c.card_key),
    ...FIX_NEW_CARDS.map((c) => c.card_key),
  ];

  const { data, error } = await supabase
    .from("reward_cards")
    .select(
      "card_key, name_he, description_he, image_url, image_asset_key, card_type, rarity, is_active, can_be_purchased, can_appear_in_surprise_box, reward_card_series(slug, name_he)"
    )
    .in("card_key", allKeys);

  if (error) throw new Error(error.message);

  const byKey = new Map((data || []).map((r) => [r.card_key, r]));
  let failed = false;

  console.log("=== Verify new cards ZIP batch ===\n");
  console.log(`Expected new cards (batch): ${NEW_CARDS.length}`);
  console.log(`Expected fix-new cards: ${FIX_NEW_CARDS.length}`);
  console.log(`Expected skipped sources: ${SKIPPED_SOURCES.length}\n`);

  for (const def of NEW_CARDS) {
    const row = byKey.get(def.card_key);
    if (!row) {
      console.error(`FAIL missing card: ${def.card_key}`);
      failed = true;
      continue;
    }
    if (!row.image_url) {
      console.error(`FAIL no image_url: ${def.card_key}`);
      failed = true;
    }
    const expectedPath = storagePathFor(def);
    if (row.image_asset_key && row.image_asset_key !== expectedPath) {
      console.warn(`WARN asset path ${def.card_key}: ${row.image_asset_key} (expected ${expectedPath})`);
    }
  }

  for (const def of FIX_NEW_CARDS) {
    const row = byKey.get(def.card_key);
    if (!row?.image_url) {
      console.error(`FAIL fix-new card missing image: ${def.card_key}`);
      failed = true;
    }
  }

  for (const upd of EXISTING_IMAGE_UPDATES) {
    const row = byKey.get(upd.card_key);
    if (!row?.image_url) {
      console.error(`FAIL update missing image: ${upd.card_key}`);
      failed = true;
    }
  }

  const keySet = new Set(allKeys);
  if (keySet.size !== allKeys.length) {
    console.error("FAIL duplicate card_key in manifest keys");
    failed = true;
  }

  if (failed) {
    process.exit(1);
  }

  console.log("PASS — all cards present with images");
  console.log(`Total verified: ${allKeys.length}`);
}

main().catch((err) => {
  console.error("FAILED:", err.message || err);
  process.exit(1);
});
