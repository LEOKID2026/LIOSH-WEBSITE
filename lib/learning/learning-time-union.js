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

/** @typedef {'question'|'book'|'other'} ExclusiveLearningCategory */

const EXCLUSIVE_PRIORITY = Object.freeze({
  question: 3,
  book: 2,
  other: 1,
});

/**
 * Post-union exclusive attribution: each wall-clock ms belongs to exactly one category.
 * Priority: question > book > other.
 *
 * @param {Array<{ start: number, end: number, category: ExclusiveLearningCategory, subjectKey?: string|null }>} tagged
 * @returns {{
 *   questionPracticeMs: number,
 *   bookReadingMs: number,
 *   otherActiveLearningMs: number,
 *   totalMs: number,
 *   bySubjectMs: Record<string, { questionPracticeMs: number, bookReadingMs: number }>
 * }}
 */
export function creditExclusiveCategoriesMs(tagged) {
  /** @type {Array<{ start: number, end: number, category: ExclusiveLearningCategory, subjectKey: string|null }>} */
  const cleaned = [];
  for (const row of tagged || []) {
    if (!row || typeof row !== "object") continue;
    let s = Number(row.start);
    let e = Number(row.end);
    if (!Number.isFinite(s) || !Number.isFinite(e)) continue;
    if (e < s) {
      const t = s;
      s = e;
      e = t;
    }
    if (e <= s) continue;
    const category = row.category;
    if (category !== "question" && category !== "book" && category !== "other") continue;
    const subjectKey =
      row.subjectKey != null && String(row.subjectKey).trim()
        ? String(row.subjectKey).trim()
        : null;
    cleaned.push({ start: s, end: e, category, subjectKey });
  }

  if (!cleaned.length) {
    return {
      questionPracticeMs: 0,
      bookReadingMs: 0,
      otherActiveLearningMs: 0,
      totalMs: 0,
      bySubjectMs: {},
    };
  }

  const points = new Set();
  for (const w of cleaned) {
    points.add(w.start);
    points.add(w.end);
  }
  const sorted = [...points].sort((a, b) => a - b);

  let questionPracticeMs = 0;
  let bookReadingMs = 0;
  let otherActiveLearningMs = 0;
  /** @type {Record<string, { questionPracticeMs: number, bookReadingMs: number }>} */
  const bySubjectMs = {};

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (!(b > a)) continue;

    /** @type {{ category: ExclusiveLearningCategory, subjectKey: string|null }|null} */
    let best = null;
    for (const w of cleaned) {
      if (w.start >= b || w.end <= a) continue;
      if (!best || EXCLUSIVE_PRIORITY[w.category] > EXCLUSIVE_PRIORITY[best.category]) {
        best = { category: w.category, subjectKey: w.subjectKey };
      } else if (
        best &&
        EXCLUSIVE_PRIORITY[w.category] === EXCLUSIVE_PRIORITY[best.category] &&
        !best.subjectKey &&
        w.subjectKey
      ) {
        best = { category: w.category, subjectKey: w.subjectKey };
      }
    }
    if (!best) continue;

    const dur = b - a;
    if (best.category === "question") {
      questionPracticeMs += dur;
      if (best.subjectKey) {
        if (!bySubjectMs[best.subjectKey]) {
          bySubjectMs[best.subjectKey] = { questionPracticeMs: 0, bookReadingMs: 0 };
        }
        bySubjectMs[best.subjectKey].questionPracticeMs += dur;
      }
    } else if (best.category === "book") {
      bookReadingMs += dur;
      if (best.subjectKey) {
        if (!bySubjectMs[best.subjectKey]) {
          bySubjectMs[best.subjectKey] = { questionPracticeMs: 0, bookReadingMs: 0 };
        }
        bySubjectMs[best.subjectKey].bookReadingMs += dur;
      }
    } else {
      otherActiveLearningMs += dur;
    }
  }

  const totalMs = questionPracticeMs + bookReadingMs + otherActiveLearningMs;
  return {
    questionPracticeMs,
    bookReadingMs,
    otherActiveLearningMs,
    totalMs,
    bySubjectMs,
  };
}

/**
 * Round exclusive ms parts to display minutes that sum exactly to totalMinutes.
 * @param {{ questionPracticeMs: number, bookReadingMs: number, otherActiveLearningMs: number, totalMs: number }} parts
 * @param {number} [totalMinutesOverride]
 */
export function exclusiveMsToDisplayMinutes(parts, totalMinutesOverride) {
  const qMs = Math.max(0, Math.floor(Number(parts?.questionPracticeMs) || 0));
  const bMs = Math.max(0, Math.floor(Number(parts?.bookReadingMs) || 0));
  const oMs = Math.max(0, Math.floor(Number(parts?.otherActiveLearningMs) || 0));
  const totalMs = Math.max(0, Math.floor(Number(parts?.totalMs) || qMs + bMs + oMs));
  const totalMinutes =
    Number.isFinite(Number(totalMinutesOverride)) && Number(totalMinutesOverride) >= 0
      ? Math.round(Number(totalMinutesOverride) * 100) / 100
      : creditedMsToRoundedMinutes(totalMs);

  if (totalMs <= 0 || totalMinutes <= 0) {
    return {
      totalMinutes: 0,
      questionPracticeMinutes: 0,
      bookReadingMinutes: 0,
      otherActiveLearningMinutes: 0,
    };
  }

  const weights = [qMs, bMs, oMs];
  const raw = weights.map((w) => (w / totalMs) * totalMinutes);
  const floors = raw.map((x) => Math.floor(x * 100) / 100);
  let allocated = floors.reduce((a, b) => a + b, 0);
  let remainCents = Math.round((totalMinutes - allocated) * 100);
  const order = raw
    .map((x, i) => ({ i, frac: x - floors[i] }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  let idx = 0;
  while (remainCents > 0 && order.length > 0) {
    const j = order[idx % order.length].i;
    out[j] = Math.round((out[j] + 0.01) * 100) / 100;
    remainCents -= 1;
    idx += 1;
    if (idx > order.length * 200) break;
  }
  while (remainCents < 0 && order.length > 0) {
    const j = order[(order.length - 1 - (idx % order.length) + order.length) % order.length].i;
    if (out[j] >= 0.01) {
      out[j] = Math.round((out[j] - 0.01) * 100) / 100;
      remainCents += 1;
    }
    idx += 1;
    if (idx > order.length * 200) break;
  }

  return {
    totalMinutes,
    questionPracticeMinutes: out[0],
    bookReadingMinutes: out[1],
    otherActiveLearningMinutes: out[2],
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
