import crypto from "node:crypto";

/**
 * Constant-time string comparison for secret tokens (UTF-8).
 * Returns false when lengths differ without leaking expected length via early return timing.
 */
export function timingSafeCompareStrings(a, b) {
  const sa = String(a ?? "");
  const sb = String(b ?? "");
  const bufA = Buffer.from(sa, "utf8");
  const bufB = Buffer.from(sb, "utf8");
  if (bufA.length !== bufB.length) {
    if (bufA.length > 0) crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  if (bufA.length === 0) return sa === sb;
  return crypto.timingSafeEqual(bufA, bufB);
}
