#!/usr/bin/env node
/**
 * Apply new cards from קלפים חדשים.zip + upload images to Supabase Storage.
 *
 * Prerequisites:
 *   - .env.local with NEXT_PUBLIC_LEARNING_SUPABASE_URL + LEARNING_SUPABASE_SERVICE_ROLE_KEY
 *   - Bucket `reward-cards` (public)
 *   - Migrations 058–064 (+ 061 israeli-holidays, 065 batch if applicable)
 *
 * Usage:
 *   node --env-file=.env.local scripts/apply-and-upload-new-cards-zip.mjs
 *   node --env-file=.env.local scripts/apply-and-upload-new-cards-zip.mjs --dry-run
 *   node --env-file=.env.local scripts/apply-and-upload-new-cards-zip.mjs --apply-only
 *   node --env-file=.env.local scripts/apply-and-upload-new-cards-zip.mjs --upload-only
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import yauzl from "yauzl";
import {
  EXISTING_IMAGE_UPDATES,
  FIX_NEW_CARDS,
  NEW_CARDS,
  SKIPPED_SOURCES,
  ZIP_INNER_DIR,
  ZIP_NAME,
  storagePathFor,
} from "./new-cards-zip-manifest.mjs";
import {
  REWARD_CARD_IMAGE_BUCKET,
  uploadRewardCardImageForCard,
} from "../lib/rewards/server/reward-card-image.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ZIP_PATH = path.join(ROOT, ZIP_NAME);
const EXTRACT_DIR = path.join(ROOT, "_tmp_new_cards_zip");

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

function assertManifestIntegrity() {
  const keys = NEW_CARDS.map((c) => c.card_key);
  const unique = new Set(keys);
  if (unique.size !== keys.length) {
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    throw new Error(`Duplicate card_key in manifest: ${[...new Set(dupes)].join(", ")}`);
  }

  const sources = NEW_CARDS.map((c) => c.source);
  const uniqueSrc = new Set(sources);
  if (uniqueSrc.size !== sources.length) {
    throw new Error("Duplicate source file in NEW_CARDS manifest");
  }

  const fixSources = new Set(FIX_NEW_CARDS.map((u) => u.source));
  for (const c of NEW_CARDS) {
    if (fixSources.has(c.source)) {
      throw new Error(`Source ${c.source} is in both NEW_CARDS and FIX_NEW_CARDS`);
    }
  }

  const totalMapped = NEW_CARDS.length + FIX_NEW_CARDS.length + SKIPPED_SOURCES.length;
  if (totalMapped !== 68) {
    throw new Error(`Manifest covers ${totalMapped} files, expected 68`);
  }
}

async function getSeriesMap(supabase) {
  const { data, error } = await supabase.from("reward_card_series").select("id, slug");
  if (error) throw new Error(error.message);
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const row of data || []) map.set(row.slug, row.id);
  return map;
}

function cardRowFromDef(def, seriesId) {
  /** @type {Record<string, unknown>} */
  const row = {
    card_key: def.card_key,
    name_he: def.name_he,
    description_he: def.description_he,
    series_id: seriesId,
    rarity: def.rarity,
    card_type: def.card_type,
    use_default_price: true,
    can_be_purchased: def.can_be_purchased ?? def.card_type === "shop",
    can_appear_in_surprise_box: def.can_appear_in_surprise_box ?? def.card_type === "shop",
    is_active: def.is_active ?? def.card_type !== "event",
  };
  if (def.card_type === "event") {
    row.event_reward_mode = def.event_reward_mode || "achievement";
  }
  if (def.subject) row.subject = def.subject;
  return row;
}

async function applyDb(supabase) {
  console.log("\n=== Apply new cards (DB insert only — no schema change) ===");
  const seriesMap = await getSeriesMap(supabase);

  for (const def of NEW_CARDS) {
    const series_id = seriesMap.get(def.series_slug);
    if (!series_id) throw new Error(`Missing series slug: ${def.series_slug}`);

    const { data: existing } = await supabase
      .from("reward_cards")
      .select("id, card_key")
      .eq("card_key", def.card_key)
      .maybeSingle();

    if (existing) {
      console.log(`SKIP insert (already exists): ${def.card_key}`);
      continue;
    }

    const row = cardRowFromDef(def, series_id);
    if (dryRun) {
      console.log(`[dry-run] insert ${def.card_type} ${def.card_key}`);
      continue;
    }

    const { error } = await supabase.from("reward_cards").insert(row);
    if (error) throw new Error(`insert ${def.card_key}: ${error.message}`);
    console.log(`OK insert ${def.card_key}`);
  }
}

function extractZipToDir() {
  if (fs.existsSync(EXTRACT_DIR)) fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });
  fs.mkdirSync(EXTRACT_DIR, { recursive: true });

  return new Promise((resolve, reject) => {
    yauzl.open(ZIP_PATH, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        if (!entry.fileName.startsWith(`${ZIP_INNER_DIR}/`) || !/\.png$/i.test(entry.fileName)) {
          zipfile.readEntry();
          return;
        }
        const base = path.basename(entry.fileName);
        const dest = path.join(EXTRACT_DIR, base);
        zipfile.openReadStream(entry, (e, stream) => {
          if (e) return reject(e);
          const w = fs.createWriteStream(dest);
          stream.pipe(w);
          w.on("finish", () => zipfile.readEntry());
          w.on("error", reject);
        });
      });
      zipfile.on("end", () => resolve(EXTRACT_DIR));
      zipfile.on("error", reject);
    });
  });
}

