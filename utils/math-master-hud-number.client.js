/**
 * Compact HUD numbers for /learning/math-master only.
 * Up to 3 digit display — e.g. 6171 → 6.17K
 */

function trimFixed(value, maxDecimals) {
  return value.toFixed(maxDecimals).replace(/\.?0+$/, "");
}

/**
 * @param {number | string | null | undefined} value
 * @returns {string}
 */
export function formatMathHudNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "-");

  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  if (abs < 1000) return sign + String(Math.trunc(abs));

  if (abs < 1_000_000) return `${sign}${trimFixed(abs / 1000, 2)}K`;
  if (abs < 1_000_000_000) return `${sign}${trimFixed(abs / 1_000_000, 2)}M`;
  return `${sign}${trimFixed(abs / 1_000_000_000, 2)}B`;
}
