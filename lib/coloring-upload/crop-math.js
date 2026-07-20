/**
 * Crop / zoom math — single source of truth for display + export.
 */

/** Matches .coloring-upload-crop-frame inset in CSS */
export const CROP_FRAME_INSET = 0.08;

/**
 * @typedef {Object} CropTransform
 * @property {number} stageWidth
 * @property {number} stageHeight
 * @property {number} frameX
 * @property {number} frameY
 * @property {number} frameWidth
 * @property {number} frameHeight
 * @property {number} sourceWidth
 * @property {number} sourceHeight
 * @property {number} baseScale
 * @property {number} userZoom
 * @property {number} effectiveScale
 * @property {number} panX
 * @property {number} panY
 * @property {number} rotationDeg
 * @property {"contain"|"cover"} fitMode
 */

/**
 * @param {number} stageWidth
 * @param {number} stageHeight
 * @param {number} [inset]
 */
export function computeFrameRect(stageWidth, stageHeight, inset = CROP_FRAME_INSET) {
  const frameX = Math.round(stageWidth * inset);
  const frameY = Math.round(stageHeight * inset);
  const frameWidth = Math.max(1, Math.round(stageWidth * (1 - 2 * inset)));
  const frameHeight = Math.max(1, Math.round(stageHeight * (1 - 2 * inset)));
  return { frameX, frameY, frameWidth, frameHeight };
}

/**
 * Rotated axis-aligned bounds of the source image.
 * @param {number} sourceWidth
 * @param {number} sourceHeight
 * @param {number} rotationDeg
 */
export function rotatedSourceBounds(sourceWidth, sourceHeight, rotationDeg) {
  const swap = Math.abs(rotationDeg % 180) === 90;
  return {
    width: swap ? sourceHeight : sourceWidth,
    height: swap ? sourceWidth : sourceHeight,
  };
}

/**
 * Compute full crop transform — used by both display canvas and export.
 *
 * @param {{
 *   stageWidth: number,
 *   stageHeight: number,
 *   sourceWidth: number,
 *   sourceHeight: number,
 *   userZoom?: number,
 *   panX?: number,
 *   panY?: number,
 *   rotationDeg?: number,
 *   fitMode?: "contain"|"cover",
 *   cropInset?: number,
 * }} params
 * @returns {CropTransform}
 */
export function computeCropTransform(params) {
  const {
    stageWidth,
    stageHeight,
    sourceWidth,
    sourceHeight,
    userZoom = 1,
    panX = 0,
    panY = 0,
    rotationDeg = 0,
    fitMode = "contain",
    cropInset = CROP_FRAME_INSET,
  } = params;

  if (!stageWidth || !stageHeight || !sourceWidth || !sourceHeight) {
    throw new Error("Invalid crop transform dimensions");
  }

  const frame = computeFrameRect(stageWidth, stageHeight, cropInset);
  const rot = rotatedSourceBounds(sourceWidth, sourceHeight, rotationDeg);

  const baseScale =
    fitMode === "cover"
      ? Math.max(frame.frameWidth / rot.width, frame.frameHeight / rot.height)
      : Math.min(frame.frameWidth / rot.width, frame.frameHeight / rot.height);

  const effectiveScale = baseScale * userZoom;

  return {
    stageWidth,
    stageHeight,
    ...frame,
    sourceWidth,
    sourceHeight,
    baseScale,
    userZoom,
    effectiveScale,
    panX,
    panY,
    rotationDeg,
    fitMode,
  };
}

/**
 * Render the crop stage — same transform for display and export.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasImageSource} source
 * @param {CropTransform} transform
 */
export function renderCropStage(ctx, source, transform) {
  const {
    stageWidth,
    stageHeight,
    sourceWidth,
    sourceHeight,
    effectiveScale,
    panX,
    panY,
    rotationDeg,
  } = transform;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, stageWidth, stageHeight);

  ctx.save();
  ctx.translate(stageWidth / 2 + panX, stageHeight / 2 + panY);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.scale(effectiveScale, effectiveScale);
  ctx.drawImage(source, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
  ctx.restore();
}

