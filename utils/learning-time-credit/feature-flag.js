/**
 * Client-safe feature flag for learning time fairness (P0+).
 * When false, masters should use legacy 120s caps and topic >=300s discard (wired in P2).
 */

/**
 * @param {boolean} [override] — explicit override for tests
 */
export function isLearningTimeFairnessV1Enabled(override) {
  if (override === true) return true;
  if (override === false) return false;
  if (typeof process !== "undefined" && process.env) {
    return process.env.NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1 === "true";
  }
  return false;
}
