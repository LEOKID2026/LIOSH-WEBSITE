#!/usr/bin/env node
/**
 * Apply DB batch 065 + upload new card images from ZIP to Supabase Storage.
 *
 * Prerequisites:
 *   - .env.local with NEXT_PUBLIC_LEARNING_SUPABASE_URL + LEARNING_SUPABASE_SERVICE_ROLE_KEY
 *   - Bucket `reward-cards` (public) in Supabase Dashboard
 *   - Migrations 058–064 applied (061 for israeli-holidays)
 *
 * Usage:
 *   node --env-file=.env.local scripts/apply-and-upload-leo-cards-batch065.mjs
 *   node --env-file=.env.local scripts/apply-and-upload-leo-cards-batch065.mjs --apply-only
 *   node --env-file=.env.local scripts/apply-and-upload-leo-cards-batch065.mjs --upload-only
 *   node --env-file=.env.local scripts/apply-and-upload-leo-cards-batch065.mjs --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  REWARD_CARD_IMAGE_BUCKET,
  uploadRewardCardImageForCard,
} from "../lib/rewards/server/reward-card-image.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ZIP_NAME = "leo_cards_10_achievements_16_shop_cursor_pack.zip";
const ZIP_PATH = path.join(ROOT, ZIP_NAME);
const EXTRACT_GLOB = "leo_cards_10_achievements_16_shop_cursor_pack";

/** ZIP basename → final card_key (never existing collision keys) */
export const ZIP_BASENAME_TO_CARD_KEY = {
  "leo_knight_hero.webp": "leo_golden_knight",
  "leo_detective.webp": "leo_master_detective",
  "leo_wizard.webp": "leo_grand_wizard",
  "leo_surfer.webp": "leo_wave_champion",
  "leo_superhero.webp": "leo_legendary_superhero",
  "leo_forest_guardian.webp": "leo_enchanted_forest_guardian",
  "leo_master_chef.webp": "leo_master_chef",
  "leo_firefighter.webp": "leo_firefighter",
  "leo_pirate_captain.webp": "leo_pirate_captain",
  "leo_galactic_explorer.webp": "leo_galactic_explorer",
  "leo_racing_driver.webp": "leo_racing_driver",
  "leo_music_star.webp": "leo_music_star",
  "leo_artist_painter.webp": "leo_master_painter",
  "leo_inventor_engineer.webp": "leo_genius_inventor",
  "leo_soccer_champion.webp": "leo_soccer_champion",
  "leo_arcade_gamer.webp": "leo_arcade_champion",
  "event_lg_b_omer.webp": "event_lag_baomer",
  "achievement_geometry_shapes_champion.webp": "achievement_geometry_shapes_champion",
  "achievement_geometry_angles_detective.webp": "achievement_geometry_angles_detective",
  "achievement_geometry_polygon_architect.webp": "achievement_geometry_polygon_architect",
  "achievement_geometry_symmetry_explorer.webp": "achievement_geometry_symmetry_explorer",
  "achievement_geometry_3d_builder.webp": "achievement_geometry_3d_builder",
  "achievement_geometry_area_genius.webp": "achievement_geometry_area_genius",
  "achievement_science_young_scientist.webp": "achievement_science_young_scientist",
  "achievement_science_space_discoverer.webp": "achievement_science_space_discoverer",
  "achievement_science_weather_explorer.webp": "achievement_science_weather_explorer",
  "achievement_science_magnet_master.webp": "achievement_science_magnet_master",
};

const RENAME_EXISTING = [
  { card_key: "leo_detective", name_he: "ליאו עוזר הבלש" },
  { card_key: "leo_wizard", name_he: "ליאו הקוסם הצעיר" },
  { card_key: "leo_surfer", name_he: "ליאו הגולש הצעיר" },
  { card_key: "leo_superhero", name_he: "ליאו גיבור העל" },
  { card_key: "leo_forest_guardian", name_he: "ליאו שומר היער" },
];

const NEW_SERIES = [
  { slug: "geometry", name_he: "גאומטריה", description_he: "קלפי הישג בגאומטריה", display_order: 24 },
  { slug: "science", name_he: "מדעים", description_he: "קלפי הישג במדעים", display_order: 25 },
];

