/**
 * Demo parent-assigned activity learning visits — same shape as parent_activity_learning_visits.
 * Classified as exclusive category "other" (למידה פעילה נוספת) in unified learning time.
 *
 * visit_kind: "learning" — open learning on assigned activity without a question attempt.
 * Source table: parent_activity_learning_visits (collectParentVisitTimeWindowsInRange).
 */
import { getDemoParentChildById } from "./children.js";
import { demoRandInt, demoSeededRandom } from "./seed.js";
import { compareYmd, ymdToIsraelIsoUtc } from "./israel-date.server.js";
import { demoCalendarWeekBuckets } from "./demo-calendar-weeks.server.js";

/** Target share of total learning time for other-active-learning. */
export const DEMO_OTHER_ACTIVE_LEARNING_SHARE = 0.15;

/**
 * @param {number} questionMs
 * @param {number} bookMs
 * @param {number} [share]
 */
export function demoTargetOtherActiveLearningMs(questionMs, bookMs, share = DEMO_OTHER_ACTIVE_LEARNING_SHARE) {
  const qb = Math.max(0, Math.floor(Number(questionMs) || 0)) + Math.max(0, Math.floor(Number(bookMs) || 0));
  if (qb <= 0) return 0;
  const s = Number(share);
  if (!Number.isFinite(s) || s <= 0 || s >= 1) return 0;
  return Math.round((s * qb) / (1 - s));
}

/**
 * @param {string} childId
 * @param {string} fromYmd
 * @param {string} toYmd
 * @param {number} targetOtherMs
 * @param {Array<{ activityId?: string, studentStatus?: string }>} assignedActivities
 * @returns {Array<Record<string, unknown>>}
 */
export function generateDemoParentActivityLearningVisits(
  childId,
  fromYmd,
  toYmd,
  targetOtherMs,
  assignedActivities = [],
) {
  const child = getDemoParentChildById(childId);
  if (!child || targetOtherMs <= 0) return [];

  const weekBuckets = demoCalendarWeekBuckets(fromYmd, toYmd);
  if (!weekBuckets.length) return [];

  const activityPool = (assignedActivities || []).filter(
    (a) =>
      a &&
      a.activityId &&
      (a.studentStatus === "in_progress" || a.studentStatus === "submitted"),
  );
  if (!activityPool.length) return [];

  const avgSessionMs = 5 * 60_000;
  let sessionCount = Math.max(1, Math.round(targetOtherMs / avgSessionMs));
  sessionCount = Math.min(sessionCount, Math.max(1, weekBuckets.length * 2));

  const baseMs = Math.floor(targetOtherMs / sessionCount);
  let remainderMs = targetOtherMs - baseMs * sessionCount;

  /** @type {Array<Record<string, unknown>>} */
  const visits = [];
  const usedDayKeys = new Set();

  for (let i = 0; i < sessionCount; i += 1) {
    let creditedMs = baseMs + (remainderMs > 0 ? 1 : 0);
    if (remainderMs > 0) remainderMs -= 1;
    if (creditedMs < 60_000) continue;

    const sessRnd = demoSeededRandom(childId, fromYmd, toYmd, "parent-visit", String(i));
    const weekIdx = demoRandInt(sessRnd, 0, weekBuckets.length - 1);
    const { days, weekIndex } = weekBuckets[weekIdx];

    let dayIdx = demoRandInt(sessRnd, 0, days.length - 1);
    for (let attempt = 0; attempt < days.length; attempt += 1) {
      const dayKey = `${weekIndex}:${days[dayIdx]}`;
      if (!usedDayKeys.has(dayKey)) break;
      dayIdx = (dayIdx + 1) % days.length;
    }
    const ymd = days[dayIdx];
    usedDayKeys.add(`${weekIndex}:${ymd}`);

    const activity = activityPool[i % activityPool.length];
    const hour = demoRandInt(sessRnd, 12, 14);
    const minute = demoRandInt(sessRnd, 10, 50);
    const startedIso = ymdToIsraelIsoUtc(ymd, hour, minute);
    const endedIso = new Date(new Date(startedIso).getTime() + creditedMs).toISOString();
    const token = `demo-pav-${child.slug}-${ymd.replace(/-/g, "")}-w${weekIndex}-${i}`;

    visits.push({
      id: `demo-parent-visit-${token}`,
      activity_id: activity.activityId,
      student_id: childId,
      question_index: 0,
      client_visit_token: token,
      visit_kind: "learning",
      raw_dwell_ms: creditedMs,
      credited_dwell_ms: creditedMs,
      started_at: startedIso,
      ended_at: endedIso,
    });
  }

  return visits;
}

/**
 * @param {Array<Record<string, unknown>>} activities
 * @param {string} fromYmd
 * @param {string} toYmd
 */
export function filterDemoAssignedActivitiesInRange(activities, fromYmd, toYmd) {
  return (activities || []).filter((a) => {
    if (!a?.activityId) return false;
    const sent = String(a.createdAt || a.activatedAt || "").slice(0, 10);
    if (sent && compareYmd(sent, toYmd) > 0) return false;
    if (a.studentStatus === "not_started") return false;
    return true;
  });
}
