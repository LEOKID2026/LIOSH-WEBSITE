/**
 * Phase 3 — Timing Truth policy (מפנה למקור אמת מרכזי).
 */

import {
  LEARNING_UNIT_CREDIT_CAP_MS,
  creditLearningUnitMs,
  deriveTimingStatus,
} from "./learning-time-credit-policy.js";

export const ASSIGNED_ACTIVITY_CREDIT_CAP_MS = LEARNING_UNIT_CREDIT_CAP_MS;
export const DEFAULT_FREE_PRACTICE_CAP_MS = LEARNING_UNIT_CREDIT_CAP_MS;

export { deriveTimingStatus };

/**
 * @param {number|null} rawMs
 */
export function computeAssignedActivityTiming(rawMs) {
  const cap = ASSIGNED_ACTIVITY_CREDIT_CAP_MS;
  const raw = rawMs != null && Number.isFinite(rawMs) ? Math.max(0, rawMs) : 0;
  const credited = creditLearningUnitMs(raw);
  const timingStatus = deriveTimingStatus(raw, cap);
  const overCreditCap = raw > cap;
  return { rawTimeSpentMs: raw, creditedTimeMs: credited, timingStatus, overCreditCap };
}

/**
 * @param {number|null} rawMs
 * @param {{ creditedMs?: number|null, tierCapMs?: number }} [opts]
 */
export function computeFreePracticeTiming(rawMs, opts = {}) {
  const { creditedMs, tierCapMs = DEFAULT_FREE_PRACTICE_CAP_MS } = opts;

  if (rawMs == null || typeof rawMs !== "number" || rawMs < 0) {
    return {
      rawTimeSpentMs: null,
      creditedTimeMs: null,
      timingStatus: "no_timer",
      overCreditCap: false,
    };
  }

  const raw = Math.max(0, rawMs);
  const credited =
    creditedMs !== undefined && creditedMs !== null
      ? creditLearningUnitMs(creditedMs)
      : creditLearningUnitMs(raw);

  const timingStatus = deriveTimingStatus(raw, tierCapMs);
  const overCreditCap = raw > tierCapMs;
  return { rawTimeSpentMs: raw, creditedTimeMs: credited, timingStatus, overCreditCap };
}
