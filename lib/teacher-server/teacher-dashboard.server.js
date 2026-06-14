import { isoDateOnly } from "../parent-server/report-data-aggregate.server.js";
import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";
import { loadClassMembershipMap } from "./teacher-dashboard-activity.server.js";
import { buildDashboardActivityFromReportBatch } from "./teacher-dashboard-report-activity.server.js";
import {
  buildRosterFilterOptions,
  buildStudentClassIdsMap,
} from "./teacher-dashboard-roster.server.js";
import {
  isTeacherDashboardHiddenClass,
  isSmokeStudentName,
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
  formatTeacherClassSuffixHe,
  isTeacherRecommendableTopicKey,
  resolveTopicLabelHe,
} from "../teacher-portal/teacher-ui.he.js";
import {
  formatTeacherMePayload,
  loadTeacherCounters,
  loadTeacherLimitsRow,
  loadTeacherProfileRow,
  resolveTeacherPlanLimits,
} from "./teacher-session.server.js";
import { deriveStudentStatusBadgeFromSummary } from "../teacher-portal/student-learning-status.js";

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
export { deriveStudentStatusBadgeFromSummary };

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
 * Shared roster/class context — no Supabase activity scan.
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   rangeDays?: number,
 * }} input
 */
async function loadTeacherDashboardContext(input) {
  const { serviceRole, teacherId, rangeDays = 30 } = input;

  const toDate = new Date();
  toDate.setUTCHours(0, 0, 0, 0);
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - (rangeDays - 1));

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

  const hiddenClassIds = new Set(
    dashboardClasses
      .filter((c) => isTeacherDashboardHiddenClass({ classId: c.classId, name: c.name }))
      .map((c) => c.classId)
  );

  const activityStudentIdSet = new Set();
  for (const row of membershipResult.rows || []) {
    if (hiddenClassIds.has(row.class_id)) continue;
    if (row.student_id) activityStudentIdSet.add(row.student_id);
  }
  for (const s of studentsResult.students || []) {
    const name = s.studentFullName || s.studentFullNameMasked || "";
    if (isSmokeStudentName(name)) continue;
    if (s.studentId) activityStudentIdSet.add(s.studentId);
  }
  const activityStudentIds = [...activityStudentIdSet];

  let membershipByStudentId = new Map();
  if (primaryPhysical?.primaryClassId) {
    const members = await loadClassMembershipMap(serviceRole, primaryPhysical.primaryClassId);
    if (!members.ok) return members;
    membershipByStudentId = members.membershipByStudentId;
  }

  const schoolMem = await buildSchoolMembershipForMe(serviceRole, teacherId);
  if (!schoolMem.ok) return schoolMem;

  const uniqueRosterStudentCount = new Set(
    (membershipResult.rows || []).map((r) => r.student_id).filter(Boolean)
  ).size;

  return {
    ok: true,
    serviceRole,
    teacherId,
    fromDate,
    toDate,
    me,
    mergedSourceStudents,
    studentIds,
    activityStudentIds,
    studentClassIdsMap,
    membershipByStudentId,
    groupedPhysical,
    primaryPhysical,
    membershipResult,
    schoolMembership: schoolMem.schoolMembership ?? null,
    uniqueRosterStudentCount,
  };
}

/**
 * @param {Awaited<ReturnType<typeof loadTeacherDashboardContext>>} ctx
 * @param {Awaited<ReturnType<typeof buildDashboardActivityFromReportBatch>>|null} activity
 * @param {{ activityPending?: boolean }} [opts]
 */
