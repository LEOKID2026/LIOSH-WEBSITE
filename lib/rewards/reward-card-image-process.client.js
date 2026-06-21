/**
 * Client-side reward card image processing — trim dark borders + rounded corners.
 * Display path: CSS clip first, canvas trim only when needed (cached + deduped).
 */
import {
  findRewardCardContentBounds,
  resolveRewardCardContentBounds,
  rewardCardCornerRadiusPx,
  rewardCardEdgeDarkRatio,
  rewardCardRoundRectPath,
  REWARD_CARD_EDGE_DARK_RATIO_MIN,
} from "./reward-card-display.js";
import { isPreBakedRewardCardVariantUrl } from "./reward-card-image-urls.js";

/** Bump when trim/crop logic changes — invalidates client caches. */
export const REWARD_CARD_PROCESSING_VERSION = 2;

const DISPLAY_CACHE_MAX = 400;
const ANALYSIS_CACHE_MAX = 600;

/** @type {Map<string, { url: string, at: number }>} */
const displayUrlCache = new Map();
/** @type {Map<string, { needsProcessing: boolean, at: number }>} */
const analysisCache = new Map();
/** @type {Map<string, Promise<HTMLImageElement>>} */
const imageLoadCache = new Map();
/** @type {Map<string, HTMLImageElement>} */
const loadedImageCache = new Map();
const LOADED_IMAGE_CACHE_MAX = 80;
/** @type {Map<string, Promise<string>>} */
const inFlightDisplay = new Map();

const PERF_ENABLED =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEBUG_REWARD_CARD_IMAGE === "1";

function perfMark(label) {
  if (!PERF_ENABLED || typeof performance === "undefined") return;
  performance.mark(label);
}

function perfMeasure(name, startMark, endMark) {
  if (!PERF_ENABLED || typeof performance === "undefined") return;
  try {
    performance.measure(name, startMark, endMark);
    const entry = performance.getEntriesByName(name).pop();
    if (entry) console.info(`[reward-card-image] ${name}: ${Math.round(entry.duration)}ms`);
  } catch {
    /* ignore duplicate marks */
  }
}

function cacheKey(src) {
  return `${REWARD_CARD_PROCESSING_VERSION}|${src}`;
}

function isSvgUrl(url) {
  return /\.svg(\?|$)/i.test(String(url || ""));
}

function normalizeImageUrl(url) {
  return String(url || "").trim();
}

function trimDisplayCacheIfNeeded() {
  if (displayUrlCache.size <= DISPLAY_CACHE_MAX) return;
  const entries = [...displayUrlCache.entries()].sort((a, b) => a[1].at - b[1].at);
  const removeCount = displayUrlCache.size - DISPLAY_CACHE_MAX + 20;
  for (let i = 0; i < removeCount; i += 1) {
    const [key, value] = entries[i];
    URL.revokeObjectURL(value.url);
    displayUrlCache.delete(key);
  }
}

function trimAnalysisCacheIfNeeded() {
  if (analysisCache.size <= ANALYSIS_CACHE_MAX) return;
  const entries = [...analysisCache.entries()].sort((a, b) => a[1].at - b[1].at);
  const removeCount = analysisCache.size - ANALYSIS_CACHE_MAX + 40;
  for (let i = 0; i < removeCount; i += 1) {
    analysisCache.delete(entries[i][0]);
  }
}

function loadImage(url) {
  const src = normalizeImageUrl(url);
  if (!src) return Promise.reject(new Error("missing_image_url"));

  const loaded = loadedImageCache.get(src);
  if (loaded) return Promise.resolve(loaded);

  const inflight = imageLoadCache.get(src);
  if (inflight) return inflight;

  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = src;
  })
    .then((img) => {
      loadedImageCache.set(src, img);
      if (loadedImageCache.size > LOADED_IMAGE_CACHE_MAX) {
        const oldest = loadedImageCache.keys().next().value;
        if (oldest) loadedImageCache.delete(oldest);
      }
      return img;
    })
    .finally(() => {
      imageLoadCache.delete(src);
    });

  imageLoadCache.set(src, promise);
  return promise;
}

