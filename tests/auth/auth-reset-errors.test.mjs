#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  mapRecoveryEstablishErrorHe,
  mapSupabasePasswordUpdateErrorHe,
  sanitizeAuthErrorForLog,
} from "../../lib/auth/auth-reset-errors.js";
import {
  AUTH_RESET_PASSWORD_ERROR_EXPIRED,
  AUTH_RESET_PASSWORD_ERROR_GENERIC,
  AUTH_RESET_PASSWORD_ERROR_NETWORK,
  AUTH_RESET_PASSWORD_ERROR_NO_SESSION,
  AUTH_RESET_PASSWORD_ERROR_SAME,
  AUTH_RESET_PASSWORD_ERROR_WEAK,
} from "../../lib/auth/auth-reset.he.js";

function err(message, status = null, name = "AuthApiError") {
  return { message, status, name };
}

assert.deepEqual(sanitizeAuthErrorForLog(err("Auth session missing!", 401)), {
  message: "Auth session missing!",
  status: 401,
  name: "AuthApiError",
});

assert.equal(
  mapSupabasePasswordUpdateErrorHe(err("Auth session missing!", 401), { hasRecoverySession: true }),
  AUTH_RESET_PASSWORD_ERROR_NO_SESSION
);

assert.equal(
  mapSupabasePasswordUpdateErrorHe(err("Auth session missing!", 401), { hasRecoverySession: false }),
  AUTH_RESET_PASSWORD_ERROR_NO_SESSION
);

assert.equal(
  mapRecoveryEstablishErrorHe(
    err("invalid request: both auth code and code verifier should be non-empty", 400)
  ),
  AUTH_RESET_PASSWORD_ERROR_EXPIRED
);

assert.equal(
  mapSupabasePasswordUpdateErrorHe(err("Email link is invalid or has expired", 403), {
    hasRecoverySession: true,
  }),
  AUTH_RESET_PASSWORD_ERROR_EXPIRED
);

assert.equal(
  mapSupabasePasswordUpdateErrorHe(err("Password should be at least 6 characters", 422), {
    hasRecoverySession: true,
  }),
  AUTH_RESET_PASSWORD_ERROR_WEAK
);

assert.equal(
  mapSupabasePasswordUpdateErrorHe(err("New password should be different from the old password.", 422), {
    hasRecoverySession: true,
  }),
  AUTH_RESET_PASSWORD_ERROR_SAME
);

assert.equal(
  mapSupabasePasswordUpdateErrorHe(err("Failed to fetch", null, "AuthRetryableFetchError"), {
    hasRecoverySession: true,
  }),
  AUTH_RESET_PASSWORD_ERROR_NETWORK
);

assert.equal(
  mapSupabasePasswordUpdateErrorHe(err("Something unexpected happened", 500), {
    hasRecoverySession: true,
  }),
  AUTH_RESET_PASSWORD_ERROR_GENERIC
);

assert.equal(
  mapRecoveryEstablishErrorHe(err("Auth session missing!", 401)),
  AUTH_RESET_PASSWORD_ERROR_EXPIRED
);

console.log("auth-reset-errors.test.mjs: all assertions passed");
