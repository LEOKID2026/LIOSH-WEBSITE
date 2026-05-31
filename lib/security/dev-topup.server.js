/**
 * Server-only dev coin top-up gate (DEV_TOPUP_ENABLED, DEV_TOPUP_SECRET_CODE).
 * Never expose DEV_TOPUP_SECRET_CODE to the client.
 */

export function isDevTopupApiEnabled() {
  return String(process.env.DEV_TOPUP_ENABLED || "").trim().toLowerCase() === "true";
}

/**
 * @returns {string | null}
 */
export function getDevTopupSecretCode() {
  const raw = process.env.DEV_TOPUP_SECRET_CODE;
  const code = typeof raw === "string" ? raw.trim() : "";
  return code || null;
}

/**
 * @param {import('http').ServerResponse} res
 * @returns {boolean} true when the request was rejected (caller should return)
 */
export function rejectIfDevTopupDisabled(res) {
  if (!isDevTopupApiEnabled() || !getDevTopupSecretCode()) {
    res.status(404).end();
    return true;
  }
  return false;
}
