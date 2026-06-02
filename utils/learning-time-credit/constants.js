/** @typedef {'default' | 'hard' | 'long_reading' | 'legacy_game'} LearningTimeCreditTier */

export const TIER_DEFAULT_MS = 300_000;
export const TIER_HARD_MS = 480_000;
export const TIER_LONG_READING_MS = 600_000;
export const TIER_LEGACY_GAME_MS = 120_000;

/** Pre-fairness per-question cap (learning/practice when flag off). */
export const TIER_LEGACY_LEARNING_MS = 120_000;

/** Pre-fairness: topic localStorage skipped when raw duration >= this (seconds). */
export const LEGACY_TOPIC_MAX_EXCLUSIVE_SEC = 300;

export const SESSION_MAX_CREDITED_MS = 10_800_000;

/** Hidden longer than this freezes credit until visible again (anti tab-leave farm). */
export const VISIBILITY_STALE_MS = 1_800_000;

/** @type {Record<LearningTimeCreditTier, number>} */
export const TIER_CAP_MS = {
  default: TIER_DEFAULT_MS,
  hard: TIER_HARD_MS,
  long_reading: TIER_LONG_READING_MS,
  legacy_game: TIER_LEGACY_GAME_MS,
};

/**
 * @param {LearningTimeCreditTier} tier
 * @param {boolean} [fairnessEnabled]
 */
export function resolveTierCapMs(tier, fairnessEnabled = true) {
  if (!fairnessEnabled) {
    return TIER_LEGACY_LEARNING_MS;
  }
  return TIER_CAP_MS[tier] ?? TIER_DEFAULT_MS;
}

/**
 * @param {number} sessionMs
 */
export function capSessionCreditedMs(sessionMs) {
  const n = Number(sessionMs);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.floor(n), SESSION_MAX_CREDITED_MS);
}

/**
 * @param {number} sessionMs
 * @returns {number} seconds, minimum 1 when any credit exists (matches master finish guard)
 */
export function sessionCreditedMsToDurationSeconds(sessionMs) {
  const capped = capSessionCreditedMs(sessionMs);
  if (capped <= 0) return 0;
  return Math.max(1, Math.round(capped / 1000));
}
