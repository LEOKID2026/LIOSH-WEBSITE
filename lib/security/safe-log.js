/**
 * Safe server logging helpers — redact secrets and PII from structured logs.
 */

const REDACT_KEYS = new Set([
  "authorization",
  "cookie",
  "cookies",
  "pin",
  "password",
  "token",
  "session_token",
  "sessiontoken",
  "access_code",
  "accesscode",
  "code",
  "service_role",
  "servicerolekey",
  "api_key",
  "apikey",
  "utterance",
  "payload",
  "body",
  "secret",
  "bearer",
  "session",
  "pin_hash",
  "code_hash",
  "session_token_hash",
  "login_username",
]);

/** camelCase / kebab-case → snake-ish lowercase for matching */
export function normalizeLogKey(key) {
  return String(key || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toLowerCase();
}

export function isSensitiveLogKey(key) {
  const k = normalizeLogKey(key);
  if (REDACT_KEYS.has(k)) return true;
  if (k.includes("secret")) return true;
  if (k.includes("password")) return true;
  if (k.includes("token")) return true;
  if (k.includes("pin")) return true;
  if (k.includes("authorization")) return true;
  if (k.includes("cookie")) return true;
  if (k.endsWith("_key") || k.endsWith("key") && k.includes("api")) return true;
  if (k === "code" || k.endsWith("_code")) return true;
  return false;
}

export function redactLogValue(key, value) {
  if (isSensitiveLogKey(key)) return "[redacted]";
  return value;
}

export function safeLogObject(input) {
  if (input == null) return input;
  if (Array.isArray(input)) {
    return input.map((item) => safeLogObject(item));
  }
  if (typeof input !== "object") return input;

  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (isSensitiveLogKey(key)) {
      out[key] = "[redacted]";
      continue;
    }
    if (value && typeof value === "object") {
      out[key] = safeLogObject(value);
      continue;
    }
    out[key] = value;
  }
  return out;
}

export function safeApiLog(label, fields = {}) {
  try {
    console.info(label, safeLogObject(fields));
  } catch {
    console.info(label);
  }
}
