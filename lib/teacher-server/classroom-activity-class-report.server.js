/**
 * Classroom activity rollups for teacher/school class reports.
 * School-managed classes store student progress in classroom_activity_* tables,
 * not learning_sessions/answers — merge those rows into parent-report-shaped payloads.
 */

import { isoDateOnly, REPORT_AGG_SUBJECTS } from "../parent-server/report-data-aggregate.server.js";
import { loadSchoolScope } from "../school-server/school-scope.server.js";
import { chunkIds } from "../school-server/school-query-chunks.server.js";
import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";

const BATCH_PAGE = 1000;

function activityTimestampIso(row) {
  return row?.closed_at || row?.activated_at || row?.created_at || null;
}

function isActivityInRange(row, fromIso, toIsoExclusive) {
  const at = activityTimestampIso(row);
  if (!at) return false;
  return at >= fromIso && at < toIsoExclusive;
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
    subjects: {},
    daily: {},
  };
}

function ensureSubjectRollup(rollup, subjectKey) {
  if (!rollup.subjects[subjectKey]) {
    rollup.subjects[subjectKey] = { sessions: 0, answers: 0, correct: 0, wrong: 0, topics: {} };
  }
  return rollup.subjects[subjectKey];
}

function ensureTopicRollup(subjectRollup, topicKey) {
  if (!subjectRollup.topics[topicKey]) {
    subjectRollup.topics[topicKey] = { answers: 0, correct: 0, wrong: 0 };
  }
  return subjectRollup.topics[topicKey];
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

    for (const [topicKey, srcTopic] of Object.entries(srcSubject.topics || {})) {
      const destTopic = ensureTopicRollup(destSubject, topicKey);
      destTopic.answers = (Number(destTopic.answers) || 0) + (Number(srcTopic.answers) || 0);
      destTopic.correct = (Number(destTopic.correct) || 0) + (Number(srcTopic.correct) || 0);
      destTopic.wrong = (Number(destTopic.wrong) || 0) + (Number(srcTopic.wrong) || 0);
      destTopic.accuracy =
        destTopic.answers > 0
          ? Number(((destTopic.correct / destTopic.answers) * 100).toFixed(2))
          : 0;
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

  return payload;
}

/**
 * @param {{
 *   activities: Array<{ id: string, subject?: string|null, topic?: string|null, closed_at?: string|null, activated_at?: string|null, created_at?: string|null }>,
 *   statuses: Array<{ activity_id: string, student_id: string, status?: string|null, submitted_at?: string|null, answers_count?: number|null, correct_count?: number|null }>,
 *   studentIds: string[],
 * }} input
 * @returns {Map<string, ReturnType<typeof emptyStudentRollup>>}
 */
export function buildClassroomActivityRollupsByStudentId(input) {
  const { activities, statuses, studentIds } = input;
  const allowedStudents = new Set(studentIds);
  const activityById = new Map((activities || []).map((a) => [a.id, a]));
  const byStudentId = new Map();
  for (const studentId of studentIds) {
    byStudentId.set(studentId, emptyStudentRollup());
  }

  for (const statusRow of statuses || []) {
    const studentId = statusRow.student_id;
    if (!studentId || !allowedStudents.has(studentId)) continue;
    const activity = activityById.get(statusRow.activity_id);
    if (!activity) continue;

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

    const subjectKey = REPORT_AGG_SUBJECTS.includes(activity.subject) ? activity.subject : null;
    if (subjectKey) {
      const subjectRollup = ensureSubjectRollup(rollup, subjectKey);
      if (countActivitySession(statusRow.status)) {
        subjectRollup.sessions += 1;
      }
      subjectRollup.answers += answers;
      subjectRollup.correct += correct;
      subjectRollup.wrong += wrong;

      const topicKey = String(activity.topic || "general").trim() || "general";
      const topicRollup = ensureTopicRollup(subjectRollup, topicKey);
      topicRollup.answers += answers;
      topicRollup.correct += correct;
      topicRollup.wrong += wrong;
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
    }

    byStudentId.set(studentId, rollup);
  }

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
    const { data: activities, error: actErr } = await serviceRole
      .from("classroom_activities")
      .select("id, subject, topic, closed_at, activated_at, created_at, status")
      .eq("class_id", classId)
      .neq("status", "archived");

    if (actErr) {
      if (isDbSchemaNotReadyError(actErr)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }

    const inRangeActivities = (activities || []).filter((row) =>
      isActivityInRange(row, fromIso, toIsoExclusive)
    );
    if (!inRangeActivities.length) {
      return { ok: true, byStudentId, activityCount: 0 };
    }

    const activityIds = inRangeActivities.map((row) => row.id);
    const statuses = [];

    for (let offset = 0; ; offset += BATCH_PAGE) {
      const { data, error } = await serviceRole
        .from("classroom_activity_student_status")
        .select("activity_id, student_id, status, submitted_at, answers_count, correct_count")
        .in("activity_id", activityIds)
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

    const merged = buildClassroomActivityRollupsByStudentId({
      activities: inRangeActivities,
      statuses,
      studentIds,
    });

    return { ok: true, byStudentId: merged, activityCount: inRangeActivities.length };
  } catch (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
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

  const inRangeActivities = [];
  for (const classIdChunk of chunkIds(memberClassIds, 40)) {
    const { data: activities, error: actErr } = await serviceRole
      .from("classroom_activities")
      .select("id, subject, topic, closed_at, activated_at, created_at, status, class_id")
      .in("class_id", classIdChunk)
      .neq("status", "archived");

    if (actErr) {
      if (isDbSchemaNotReadyError(actErr)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }

    for (const row of activities || []) {
      if (isActivityInRange(row, fromIso, toIsoExclusive)) {
        inRangeActivities.push(row);
      }
    }
  }

  if (!inRangeActivities.length) {
    return { ok: true, rollup: emptyStudentRollup(), activityCount: 0 };
  }

  const activityIds = inRangeActivities.map((row) => row.id);
  const statuses = [];

  for (let offset = 0; ; offset += BATCH_PAGE) {
    const { data, error } = await serviceRole
      .from("classroom_activity_student_status")
      .select("activity_id, student_id, status, submitted_at, answers_count, correct_count")
      .in("activity_id", activityIds)
      .eq("student_id", studentId)
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

  const byStudentId = buildClassroomActivityRollupsByStudentId({
    activities: inRangeActivities,
    statuses,
    studentIds: [studentId],
  });

  return {
    ok: true,
    rollup: byStudentId.get(studentId) || emptyStudentRollup(),
    activityCount: inRangeActivities.length,
  };
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
