/**
 * Client-safe feature flag for math scratchpad MVP (Phase 2).
 * Default OFF until owner QA approval.
 */

/**
 * @param {boolean} [override] — explicit override for tests
 */
export function isMathScratchpadV1Enabled(override) {
  if (override === true) return true;
  if (override === false) return false;
  if (typeof process !== "undefined" && process.env) {
    return process.env.NEXT_PUBLIC_MATH_SCRATCHPAD_V1 === "true";
  }
  return false;
}
