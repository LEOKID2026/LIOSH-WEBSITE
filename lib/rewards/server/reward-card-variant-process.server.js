/**
 * Server-side reward card variant pipeline — trim, rounded corners, resize (sharp).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  resolveRewardCardContentBounds,
  rewardCardCornerRadiusPx,
} from "../reward-card-display.js";
import {
  REWARD_CARD_DISPLAY_MAX_EDGE,
  REWARD_CARD_THUMB_MAX_EDGE,
  REWARD_CARD_VARIANT_CACHE_CONTROL,
  getRewardCardPublicUrl,
  persistRewardCardVariantUrls,
  rewardCardVariantStoragePaths,
} from "./reward-card-assets.server.js";
import { REWARD_CARD_IMAGE_BUCKET } from "./reward-card-image.server.js";

const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const THUMB_WEBP_QUALITY = 82;
const DISPLAY_WEBP_QUALITY = 88;
const ORIGINAL_WEBP_QUALITY = 90;

/**
 * @param {Buffer} buffer
 */
export async function computeTrimBoundsFromBuffer(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return resolveRewardCardContentBounds(data, info.width, info.height);
}

/**
 * @param {import("sharp").Sharp} pipeline
 */
async function applyRoundedAlphaMask(pipeline) {
  const pngBuffer = await pipeline.ensureAlpha().png().toBuffer();
  const meta = await sharp(pngBuffer).metadata();
  const width = meta.width || 1;
  const height = meta.height || 1;
  const radius = rewardCardCornerRadiusPx(width, height);
  const mask = Buffer.from(
    `<svg width="${width}" height="${height}"><rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white"/></svg>`
  );
  return sharp(pngBuffer).composite([{ input: mask, blend: "dest-in" }]);
}

/**
 * @param {import("sharp").Sharp} pipeline
 * @param {"webp" | "png"} format
 * @param {number} [quality]
 */
async function finalizeVariant(pipeline, format, quality) {
  const rounded = await applyRoundedAlphaMask(pipeline);
  if (format === "png") {
    return rounded.png({ compressionLevel: 9 }).toBuffer();
  }
  return rounded.webp({ quality: quality ?? DISPLAY_WEBP_QUALITY, effort: 4 }).toBuffer();
}

/**
 * @param {Buffer} inputBuffer
 */
