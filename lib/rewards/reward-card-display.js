/**
 * Shared reward card display constants — no DOM, safe for tests.
 */

/** Target card aspect ratio (width / height). */
export const REWARD_CARD_ASPECT_RATIO = 2 / 3;

/** Luminance threshold (0–255) for trimming black/dark letterbox borders. */
export const REWARD_CARD_BLACK_TRIM_THRESHOLD = 28;

/** Alpha below this is treated as empty when trimming. */
export const REWARD_CARD_TRIM_ALPHA_MIN = 12;

/** Max extra inner crop per side after global trim — ratio cap. */
export const REWARD_CARD_EDGE_CROP_MAX_RATIO = 0.03;

/** Max extra inner crop per side after global trim — pixel cap. */
export const REWARD_CARD_EDGE_CROP_MAX_PX = 12;

/** Edge row/column must be at least this dark to qualify for inner crop. */
export const REWARD_CARD_EDGE_DARK_RATIO_MIN = 0.88;

/** Slightly looser threshold for edge-only re-check (outer rows/columns). */
export const REWARD_CARD_EDGE_DARK_THRESHOLD = 32;

/** Gradual 1px steps; bounded by per-side max crop. */
export const REWARD_CARD_EDGE_MAX_STEPS = 16;

export const REWARD_CARD_BORDER_RADIUS_RATIO = 0.045;
export const REWARD_CARD_BORDER_RADIUS_MIN_PX = 8;
export const REWARD_CARD_BORDER_RADIUS_MAX_PX = 20;

/** Transparent clip wrappers only — no border/shadow/background. */
export const REWARD_CARD_CLIP_CLASS_THUMB = "rounded-[8px]";
export const REWARD_CARD_CLIP_CLASS_TILE = "rounded-[12px]";
export const REWARD_CARD_CLIP_CLASS_MODAL = "rounded-[14px]";

/**
 * @param {number} width
 * @param {number} height
 */
export function rewardCardCornerRadiusPx(width, height) {
  const min = Math.min(width, height);
  return Math.max(
    REWARD_CARD_BORDER_RADIUS_MIN_PX,
    Math.min(REWARD_CARD_BORDER_RADIUS_MAX_PX, Math.round(min * REWARD_CARD_BORDER_RADIUS_RATIO))
  );
}

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} a
 * @param {number} [threshold]
 */
export function isRewardCardTrimPixel(r, g, b, a, threshold = REWARD_CARD_BLACK_TRIM_THRESHOLD) {
  if (a < REWARD_CARD_TRIM_ALPHA_MIN) return true;
  return r <= threshold && g <= threshold && b <= threshold;
}

/**
 * Find bounding box of non-dark content in RGBA image data.
 * @param {Uint8ClampedArray} data
 * @param {number} width
 * @param {number} height
 * @param {number} [threshold]
 */
