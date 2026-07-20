/**
 * A4 page composition — catalog cards + isolated upload pipeline.
 */

import {
  COLORING_PAGE_HEIGHT_PX,
  COLORING_PAGE_TITLE_FONT_PX,
  COLORING_PAGE_WIDTH_PX,
  COLORING_PAGE_MARGIN_SIDE_PX,
  COLORING_PAGE_MARGIN_TOP_PX,
  COLORING_PAGE_MARGIN_BOTTOM_PX,
  COLORING_PAGE_ILLUSTRATION_INSET_PX,
  getColoringPageArtPlacement,
  getColoringPageIllustrationFitSize,
  getColoringPageTitleBox,
} from "../coloring/coloring-page-layout.js";
import { COLORING_UPLOAD_PREVIEW_MAX_WIDTH } from "./constants.js";
import { findLineArtContentBounds } from "./line-art-postprocess.client.js";
import { trackCanvas, trackObjectUrl } from "./memory-manager.client.js";

const FONT_URL = "/assets/coloring-pages/fonts/NotoSansHebrew-Variable.ttf";
let fontLoaded = false;

async function ensureHebrewFont() {
  if (fontLoaded || typeof document === "undefined") return;
  try {
    const face = new FontFace("NotoSansHebrewColoring", `url(${FONT_URL})`, {
      weight: "600",
    });
    await face.load();
    document.fonts.add(face);
    fontLoaded = true;
  } catch {
    fontLoaded = true;
  }
}

/**
 * @param {ImageData} lineArt
 * @param {string} title
 * @param {{ tiled?: boolean }} [opts]
 */
