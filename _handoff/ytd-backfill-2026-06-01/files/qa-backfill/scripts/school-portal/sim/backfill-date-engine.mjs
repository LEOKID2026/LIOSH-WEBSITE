/**
 * Israeli school calendar helpers for backfill simulation.
 */
import { START_DATE } from "./school-sim-config.mjs";

export function parseIsoDate(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error(`Invalid ISO date: ${iso}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
}

export function isoDateString(date) {
  const d = date instanceof Date ? date : parseIsoDate(date);
  return d.toISOString().slice(0, 10);
}

export function addCalendarDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function isWeekend(date) {
  const dow = date.getUTCDay();
  return dow === 5 || dow === 6;
}

export function isSchoolDay(date, { skipWeekends = true } = {}) {
  if (!skipWeekends) return true;
  return !isWeekend(date);
}

/**
 * Expand inclusive calendar range into school-day Date objects.
 */
export function expandDateRange(fromIso, toIso, { skipWeekends = true } = {}) {
  const from = parseIsoDate(fromIso);
  const to = parseIsoDate(toIso);
  if (from > to) throw new Error(`from (${fromIso}) must be <= to (${toIso})`);
  const out = [];
  for (let d = new Date(from); d <= to; d = addCalendarDays(d, 1)) {
    if (isSchoolDay(d, { skipWeekends })) out.push(new Date(d));
  }
  return out;
}

/**
 * Count school days from startDate (inclusive) through targetDate (inclusive).
 */
export function calendarDateToSchoolDay(dateInput, startDate = START_DATE) {
  const target = dateInput instanceof Date ? dateInput : parseIsoDate(dateInput);
  const start = parseIsoDate(startDate);
  if (target < start) return 0;
  let day = 0;
  for (let d = new Date(start); d <= target; d = addCalendarDays(d, 1)) {
    if (isSchoolDay(d)) day += 1;
  }
  return day;
}

export function resolveToDate(fromIso, { to, days }) {
  if (to) return to;
  if (days != null) {
    const n = Number(days);
    if (!Number.isFinite(n) || n < 1) throw new Error("--days must be a positive integer");
    return isoDateString(addCalendarDays(parseIsoDate(fromIso), n - 1));
  }
  throw new Error("Either --to or --days is required");
}

/** Sunday of the week containing date (UTC). */
export function weekStartSunday(dateInput) {
  const d = dateInput instanceof Date ? new Date(dateInput) : parseIsoDate(dateInput);
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - dow);
  return isoDateString(d);
}

export function monthKey(dateInput) {
  const iso = dateInput instanceof Date ? isoDateString(dateInput) : dateInput;
  return iso.slice(0, 7);
}

export function slotTimestamp(simulatedDateIso, slotHour, perQuestionSeconds = 0) {
  const d = parseIsoDate(simulatedDateIso);
  d.setUTCHours(7 + slotHour, 30 + ((slotHour * 7) % 30), perQuestionSeconds, 0);
  return d.toISOString();
}

export function eveningTimestamp(simulatedDateIso, studentIndex, questionIndex = 0) {
  const d = parseIsoDate(simulatedDateIso);
  d.setUTCHours(16 + (studentIndex % 4), Math.floor(studentIndex * 7) % 60, questionIndex * 30, 0);
  return d.toISOString();
}

export function dayRangeIso(iso) {
  return {
    fromIso: `${iso}T00:00:00.000Z`,
    toIso: `${iso}T23:59:59.999Z`,
  };
}
