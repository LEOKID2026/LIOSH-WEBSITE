/**
 * Subject-page monthly persistence view (Phase 2.8) — read-only, Israel month.
 * Client-safe (no .server imports).
 */

import { MONTHLY_MINUTES_TARGET } from "../../data/reward-options.js";

/** Same tiers as MVP / monthly-persistence-reward.server.js */
const MONTHLY_PERSISTENCE_TIERS = [
  { minutes: 100, coins: 10_000 },
  { minutes: 250, coins: 30_000 },
  { minutes: 400, coins: 60_000 },
  { minutes: 600, coins: 100_000 },
];

/** Coin labels matching existing subject lobby 4-box design. */
export const SUBJECT_MONTHLY_TIER_DISPLAY_LABELS = [
  "10K מטבעות משחק",
  "30K מטבעות משחק",
  "60K מטבעות משחק",
  "100K מטבעות משחק",
];

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function resolveHighestTier(activeMinutes) {
  const minutes = Number(activeMinutes);
  if (!Number.isFinite(minutes) || minutes < 100) return null;
  let tier = null;
  for (const t of MONTHLY_PERSISTENCE_TIERS) {
    if (minutes >= t.minutes) tier = t;
  }
  return tier;
}

/**
 * @typedef {'locked' | 'reached' | 'awarded'} TierVisualState
 */

/**
 * @param {Record<string, unknown> | null | undefined} derived
 * @param {Record<string, unknown> | null | undefined} monthlyPersistenceStatus
 */
export function buildSubjectMonthlyPersistenceView(derived, monthlyPersistenceStatus) {
  const currentMinutes = Math.round(
    n(derived?.monthlyMinutesIsraelMonth ?? derived?.monthlyMinutesUtcMonth) * 100
  ) / 100;
  const yearMonthIsrael =
    derived?.yearMonthIsrael != null
      ? String(derived.yearMonthIsrael)
      : derived?.yearMonthUtc != null
        ? String(derived.yearMonthUtc)
        : "";

  const goalMinutes = MONTHLY_MINUTES_TARGET;
  const progressPct = goalMinutes > 0 ? Math.min(100, Math.round((currentMinutes / goalMinutes) * 100)) : 0;
  const minutesRemaining = Math.max(0, Math.round(goalMinutes - currentMinutes));

  const alreadyAwarded = Boolean(monthlyPersistenceStatus?.alreadyAwarded);
  const awardedTierMinutes =
    monthlyPersistenceStatus?.tierMinutes != null ? Number(monthlyPersistenceStatus.tierMinutes) : null;
  const awardedCoins =
    monthlyPersistenceStatus?.wouldAward != null ? Number(monthlyPersistenceStatus.wouldAward) : 0;

  const highestReached = resolveHighestTier(currentMinutes);

  const tiers = MONTHLY_PERSISTENCE_TIERS.map((tier, idx) => {
    const label = SUBJECT_MONTHLY_TIER_DISPLAY_LABELS[idx] || `${tier.coins.toLocaleString("he-IL")} מטבעות`;
    /** @type {TierVisualState} */
    let state = "locked";
    if (currentMinutes >= tier.minutes) {
      state = alreadyAwarded && awardedTierMinutes != null && tier.minutes <= awardedTierMinutes
        ? "awarded"
        : "reached";
    }
    const isAwardedBox = alreadyAwarded && awardedTierMinutes === tier.minutes;
    return {
      minutes: tier.minutes,
      coins: tier.coins,
      label,
      state,
      isAwardedBox,
    };
  });

  const nextTierObj = MONTHLY_PERSISTENCE_TIERS.find((t) => currentMinutes < t.minutes) ?? null;
  const progressToNextTierPct = nextTierObj
    ? Math.min(100, Math.round((currentMinutes / nextTierObj.minutes) * 100))
    : 100;

  let encouragementHe;
  if (alreadyAwarded && awardedTierMinutes != null) {
    encouragementHe = "קיבלת את פרס ההתמדה החודשי! כל הכבוד!";
  } else if (highestReached && currentMinutes >= 100) {
    encouragementHe = `הגעת ל-${highestReached.minutes} דקות — פרס ${highestReached.coins.toLocaleString("he-IL")} מטבעות ממתין`;
  } else if (minutesRemaining > 0) {
    encouragementHe = `נותרו עוד ${Math.round(minutesRemaining)} דק׳ (~${Math.ceil(Math.round(minutesRemaining) / 60)} ש׳)`;
  } else {
    encouragementHe = "הגעת ליעד החודש! המשיכו ללמוד!";
  }

  return {
    yearMonthIsrael,
    currentMinutes,
    goalMinutes,
    progressPct,
    minutesRemaining,
    encouragementHe,
    tiers,
    alreadyAwarded,
    awardedTierMinutes,
    awardedCoins,
    highestReachedTierMinutes: highestReached?.minutes ?? null,
    nextTier: nextTierObj,
    progressToNextTierPct,
  };
}

/**
 * @param {import("./studentLearningProfileClient.js").StudentLearningProfileResponse | null | undefined} profile
 */
export function buildSubjectMonthlyPersistenceViewFromProfile(profile) {
  if (!profile?.derived) return null;
  return buildSubjectMonthlyPersistenceView(profile.derived, profile.monthlyPersistenceStatus);
}
