/**
 * Subject-page monthly persistence view (Phase 2.8) — read-only, Israel month.
 * Tier amounts from economyConfig (Admin/DB).
 */

/** Coin labels matching existing subject lobby 4-box design (fallback by index). */
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

function resolveHighestTier(activeMinutes, tiers) {
  const minutes = Number(activeMinutes);
  if (!Array.isArray(tiers) || !tiers.length || !Number.isFinite(minutes)) return null;
  const minThreshold = tiers[0]?.minutes ?? 0;
  if (minutes < minThreshold) return null;
  let tier = null;
  for (const t of tiers) {
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
 * @param {Record<string, unknown> | null | undefined} economyConfig
 */
export function buildSubjectMonthlyPersistenceView(derived, monthlyPersistenceStatus, economyConfig) {
  const monthlyTiers = Array.isArray(economyConfig?.monthlyTiers) ? economyConfig.monthlyTiers : [];
  if (!monthlyTiers.length) return null;

  const currentMinutes = Math.round(
    n(derived?.monthlyMinutesIsraelMonth ?? derived?.monthlyMinutesUtcMonth) * 100
  ) / 100;
  const yearMonthIsrael =
    derived?.yearMonthIsrael != null
      ? String(derived.yearMonthIsrael)
      : derived?.yearMonthUtc != null
        ? String(derived.yearMonthUtc)
        : "";

  const goalMinutes =
    economyConfig?.goalMinutes != null ? Number(economyConfig.goalMinutes) : monthlyTiers[monthlyTiers.length - 1]?.minutes ?? null;
  const progressPct =
    goalMinutes != null && goalMinutes > 0
      ? Math.min(100, Math.round((currentMinutes / goalMinutes) * 100))
      : null;
  const minutesRemaining =
    goalMinutes != null ? Math.max(0, Math.round(goalMinutes - currentMinutes)) : null;

  const alreadyPaid = n(monthlyPersistenceStatus?.alreadyPaid);
  const alreadyAwarded = Boolean(monthlyPersistenceStatus?.alreadyAwarded);
  const awardedTierMinutes =
    monthlyPersistenceStatus?.tierMinutes != null ? Number(monthlyPersistenceStatus.tierMinutes) : null;
  const awardedCoins =
    monthlyPersistenceStatus?.alreadyPaid != null
      ? Number(monthlyPersistenceStatus.alreadyPaid)
      : monthlyPersistenceStatus?.wouldAward != null
        ? Number(monthlyPersistenceStatus.wouldAward)
        : 0;

  const tiersStatusByMinutes = new Map(
    (Array.isArray(monthlyPersistenceStatus?.tiersStatus)
      ? monthlyPersistenceStatus.tiersStatus
      : []
    ).map((row) => [Number(row.minutes), row])
  );

  const highestReached = resolveHighestTier(currentMinutes, monthlyTiers);

  const tiers = monthlyTiers.map((tier) => {
    const label = `${tier.coins.toLocaleString("he-IL")} מטבעות`;
    const statusRow = tiersStatusByMinutes.get(tier.minutes);
    /** @type {TierVisualState} */
    let state = "locked";
    if (statusRow?.awarded === true) {
      state = "awarded";
    } else if (statusRow?.reached === true || currentMinutes >= tier.minutes) {
      state = statusRow?.awarded === false && alreadyPaid >= tier.coins ? "awarded" : "reached";
      if (alreadyPaid >= tier.coins && currentMinutes >= tier.minutes) {
        state = "awarded";
      }
    }
    const isAwardedBox = state === "awarded";
    return {
      minutes: tier.minutes,
      coins: tier.coins,
      label,
      state,
      isAwardedBox,
    };
  });

  const nextTierObj = monthlyTiers.find((t) => currentMinutes < t.minutes) ?? null;
  const progressToNextTierPct = nextTierObj
    ? Math.min(100, Math.round((currentMinutes / nextTierObj.minutes) * 100))
    : 100;

  let encouragementHe;
  if (alreadyAwarded && awardedTierMinutes != null) {
    encouragementHe = "קיבלת את פרס ההתמדה החודשי! כל הכבוד!";
  } else if (highestReached && currentMinutes >= (monthlyTiers[0]?.minutes ?? 0)) {
    encouragementHe = `הגעת ל-${highestReached.minutes} דקות - פרס ${highestReached.coins.toLocaleString("he-IL")} מטבעות ממתין`;
  } else if (minutesRemaining != null && minutesRemaining > 0) {
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
    alreadyPaid,
    highestReachedTierMinutes: highestReached?.minutes ?? null,
    nextTier: nextTierObj,
    progressToNextTierPct,
  };
}

/**
 * @param {import("./studentLearningProfileClient.js").StudentLearningProfileResponse | null | undefined} profile
 */
export function buildSubjectMonthlyPersistenceViewFromProfile(profile) {
  if (!profile?.derived || !profile?.economyConfig) return null;
  return buildSubjectMonthlyPersistenceView(
    profile.derived,
    profile.monthlyPersistenceStatus,
    profile.economyConfig
  );
}
