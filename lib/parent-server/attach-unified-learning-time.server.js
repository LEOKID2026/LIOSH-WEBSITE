/**
 * Attach the unified credited-learning-time total to parent-report payloads.
 * Same aggregate as student "ההתקדמות שלי" / monthly persistence.
 */

import { getIsraelMidnightUtc } from "../learning-supabase/israel-calendar.server.js";
import { sumStudentLearningCreditedMinutesInIsraelMonth } from "../learning-supabase/learning-time-monthly-aggregate.server.js";

/**
 * @param {string} ymd YYYY-MM-DD
 * @param {number} days
 */
export function addCalendarDaysYmd(ymd, days) {
  const [y, m, d] = String(ymd || "")
    .split("-")
    .map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new Error("invalid_ymd");
  }
  const dt = new Date(Date.UTC(y, m - 1, d + Number(days || 0)));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Inclusive Israel calendar dates → UTC ISO bounds (start inclusive, end exclusive).
 * @param {string} fromYmd
 * @param {string} toYmdInclusive
 */
export function israelInclusiveDateRangeToUtcBounds(fromYmd, toYmdInclusive) {
  const startIso = getIsraelMidnightUtc(String(fromYmd).slice(0, 10)).toISOString();
  const endYmd = addCalendarDaysYmd(String(toYmdInclusive).slice(0, 10), 1);
  const endIso = getIsraelMidnightUtc(endYmd).toISOString();
  return { startIso, endIso };
}

/**
 * @param {number} minutes
 */
export function creditedMinutesToDurationSeconds(minutes) {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m <= 0) return 0;
  return Math.max(0, Math.round(m * 60));
}

/**
 * Overwrite summary duration with unified credited minutes for the report range.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {Record<string, unknown>} payload
 */
export async function attachUnifiedCreditedLearningTimeToParentReportPayload(
  supabase,
  studentId,
  payload
) {
  if (!payload || typeof payload !== "object") return payload;
  const range =
    payload.range && typeof payload.range === "object" ? payload.range : null;
  const fromYmd = range?.from ? String(range.from).slice(0, 10) : "";
  const toYmd = range?.to ? String(range.to).slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromYmd) || !/^\d{4}-\d{2}-\d{2}$/.test(toYmd)) {
    return payload;
  }

  const { startIso, endIso } = israelInclusiveDateRangeToUtcBounds(fromYmd, toYmd);
  const unified = await sumStudentLearningCreditedMinutesInIsraelMonth(
    supabase,
    studentId,
    startIso,
    endIso,
    { applyEconomyMonthlyCap: false }
  );

  const creditedLearningMinutes = Number(unified.minutes) || 0;
  const totalDurationSeconds = creditedMinutesToDurationSeconds(creditedLearningMinutes);
  const summary =
    payload.summary && typeof payload.summary === "object" ? { ...payload.summary } : {};

  summary.creditedLearningMinutes = creditedLearningMinutes;
  summary.totalDurationSeconds = totalDurationSeconds;
  summary.learningTimeSource = "unified_credited";
  summary.learningTimeTimezone = "Asia/Jerusalem";

  const meta =
    payload.meta && typeof payload.meta === "object" ? { ...payload.meta } : {};
  meta.learningTimeSource = "unified_credited";
  meta.learningTimeTimezone = "Asia/Jerusalem";
  meta.learningTimeBounds = { startIso, endIso };
  meta.learningTimeBreakdown = unified.breakdown || null;

  const exclusive = unified.learningTimeExclusiveBreakdown;
  if (exclusive && typeof exclusive === "object") {
    const {
      totalMinutes,
      questionPracticeMinutes,
      bookReadingMinutes,
      otherActiveLearningMinutes,
      analyzedQuestionCount,
      bySubject,
    } = exclusive;
    summary.learningTimeExclusiveBreakdown = {
      totalMinutes: Number(totalMinutes) || 0,
      questionPracticeMinutes: Number(questionPracticeMinutes) || 0,
      bookReadingMinutes: Number(bookReadingMinutes) || 0,
      otherActiveLearningMinutes: Number(otherActiveLearningMinutes) || 0,
      analyzedQuestionCount: Math.max(0, Math.floor(Number(analyzedQuestionCount) || 0)),
      bySubject: Array.isArray(bySubject) ? bySubject : [],
    };
    meta.learningTimeExclusiveBreakdown = summary.learningTimeExclusiveBreakdown;
  }

  return {
    ...payload,
    summary,
    meta,
  };
}
