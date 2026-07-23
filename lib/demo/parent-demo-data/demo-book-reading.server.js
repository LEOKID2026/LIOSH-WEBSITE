/**
 * Deterministic demo book reading — same row shape as book_page_visits / book_reading_sessions.
 *
 * ~0.6–0.8 reading sessions per calendar week on average (not every day).
 * Each session 3–6 minutes → typically 8–10% of total learning time in week/month ranges.
 */
import { getDemoParentChildById } from "./children.js";
import { normalizeGradeLevelToKey } from "../../learning-student-defaults.js";
import { demoRandInt, demoSeededRandom } from "./seed.js";
import { ymdToIsraelIsoUtc } from "./israel-date.server.js";
import { demoCalendarWeekBuckets } from "./demo-calendar-weeks.server.js";

/** Subjects that appear in the learning book catalog for demo personas. */
const DEMO_BOOK_SUBJECTS = Object.freeze(["hebrew", "math", "english", "science"]);

/**
 * Per week: usually 0–1 sessions, occasionally 2; never scales with total span beyond week count.
 * @param {() => number} weekRnd
 * @returns {number}
 */
function demoBookSessionsThisWeek(weekRnd) {
  const roll = weekRnd();
  if (roll < 0.52) return 0;
  if (roll < 0.92) return 1;
  return 2;
}

/**
 * @param {string} childId
 * @param {string} fromYmd
 * @param {string} toYmd
 * @param {{ targetCreditedMs?: number }} [opts]
 * @returns {{ visits: Array<Record<string, unknown>>, sessions: Array<Record<string, unknown>> }}
 */
export function generateDemoBookReadingRows(childId, fromYmd, toYmd, opts = {}) {
  const child = getDemoParentChildById(childId);
  if (!child) return { visits: [], sessions: [] };

  const weekBuckets = demoCalendarWeekBuckets(fromYmd, toYmd);
  if (!weekBuckets.length) return { visits: [], sessions: [] };

  const gradeKey = normalizeGradeLevelToKey(child.grade_level) || "g2";
  /** @type {Array<Record<string, unknown>>} */
  const visits = [];
  /** @type {Array<Record<string, unknown>>} */
  const sessions = [];

  let sessionOrdinal = 0;
  for (const { weekIndex, days } of weekBuckets) {
    const weekRnd = demoSeededRandom(childId, fromYmd, toYmd, "book-week", String(weekIndex));
    const weekSessionCount = demoBookSessionsThisWeek(weekRnd);
    if (weekSessionCount <= 0) continue;

    const usedDays = new Set();
    for (let s = 0; s < weekSessionCount; s += 1) {
      const sessRnd = demoSeededRandom(
        childId,
        fromYmd,
        toYmd,
        "book-session",
        String(weekIndex),
        String(s),
      );

      let dayIdx = demoRandInt(sessRnd, 0, days.length - 1);
      for (let attempt = 0; attempt < days.length && usedDays.has(days[dayIdx]); attempt += 1) {
        dayIdx = (dayIdx + 1) % days.length;
      }
      const ymd = days[dayIdx];
      usedDays.add(ymd);

      const durationMin = demoRandInt(sessRnd, 3, 6);
      const creditedMs = durationMin * 60_000;
      const subject = DEMO_BOOK_SUBJECTS[demoRandInt(sessRnd, 0, DEMO_BOOK_SUBJECTS.length - 1)];
      const hour = demoRandInt(sessRnd, 19, 21);
      const minute = demoRandInt(sessRnd, 5, 50);
      const startedIso = ymdToIsraelIsoUtc(ymd, hour, minute);
      const sessionId = `demo-book-sess-${child.slug}-${ymd.replace(/-/g, "")}-w${weekIndex}-${s}`;

      sessions.push({
        id: sessionId,
        student_id: childId,
        subject,
        grade: gradeKey,
        started_at: startedIso,
        ended_at: new Date(new Date(startedIso).getTime() + creditedMs).toISOString(),
        client_session_token: `demo-book-token-${sessionId}`,
      });

      const pageCount = demoRandInt(sessRnd, 1, 2);
      let remaining = creditedMs;
      let cursorMs = new Date(startedIso).getTime();
      for (let p = 0; p < pageCount; p += 1) {
        const pageMs =
          p === pageCount - 1 ? remaining : Math.floor(remaining / (pageCount - p));
        remaining -= pageMs;
        const pageStart = new Date(cursorMs).toISOString();
        cursorMs += pageMs;
        const pageEnd = new Date(cursorMs).toISOString();

        visits.push({
          id: `demo-book-visit-${child.slug}-${ymd.replace(/-/g, "")}-w${weekIndex}-${s}-p${p}`,
          student_id: childId,
          subject,
          grade: gradeKey,
          page_id: `demo-book-page-${subject}-${sessionOrdinal}-${p}`,
          credited_dwell_ms: pageMs,
          raw_dwell_ms: pageMs,
          page_read: pageMs >= 10_000,
          triggered_cta: false,
          started_at: pageStart,
          ended_at: pageEnd,
          hidden_tab_ms: 0,
          sections_skipped: 0,
          client_visit_token: `demo-visit-${sessionId}-${p}`,
        });
      }
      sessionOrdinal += 1;
    }
  }

  const targetMs = Math.max(0, Math.floor(Number(opts.targetCreditedMs) || 0));
  if (targetMs > 0 && visits.length > 0) {
    let currentMs = 0;
    for (const v of visits) currentMs += Number(v.credited_dwell_ms) || 0;
    if (currentMs > 0 && Math.abs(currentMs - targetMs) > 60_000) {
      const scale = targetMs / currentMs;
      for (const v of visits) {
        const next = Math.max(60_000, Math.round((Number(v.credited_dwell_ms) || 0) * scale));
        v.credited_dwell_ms = next;
        v.raw_dwell_ms = next;
        v.page_read = next >= 10_000;
        const endMs = new Date(String(v.started_at)).getTime() + next;
        v.ended_at = new Date(endMs).toISOString();
      }
      for (const s of sessions) {
        const startMs = new Date(String(s.started_at)).getTime();
        const sessionVisits = visits.filter((v) => String(v.client_visit_token || "").includes(String(s.id)));
        const span =
          sessionVisits.reduce((acc, v) => acc + (Number(v.credited_dwell_ms) || 0), 0) || 0;
        if (span > 0) s.ended_at = new Date(startMs + span).toISOString();
      }
    }
  }

  return { visits, sessions };
}
