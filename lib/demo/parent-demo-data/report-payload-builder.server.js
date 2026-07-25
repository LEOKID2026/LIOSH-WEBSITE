import {
  aggregateReportPayloadFromActivityRows,
  mergeLearningActivityBookData,
  parseIsoDateParam,
  stripInternalReportPayloadFields,
} from "../../parent-server/report-data-aggregate.server.js";
import {
  attachParentFacingToPayload,
  buildParentFacingBlocks,
} from "../../parent-server/parent-report-parent-facing.server.js";
import { cloneParentFacingBlock } from "../../parent-server/parent-facing-report-authority.js";
import { rebuildParentReportBaseFromAggregatedBody } from "../../parent-server/rebuild-parent-report-from-aggregate.server.js";
import { attachParentContextEvidenceQuality } from "../../learning/evidence-quality.js";
import { getDemoParentChildById } from "./children.js";
import { generateDemoLearningRows } from "./daily-generator.js";
import { listDemoActivitiesForChild } from "./activities-generator.js";
import { isValidYmd, todayYmdIsrael, ymdToUtcDate } from "./israel-date.server.js";
import { DEMO_HISTORY_START, DEMO_PARENT_SUBJECTS } from "./constants.js";
import {
  ensureDemoReportMathTopicCoverage,
  shouldEnsureDemoReportMathCoverage,
  DEMO_REPORT_MATH_COVERAGE_CHILD_IDS,
} from "./demo-report-topic-coverage.server.js";
import { generateDemoBookReadingRows } from "./demo-book-reading.server.js";
import {
  computeDemoUnifiedLearningTime,
  measureDemoQuestionAndBookMs,
} from "./demo-learning-time-breakdown.server.js";
import { demoTargetBookMsFromQuestionMs } from "./demo-answer-time.server.js";
import {
  demoTargetOtherActiveLearningMs,
  filterDemoAssignedActivitiesInRange,
  generateDemoParentActivityLearningVisits,
} from "./demo-parent-activity-learning-visits.server.js";

/**
 * Keep only the five demo subjects in parent-facing report payloads.
 * @param {Record<string, unknown>} payload
 */
function filterDemoReportSubjects(payload) {
  const subjects = payload?.subjects;
  if (!subjects || typeof subjects !== "object") return payload;
  /** @type {Record<string, unknown>} */
  const filtered = {};
  for (const key of DEMO_PARENT_SUBJECTS) {
    if (subjects[key]) filtered[key] = subjects[key];
  }
  return { ...payload, subjects: filtered };
}

/**
 * Unified credited learning time + exclusive breakdown from demo rows (same pipeline as real API).
 * @param {Record<string, unknown>} payload
 * @param {{
 *   answers: Array<Record<string, unknown>>,
 *   bookVisits: Array<Record<string, unknown>>,
 *   parentActivityVisits: Array<Record<string, unknown>>,
 * }} sources
 */
function attachDemoUnifiedLearningTime(payload, sources) {
  if (!payload || typeof payload !== "object") return payload;
  const unified = computeDemoUnifiedLearningTime(sources);
  const summary =
    payload.summary && typeof payload.summary === "object" ? { ...payload.summary } : {};

  summary.creditedLearningMinutes = unified.minutes;
  summary.totalDurationSeconds = unified.totalDurationSeconds;
  summary.learningTimeSource = "unified_credited";
  summary.learningTimeTimezone = "Asia/Jerusalem";
  summary.learningTimeExclusiveBreakdown = unified.learningTimeExclusiveBreakdown;

  const meta = payload.meta && typeof payload.meta === "object" ? { ...payload.meta } : {};
  meta.learningTimeSource = "unified_credited";
  meta.learningTimeTimezone = "Asia/Jerusalem";
  meta.learningTimeExclusiveBreakdown = unified.learningTimeExclusiveBreakdown;

  return { ...payload, summary, meta };
}

/**
 * @param {string} childId
 * @param {string} fromYmd
 * @param {string} toYmd
 */
