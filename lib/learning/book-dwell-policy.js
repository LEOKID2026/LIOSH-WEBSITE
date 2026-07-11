/**
 * Phase 5 — book reading dwell thresholds and credit policy (מפנה למקור אמת מרכזי).
 */

import {
  LEARNING_UNIT_CREDIT_CAP_MS,
  creditLearningUnitMs,
} from "./learning-time-credit-policy.js";

export const VIEW_THRESHOLD_MS = 2_000;
export const PAGE_READ_THRESHOLD_MS = 10_000;
/** תקרת זמן מזוכה לעמוד ספר — 10 דקות */
export const PAGE_CREDIT_CAP_MS = LEARNING_UNIT_CREDIT_CAP_MS;
/** תקרת סשן קריאה — 60 דקות מזוכות (סכום עמודים) */
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
 * @param {number} visibleDwellMs
 */
export function isSectionViewed(visibleDwellMs) {
  return clampNonNegativeMs(visibleDwellMs) >= VIEW_THRESHOLD_MS;
}

/**
 * @param {number} visibleDwellMs
 */
export function isPageRead(visibleDwellMs) {
  return clampNonNegativeMs(visibleDwellMs) >= PAGE_READ_THRESHOLD_MS;
}

/**
 * @param {number} visibleDwellMs
 */
export function applyPageCreditCap(visibleDwellMs) {
  return creditLearningUnitMs(visibleDwellMs);
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

export function isLearningBookTrackingEnabledServer() {
  return process.env.LEARNING_BOOK_TRACKING_ENABLED !== "false";
}
