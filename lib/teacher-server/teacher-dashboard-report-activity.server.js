/**
 * Dashboard activity layer aligned with teacher student report batch aggregation.
 */

import {
  mergeClassroomActivityRollupIntoReportPayload,
  loadClassroomActivityRollupsForTeacherDashboard,
} from "./classroom-activity-class-report.server.js";
import { buildRosterStudentReportEntries } from "./roster-report-student-entries.server.js";
import {
  filterReportByPermittedSubjects,
  isSubjectInPermittedScope,
  loadTeacherPermittedSubjects,
} from "../school-server/school-subjects.server.js";
import {
  formatTopicLineHe,
  isTeacherRecommendableTopicKey,
  subjectLabelHe,
} from "../teacher-portal/teacher-ui.he.js";

/**
 * @param {Array<{ date?: string, sessions?: number, answers?: number }>|null|undefined} daily
 */
function lastActivityFromDaily(daily) {
  if (!Array.isArray(daily) || !daily.length) return null;
  const sorted = [...daily].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  for (const day of sorted) {
    if ((Number(day.sessions) || 0) > 0 || (Number(day.answers) || 0) > 0) {
      return day.date || null;
    }
  }
  return sorted[0]?.date || null;
}

/**
 * @param {Awaited<ReturnType<typeof import("./teacher-dashboard.server.js").loadTeacherDashboardContext>>} ctx
 */
export async function buildDashboardActivityFromReportBatch(ctx) {
  const members = ctx.mergedSourceStudents.map((s) => ({
    studentId: s.studentId,
    membershipId: ctx.membershipByStudentId.get(s.studentId) || s.linkId || s.studentId,
    displayName: s.studentFullName || s.studentFullNameMasked,
  }));
  const studentIds = members.map((m) => m.studentId).filter(Boolean);

  const [perm, classroom, rosterBuilt] = await Promise.all([
    loadTeacherPermittedSubjects(ctx.serviceRole, ctx.teacherId),
    loadClassroomActivityRollupsForTeacherDashboard({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      studentIds,
      fromDate: ctx.fromDate,
      toDate: ctx.toDate,
    }),
    buildRosterStudentReportEntries({
      serviceRole: ctx.serviceRole,
      members,
      fromDate: ctx.fromDate,
      toDate: ctx.toDate,
    }),
  ]);

  if (!perm.ok) return perm;
  if (!classroom.ok) return classroom;
  if (!rosterBuilt.ok) return rosterBuilt;

  /** @type {Map<string, { totalSessions: number, totalAnswers: number, correctAnswers: number, wrongAnswers: number, accuracy: number|null, lastActivityAt: string|null }>} */
  const byStudentId = new Map();
  /** @type {Map<string, { subject: string, topic: string, wrongCount: number }>} */
  const byStudentWeakTopic = new Map();

  for (const entry of rosterBuilt.entries) {
    let payload = entry.payload;
    const rollup = classroom.byStudentId?.get(entry.studentId);
    if (rollup?.answers) {
      mergeClassroomActivityRollupIntoReportPayload(payload, rollup);
    }
    if (perm.permittedSubjects) {
      payload = filterReportByPermittedSubjects(payload, perm.permittedSubjects);
    }

    const sum = payload?.summary || {};
    byStudentId.set(entry.studentId, {
      totalSessions: Number(sum.totalSessions) || 0,
      totalAnswers: Number(sum.totalAnswers) || 0,
      correctAnswers: Number(sum.correctAnswers) || 0,
      wrongAnswers: Number(sum.wrongAnswers) || 0,
      accuracy: sum.accuracy != null ? Number(sum.accuracy) : null,
      lastActivityAt: lastActivityFromDaily(payload?.dailyActivity),
    });

    const mistakes = payload?.recentMistakes || [];
    for (const mistake of mistakes) {
      if (!mistake?.subject || !mistake?.topic) continue;
      if (!isTeacherRecommendableTopicKey(mistake.topic)) continue;
      byStudentWeakTopic.set(entry.studentId, {
        subject: mistake.subject,
        topic: mistake.topic,
        wrongCount: Number(mistake.count) || 1,
      });
      break;
    }
  }

  let latestSubjectLabel = null;
  if (classroom.latestActivity?.subject) {
    if (isSubjectInPermittedScope(classroom.latestActivity.subject, perm.permittedSubjects)) {
      latestSubjectLabel =
        formatTopicLineHe(classroom.latestActivity.subject, classroom.latestActivity.topic) ||
        subjectLabelHe(classroom.latestActivity.subject);
    }
  }

  let cohortAnswers = 0;
  let cohortCorrect = 0;
  let studentsWithActivity = 0;
  for (const row of byStudentId.values()) {
    if (row.totalAnswers > 0) {
      cohortAnswers += row.totalAnswers;
      cohortCorrect += row.correctAnswers;
    }
    if (row.totalSessions > 0 || row.totalAnswers > 0) {
      studentsWithActivity += 1;
    }
  }

  const cohortAccuracy = cohortAnswers > 0 ? (cohortCorrect / cohortAnswers) * 100 : null;
  let classHealthSignal = "no_data";
  if (cohortAccuracy != null) {
    classHealthSignal =
      cohortAccuracy < 55 ? "needs_support" : cohortAccuracy >= 80 ? "strong" : "progressing";
  } else if (studentsWithActivity === 0) {
    classHealthSignal = "no_data";
  }

  return {
    ok: true,
    byStudentId,
    byStudentWeakTopic,
    latestSubjectLabel,
    classHealthSignal,
    cohortSummary: {
      totalAnswers: cohortAnswers,
      studentsWithActivity,
      accuracy: cohortAccuracy != null ? Number(cohortAccuracy.toFixed(2)) : null,
    },
  };
}