function canvasToBlob(canvas, type = "image/png") {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("export_failed"));
    }, type, 0.92);
  });
}

function runWhenIdle(fn) {
  if (typeof requestIdleCallback === "function") {
    return new Promise((resolve, reject) => {
      requestIdleCallback(() => {
        fn().then(resolve, reject);
      }, { timeout: 2500 });
    });
  }
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      fn().then(resolve, reject);
    }, 0);
  });
}

/**
 * Fast downscaled scan — does this card need canvas trim (black letterbox)?
 * @param {HTMLImageElement} img
 */
export function detectRewardCardNeedsProcessing(img) {
  const sourceWidth = img.naturalWidth > 0 ? img.naturalWidth : 1024;
  const sourceHeight = img.naturalHeight > 0 ? img.naturalHeight : 1536;
  const maxSide = 240;
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const scratch = document.createElement("canvas");
  scratch.width = width;
  scratch.height = height;
  const scratchCtx = scratch.getContext("2d");
  if (!scratchCtx) return false;

  scratchCtx.drawImage(img, 0, 0, width, height);
  const imageData = scratchCtx.getImageData(0, 0, width, height);
  const bounds = resolveRewardCardContentBounds(imageData.data, width, height);

  const trimmedArea = bounds.width * bounds.height;
  const fullArea = width * height;
  if (trimmedArea / fullArea < 0.985) return true;

  const edges = ["top", "right", "bottom", "left"];
  for (const edge of edges) {
    if (
      rewardCardEdgeDarkRatio(imageData.data, width, bounds, edge) >=
      REWARD_CARD_EDGE_DARK_RATIO_MIN
    ) {
      return true;
    }
  }

  const initial = findRewardCardContentBounds(imageData.data, width, height);
  if (initial.x > 0 || initial.y > 0) return true;
  if (initial.width < width || initial.height < height) return true;

  return false;
}

function rememberAnalysis(src, needsProcessing) {
  analysisCache.set(src, { needsProcessing, at: Date.now() });
  trimAnalysisCacheIfNeeded();
}

function getCachedDisplayUrl(src) {
  const key = cacheKey(src);
  const cached = displayUrlCache.get(key);
  if (!cached) return null;
  cached.at = Date.now();
  return cached.url;
}

function rememberDisplayUrl(src, url) {
  const key = cacheKey(src);
  trimDisplayCacheIfNeeded();
  displayUrlCache.set(key, { url, at: Date.now() });
}

/**
 * Trim-only display render — rounded corners stay on CSS wrapper.
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} img
 */
export function renderTrimmedRewardCardDisplay(ctx, img) {
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

  ctx.canvas.width = outWidth;
  ctx.canvas.height = outHeight;
  ctx.clearRect(0, 0, outWidth, outHeight);
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

  return { width: outWidth, height: outHeight };
}

