import { DEMO_HISTORY_START } from "./constants.js";
import { getDemoParentChildById } from "./children.js";
import { getDemoChildProfile, pickDemoSubject } from "./profiles.js";
import { pickDemoTopicKey } from "./subject-topics.js";
import { buildDemoActivityCopyHe } from "./hebrew-labels.js";
import {
  compareYmd,
  iterateYmdInclusive,
  todayYmdIsrael,
} from "./israel-date.server.js";
import { demoRandInt, demoSeededRandom } from "./seed.js";

/**
 * @typedef {{
 *   activityId: string,
 *   sentAtYmd: string,
 *   startedAtYmd: string | null,
 *   completedAtYmd: string | null,
 *   title: string,
 *   subject: string,
 *   topic: string,
 *   topicLabelHe: string,
 *   questionCount: number,
 *   mode: string,
 *   seq: number,
 * }} DemoAssignedActivityDef
 */

/**
 * Build all assigned activities from fixed start through today (cumulative).
 * @param {string} childId
 * @returns {DemoAssignedActivityDef[]}
 */
export function buildAllDemoAssignedActivities(childId) {
  const child = getDemoParentChildById(childId);
  if (!child) return [];

  const profile = getDemoChildProfile(child);
  const today = todayYmdIsrael();
  /** @type {DemoAssignedActivityDef[]} */
  const out = [];
  let seq = 0;

  for (const ymd of iterateYmdInclusive(DEMO_HISTORY_START, today)) {
    const rnd = demoSeededRandom(childId, "assign-day", ymd);
    const every = profile.assignedActivityEveryDays;
    const dayIndex = iterateYmdInclusive(DEMO_HISTORY_START, ymd).length - 1;
    if (dayIndex % every !== 0) continue;
    if (rnd() > 0.85) continue;

    seq += 1;
    const actRnd = demoSeededRandom(childId, "activity", String(seq));
    const subject = pickDemoSubject(profile, actRnd);
    const topic = pickDemoTopicKey(child.grade_level, subject, actRnd);
    const copy = buildDemoActivityCopyHe(child.grade_level, subject, topic, seq);
    const sentAtYmd = ymd;

    const startDelay = demoRandInt(actRnd, 0, 2);
    const sentIdx = iterateYmdInclusive(DEMO_HISTORY_START, sentAtYmd).length - 1;
    const startYmdList = iterateYmdInclusive(DEMO_HISTORY_START, today);
    const startedAtYmd = startYmdList[Math.min(sentIdx + startDelay, startYmdList.length - 1)] || null;

    const completeRoll = actRnd();
    let completedAtYmd = null;
    if (startedAtYmd && completeRoll > 0.15) {
      const startIdx = startYmdList.indexOf(startedAtYmd);
      const completeDelay = demoRandInt(actRnd, 1, 5);
      completedAtYmd =
        startYmdList[Math.min(startIdx + completeDelay, startYmdList.length - 1)] || null;
    }

    out.push({
      activityId: `demo-act-${child.slug}-${String(seq).padStart(3, "0")}`,
      sentAtYmd,
      startedAtYmd: completeRoll > 0.08 ? startedAtYmd : null,
      completedAtYmd,
      title: copy.titleHe,
      subject,
      topic,
      topicLabelHe: copy.topicLabelHe,
      questionCount: demoRandInt(actRnd, 8, 20),
      mode: "guided_practice",
      seq,
    });
  }

  return out;
}

/**
 * Monotonic status from fixed milestone dates.
 * @param {DemoAssignedActivityDef} activity
 * @param {string} asOfYmd
 * @returns {"not_started"|"in_progress"|"submitted"|null}
 */
export function resolveDemoActivityStatus(activity, asOfYmd) {
  if (compareYmd(asOfYmd, activity.sentAtYmd) < 0) return null;
  if (!activity.startedAtYmd || compareYmd(asOfYmd, activity.startedAtYmd) < 0) {
    return "not_started";
  }
  if (!activity.completedAtYmd || compareYmd(asOfYmd, activity.completedAtYmd) < 0) {
    return "in_progress";
  }
  return "submitted";
}

/**
 * @param {DemoAssignedActivityDef} activity
 * @param {"not_started"|"in_progress"|"submitted"} studentStatus
 */
