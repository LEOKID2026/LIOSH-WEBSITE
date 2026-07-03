/** Leo player number: 8 digits, no leading zero (10000000–99999999). */
export const LEO_NUMBER_RE = /^[1-9][0-9]{7}$/;
export const LEO_NUMBER_MIN = 10_000_000;
export const LEO_NUMBER_MAX_EXCLUSIVE = 100_000_000;
export const LEO_NUMBER_DIGITS = 8;

/**
 * @param {string|null|undefined} raw
 * @returns {string|null}
 */
export function isValidLeoNumberString(raw) {
  const s = raw != null ? String(raw).trim() : "";
  return LEO_NUMBER_RE.test(s) ? s : null;
}
