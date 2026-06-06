/**
 * Phase 5 — book reading dwell thresholds and credit policy (pure functions).
 */

export const VIEW_THRESHOLD_MS = 2_000;
export const PAGE_READ_THRESHOLD_MS = 10_000;
export const PAGE_CREDIT_CAP_MS = 600_000;
export const SESSION_CREDIT_CAP_MS = 3_600_000;

/**
 * @param {number} ms
 */
export function clampNonNegativeMs(ms) {
  const n = Math.floor(Number(ms));
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/**
 * Section technically viewed vs skipped (2s threshold only).
 * @param {number} visibleDwellMs
 */
export function isSectionViewed(visibleDwellMs) {
  return clampNonNegativeMs(visibleDwellMs) >= VIEW_THRESHOLD_MS;
}

/**
 * @param {number} visibleDwellMs sum of credited visible section dwell on page
 */
export function isPageRead(visibleDwellMs) {
  return clampNonNegativeMs(visibleDwellMs) >= PAGE_READ_THRESHOLD_MS;
}

/**
 * Credited page dwell — capped; raw must be stored separately.
 * @param {number} visibleDwellMs
 */
export function applyPageCreditCap(visibleDwellMs) {
  return Math.min(clampNonNegativeMs(visibleDwellMs), PAGE_CREDIT_CAP_MS);
}

/**
 * @param {number} creditedPageTotalMs
 */
export function applySessionCreditCap(creditedPageTotalMs) {
  return Math.min(clampNonNegativeMs(creditedPageTotalMs), SESSION_CREDIT_CAP_MS);
}

/**
 * @param {number} rawDwellMs
 * @param {number} hiddenTabMs
 */
export function computeVisibleDwellMs(rawDwellMs, hiddenTabMs) {
  return Math.max(0, clampNonNegativeMs(rawDwellMs) - clampNonNegativeMs(hiddenTabMs));
}

/**
 * Full page credit computation from raw + hidden tab time.
 * @param {number} rawDwellMs
 * @param {number} hiddenTabMs
 */
export function computePageCreditedDwellMs(rawDwellMs, hiddenTabMs) {
  const visible = computeVisibleDwellMs(rawDwellMs, hiddenTabMs);
  return applyPageCreditCap(visible);
}

/**
 * @param {number} creditedDwellMs
 */
export function computeBookReadingMinutes(creditedDwellMs) {
  return Number((clampNonNegativeMs(creditedDwellMs) / 60_000).toFixed(2));
}

/**
 * Server-side feature flag (also used in tests).
 */
export function isLearningBookTrackingEnabledServer() {
  return process.env.LEARNING_BOOK_TRACKING_ENABLED !== "false";
}
