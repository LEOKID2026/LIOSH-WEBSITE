/**
 * Line-art post-processing — separate HF and OpenCV paths.
 * HF: flatten → grayscale → trim (bbox only) → darkness strengthen → A4 compose
 * OpenCV: flatten → grayscale → component cleanup → trim → darkness strengthen → A4 compose
 */

export const LINE_ART_TRIM_PADDING_RATIO = 0.025;
export const HF_LINE_ART_WHITE_GRAY = 252;
export const HF_LINE_ART_DARKNESS_STRENGTH = 1.4;
export const OPENCV_LINE_ART_WHITE_GRAY = 248;
export const OPENCV_LINE_ART_DARKNESS_STRENGTH = 1.22;
export const LINE_ART_MIN_DARKNESS = 14;
/** Ignore only single-pixel / speckle noise when computing HF trim bbox. */
export const HF_TRIM_SPECKLE_MAX_AREA = 6;

/** @deprecated use path-specific constants */
export const LINE_ART_DARKNESS_STRENGTH = OPENCV_LINE_ART_DARKNESS_STRENGTH;
/** @deprecated use path-specific constants */
export const LINE_ART_WHITE_GRAY = OPENCV_LINE_ART_WHITE_GRAY;

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * @param {ImageData} imageData
 * @returns {ImageData}
 */
export function flattenWhiteBackground(imageData) {
  const { width, height } = imageData;
  const out = new ImageData(width, height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    const a = imageData.data[i + 3] / 255;
    out.data[i] = Math.round(r * a + 255 * (1 - a));
    out.data[i + 1] = Math.round(g * a + 255 * (1 - a));
    out.data[i + 2] = Math.round(b * a + 255 * (1 - a));
    out.data[i + 3] = 255;
  }
  return out;
}

/**
 * @param {ImageData} imageData
 * @returns {ImageData}
 */
export function toGrayscale(imageData) {
  const out = new ImageData(imageData.width, imageData.height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = Math.round(
      luminance(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2])
    );
    out.data[i] = v;
    out.data[i + 1] = v;
    out.data[i + 2] = v;
    out.data[i + 3] = 255;
  }
  return out;
}

/**
 * @param {number} gray
 */
function pixelDarkness(gray) {
  return 255 - gray;
}

/**
 * @param {number} width
 * @param {number} height
 */
function getMinComponentPixels(width, height) {
  return Math.max(48, Math.round(width * height * 0.00008));
}

/**
 * @param {number} width
 * @param {number} height
 */
function getEdgeComponentMaxPixels(width, height) {
  return Math.max(180, Math.round(width * height * 0.00025));
}

/**
 * 8-connected component labeling — read-only, for trim bbox only.
 * @param {ImageData} imageData
 * @param {number} maxSpeckleArea
 * @returns {{ minX: number, minY: number, maxX: number, maxY: number } | null}
 */
export function findTrimBoundsIgnoringSpeckle(imageData, maxSpeckleArea = HF_TRIM_SPECKLE_MAX_AREA) {
  const { width, height, data } = imageData;
  const total = width * height;
  const mask = new Uint8Array(total);

  for (let i = 0; i < total; i += 1) {
    if (pixelDarkness(data[i * 4]) >= LINE_ART_MIN_DARKNESS) mask[i] = 1;
  }

  const labels = new Int32Array(total);
  /** @type {{ label: number, area: number, minX: number, minY: number, maxX: number, maxY: number }[]} */
  const components = [];
  let nextLabel = 1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      if (!mask[idx] || labels[idx]) continue;

      const label = nextLabel;
      nextLabel += 1;
      labels[idx] = label;

      let area = 0;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;

      /** @type {number[]} */
      const stack = [idx];
      while (stack.length) {
        const cur = stack.pop();
        if (cur == null) continue;
        const cy = Math.floor(cur / width);
        const cx = cur - cy * width;
        area += 1;
        if (cx < minX) minX = cx;
        if (cy < minY) minY = cy;
        if (cx > maxX) maxX = cx;
        if (cy > maxY) maxY = cy;

        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const ni = ny * width + nx;
            if (!mask[ni] || labels[ni]) continue;
            labels[ni] = label;
            stack.push(ni);
          }
        }
      }

      components.push({ label, area, minX, minY, maxX, maxY });
    }
  }

  let boundsMinX = width;
  let boundsMinY = height;
  let boundsMaxX = -1;
  let boundsMaxY = -1;

  for (const c of components) {
    if (c.area <= maxSpeckleArea) continue;
    if (c.minX < boundsMinX) boundsMinX = c.minX;
    if (c.minY < boundsMinY) boundsMinY = c.minY;
    if (c.maxX > boundsMaxX) boundsMaxX = c.maxX;
    if (c.maxY > boundsMaxY) boundsMaxY = c.maxY;
  }

  if (boundsMaxX < boundsMinX || boundsMaxY < boundsMinY) {
    return findLineArtContentBounds(imageData);
  }

  return { minX: boundsMinX, minY: boundsMinY, maxX: boundsMaxX, maxY: boundsMaxY };
}

