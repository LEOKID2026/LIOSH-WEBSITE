import { timingSafeCompareStrings } from "./timing-safe-equal.js";

/**
 * Validate admin header token against ENGINE_REVIEW_ADMIN_TOKEN (read-only; no rotation).
 * @returns {{ ok: true } | { ok: false, status: number, code: string, error: string }}
 */
export function validateEngineReviewAdminToken(req, headerNames = ["x-engine-review-token", "x-admin-token"]) {
  const expectedRaw = process.env.ENGINE_REVIEW_ADMIN_TOKEN;
  const expected = typeof expectedRaw === "string" ? expectedRaw.trim() : "";

  let sent = "";
  for (const name of headerNames) {
    const raw = req.headers[name];
    if (typeof raw === "string" && raw.trim()) {
      sent = raw.trim();
      break;
    }
  }

  if (!expected) {
    return {
      ok: false,
      status: 503,
      code: "missing_token",
      error: "ENGINE_REVIEW_ADMIN_TOKEN is not configured",
    };
  }
  if (!sent) {
    return {
      ok: false,
      status: 401,
      code: "missing_token",
      error: "Missing admin token header",
    };
  }
  if (!timingSafeCompareStrings(sent, expected)) {
    return {
      ok: false,
      status: 401,
      code: "invalid_token",
      error: "Admin token does not match server configuration",
    };
  }
  return { ok: true };
}
