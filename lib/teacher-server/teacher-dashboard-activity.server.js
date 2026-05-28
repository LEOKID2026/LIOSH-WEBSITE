import { isoDateOnly, REPORT_AGG_SUBJECTS } from "../parent-server/report-data-aggregate.server.js";
import { formatTopicLineHe, subjectLabelHe } from "../teacher-portal/teacher-ui.he.js";
import {
  isSubjectInPermittedScope,
  loadTeacherPermittedSubjects,
} from "../school-server/school-subjects.server.js";
import {
  classroomRollupToDashboardMetrics,
  loadClassroomActivityRollupsForTeacherDashboard,
  mergeClassroomMetricsIntoDashboardRow,
} from "./classroom-activity-class-report.server.js";
import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";

const BATCH_PAGE = 1000;

function isMissingColumnError(error) {
  const msg = String(error?.message || "").toLowerCase();
  return msg.includes("column") && msg.includes("does not exist");
}

function emptyStudentRollup() {
  return {
    totalSessions: 0,
    totalAnswers: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    lastActivityAt: null,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string[]} studentIds
 * @param {string} fromIso
 * @param {string} toIsoExclusive
 */
async function fetchSessionsBatch(serviceRole, studentIds, fromIso, toIsoExclusive) {
  if (!studentIds.length) return [];
  const selectCols = "id,student_id,subject,topic,started_at,created_at,ended_at";
  const all = [];

  for (let offset = 0; ; offset += BATCH_PAGE) {
    const q = await serviceRole
      .from("learning_sessions")
      .select(selectCols)
      .in("student_id", studentIds)
      .gte("started_at", fromIso)
      .lt("started_at", toIsoExclusive)
      .order("started_at", { ascending: false })
      .range(offset, offset + BATCH_PAGE - 1);

    if (q.error) {
      if (isMissingColumnError(q.error)) {
        const fallback = await serviceRole
          .from("learning_sessions")
          .select(selectCols)
          .in("student_id", studentIds)
          .gte("created_at", fromIso)
          .lt("created_at", toIsoExclusive)
          .order("created_at", { ascending: false })
          .range(offset, offset + BATCH_PAGE - 1);
        if (fallback.error) throw fallback.error;
        const rows = fallback.data || [];
        all.push(...rows);
        if (rows.length < BATCH_PAGE) break;
        continue;
      }
      throw q.error;
    }
    const rows = q.data || [];
    all.push(...rows);
    if (rows.length < BATCH_PAGE) break;
  }

  return all;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string[]} studentIds
 * @param {string} fromIso
 * @param {string} toIsoExclusive
 */
async function fetchAnswersBatch(serviceRole, studentIds, fromIso, toIsoExclusive) {
  if (!studentIds.length) return [];
  const selectCols =
    "id,student_id,is_correct,answered_at,created_at,learning_session_id";
  const all = [];

  for (let offset = 0; ; offset += BATCH_PAGE) {
    const q = await serviceRole
      .from("answers")
      .select(selectCols)
      .in("student_id", studentIds)
      .gte("answered_at", fromIso)
      .lt("answered_at", toIsoExclusive)
      .order("answered_at", { ascending: false })
      .range(offset, offset + BATCH_PAGE - 1);

    if (q.error) {
      if (isMissingColumnError(q.error)) {
        const fallback = await serviceRole
          .from("answers")
          .select(selectCols)
          .in("student_id", studentIds)
          .gte("created_at", fromIso)
          .lt("created_at", toIsoExclusive)
          .order("created_at", { ascending: false })
          .range(offset, offset + BATCH_PAGE - 1);
        if (fallback.error) throw fallback.error;
        const rows = fallback.data || [];
        all.push(...rows);
        if (rows.length < BATCH_PAGE) break;
        continue;
      }
      throw q.error;
    }
    const rows = q.data || [];
    all.push(...rows);
    if (rows.length < BATCH_PAGE) break;
  }

  return all;
}

/**
 * @param {string|null|undefined} iso
 */
function activityIso(iso) {
  if (!iso) return null;
  const s = String(iso).slice(0, 10);
  return s || null;
}

/**
 * Lightweight per-student activity rollup for dashboard (no full report build).
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId?: string|null,
 *   studentIds: string[],
 *   fromDate: Date,
 *   toDate: Date,
 * }} input
 * @returns {Promise<Map<string, { totalSessions: number, totalAnswers: number, correctAnswers: number, wrongAnswers: number, accuracy: number|null, lastActivityAt: string|null }>>}
 */
export async function buildLightweightStudentActivityMap(input) {
  const { serviceRole, teacherId, studentIds, fromDate, toDate } = input;
  const map = new Map();
  for (const id of studentIds) {
    map.set(id, { ...emptyStudentRollup(), accuracy: null });
  }

  if (!studentIds.length) {
    return {
      ok: true,
      byStudentId: map,
      byStudentWeakTopic: new Map(),
      latestSubjectLabel: null,
      classHealthSignal: null,
    };
  }

  const fromIso = `${isoDateOnly(fromDate)}T00:00:00.000Z`;
  const toExclusive = new Date(toDate);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  const toIsoExclusive = `${isoDateOnly(toExclusive)}T00:00:00.000Z`;

  let permittedSubjects = null;
  if (teacherId) {
    const perm = await loadTeacherPermittedSubjects(serviceRole, teacherId);
    if (!perm.ok) return perm;
    permittedSubjects = perm.permittedSubjects;
  }

  try {
    const [sessions, answers] = await Promise.all([
      fetchSessionsBatch(serviceRole, studentIds, fromIso, toIsoExclusive),
      fetchAnswersBatch(serviceRole, studentIds, fromIso, toIsoExclusive),
    ]);

    let latestSession = null;
    for (const session of sessions) {
      const sid = session.student_id;
      if (!sid || !map.has(sid)) continue;
      if (!isSubjectInPermittedScope(session.subject, permittedSubjects)) continue;
      const row = map.get(sid);
      row.totalSessions += 1;
      const at = session.started_at || session.created_at;
      const day = activityIso(at);
      if (day && (!row.lastActivityAt || day > row.lastActivityAt)) {
        row.lastActivityAt = day;
      }
      if (
        !latestSession ||
        String(at || "") > String(latestSession.started_at || latestSession.created_at || "")
      ) {
        latestSession = session;
      }
    }

    const topicWrong = new Map();
    /** @type {Map<string, Map<string, { subject: string, topic: string, wrong: number }>>} */
    const studentTopicWrong = new Map();
    const sessionTopicById = new Map();
    for (const session of sessions) {
      if (session.id && isSubjectInPermittedScope(session.subject, permittedSubjects)) {
        sessionTopicById.set(session.id, {
          subject: session.subject,
          topic: session.topic,
        });
      }
    }

    for (const answer of answers) {
      const sid = answer.student_id;
      if (!sid || !map.has(sid)) continue;
      const sess = answer.learning_session_id
        ? sessionTopicById.get(answer.learning_session_id)
        : null;
      if (answer.learning_session_id && !sess) continue;
      const row = map.get(sid);
      row.totalAnswers += 1;
      if (answer.is_correct === true) {
        row.correctAnswers += 1;
      } else {
        row.wrongAnswers += 1;
        const sess = answer.learning_session_id
          ? sessionTopicById.get(answer.learning_session_id)
          : null;
        if (sess?.subject && REPORT_AGG_SUBJECTS.includes(sess.subject)) {
          const topic = sess.topic ? String(sess.topic) : "general";
          const key = `${sess.subject}::${topic}`;
          topicWrong.set(key, (topicWrong.get(key) || 0) + 1);
          if (!studentTopicWrong.has(sid)) studentTopicWrong.set(sid, new Map());
          const stMap = studentTopicWrong.get(sid);
          const prev = stMap.get(key) || { subject: sess.subject, topic, wrong: 0 };
          prev.wrong += 1;
          stMap.set(key, prev);
        }
      }
      const at = answer.answered_at || answer.created_at;
      const day = activityIso(at);
      if (day && (!row.lastActivityAt || day > row.lastActivityAt)) {
        row.lastActivityAt = day;
      }
    }

    let cohortAnswers = 0;
    let cohortCorrect = 0;
    let studentsWithActivity = 0;

    for (const row of map.values()) {
      if (row.totalAnswers > 0) {
        row.accuracy = Number(((row.correctAnswers / row.totalAnswers) * 100).toFixed(2));
        cohortAnswers += row.totalAnswers;
        cohortCorrect += row.correctAnswers;
      }
      if (row.totalSessions > 0 || row.totalAnswers > 0) {
        studentsWithActivity += 1;
      }
    }

    let latestSubjectLabel = null;
    if (latestSession?.subject) {
      latestSubjectLabel =
        formatTopicLineHe(latestSession.subject, latestSession.topic) ||
        subjectLabelHe(latestSession.subject);
    }

    if (!latestSubjectLabel && topicWrong.size > 0) {
      const top = [...topicWrong.entries()].sort((a, b) => b[1] - a[1])[0];
      const [key] = top;
      const [subject, topic] = key.split("::");
      latestSubjectLabel =
        formatTopicLineHe(subject, topic) || subjectLabelHe(subject) || null;
    }

    if (teacherId) {
      const classroom = await loadClassroomActivityRollupsForTeacherDashboard({
        serviceRole,
        teacherId,
        studentIds,
        fromDate,
        toDate,
      });
      if (!classroom.ok) return classroom;

      for (const [studentId, rollup] of classroom.byStudentId || []) {
        if (!map.has(studentId)) continue;
        mergeClassroomMetricsIntoDashboardRow(
          map.get(studentId),
          classroomRollupToDashboardMetrics(rollup, permittedSubjects)
        );
      }

      if (!latestSubjectLabel && classroom.latestActivity?.subject) {
        if (isSubjectInPermittedScope(classroom.latestActivity.subject, permittedSubjects)) {
          latestSubjectLabel =
            formatTopicLineHe(classroom.latestActivity.subject, classroom.latestActivity.topic) ||
            subjectLabelHe(classroom.latestActivity.subject);
        }
      }

      cohortAnswers = 0;
      cohortCorrect = 0;
      studentsWithActivity = 0;
      for (const row of map.values()) {
        if (row.totalAnswers > 0) {
          row.accuracy = Number(((row.correctAnswers / row.totalAnswers) * 100).toFixed(2));
          cohortAnswers += row.totalAnswers;
          cohortCorrect += row.correctAnswers;
        } else {
          row.accuracy = null;
        }
        if (row.totalSessions > 0 || row.totalAnswers > 0) {
          studentsWithActivity += 1;
        }
      }
    }

    const cohortAccuracy =
      cohortAnswers > 0 ? (cohortCorrect / cohortAnswers) * 100 : null;
    let classHealthSignal = "no_data";
    if (cohortAccuracy != null) {
      classHealthSignal =
        cohortAccuracy < 55 ? "needs_support" : cohortAccuracy >= 80 ? "strong" : "progressing";
    } else if (studentsWithActivity === 0) {
      classHealthSignal = "no_data";
    }

    const byStudentWeakTopic = new Map();
    for (const [studentId, tmap] of studentTopicWrong) {
      let best = null;
      for (const stat of tmap.values()) {
        if (!best || stat.wrong > best.wrong) best = stat;
      }
      if (best) {
        byStudentWeakTopic.set(studentId, {
          subject: best.subject,
          topic: best.topic,
          wrongCount: best.wrong,
        });
      }
    }

    return {
      ok: true,
      byStudentId: map,
      byStudentWeakTopic,
      latestSubjectLabel,
      classHealthSignal,
      cohortSummary: {
        totalAnswers: cohortAnswers,
        studentsWithActivity,
        accuracy: cohortAccuracy != null ? Number(cohortAccuracy.toFixed(2)) : null,
      },
    };
  } catch (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} classId
 */
export async function loadClassMembershipMap(serviceRole, classId) {
  const { data, error } = await serviceRole
    .from("teacher_class_students")
    .select("id, student_id")
    .eq("class_id", classId)
    .is("removed_at", null);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const membershipByStudentId = new Map();
  for (const row of data || []) {
    membershipByStudentId.set(row.student_id, row.id);
  }
  return { ok: true, membershipByStudentId };
}
