/**
 * Classroom activity rollups for teacher/school class reports.
 * School-managed classes store student progress in classroom_activity_* tables,
 * not learning_sessions/answers — merge those rows into parent-report-shaped payloads.
 */

import { isoDateOnly, REPORT_AGG_SUBJECTS } from "../parent-server/report-data-aggregate.server.js";
import { MODE_CLASSIFICATION_MAP, EVIDENCE_CATEGORIES } from "../learning/activity-classification.js";
import {
  isSubjectInPermittedScope,
  loadTeacherPermittedSubjects,
  sumMetricsFromSubjectRollups,
} from "../school-server/school-subjects.server.js";
import { loadSchoolScope } from "../school-server/school-scope.server.js";
import { loadTeacherSchoolMembership } from "../school-server/school-membership.server.js";
import { chunkIds } from "../school-server/school-query-chunks.server.js";
import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";

const BATCH_PAGE = 1000;
/** Keep `.in("activity_id", …)` chunks small — large UUID lists overflow fetch headers. */
const ACTIVITY_ID_IN_CHUNK = 80;

function activityTimestampIso(row) {
  return row?.closed_at || row?.activated_at || row?.created_at || null;
}

function timestampMsForRangeCompare(iso) {
  if (iso == null || iso === "") return null;
  const ms = Date.parse(String(iso));
  return Number.isNaN(ms) ? null : ms;
}

function isTimestampInRange(iso, fromIso, toIsoExclusive) {
  const refMs = timestampMsForRangeCompare(iso);
  const fromMs = timestampMsForRangeCompare(fromIso);
  const toMs = timestampMsForRangeCompare(toIsoExclusive);
  if (refMs == null || fromMs == null || toMs == null) return false;
  return refMs >= fromMs && refMs < toMs;
}

function isActivityInRange(row, fromIso, toIsoExclusive) {
  return isTimestampInRange(activityTimestampIso(row), fromIso, toIsoExclusive);
}

/**
 * Paginated status fetch with chunked activity_id IN lists (avoids HeadersOverflow / fetch failed).
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string[]} activityIds
 * @param {(query: import('@supabase/supabase-js').PostgrestFilterBuilder) => import('@supabase/supabase-js').PostgrestFilterBuilder} applyStudentScope
 */
async function fetchClassroomStatusRowsForActivities(serviceRole, activityIds, applyStudentScope) {
  const statuses = [];
  if (!activityIds.length) return { ok: true, statuses };

  for (const idChunk of chunkIds(activityIds, ACTIVITY_ID_IN_CHUNK)) {
    for (let offset = 0; ; offset += BATCH_PAGE) {
      let query = serviceRole
        .from("classroom_activity_student_status")
        .select("activity_id, student_id, status, submitted_at, answers_count, correct_count")
        .in("activity_id", idChunk);
      query = applyStudentScope(query);
      const { data, error } = await query.range(offset, offset + BATCH_PAGE - 1);

      if (error) {
        if (isDbSchemaNotReadyError(error)) {
          return { ok: false, status: 503, code: "db_schema_not_ready" };
        }
        return { ok: false, status: 500, code: "internal_error" };
      }

      const rows = data || [];
      statuses.push(...rows);
      if (rows.length < BATCH_PAGE) break;
    }
  }

  return { ok: true, statuses };
}

const CLASSROOM_ACTIVITY_SELECT =
  "id, subject, topic, closed_at, activated_at, created_at, status, class_id, mode";

/**
 * Paginated classroom_activities fetch (PostgREST default row cap is 1000).
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string[]} classIds
 * @param {string} [selectCols]
 */
async function fetchScopedClassroomActivitiesForClassIds(
  serviceRole,
  classIds,
  selectCols = CLASSROOM_ACTIVITY_SELECT
) {
  const scopedActivities = [];
  if (!classIds.length) return { ok: true, activities: scopedActivities };

  for (const classIdChunk of chunkIds(classIds, 40)) {
    for (let offset = 0; ; offset += BATCH_PAGE) {
      const { data: activities, error: actErr } = await serviceRole
        .from("classroom_activities")
        .select(selectCols)
        .in("class_id", classIdChunk)
        .neq("status", "archived")
        .neq("mode", "discussion")
        .order("id", { ascending: true })
        .range(offset, offset + BATCH_PAGE - 1);

      if (actErr) {
        if (isDbSchemaNotReadyError(actErr)) {
          return { ok: false, status: 503, code: "db_schema_not_ready" };
        }
        return { ok: false, status: 500, code: "internal_error" };
      }

      const rows = activities || [];
      scopedActivities.push(...rows);
      if (rows.length < BATCH_PAGE) break;
    }
  }

  return { ok: true, activities: scopedActivities };
}

