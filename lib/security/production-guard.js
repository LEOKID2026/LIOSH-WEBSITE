/**
 * Production runtime guard for dev-only API surfaces.
 * Uses only NODE_ENV — no custom env flags.
 */

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

/**
 * @param {import('http').ServerResponse} res
 * @returns {boolean} true when the request was rejected (caller should return)
 */
export function rejectIfProductionApi(res) {
  if (!isProductionRuntime()) return false;
  res.status(404).end();
  return true;
}
