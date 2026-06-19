/**
 * Client-side reward flags (NEXT_PUBLIC_* mirrors server flags when exposed).
 */

export function isCardRewardsEnabledClient() {
  return process.env.NEXT_PUBLIC_CARD_REWARDS_ENABLED === "true";
}

export function isRewardEconomySettingsEnabledClient() {
  return process.env.NEXT_PUBLIC_REWARD_ECONOMY_SETTINGS_ENABLED === "true";
}

export function isAdminManualCoinCreditEnabledClient() {
  return process.env.NEXT_PUBLIC_ENABLE_ADMIN_MANUAL_COIN_CREDIT === "true";
}

export function isRewardsAdminEnabledClient() {
  return (
    process.env.NEXT_PUBLIC_CARD_REWARDS_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_REWARD_ECONOMY_SETTINGS_ENABLED === "true" ||
    isAdminManualCoinCreditEnabledClient()
  );
}
