/**
 * Convert a grayscale depth map (RawImage or ImageData-like) into black-on-white line art.
 * Uses gradient magnitude on the AI depth prediction — highlights object boundaries.
 */

/**
 * @param {{ width: number, height: number, data: Uint8Array | Uint8ClampedArray, channels?: number }} depthImage
 * @param {{ edgeThreshold?: number, invert?: boolean }} [opts]
 * @returns {ImageData}
 */
export function depthMapToLineArt(depthImage, opts = {}) {
  const { width, height, data } = depthImage;
  const channels = depthImage.channels || 1;
  const threshold = opts.edgeThreshold ?? 20;
  const gray = new Uint8Array(width * height);

  for (let i = 0, j = 0; i < data.length; i += channels, j += 1) {
    gray[j] = data[i];
  }

  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      const gx = gray[idx + 1] - gray[idx - 1];
      const gy = gray[idx + width] - gray[idx - width];
      const mag = Math.hypot(gx, gy);
      const ink = mag >= threshold ? 0 : 255;
      const o = idx * 4;
      out[o] = ink;
      out[o + 1] = ink;
      out[o + 2] = ink;
      out[o + 3] = 255;
    }
  }

  if (typeof ImageData !== "undefined") {
    return new ImageData(out, width, height);
  }
  return { width, height, data: out };
}