/**
 * Remove weak speckle and tiny edge-connected components (OpenCV path only).
 * @param {ImageData} imageData
 * @returns {ImageData}
 */
export function removeSmallDarkComponents(imageData) {
  const { width, height, data } = imageData;
  const total = width * height;
  const mask = new Uint8Array(total);
  const minComponent = getMinComponentPixels(width, height);
  const edgeComponentMax = getEdgeComponentMaxPixels(width, height);

  for (let i = 0; i < total; i += 1) {
    const gray = data[i * 4];
    if (pixelDarkness(gray) >= LINE_ART_MIN_DARKNESS) mask[i] = 1;
  }

  const labels = new Int32Array(total);
  /** @type {{ label: number, area: number, touchesEdge: boolean }[]} */
  const components = [];
  let nextLabel = 1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      if (!mask[idx] || labels[idx]) continue;

      const label = nextLabel;
      nextLabel += 1;
      labels[idx] = label;

      let area = 0;
      let touchesEdge =
        x === 0 || y === 0 || x === width - 1 || y === height - 1;

      /** @type {number[]} */
      const stack = [idx];
      while (stack.length) {
        const cur = stack.pop();
        if (cur == null) continue;
        const cy = Math.floor(cur / width);
        const cx = cur - cy * width;
        area += 1;

        const candidates = [];
        if (cx > 0) candidates.push(cur - 1);
        if (cx < width - 1) candidates.push(cur + 1);
        if (cy > 0) candidates.push(cur - width);
        if (cy < height - 1) candidates.push(cur + width);
        for (const ni of candidates) {
          if (!mask[ni] || labels[ni]) continue;
          labels[ni] = label;
          const nx = ni % width;
          const ny = Math.floor(ni / width);
          if (nx === 0 || ny === 0 || nx === width - 1 || ny === height - 1) {
            touchesEdge = true;
          }
          stack.push(ni);
        }
      }

      components.push({ label, area, touchesEdge });
    }
  }

  const keep = new Set(
    components
      .filter((c) => {
        if (c.area < minComponent) return false;
        if (c.touchesEdge && c.area < edgeComponentMax) return false;
        return true;
      })
      .map((c) => c.label)
  );

  const out = new ImageData(width, height);
  for (let i = 0; i < total; i += 1) {
    const src = i * 4;
    const label = labels[i];
    if (label && keep.has(label)) {
      out.data[src] = data[src];
      out.data[src + 1] = data[src + 1];
      out.data[src + 2] = data[src + 2];
    } else {
      out.data[src] = 255;
      out.data[src + 1] = 255;
      out.data[src + 2] = 255;
    }
    out.data[src + 3] = 255;
  }

  return out;
}

/**
 * Bounding box of significant dark pixels.
 * @param {ImageData} imageData
 * @returns {{ minX: number, minY: number, maxX: number, maxY: number } | null}
 */
export function findLineArtContentBounds(imageData) {
  const { data, width, height } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const gray = data[i];
      if (pixelDarkness(gray) < LINE_ART_MIN_DARKNESS) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY };
}

