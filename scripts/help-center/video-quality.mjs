import { statSync } from "node:fs";

export const MAX_DESKTOP_WEBM_BYTES = 8 * 1024 * 1024;
export const MAX_MOBILE_WEBM_BYTES = 4 * 1024 * 1024;
export const MAX_DESKTOP_POSTER_BYTES = 120 * 1024;
export const MAX_MOBILE_POSTER_BYTES = 80 * 1024;
export const MIN_WEBM_BYTES = 4 * 1024;
export const MIN_POSTER_BYTES = 512;

export function evaluateVideoFile({ filePath, viewport, kind = "webm" }) {
  const reasons = [];
  if (!filePath) {
    return { ok: false, reasons: ["missing path"] };
  }
  let size = 0;
  try {
    size = statSync(filePath).size;
  } catch {
    return { ok: false, reasons: ["file not found"] };
  }
  if (kind === "webm" && size < MIN_WEBM_BYTES) {
    reasons.push(`webm too small (${size} < ${MIN_WEBM_BYTES})`);
  }
  if (kind === "poster" && size < MIN_POSTER_BYTES) {
    reasons.push(`poster too small (${size} < ${MIN_POSTER_BYTES})`);
  }
  const maxWebm =
    viewport === "mobile" ? MAX_MOBILE_WEBM_BYTES : MAX_DESKTOP_WEBM_BYTES;
  const maxPoster =
    viewport === "mobile" ? MAX_MOBILE_POSTER_BYTES : MAX_DESKTOP_POSTER_BYTES;
  if (kind === "webm" && size > maxWebm) {
    reasons.push(`webm exceeds cap (${size} > ${maxWebm})`);
  }
  if (kind === "poster" && size > maxPoster) {
    reasons.push(`poster exceeds cap (${size} > ${maxPoster})`);
  }
  return { ok: reasons.length === 0, reasons, size };
}