/**
 * Read the crop frame from an already-rendered stage canvas.
 *
 * @param {CanvasRenderingContext2D} stageCtx
 * @param {CropTransform} transform
 */
export function readCropFrameFromStage(stageCtx, transform) {
  const { frameX, frameY, frameWidth, frameHeight } = transform;
  return stageCtx.getImageData(frameX, frameY, frameWidth, frameHeight);
}

/**
 * @param {number} srcW
 * @param {number} srcH
 * @param {number} maxEdge
 */
export function fitInsideMaxEdge(srcW, srcH, maxEdge) {
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH, 1));
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
    scale,
  };
}

/**
 * Flatten RGBA onto white background.
 * @param {ImageData} imageData
 */
export function flattenAlphaToWhite(imageData) {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    if (a >= 1) continue;
    data[i] = Math.round(data[i] * a + 255 * (1 - a));
    data[i + 1] = Math.round(data[i + 1] * a + 255 * (1 - a));
    data[i + 2] = Math.round(data[i + 2] * a + 255 * (1 - a));
    data[i + 3] = 255;
  }
  return imageData;
}

/**
 * Extract crop by rendering the stage once, then reading the frame pixels directly.
 *
 * @param {CanvasImageSource} source
 * @param {CropTransform} transform
 * @param {number} maxEdge
 */
export function extractCropImageData(source, transform, maxEdge) {
  const stage = document.createElement("canvas");
  stage.width = Math.max(1, Math.round(transform.stageWidth));
  stage.height = Math.max(1, Math.round(transform.stageHeight));
  const ctx = stage.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  renderCropStage(ctx, source, transform);
  const cropped = readCropFrameFromStage(ctx, transform);
  stage.width = 0;
  stage.height = 0;

  flattenAlphaToWhite(cropped);

  const fit = fitInsideMaxEdge(cropped.width, cropped.height, maxEdge);
  if (fit.width === cropped.width && fit.height === cropped.height) {
    return cropped;
  }

  const out = document.createElement("canvas");
  out.width = fit.width;
  out.height = fit.height;
  const outCtx = out.getContext("2d");
  if (!outCtx) throw new Error("Canvas not supported");
  outCtx.fillStyle = "#ffffff";
  outCtx.fillRect(0, 0, fit.width, fit.height);
  const tmp = document.createElement("canvas");
  tmp.width = cropped.width;
  tmp.height = cropped.height;
  tmp.getContext("2d")?.putImageData(cropped, 0, 0);
  outCtx.drawImage(tmp, 0, 0, fit.width, fit.height);
  tmp.width = 0;
  tmp.height = 0;
  const result = outCtx.getImageData(0, 0, fit.width, fit.height);
  out.width = 0;
  out.height = 0;
  return result;
}

/**
 * Draw crop preview into a target canvas (WYSIWYG thumbnail).
 *
 * @param {HTMLCanvasElement} previewCanvas
 * @param {CanvasImageSource} source
 * @param {CropTransform} transform
 */
export function renderCropPreview(previewCanvas, source, transform) {
  const maxW = 280;
  const scale = Math.min(1, maxW / transform.frameWidth);
  previewCanvas.width = Math.max(1, Math.round(transform.frameWidth * scale));
  previewCanvas.height = Math.max(1, Math.round(transform.frameHeight * scale));

  const stage = document.createElement("canvas");
  stage.width = transform.stageWidth;
  stage.height = transform.stageHeight;
  const stageCtx = stage.getContext("2d");
  if (!stageCtx) return;
  renderCropStage(stageCtx, source, transform);

  const pctx = previewCanvas.getContext("2d");
  if (!pctx) return;
  pctx.fillStyle = "#ffffff";
  pctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
  pctx.drawImage(
    stage,
    transform.frameX,
    transform.frameY,
    transform.frameWidth,
    transform.frameHeight,
    0,
    0,
    previewCanvas.width,
    previewCanvas.height
  );
  stage.width = 0;
  stage.height = 0;
}
