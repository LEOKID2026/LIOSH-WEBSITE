import { isoDateOnly } from "../parent-server/report-data-aggregate.server.js";
import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";
import {
  buildLightweightStudentActivityMap,
  loadClassMembershipMap,
} from "./teacher-dashboard-activity.server.js";
import {
  buildRosterFilterOptions,
  buildStudentClassIdsMap,
} from "./teacher-dashboard-roster.server.js";
import {
  isTeacherDashboardHiddenClass,
  partitionSmokeDashboardRows,
} from "../teacher-portal/teacher-smoke-artifacts.js";
import { listTeacherClasses } from "./teacher-classes.server.js";
import {
  buildGroupedTeacherDashboardClasses,
  loadPerClassMemberAndActivityCounts,
  loadStudentsByMembershipRows,
  loadTeacherClassMembershipRows,
  mergeDirectAndClassMembershipStudents,
} from "./teacher-physical-class.server.js";
import { countStudentsInPhysicalGroup } from "../teacher-portal/teacher-physical-class.js";
import { listTeacherStudents } from "./teacher-students.server.js";
import { buildSchoolMembershipForMe } from "../school-server/school-session.server.js";
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
 * Status badge from lightweight summary only (no full class guidance).
 * @param {Record<string, unknown>|null|undefined} summary
 */
export function deriveStudentStatusBadgeFromSummary(summary) {
  const answers = Number(summary?.totalAnswers) || 0;
  const sessions = Number(summary?.totalSessions) || 0;
  const accuracy = summary?.accuracy != null ? Number(summary.accuracy) : null;

  if (answers === 0 && sessions === 0) {
    return { badge: "פעילות נמוכה", filterKey: "low_activity", sortRank: 4 };
  }
  if (accuracy != null && accuracy >= 80 && answers >= 3) {
    return { badge: "חזק", filterKey: "strong", sortRank: 1 };
  }
  if (accuracy != null && accuracy < 55 && answers >= 3) {
    return { badge: "צריך חיזוק", filterKey: "struggling", sortRank: 5 };
  }
  if (accuracy != null && accuracy < 50 && answers >= 5) {
    return { badge: "במעקב", filterKey: "watch", sortRank: 3 };
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
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   rangeDays?: number,
 * }} input
 */
