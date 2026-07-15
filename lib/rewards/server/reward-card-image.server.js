/**
 * Admin reward card image upload — Supabase Storage (hybrid with legacy /public paths).
 */

import sharp from "sharp";
import { processRewardCardVariantsForCard } from "./reward-card-variant-process.server.js";

/** Public bucket — create manually in Supabase Dashboard (see docs/admin/reward-card-image-storage-setup.md). */
export const REWARD_CARD_IMAGE_BUCKET = "reward-cards";

export const REWARD_CARD_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const WEBP_QUALITY = 92;

const ALLOWED_MIME = new Set(["image/png", "image/webp", "image/jpeg"]);

/**
 * @param {unknown} raw
 */
export function sanitizeRewardCardPathSegment(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return s || null;
}

/**
 * @param {{ card_key?: string | null, card_type?: string | null, reward_card_series?: { slug?: string | null } | null }} card
 */
export function buildRewardCardStoragePath(card) {
  const cardKey = sanitizeRewardCardPathSegment(card?.card_key);
  if (!cardKey) {
    return { ok: false, code: "missing_card_key", message: "מפתח קלף (card_key) חסר או לא תקין" };
  }

  const cardType = String(card?.card_type || "").trim();
  if (cardType === "event") {
    return { ok: true, storagePath: `events/${cardKey}.webp` };
  }

  const seriesSlug = sanitizeRewardCardPathSegment(card?.reward_card_series?.slug);
  if (!seriesSlug) {
    return {
      ok: false,
      code: "missing_series",
      message: "סדרה חסרה - נדרשת סדרה עם slug לקלף חנות/הישג",
    };
  }

  if (cardType === "shop") {
    return { ok: true, storagePath: `shop/${seriesSlug}/${cardKey}.webp` };
  }
  if (cardType === "achievement") {
    return { ok: true, storagePath: `achievements/${seriesSlug}/${cardKey}.webp` };
  }

  return { ok: false, code: "invalid_card_type", message: "סוג קלף לא נתמך להעלאת תמונה" };
}

/**
 * @param {Buffer} body
 * @param {string} boundary
 */
function parseMultipartBuffer(body, boundary) {
  const delim = Buffer.from(`--${boundary}`);
  /** @type {{ name: string, filename?: string, contentType?: string, data: Buffer }[]} */
  const parts = [];
  let start = body.indexOf(delim);
  while (start !== -1) {
    const next = body.indexOf(delim, start + delim.length);
    const segment = body.subarray(start + delim.length, next === -1 ? body.length : next);
    const headerEnd = segment.indexOf("\r\n\r\n");
    if (headerEnd !== -1) {
      const headerText = segment.subarray(0, headerEnd).toString("utf8");
      const data = segment.subarray(headerEnd + 4, Math.max(headerEnd + 4, segment.length - 2));
      const nameMatch = headerText.match(/name="([^"]+)"/);
      const filenameMatch = headerText.match(/filename="([^"]+)"/);
      const typeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);
      if (nameMatch) {
        parts.push({
          name: nameMatch[1],
          filename: filenameMatch ? filenameMatch[1] : undefined,
          contentType: typeMatch ? typeMatch[1].trim().toLowerCase() : undefined,
          data,
        });
      }
    }
    if (next === -1) break;
    start = next;
  }
  return parts;
}

/**
 * @param {import('http').IncomingMessage} req
 */
export async function parseRewardCardImageUpload(req) {
  const contentType = String(req.headers["content-type"] || "");
  if (!contentType.includes("multipart/form-data")) {
    return {
      ok: false,
      status: 400,
      code: "validation_failed",
      message: "נדרש העלאה ב-multipart/form-data",
    };
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks);

  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]).trim() : null;
  if (!boundary) {
    return { ok: false, status: 400, code: "validation_failed", message: "boundary חסר" };
  }

  const parts = parseMultipartBuffer(body, boundary);
  const filePart = parts.find((p) => p.name === "image" || p.name === "file");
  if (!filePart?.data?.length) {
    return { ok: false, status: 400, code: "validation_failed", message: "קובץ תמונה חסר (שדה image)" };
  }

  if (filePart.data.length > REWARD_CARD_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      status: 400,
      code: "file_too_large",
      message: `הקובץ גדול מדי (מקסימום ${Math.round(REWARD_CARD_IMAGE_MAX_BYTES / (1024 * 1024))}MB)`,
    };
  }

  return {
    ok: true,
    buffer: filePart.data,
    contentType: filePart.contentType || null,
    originalFilename: filePart.filename || null,
  };
}

/**
 * @param {Buffer} buffer
 * @param {string | null} [contentTypeHint]
 */