export function computeDemoActivityProgressMeta(activity, studentStatus) {
  const rnd = demoSeededRandom(activity.activityId, "progress-meta");
  const total = activity.questionCount;

  if (studentStatus === "not_started") {
    return {
      answersCount: 0,
      correctCount: 0,
      scorePct: null,
      answeredQuestionCount: 0,
    };
  }

  if (studentStatus === "submitted") {
    const answersCount = total;
    const correctRate = 0.55 + rnd() * 0.35;
    const correctCount = Math.min(answersCount, Math.max(0, Math.round(answersCount * correctRate)));
    const scorePct = answersCount ? Math.round((correctCount / answersCount) * 100) : null;
    return {
      answersCount,
      correctCount,
      scorePct,
      answeredQuestionCount: answersCount,
    };
  }

  const fraction = 0.35 + rnd() * 0.25;
  const answeredQuestionCount = Math.max(1, Math.min(total - 1, Math.floor(total * fraction)));
  const wrongRate = 0.25 + rnd() * 0.2;
  const correctCount = Math.max(
    0,
    Math.min(answeredQuestionCount, Math.round(answeredQuestionCount * (1 - wrongRate))),
  );
  const scorePct = answeredQuestionCount
    ? Math.round((correctCount / answeredQuestionCount) * 100)
    : null;

  return {
    answersCount: answeredQuestionCount,
    correctCount,
    scorePct,
    answeredQuestionCount,
  };
}

/**
 * @param {DemoAssignedActivityDef} activity
 * @param {string} asOfYmd
 */
export function mapDemoActivityToApiRow(activity, asOfYmd) {
  const status = resolveDemoActivityStatus(activity, asOfYmd);
  if (!status) return null;

  const studentStatus =
    status === "submitted"
      ? "submitted"
      : status === "in_progress"
        ? "in_progress"
        : "not_started";

  const progress = computeDemoActivityProgressMeta(activity, studentStatus);

  return {
    activityId: activity.activityId,
    scope: "parent",
    parentId: "demo-parent",
    studentId: "",
    title: activity.title,
    subject: activity.subject,
    topic: activity.topic,
    subtopic: null,
    skillKey: null,
    difficultyLevel: "regular",
    questionCount: activity.questionCount,
    mode: activity.mode,
    dueAt: null,
    status: "active",
    activatedAt: `${activity.sentAtYmd}T08:00:00.000Z`,
    closedAt: null,
    archivedAt: null,
    createdAt: `${activity.sentAtYmd}T08:00:00.000Z`,
    updatedAt: `${activity.sentAtYmd}T08:00:00.000Z`,
    snapshotStatus: "frozen",
    snapshotFrozenAt: `${activity.sentAtYmd}T08:00:00.000Z`,
    studentStatus,
    answersCount: progress.answersCount,
    correctCount: progress.correctCount,
    scorePct: progress.scorePct,
    startedAt: activity.startedAtYmd ? `${activity.startedAtYmd}T10:00:00.000Z` : null,
    submittedAt: activity.completedAtYmd ? `${activity.completedAtYmd}T16:00:00.000Z` : null,
    topicLabelHe: activity.topicLabelHe,
  };
}

/**
 * @param {string} childId
 * @param {{ fromYmd?: string, toYmd?: string, asOfYmd?: string, limit?: number|null }} opts
 */
export function listDemoActivitiesForChild(childId, opts = {}) {
  const asOf = opts.asOfYmd || todayYmdIsrael();
  const all = buildAllDemoAssignedActivities(childId)
    .map((a) => mapDemoActivityToApiRow(a, asOf))
    .filter(Boolean);

  let filtered = all;
  if (opts.fromYmd) {
    filtered = filtered.filter(
      (a) => compareYmd(String(a.createdAt).slice(0, 10), opts.fromYmd) >= 0,
    );
  }
  if (opts.toYmd) {
    filtered = filtered.filter(
      (a) => compareYmd(String(a.createdAt).slice(0, 10), opts.toYmd) <= 0,
    );
  }

  filtered.sort((a, b) => compareYmd(String(b.createdAt).slice(0, 10), String(a.createdAt).slice(0, 10)));

  if (opts.limit != null && opts.limit > 0) {
    return filtered.slice(0, opts.limit);
  }
  return filtered;
}
