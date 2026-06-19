/**
 * Card rewards + coin economy feature flags (fail-closed).
 */

export function isCardRewardsEnabled() {
  return process.env.CARD_REWARDS_ENABLED === "true";
}

export function isRewardEconomySettingsEnabled() {
  return process.env.REWARD_ECONOMY_SETTINGS_ENABLED === "true";
}

/** Admin rewards UI when either subsystem is enabled for build/ops. */
export function isRewardsAdminEnabled() {
  return isCardRewardsEnabled() || isRewardEconomySettingsEnabled();
}

export function cardRewardsFeatureDisabledResponse() {
  return { ok: false, error: "feature_disabled" };
}