/**
 * Draw trimmed card art with transparent rounded corners onto a canvas (download).
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} img
 * @param {{ watermarkText?: string | null }} [opts]
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

export function drawRewardCardDownloadWatermark(ctx, width, height, studentFullName) {
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

function drawInImageWatermark(ctx, width, height, studentFullName) {
  drawRewardCardDownloadWatermark(ctx, width, height, studentFullName);
}

async function buildTrimmedDisplayUrl(src) {
  const loadMark = `reward-card:load:${src.slice(-24)}`;
  perfMark(loadMark);
  const img = await loadImage(src);
  perfMark(`${loadMark}:done`);
  perfMeasure("reward-card:load-image", loadMark, `${loadMark}:done`);

  const analyzeMark = `reward-card:analyze:${src.slice(-24)}`;
  perfMark(analyzeMark);
  let needsProcessing = analysisCache.get(src)?.needsProcessing;
  if (needsProcessing === undefined) {
    needsProcessing = detectRewardCardNeedsProcessing(img);
    rememberAnalysis(src, needsProcessing);
  }
  perfMark(`${analyzeMark}:done`);
  perfMeasure("reward-card:analyze", analyzeMark, `${analyzeMark}:done`);

  if (!needsProcessing) return src;

  const cached = getCachedDisplayUrl(src);
  if (cached) return cached;

  const renderMark = `reward-card:render:${src.slice(-24)}`;
  perfMark(renderMark);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;

  renderTrimmedRewardCardDisplay(ctx, img);
  perfMark(`${renderMark}:trimmed`);

  const blobMark = `reward-card:blob:${src.slice(-24)}`;
  perfMark(blobMark);
  const blob = await canvasToBlob(canvas);
  perfMark(`${blobMark}:done`);
  perfMeasure("reward-card:canvas-trim", renderMark, `${renderMark}:trimmed`);
  perfMeasure("reward-card:blob", blobMark, `${blobMark}:done`);

  const url = URL.createObjectURL(blob);
  rememberDisplayUrl(src, url);
  return url;
}

function scheduleDisplayProcessing(src, priority = "lazy") {
  const key = cacheKey(src);
  const existing = inFlightDisplay.get(key);
  if (existing) return existing;

  const run = () =>
    buildTrimmedDisplayUrl(src).catch(() => src).finally(() => {
      inFlightDisplay.delete(key);
    });

  const promise = priority === "eager" ? run() : runWhenIdle(run);
  inFlightDisplay.set(key, promise);
  return promise;
}

/**
 * Resolve display source: immediate CSS-safe URL + optional cached upgrade.
 * @param {string} imageUrl
 * @param {{ priority?: "lazy" | "eager" }} [opts]
 * @returns {{ immediate: string, upgrade: Promise<string> | null }}
 */
export function resolveRewardCardDisplaySource(imageUrl, opts = {}) {
  const src = normalizeImageUrl(imageUrl);
  if (!src || isSvgUrl(src) || isPreBakedRewardCardVariantUrl(src) || opts.skipProcessing) {
    return { immediate: src, upgrade: null };
  }

  const priority = opts.priority === "eager" ? "eager" : "lazy";
  const analysis = analysisCache.get(src);
  if (analysis?.needsProcessing === false) {
    return { immediate: src, upgrade: null };
  }

  const cached = getCachedDisplayUrl(src);
  if (cached) {
    return { immediate: cached, upgrade: null };
  }

  return {
    immediate: src,
    upgrade: scheduleDisplayProcessing(src, priority),
  };
}

/**
 * @deprecated Prefer resolveRewardCardDisplaySource — kept for callers expecting a Promise.
 * @param {string} imageUrl
 * @param {{ priority?: "lazy" | "eager" }} [opts]
 * @returns {Promise<string>}
 */
export async function getProcessedRewardCardDisplayUrl(imageUrl, opts = {}) {
  const { immediate, upgrade } = resolveRewardCardDisplaySource(imageUrl, opts);
  if (!upgrade) return immediate;
  return upgrade;
}

/**
 * @param {{ imageUrl: string, downloadUrl?: string | null, preBakedDownload?: boolean, studentFullName: string }} opts
 * @returns {Promise<Blob>}
 */
export async function buildProcessedRewardCardDownloadBlob({
  imageUrl,
  downloadUrl,
  preBakedDownload = false,
  studentFullName,
}) {
  const name = String(studentFullName ?? "").trim();
  if (!name) throw new Error("missing_student_name");

  const bakedUrl = String(downloadUrl || "").trim();
  const usePreBaked = Boolean(preBakedDownload && bakedUrl) || isPreBakedRewardCardVariantUrl(bakedUrl);

  if (usePreBaked) {
    const img = await loadImage(bakedUrl);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas_unavailable");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    drawRewardCardDownloadWatermark(ctx, canvas.width, canvas.height, name);
    return canvasToBlob(canvas);
  }

  if (!imageUrl) throw new Error("missing_image");

  const src = normalizeImageUrl(imageUrl);
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  renderProcessedRewardCard(ctx, img, { watermarkText: name });
  return canvasToBlob(canvas);
}

/** Test/dev helper — clear module caches. */
export function clearRewardCardImageProcessCaches() {
  for (const value of displayUrlCache.values()) {
    URL.revokeObjectURL(value.url);
  }
  displayUrlCache.clear();
  analysisCache.clear();
  imageLoadCache.clear();
  loadedImageCache.clear();
  inFlightDisplay.clear();
}
