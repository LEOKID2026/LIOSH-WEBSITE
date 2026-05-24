/**
 * Screenshot quality helpers for Help Center capture + data-safety review.
 * No external image dependencies — uses PNG IHDR + file stats only.
 */
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";

export const MIN_CAPTURE_BYTES = 4_000;
export const MIN_APPROVED_BYTES = 8_000;
/** Max PNG height for mobile help screenshots (section crops, not full-page strips). */
export const MAX_MOBILE_ELEMENT_HEIGHT = 520;
export const MAX_TABLET_ELEMENT_HEIGHT = 700;
/** Max PNG height for desktop help screenshots inside article column. */
export const MAX_DESKTOP_ELEMENT_HEIGHT = 960;
export const MAX_ELEMENT_ASPECT_RATIO = 4.5;

/** @returns {{ width: number, height: number } | null} */
export function parsePngDimensions(filePathOrBuffer) {
  const buf = Buffer.isBuffer(filePathOrBuffer)
    ? filePathOrBuffer
    : readFileSync(filePathOrBuffer);
  if (buf.length < 24 || buf.toString("ascii", 1, 4) !== "PNG") return null;
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

export function sha256File(filePath) {
  const buf = readFileSync(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

/**
 * @param {object} opts
 * @param {string} opts.filePath
 * @param {"mobile"|"tablet"|"desktop"} [opts.viewport]
 * @param {number} [opts.minBytes]
 * @param {number} [opts.maxHeight]
 */
export function evaluateScreenshotFile({
  filePath,
  viewport = "desktop",
  minBytes = MIN_CAPTURE_BYTES,
  maxHeight =
    viewport === "mobile"
      ? MAX_MOBILE_ELEMENT_HEIGHT
      : viewport === "tablet"
        ? MAX_TABLET_ELEMENT_HEIGHT
        : MAX_DESKTOP_ELEMENT_HEIGHT,
}) {
  const reasons = [];
  let size = 0;
  try {
    size = statSync(filePath).size;
  } catch {
    return { ok: false, reasons: ["file missing"], size: 0, dimensions: null, sha256: null };
  }

  if (size < minBytes) {
    reasons.push(`below min bytes (${size} < ${minBytes})`);
  }

  let dimensions = null;
  try {
    dimensions = parsePngDimensions(filePath);
  } catch {
    reasons.push("unreadable PNG");
  }

  if (dimensions) {
    if (dimensions.width < 80 || dimensions.height < 60) {
      reasons.push(`tiny dimensions ${dimensions.width}x${dimensions.height}`);
    }
    if (dimensions.height > maxHeight) {
      reasons.push(`height ${dimensions.height} exceeds cap ${maxHeight}`);
    }
    const ratio = dimensions.height / Math.max(dimensions.width, 1);
    if (viewport === "mobile" && ratio > MAX_ELEMENT_ASPECT_RATIO) {
      reasons.push(`aspect ratio ${ratio.toFixed(2)} too tall for mobile`);
    }
  } else if (!reasons.length) {
    reasons.push("invalid PNG header");
  }

  let sha256 = null;
  try {
    sha256 = sha256File(filePath);
  } catch {
    reasons.push("hash failed");
  }

  return {
    ok: reasons.length === 0,
    reasons,
    size,
    dimensions,
    sha256,
  };
}
