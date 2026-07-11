/** @typedef {'default' | 'hard' | 'long_reading' | 'legacy_game'} LearningTimeCreditTier */

import {
  LEARNING_UNIT_CREDIT_CAP_MS,
  MAX_LEARNING_SESSION_CREDITED_MS,
  creditedMsToSessionDurationSeconds,
  capSessionCreditedMs,
} from "../../lib/learning/learning-time-credit-policy.js";

/** @deprecated כל ה-tiers משתמשים בתקרה אחידה של 10 דקות */
export const TIER_DEFAULT_MS = LEARNING_UNIT_CREDIT_CAP_MS;
export const TIER_HARD_MS = LEARNING_UNIT_CREDIT_CAP_MS;
export const TIER_LONG_READING_MS = LEARNING_UNIT_CREDIT_CAP_MS;
export const TIER_LEGACY_GAME_MS = LEARNING_UNIT_CREDIT_CAP_MS;
export const TIER_LEGACY_LEARNING_MS = LEARNING_UNIT_CREDIT_CAP_MS;

/** Pre-fairness: topic localStorage skipped when raw duration >= this (seconds). */
export const LEGACY_TOPIC_MAX_EXCLUSIVE_SEC = 300;

export const SESSION_MAX_CREDITED_MS = MAX_LEARNING_SESSION_CREDITED_MS;

/** @deprecated — מדיניות נדיבה: אין הקפאה בגלל טאב מוסתר */
export const VISIBILITY_STALE_MS = 1_800_000;

/** @type {Record<LearningTimeCreditTier, number>} */
export const TIER_CAP_MS = {
  default: LEARNING_UNIT_CREDIT_CAP_MS,
  hard: LEARNING_UNIT_CREDIT_CAP_MS,
  long_reading: LEARNING_UNIT_CREDIT_CAP_MS,
  legacy_game: LEARNING_UNIT_CREDIT_CAP_MS,
};

/**
 * תקרה אחידה לכל סוגי השאלות והמצבים הלימודיים.
 * @param {LearningTimeCreditTier} _tier
 * @param {boolean} [_fairnessEnabled]
 */
export function resolveTierCapMs(_tier, _fairnessEnabled = true) {
  return LEARNING_UNIT_CREDIT_CAP_MS;
}

export { capSessionCreditedMs, creditedMsToSessionDurationSeconds as sessionCreditedMsToDurationSeconds };
