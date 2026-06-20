/**
 * Card rewards + coin economy feature flags (fail-closed).
 *
 * Economy policy (single source of truth):
 * - Production requires REWARD_ECONOMY_SETTINGS_ENABLED=true.
 * - When disabled or DB incomplete → unavailable (see economy-config.server.js).
 * - Legacy hardcoded values are never used at runtime.
 */

export function isCardRewardsEnabled() {
  return process.env.CARD_REWARDS_ENABLED === "true";
}

export function isRewardEconomySettingsEnabled() {
  return process.env.REWARD_ECONOMY_SETTINGS_ENABLED === "true";
}

/**
 * Legacy economy from code is never allowed at runtime (seed/migration only).
 * @returns {false}
 */
export function isLegacyEconomyRuntimeAllowed() {
  return false;
}

/** Admin rewards UI when either subsystem is enabled for build/ops. */
export function isRewardsAdminEnabled() {
  return isCardRewardsEnabled() || isRewardEconomySettingsEnabled();
}

export function cardRewardsFeatureDisabledResponse() {
  return { ok: false, error: "feature_disabled" };
}

/**
 * HTTP-style body when economy is unavailable (flag off or config missing).
 * @param {string} [code]
 * @param {string} [messageHe]
 */
export function economyFeatureUnavailableResponse(
  code = "economy_unavailable",
  messageHe = "כלכלת המטבעות אינה זמינה כרגע"
) {
  return {
    ok: false,
    error: code,
    messageHe,
    unavailable: true,
  };
}
