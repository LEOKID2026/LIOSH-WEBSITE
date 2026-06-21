#!/usr/bin/env node
/**
 * Batch-generate pre-baked reward card variants (thumb / display / download).
 *
 * Prerequisites:
 *   - .env.local with NEXT_PUBLIC_LEARNING_SUPABASE_URL + LEARNING_SUPABASE_SERVICE_ROLE_KEY
 *   - Migration 068 applied (variant URL columns)
 *   - Bucket `reward-cards` (public)
 *
 * Usage:
 *   node --env-file=.env.local scripts/process-all-reward-card-variants.mjs
 *   node --env-file=.env.local scripts/process-all-reward-card-variants.mjs --dry-run
 *   node --env-file=.env.local scripts/process-all-reward-card-variants.mjs --card-id=<uuid>
 *   node --env-file=.env.local scripts/process-all-reward-card-variants.mjs --force
 */
import { createClient } from "@supabase/supabase-js";
import { processRewardCardVariantsForCard } from "../lib/rewards/server/reward-card-variant-process.server.js";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const force = args.has("--force");
const cardIdArg = [...args].find((a) => a.startsWith("--card-id="));
const singleCardId = cardIdArg ? cardIdArg.split("=")[1] : null;

const supabaseUrl = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
const serviceKey = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_LEARNING_SUPABASE_URL or LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const serviceRole = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function hasProcessableSource(card) {
  const url = String(card.image_url || "").split("?")[0].trim();
  const asset = String(card.image_asset_key || "").trim();
  if (/\.svg(\?|$)/i.test(url)) return false;
  return Boolean(url || (asset && !asset.startsWith("/")));
}

function variantsAlreadyReady(card) {
  return Boolean(
    card.image_thumb_url &&
      card.image_display_url &&
      card.image_download_url &&
      card.image_variants_version > 0
  );
}

async function main() {
  let query = serviceRole
    .from("reward_cards")
    .select(
      "id, card_key, name_he, image_url, image_asset_key, image_thumb_url, image_display_url, image_download_url, image_variants_version"
    )
    .order("card_key");

  if (singleCardId) {
    query = query.eq("id", singleCardId);
  }

  const { data: cards, error } = await query;
  if (error) {
    console.error("DB error:", error.message);
    process.exit(1);
  }

  const targets = (cards || []).filter((card) => {
    if (!hasProcessableSource(card)) return false;
    if (!force && variantsAlreadyReady(card)) return false;
    return true;
  });

  console.log(`Found ${cards?.length || 0} cards; processing ${targets.length}${dryRun ? " (dry-run)" : ""}.`);

  if (dryRun) {
    for (const card of targets) {
      console.log(`  would process: ${card.card_key} (${card.id})`);
    }
    return;
  }

  let ok = 0;
  let failed = 0;
  /** @type {{ cardKey: string, id: string, error: string }[]} */
  const failures = [];

  for (const card of targets) {
    process.stdout.write(`Processing ${card.card_key}... `);
    try {
      const result = await processRewardCardVariantsForCard(serviceRole, card.id);
      if (!result.ok) {
        failed += 1;
        failures.push({ cardKey: card.card_key, id: card.id, error: result.code || "failed" });
        console.log("FAIL", result.code);
        continue;
      }
      ok += 1;
      console.log(`OK v${result.variantsVersion} (${result.meta?.trimmedWidth}x${result.meta?.trimmedHeight})`);
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      failures.push({ cardKey: card.card_key, id: card.id, error: message });
      console.log("FAIL", message);
    }
  }

  console.log(`\nDone: ${ok} ok, ${failed} failed, ${(cards?.length || 0) - targets.length} skipped.`);
  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`  - ${f.cardKey} (${f.id}): ${f.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
