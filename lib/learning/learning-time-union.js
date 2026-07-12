/**
 * Wall-clock union for credited learning time.
 * Parallel tabs/activities/sources must not stack: credit = union(intervals).
 * NO streak / activity / day 10-minute cap after union.
 */

import { creditedMsToRoundedMinutes } from "../learning/learning-time-credit-policy.js";

/**
 * @param {Array<[number, number]>} intervals
 * @returns {{ unionMs: number, merged: Array<[number, number]>, overlapMs: number }}
 */
export function unionTimeIntervalsMs(intervals) {
  const cleaned = [];
  let rawSum = 0;
  for (const pair of intervals || []) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    let s = Number(pair[0]);
    let e = Number(pair[1]);
    if (!Number.isFinite(s) || !Number.isFinite(e)) continue;
    if (e < s) {
      const t = s;
      s = e;
      e = t;
    }
    if (e <= s) continue;
    cleaned.push([s, e]);
    rawSum += e - s;
  }
  cleaned.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (!cleaned.length) return { unionMs: 0, merged: [], overlapMs: 0 };

  const merged = [];
  let [cs, ce] = cleaned[0];
  for (let i = 1; i < cleaned.length; i++) {
    const [s, e] = cleaned[i];
    if (s <= ce) {
      ce = Math.max(ce, e);
    } else {
      merged.push([cs, ce]);
      cs = s;
      ce = e;
    }
  }
  merged.push([cs, ce]);
  const unionMs = merged.reduce((acc, [s, e]) => acc + (e - s), 0);
  return { unionMs, merged, overlapMs: Math.max(0, rawSum - unionMs) };
}

/**
 * @deprecated Do not use for monthly learning totals.
 * Kept only for explicit opt-in tests of forbidden streak caps.
 * @param {Array<[number, number]>} merged
 * @param {number} [capMs]
 */
export function creditMergedIntervalsWithCap(merged, capMs = 0) {
  const cap = Math.max(0, Math.floor(Number(capMs) || 0));
  let ms = 0;
  for (const pair of merged || []) {
    const s = Number(pair[0]);
    const e = Number(pair[1]);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) continue;
    const dur = e - s;
    ms += cap > 0 ? Math.min(dur, cap) : dur;
  }
  return ms;
}

/**
 * Union overlapping windows. No streak cap by default.
 * @param {Array<[number, number]>} intervals
 * @param {{ applyStreakCap?: boolean, capMs?: number }} [opts]
 */
export function creditWallClockUnionMs(intervals, opts = {}) {
  const { unionMs, merged, overlapMs } = unionTimeIntervalsMs(intervals);
  const applyStreakCap = opts.applyStreakCap === true;
  const capMs = Math.max(0, Math.floor(Number(opts.capMs) || 0));
  const creditedMs =
    applyStreakCap && capMs > 0
      ? creditMergedIntervalsWithCap(merged, capMs)
      : unionMs;
  return {
    creditedMs,
    unionMs,
    overlapMs,
    segmentCount: merged.length,
    minutes: creditedMsToRoundedMinutes(creditedMs),
    merged,
  };
}

/**
 * Reconstruct a dwell window ending at `endedAtMs`.
 * @param {{ startedAtMs?: number, endedAtMs: number, rawMs?: number, creditedMs?: number }} p
 * @returns {[number, number]|null}
 */
export function reconstructDwellWindow(p) {
  const end = Number(p.endedAtMs);
  if (!Number.isFinite(end)) return null;
  const raw = Math.max(0, Math.floor(Number(p.rawMs) || 0));
  const credited = Math.max(0, Math.floor(Number(p.creditedMs) || 0));
  const span = Math.max(raw, credited);
  const started = Number(p.startedAtMs);
  if (Number.isFinite(started) && started < end && end - started >= 1000) {
    return [started, end];
  }
  if (span <= 0) return null;
  return [end - span, end];
}
