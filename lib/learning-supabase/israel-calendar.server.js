/**
 * Asia/Jerusalem calendar helpers — single source of truth for student-facing date/time logic.
 *
 * Owner decision (2026-05-22): All student-facing daily/monthly resets (caps, missions,
 * streaks, monthly progress display) must use Asia/Jerusalem — never UTC midnight or
 * UTC calendar month boundaries.
 *
 * Israel is UTC+2 (standard time) or UTC+3 (DST). These helpers handle both correctly.
 */

const ISRAEL_TZ = "Asia/Jerusalem";

function parseIsraelOffsetMs(referenceDate) {
  const offsetPart =
    new Intl.DateTimeFormat("en", {
      timeZone: ISRAEL_TZ,
      timeZoneName: "shortOffset",
    })
      .formatToParts(referenceDate)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT+3";

  const m = offsetPart.match(/GMT([+-])(\d+)(?::(\d+))?/);
  const sign = m?.[1] === "-" ? -1 : 1;
  const offsetHours = m ? Number(m[2]) : 3;
  const offsetMinutes = m?.[3] ? Number(m[3]) : 0;
  return sign * (offsetHours * 60 + offsetMinutes) * 60_000;
}

/**
 * Today's calendar date in Asia/Jerusalem, formatted "YYYY-MM-DD".
 * @param {Date} [referenceDate]
 */
export function getIsraelDateString(referenceDate = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ISRAEL_TZ }).format(referenceDate);
}

/**
 * UTC instant corresponding to 00:00:00 on a given Israel calendar date ("YYYY-MM-DD").
 * Uses DST offset valid on that date.
 * @param {string} israelDateStr
 */
export function getIsraelMidnightUtc(israelDateStr) {
  const ref = new Date(israelDateStr + "T12:00:00Z");
  const offsetMs = parseIsraelOffsetMs(ref);
  return new Date(new Date(israelDateStr + "T00:00:00Z").getTime() - offsetMs);
}

/** UTC instant of today's midnight in Asia/Jerusalem. */
export function getTodayIsraelMidnightUtc() {
  return getIsraelMidnightUtc(getIsraelDateString());
}

/**
 * Bounds of the current calendar month in Asia/Jerusalem.
 * @param {Date} [referenceDate]
 * @returns {{ startIso: string, endIso: string, ym: string }}
 *   startIso — inclusive UTC instant of Israel month start
 *   endIso   — exclusive UTC instant of next Israel month start
 *   ym       - "YYYY-MM" in Israel timezone
 */
export function getIsraelMonthBounds(referenceDate = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: ISRAEL_TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(referenceDate);

  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const ym = `${year}-${month}`;
  const firstDay = `${year}-${month}-01`;

  const monthNum = parseInt(month, 10);
  const nextYear = monthNum === 12 ? String(parseInt(year, 10) + 1) : year;
  const nextMonth = monthNum === 12 ? "01" : String(monthNum + 1).padStart(2, "0");
  const nextFirstDay = `${nextYear}-${nextMonth}-01`;

  return {
    startIso: getIsraelMidnightUtc(firstDay).toISOString(),
    endIso: getIsraelMidnightUtc(nextFirstDay).toISOString(),
    ym,
  };
}

/**
 * Returns true if an ISO timestamp falls within the current Israel calendar month.
 * @param {string} isoTimestamp
 * @param {Date} [referenceDate]
 */
export function isInCurrentIsraelMonth(isoTimestamp, referenceDate = new Date()) {
  if (!isoTimestamp) return false;
  const { startIso, endIso } = getIsraelMonthBounds(referenceDate);
  const ts = String(isoTimestamp);
  return ts >= startIso && ts < endIso;
}

/**
 * Previous calendar month in Asia/Jerusalem as "YYYY-MM".
 * @param {Date} [referenceDate]
 */
export function getPreviousIsraelYearMonth(referenceDate = new Date()) {
  const { startIso } = getIsraelMonthBounds(referenceDate);
  const prevRef = new Date(new Date(startIso).getTime() - 1);
  return getIsraelMonthBounds(prevRef).ym;
}

/**
 * True on the first Israel calendar day of a month (for scheduled award jobs).
 * @param {Date} [referenceDate]
 */
export function isFirstIsraelCalendarDay(referenceDate = new Date()) {
  const day = parseInt(getIsraelDateString(referenceDate).slice(8, 10), 10);
  return day === 1;
}

/**
 * Bounds for a specific Israel calendar month ("YYYY-MM").
 * @param {string} ym - e.g. "2026-05"
 * @returns {{ startIso: string, endIso: string, ym: string }}
 */
export function getIsraelMonthBoundsForYearMonth(ym) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(ym || "").trim());
  if (!m) {
    throw new Error("invalid_year_month");
  }
  const year = m[1];
  const month = m[2];
  const monthNum = parseInt(month, 10);
  if (monthNum < 1 || monthNum > 12) {
    throw new Error("invalid_year_month");
  }

  const firstDay = `${year}-${month}-01`;
  const nextYear = monthNum === 12 ? String(parseInt(year, 10) + 1) : year;
  const nextMonth = monthNum === 12 ? "01" : String(monthNum + 1).padStart(2, "0");
  const nextFirstDay = `${nextYear}-${nextMonth}-01`;

  return {
    startIso: getIsraelMidnightUtc(firstDay).toISOString(),
    endIso: getIsraelMidnightUtc(nextFirstDay).toISOString(),
    ym: `${year}-${month}`,
  };
}
