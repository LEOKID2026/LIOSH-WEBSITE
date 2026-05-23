/**
 * Narrow server-side input bounds for API routes (Wave 2I).
 * No Hebrew copy — callers keep existing error messages.
 */

export const MAX_PARENT_STUDENT_NAME_LEN = 80;
export const MAX_PARENT_GRADE_LEVEL_LEN = 32;
export const MAX_COPILOT_UTTERANCE_LEN = 4000;
export const MAX_HEBREW_NAKDAN_ENTRY_ID_LEN = 128;

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function safeUuid(raw) {
  const s = String(raw || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) {
    return null;
  }
  return s;
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function trimString(raw) {
  return String(raw ?? "").trim();
}

/**
 * Non-persisted fields only (e.g. copilot sessionId clamp). Prefer reject for stored/user-visible values.
 * @param {unknown} raw
 * @param {number} maxLen
 * @returns {string}
 */
export function clampTrimmedString(raw, maxLen) {
  return trimString(raw).slice(0, maxLen);
}

/**
 * Trim and enforce max length without silent truncation.
 * @param {unknown} raw
 * @param {number} maxLen
 * @returns {{ ok: true, value: string } | { ok: false, reason: "empty" | "too_long" }}
 */
export function parseBoundedTrimmedString(raw, maxLen) {
  const value = trimString(raw);
  if (value.length > maxLen) {
    return { ok: false, reason: "too_long" };
  }
  return { ok: true, value };
}
