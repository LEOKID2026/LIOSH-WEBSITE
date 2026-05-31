/** Shared report date-range helpers (school / teacher portals). */

export const MAX_REPORT_RANGE_DAYS = 366;
export const DEFAULT_REPORT_RANGE_DAYS = 30;

/**
 * @returns {string} YYYY-MM-DD (UTC calendar day)
 */
export function isoTodayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/**
 * Rolling window ending today (UTC), inclusive both ends.
 * @param {number} days
 * @returns {{ from: string, to: string }}
 */
export function computeReportRangeForDays(days) {
  const n = Math.min(Math.max(1, Number(days) || 1), MAX_REPORT_RANGE_DAYS);
  const toDate = new Date();
  toDate.setUTCHours(0, 0, 0, 0);
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - (n - 1));
  return {
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
  };
}

export function computeDefaultReportRange() {
  return computeReportRangeForDays(DEFAULT_REPORT_RANGE_DAYS);
}

/**
 * @param {string} fromStr YYYY-MM-DD
 * @param {string} toStr YYYY-MM-DD
 * @returns {{ ok: true, from: string, to: string } | { ok: false, code: string, maxDays?: number }}
 */
export function validateCustomReportRange(fromStr, toStr) {
  const from = String(fromStr || "").trim().slice(0, 10);
  const to = String(toStr || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return { ok: false, code: "invalid_format" };
  }
  if (from > to) {
    return { ok: false, code: "order" };
  }
  const today = isoTodayUtc();
  if (to > today) {
    return { ok: false, code: "future_to" };
  }
  const fromMs = Date.parse(`${from}T00:00:00.000Z`);
  const toMs = Date.parse(`${to}T00:00:00.000Z`);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
    return { ok: false, code: "invalid_format" };
  }
  const spanDays = Math.floor((toMs - fromMs) / 86400000) + 1;
  if (spanDays > MAX_REPORT_RANGE_DAYS) {
    return { ok: false, code: "too_long", maxDays: MAX_REPORT_RANGE_DAYS };
  }
  return { ok: true, from, to };
}

/**
 * Append from/to only — never windowDays.
 * @param {URLSearchParams} params
 * @param {{ from: string, to: string }} range
 */
export function appendReportRangeToSearchParams(params, range) {
  const p = params instanceof URLSearchParams ? params : new URLSearchParams(params);
  p.set("from", String(range.from).slice(0, 10));
  p.set("to", String(range.to).slice(0, 10));
  p.delete("windowDays");
  return p;
}

/**
 * @param {string} from YYYY-MM-DD
 * @param {string} to YYYY-MM-DD
 * @returns {string}
 */
export function formatReportRangeDisplayHe(from, to) {
  const fmt = (s) => {
    const parts = String(s || "").slice(0, 10).split("-");
    if (parts.length !== 3) return String(s || "");
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };
  return `${fmt(from)} – ${fmt(to)}`;
}
