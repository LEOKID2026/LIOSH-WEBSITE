/**
 * Student login username checks (no Supabase client imports — safe for unit tests).
 */

export function normalizeStudentUsername(raw) {
  return String(raw || "").toLowerCase().trim();
}

/**
 * After access code + PIN match, enforce username contract when the row has login_username.
 * Legacy rows without login_username may still log in via code-only credential.
 *
 * @param {{ usernameNormalized: string, storedLoginUsernameRaw: unknown }} input
 * @returns {{ ok: true } | { ok: false, reason: "username_required" | "username_mismatch" }}
 */
export function validateStudentLoginUsername(input) {
  const usernameNormalized = String(input?.usernameNormalized || "").trim();
  const storedUsername = normalizeStudentUsername(input?.storedLoginUsernameRaw || "");

  if (!storedUsername) {
    return { ok: true };
  }
  if (!usernameNormalized) {
    return { ok: false, reason: "username_required" };
  }
  if (usernameNormalized !== storedUsername) {
    return { ok: false, reason: "username_mismatch" };
  }
  return { ok: true };
}
