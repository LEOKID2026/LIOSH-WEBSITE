#!/usr/bin/env node
/**
 * Fix mistaken image updates on 6 existing cards + create 6 new cards from those PNGs.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-new-cards-zip-mistaken-updates.mjs
 *   node --env-file=.env.local scripts/fix-new-cards-zip-mistaken-updates.mjs --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import yauzl from "yauzl";
import {
  ZIP_INNER_DIR,
  ZIP_NAME,
} from "./new-cards-zip-manifest.mjs";
import {
  uploadRewardCardImageForCard,
} from "../lib/rewards/server/reward-card-image.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ZIP_PATH = path.join(ROOT, ZIP_NAME);
const EXTRACT_DIR = path.join(ROOT, "_tmp_fix_cards_zip");
const BATCH065_ROOT = path.join(
  ROOT,
  "_tmp_batch065/leo_cards_10_achievements_16_shop_cursor_pack/public/rewards/cards"
);

const dryRun = process.argv.includes("--dry-run");

/** @type {Record<string, { file: string, note?: string }>} */
const RESTORE_ASSETS = {
  leo_firefighter: {
    file: path.join(BATCH065_ROOT, "shop/leo_firefighter.webp"),
    note: "batch065 original artwork",
  },
  leo_master_painter: {
    file: path.join(BATCH065_ROOT, "shop/leo_artist_painter.webp"),
    note: "batch065 leo_artist_painter.webp → leo_master_painter",
  },
  leo_music_star: {
    file: path.join(BATCH065_ROOT, "shop/leo_music_star.webp"),
    note: "batch065 original artwork",
  },
  achievement_science_young_scientist: {
    file: path.join(BATCH065_ROOT, "achievements/science/achievement_science_young_scientist.webp"),
    note: "batch065 original artwork",
  },
  achievement_science_weather_explorer: {
    file: path.join(BATCH065_ROOT, "achievements/science/achievement_science_weather_explorer.webp"),
    note: "batch065 original artwork",
  },
};

const EVENT_WINTER_RESTORE = {
  card_key: "event_winter",
  image_url: "/rewards/cards/events/event_winter.webp",
  image_asset_key: null,
  publicFile: path.join(ROOT, "public/rewards/cards/events/event_winter.webp"),
};

/** @type {Array<import('./new-cards-zip-manifest.mjs').CardDef & { source: string }>} */
const NEW_CARDS_FROM_MISTAKE = [
  {
    source: "עוזר כבאי.png",
    card_key: "leo_firefighter_helper",
    name_he: "ליאו עוזר כבאי",
    description_he: "ליאו לובש מדי כבאי ועוזר לכבות שריפות!",
    series_slug: "professions",
    rarity: "special",
    card_type: "shop",
  },
  {
    source: "בחוג ציור.png",
    card_key: "leo_art_class",
    name_he: "ליאו בחוג ציור",
    description_he: "ליאו יוצר יצירות צבעוניות בחוג ציור!",
    series_slug: "style",
    rarity: "regular",
    card_type: "shop",
  },
  {
    source: "מנגן בפסנטר.png",
    card_key: "leo_piano_player",
    name_he: "ליאו מנגן בפסנתר",
    description_he: "ליאו מנגן ושיר על הפסנתר!",
    series_slug: "professions",
    rarity: "special",
    card_type: "shop",
  },
  {
    source: "בשיעור מדעים.png",
    card_key: "leo_science_class",
    name_he: "ליאו בשיעור מדעים",
    description_he: "ליאו לומד ומגלה דברים חדשים בשיעור מדעים!",
    series_slug: "style",
    rarity: "regular",
    card_type: "shop",
  },
  {
    source: "מטייל בגשם.png",
    card_key: "leo_rain_walk",
    name_he: "ליאו מטייל בגשם",
    description_he: "ליאו מטייל בגשם עם מטריה וחיוך!",
    series_slug: "sport-fun",
    rarity: "regular",
    card_type: "shop",
  },
  {
    source: "חופשת חורף.png",
    card_key: "event_winter_vacation",
    name_he: "ליאו בחופשת חורף",
    description_he: "ליאו בחורף עם צעיף, שלג ושוקו חם!",
    series_slug: "events",
    rarity: "regular",
    card_type: "event",
    can_be_purchased: false,
    can_appear_in_surprise_box: false,
    is_active: false,
    event_reward_mode: "achievement",
  },
];

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_LEARNING_SUPABASE_URL or LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function snapshotCards(supabase, keys) {
  const { data, error } = await supabase
    .from("reward_cards")
    .select("id, card_key, name_he, image_url, image_asset_key, card_type")
    .in("card_key", keys);
  if (error) throw new Error(error.message);
  return data || [];
}

