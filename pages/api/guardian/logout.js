import { safeApiLog } from "../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../lib/security/same-origin.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../lib/security/production-guard.js";
import { guardianLogout } from "../../../lib/guardian-server/guardian-login.server.js";
import {
  rejectIfGuardianPortalDisabled,
  sendGuardianApiError,
  clearGuardianSessionCookie,
} from "../../../lib/guardian-server/guardian-session.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendGuardianApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfGuardianPortalDisabled(res)) return undefined;
  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  try {
    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "guardian_logout",
        keys: [`ip:${ip}`],
        maxAttempts: 20,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendGuardianApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    await guardianLogout(req);
    clearGuardianSessionCookie(res);
    return res.status(200).json({ data: { loggedOut: true } });
  } catch (_e) {
    safeApiLog("guardian_logout_error", {});
    return sendGuardianApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