function mapDashboardStudents(ctx, activity, opts = {}) {
  return ctx.mergedSourceStudents.map((s) => {
    if (opts.activityPending && !activity) {
      const classIdsForStudent = ctx.studentClassIdsMap.get(s.studentId) || [];
      return {
        studentId: s.studentId,
        linkId: s.linkId,
        studentFullName: s.studentFullName || s.studentFullNameMasked || "ילד/ה",
        gradeLevel: s.gradeLevel,
        gradeLevelLabel: gradeLevelLabelHe(s.gradeLevel),
        isInAnyClass: classIdsForStudent.length > 0,
        classIds: classIdsForStudent,
        membershipId: ctx.membershipByStudentId.get(s.studentId) || null,
        activityPending: true,
        statusBadge: null,
        statusFilterKey: "all",
        statusSortRank: 99,
        activitySummary: null,
        totalSessions: null,
        totalAnswers: null,
        accuracy: null,
        lastActivityAt: null,
      };
    }

    const rollup = activity?.byStudentId?.get(s.studentId) || emptySummary();
    const summary = {
      totalSessions: rollup.totalSessions,
      totalAnswers: rollup.totalAnswers,
      correctAnswers: rollup.correctAnswers,
      wrongAnswers: rollup.wrongAnswers,
      accuracy: rollup.accuracy,
      lastActivityAt: rollup.lastActivityAt,
    };
    const status = deriveStudentStatusBadgeFromSummary(summary);
    const classIdsForStudent = ctx.studentClassIdsMap.get(s.studentId) || [];
    return {
      studentId: s.studentId,
      linkId: s.linkId,
      studentFullName: s.studentFullName || s.studentFullNameMasked || "ילד/ה",
      gradeLevel: s.gradeLevel,
      gradeLevelLabel: gradeLevelLabelHe(s.gradeLevel),
      isInAnyClass: classIdsForStudent.length > 0,
      classIds: classIdsForStudent,
      membershipId: ctx.membershipByStudentId.get(s.studentId) || null,
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
}

/**
 * @param {Awaited<ReturnType<typeof loadTeacherDashboardContext>>} ctx
 * @param {ReturnType<typeof mapDashboardStudents>} students
 * @param {Awaited<ReturnType<typeof buildDashboardActivityFromReportBatch>>|null} activity
 */
function mapDashboardClassCards(ctx, students, activity) {
  return ctx.groupedPhysical.map((g) => {
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
        activity && g.primaryClassId === ctx.primaryPhysical?.primaryClassId
          ? activity.latestSubjectLabel
          : null,
      isPrimary: g.primaryClassId === ctx.primaryPhysical?.primaryClassId,
    };
  });
}

/**
 * @param {Awaited<ReturnType<typeof loadTeacherDashboardContext>>} ctx
 * @param {ReturnType<typeof mapDashboardStudents>} students
 * @param {ReturnType<typeof mapDashboardClassCards>} classCardsRaw
 * @param {Awaited<ReturnType<typeof buildDashboardActivityFromReportBatch>>|null} activity
 * @param {{ activityLoaded?: boolean }} [opts]
 */
function assembleDashboardPayload(ctx, students, classCardsRaw, activity, opts = {}) {
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

  const teacherAttentionSignals = activity
    ? buildTeacherAttentionSignals(
        visibleStudentsRaw,
        activity.byStudentWeakTopic,
        classCards
      )
    : { topAttentionStudents: [] };

  return {
    teacher: ctx.me.teacher,
    limits: ctx.me.limits,
    counters: ctx.me.counters,
    schoolMembership: ctx.schoolMembership,
    activityLoaded: opts.activityLoaded === true,
    summary: {
      studentCount: Math.max(visibleStudentsRaw.length, ctx.uniqueRosterStudentCount),
      directStudentsCount: visibleStudentsRaw.filter((s) => !s.isInAnyClass).length,
      classCount: classCards.length,
      latestSubjectLabel: activity?.latestSubjectLabel ?? null,
      range: {
        from: isoDateOnly(ctx.fromDate),
        to: isoDateOnly(ctx.toDate),
      },
    },
    primaryClassId: visiblePrimaryClass?.classId || null,
    classes: classCards,
    rosterFilters,
    defaultRosterFilterKey: "all",
    students: visibleStudentsRaw,
    classHealthSignal: activity?.classHealthSignal ?? null,
    teacherAttentionSignals,
  };
}

/**
 * Fast dashboard shell — roster, classes, limits; no activity Supabase scan.
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   rangeDays?: number,
 * }} input
 */
export async function buildTeacherDashboardShellPayload(input) {
  const ctx = await loadTeacherDashboardContext(input);
  if (!ctx.ok) return ctx;

  const students = mapDashboardStudents(ctx, null, { activityPending: true });
  const classCardsRaw = mapDashboardClassCards(ctx, students, null);
  const payload = assembleDashboardPayload(ctx, students, classCardsRaw, null, {
    activityLoaded: false,
  });

  return { ok: true, payload };
}

/**
 * Activity/status layer — lightweight activity map + badges (runs after shell).
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   rangeDays?: number,
 * }} input
 */
export async function buildTeacherDashboardActivityPayload(input) {
  const ctx = await loadTeacherDashboardContext(input);
  if (!ctx.ok) return ctx;

  const activity = await buildDashboardActivityFromReportBatch(ctx);
  if (!activity.ok) return activity;

  const students = mapDashboardStudents(ctx, activity);
  const classCardsRaw = mapDashboardClassCards(ctx, students, activity);
  const payload = assembleDashboardPayload(ctx, students, classCardsRaw, activity, {
    activityLoaded: true,
  });

  return { ok: true, payload };
}

/**
 * Full dashboard (shell + activity) — used by tests and ?phase=full API.
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   rangeDays?: number,
 * }} input
 */
export async function buildTeacherDashboardPayload(input) {
  const shell = await buildTeacherDashboardShellPayload(input);
  if (!shell.ok) return shell;

  const activityLayer = await buildTeacherDashboardActivityPayload(input);
  if (!activityLayer.ok) return activityLayer;

  return { ok: true, payload: activityLayer.payload };
}

/**
 * @param {Record<string, unknown>} student
 * @param {Array<Record<string, unknown>>} classCards
 */
function resolveStudentClassDisplayLabel(student, classCards) {
  const classIds = Array.isArray(student.classIds) ? student.classIds : [];
  if (!student.isInAnyClass || classIds.length === 0) return null;
  const idSet = new Set(classIds.filter(Boolean));
  for (const card of classCards || []) {
    const cardIds = new Set(
      [
        card.classId,
        card.primaryClassId,
        ...(Array.isArray(card.subjectClassIds)
          ? card.subjectClassIds.map((s) => s?.classId)
          : []),
      ].filter(Boolean)
    );
    for (const cid of idSet) {
      if (cardIds.has(cid) && card.name) {
        return formatTeacherClassSuffixHe(card.name) || String(card.name);
      }
    }
  }
  return null;
}

/**
 * @param {Array<Record<string, unknown>>} students
 * @param {Map<string, { subject: string, topic: string, wrongCount: number }>} byStudentWeakTopic
 * @param {Array<Record<string, unknown>>} classCards
 */
function buildTeacherAttentionSignals(students, byStudentWeakTopic, classCards) {
  const candidates = [];
  for (const s of students) {
    const answers = Number(s.totalAnswers) || 0;
    const acc = s.accuracy != null ? Number(s.accuracy) : null;
    if (answers < 3 || acc == null || acc >= 65) continue;

    const wt = byStudentWeakTopic?.get(s.studentId);
    const topWeakTopicLabelHe =
      wt && isTeacherRecommendableTopicKey(wt.topic)
        ? resolveTopicLabelHe(wt.subject, wt.topic)
        : null;
    const guidanceSeverityTier =
      acc <= 49 ? "critical" : acc <= 64 ? "needs_reinforcement" : "monitor";
    const riskLevel = acc < 50 && answers >= 5 ? "high" : "moderate";

    candidates.push({
      studentId: s.studentId,
      studentFullNameMasked: s.studentFullName || "ילד/ה",
      classDisplayLabel: resolveStudentClassDisplayLabel(s, classCards),
      guidanceSeverityTier,
      riskLevel,
      topWeakSubject:
        topWeakTopicLabelHe && wt?.subject ? wt.subject : null,
      topWeakTopic:
        topWeakTopicLabelHe && wt?.topic ? wt.topic : null,
      topWeakTopicLabelHe,
      accuracyPct: acc,
      totalAnswers: answers,
    });
  }

  candidates.sort((a, b) => {
    const rank = { high: 0, moderate: 1 };
    const ra = rank[a.riskLevel] ?? 2;
    const rb = rank[b.riskLevel] ?? 2;
    if (ra !== rb) return ra - rb;
    return (a.accuracyPct ?? 100) - (b.accuracyPct ?? 100);
  });

  return { topAttentionStudents: candidates.slice(0, 3) };
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