export async function composeA4Page(lineArt, title, opts = {}) {
  await ensureHebrewFont();
  const canvas = document.createElement("canvas");
  canvas.width = COLORING_PAGE_WIDTH_PX;
  canvas.height = COLORING_PAGE_HEIGHT_PX;
  trackCanvas(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  if (opts.tiled) {
    await drawTiledWhiteFill(ctx, COLORING_PAGE_WIDTH_PX, COLORING_PAGE_HEIGHT_PX);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const fit = getColoringPageIllustrationFitSize();
  const artCanvas = document.createElement("canvas");
  artCanvas.width = lineArt.width;
  artCanvas.height = lineArt.height;
  artCanvas.getContext("2d")?.putImageData(lineArt, 0, 0);

  const scale = Math.min(fit.width / lineArt.width, fit.height / lineArt.height);
  const placedW = Math.round(lineArt.width * scale);
  const placedH = Math.round(lineArt.height * scale);
  const { left, top } = getColoringPageArtPlacement(placedW, placedH);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(artCanvas, left, top, placedW, placedH);
  artCanvas.width = 0;
  artCanvas.height = 0;

  const titleText = String(title || "").trim();
  if (titleText) {
    const titleBox = getColoringPageTitleBox();
    ctx.fillStyle = "#111111";
    ctx.font = `600 ${COLORING_PAGE_TITLE_FONT_PX}px NotoSansHebrewColoring, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = "rtl";
    ctx.fillText(
      titleText,
      titleBox.x + titleBox.width / 2,
      titleBox.y + titleBox.height / 2
    );
  }

  return canvas;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 */
async function drawTiledWhiteFill(ctx, w, h) {
  const tile = 512;
  ctx.fillStyle = "#ffffff";
  for (let y = 0; y < h; y += tile) {
    for (let x = 0; x < w; x += tile) {
      ctx.fillRect(x, y, Math.min(tile, w - x), Math.min(tile, h - y));
      await new Promise((r) => setTimeout(r, 0));
    }
  }
}

/** @param {ImageData} lineArt @returns {"portrait" | "landscape"} */
export function getUploadPageOrientation(lineArt) {
  return lineArt.width > lineArt.height ? "landscape" : "portrait";
}

/**
 * @param {"portrait" | "landscape"} orientation
 */
export function getUploadPagePixelSize(orientation) {
  return orientation === "landscape"
    ? { width: COLORING_PAGE_HEIGHT_PX, height: COLORING_PAGE_WIDTH_PX }
    : { width: COLORING_PAGE_WIDTH_PX, height: COLORING_PAGE_HEIGHT_PX };
}

/**
 * @param {number} pageW
 * @param {number} pageH
 */
function getUploadContentRect(pageW, pageH) {
  const inset = COLORING_PAGE_ILLUSTRATION_INSET_PX;
  const innerW = pageW - COLORING_PAGE_MARGIN_SIDE_PX * 2 - inset * 2;
  const innerH = pageH - COLORING_PAGE_MARGIN_TOP_PX - COLORING_PAGE_MARGIN_BOTTOM_PX - inset * 2;
  return {
    left: COLORING_PAGE_MARGIN_SIDE_PX + inset,
    top: COLORING_PAGE_MARGIN_TOP_PX + inset,
    width: Math.max(1, innerW),
    height: Math.max(1, innerH),
  };
}

/**
 * Offset draw position so visual ink center aligns with content center (read-only bounds).
 * @param {ImageData} lineArt
 * @param {number} drawWidth
 * @param {number} drawHeight
 */
function getVisualCenterDrawOffset(lineArt, drawWidth, drawHeight) {
  const bounds = findLineArtContentBounds(lineArt);
  if (!bounds) return { offsetX: 0, offsetY: 0 };

  const artCenterX = (bounds.minX + bounds.maxX + 1) / 2;
  const artCenterY = (bounds.minY + bounds.maxY + 1) / 2;
  const canvasCenterX = lineArt.width / 2;
  const canvasCenterY = lineArt.height / 2;

  return {
    offsetX: ((artCenterX - canvasCenterX) / lineArt.width) * drawWidth,
    offsetY: ((artCenterY - canvasCenterY) / lineArt.height) * drawHeight,
  };
}

/**
 * Upload A4 — separate from catalog cards; orientation follows trimmed artwork.
 * Margined layout only (coloring pages). Stylized art uses composeStylizedNativePage.
 * @param {ImageData} lineArt
 * @param {{ centerMode?: "line-art" | "geometric" }} [opts]
 */
export async function composeUploadA4Page(lineArt, opts = {}) {
  const orientation = getUploadPageOrientation(lineArt);
  const { width: pageW, height: pageH } = getUploadPagePixelSize(orientation);
  const canvas = document.createElement("canvas");
  canvas.width = pageW;
  canvas.height = pageH;
  trackCanvas(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, pageW, pageH);

  const content = getUploadContentRect(pageW, pageH);
  const scale = Math.min(content.width / lineArt.width, content.height / lineArt.height);
  const drawWidth = lineArt.width * scale;
  const drawHeight = lineArt.height * scale;
  const { offsetX, offsetY } =
    opts.centerMode === "geometric"
      ? { offsetX: 0, offsetY: 0 }
      : getVisualCenterDrawOffset(lineArt, drawWidth, drawHeight);
  const x = content.left + (content.width - drawWidth) / 2 - offsetX;
  const y = content.top + (content.height - drawHeight) / 2 - offsetY;

  const artCanvas = document.createElement("canvas");
  artCanvas.width = lineArt.width;
  artCanvas.height = lineArt.height;
  artCanvas.getContext("2d")?.putImageData(lineArt, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(artCanvas, x, y, drawWidth, drawHeight);
  artCanvas.width = 0;
  artCanvas.height = 0;

  return {
    canvas,
    orientation,
    placement: {
      x,
      y,
      drawWidth,
      drawHeight,
      contentWidth: content.width,
      contentHeight: content.height,
      areaFillPercent: Math.round(((drawWidth * drawHeight) / (content.width * content.height)) * 1000) / 10,
    },
  };
}

/**
 * Stylized art — native pixel canvas matching source aspect ratio (no A4 letterboxing).
 * @param {ImageData} imageData
 */
export async function composeStylizedNativePage(imageData) {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  trackCanvas(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.putImageData(imageData, 0, 0);
  return {
    canvas,
    orientation: getUploadPageOrientation(imageData),
  };
}

/**
 * Single final PNG for download + print.
 * @param {ImageData} lineArt
 * @param {{ centerMode?: "line-art" | "geometric", layout?: "margined" | "native-aspect" }} [opts]
 */
export async function buildUploadFinalA4(lineArt, opts = {}) {
  if (opts.layout === "native-aspect") {
    const { canvas, orientation } = await composeStylizedNativePage(lineArt);
    const blob = await canvasToPngBlob(canvas);
    canvas.width = 0;
    canvas.height = 0;
    return { blob, orientation };
  }

  const { canvas, orientation } = await composeUploadA4Page(lineArt, opts);
  const blob = await canvasToPngBlob(canvas);
  canvas.width = 0;
  canvas.height = 0;
  return { blob, orientation };
}

/**
 * Screen preview from the same final A4 blob.
 * @param {Blob} finalBlob
 */
export async function composeUploadPreviewFromBlob(finalBlob) {
  const bitmap = await createImageBitmap(finalBlob);
  const maxW = COLORING_UPLOAD_PREVIEW_MAX_WIDTH;
  const scale = Math.min(1, maxW / bitmap.width);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string} [filename]
 */
export function canvasToPngBlob(canvas, filename = "coloring-page.png") {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("PNG export failed"));
        resolve(blob);
      },
      "image/png",
      1
    );
  });
}

/**
 * @param {HTMLCanvasElement} canvas
 */
export function canvasToObjectUrl(canvas) {
  const url = canvas.toDataURL("image/png");
  const blob = dataUrlToBlob(url);
  const obj = URL.createObjectURL(blob);
  trackObjectUrl(obj);
  return obj;
}

/** @param {string} dataUrl */
function dataUrlToBlob(dataUrl) {
  const [header, b64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/**
 * @param {ImageData} lineArt
 * @param {string} title
 * @param {{ tiled?: boolean }} opts
 */
export async function renderA4Blob(lineArt, title, opts = {}) {
  const canvas = await composeA4Page(lineArt, title, opts);
  const blob = await canvasToPngBlob(canvas);
  canvas.width = 0;
  canvas.height = 0;
  return blob;
}
