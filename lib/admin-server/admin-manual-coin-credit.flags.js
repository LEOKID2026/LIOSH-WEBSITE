/**
 * Admin manual coin credit feature flag (fail-closed).
 */

export function isAdminManualCoinCreditEnabled() {
  return process.env.ENABLE_ADMIN_MANUAL_COIN_CREDIT === "true";
}

export function adminManualCoinCreditDisabledResponse() {
  return { ok: false, error: "feature_disabled" };
}
