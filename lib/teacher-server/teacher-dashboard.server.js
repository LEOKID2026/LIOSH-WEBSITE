import { isoDateOnly } from "../parent-server/report-data-aggregate.server.js";
import { subjectLabelHe, formatTopicLineHe } from "../teacher-portal/teacher-ui.he.js";
import { buildTeacherClassReportPayload } from "./teacher-class-report.server.js";
import { listTeacherClasses } from "./teacher-classes.server.js";
import { listTeacherStudents } from "./teacher-students.server.js";
import {
  formatTeacherMePayload,
  loadTeacherCounters,
  loadTeacherLimitsRow,
  loadTeacherProfileRow,
  resolveTeacherPlanLimits,
} from "./teacher-session.server.js";

const GRADE_LEVEL_HE = {
  g1: "כיתה א׳",
  g2: "כיתה ב׳",
  g3: "כיתה ג׳",
  g4: "כיתה ד׳",
  g5: "כיתה ה׳",
  g6: "כיתה ו׳",
};

/**
 * @param {string|null|undefined} gradeLevel
 */
export function gradeLevelLabelHe(gradeLevel) {
  if (!gradeLevel) return null;
  const key = String(gradeLevel).trim().toLowerCase();
  return GRADE_LEVEL_HE[key] || null;
}

/**
 * @param {string} studentId
 * @param {Record<string, unknown>|null|undefined} guidance
 * @param {Record<string, unknown>|null|undefined} summary
 */
export function deriveStudentStatusBadge(studentId, guidance, summary) {
  const groups = guidance?.suggestedGroups || {};
  const attentionIds = new Set(
    (Array.isArray(guidance?.attentionStudents) ? guidance.attentionStudents : []).map(
      (s) => s.studentId
    )
  );

  const inGroup = (tier) =>
    (Array.isArray(groups[tier]) ? groups[tier] : []).some((s) => s.studentId === studentId);

  if (inGroup("advanced")) {
    return { badge: "חזק", filterKey: "strong", sortRank: 1 };
  }

  if (inGroup("struggling")) {
    const item = groups.struggling.find((s) => s.studentId === studentId);
    if (item?.groupReason === "no_activity_in_range") {
      return { badge: "פעילות נמוכה", filterKey: "low_activity", sortRank: 4 };
    }
    return { badge: "צריך חיזוק", filterKey: "struggling", sortRank: 5 };
  }

  if (attentionIds.has(studentId)) {
    return { badge: "במעקב", filterKey: "watch", sortRank: 3 };
  }

  if (inGroup("on_track")) {
    return { badge: "תקין", filterKey: "ok", sortRank: 2 };
  }

  const answers = Number(summary?.totalAnswers) || 0;
  const accuracy = summary?.accuracy != null ? Number(summary.accuracy) : null;

  if (answers === 0) {
    return { badge: "פעילות נמוכה", filterKey: "low_activity", sortRank: 4 };
  }
  if (accuracy != null && accuracy >= 80) {
    return { badge: "חזק", filterKey: "strong", sortRank: 1 };
  }
  if (accuracy != null && accuracy < 55 && answers >= 3) {
    return { badge: "צריך חיזוק", filterKey: "struggling", sortRank: 5 };
  }

  return { badge: "תקין", filterKey: "ok", sortRank: 2 };
}

/**
 * @param {Record<string, unknown>|null|undefined} summary
 */
export function buildStudentActivitySummaryHe(summary) {
  const answers = Number(summary?.totalAnswers) || 0;
  const sessions = Number(summary?.totalSessions) || 0;
  if (answers === 0 && sessions === 0) {
    return "אין פעילות בתקופה האחרונה";
  }
  const acc = summary?.accuracy != null ? Math.round(Number(summary.accuracy)) : null;
  if (acc != null) {
    return `${sessions} מפגשים · ${answers} תשובות · ${acc}% הצלחה`;
  }
  return `${sessions} מפגשים · ${answers} תשובות`;
}

/**
 * @param {Record<string, unknown>|null|undefined} guidance
 */
function resolveLatestSubjectLabelHe(guidance) {
  const focus = Array.isArray(guidance?.nextLessonFocus) ? guidance.nextLessonFocus : [];
  const first = focus[0];
  if (first?.subject) {
    const line = formatTopicLineHe(first.subject, first.topic);
    if (line) return line;
    return subjectLabelHe(first.subject);
  }
  const topics = Array.isArray(guidance?.priorityTopics) ? guidance.priorityTopics : [];
  const top = topics[0];
  if (top?.subject) {
    const line = formatTopicLineHe(top.subject, top.topic);
    if (line) return line;
    return subjectLabelHe(top.subject);
  }
  return null;
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   rangeDays?: number,
 * }} input
 */