/**
 * @param {ImageData} imageData
 * @param {{ minX: number, minY: number, maxX: number, maxY: number } | null} [bounds]
 * @param {number} [paddingRatio]
 * @returns {ImageData}
 */
export function trimLineArtMargins(
  imageData,
  bounds = null,
  paddingRatio = LINE_ART_TRIM_PADDING_RATIO
) {
  const box = bounds ?? findLineArtContentBounds(imageData);
  if (!box) return imageData;

  const contentW = box.maxX - box.minX + 1;
  const contentH = box.maxY - box.minY + 1;
  const pad = Math.max(2, Math.round(Math.max(contentW, contentH) * paddingRatio));

  const left = Math.max(0, box.minX - pad);
  const top = Math.max(0, box.minY - pad);
  const right = Math.min(imageData.width - 1, box.maxX + pad);
  const bottom = Math.min(imageData.height - 1, box.maxY + pad);
  const cropW = right - left + 1;
  const cropH = bottom - top + 1;

  const out = new ImageData(cropW, cropH);
  for (let y = 0; y < cropH; y += 1) {
    for (let x = 0; x < cropW; x += 1) {
      const src = ((top + y) * imageData.width + (left + x)) * 4;
      const dst = (y * cropW + x) * 4;
      out.data[dst] = imageData.data[src];
      out.data[dst + 1] = imageData.data[src + 1];
      out.data[dst + 2] = imageData.data[src + 2];
      out.data[dst + 3] = 255;
    }
  }
  return out;
}

/**
 * @param {ImageData} imageData
 * @param {{ whiteGray?: number, strength?: number }} [opts]
 * @returns {ImageData}
 */
export function strengthenLineDarkness(imageData, opts = {}) {
  const whiteGray = opts.whiteGray ?? OPENCV_LINE_ART_WHITE_GRAY;
  const strength = opts.strength ?? OPENCV_LINE_ART_DARKNESS_STRENGTH;
  const out = new ImageData(imageData.width, imageData.height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const gray = imageData.data[i];
    if (gray >= whiteGray) {
      out.data[i] = 255;
      out.data[i + 1] = 255;
      out.data[i + 2] = 255;
    } else {
      const darkness = 255 - gray;
      const strengthened = Math.min(255, Math.round(darkness * strength));
      const v = 255 - strengthened;
      out.data[i] = v;
      out.data[i + 1] = v;
      out.data[i + 2] = v;
    }
    out.data[i + 3] = 255;
  }
  return out;
}

/**
 * HF line-art — preserves full HF canvas (user crop composition); no trim/crop.
 * @param {ImageData} imageData
 * @returns {ImageData}
 */
export function prepareHfLineArtForColoringPage(imageData) {
  let work = flattenWhiteBackground(imageData);
  work = toGrayscale(work);
  work = strengthenLineDarkness(work, {
    whiteGray: HF_LINE_ART_WHITE_GRAY,
    strength: HF_LINE_ART_DARKNESS_STRENGTH,
  });
  return work;
}

/**
 * OpenCV fallback line-art — may remove noise components.
 * @param {ImageData} imageData
 * @returns {ImageData}
 */
export function prepareOpenCvLineArtForColoringPage(imageData) {
  let work = flattenWhiteBackground(imageData);
  work = toGrayscale(work);
  work = removeSmallDarkComponents(work);
  work = trimLineArtMargins(work);
  work = strengthenLineDarkness(work, {
    whiteGray: OPENCV_LINE_ART_WHITE_GRAY,
    strength: OPENCV_LINE_ART_DARKNESS_STRENGTH,
  });
  return work;
}

/**
 * @param {ImageData} imageData
 */
export function analyzeLineArtStats(imageData) {
  const bounds = findLineArtContentBounds(imageData);
  let gray = 0;
  let dark = 0;
  let white = 0;
  for (let i = 0; i < imageData.data.length; i += 4) {
    const lum = imageData.data[i];
    if (lum >= HF_LINE_ART_WHITE_GRAY) white += 1;
    else if (lum >= 180) gray += 1;
    else dark += 1;
  }
  return {
    width: imageData.width,
    height: imageData.height,
    bounds,
    white,
    gray,
    dark,
  };
}
