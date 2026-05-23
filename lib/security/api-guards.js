import { rejectIfProductionApi } from "./production-guard.js";
import { rejectIfCrossOriginCookieMutation } from "./same-origin.js";

export { rejectIfProductionApi, rejectIfCrossOriginCookieMutation };

/**
 * Dev-only API route: 404 in production.
 * @returns {boolean} true when rejected
 */
export function guardDevOnlyApiRoute(req, res) {
  return rejectIfProductionApi(res);
}

/**
 * Cookie-session mutating API route: reject cross-origin browser posts in production.
 * @returns {boolean} true when rejected
 */
export function guardCookieMutationOrigin(req, res) {
  return rejectIfCrossOriginCookieMutation(req, res);
}
