import { safeApiLog } from "../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../lib/security/same-origin.js";
import { clientIpFromRequest, consumeRateLimit } from "../../../lib/security/in-memory-rate-limit.js";
import {
  parseTeacherRegistrationBody,
  submitTeacherRegistrationRequest,
} from "../../../lib/auth/auth-registration-request.server.js";
import { getTeacherPortalServiceRole } from "../../../lib/teacher-server/teacher-session.server.js";

function sendRegistrationApiError(res, status, code) {
  return res.status(status).json({ error: { code, message: code } });
}

function rejectIfRegistrationRateLimited(req, res) {
  const ip = clientIpFromRequest(req);
  const rl = consumeRateLimit({
    namespace: "registration_request_1h",
    keys: [`ip:${ip}`],
    maxAttempts: 10,
    windowMs: 3_600_000,
  });
  if (!rl.allowed) {
    if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
    sendRegistrationApiError(res, 429, "rate_limited");
    return true;
  }
  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendRegistrationApiError(res, 405, "method_not_allowed");
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;
  if (rejectIfRegistrationRateLimited(req, res)) return undefined;

  const parsed = parseTeacherRegistrationBody(req.body);
  if (!parsed.ok) {
    return sendRegistrationApiError(res, 400, parsed.code);
  }

  try {
    const serviceRole = getTeacherPortalServiceRole();
    const result = await submitTeacherRegistrationRequest(serviceRole, parsed.payload);

    if (!result.ok) {
      if (result.code === "request_already_pending") {
        return sendRegistrationApiError(res, 409, "request_already_pending");
      }
      if (result.code === "entitlement_exists") {
        return res.status(201).json({ data: { submitted: true } });
      }
      return sendRegistrationApiError(res, result.status || 500, result.code || "internal_error");
    }

    return res.status(201).json({ data: { submitted: true } });
  } catch (_e) {
    safeApiLog("teacher_registration_request_error", {});
    return sendRegistrationApiError(res, 500, "internal_error");
  }
}
