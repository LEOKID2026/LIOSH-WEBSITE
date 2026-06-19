/**
 * API guard helpers for rewards routes.
 */

import {
  isCardRewardsEnabled,
  isRewardsAdminEnabled,
  cardRewardsFeatureDisabledResponse,
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