const NEW_SHOP = [
  { card_key: "leo_master_detective", name_he: "ליאו בלש העל", series_slug: "professions", rarity: "rare" },
  { card_key: "leo_grand_wizard", name_he: "ליאו המכשף הגדול", series_slug: "fantasy", rarity: "rare" },
  { card_key: "leo_wave_champion", name_he: "ליאו אלוף הגלים", series_slug: "sport-fun", rarity: "special" },
  { card_key: "leo_legendary_superhero", name_he: "סופר ליאו האגדי", series_slug: "fantasy", rarity: "gold" },
  { card_key: "leo_enchanted_forest_guardian", name_he: "ליאו שומר היער הקסום", series_slug: "fantasy", rarity: "rare" },
  { card_key: "leo_golden_knight", name_he: "ליאו אביר הזהב", series_slug: "fantasy", rarity: "gold" },
  { card_key: "leo_master_chef", name_he: "ליאו השף הראשי", series_slug: "professions", rarity: "special" },
  { card_key: "leo_firefighter", name_he: "ליאו הכבאי", series_slug: "professions", rarity: "special" },
  { card_key: "leo_pirate_captain", name_he: "ליאו קפטן הים", series_slug: "fantasy", rarity: "special" },
  { card_key: "leo_galactic_explorer", name_he: "ליאו חוקר הגלקסיות", series_slug: "space-tech", rarity: "special" },
  { card_key: "leo_racing_driver", name_he: "ליאו נהג המרוצים", series_slug: "sport-fun", rarity: "special" },
  { card_key: "leo_music_star", name_he: "ליאו כוכב הבמה", series_slug: "professions", rarity: "special" },
  { card_key: "leo_master_painter", name_he: "ליאו הצייר הגדול", series_slug: "professions", rarity: "regular" },
  { card_key: "leo_genius_inventor", name_he: "ליאו הממציא הגאון", series_slug: "professions", rarity: "rare" },
  { card_key: "leo_soccer_champion", name_he: "ליאו אלוף הכדורגל", series_slug: "sport-fun", rarity: "special" },
  { card_key: "leo_arcade_champion", name_he: "ליאו אלוף הארקייד", series_slug: "sport-fun", rarity: "special" },
];

const NEW_EVENT = {
  card_key: "event_lag_baomer",
  name_he: "ל״ג בעומר",
  description_he: "קלף אירוע לל״ג בעומר",
  series_slug: "israeli-holidays",
  rarity: "special",
};

const NEW_ACHIEVEMENTS = [
  { card_key: "achievement_geometry_shapes_champion", name_he: "אלוף הצורות", series_slug: "geometry", rarity: "regular", subject: "geometry" },
  { card_key: "achievement_geometry_angles_detective", name_he: "בלש הזוויות", series_slug: "geometry", rarity: "special", subject: "geometry" },
  { card_key: "achievement_geometry_polygon_architect", name_he: "אדריכל המצולעים", series_slug: "geometry", rarity: "special", subject: "geometry" },
  { card_key: "achievement_geometry_symmetry_explorer", name_he: "חוקר הסימטריה", series_slug: "geometry", rarity: "special", subject: "geometry" },
  { card_key: "achievement_geometry_3d_builder", name_he: "בונה תלת־ממד", series_slug: "geometry", rarity: "rare", subject: "geometry" },
  { card_key: "achievement_geometry_area_genius", name_he: "גאון השטח", series_slug: "geometry", rarity: "rare", subject: "geometry" },
  { card_key: "achievement_science_young_scientist", name_he: "מדען צעיר", series_slug: "science", rarity: "regular", subject: "science" },
  { card_key: "achievement_science_space_discoverer", name_he: "מגלה החלל", series_slug: "science", rarity: "special", subject: "science" },
  { card_key: "achievement_science_weather_explorer", name_he: "חוקר מזג האוויר", series_slug: "science", rarity: "special", subject: "science" },
  { card_key: "achievement_science_magnet_master", name_he: "מאסטר המגנט", series_slug: "science", rarity: "rare", subject: "science" },
];

const ACHIEVEMENT_RULES = [
  { card_key: "achievement_geometry_shapes_champion", rule_type: "subject_questions", subject: "geometry", min_questions: 40 },
  { card_key: "achievement_geometry_angles_detective", rule_type: "subject_questions", subject: "geometry", min_questions: 35 },
  { card_key: "achievement_geometry_polygon_architect", rule_type: "subject_questions", subject: "geometry", min_questions: 45 },
  { card_key: "achievement_geometry_symmetry_explorer", rule_type: "subject_questions", subject: "geometry", min_questions: 40 },
  { card_key: "achievement_geometry_3d_builder", rule_type: "subject_questions", subject: "geometry", min_questions: 50 },
  { card_key: "achievement_geometry_area_genius", rule_type: "subject_accuracy", subject: "geometry", min_questions: 30, min_accuracy: 75 },
  { card_key: "achievement_science_young_scientist", rule_type: "subject_questions", subject: "science", min_questions: 30 },
  { card_key: "achievement_science_space_discoverer", rule_type: "subject_questions", subject: "science", min_questions: 40 },
  { card_key: "achievement_science_weather_explorer", rule_type: "subject_questions", subject: "science", min_questions: 35 },
  { card_key: "achievement_science_magnet_master", rule_type: "subject_accuracy", subject: "science", min_questions: 25, min_accuracy: 70 },
];