function toDateKey(iso) {
  if (!iso) return null;
  const s = String(iso).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function emptyStudentRollup() {
  return {
    sessions: 0,
    answers: 0,
    correct: 0,
    wrong: 0,
    diagnosticAnswers: 0,
    diagnosticCorrect: 0,
    diagnosticWrong: 0,
    competitiveAnswers: 0,
    competitiveCorrect: 0,
    learningAnswers: 0,
    subjects: {},
    daily: {},
    dailyBySubject: {},
  };
}

function ensureSubjectRollup(rollup, subjectKey) {
  if (!rollup.subjects[subjectKey]) {
    rollup.subjects[subjectKey] = {
      sessions: 0, answers: 0, correct: 0, wrong: 0,
      diagnosticAnswers: 0, diagnosticCorrect: 0, diagnosticWrong: 0,
      competitiveAnswers: 0, competitiveCorrect: 0,
      learningAnswers: 0,
      topics: {},
    };
  }
  return rollup.subjects[subjectKey];
}

function ensureTopicRollup(subjectRollup, topicKey) {
  if (!subjectRollup.topics[topicKey]) {
    subjectRollup.topics[topicKey] = {
      answers: 0, correct: 0, wrong: 0,
      diagnosticAnswers: 0, diagnosticCorrect: 0, diagnosticWrong: 0,
      lastActivityAt: null,
    };
  }
  return subjectRollup.topics[topicKey];
}

/**
 * Classify a classroom activity's mode into diagnostic/competitive/learning bucket.
 * @param {string|null|undefined} activityMode
 * @returns {{ isDiagnosticEligible: boolean, evidenceCategory: string }}
 */
function classifyClassroomActivityMode(activityMode) {
  const normalized = typeof activityMode === "string" ? activityMode.trim().toLowerCase() : null;
  if (normalized) {
    const entry = MODE_CLASSIFICATION_MAP[normalized];
    if (entry) return { isDiagnosticEligible: entry.isDiagnosticEligible, evidenceCategory: entry.evidenceCategory };
  }
  return { isDiagnosticEligible: false, evidenceCategory: EVIDENCE_CATEGORIES.UNCLASSIFIED };
}

function bumpTopicActivityAt(topicRollup, iso) {
  if (!iso) return;
  const next = String(iso);
  if (!topicRollup.lastActivityAt || next > String(topicRollup.lastActivityAt)) {
    topicRollup.lastActivityAt = next;
  }
}

function ensureDailyRollup(rollup, dateKey) {
  if (!rollup.daily[dateKey]) {
    rollup.daily[dateKey] = { date: dateKey, sessions: 0, answers: 0, correct: 0, wrong: 0, durationSeconds: 0 };
  }
  return rollup.daily[dateKey];
}

function countActivitySession(status) {
  const normalized = String(status || "").toLowerCase();
  return normalized === "submitted" || normalized === "timed_out" || normalized === "in_progress";
}

/**
 * @param {object} payload Parent-report-shaped analytics payload (mutated in place).
 * @param {ReturnType<typeof emptyStudentRollup>|null|undefined} rollup
 */
export function mergeClassroomActivityRollupIntoReportPayload(payload, rollup) {
  if (!payload || !rollup || !rollup.answers) return payload;

  if (!payload.summary || typeof payload.summary !== "object") {
    payload.summary = {};
  }
  if (!payload.subjects || typeof payload.subjects !== "object") {
    payload.subjects = {};
  }
  for (const subject of REPORT_AGG_SUBJECTS) {
    if (!payload.subjects[subject]) {
      payload.subjects[subject] = { sessions: 0, answers: 0, correct: 0, wrong: 0, topics: {} };
    } else if (!payload.subjects[subject].topics) {
      payload.subjects[subject].topics = {};
    }
  }

  const summary = payload.summary;
  summary.totalSessions = (Number(summary.totalSessions) || 0) + rollup.sessions;
  summary.totalAnswers = (Number(summary.totalAnswers) || 0) + rollup.answers;
  summary.correctAnswers = (Number(summary.correctAnswers) || 0) + rollup.correct;
  summary.wrongAnswers = (Number(summary.wrongAnswers) || 0) + rollup.wrong;

  const totalAnswers = Number(summary.totalAnswers) || 0;
  const correctAnswers = Number(summary.correctAnswers) || 0;
  summary.accuracy =
    totalAnswers > 0 ? Number(((correctAnswers / totalAnswers) * 100).toFixed(2)) : 0;

  // Phase 4: merge diagnostic/competitive/learning buckets into summary
  summary.diagnosticAnswers = (Number(summary.diagnosticAnswers) || 0) + (rollup.diagnosticAnswers || 0);
  summary.diagnosticCorrect = (Number(summary.diagnosticCorrect) || 0) + (rollup.diagnosticCorrect || 0);
  summary.diagnosticWrong = (Number(summary.diagnosticWrong) || 0) + (rollup.diagnosticWrong || 0);
  const diagAnswers = Number(summary.diagnosticAnswers) || 0;
  const diagCorrect = Number(summary.diagnosticCorrect) || 0;
  summary.diagnosticAccuracy =
    diagAnswers > 0 ? Number(((diagCorrect / diagAnswers) * 100).toFixed(2)) : 0;
  summary.competitiveAnswers = (Number(summary.competitiveAnswers) || 0) + (rollup.competitiveAnswers || 0);
  summary.competitiveCorrect = (Number(summary.competitiveCorrect) || 0) + (rollup.competitiveCorrect || 0);
  const compAnswers = Number(summary.competitiveAnswers) || 0;
  const compCorrect = Number(summary.competitiveCorrect) || 0;
  summary.competitiveAccuracy =
    compAnswers > 0 ? Number(((compCorrect / compAnswers) * 100).toFixed(2)) : 0;
  summary.learningAnswers = (Number(summary.learningAnswers) || 0) + (rollup.learningAnswers || 0);

  for (const [subjectKey, srcSubject] of Object.entries(rollup.subjects)) {
    if (!REPORT_AGG_SUBJECTS.includes(subjectKey)) continue;
    const destSubject = ensureSubjectRollup({ subjects: payload.subjects }, subjectKey);
    destSubject.sessions = (Number(destSubject.sessions) || 0) + (Number(srcSubject.sessions) || 0);
    destSubject.answers = (Number(destSubject.answers) || 0) + (Number(srcSubject.answers) || 0);
    destSubject.correct = (Number(destSubject.correct) || 0) + (Number(srcSubject.correct) || 0);
    destSubject.wrong = (Number(destSubject.wrong) || 0) + (Number(srcSubject.wrong) || 0);
    destSubject.accuracy =
      destSubject.answers > 0
        ? Number(((destSubject.correct / destSubject.answers) * 100).toFixed(2))
        : 0;
    // Phase 4: merge diagnostic buckets into subject
    destSubject.diagnosticAnswers = (Number(destSubject.diagnosticAnswers) || 0) + (Number(srcSubject.diagnosticAnswers) || 0);
    destSubject.diagnosticCorrect = (Number(destSubject.diagnosticCorrect) || 0) + (Number(srcSubject.diagnosticCorrect) || 0);
    destSubject.diagnosticWrong = (Number(destSubject.diagnosticWrong) || 0) + (Number(srcSubject.diagnosticWrong) || 0);
    destSubject.diagnosticAccuracy =
      destSubject.diagnosticAnswers > 0
        ? Number(((destSubject.diagnosticCorrect / destSubject.diagnosticAnswers) * 100).toFixed(2))
        : 0;
    destSubject.learningAnswers = (Number(destSubject.learningAnswers) || 0) + (Number(srcSubject.learningAnswers) || 0);

    for (const [topicKey, srcTopic] of Object.entries(srcSubject.topics || {})) {
      const destTopic = ensureTopicRollup(destSubject, topicKey);
      destTopic.answers = (Number(destTopic.answers) || 0) + (Number(srcTopic.answers) || 0);
      destTopic.correct = (Number(destTopic.correct) || 0) + (Number(srcTopic.correct) || 0);
      destTopic.wrong = (Number(destTopic.wrong) || 0) + (Number(srcTopic.wrong) || 0);
      destTopic.accuracy =
        destTopic.answers > 0
          ? Number(((destTopic.correct / destTopic.answers) * 100).toFixed(2))
          : 0;
      destTopic.diagnosticAnswers = (Number(destTopic.diagnosticAnswers) || 0) + (Number(srcTopic.diagnosticAnswers) || 0);
      destTopic.diagnosticCorrect = (Number(destTopic.diagnosticCorrect) || 0) + (Number(srcTopic.diagnosticCorrect) || 0);
      destTopic.diagnosticWrong = (Number(destTopic.diagnosticWrong) || 0) + (Number(srcTopic.diagnosticWrong) || 0);
      destTopic.diagnosticAccuracy =
        destTopic.diagnosticAnswers > 0
          ? Number(((destTopic.diagnosticCorrect / destTopic.diagnosticAnswers) * 100).toFixed(2))
          : 0;
      if (srcTopic.lastActivityAt) {
        const at = String(srcTopic.lastActivityAt);
        destTopic.lastAnswerAt = at;
        destTopic.latestActivityAt = at;
        destTopic.latestActivitySource = "classroom_activity";
      } else if ((Number(destTopic.answers) || 0) > 0 && !destTopic.lastAnswerAt) {
        const rangeTo = payload.range?.to ? String(payload.range.to).slice(0, 10) : null;
        if (rangeTo && /^\d{4}-\d{2}-\d{2}$/.test(rangeTo)) {
          const fallbackAt = `${rangeTo}T12:00:00.000Z`;
          destTopic.lastAnswerAt = fallbackAt;
          destTopic.latestActivityAt = fallbackAt;
          destTopic.latestActivitySource = "classroom_activity";
        }
      }
    }
  }

  const dailyList = Array.isArray(payload.dailyActivity) ? payload.dailyActivity : [];
  const dailyMap = new Map(dailyList.map((row) => [row.date, { ...row }]));
  for (const day of Object.values(rollup.daily)) {
    const prev = dailyMap.get(day.date) || {
      date: day.date,
      sessions: 0,
      answers: 0,
      correct: 0,
      wrong: 0,
      durationSeconds: 0,
    };
    prev.sessions += Number(day.sessions) || 0;
    prev.answers += Number(day.answers) || 0;
    prev.correct += Number(day.correct) || 0;
    prev.wrong += Number(day.wrong) || 0;
    dailyMap.set(day.date, prev);
  }
  payload.dailyActivity = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  if (rollup.dailyBySubject && typeof rollup.dailyBySubject === "object") {
    if (!payload._dailyBySubject || typeof payload._dailyBySubject !== "object") {
      payload._dailyBySubject = {};
    }
    for (const [dayKey, subjectMap] of Object.entries(rollup.dailyBySubject)) {
      if (!subjectMap || typeof subjectMap !== "object") continue;
      if (!payload._dailyBySubject[dayKey]) payload._dailyBySubject[dayKey] = {};
      for (const [subjectKey, counts] of Object.entries(subjectMap)) {
        if (!counts || typeof counts !== "object") continue;
        if (!payload._dailyBySubject[dayKey][subjectKey]) {
          payload._dailyBySubject[dayKey][subjectKey] = {
            sessions: 0,
            answers: 0,
            correct: 0,
            wrong: 0,
            durationSeconds: 0,
          };
        }
        const dest = payload._dailyBySubject[dayKey][subjectKey];
        dest.sessions += Number(counts.sessions) || 0;
        dest.answers += Number(counts.answers) || 0;
        dest.correct += Number(counts.correct) || 0;
        dest.wrong += Number(counts.wrong) || 0;
        dest.durationSeconds += Number(counts.durationSeconds) || 0;
      }
    }
  }

  return payload;
}

/**
 * @param {{
 *   activities: Array<{ id: string, subject?: string|null, topic?: string|null, closed_at?: string|null, activated_at?: string|null, created_at?: string|null }>,
 *   statuses: Array<{ activity_id: string, student_id: string, status?: string|null, submitted_at?: string|null, answers_count?: number|null, correct_count?: number|null }>,
 *   studentIds: string[],
 *   fromIso?: string|null,
 *   toIsoExclusive?: string|null,
 * }} input
 * @returns {Map<string, ReturnType<typeof emptyStudentRollup>> & { qualifyingActivityIds?: Set<string> }}
 */
export function buildClassroomActivityRollupsByStudentId(input) {
  const { activities, statuses, studentIds, fromIso, toIsoExclusive } = input;
  const allowedStudents = new Set(studentIds);
  const activityById = new Map((activities || []).map((a) => [a.id, a]));
  const byStudentId = new Map();
  for (const studentId of studentIds) {
    byStudentId.set(studentId, emptyStudentRollup());
  }

  const hasRangeFilter =
    typeof fromIso === "string" && fromIso && typeof toIsoExclusive === "string" && toIsoExclusive;
  const qualifyingActivityIds = new Set();

  for (const statusRow of statuses || []) {
    const studentId = statusRow.student_id;
    if (!studentId || !allowedStudents.has(studentId)) continue;
    const activity = activityById.get(statusRow.activity_id);
    if (!activity) continue;

    if (hasRangeFilter) {
      const submittedAtIso =
        typeof statusRow.submitted_at === "string" && statusRow.submitted_at
          ? statusRow.submitted_at
          : null;
      const referenceIso = submittedAtIso || activityTimestampIso(activity);
      if (!isTimestampInRange(referenceIso, fromIso, toIsoExclusive)) continue;
    }

    const answers = Number(statusRow.answers_count) || 0;
    const correct = Number(statusRow.correct_count) || 0;
    if (answers <= 0 && !countActivitySession(statusRow.status)) continue;

    const wrong = Math.max(0, answers - correct);
    const rollup = byStudentId.get(studentId) || emptyStudentRollup();
    if (countActivitySession(statusRow.status)) {
      rollup.sessions += 1;
    }
    rollup.answers += answers;
    rollup.correct += correct;
    rollup.wrong += wrong;

    // Phase 4: classify activity by mode
    const actClassification = classifyClassroomActivityMode(activity.mode);
    const isCompetitiveCls = actClassification.evidenceCategory === EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE;
    if (actClassification.isDiagnosticEligible && !isCompetitiveCls) {
      rollup.diagnosticAnswers += answers;
      rollup.diagnosticCorrect += correct;
      rollup.diagnosticWrong += wrong;
    } else if (isCompetitiveCls) {
      rollup.competitiveAnswers += answers;
      rollup.competitiveCorrect += correct;
    } else {
      rollup.learningAnswers += answers;
    }

    if (activity.id) qualifyingActivityIds.add(activity.id);

    const subjectKey = REPORT_AGG_SUBJECTS.includes(activity.subject) ? activity.subject : null;
    if (subjectKey) {
      const subjectRollup = ensureSubjectRollup(rollup, subjectKey);
      if (countActivitySession(statusRow.status)) {
        subjectRollup.sessions += 1;
      }
      subjectRollup.answers += answers;
      subjectRollup.correct += correct;
      subjectRollup.wrong += wrong;
      if (actClassification.isDiagnosticEligible && !isCompetitiveCls) {
        subjectRollup.diagnosticAnswers += answers;
        subjectRollup.diagnosticCorrect += correct;
        subjectRollup.diagnosticWrong += wrong;
      } else if (isCompetitiveCls) {
        subjectRollup.competitiveAnswers += answers;
        subjectRollup.competitiveCorrect += correct;
      } else {
        subjectRollup.learningAnswers += answers;
      }

      const topicKey = String(activity.topic || "general").trim() || "general";
      const topicRollup = ensureTopicRollup(subjectRollup, topicKey);
      topicRollup.answers += answers;
      topicRollup.correct += correct;
      topicRollup.wrong += wrong;
      if (actClassification.isDiagnosticEligible && !isCompetitiveCls) {
        topicRollup.diagnosticAnswers += answers;
        topicRollup.diagnosticCorrect += correct;
        topicRollup.diagnosticWrong += wrong;
      }
      bumpTopicActivityAt(topicRollup, statusRow.submitted_at || activityTimestampIso(activity));
    }

    const dayKey =
      toDateKey(statusRow.submitted_at) ||
      toDateKey(activityTimestampIso(activity));
    if (dayKey) {
      const daily = ensureDailyRollup(rollup, dayKey);
      if (countActivitySession(statusRow.status)) {
        daily.sessions += 1;
      }
      daily.answers += answers;
      daily.correct += correct;
      daily.wrong += wrong;

      if (subjectKey) {
        if (!rollup.dailyBySubject[dayKey]) rollup.dailyBySubject[dayKey] = {};
        if (!rollup.dailyBySubject[dayKey][subjectKey]) {
          rollup.dailyBySubject[dayKey][subjectKey] = {
            sessions: 0,
            answers: 0,
            correct: 0,
            wrong: 0,
            durationSeconds: 0,
          };
        }
        const subjectDay = rollup.dailyBySubject[dayKey][subjectKey];
        if (countActivitySession(statusRow.status)) {
          subjectDay.sessions += 1;
        }
        subjectDay.answers += answers;
        subjectDay.correct += correct;
        subjectDay.wrong += wrong;
      }
    }

    byStudentId.set(studentId, rollup);
  }

  byStudentId.qualifyingActivityIds = qualifyingActivityIds;
  return byStudentId;
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   classId: string,
 *   studentIds: string[],
 *   fromDate: Date,
 *   toDate: Date,
 * }} input
 */
