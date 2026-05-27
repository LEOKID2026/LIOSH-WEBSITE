import { safeApiLog } from "../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../lib/security/same-origin.js";
import { clientIpFromRequest } from "../../../lib/security/in-memory-rate-limit.js";
import { guardianLogin } from "../../../lib/guardian-server/guardian-login.server.js";
import { consumeGuardianLoginRateLimit } from "../../../lib/guardian-server/guardian-rate-limit.server.js";
import { normalizeStudentUsername } from "../../../lib/guardian-server/guardian-crypto.server.js";
import {
  isGuardianPortalUiCopyEnabled,
  rejectIfGuardianPortalDisabled,
  sendGuardianApiError,
  setGuardianSessionCookie,
} from "../../../lib/guardian-server/guardian-session.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendGuardianApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfGuardianPortalDisabled(res)) return undefined;
  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  const inviteToken =
    typeof req.query?.invite === "string" && req.query.invite.trim()
      ? req.query.invite.trim()
      : null;

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const loginUsername = body.loginUsername;
  const pin = body.pin;

  const usernameNormalized = loginUsername
    ? normalizeStudentUsername(loginUsername)
    : null;

  const ip = clientIpFromRequest(req);
  const rl = consumeGuardianLoginRateLimit({ ip, usernameNormalized });
  if (!rl.allowed) {
    if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
    return sendGuardianApiError(res, 429, "rate_limited", "Too many requests");
  }

  try {
    const studentId =
      typeof body.studentId === "string" && body.studentId.trim() ? body.studentId.trim() : null;

    const result = await guardianLogin({
      loginUsername,
      pin,
      studentId,
      inviteToken,
      req,
    });

    if (!result.ok) {
      if (result.code === "guardian_multiple_students" && result.data) {
        return res.status(result.status).json({
          error: { code: result.code, message: result.code },
          data: result.data,
        });
      }
      return sendGuardianApiError(res, result.status, result.code, result.code);
    }

    setGuardianSessionCookie(res, result.sessionToken, result.cookieMaxAgeSec);

    const data = {
      ...result.data,
      flags: { uiCopyEnabled: isGuardianPortalUiCopyEnabled() },
    };

    return res.status(200).json({ data });
  } catch (_e) {
    safeApiLog("guardian_login_error", {});
    return sendGuardianApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
