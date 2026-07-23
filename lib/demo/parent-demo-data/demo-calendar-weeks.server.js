/**
 * Shared calendar-week buckets for demo time generators.
 */
import { iterateYmdInclusive } from "./israel-date.server.js";

/**
 * Split [fromYmd, toYmd] into week buckets (Sun–Sat slices clipped to range).
 * @param {string} fromYmd
 * @param {string} toYmd
 * @returns {Array<{ weekIndex: number, days: string[] }>}
 */
export function demoCalendarWeekBuckets(fromYmd, toYmd) {
  const days = [...iterateYmdInclusive(fromYmd, toYmd)];
  if (!days.length) return [];

  /** @type {Array<{ weekIndex: number, days: string[] }>} */
  const buckets = [];
  /** @type {string[]} */
  let current = [];
  let weekIndex = 0;

  for (const ymd of days) {
    const dow = new Date(`${ymd}T12:00:00.000Z`).getUTCDay();
    if (current.length > 0 && dow === 0) {
      buckets.push({ weekIndex, days: current });
      weekIndex += 1;
      current = [];
    }
    current.push(ymd);
  }
  if (current.length) buckets.push({ weekIndex, days: current });
  return buckets;
}
