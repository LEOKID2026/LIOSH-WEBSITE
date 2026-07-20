/** Pixels at or above this RGB level are treated as white border for stylized trims. */
export const STYLIZED_BORDER_WHITE_THRESHOLD = 248;

/** Row/column must be at least this fraction white to count as a trimmable margin strip. */
export const STYLIZED_EDGE_WHITE_RATIO = 0.985;

/** Never trim more than this fraction of width/height from any single edge. */
export const STYLIZED_MAX_EDGE_TRIM_RATIO = 0.1;

/**
 * @param {number} dimension
 */
function maxEdgeTrimPx(dimension) {
  return Math.max(2, Math.floor(dimension * STYLIZED_MAX_EDGE_TRIM_RATIO));
}

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} a
 */
export function isStylizedBorderPixel(r, g, b, a, threshold = STYLIZED_BORDER_WHITE_THRESHOLD) {
  if (a < 12) return true;
  return r >= threshold && g >= threshold && b >= threshold;
}

/**
 * @param {Uint8ClampedArray} data
 * @param {number} width
 * @param {number} y
 * @param {number} threshold
 */
function rowWhiteRatio(data, width, y, threshold) {
  let white = 0;
  for (let x = 0; x < width; x += 1) {
    const i = (y * width + x) * 4;
    if (isStylizedBorderPixel(data[i], data[i + 1], data[i + 2], data[i + 3], threshold)) {
      white += 1;
    }
  }
  return white / width;
}

/**
 * @param {Uint8ClampedArray} data
 * @param {number} width
 * @param {number} height
 * @param {number} x
 * @param {number} threshold
 */
function columnWhiteRatio(data, width, height, x, threshold) {
  let white = 0;
  for (let y = 0; y < height; y += 1) {
    const i = (y * width + x) * 4;
    if (isStylizedBorderPixel(data[i], data[i + 1], data[i + 2], data[i + 3], threshold)) {
      white += 1;
    }
  }
  return white / height;
}

/**
 * Remove only uniform near-white margin strips from the edges — never tight-crop to content bbox.
 * @param {ImageData} imageData
 */
export function trimStylizedArtWhiteBorder(imageData) {
  const { width, height, data } = imageData;
  if (width < 4 || height < 4) return imageData;

  const maxTrimX = maxEdgeTrimPx(width);
  const maxTrimY = maxEdgeTrimPx(height);

  let top = 0;
  while (
    top < height - 2 &&
    top < maxTrimY &&
    rowWhiteRatio(data, width, top, STYLIZED_BORDER_WHITE_THRESHOLD) >= STYLIZED_EDGE_WHITE_RATIO
  ) {
    top += 1;
  }

  let bottom = height - 1;
  while (
    bottom > top + 1 &&
    height - 1 - bottom < maxTrimY &&
    rowWhiteRatio(data, width, bottom, STYLIZED_BORDER_WHITE_THRESHOLD) >= STYLIZED_EDGE_WHITE_RATIO
  ) {
    bottom -= 1;
  }

  let left = 0;
  while (
    left < width - 2 &&
    left < maxTrimX &&
    columnWhiteRatio(data, width, height, left, STYLIZED_BORDER_WHITE_THRESHOLD) >=
      STYLIZED_EDGE_WHITE_RATIO
  ) {
    left += 1;
  }

  let right = width - 1;
  while (
    right > left + 1 &&
    width - 1 - right < maxTrimX &&
    columnWhiteRatio(data, width, height, right, STYLIZED_BORDER_WHITE_THRESHOLD) >=
      STYLIZED_EDGE_WHITE_RATIO
  ) {
    right -= 1;
  }

  const cropW = right - left + 1;
  const cropH = bottom - top + 1;
  if (cropW === width && cropH === height) return imageData;
  if (cropW < 2 || cropH < 2) return imageData;

  const out = new ImageData(cropW, cropH);
  for (let y = 0; y < cropH; y += 1) {
    for (let x = 0; x < cropW; x += 1) {
      const src = ((y + top) * width + (x + left)) * 4;
      const dst = (y * cropW + x) * 4;
      out.data[dst] = data[src];
      out.data[dst + 1] = data[src + 1];
      out.data[dst + 2] = data[src + 2];
      out.data[dst + 3] = data[src + 3];
    }
  }
  return out;
}

/** Prepare stylized model output for native-aspect export (optional uniform edge trim only). */
export function prepareStylizedArtForFullBleed(imageData) {
  return trimStylizedArtWhiteBorder(imageData);
}