export function buildDemoParentReportPayload(childId, fromYmd, toYmd) {
  const child = getDemoParentChildById(childId);
  if (!child) {
    return { ok: false, status: 404, error: "Student not found for demo" };
  }

  const from = isValidYmd(fromYmd) ? fromYmd : DEMO_HISTORY_START;
  const to = isValidYmd(toYmd) ? toYmd : todayYmdIsrael();
  const fromDate = parseIsoDateParam(from) || ymdToUtcDate(from);
  const toDate = parseIsoDateParam(to) || ymdToUtcDate(to);

  const student = {
    id: child.id,
    full_name: child.full_name,
    grade_level: child.grade_level,
    is_active: child.is_active,
    account_kind: child.account_kind,
  };

  const { sessions, answers } = generateDemoLearningRows(childId, from, to);
  if (shouldEnsureDemoReportMathCoverage(from, to) && DEMO_REPORT_MATH_COVERAGE_CHILD_IDS.has(childId)) {
    ensureDemoReportMathTopicCoverage(childId, from, to, sessions, answers);
  }
  const { questionMs: preBookQuestionMs } = measureDemoQuestionAndBookMs(answers, []);
  const targetBookMs = demoTargetBookMsFromQuestionMs(childId, from, to, preBookQuestionMs);
  const { visits: bookVisits, sessions: bookSessions } = generateDemoBookReadingRows(
    childId,
    from,
    to,
    { targetCreditedMs: targetBookMs },
  );
  const activities = listDemoActivitiesForChild(childId, { fromYmd: from, toYmd: to, asOfYmd: to });
  const activityPool = filterDemoAssignedActivitiesInRange(activities, from, to);
  const { questionMs, bookMs } = measureDemoQuestionAndBookMs(answers, bookVisits);
  const targetOtherMs = demoTargetOtherActiveLearningMs(questionMs, bookMs);
  const parentActivityVisits = generateDemoParentActivityLearningVisits(
    childId,
    from,
    to,
    targetOtherMs,
    activityPool,
  );
  const fetchMeta = {
    sessionsFilterField: "started_at",
    answersFilterField: "answered_at",
  };

  const aggregated = aggregateReportPayloadFromActivityRows(
    student,
    sessions,
    answers,
    fromDate,
    toDate,
    fetchMeta,
    [],
    [],
  );

  const activitiesForPayload = activities.map((a) => ({
    activityId: a.activityId,
    title: a.title,
    subject: a.subject,
    topic: a.topic,
    studentStatus: a.studentStatus,
    answersCount: a.answersCount,
    correctCount: a.correctCount,
    scorePct: a.scorePct,
  }));

  const withQuality = attachParentContextEvidenceQuality({
    ...aggregated,
    range: { from, to },
    parentAssignedActivitiesInPeriod: activitiesForPayload,
  });

  const withBooks = mergeLearningActivityBookData(withQuality, bookVisits, bookSessions, answers);

  // Aggregate-only blocks are a launch scaffold for the shared rebuild (same as production
  // report-data). Canonical parentFacing is then replaced from the production V2/topic-engine path.
  const blocks = buildParentFacingBlocks(withBooks);
  const enriched = attachParentFacingToPayload(withBooks, {
    ...blocks,
    teacherMessages: [],
  });

  const withUnifiedTime = attachDemoUnifiedLearningTime(enriched, {
    answers,
    bookVisits,
    parentActivityVisits,
  });

  const scaffoldBody = filterDemoReportSubjects(
    stripInternalReportPayloadFields({
      ok: true,
      ...withUnifiedTime,
      student,
      demo: true,
    }),
  );

  const rebuilt = rebuildParentReportBaseFromAggregatedBody(scaffoldBody, "custom");
  if (rebuilt.ok && rebuilt.parentFacing) {
    scaffoldBody.parentFacing = cloneParentFacingBlock(rebuilt.parentFacing);
    scaffoldBody.meta =
      scaffoldBody.meta && typeof scaffoldBody.meta === "object"
        ? { ...scaffoldBody.meta, parentFacingSource: "engine_rebuild" }
        : { parentFacingSource: "engine_rebuild" };
  }

  return { ok: true, payload: scaffoldBody };
}

/**
 * Detailed report payload for Copilot (same aggregate + client-side detailed build).
 * @param {string} childId
 * @param {string} fromYmd
 * @param {string} toYmd
 */
export function buildDemoParentCopilotPayload(childId, fromYmd, toYmd) {
  const built = buildDemoParentReportPayload(childId, fromYmd, toYmd);
  if (!built.ok) return built;
  return { ok: true, payload: built.payload };
}