const SHOP_PRICE = 150000;
const EXISTING_KEYS_PROTECT = new Set([
  "leo_detective",
  "leo_wizard",
  "leo_surfer",
  "leo_superhero",
  "leo_forest_guardian",
]);

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const applyOnly = args.has("--apply-only");
const uploadOnly = args.has("--upload-only");
const doApply = !uploadOnly;
const doUpload = !applyOnly;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_LEARNING_SUPABASE_URL or LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function getSeriesMap(supabase) {
  const { data, error } = await supabase.from("reward_card_series").select("id, slug");
  if (error) throw new Error(error.message);
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const row of data || []) map.set(row.slug, row.id);
  return map;
}

async function applyDb(supabase) {
  console.log("\n=== Apply DB batch 065 ===");

  for (const row of RENAME_EXISTING) {
    if (dryRun) {
      console.log(`[dry-run] rename ${row.card_key} → ${row.name_he}`);
      continue;
    }
    const { error } = await supabase
      .from("reward_cards")
      .update({ name_he: row.name_he, description_he: row.name_he, updated_at: new Date().toISOString() })
      .eq("card_key", row.card_key)
      .eq("card_type", "shop");
    if (error) throw new Error(`rename ${row.card_key}: ${error.message}`);
    console.log(`OK rename ${row.card_key}`);
  }

  for (const s of NEW_SERIES) {
    if (dryRun) {
      console.log(`[dry-run] series ${s.slug}`);
      continue;
    }
    const { error } = await supabase.from("reward_card_series").upsert(
      { slug: s.slug, name_he: s.name_he, description_he: s.description_he, display_order: s.display_order, is_active: true },
      { onConflict: "slug" }
    );
    if (error) throw new Error(`series ${s.slug}: ${error.message}`);
    console.log(`OK series ${s.slug}`);
  }

  const seriesMap = await getSeriesMap(supabase);

  if (!seriesMap.has("israeli-holidays")) {
    throw new Error("Series israeli-holidays missing — apply migration 061 first");
  }

  for (const c of NEW_SHOP) {
    const series_id = seriesMap.get(c.series_slug);
    if (!series_id) throw new Error(`Missing series ${c.series_slug}`);
    const row = {
      card_key: c.card_key,
      name_he: c.name_he,
      description_he: c.name_he,
      series_id,
      rarity: c.rarity,
      card_type: "shop",
      price_coins: SHOP_PRICE,
      use_default_price: false,
      can_be_purchased: true,
      can_appear_in_surprise_box: true,
      is_active: true,
    };
    if (dryRun) {
      console.log(`[dry-run] shop ${c.card_key}`);
      continue;
    }
    const { error } = await supabase.from("reward_cards").upsert(row, { onConflict: "card_key" });
    if (error) throw new Error(`shop ${c.card_key}: ${error.message}`);
    console.log(`OK shop ${c.card_key}`);
  }

  {
    const c = NEW_EVENT;
    const series_id = seriesMap.get(c.series_slug);
    const row = {
      card_key: c.card_key,
      name_he: c.name_he,
      description_he: c.description_he,
      series_id,
      rarity: c.rarity,
      card_type: "event",
      event_reward_mode: "achievement",
      use_default_price: true,
      can_be_purchased: false,
      can_appear_in_surprise_box: false,
      is_active: true,
    };
    if (dryRun) console.log(`[dry-run] event ${c.card_key}`);
    else {
      const { error } = await supabase.from("reward_cards").upsert(row, { onConflict: "card_key" });
      if (error) throw new Error(`event ${c.card_key}: ${error.message}`);
      console.log(`OK event ${c.card_key}`);
    }
  }

  for (const c of NEW_ACHIEVEMENTS) {
    const series_id = seriesMap.get(c.series_slug);
    const row = {
      card_key: c.card_key,
      name_he: c.name_he,
      description_he: c.name_he,
      series_id,
      rarity: c.rarity,
      card_type: "achievement",
      subject: c.subject,
      use_default_price: true,
      can_be_purchased: false,
      can_appear_in_surprise_box: false,
      is_active: true,
    };
    if (dryRun) console.log(`[dry-run] achievement ${c.card_key}`);
    else {
      const { error } = await supabase.from("reward_cards").upsert(row, { onConflict: "card_key" });
      if (error) throw new Error(`achievement ${c.card_key}: ${error.message}`);
      console.log(`OK achievement ${c.card_key}`);
    }
  }

  if (!dryRun) {
    const { data: cards } = await supabase.from("reward_cards").select("id, card_key").in(
      "card_key",
      ACHIEVEMENT_RULES.map((r) => r.card_key)
    );
    const idByKey = new Map((cards || []).map((c) => [c.card_key, c.id]));

    for (const r of ACHIEVEMENT_RULES) {
      const card_id = idByKey.get(r.card_key);
      if (!card_id) continue;
      const { data: existing } = await supabase.from("reward_card_rules").select("id").eq("card_id", card_id).limit(1);
      if (existing?.length) continue;
      const { error } = await supabase.from("reward_card_rules").insert({
        card_id,
        rule_type: r.rule_type,
        subject: r.subject,
        min_questions: r.min_questions ?? null,
        min_accuracy: r.min_accuracy ?? null,
        is_active: true,
        grant_enabled: true,
      });
      if (error) throw new Error(`rule ${r.card_key}: ${error.message}`);
      console.log(`OK rule ${r.card_key}`);
    }
  }
}

