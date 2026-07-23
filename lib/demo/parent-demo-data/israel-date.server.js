const ISRAEL_TZ = "Asia/Jerusalem";

/**
 * @param {Date} [now]
 * @returns {string} YYYY-MM-DD in Israel
 */
export function todayYmdIsrael(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * @param {string} ymd
 * @returns {boolean}
 */
export function isValidYmd(ymd) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ""));
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareYmd(a, b) {
  return String(a).localeCompare(String(b));
}

/**
 * @param {string} fromYmd
 * @param {string} toYmd
 * @returns {string[]}
 */
export function iterateYmdInclusive(fromYmd, toYmd) {
  if (!isValidYmd(fromYmd) || !isValidYmd(toYmd)) return [];
  if (compareYmd(fromYmd, toYmd) > 0) return [];
  const out = [];
  const cur = new Date(`${fromYmd}T12:00:00`);
  const end = new Date(`${toYmd}T12:00:00`);
  while (cur.getTime() <= end.getTime()) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

/**
 * @param {string} ymd
 * @returns {number} 0=Sun … 6=Sat (Israel calendar day)
 */
export function israelWeekdayIndex(ymd) {
  const d = new Date(`${ymd}T12:00:00+02:00`);
  return d.getUTCDay();
}

export function isIsraelWeekend(ymd) {
  const wd = israelWeekdayIndex(ymd);
  return wd === 5 || wd === 6;
}

/**
 * ISO timestamp for a deterministic hour on an Israel calendar day (UTC storage).
 * @param {string} ymd
 * @param {number} hourLocal 0-23
 * @param {number} minuteLocal 0-59
 */
export function ymdToIsraelIsoUtc(ymd, hourLocal = 10, minuteLocal = 0) {
  const hh = String(hourLocal).padStart(2, "0");
  const mm = String(minuteLocal).padStart(2, "0");
  const probe = new Date(`${ymd}T${hh}:${mm}:00`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ISRAEL_TZ,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(probe);
  const gotH = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const gotM = Number(parts.find((p) => p.type === "minute")?.value || 0);
  const offsetMs = ((gotH - hourLocal) * 60 + (gotM - minuteLocal)) * 60_000;
  return new Date(probe.getTime() - offsetMs).toISOString();
}

/**
 * @param {string} ymd
 * @returns {Date}
 */
export function ymdToUtcDate(ymd) {
  return new Date(`${ymd}T00:00:00.000Z`);
}
