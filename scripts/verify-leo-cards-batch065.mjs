#!/usr/bin/env node
/**
 * Verify batch 065 card additions (read-only checks against Supabase).
 * Run: node --env-file=.env.local scripts/verify-leo-cards-batch065.mjs
 */
import { createClient } from "@supabase/supabase-js";

const RENAMED = {
  leo_detective: "ליאו עוזר הבלש",
  leo_wizard: "ליאו הקוסם הצעיר",
  leo_surfer: "ליאו הגולש הצעיר",
  leo_superhero: "ליאו גיבור העל",
  leo_forest_guardian: "ליאו שומר היער",
};

const NEW_SHOP_KEYS = [
  "leo_master_detective",
  "leo_grand_wizard",
  "leo_wave_champion",
  "leo_legendary_superhero",
  "leo_enchanted_forest_guardian",
  "leo_golden_knight",
  "leo_master_chef",
  "leo_firefighter",
  "leo_pirate_captain",
  "leo_galactic_explorer",
  "leo_racing_driver",
  "leo_music_star",
  "leo_master_painter",
  "leo_genius_inventor",
  "leo_soccer_champion",
  "leo_arcade_champion",
];

const NEW_ACH_KEYS = [
  "achievement_geometry_shapes_champion",
  "achievement_geometry_angles_detective",
  "achievement_geometry_polygon_architect",
  "achievement_geometry_symmetry_explorer",
  "achievement_geometry_3d_builder",
  "achievement_geometry_area_genius",
  "achievement_science_young_scientist",
  "achievement_science_space_discoverer",
  "achievement_science_weather_explorer",
  "achievement_science_magnet_master",
];

const PROTECTED = Object.keys(RENAMED);

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function main() {
  const supabase = getSupabase();
  let failed = 0;

  const { data: renamed } = await supabase
    .from("reward_cards")
    .select("card_key, name_he, image_url")
    .in("card_key", PROTECTED);
  for (const [key, expected] of Object.entries(RENAMED)) {
    const row = (renamed || []).find((r) => r.card_key === key);
    if (!row) {
      console.error(`FAIL missing protected card ${key}`);
      failed++;
    } else if (row.name_he !== expected) {
      console.error(`FAIL rename ${key}: got "${row.name_he}" expected "${expected}"`);
      failed++;
    } else if (!row.image_url || !String(row.image_url).includes("/rewards/cards/")) {
      console.warn(`WARN ${key} image_url may be missing legacy path: ${row.image_url}`);
    } else {
      console.log(`OK protected ${key} name + legacy image`);
    }
  }

  const { data: newShop } = await supabase
    .from("reward_cards")
    .select("card_key, price_coins, can_be_purchased, can_appear_in_surprise_box, image_url, reward_card_series(slug)")
    .in("card_key", NEW_SHOP_KEYS);
  for (const key of NEW_SHOP_KEYS) {
    const row = (newShop || []).find((r) => r.card_key === key);
    if (!row) {
      console.error(`FAIL missing new shop ${key}`);
      failed++;
      continue;
    }
    if (row.price_coins !== 150000) {
      console.error(`FAIL ${key} price ${row.price_coins}`);
      failed++;
    }
    if (!row.image_url?.includes("supabase")) {
      console.error(`FAIL ${key} no Storage image_url`);
      failed++;
    } else {
      console.log(`OK shop ${key} price + storage image`);
    }
  }

  const { data: lag } = await supabase
    .from("reward_cards")
    .select("card_key, card_type, can_be_purchased, can_appear_in_surprise_box, reward_card_series(slug)")
    .eq("card_key", "event_lag_baomer")
    .maybeSingle();
  if (!lag) {
    console.error("FAIL event_lag_baomer missing");
    failed++;
  } else if (lag.card_type !== "event" || lag.reward_card_series?.slug !== "israeli-holidays") {
    console.error("FAIL event_lag_baomer type/series");
    failed++;
  } else if (lag.can_be_purchased || lag.can_appear_in_surprise_box) {
    console.error("FAIL event_lag_baomer shop/box flags");
    failed++;
  } else {
    console.log("OK event_lag_baomer");
  }

  const { data: ach } = await supabase
    .from("reward_cards")
    .select("card_key, card_type, can_be_purchased, can_appear_in_surprise_box, reward_card_series(slug)")
    .in("card_key", NEW_ACH_KEYS);
  for (const key of NEW_ACH_KEYS) {
    const row = (ach || []).find((r) => r.card_key === key);
    if (!row) {
      console.error(`FAIL missing achievement ${key}`);
      failed++;
    } else if (row.card_type !== "achievement" || row.can_be_purchased || row.can_appear_in_surprise_box) {
      console.error(`FAIL achievement flags ${key}`);
      failed++;
    } else {
      console.log(`OK achievement ${key} (${row.reward_card_series?.slug})`);
    }
  }

  const { data: series } = await supabase.from("reward_card_series").select("slug").in("slug", ["geometry", "science"]);
  for (const slug of ["geometry", "science"]) {
    if (!(series || []).some((s) => s.slug === slug)) {
      console.error(`FAIL series ${slug}`);
      failed++;
    } else console.log(`OK series ${slug}`);
  }

  if (failed) {
    console.error(`\nVERIFY FAILED (${failed} issues)`);
    process.exit(1);
  }
  console.log("\nVERIFY PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