export async function buildTeacherDashboardPayload(input) {
  const { serviceRole, teacherId, rangeDays = 30 } = input;

  const profileResult = await loadTeacherProfileRow(serviceRole, teacherId);
  if (!profileResult.ok) return profileResult;
  if (!profileResult.profile) {
    return { ok: false, status: 404, code: "teacher_profile_missing" };
  }

  const limitsRow = await loadTeacherLimitsRow(serviceRole, teacherId);
  if (!limitsRow.ok) return limitsRow;
  if (!limitsRow.limits) {
    return { ok: false, status: 404, code: "teacher_profile_missing" };
  }

  const resolvedLimits = await resolveTeacherPlanLimits(serviceRole, limitsRow.limits);
  if (!resolvedLimits.ok) return resolvedLimits;

  const countersResult = await loadTeacherCounters(serviceRole, teacherId);
  if (!countersResult.ok) return countersResult;

  const me = formatTeacherMePayload(
    profileResult.profile,
    resolvedLimits.limits,
    countersResult.counters
  );

  const studentsResult = await listTeacherStudents(serviceRole, teacherId, {
    studentLimit: resolvedLimits.limits.studentLimit,
    planCode: resolvedLimits.limits.planCode,
  });
  if (!studentsResult.ok) return studentsResult;

  const classesResult = await listTeacherClasses(serviceRole, teacherId, {
    classLimit: resolvedLimits.limits.classLimit,
    planCode: resolvedLimits.limits.planCode,
  });
  if (!classesResult.ok) return classesResult;

  const activeClasses = (classesResult.classes || []).filter((c) => !c.isArchived);
  const primaryClass =
    activeClasses.length > 0
      ? [...activeClasses].sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0))[0]
      : null;

  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - rangeDays * 86_400_000);

  let classReport = null;
  let guidance = null;
  const summaryByStudentId = new Map();
  const membershipByStudentId = new Map();

  if (primaryClass?.classId) {
    const report = await buildTeacherClassReportPayload({
      serviceRole,
      teacherId,
      classId: primaryClass.classId,
      fromDate,
      toDate,
    });
    if (report.ok) {
      classReport = report.payload;
      guidance = report.payload.teacherGuidanceBlock || null;
      for (const s of report.payload.students || []) {
        summaryByStudentId.set(s.studentId, s.summary || null);
        membershipByStudentId.set(s.studentId, s.membershipId || null);
      }
    }
  }

  const latestSubjectLabel = resolveLatestSubjectLabelHe(guidance);

  const students = (studentsResult.students || []).map((s) => {
    const summary = summaryByStudentId.get(s.studentId) || null;
    const status = deriveStudentStatusBadge(s.studentId, guidance, summary);
    return {
      studentId: s.studentId,
      linkId: s.linkId,
      studentFullName: s.studentFullName || s.studentFullNameMasked || "תלמיד",
      gradeLevel: s.gradeLevel,
      gradeLevelLabel: gradeLevelLabelHe(s.gradeLevel),
      membershipId: membershipByStudentId.get(s.studentId) || null,
      classId: primaryClass?.classId || null,
      statusBadge: status.badge,
      statusFilterKey: status.filterKey,
      statusSortRank: status.sortRank,
      activitySummary: buildStudentActivitySummaryHe(summary),
      totalAnswers: Number(summary?.totalAnswers) || 0,
      accuracy: summary?.accuracy != null ? Number(summary.accuracy) : null,
      lastActivityAt: summary?.lastActivityAt || null,
    };
  });

  const classCards = activeClasses.map((c) => ({
    classId: c.classId,
    name: c.name,
    gradeLevel: c.gradeLevel,
    gradeLevelLabel: gradeLevelLabelHe(c.gradeLevel),
    studentCount: c.studentCount ?? 0,
    latestSubjectLabel: c.classId === primaryClass?.classId ? latestSubjectLabel : null,
    isPrimary: c.classId === primaryClass?.classId,
  }));

  return {
    ok: true,
    payload: {
      teacher: me.teacher,
      limits: me.limits,
      counters: me.counters,
      summary: {
        studentCount: students.length,
        classCount: activeClasses.length,
        latestSubjectLabel,
        range: {
          from: isoDateOnly(fromDate),
          to: isoDateOnly(toDate),
        },
      },
      primaryClassId: primaryClass?.classId || null,
      classes: classCards,
      students,
      classHealthSignal: guidance?.teacherSummary?.classHealthSignal || null,
    },
  };
}