export async function validateAndConvertRewardCardImage(buffer, contentTypeHint) {
  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    return { ok: false, code: "invalid_image", message: "קובץ התמונה אינו תקין" };
  }

  const format = String(meta.format || "").toLowerCase();
  const allowedFormats = new Set(["png", "webp", "jpeg", "jpg"]);
  if (!allowedFormats.has(format)) {
    return { ok: false, code: "invalid_image_type", message: "סוג תמונה לא נתמך - PNG או WEBP בלבד" };
  }

  if (contentTypeHint && !ALLOWED_MIME.has(contentTypeHint)) {
    return { ok: false, code: "invalid_image_type", message: "סוג MIME לא נתמך" };
  }

  if (!meta.width || !meta.height || meta.width < 32 || meta.height < 32) {
    return { ok: false, code: "invalid_image_dimensions", message: "ממדי התמונה קטנים מדי" };
  }

  const webpBuffer = await sharp(buffer).webp({ quality: WEBP_QUALITY, effort: 4 }).toBuffer();

  return {
    ok: true,
    webpBuffer,
    width: meta.width,
    height: meta.height,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceRole
 * @param {string} storagePath
 * @param {Buffer} webpBuffer
 */
export async function uploadRewardCardImageToStorage(serviceRole, storagePath, webpBuffer) {
  const { error } = await serviceRole.storage.from(REWARD_CARD_IMAGE_BUCKET).upload(storagePath, webpBuffer, {
    contentType: "image/webp",
    upsert: true,
    cacheControl: "3600",
  });

  if (error) {
    return { ok: false, code: "storage_upload_failed", message: error.message || "העלאה ל-Storage נכשלה" };
  }

  const { data: publicData } = serviceRole.storage.from(REWARD_CARD_IMAGE_BUCKET).getPublicUrl(storagePath);
  const publicUrl = publicData?.publicUrl;
  if (!publicUrl) {
    return { ok: false, code: "storage_url_failed", message: "לא ניתן לייצר URL ציבורי" };
  }

  return { ok: true, publicUrl, storagePath };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceRole
 * @param {string} cardId
 * @param {Buffer} imageBuffer
 * @param {string | null} [contentTypeHint]
 */
export async function uploadRewardCardImageForCard(serviceRole, cardId, imageBuffer, contentTypeHint) {
  const { data: card, error: fetchErr } = await serviceRole
    .from("reward_cards")
    .select("*, reward_card_series(slug, name_he)")
    .eq("id", cardId)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false, status: 500, code: "db_error", message: fetchErr.message };
  }
  if (!card) {
    return { ok: false, status: 404, code: "card_not_found", message: "קלף לא נמצא" };
  }

  const pathResult = buildRewardCardStoragePath(card);
  if (!pathResult.ok) {
    return { ok: false, status: 400, code: pathResult.code, message: pathResult.message };
  }

  const converted = await validateAndConvertRewardCardImage(imageBuffer, contentTypeHint);
  if (!converted.ok) {
    return { ok: false, status: 400, code: converted.code, message: converted.message };
  }

  const uploaded = await uploadRewardCardImageToStorage(serviceRole, pathResult.storagePath, converted.webpBuffer);
  if (!uploaded.ok) {
    return { ok: false, status: 400, code: uploaded.code, message: uploaded.message };
  }

  const cacheBust = Date.now();
  const imageUrl = `${uploaded.publicUrl}?v=${cacheBust}`;

  const { error: updateErr } = await serviceRole
    .from("reward_cards")
    .update({
      image_url: imageUrl,
      image_asset_key: uploaded.storagePath,
    })
    .eq("id", cardId);

  if (updateErr) {
    return { ok: false, status: 500, code: "db_update_failed", message: updateErr.message };
  }

  let variantResult;
  try {
    variantResult = await processRewardCardVariantsForCard(serviceRole, cardId, {
      inputBuffer: imageBuffer,
    });
  } catch (variantErr) {
    return {
      ok: false,
      status: 500,
      code: "variant_process_failed",
      message: variantErr instanceof Error ? variantErr.message : "variant_process_failed",
    };
  }

  if (!variantResult.ok) {
    return {
      ok: false,
      status: 400,
      code: variantResult.code || "variant_process_failed",
      message: "עיבוד גרסאות הקלף נכשל",
    };
  }

  const { data: updated } = await serviceRole
    .from("reward_cards")
    .select("*, reward_card_series(name_he, slug)")
    .eq("id", cardId)
    .single();

  return {
    ok: true,
    card: updated || variantResult.card,
    storagePath: uploaded.storagePath,
    imageUrl: variantResult.urls?.display || imageUrl,
    variantsVersion: variantResult.variantsVersion,
    width: converted.width,
    height: converted.height,
  };
}
