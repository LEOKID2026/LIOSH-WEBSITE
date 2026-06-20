/**
 * Client-side reward card image processing — trim dark borders + rounded corners.
 * Used by display (RewardCardImage) and download export.
 */
import {
  resolveRewardCardContentBounds,
  rewardCardCornerRadiusPx,
  rewardCardRoundRectPath,
} from "./reward-card-display.js";

/** @type {Map<string, { url: string, at: number }>} */
const displayUrlCache = new Map();
const DISPLAY_CACHE_MAX = 120;

function isSvgUrl(url) {
  return /\.svg(\?|$)/i.test(String(url || ""));
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = url;
  });
}

function canvasToBlob(canvas, type = "image/png") {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("export_failed"));
    }, type, 0.92);
  });
}

function trimCacheIfNeeded() {
  if (displayUrlCache.size <= DISPLAY_CACHE_MAX) return;
  const entries = [...displayUrlCache.entries()].sort((a, b) => a[1].at - b[1].at);
  const removeCount = displayUrlCache.size - DISPLAY_CACHE_MAX + 10;
  for (let i = 0; i < removeCount; i += 1) {
    const [key, value] = entries[i];
    URL.revokeObjectURL(value.url);
    displayUrlCache.delete(key);
  }
}

/**
 * Draw trimmed card art with transparent rounded corners onto a canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} img
 * @param {{ watermarkText?: string | null }} [opts]
 * @returns {{ width: number, height: number }}
 */
export function renderProcessedRewardCard(ctx, img, opts = {}) {
  const sourceWidth = img.naturalWidth > 0 ? img.naturalWidth : 1024;
  const sourceHeight = img.naturalHeight > 0 ? img.naturalHeight : 1536;

  const scratch = document.createElement("canvas");
  scratch.width = sourceWidth;
  scratch.height = sourceHeight;
  const scratchCtx = scratch.getContext("2d");
  if (!scratchCtx) throw new Error("canvas_unavailable");

  scratchCtx.drawImage(img, 0, 0, sourceWidth, sourceHeight);
  const imageData = scratchCtx.getImageData(0, 0, sourceWidth, sourceHeight);
  const bounds = resolveRewardCardContentBounds(imageData.data, sourceWidth, sourceHeight);

  const outWidth = bounds.width;
  const outHeight = bounds.height;
  const radius = rewardCardCornerRadiusPx(outWidth, outHeight);

  ctx.canvas.width = outWidth;
  ctx.canvas.height = outHeight;
  ctx.clearRect(0, 0, outWidth, outHeight);

  ctx.save();
  rewardCardRoundRectPath(ctx, 0, 0, outWidth, outHeight, radius);
  ctx.clip();
  ctx.drawImage(
    img,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    outWidth,
    outHeight
  );
  ctx.restore();

  const watermarkText = opts.watermarkText ? String(opts.watermarkText) : "";
  if (watermarkText) {
    drawInImageWatermark(ctx, outWidth, outHeight, watermarkText);
  }

  return { width: outWidth, height: outHeight };
}

function drawInImageWatermark(ctx, width, height, studentFullName) {
  const title = `האוסף של ${studentFullName}`;
  const fontSize = Math.max(14, Math.round(width * 0.038));
  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${fontSize}px "Segoe UI", "Arial Hebrew", Arial, sans-serif`;

  const textY = Math.round(height * 0.055);
  const metrics = ctx.measureText(title);
  const padX = Math.round(fontSize * 0.65);
  const padY = Math.round(fontSize * 0.45);
  const barWidth = Math.min(width * 0.9, metrics.width + padX * 2);
  const barHeight = fontSize + padY * 2;
  const barX = (width - barWidth) / 2;
  const barY = textY - barHeight / 2;

  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  rewardCardRoundRectPath(ctx, barX, barY, barWidth, barHeight, Math.round(fontSize * 0.25));
  ctx.fill();

  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = Math.max(2, Math.round(fontSize * 0.18));
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = "#fff4cc";
  ctx.fillText(title, width / 2, textY);
  ctx.restore();
}

/**
 * Process card image for on-screen display (cached object URL).
 * @param {string} imageUrl
 * @returns {Promise<string>}
 */
export async function getProcessedRewardCardDisplayUrl(imageUrl) {
  const src = String(imageUrl || "").trim();
  if (!src || isSvgUrl(src)) return src;

  const cached = displayUrlCache.get(src);
  if (cached) {
    cached.at = Date.now();
    return cached.url;
  }

  try {
    const img = await loadImage(src);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return src;

    renderProcessedRewardCard(ctx, img);
    const blob = await canvasToBlob(canvas);
    const url = URL.createObjectURL(blob);
    trimCacheIfNeeded();
    displayUrlCache.set(src, { url, at: Date.now() });
    return url;
  } catch {
    return src;
  }
}

/**
 * @param {{ imageUrl: string, studentFullName: string }} opts
 * @returns {Promise<Blob>}
 */
export async function buildProcessedRewardCardDownloadBlob({ imageUrl, studentFullName }) {
  const name = String(studentFullName ?? "").trim();
  if (!name) throw new Error("missing_student_name");
  if (!imageUrl) throw new Error("missing_image");

  const img = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  renderProcessedRewardCard(ctx, img, { watermarkText: name });
  return canvasToBlob(canvas);
}
