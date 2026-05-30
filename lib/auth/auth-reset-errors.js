import {
  AUTH_RESET_PASSWORD_ERROR_EXPIRED,
  AUTH_RESET_PASSWORD_ERROR_GENERIC,
  AUTH_RESET_PASSWORD_ERROR_NETWORK,
  AUTH_RESET_PASSWORD_ERROR_NO_SESSION,
  AUTH_RESET_PASSWORD_ERROR_SAME,
  AUTH_RESET_PASSWORD_ERROR_WEAK,
} from "./auth-reset.he.js";

export function sanitizeAuthErrorForLog(error) {
  if (!error) return null;
  return {
    message: String(error.message || ""),
    status: error.status ?? null,
    name: String(error.name || ""),
  };
}

export function mapSupabasePasswordUpdateErrorHe(error, { hasRecoverySession = true } = {}) {
  if (!error) {
    return AUTH_RESET_PASSWORD_ERROR_GENERIC;
  }

  const message = String(error.message || "");
  const msg = message.toLowerCase();
  const status = error.status ?? null;
  const name = String(error.name || "");

  if (!hasRecoverySession) {
    return AUTH_RESET_PASSWORD_ERROR_NO_SESSION;
  }

  if (
    msg.includes("code verifier") ||
    (msg.includes("auth code") && msg.includes("non-empty")) ||
    msg.includes("both auth code")
  ) {
    return AUTH_RESET_PASSWORD_ERROR_EXPIRED;
  }

  if (
    status === 401 ||
    msg.includes("auth session missing") ||
    msg.includes("session not found") ||
    (msg.includes("jwt") && (msg.includes("invalid") || msg.includes("expired"))) ||
    (msg.includes("session") && msg.includes("missing"))
  ) {
    return AUTH_RESET_PASSWORD_ERROR_NO_SESSION;
  }

  if (
    msg.includes("expired") ||
    msg.includes("otp_expired") ||
    msg.includes("already been used") ||
    msg.includes("invalid refresh token") ||
    (msg.includes("invalid") &&
      (msg.includes("token") || msg.includes("link") || msg.includes("code") || msg.includes("grant")))
  ) {
    return AUTH_RESET_PASSWORD_ERROR_EXPIRED;
  }

  if (
    msg.includes("password") &&
    (msg.includes("weak") ||
      msg.includes("short") ||
      msg.includes("least") ||
      msg.includes("characters") ||
      msg.includes("too small") ||
      msg.includes("minimum"))
  ) {
    return AUTH_RESET_PASSWORD_ERROR_WEAK;
  }

  if (
    (msg.includes("same") && msg.includes("password")) ||
    msg.includes("different from the old") ||
    msg.includes("should be different")
  ) {
    return AUTH_RESET_PASSWORD_ERROR_SAME;
  }

  if (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("failed to fetch") ||
    msg.includes("timeout") ||
    name === "AuthRetryableFetchError"
  ) {
    return AUTH_RESET_PASSWORD_ERROR_NETWORK;
  }

  return AUTH_RESET_PASSWORD_ERROR_GENERIC;
}

export function mapRecoveryEstablishErrorHe(error) {
  if (!error) {
    return AUTH_RESET_PASSWORD_ERROR_EXPIRED;
  }
  const msg = String(error.message || "").toLowerCase();
  if (
    msg.includes("code verifier") ||
    (msg.includes("auth code") && msg.includes("non-empty")) ||
    msg.includes("both auth code")
  ) {
    return AUTH_RESET_PASSWORD_ERROR_EXPIRED;
  }
  const mapped = mapSupabasePasswordUpdateErrorHe(error, { hasRecoverySession: false });
  if (mapped === AUTH_RESET_PASSWORD_ERROR_NO_SESSION) {
    return AUTH_RESET_PASSWORD_ERROR_EXPIRED;
  }
  return mapped;
}