function findExtractedAssetsRoot() {
  const direct = path.join(ROOT, EXTRACT_GLOB, "public", "rewards", "cards");
  if (fs.existsSync(direct)) return direct;
  const tmp = path.join(ROOT, "_tmp_batch065", EXTRACT_GLOB, "public", "rewards", "cards");
  if (fs.existsSync(tmp)) return tmp;
  return null;
}

function collectZipImages(assetsRoot) {
  /** @type {Map<string, string>} card_key -> absolute path */
  const out = new Map();
  for (const [basename, cardKey] of Object.entries(ZIP_BASENAME_TO_CARD_KEY)) {
    const found = [];
    function walk(dir) {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(p);
        else if (ent.name === basename) found.push(p);
      }
    }
    walk(assetsRoot);
    if (found.length === 1) out.set(cardKey, found[0]);
    else if (found.length > 1) throw new Error(`Multiple matches for ${basename}`);
  }
  return out;
}

async function ensureExtracted() {
  let root = findExtractedAssetsRoot();
  if (root) return root;
  if (!fs.existsSync(ZIP_PATH)) throw new Error(`ZIP not found: ${ZIP_PATH}`);
  const dest = path.join(ROOT, "_tmp_batch065");
  fs.mkdirSync(dest, { recursive: true });
  console.log("Extracting ZIP…");
  const { execSync } = await import("node:child_process");
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Path '${ZIP_PATH.replace(/'/g, "''")}' -DestinationPath '${dest.replace(/'/g, "''")}' -Force"`,
    { stdio: "inherit" }
  );
  root = findExtractedAssetsRoot();
  if (!root) throw new Error("Extract failed — assets root not found");
  return root;
}

async function checkBucket(supabase) {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`storage.listBuckets: ${error.message}`);
  const ok = (data || []).some((b) => b.name === REWARD_CARD_IMAGE_BUCKET);
  if (!ok) {
    throw new Error(
      `Bucket "${REWARD_CARD_IMAGE_BUCKET}" not found. Create public bucket per docs/admin/reward-card-image-storage-setup.md`
    );
  }
  console.log(`OK bucket ${REWARD_CARD_IMAGE_BUCKET}`);
}

async function uploadImages(supabase) {
  console.log("\n=== Upload images to Storage ===");
  await checkBucket(supabase);
  const assetsRoot = await ensureExtracted();
  const imageMap = collectZipImages(assetsRoot);

  const allNewKeys = [
    ...NEW_SHOP.map((c) => c.card_key),
    NEW_EVENT.card_key,
    ...NEW_ACHIEVEMENTS.map((c) => c.card_key),
  ];

  for (const cardKey of allNewKeys) {
    if (EXISTING_KEYS_PROTECT.has(cardKey)) {
      throw new Error(`Refusing upload to protected existing key: ${cardKey}`);
    }
    const filePath = imageMap.get(cardKey);
    if (!filePath) {
      throw new Error(`Missing image file in ZIP for card_key ${cardKey}`);
    }

    const { data: card, error: fetchErr } = await supabase
      .from("reward_cards")
      .select("id, card_key")
      .eq("card_key", cardKey)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!card) throw new Error(`Card not in DB: ${cardKey} — run apply first`);

    if (dryRun) {
      console.log(`[dry-run] upload ${cardKey} ← ${path.basename(filePath)}`);
      continue;
    }

    const buffer = fs.readFileSync(filePath);
    const result = await uploadRewardCardImageForCard(supabase, card.id, buffer, "image/webp");
    if (!result.ok) throw new Error(`${cardKey}: ${result.message || result.code}`);
    console.log(`OK upload ${cardKey} → ${result.storagePath}`);
  }
}

async function main() {
  const supabase = getSupabase();
  if (doApply) await applyDb(supabase);
  if (doUpload) await uploadImages(supabase);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("\nFAILED:", err.message || err);
  process.exit(1);
});