export function findRewardCardContentBounds(data, width, height, threshold = REWARD_CARD_BLACK_TRIM_THRESHOLD) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (!isRewardCardTrimPixel(data[i], data[i + 1], data[i + 2], data[i + 3], threshold)) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found) {
    return { x: 0, y: 0, width, height };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * @param {number} dimension
 */
export function rewardCardEdgeCropMaxPx(dimension) {
  return Math.min(
    REWARD_CARD_EDGE_CROP_MAX_PX,
    Math.max(1, Math.ceil(dimension * REWARD_CARD_EDGE_CROP_MAX_RATIO))
  );
}

/**
 * @param {Uint8ClampedArray} data
 * @param {number} srcWidth
 * @param {number} srcX
 * @param {number} srcY
 * @param {number} [threshold]
 */
function readRewardCardPixel(data, srcWidth, srcX, srcY, threshold = REWARD_CARD_BLACK_TRIM_THRESHOLD) {
  const i = (srcY * srcWidth + srcX) * 4;
  return isRewardCardTrimPixel(data[i], data[i + 1], data[i + 2], data[i + 3], threshold);
}

/**
 * Dark-pixel ratio on a single outer edge of a bounds rect (edge-only, not interior).
 * @param {Uint8ClampedArray} data
 * @param {number} srcWidth
 * @param {{ x: number, y: number, width: number, height: number }} bounds
 * @param {"top" | "right" | "bottom" | "left"} edge
 * @param {number} [threshold]
 */
export function rewardCardEdgeDarkRatio(data, srcWidth, bounds, edge, threshold = REWARD_CARD_EDGE_DARK_THRESHOLD) {
  const { x, y, width, height } = bounds;
  if (width <= 0 || height <= 0) return 0;

  let dark = 0;
  let total = 0;

  if (edge === "top") {
    for (let dx = 0; dx < width; dx += 1) {
      total += 1;
      if (readRewardCardPixel(data, srcWidth, x + dx, y, threshold)) dark += 1;
    }
  } else if (edge === "bottom") {
    const rowY = y + height - 1;
    for (let dx = 0; dx < width; dx += 1) {
      total += 1;
      if (readRewardCardPixel(data, srcWidth, x + dx, rowY, threshold)) dark += 1;
    }
  } else if (edge === "left") {
    for (let dy = 0; dy < height; dy += 1) {
      total += 1;
      if (readRewardCardPixel(data, srcWidth, x, y + dy, threshold)) dark += 1;
    }
  } else {
    const colX = x + width - 1;
    for (let dy = 0; dy < height; dy += 1) {
      total += 1;
      if (readRewardCardPixel(data, srcWidth, colX, y + dy, threshold)) dark += 1;
    }
  }

  return total ? dark / total : 0;
}

/**
 * Gentle edge-only inner crop after global trim — only when outer rows/columns stay very dark.
 * @param {Uint8ClampedArray} data
 * @param {number} srcWidth
 * @param {number} srcHeight
 * @param {{ x: number, y: number, width: number, height: number }} initialBounds
 * @param {number} [threshold]
 */
export function refineRewardCardEdgeCrop(data, srcWidth, srcHeight, initialBounds, threshold = REWARD_CARD_EDGE_DARK_THRESHOLD) {
  let { x, y, width, height } = initialBounds;
  const cropped = { top: 0, right: 0, bottom: 0, left: 0 };
  const maxTop = rewardCardEdgeCropMaxPx(height);
  const maxBottom = rewardCardEdgeCropMaxPx(height);
  const maxLeft = rewardCardEdgeCropMaxPx(width);
  const maxRight = rewardCardEdgeCropMaxPx(width);

  for (let step = 0; step < REWARD_CARD_EDGE_MAX_STEPS; step += 1) {
    if (width < 8 || height < 8) break;

    const bounds = { x, y, width, height };
    const topDark = rewardCardEdgeDarkRatio(data, srcWidth, bounds, "top", threshold);
    const bottomDark = rewardCardEdgeDarkRatio(data, srcWidth, bounds, "bottom", threshold);
    const leftDark = rewardCardEdgeDarkRatio(data, srcWidth, bounds, "left", threshold);
    const rightDark = rewardCardEdgeDarkRatio(data, srcWidth, bounds, "right", threshold);

    const cropTop =
      topDark >= REWARD_CARD_EDGE_DARK_RATIO_MIN && cropped.top < maxTop && y + 1 < srcHeight;
    const cropBottom =
      bottomDark >= REWARD_CARD_EDGE_DARK_RATIO_MIN &&
      cropped.bottom < maxBottom &&
      height > 1;
    const cropLeft =
      leftDark >= REWARD_CARD_EDGE_DARK_RATIO_MIN && cropped.left < maxLeft && x + 1 < srcWidth;
    const cropRight =
      rightDark >= REWARD_CARD_EDGE_DARK_RATIO_MIN && cropped.right < maxRight && width > 1;

    if (!cropTop && !cropBottom && !cropLeft && !cropRight) break;

    if (cropTop) {
      y += 1;
      height -= 1;
      cropped.top += 1;
    }
    if (cropBottom) {
      height -= 1;
      cropped.bottom += 1;
    }
    if (cropLeft) {
      x += 1;
      width -= 1;
      cropped.left += 1;
    }
    if (cropRight) {
      width -= 1;
      cropped.right += 1;
    }
  }

  return { x, y, width, height };
}

/**
 * Global dark trim + optional gentle edge-only refinement.
 * @param {Uint8ClampedArray} data
 * @param {number} width
 * @param {number} height
 * @param {number} [threshold]
 */
export function resolveRewardCardContentBounds(data, width, height, threshold = REWARD_CARD_BLACK_TRIM_THRESHOLD) {
  const initial = findRewardCardContentBounds(data, width, height, threshold);
  return refineRewardCardEdgeCrop(data, width, height, initial);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r
 */
export function rewardCardRoundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