export async function loadClassroomActivityRollupsForClassReport(input) {
  const { serviceRole, classId, studentIds, fromDate, toDate } = input;
  const byStudentId = new Map();
  for (const studentId of studentIds) {
    byStudentId.set(studentId, emptyStudentRollup());
  }

  if (!studentIds.length) {
    return { ok: true, byStudentId, activityCount: 0 };
  }

  const fromIso = `${isoDateOnly(fromDate)}T00:00:00.000Z`;
  const toExclusive = new Date(toDate);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  const toIsoExclusive = `${isoDateOnly(toExclusive)}T00:00:00.000Z`;

  try {
    const activityFetch = await fetchScopedClassroomActivitiesForClassIds(
      serviceRole,
      [classId],
      "id, subject, topic, closed_at, activated_at, created_at, status"
    );
    if (!activityFetch.ok) return activityFetch;

    const scopedActivities = activityFetch.activities;
    if (!scopedActivities.length) {
      return { ok: true, byStudentId, activityCount: 0 };
    }

    const activityIds = scopedActivities.map((row) => row.id);
    const statusFetch = await fetchClassroomStatusRowsForActivities(
      serviceRole,
      activityIds,
      (query) => query.in("student_id", studentIds)
    );
    if (!statusFetch.ok) return statusFetch;

    const merged = buildClassroomActivityRollupsByStudentId({
      activities: scopedActivities,
      statuses: statusFetch.statuses,
      studentIds,
      fromIso,
      toIsoExclusive,
    });

    const activityCount = merged.qualifyingActivityIds
      ? merged.qualifyingActivityIds.size
      : 0;
    return { ok: true, byStudentId: merged, activityCount };
  } catch (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
}

/**
 * Batched classroom rollups for multiple subject-classes (physical report hub).
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   classIds: string[],
 *   studentIds: string[],
 *   fromDate: Date,
 *   toDate: Date,
 * }} input
 * @returns {Promise<{ ok: true, byClassId: Map<string, { byStudentId: Map<string, object>, activityCount: number }> }|{ ok: false, status: number, code: string }>}
 */
export async function loadClassroomActivityRollupsForMultipleClassReports(input) {
  const { serviceRole, classIds, studentIds, fromDate, toDate } = input;
  /** @type {Map<string, { byStudentId: Map<string, ReturnType<typeof emptyStudentRollup>>, activityCount: number }>} */
  const byClassId = new Map();

  for (const classId of classIds) {
    const byStudentId = new Map();
    for (const studentId of studentIds) {
      byStudentId.set(studentId, emptyStudentRollup());
    }
    byClassId.set(classId, { byStudentId, activityCount: 0 });
  }

  if (!classIds.length || !studentIds.length) {
    return { ok: true, byClassId };
  }

  const fromIso = `${isoDateOnly(fromDate)}T00:00:00.000Z`;
  const toExclusive = new Date(toDate);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  const toIsoExclusive = `${isoDateOnly(toExclusive)}T00:00:00.000Z`;

  try {
    const activityFetch = await fetchScopedClassroomActivitiesForClassIds(
      serviceRole,
      classIds,
      "id, class_id, subject, topic, closed_at, activated_at, created_at, status"
    );
    if (!activityFetch.ok) return activityFetch;
    const scopedActivities = activityFetch.activities;

    if (!scopedActivities.length) {
      return { ok: true, byClassId };
    }

    const activityIds = scopedActivities.map((row) => row.id);
    const statuses = [];

    for (const idChunk of chunkIds(activityIds, ACTIVITY_ID_IN_CHUNK)) {
      for (let offset = 0; ; offset += BATCH_PAGE) {
        const { data, error } = await serviceRole
          .from("classroom_activity_student_status")
          .select("activity_id, student_id, status, submitted_at, answers_count, correct_count")
          .in("activity_id", idChunk)
          .in("student_id", studentIds)
          .range(offset, offset + BATCH_PAGE - 1);

        if (error) {
          if (isDbSchemaNotReadyError(error)) {
            return { ok: false, status: 503, code: "db_schema_not_ready" };
          }
          return { ok: false, status: 500, code: "internal_error" };
        }

        const rows = data || [];
        statuses.push(...rows);
        if (rows.length < BATCH_PAGE) break;
      }
    }

    const activitiesByClassId = new Map();
    for (const activity of scopedActivities) {
      if (!activity.class_id) continue;
      if (!activitiesByClassId.has(activity.class_id)) {
        activitiesByClassId.set(activity.class_id, []);
      }
      activitiesByClassId.get(activity.class_id).push(activity);
    }

    for (const classId of classIds) {
      const classActivities = activitiesByClassId.get(classId) || [];
      const merged = buildClassroomActivityRollupsByStudentId({
        activities: classActivities,
        statuses,
        studentIds,
        fromIso,
        toIsoExclusive,
      });
      const activityCount = merged.qualifyingActivityIds ? merged.qualifyingActivityIds.size : 0;
      byClassId.set(classId, { byStudentId: merged, activityCount });
    }

    return { ok: true, byClassId };
  } catch (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
}

/**
 * Count submitted/timed_out statuses per activity in one query.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string[]} activityIds
 * @returns {Promise<Map<string, number>>}
 */
export async function batchCountSubmittedActivityStatuses(serviceRole, activityIds) {
  /** @type {Map<string, number>} */
  const counts = new Map();
  if (!activityIds.length) return counts;

  for (const idChunk of chunkIds(activityIds, 40)) {
    for (let offset = 0; ; offset += BATCH_PAGE) {
      const { data, error } = await serviceRole
        .from("classroom_activity_student_status")
        .select("activity_id")
        .in("activity_id", idChunk)
        .in("status", ["submitted", "timed_out"])
        .range(offset, offset + BATCH_PAGE - 1);

      if (error) {
        if (isDbSchemaNotReadyError(error)) {
          throw Object.assign(new Error("db_schema_not_ready"), { code: "db_schema_not_ready" });
        }
        throw error;
      }

      const rows = data || [];
      for (const row of rows) {
        if (!row.activity_id) continue;
        const id = String(row.activity_id);
        counts.set(id, (counts.get(id) || 0) + 1);
      }
      if (rows.length < BATCH_PAGE) break;
    }
  }

  return counts;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 * @param {string[]} memberClassIds
 * @param {Date} fromDate
 * @param {Date} toDate
 */
async function loadStudentClassroomRollupForMemberClassIds(
  serviceRole,
  studentId,
  memberClassIds,
  fromDate,
  toDate
) {
  if (!memberClassIds.length) {
    return { ok: true, rollup: emptyStudentRollup(), activityCount: 0 };
  }

  const fromIso = `${isoDateOnly(fromDate)}T00:00:00.000Z`;
  const toExclusive = new Date(toDate);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  const toIsoExclusive = `${isoDateOnly(toExclusive)}T00:00:00.000Z`;

  const activityFetch = await fetchScopedClassroomActivitiesForClassIds(serviceRole, memberClassIds);
  if (!activityFetch.ok) return activityFetch;
  const scopedActivities = activityFetch.activities;

  if (!scopedActivities.length) {
    return { ok: true, rollup: emptyStudentRollup(), activityCount: 0 };
  }

  const activityIds = scopedActivities.map((row) => row.id);
  const statusFetch = await fetchClassroomStatusRowsForActivities(
    serviceRole,
    activityIds,
    (query) => query.eq("student_id", studentId)
  );
  if (!statusFetch.ok) return statusFetch;

  const byStudentId = buildClassroomActivityRollupsByStudentId({
    activities: scopedActivities,
    statuses: statusFetch.statuses,
    studentIds: [studentId],
    fromIso,
    toIsoExclusive,
  });

  const activityCount = byStudentId.qualifyingActivityIds
    ? byStudentId.qualifyingActivityIds.size
    : 0;
  return {
    ok: true,
    rollup: byStudentId.get(studentId) || emptyStudentRollup(),
    activityCount,
  };
}

/**
 * Batch classroom rollups for multiple students across member class IDs.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string[]} studentIds
 * @param {string[]} memberClassIds
 * @param {Date} fromDate
 * @param {Date} toDate
 */
async function loadClassroomRollupsForMemberClassIdsBatch(
  serviceRole,
  studentIds,
  memberClassIds,
  fromDate,
  toDate
) {
  const byStudentId = new Map();
  for (const studentId of studentIds) {
    byStudentId.set(studentId, emptyStudentRollup());
  }

  if (!memberClassIds.length || !studentIds.length) {
    return { ok: true, byStudentId, activityCount: 0, latestActivity: null };
  }

  const fromIso = `${isoDateOnly(fromDate)}T00:00:00.000Z`;
  const toExclusive = new Date(toDate);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  const toIsoExclusive = `${isoDateOnly(toExclusive)}T00:00:00.000Z`;

  const activityFetch = await fetchScopedClassroomActivitiesForClassIds(serviceRole, memberClassIds);
  if (!activityFetch.ok) return activityFetch;
  const scopedActivities = activityFetch.activities;

  if (!scopedActivities.length) {
    return { ok: true, byStudentId, activityCount: 0, latestActivity: null };
  }

  let latestActivity = null;
  for (const row of scopedActivities) {
    if (!isActivityInRange(row, fromIso, toIsoExclusive)) continue;
    const at = activityTimestampIso(row);
    if (
      !latestActivity ||
      String(at || "") > String(activityTimestampIso(latestActivity) || "")
    ) {
      latestActivity = row;
    }
  }

  const activityIds = scopedActivities.map((row) => row.id);
  const statuses = [];
  const allowedStudents = new Set(studentIds);

  for (const idChunk of chunkIds(activityIds, ACTIVITY_ID_IN_CHUNK)) {
    for (let offset = 0; ; offset += BATCH_PAGE) {
      const { data, error } = await serviceRole
        .from("classroom_activity_student_status")
        .select("activity_id, student_id, status, submitted_at, answers_count, correct_count")
        .in("activity_id", idChunk)
        .in("student_id", studentIds)
        .range(offset, offset + BATCH_PAGE - 1);

      if (error) {
        if (isDbSchemaNotReadyError(error)) {
          return { ok: false, status: 503, code: "db_schema_not_ready" };
        }
        return { ok: false, status: 500, code: "internal_error" };
      }

      const rows = data || [];
      for (const row of rows) {
        if (allowedStudents.has(row.student_id)) {
          statuses.push(row);
        }
      }
      if (rows.length < BATCH_PAGE) break;
    }
  }

  const merged = buildClassroomActivityRollupsByStudentId({
    activities: scopedActivities,
    statuses,
    studentIds,
    fromIso,
    toIsoExclusive,
  });

  const activityCount = merged.qualifyingActivityIds
    ? merged.qualifyingActivityIds.size
    : 0;
  return {
    ok: true,
    byStudentId: merged,
    activityCount,
    latestActivity,
  };
}

/**
 * Resolve member class IDs for dashboard students (school-scoped or teacher-owned).
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string[]} studentIds
 */
async function resolveDashboardMemberClassIds(serviceRole, teacherId, studentIds) {
  if (!studentIds.length) {
    return { ok: true, memberClassIds: [] };
  }

  const schoolMem = await loadTeacherSchoolMembership(serviceRole, teacherId);
  if (!schoolMem.ok) return schoolMem;

  let scopeClassIds = [];
  if (schoolMem.membership?.schoolId) {
    const scope = await loadSchoolScope(serviceRole, schoolMem.membership.schoolId);
    if (!scope.ok) return scope;
    if (!scope.teacherIds?.length) {
      return { ok: true, memberClassIds: [] };
    }

    const { data: classRows, error: classErr } = await serviceRole
      .from("teacher_classes")
      .select("id")
      .in("teacher_id", scope.teacherIds)
      .eq("is_archived", false)
      .is("archived_at", null);

    if (classErr) {
      if (isDbSchemaNotReadyError(classErr)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
    scopeClassIds = (classRows || []).map((row) => row.id);
  } else {
    const { data: classRows, error: classErr } = await serviceRole
      .from("teacher_classes")
      .select("id")
      .eq("teacher_id", teacherId)
      .eq("is_archived", false)
      .is("archived_at", null);

    if (classErr) {
      if (isDbSchemaNotReadyError(classErr)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
    scopeClassIds = (classRows || []).map((row) => row.id);
  }

  if (!scopeClassIds.length) {
    return { ok: true, memberClassIds: [] };
  }

  const memberClassIds = new Set();
  for (const classIdChunk of chunkIds(scopeClassIds, 40)) {
    for (const studentIdChunk of chunkIds(studentIds, 80)) {
      const { data: memberships, error: memErr } = await serviceRole
        .from("teacher_class_students")
        .select("class_id")
        .in("class_id", classIdChunk)
        .in("student_id", studentIdChunk)
        .is("removed_at", null);

      if (memErr) {
        if (isDbSchemaNotReadyError(memErr)) {
          return { ok: false, status: 503, code: "db_schema_not_ready" };
        }
        return { ok: false, status: 500, code: "internal_error" };
      }

      for (const row of memberships || []) {
        if (row.class_id) memberClassIds.add(row.class_id);
      }
    }
  }

  return { ok: true, memberClassIds: [...memberClassIds] };
}

/**
 * Batch classroom activity rollups for teacher dashboard cards.
 * Uses the same school-scoped / teacher-class scope as student report payloads.
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   studentIds: string[],
 *   fromDate: Date,
 *   toDate: Date,
 * }} input
 */
export async function loadClassroomActivityRollupsForTeacherDashboard(input) {
  const { serviceRole, teacherId, studentIds, fromDate, toDate } = input;

  try {
    const scoped = await resolveDashboardMemberClassIds(serviceRole, teacherId, studentIds);
    if (!scoped.ok) return scoped;

    return loadClassroomRollupsForMemberClassIdsBatch(
      serviceRole,
      studentIds,
      scoped.memberClassIds,
      fromDate,
      toDate
    );
  } catch (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
}

/**
 * @param {ReturnType<typeof emptyStudentRollup>|null|undefined} rollup
 * @param {Set<string>|null|undefined} [permittedSubjects]
 */
export function classroomRollupToDashboardMetrics(rollup, permittedSubjects = null) {
  if (!rollup) {
    return {
      totalSessions: 0,
      totalAnswers: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      accuracy: null,
      lastActivityAt: null,
    };
  }

  if (permittedSubjects) {
    const filteredSubjects = {};
    for (const [key, value] of Object.entries(rollup.subjects || {})) {
      if (isSubjectInPermittedScope(key, permittedSubjects)) {
        filteredSubjects[key] = value;
      }
    }
    const metrics = sumMetricsFromSubjectRollups(filteredSubjects);
    let lastActivityAt = null;
    if (metrics.totalSessions > 0 || metrics.totalAnswers > 0) {
      for (const day of Object.values(rollup.daily || {})) {
        if (day?.date && (!lastActivityAt || day.date > lastActivityAt)) {
          lastActivityAt = day.date;
        }
      }
    }
    return { ...metrics, lastActivityAt };
  }

  let lastActivityAt = null;
  for (const day of Object.values(rollup.daily || {})) {
    if (day?.date && (!lastActivityAt || day.date > lastActivityAt)) {
      lastActivityAt = day.date;
    }
  }

  const totalAnswers = Number(rollup.answers) || 0;
  const correctAnswers = Number(rollup.correct) || 0;
  const wrongAnswers = Number(rollup.wrong) || 0;
  const totalSessions = Number(rollup.sessions) || 0;

  return {
    totalSessions,
    totalAnswers,
    correctAnswers,
    wrongAnswers,
    accuracy:
      totalAnswers > 0 ? Number(((correctAnswers / totalAnswers) * 100).toFixed(2)) : null,
    lastActivityAt,
  };
}

/**
 * @param {Record<string, unknown>} row Dashboard student activity row (mutated)
 * @param {ReturnType<typeof classroomRollupToDashboardMetrics>} classroom
 */
export function mergeClassroomMetricsIntoDashboardRow(row, classroom) {
  if (!classroom || (!classroom.totalAnswers && !classroom.totalSessions)) return row;

  row.totalSessions = (Number(row.totalSessions) || 0) + classroom.totalSessions;
  row.totalAnswers = (Number(row.totalAnswers) || 0) + classroom.totalAnswers;
  row.correctAnswers = (Number(row.correctAnswers) || 0) + classroom.correctAnswers;
  row.wrongAnswers = (Number(row.wrongAnswers) || 0) + classroom.wrongAnswers;

  if (
    classroom.lastActivityAt &&
    (!row.lastActivityAt || classroom.lastActivityAt > row.lastActivityAt)
  ) {
    row.lastActivityAt = classroom.lastActivityAt;
  }

  if (Number(row.totalAnswers) > 0) {
    row.accuracy = Number(
      ((Number(row.correctAnswers) / Number(row.totalAnswers)) * 100).toFixed(2)
    );
  }

  return row;
}

/**
 * School manager: merge classroom activity from all school-visible subject classes
 * the student belongs to (optionally limited to one physical class).
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   schoolId: string,
 *   studentId: string,
 *   fromDate: Date,
 *   toDate: Date,
 *   gradeLevel?: string|null,
 *   physicalClassName?: string|null,
 * }} input
 */
export async function loadSchoolScopedClassroomActivityRollupForStudentReport(input) {
  const { serviceRole, schoolId, studentId, fromDate, toDate, gradeLevel, physicalClassName } =
    input;

  try {
    const scope = await loadSchoolScope(serviceRole, schoolId);
    if (!scope.ok) return scope;
    if (!scope.teacherIds?.length) {
      return { ok: true, rollup: emptyStudentRollup(), classIds: [], activityCount: 0 };
    }

    const { data: classRows, error: classErr } = await serviceRole
      .from("teacher_classes")
      .select("id, grade_level, name")
      .in("teacher_id", scope.teacherIds)
      .eq("is_archived", false)
      .is("archived_at", null);

    if (classErr) {
      if (isDbSchemaNotReadyError(classErr)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }

    const grade = typeof gradeLevel === "string" ? gradeLevel.trim() : "";
    const physName = typeof physicalClassName === "string" ? physicalClassName.trim() : "";

    let scopedClasses = classRows || [];
    if (grade && physName) {
      scopedClasses = scopedClasses.filter(
        (row) =>
          String(row.grade_level || "").trim() === grade &&
          String(row.name || "").trim() === physName
      );
    }

    const scopedClassIds = scopedClasses.map((row) => row.id);
    if (!scopedClassIds.length) {
      return { ok: true, rollup: emptyStudentRollup(), classIds: [], activityCount: 0 };
    }

    const memberClassIds = [];
    for (const idChunk of chunkIds(scopedClassIds, 80)) {
      const { data: memberships, error: memErr } = await serviceRole
        .from("teacher_class_students")
        .select("class_id")
        .in("class_id", idChunk)
        .eq("student_id", studentId)
        .is("removed_at", null);

      if (memErr) {
        if (isDbSchemaNotReadyError(memErr)) {
          return { ok: false, status: 503, code: "db_schema_not_ready" };
        }
        return { ok: false, status: 500, code: "internal_error" };
      }

      for (const row of memberships || []) {
        memberClassIds.push(row.class_id);
      }
    }

    const uniqueMemberClassIds = [...new Set(memberClassIds)];
    const rollupResult = await loadStudentClassroomRollupForMemberClassIds(
      serviceRole,
      studentId,
      uniqueMemberClassIds,
      fromDate,
      toDate
    );
    if (!rollupResult.ok) return rollupResult;

    return {
      ok: true,
      rollup: rollupResult.rollup,
      classIds: uniqueMemberClassIds,
      activityCount: rollupResult.activityCount,
    };
  } catch (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
}

/**
 * Classroom activity rollup for a single student across the teacher's classes (optionally scoped to one class).
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   studentId: string,
 *   fromDate: Date,
 *   toDate: Date,
 *   classId?: string|null,
 * }} input
 */
export async function loadClassroomActivityRollupForStudentReport(input) {
  const { serviceRole, teacherId, studentId, fromDate, toDate, classId } = input;

  try {
    const { data: classRows, error: classErr } = await serviceRole
      .from("teacher_classes")
      .select("id")
      .eq("teacher_id", teacherId)
      .eq("is_archived", false)
      .is("archived_at", null);

    if (classErr) {
      if (isDbSchemaNotReadyError(classErr)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }

    let classIds = (classRows || []).map((row) => row.id);
    if (!classIds.length) {
      return { ok: true, rollup: emptyStudentRollup(), activityCount: 0 };
    }
    if (classId) {
      if (!classIds.includes(classId)) {
        return { ok: true, rollup: emptyStudentRollup(), activityCount: 0 };
      }
      classIds = [classId];
    }

    const { data: memberships, error: memErr } = await serviceRole
      .from("teacher_class_students")
      .select("class_id")
      .in("class_id", classIds)
      .eq("student_id", studentId)
      .is("removed_at", null);

    if (memErr) {
      if (isDbSchemaNotReadyError(memErr)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }

    const memberClassIds = (memberships || []).map((row) => row.class_id);
    return loadStudentClassroomRollupForMemberClassIds(
      serviceRole,
      studentId,
      memberClassIds,
      fromDate,
      toDate
    );
  } catch (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
}
