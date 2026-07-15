/**
 * API guard helpers for rewards routes.
 */

import {
  isCardRewardsEnabled,
  isRewardsAdminEnabled,
  isRewardEconomySettingsEnabled,
  cardRewardsFeatureDisabledResponse,
  economyFeatureUnavailableResponse,
} from "./reward-feature-flags.js";

export function guardCardRewardsApi(res) {
  if (!isCardRewardsEnabled()) {
    res.status(404).json(cardRewardsFeatureDisabledResponse());
    return false;
  }
  return true;
}

export function guardRewardsAdminApi(res) {
  if (!isRewardsAdminEnabled()) {
    res.status(404).json({ ok: false, error: "feature_disabled" });
    return false;
  }
  return true;
}

/**
 * Economy flag must be on — never fall back to legacy/code defaults.
 * @param {import("http").ServerResponse} res
 */
export function guardEconomyAvailable(res) {
  if (!isRewardEconomySettingsEnabled()) {
    res.status(503).json(
      economyFeatureUnavailableResponse(
        "economy_disabled",
        "כלכלת המטבעות כבויה - נדרש REWARD_ECONOMY_SETTINGS_ENABLED=true"
      )
    );
    return false;
  }
  return true;
}