export async function buildRewardCardVariantBuffers(inputBuffer) {
  const meta = await sharp(inputBuffer).metadata();
  const bounds = await computeTrimBoundsFromBuffer(inputBuffer);

  const trimmed = sharp(inputBuffer).extract({
    left: bounds.x,
    top: bounds.y,
    width: bounds.width,
    height: bounds.height,
  });

  const trimmedMeta = await trimmed.metadata();
  const tw = trimmedMeta.width || bounds.width;
  const th = trimmedMeta.height || bounds.height;

  const originalBuffer = await finalizeVariant(trimmed.clone(), "webp", ORIGINAL_WEBP_QUALITY);

  const displayPipeline = trimmed.clone().resize({
    width: tw >= th ? REWARD_CARD_DISPLAY_MAX_EDGE : undefined,
    height: th > tw ? REWARD_CARD_DISPLAY_MAX_EDGE : undefined,
    fit: "inside",
    withoutEnlargement: true,
  });
  const displayBuffer = await finalizeVariant(displayPipeline, "webp", DISPLAY_WEBP_QUALITY);

  const thumbPipeline = trimmed.clone().resize({
    width: tw >= th ? REWARD_CARD_THUMB_MAX_EDGE : undefined,
    height: th > tw ? REWARD_CARD_THUMB_MAX_EDGE : undefined,
    fit: "inside",
    withoutEnlargement: true,
  });
  const thumbBuffer = await finalizeVariant(thumbPipeline, "webp", THUMB_WEBP_QUALITY);

  const downloadBuffer = await finalizeVariant(trimmed.clone(), "png");

  return {
    originalBuffer,
    thumbBuffer,
    displayBuffer,
    downloadBuffer,
    sourceWidth: meta.width || 0,
    sourceHeight: meta.height || 0,
    trimmedWidth: tw,
    trimmedHeight: th,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceRole
 * @param {string} storagePath
 * @param {Buffer} body
 * @param {string} contentType
 */
async function uploadVariantObject(serviceRole, storagePath, body, contentType) {
  const { error } = await serviceRole.storage.from(REWARD_CARD_IMAGE_BUCKET).upload(storagePath, body, {
    contentType,
    upsert: true,
    cacheControl: REWARD_CARD_VARIANT_CACHE_CONTROL,
  });
  if (error) throw new Error(error.message || "variant_upload_failed");
  return getRewardCardPublicUrl(serviceRole, storagePath);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceRole
 * @param {string} cardId
 * @param {Buffer} inputBuffer
 * @param {number} [nextVersion]
 */
export async function uploadRewardCardVariantsForCard(serviceRole, cardId, inputBuffer, nextVersion) {
  const paths = rewardCardVariantStoragePaths(cardId);
  const built = await buildRewardCardVariantBuffers(inputBuffer);

  const [originalUrl, thumbUrl, displayUrl, downloadUrl] = await Promise.all([
    uploadVariantObject(serviceRole, paths.original, built.originalBuffer, "image/webp"),
    uploadVariantObject(serviceRole, paths.thumb, built.thumbBuffer, "image/webp"),
    uploadVariantObject(serviceRole, paths.display, built.displayBuffer, "image/webp"),
    uploadVariantObject(serviceRole, paths.download, built.downloadBuffer, "image/png"),
  ]);

  const version =
    nextVersion != null ? Math.floor(Number(nextVersion)) : Math.floor(Date.now() / 1000);

  return {
    paths,
    urls: {
      original: originalUrl,
      thumb: thumbUrl,
      display: displayUrl,
      download: downloadUrl,
    },
    variantsVersion: version,
    meta: {
      sourceWidth: built.sourceWidth,
      sourceHeight: built.sourceHeight,
      trimmedWidth: built.trimmedWidth,
      trimmedHeight: built.trimmedHeight,
    },
  };
}

/**
 * @param {string} url
 */
export async function fetchImageBufferFromUrl(url) {
  const res = await fetch(String(url).split("?")[0], { redirect: "follow" });
  if (!res.ok) throw new Error(`fetch_failed:${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Load source bytes from Supabase public URL or local /public path.
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceRole
 * @param {{ image_url?: string | null, image_asset_key?: string | null }} card
 */
export async function loadRewardCardSourceBuffer(serviceRole, card) {
  const assetKey = String(card.image_asset_key || "").trim();
  const legacyUrl = String(card.image_url || "").split("?")[0].trim();
  const localPath =
    (assetKey.startsWith("/") && assetKey) || (legacyUrl.startsWith("/") && legacyUrl) || null;

  if (localPath) {
    const absPath = path.join(PROJECT_ROOT, "public", localPath.replace(/^\//, ""));
    if (!fs.existsSync(absPath)) {
      throw new Error(`local_file_missing:${localPath}`);
    }
    return fs.readFileSync(absPath);
  }

  const sourceUrl =
    assetKey && !assetKey.startsWith("/")
      ? getRewardCardPublicUrl(serviceRole, assetKey)
      : legacyUrl;

  if (!sourceUrl || /\.svg(\?|$)/i.test(sourceUrl)) {
    throw new Error("no_processable_source");
  }

  return fetchImageBufferFromUrl(sourceUrl);
}

/**
 * Process card image and persist variant URLs on reward_cards.
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceRole
 * @param {string} cardId
 * @param {{ inputBuffer?: Buffer, nextVersion?: number }} [options]
 */
export async function processRewardCardVariantsForCard(serviceRole, cardId, options = {}) {
  const { data: card, error: fetchErr } = await serviceRole
    .from("reward_cards")
    .select("*")
    .eq("id", cardId)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!card) return { ok: false, code: "card_not_found" };

  let inputBuffer = options.inputBuffer;
  if (!inputBuffer) {
    try {
      inputBuffer = await loadRewardCardSourceBuffer(serviceRole, card);
    } catch (err) {
      const message = err instanceof Error ? err.message : "source_load_failed";
      if (message === "no_processable_source") {
        return { ok: false, code: "no_processable_source", cardKey: card.card_key };
      }
      throw err;
    }
  }

  const prevVersion = Math.floor(Number(card.image_variants_version) || 0);
  const nextVersion =
    options.nextVersion != null ? Math.floor(Number(options.nextVersion)) : Math.max(prevVersion + 1, 1);

  const uploaded = await uploadRewardCardVariantsForCard(serviceRole, cardId, inputBuffer, nextVersion);

  const updated = await persistRewardCardVariantUrls(serviceRole, cardId, {
    thumbUrl: uploaded.urls.thumb,
    thumbAssetKey: uploaded.paths.thumb,
    displayUrl: uploaded.urls.display,
    displayAssetKey: uploaded.paths.display,
    downloadUrl: uploaded.urls.download,
    downloadAssetKey: uploaded.paths.download,
    originalAssetKey: uploaded.paths.original,
    variantsVersion: uploaded.variantsVersion,
  });

  return {
    ok: true,
    card: updated,
    paths: uploaded.paths,
    urls: uploaded.urls,
    variantsVersion: uploaded.variantsVersion,
    meta: uploaded.meta,
  };
}