function resolveSourcePath(extractDir, basename) {
  const p = path.join(extractDir, basename);
  if (!fs.existsSync(p)) throw new Error(`Missing extracted PNG: ${basename}`);
  return p;
}

async function checkBucket(supabase) {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`storage.listBuckets: ${error.message}`);
  const ok = (data || []).some((b) => b.name === REWARD_CARD_IMAGE_BUCKET);
  if (!ok) {
    throw new Error(
      `Bucket "${REWARD_CARD_IMAGE_BUCKET}" not found. See docs/admin/reward-card-image-storage-setup.md`
    );
  }
  console.log(`OK bucket ${REWARD_CARD_IMAGE_BUCKET}`);
}

async function uploadForCardKey(supabase, cardKey, filePath) {
  if (dryRun) {
    console.log(`[dry-run] upload ${cardKey} ← ${path.basename(filePath)}`);
    return { card_key: cardKey, storagePath: "(dry-run)" };
  }

  const { data: card, error: fetchErr } = await supabase
    .from("reward_cards")
    .select("id, card_key, image_url")
    .eq("card_key", cardKey)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!card) throw new Error(`Card not in DB: ${cardKey}`);

  const buffer = fs.readFileSync(filePath);
  const result = await uploadRewardCardImageForCard(supabase, card.id, buffer, "image/png");
  if (!result.ok) throw new Error(`${cardKey}: ${result.message || result.code}`);
  console.log(`OK upload ${cardKey} → ${result.storagePath}`);
  return { card_key: cardKey, storagePath: result.storagePath, imageUrl: result.imageUrl };
}

async function uploadImages(supabase) {
  console.log("\n=== Upload images to Storage ===");
  if (!fs.existsSync(ZIP_PATH)) throw new Error(`ZIP not found: ${ZIP_PATH}`);

  await checkBucket(supabase);
  const extractDir = await extractZipToDir();
  console.log(`Extracted to ${extractDir}`);

  /** @type {Array<{ card_key: string, storagePath: string, source: string }>} */
  const uploaded = [];

  for (const def of NEW_CARDS) {
    const filePath = resolveSourcePath(extractDir, def.source);
    const result = await uploadForCardKey(supabase, def.card_key, filePath);
    uploaded.push({ card_key: def.card_key, storagePath: result.storagePath, source: def.source });
  }

  for (const upd of EXISTING_IMAGE_UPDATES) {
    const filePath = resolveSourcePath(extractDir, upd.source);
    const result = await uploadForCardKey(supabase, upd.card_key, filePath);
    uploaded.push({ card_key: upd.card_key, storagePath: result.storagePath, source: upd.source });
  }

  return uploaded;
}

async function postVerify(supabase) {
  console.log("\n=== Post-verify ===");
  const allKeys = [
    ...NEW_CARDS.map((c) => c.card_key),
    ...EXISTING_IMAGE_UPDATES.map((u) => u.card_key),
  ];

  const { data, error } = await supabase
    .from("reward_cards")
    .select("card_key, name_he, description_he, image_url, image_asset_key, card_type, is_active, can_be_purchased, can_appear_in_surprise_box, reward_card_series(slug)")
    .in("card_key", allKeys);

  if (error) throw new Error(error.message);

  const byKey = new Map((data || []).map((r) => [r.card_key, r]));
  const missing = allKeys.filter((k) => !byKey.has(k));
  if (missing.length) throw new Error(`Missing cards after apply: ${missing.join(", ")}`);

  const noImage = allKeys.filter((k) => {
    const row = byKey.get(k);
    return !row?.image_url || !String(row.image_url).trim();
  });
  if (noImage.length) throw new Error(`Cards without image_url: ${noImage.join(", ")}`);

  const englishInHebrew = (data || []).filter((r) => {
    const text = `${r.name_he} ${r.description_he}`;
    return /\b[A-Za-z]{3,}\b/.test(text);
  });
  if (englishInHebrew.length) {
    const keys = englishInHebrew.map((r) => r.card_key).join(", ");
    throw new Error(`Possible English in Hebrew fields: ${keys}`);
  }

  console.log(`OK ${allKeys.length} cards present with images`);
  return data;
}

async function main() {
  assertManifestIntegrity();
  console.log(`Manifest: ${NEW_CARDS.length} new, ${FIX_NEW_CARDS.length} fix-new, ${SKIPPED_SOURCES.length} skipped`);

  const supabase = getSupabase();
  if (doApply) await applyDb(supabase);
  if (doUpload) await uploadImages(supabase);
  if (!dryRun && (doApply || doUpload)) await postVerify(supabase);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("\nFAILED:", err.message || err);
  process.exit(1);
});

export { assertManifestIntegrity, storagePathFor };