function extractZipPngs() {
  if (fs.existsSync(EXTRACT_DIR)) fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });
  fs.mkdirSync(EXTRACT_DIR, { recursive: true });
  if (!fs.existsSync(ZIP_PATH)) throw new Error(`ZIP not found: ${ZIP_PATH}`);

  return new Promise((resolve, reject) => {
    yauzl.open(ZIP_PATH, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        if (!entry.fileName.startsWith(`${ZIP_INNER_DIR}/`) || !/\.png$/i.test(entry.fileName)) {
          zipfile.readEntry();
          return;
        }
        const dest = path.join(EXTRACT_DIR, path.basename(entry.fileName));
        zipfile.openReadStream(entry, (e, stream) => {
          if (e) return reject(e);
          const w = fs.createWriteStream(dest);
          stream.pipe(w);
          w.on("finish", () => zipfile.readEntry());
        });
      });
      zipfile.on("end", () => resolve(EXTRACT_DIR));
      zipfile.on("error", reject);
    });
  });
}

async function getSeriesMap(supabase) {
  const { data, error } = await supabase.from("reward_card_series").select("id, slug");
  if (error) throw new Error(error.message);
  return new Map((data || []).map((r) => [r.slug, r.id]));
}

async function restoreExistingCards(supabase, beforeRows) {
  console.log("\n=== Restore 6 existing cards ===");
  /** @type {Array<{ card_key: string, before: object, after: object, storageRestoredFrom: string }>} */
  const log = [];

  for (const [cardKey, asset] of Object.entries(RESTORE_ASSETS)) {
    const before = beforeRows.find((r) => r.card_key === cardKey);
    if (!before) throw new Error(`Missing card ${cardKey}`);
    if (!fs.existsSync(asset.file)) {
      throw new Error(`Restore source missing for ${cardKey}: ${asset.file}`);
    }

    if (dryRun) {
      console.log(`[dry-run] restore ${cardKey} from ${asset.file}`);
      log.push({
        card_key: cardKey,
        before: { image_url: before.image_url, image_asset_key: before.image_asset_key },
        after: { note: "batch065 webp re-upload to same storage path" },
        storageRestoredFrom: asset.file,
      });
      continue;
    }

    const buffer = fs.readFileSync(asset.file);
    const result = await uploadRewardCardImageForCard(supabase, before.id, buffer, "image/webp");
    if (!result.ok) throw new Error(`${cardKey}: ${result.message || result.code}`);

    const { data: after } = await supabase
      .from("reward_cards")
      .select("image_url, image_asset_key")
      .eq("id", before.id)
      .single();

    console.log(`OK restored ${cardKey}`);
    log.push({
      card_key: cardKey,
      before: { image_url: before.image_url, image_asset_key: before.image_asset_key },
      after,
      storageRestoredFrom: asset.file,
    });
  }

  {
    const before = beforeRows.find((r) => r.card_key === EVENT_WINTER_RESTORE.card_key);
    if (!before) throw new Error("Missing event_winter");
    if (!fs.existsSync(EVENT_WINTER_RESTORE.publicFile)) {
      throw new Error(`Missing public asset: ${EVENT_WINTER_RESTORE.publicFile}`);
    }

    if (dryRun) {
      console.log(`[dry-run] restore event_winter DB to ${EVENT_WINTER_RESTORE.image_url}`);
      log.push({
        card_key: "event_winter",
        before: { image_url: before.image_url, image_asset_key: before.image_asset_key },
        after: {
          image_url: EVENT_WINTER_RESTORE.image_url,
          image_asset_key: EVENT_WINTER_RESTORE.image_asset_key,
        },
        storageRestoredFrom: EVENT_WINTER_RESTORE.publicFile,
      });
    } else {
      const { error } = await supabase
        .from("reward_cards")
        .update({
          image_url: EVENT_WINTER_RESTORE.image_url,
          image_asset_key: EVENT_WINTER_RESTORE.image_asset_key,
          updated_at: new Date().toISOString(),
        })
        .eq("id", before.id);
      if (error) throw new Error(`event_winter DB: ${error.message}`);
      console.log("OK restored event_winter → legacy public path");
      log.push({
        card_key: "event_winter",
        before: { image_url: before.image_url, image_asset_key: before.image_asset_key },
        after: {
          image_url: EVENT_WINTER_RESTORE.image_url,
          image_asset_key: EVENT_WINTER_RESTORE.image_asset_key,
        },
        storageRestoredFrom: EVENT_WINTER_RESTORE.publicFile,
      });
    }
  }

  return log;
}

