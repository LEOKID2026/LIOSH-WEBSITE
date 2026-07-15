import { consumeRateLimit, clientIpFromRequest } from "../security/in-memory-rate-limit.js";
import { hashStudentSecret } from "../learning-supabase/student-auth.js";

const GUEST_START_NAMESPACE = "guest_start";
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 12;
const MAX_PER_DEVICE = 8;

const GUEST_START_RATE_LIMIT_HE = "יותר מדי ניסיונות - נסו שוב בעוד כמה דקות.";

function rejectGuestStart(res, retryAfterSec) {
  if (retryAfterSec) {
    res.setHeader("Retry-After", String(retryAfterSec));
  }
  res.status(429).json({ ok: false, error: GUEST_START_RATE_LIMIT_HE, code: "rate_limited" });
  return true;
}

/**
 * Rate limit guest creation — resume path is not limited here (handled in startGuestStudent).
 * @returns {boolean} true when request was rejected
 */
export function rejectIfGuestStartRateLimited(req, res, resumeToken) {
  if (String(resumeToken || "").trim()) {
    return false;
  }

  const ip = clientIpFromRequest(req);
  const deviceId = String(req.body?.deviceId || req.headers["x-guest-device-id"] || "").trim();
  const extraKeys = [];
  if (deviceId) {
    extraKeys.push(`device:${hashStudentSecret(deviceId).slice(0, 24)}`);
  }

  const result = consumeRateLimit({
    namespace: GUEST_START_NAMESPACE,
    keys: [`ip:${ip}`, ...extraKeys],
    maxAttempts: MAX_PER_IP,
    windowMs: WINDOW_MS,
  });

  if (!result.allowed) {
    return rejectGuestStart(res, result.retryAfterSec);
  }
  return false;
}

/**
 * Stricter per-device cap (second pass — only counts device key).
 * @returns {boolean} true when request was rejected
 */
export function rejectIfGuestStartDeviceRateLimited(req, res, resumeToken) {
  if (String(resumeToken || "").trim()) {
    return false;
  }

  const deviceId = String(req.body?.deviceId || req.headers["x-guest-device-id"] || "").trim();
  if (!deviceId) return false;

  const result = consumeRateLimit({
    namespace: `${GUEST_START_NAMESPACE}:device`,
    keys: [`device:${hashStudentSecret(deviceId).slice(0, 24)}`],
    maxAttempts: MAX_PER_DEVICE,
    windowMs: WINDOW_MS,
  });

  if (!result.allowed) {
    return rejectGuestStart(res, result.retryAfterSec);
  }
  return false;
}
