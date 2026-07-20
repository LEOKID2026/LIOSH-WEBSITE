/**
 * Israel-timezone daily window helpers for coloring upload AI quotas.
 */

export const COLORING_UPLOAD_AI_USER_DAILY_LIMIT = 10;
export const COLORING_UPLOAD_AI_GLOBAL_DAILY_LIMIT = 200;

const ISRAEL_TZ = "Asia/Jerusalem";

/**
 * @param {Date} [now]
 * @returns {string} YYYY-MM-DD in Israel
 */
export function getIsraelUsageDateKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Next midnight Israel time as ISO string.
 * @param {Date} [now]
 */
export function getIsraelNextMidnightResetAt(now = new Date()) {
  const dateKey = getIsraelUsageDateKey(now);
  const [year, month, day] = dateKey.split("-").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day + 1, 0, 5, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ISRAEL_TZ,
    hour: "numeric",
    hour12: false,
  }).formatToParts(probe);
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const offsetHours = hour >= 12 ? hour - 24 : hour;
  return new Date(Date.UTC(year, month - 1, day + 1, -offsetHours, 0, 0)).toISOString();
}

/**
 * @param {number} used
 * @param {number} limit
 */
export function coloringUploadRemaining(used, limit) {
  return Math.max(0, limit - used);
}