export async function buildTeacherDashboardPayload(input) {
  const { serviceRole, teacherId, rangeDays = 30 } = input;

  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - rangeDays * 86_400_000);

  const [profileResult, limitsRow] = await Promise.all([
    loadTeacherProfileRow(serviceRole, teacherId),
    loadTeacherLimitsRow(serviceRole, teacherId),
  ]);

  if (!profileResult.ok) return profileResult;
  if (!profileResult.profile) {
    return { ok: false, status: 404, code: "teacher_profile_missing" };
  }
  if (!limitsRow.ok) return limitsRow;
  if (!limitsRow.limits) {
    return { ok: false, status: 404, code: "teacher_profile_missing" };
  }

  const resolvedLimits = await resolveTeacherPlanLimits(serviceRole, limitsRow.limits);
  if (!resolvedLimits.ok) return resolvedLimits;

  const plan = resolvedLimits.limits;
  const studentLimit = plan.studentLimit ?? 20;
  const classLimit = plan.classLimit ?? 10;
  const planCode = plan.planCode ?? "teacher_basic_20";

  const [countersResult, studentsResult, classesResult] = await Promise.all([
    loadTeacherCounters(serviceRole, teacherId),
    listTeacherStudents(serviceRole, teacherId, {
      studentLimit,
      planCode,
      skipGuardianAccess: true,
    }),
    listTeacherClasses(serviceRole, teacherId, {
      classLimit,
      planCode,
    }),
  ]);
  if (!countersResult.ok) return countersResult;
  if (!studentsResult.ok) return studentsResult;
  if (!classesResult.ok) return classesResult;

  const me = formatTeacherMePayload(
    profileResult.profile,
    resolvedLimits.limits,
    countersResult.counters
  );

  const activeClasses = (classesResult.classes || []).filter((c) => !c.isArchived);
  const dashboardClasses = activeClasses.filter(
    (c) => !isTeacherDashboardHiddenClass({ classId: c.classId, name: c.name })
  );

  const classIds = dashboardClasses.map((c) => c.classId).filter(Boolean);

  const countsResult = await loadPerClassMemberAndActivityCounts(serviceRole, classIds);
  if (!countsResult.ok) return countsResult;

  const membershipResult = await loadTeacherClassMembershipRows(serviceRole, classIds);
  if (!membershipResult.ok) return membershipResult;

  const membershipStudentsResult = await loadStudentsByMembershipRows(
    serviceRole,
    membershipResult.rows
  );
  if (!membershipStudentsResult.ok) return membershipStudentsResult;

  const mergedSourceStudents = mergeDirectAndClassMembershipStudents(
    studentsResult.students || [],
    membershipStudentsResult.students || []
  );
  const studentIds = mergedSourceStudents.map((s) => s.studentId);

  const studentClassIdsMap = buildStudentClassIdsMap(membershipResult.rows);

  const groupedPhysical = buildGroupedTeacherDashboardClasses(
    dashboardClasses.map((c) => ({
      classId: c.classId,
      name: c.name,
      gradeLevel: c.gradeLevel,
      subjectFocus: c.subjectFocus,
    })),
    membershipResult.rows,
    countsResult.activityCountMap
  );

  const primaryPhysical =
    groupedPhysical.length > 0
      ? [...groupedPhysical].sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0))[0]
      : null;

  let membershipByStudentId = new Map();
  if (primaryPhysical?.primaryClassId) {
    const members = await loadClassMembershipMap(serviceRole, primaryPhysical.primaryClassId);
    if (!members.ok) return members;
    membershipByStudentId = members.membershipByStudentId;
  }

  const activity = await buildLightweightStudentActivityMap({
    serviceRole,
    studentIds,
    fromDate,
    toDate,
  });
  if (!activity.ok) return activity;

  const students = mergedSourceStudents.map((s) => {
    const rollup = activity.byStudentId.get(s.studentId) || emptySummary();
    const summary = {
      totalSessions: rollup.totalSessions,
      totalAnswers: rollup.totalAnswers,
      correctAnswers: rollup.correctAnswers,
      wrongAnswers: rollup.wrongAnswers,
      accuracy: rollup.accuracy,
      lastActivityAt: rollup.lastActivityAt,
    };
    const status = deriveStudentStatusBadgeFromSummary(summary);
    const classIdsForStudent = studentClassIdsMap.get(s.studentId) || [];
    const isInAnyClass = classIdsForStudent.length > 0;
    return {
      studentId: s.studentId,
      linkId: s.linkId,
      studentFullName: s.studentFullName || s.studentFullNameMasked || "תלמיד",
      gradeLevel: s.gradeLevel,
      gradeLevelLabel: gradeLevelLabelHe(s.gradeLevel),
      isInAnyClass,
      classIds: classIdsForStudent,
      membershipId: membershipByStudentId.get(s.studentId) || null,
      statusBadge: status.badge,
      statusFilterKey: status.filterKey,
      statusSortRank: status.sortRank,
      activitySummary: buildStudentActivitySummaryHe(summary),
      totalSessions: summary.totalSessions,
      totalAnswers: summary.totalAnswers,
      accuracy: summary.accuracy,
      lastActivityAt: summary.lastActivityAt,
    };
  });

  const classCardsRaw = groupedPhysical.map((g) => {
    const ids = g.subjectClassIds.map((s) => s.classId);
    const rosterLinked = countStudentsInPhysicalGroup(students, ids);
    return {
      physicalGroupKey: g.physicalGroupKey,
      classId: g.primaryClassId,
      primaryClassId: g.primaryClassId,
      name: g.name,
      gradeLevel: g.gradeLevel,
      gradeLevelLabel: gradeLevelLabelHe(g.gradeLevel),
      studentCount: g.studentCount,
      rosterStudentCount: rosterLinked > 0 ? rosterLinked : g.studentCount,
      subjectsLabel: g.subjectsLabel,
      subjectLabels: g.subjectLabels,
      subjectClassIds: g.subjectClassIds,
      activityCount: g.activityCount,
      isGrouped: g.isGrouped,
      latestSubjectLabel:
        g.primaryClassId === primaryPhysical?.primaryClassId
          ? activity.latestSubjectLabel
          : null,
      isPrimary: g.primaryClassId === primaryPhysical?.primaryClassId,
    };
  });

  const { visibleClasses: classCards, visibleStudents: visibleStudentsRaw } =
    partitionSmokeDashboardRows(classCardsRaw, students);

  const visiblePrimaryClass =
    classCards.find((c) => c.isPrimary) ||
    (classCards.length
      ? [...classCards].sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0))[0]
      : null);

  const rosterFilters = buildRosterFilterOptions({
    students: visibleStudentsRaw,
    classes: classCards,
  });

  const schoolMem = await buildSchoolMembershipForMe(serviceRole, teacherId);
  if (!schoolMem.ok) {
    return schoolMem;
  }

  const uniqueRosterStudentCount = new Set(
    (membershipResult.rows || []).map((r) => r.student_id).filter(Boolean)
  ).size;

  return {
    ok: true,
    payload: {
      teacher: me.teacher,
      limits: me.limits,
      counters: me.counters,
      schoolMembership: schoolMem.schoolMembership ?? null,
      summary: {
        studentCount: Math.max(visibleStudentsRaw.length, uniqueRosterStudentCount),
        directStudentsCount: visibleStudentsRaw.filter((s) => !s.isInAnyClass).length,
        classCount: classCards.length,
        latestSubjectLabel: activity.latestSubjectLabel,
        range: {
          from: isoDateOnly(fromDate),
          to: isoDateOnly(toDate),
        },
      },
      primaryClassId: visiblePrimaryClass?.classId || null,
      classes: classCards,
      rosterFilters,
      defaultRosterFilterKey: "all",
      students: visibleStudentsRaw,
      classHealthSignal: activity.classHealthSignal,
    },
  };
}

function emptySummary() {
  return {
    totalSessions: 0,
    totalAnswers: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    accuracy: null,
    lastActivityAt: null,
  };
}