async function createNewCards(supabase, extractDir) {
  console.log("\n=== Create 6 new cards ===");
  const seriesMap = await getSeriesMap(supabase);
  /** @type {Array<object>} */
  const created = [];

  for (const def of NEW_CARDS_FROM_MISTAKE) {
    const { data: existing } = await supabase
      .from("reward_cards")
      .select("id, card_key, image_url")
      .eq("card_key", def.card_key)
      .maybeSingle();

    let cardId = existing?.id;

    if (!existing) {
      const series_id = seriesMap.get(def.series_slug);
      if (!series_id) throw new Error(`Missing series ${def.series_slug}`);

      const row = {
        card_key: def.card_key,
        name_he: def.name_he,
        description_he: def.description_he,
        series_id,
        rarity: def.rarity,
        card_type: def.card_type,
        use_default_price: true,
        can_be_purchased: def.can_be_purchased ?? def.card_type === "shop",
        can_appear_in_surprise_box: def.can_appear_in_surprise_box ?? def.card_type === "shop",
        is_active: def.is_active ?? def.card_type !== "event",
      };
      if (def.card_type === "event") row.event_reward_mode = def.event_reward_mode || "achievement";

      if (dryRun) {
        console.log(`[dry-run] insert ${def.card_key}`);
      } else {
        const { data, error } = await supabase.from("reward_cards").insert(row).select("id").single();
        if (error) throw new Error(`insert ${def.card_key}: ${error.message}`);
        cardId = data.id;
        console.log(`OK insert ${def.card_key}`);
      }
    } else {
      console.log(`SKIP insert (exists): ${def.card_key}`);
    }

    const pngPath = path.join(extractDir, def.source);
    if (!fs.existsSync(pngPath)) throw new Error(`Missing PNG ${def.source}`);

    if (dryRun) {
      console.log(`[dry-run] upload ${def.card_key} ← ${def.source}`);
    } else if (cardId) {
      const buffer = fs.readFileSync(pngPath);
      const result = await uploadRewardCardImageForCard(supabase, cardId, buffer, "image/png");
      if (!result.ok) throw new Error(`${def.card_key}: ${result.message || result.code}`);
      console.log(`OK upload ${def.card_key} → ${result.storagePath}`);
    }

    const prefix =
      def.card_type === "event"
        ? `events/${def.card_key}.webp`
        : def.card_type === "shop"
          ? `shop/${def.series_slug}/${def.card_key}.webp`
          : `achievements/${def.series_slug}/${def.card_key}.webp`;

    created.push({
      source: def.source,
      card_key: def.card_key,
      name_he: def.name_he,
      series_slug: def.series_slug,
      card_type: def.card_type,
      rarity: def.rarity,
      can_be_purchased: def.can_be_purchased ?? def.card_type === "shop",
      can_appear_in_surprise_box: def.can_appear_in_surprise_box ?? def.card_type === "shop",
      is_active: def.is_active ?? def.card_type !== "event",
      storage_path: prefix,
    });
  }

  return created;
}

async function verify(supabase) {
  const existingKeys = [...Object.keys(RESTORE_ASSETS), EVENT_WINTER_RESTORE.card_key];
  const newKeys = NEW_CARDS_FROM_MISTAKE.map((c) => c.card_key);

  const { data: existing } = await supabase
    .from("reward_cards")
    .select("card_key, image_url, image_asset_key")
    .in("card_key", existingKeys);

  for (const row of existing || []) {
    if (row.card_key === "event_winter") {
      if (row.image_url !== EVENT_WINTER_RESTORE.image_url) {
        throw new Error(`event_winter not restored: ${row.image_url}`);
      }
      continue;
    }
    if (!row.image_url?.includes("supabase.co")) {
      throw new Error(`${row.card_key} missing storage image_url after restore`);
    }
  }

  const { data: newCards } = await supabase
    .from("reward_cards")
    .select("card_key, image_url")
    .in("card_key", newKeys);

  for (const key of newKeys) {
    const row = (newCards || []).find((r) => r.card_key === key);
    if (!row?.image_url) throw new Error(`New card missing image: ${key}`);
  }

  const wrongZipOnExisting = (existing || []).filter((r) => {
    if (r.card_key === "event_winter") return false;
    const v = String(r.image_url || "");
    return v.includes("178199119") || v.includes("178199120");
  });
  if (wrongZipOnExisting.length) {
    throw new Error(`Existing cards still have mistaken upload cache bust: ${wrongZipOnExisting.map((r) => r.card_key).join(", ")}`);
  }

  console.log("\nVERIFY OK");
}

async function main() {
  const supabase = getSupabase();
  const affectedKeys = [...Object.keys(RESTORE_ASSETS), EVENT_WINTER_RESTORE.card_key];
  const beforeRows = await snapshotCards(supabase, affectedKeys);

  console.log("=== BEFORE (mistaken state) ===");
  for (const row of beforeRows.sort((a, b) => a.card_key.localeCompare(b.card_key))) {
    console.log(JSON.stringify(row));
  }

  const restoreLog = await restoreExistingCards(supabase, beforeRows);
  const extractDir = await extractZipPngs();
  const created = await createNewCards(supabase, extractDir);

  if (!dryRun) await verify(supabase);

  console.log("\n=== RESTORE LOG ===");
  console.log(JSON.stringify(restoreLog, null, 2));
  console.log("\n=== NEW CARDS ===");
  console.log(JSON.stringify(created, null, 2));
}

main().catch((err) => {
  console.error("\nFAILED:", err.message || err);
  process.exit(1);
});
