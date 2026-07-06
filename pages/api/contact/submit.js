import { rejectIfCrossOriginCookieMutation } from "../../../lib/security/same-origin.js";
import { clientIpFromRequest, consumeRateLimit } from "../../../lib/security/in-memory-rate-limit.js";
import { safeApiLog } from "../../../lib/security/safe-log.js";
import {
  parseContactFormBody,
  submitContactForm,
} from "../../../lib/contact/contact-form.server.js";

function sendContactApiError(res, status, code) {
  return res.status(status).json({ ok: false, code });
}

function rejectIfContactRateLimited(req, res) {
  const ip = clientIpFromRequest(req);
  const hourRl = consumeRateLimit({
    namespace: "contact_form_1h",
    keys: [`ip:${ip}`],
    maxAttempts: 5,
    windowMs: 3_600_000,
  });
  if (!hourRl.allowed) {
    if (hourRl.retryAfterSec) res.setHeader("Retry-After", String(hourRl.retryAfterSec));
    sendContactApiError(res, 429, "rate_limited");
    return true;
  }

  const dayRl = consumeRateLimit({
    namespace: "contact_form_24h",
    keys: [`ip:${ip}`],
    maxAttempts: 20,
    windowMs: 86_400_000,
  });
  if (!dayRl.allowed) {
    if (dayRl.retryAfterSec) res.setHeader("Retry-After", String(dayRl.retryAfterSec));
    sendContactApiError(res, 429, "rate_limited");
    return true;
  }

  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendContactApiError(res, 405, "method_not_allowed");
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;
  if (rejectIfContactRateLimited(req, res)) return undefined;

  const parsed = parseContactFormBody(req.body);
  if (!parsed.ok) {
    return sendContactApiError(res, 400, parsed.code === "invalid_email" ? "invalid_email" : "validation_failed");
  }

  try {
    const result = await submitContactForm(parsed.payload);
    if (result.ok && result.delivered) {
      return res.status(200).json({ ok: true, delivered: true });
    }
    if (result.code === "delivery_not_configured") {
      return res.status(503).json({ ok: false, code: "delivery_not_configured" });
    }
    return sendContactApiError(res, 502, result.code || "delivery_failed");
  } catch {
    safeApiLog("contact_form_submit_error", {});
    return sendContactApiError(res, 500, "internal_error");
  }
}
