import { safeApiLog } from "../security/safe-log.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_NAME_LEN = 80;
const MAX_EMAIL_LEN = 254;
const MAX_SUBJECT_LEN = 120;
const MAX_MESSAGE_LEN = 4000;

/**
 * @param {unknown} body
 * @returns {{ ok: true, payload: { name: string, email: string, subject: string | null, message: string } } | { ok: false, field: string, code: string }}
 */
export function parseContactFormBody(body) {
  const b = body && typeof body === "object" ? body : {};
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const subjectRaw = typeof b.subject === "string" ? b.subject.trim() : "";
  const message = typeof b.message === "string" ? b.message.trim() : "";

  if (!name) {
    return { ok: false, field: "name", code: "validation_failed" };
  }
  if (name.length > MAX_NAME_LEN) {
    return { ok: false, field: "name", code: "validation_failed" };
  }
  if (!email) {
    return { ok: false, field: "email", code: "validation_failed" };
  }
  if (!EMAIL_RE.test(email) || email.length > MAX_EMAIL_LEN) {
    return { ok: false, field: "email", code: "invalid_email" };
  }
  if (subjectRaw.length > MAX_SUBJECT_LEN) {
    return { ok: false, field: "subject", code: "validation_failed" };
  }
  if (!message) {
    return { ok: false, field: "message", code: "validation_failed" };
  }
  if (message.length > MAX_MESSAGE_LEN) {
    return { ok: false, field: "message", code: "validation_failed" };
  }

  return {
    ok: true,
    payload: {
      name,
      email,
      subject: subjectRaw || null,
      message,
    },
  };
}

/**
 * Records a validated submission for ops visibility until email delivery is wired.
 * Does not persist full message content to logs.
 *
 * @param {{ name: string, email: string, subject: string | null, message: string }} payload
 */
export function recordPendingContactSubmission(payload) {
  const emailDomain = payload.email.includes("@") ? payload.email.split("@")[1] : "unknown";
  safeApiLog("contact_form_submission_pending", {
    emailDomain,
    nameLength: payload.name.length,
    subjectLength: payload.subject ? payload.subject.length : 0,
    messageLength: payload.message.length,
  });
}

/**
 * @param {{ name: string, email: string, subject: string | null, message: string }} payload
 * @returns {Promise<{ ok: true, delivered: true } | { ok: false, code: string }>}
 */
export async function submitContactForm(payload) {
  const webhookUrl = String(process.env.CONTACT_FORM_WEBHOOK_URL || "").trim();
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          subject: payload.subject,
          message: payload.message,
          source: "leo-kids-contact-form",
        }),
      });
      if (!res.ok) {
        safeApiLog("contact_form_webhook_failed", { status: res.status });
        return { ok: false, code: "delivery_failed" };
      }
      return { ok: true, delivered: true };
    } catch {
      safeApiLog("contact_form_webhook_error", {});
      return { ok: false, code: "delivery_failed" };
    }
  }

  recordPendingContactSubmission(payload);
  return { ok: false, code: "delivery_not_configured" };
}
