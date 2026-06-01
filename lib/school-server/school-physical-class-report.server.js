import { isoDateOnly } from "../parent-server/report-data-aggregate.server.js";
import {
  aggregateClassReportFromStudentPayloads,
} from "../teacher-server/teacher-class-report.server.js";
import { buildClassTeacherGuidanceV2 } from "../teacher-server/teacher-guidance-v2.server.js";
import {
  batchCountSubmittedActivityStatuses,
  loadClassroomActivityRollupsForMultipleClassReports,
  mergeClassroomActivityRollupIntoReportPayload,
} from "../teacher-server/classroom-activity-class-report.server.js";
import { buildRosterStudentReportEntries } from "../teacher-server/roster-report-student-entries.server.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { getCachedLightweightStudentActivityMap } from "./school-browse-activity-cache.server.js";
import { schoolSubjectLabelHe } from "../school-portal/school-ui.he.js";
import { chunkIds, countRowsByGroupColumn } from "./school-query-chunks.server.js";
import { loadSubjectClassesForPhysicalReport } from "./school-operations.server.js";

const PHYSICAL_GUIDANCE_TIER_RANK = {
  critical_class: 0,
  class_needs_reinforcement: 1,
  class_monitor: 2,
  class_on_track: 3,
};

function physicalGuidanceTierRank(tier) {
  if (tier == null) return 99;
  return PHYSICAL_GUIDANCE_TIER_RANK[tier] ?? 50;
}

function cohortSummaryFromActivityMap(byStudentId, studentIds) {
  let totalSessions = 0;
  let totalAnswers = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;
  let studentsWithActivity = 0;

  for (const sid of studentIds) {
    const row = byStudentId.get(sid);
    if (!row) continue;
    totalSessions += Number(row.totalSessions) || 0;
    totalAnswers += Number(row.totalAnswers) || 0;
    correctAnswers += Number(row.correctAnswers) || 0;
    wrongAnswers += Number(row.wrongAnswers) || 0;
    if ((row.totalSessions || 0) > 0 || (row.totalAnswers || 0) > 0) {
      studentsWithActivity += 1;
    }
  }

  return {
    totalSessions,
    totalAnswers,
    correctAnswers,
    wrongAnswers,
    accuracy:
      totalAnswers > 0 ? Number(((correctAnswers / totalAnswers) * 100).toFixed(2)) : 0,
    studentsWithActivity,
  };
}

/**
 * Fast shell payload — no full roster aggregate, guidance blocks, or student summaries.
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   schoolId: string,
 *   gradeLevel: string,
 *   physicalClassName: string,
 *   fromDate: Date,
 *   toDate: Date,
 *   resolved: Awaited<ReturnType<typeof loadSubjectClassesForPhysicalReport>>,
 * }} input
 */
async function buildSchoolPhysicalClassReportSummaryPayload(input) {
  const { serviceRole, schoolId, gradeLevel, physicalClassName, fromDate, toDate, resolved } =
    input;
  const physName = String(physicalClassName || "").trim();
  const grade = String(gradeLevel || "").trim();
  const subjectRows = resolved.rows;
  const classIds = subjectRows.map((r) => r.classId);
  const classMetaById = new Map(
    subjectRows.map((r) => [
      r.classId,
      {
        classId: r.classId,
        subjectFocus: r.subjectFocus,
        teacherId: r.teacherId,
        teacherName: r.teacherName,
      },
    ])
  );

  const [rosterResult, memberCountsRes, activityCountsRes] = await Promise.all([
    loadPhysicalClassRoster(serviceRole, classIds),
    countRowsByGroupColumn(
      serviceRole,
      "teacher_class_students",
      "class_id",
      "class_id",
      classIds,
      (q) => q.is("removed_at", null)
    ),
    countRowsByGroupColumn(
      serviceRole,
      "classroom_activities",
      "class_id",
      "class_id",
      classIds,
      (q) => q.neq("status", "archived")
    ),
  ]);

  if (!rosterResult.ok) return rosterResult;
  if (!memberCountsRes.ok || !activityCountsRes.ok) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  const roster = rosterResult.roster;
  const studentIds = roster.map((m) => m.studentId);

  const activity = await getCachedLightweightStudentActivityMap({
    serviceRole,
    teacherId: null,
    studentIds,
    fromDate,
    toDate,
  });
  if (!activity.ok) return activity;

  const cohortSummary = cohortSummaryFromActivityMap(activity.byStudentId, studentIds);

  const subjectBreakdown = subjectRows.map((row) => ({
    classId: row.classId,
    subjectFocus: row.subjectFocus,
    subjectLabelHe: schoolSubjectLabelHe(row.subjectFocus),
    teacherId: row.teacherId,
    teacherName: row.teacherName,
    memberCount: memberCountsRes.counts.get(row.classId) ?? 0,
    activityCount: activityCountsRes.counts.get(row.classId) ?? 0,
    accuracy: null,
    totalAnswers: null,
  }));

  const recentActivities = await loadRecentActivitiesForPhysicalClass(
    serviceRole,
    classIds,
    classMetaById
  );

  const rosterOut = roster.map((m) => ({
    studentId: m.studentId,
    displayName: m.displayName,
    physicalClassName: physName,
    gradeLevel: m.gradeLevel || grade,
  }));

  return {
    ok: true,
    payload: {
      ok: true,
      reportMeta: {
        audience: "school_manager",
        source: "physical_class_report",
        version: "v2",
        loadPhase: "summary",
      },
      physicalClass: {
        name: physName,
        gradeLevel: grade,
        schoolId,
      },
      subjectClassIds: classIds,
      subjectBreakdown,
      roster: rosterOut,
      rosterSummary: {
        studentCount: rosterOut.length,
        activeMemberCount: rosterOut.length,
      },
      cohortSummary,
      recentActivities,
      range: {
        from: isoDateOnly(fromDate),
        to: isoDateOnly(toDate),
      },
    },
  };
}

/**
 * @param {Array<{ guidanceSeverityTier?: string|null, cohortAccuracyPct?: number|null }>} blocks
 */
function computePhysicalClassGuidanceSeverityTier(blocks) {
  let worst = null;
  let worstRank = 99;
  for (const block of blocks) {
    const tier = block?.guidanceSeverityTier ?? null;
    const rank = physicalGuidanceTierRank(tier);
    if (rank < worstRank) {
      worstRank = rank;
      worst = tier;
    }
  }
  return worst;
}

/**
 * @param {Array<Record<string, unknown>>} studentPayloads
 * @param {string} subjectFocus
 */
function buildPhysicalSubjectGuidanceBlock(studentPayloads, subjectFocus, row) {
  if (!row?.teacherId) {
    return {
      subjectFocus: row.subjectFocus,
      subjectLabelHe: schoolSubjectLabelHe(row.subjectFocus),
      classId: row.classId,
      teacherId: null,
      teacherName: row.teacherName || null,
      guidanceSeverityTier: null,
      cohortAccuracyPct: null,
      classRecommendationUnits: [],
      insufficientData: true,
    };
  }

  try {
    const scopedAgg = aggregateClassReportFromStudentPayloads(studentPayloads, {
      scopeSubjects: new Set([subjectFocus]),
    });
    const guidance = buildClassTeacherGuidanceV2(scopedAgg, {
      subjectScope: subjectFocus,
      studentPayloads,
    });
    const subjData = scopedAgg.subjects?.[subjectFocus];
    return {
      subjectFocus,
      subjectLabelHe: schoolSubjectLabelHe(subjectFocus),
      classId: row.classId,
      teacherId: row.teacherId,
      teacherName: row.teacherName || null,
      guidanceSeverityTier: guidance.guidanceSeverityTier ?? null,
      cohortAccuracyPct:
        guidance.cohortStats?.accuracyPct != null
          ? Number(guidance.cohortStats.accuracyPct)
          : subjData?.accuracy != null
            ? Number(subjData.accuracy)
            : null,
      classRecommendationUnits: guidance.classRecommendationUnits || [],
      insufficientData: Boolean(guidance.insufficientData),
    };
  } catch {
    return {
      subjectFocus,
      subjectLabelHe: schoolSubjectLabelHe(subjectFocus),
      classId: row.classId,
      teacherId: row.teacherId,
      teacherName: row.teacherName || null,
      guidanceSeverityTier: null,
      cohortAccuracyPct: null,
      classRecommendationUnits: [],
      insufficientData: true,
    };
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string[]} classIds
 */
async function loadPhysicalClassRoster(serviceRole, classIds) {
  const rosterMap = new Map();

  for (const idChunk of chunkIds(classIds, 80)) {
    const { data, error } = await serviceRole
      .from("teacher_class_students")
      .select("id, class_id, student_id, students(id, full_name, grade_level)")
      .in("class_id", idChunk)
      .is("removed_at", null);

    if (error) {
      if (isDbSchemaNotReadyError(error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }

    for (const row of data || []) {
      const studentId = row.student_id;
      if (!studentId || rosterMap.has(studentId)) continue;
      const studentRow = row.students && typeof row.students === "object" ? row.students : null;
      rosterMap.set(studentId, {
        studentId,
        membershipId: row.id,
        displayName: studentRow?.full_name || null,
        gradeLevel: studentRow?.grade_level || null,
      });
    }
  }

  return { ok: true, roster: [...rosterMap.values()] };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string[]} classIds
 * @param {Map<string, { classId: string, subjectFocus: string, teacherId: string, teacherName: string|null }>} classMetaById
 */
async function loadRecentActivitiesForPhysicalClass(serviceRole, classIds, classMetaById) {
  if (!classIds.length) return [];

  const { data, error } = await serviceRole
    .from("classroom_activities")
    .select("id, class_id, title, subject, mode, status, created_at, activated_at, closed_at")
    .in("class_id", classIds)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data?.length) return [];

  return data
    .filter((row) => classMetaById.has(row.class_id))
    .map((row) => {
      const meta = classMetaById.get(row.class_id);
      return {
        activityId: row.id,
        classId: row.class_id,
        title: row.title,
        subject: row.subject,
        subjectFocus: meta?.subjectFocus || row.subject,
        subjectLabelHe: schoolSubjectLabelHe(meta?.subjectFocus || row.subject),
        teacherId: meta?.teacherId || null,
        teacherName: meta?.teacherName || null,
        mode: row.mode,
        status: row.status,
        createdAt: row.created_at,
        activatedAt: row.activated_at,
        submittedCount: 0,
        accuracy: null,
      };
    });
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   schoolId: string,
 *   gradeLevel: string,
 *   physicalClassName: string,
 *   fromDate: Date,
 *   toDate: Date,
 *   loadPhase?: "summary"|"full",
 * }} input
 */
export async function buildSchoolPhysicalClassReportPayload(input) {
  const { serviceRole, schoolId, gradeLevel, physicalClassName, fromDate, toDate } = input;
  const loadPhase = input.loadPhase === "summary" ? "summary" : "full";
  const physName = String(physicalClassName || "").trim();
  const grade = String(gradeLevel || "").trim();

  if (!physName || !grade) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const resolved = await loadSubjectClassesForPhysicalReport(
    serviceRole,
    schoolId,
    physName,
    grade
  );
  if (!resolved.ok) return resolved;

  if (loadPhase === "summary") {
    return buildSchoolPhysicalClassReportSummaryPayload({
      serviceRole,
      schoolId,
      gradeLevel: grade,
      physicalClassName: physName,
      fromDate,
      toDate,
      resolved,
    });
  }

  const subjectRows = resolved.rows;
  const classIds = subjectRows.map((r) => r.classId);
  const classMetaById = new Map(
    subjectRows.map((r) => [
      r.classId,
      {
        classId: r.classId,
        subjectFocus: r.subjectFocus,
        teacherId: r.teacherId,
        teacherName: r.teacherName,
      },
    ])
  );

  const [rosterResult, memberCountsRes, activityCountsRes] = await Promise.all([
    loadPhysicalClassRoster(serviceRole, classIds),
    countRowsByGroupColumn(
      serviceRole,
      "teacher_class_students",
      "class_id",
      "class_id",
      classIds,
      (q) => q.is("removed_at", null)
    ),
    countRowsByGroupColumn(
      serviceRole,
      "classroom_activities",
      "class_id",
      "class_id",
      classIds,
      (q) => q.neq("status", "archived")
    ),
  ]);

  if (!rosterResult.ok) return rosterResult;
  if (!memberCountsRes.ok) {
    if (isDbSchemaNotReadyError(memberCountsRes.error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
  if (!activityCountsRes.ok) {
    if (isDbSchemaNotReadyError(activityCountsRes.error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const roster = rosterResult.roster;
  const studentIds = roster.map((m) => m.studentId);

  const rosterBuilt = await buildRosterStudentReportEntries({
    serviceRole,
    members: roster.map((m) => ({
      studentId: m.studentId,
      membershipId: m.membershipId,
      displayName: m.displayName,
    })),
    fromDate,
    toDate,
  });
  if (!rosterBuilt.ok) return rosterBuilt;

  const studentPayloadMap = new Map();
  for (const entry of rosterBuilt.entries) {
    studentPayloadMap.set(entry.studentId, entry);
  }

  const multiRollups = await loadClassroomActivityRollupsForMultipleClassReports({
    serviceRole,
    classIds,
    studentIds,
    fromDate,
    toDate,
  });
  if (!multiRollups.ok) return multiRollups;

  for (const classId of classIds) {
    const classRollup = multiRollups.byClassId.get(classId);
    if (!classRollup) continue;
    for (const [studentId, rollup] of classRollup.byStudentId.entries()) {
      const entry = studentPayloadMap.get(studentId);
      if (entry && rollup?.answers) {
        mergeClassroomActivityRollupIntoReportPayload(entry.payload, rollup);
      }
    }
  }

  const studentPayloads = [...studentPayloadMap.values()];
  const aggregated = aggregateClassReportFromStudentPayloads(studentPayloads);

  const studentSummaries = studentPayloads.map((entry) => ({
    studentId: entry.studentId,
    studentFullName: entry.studentFullName,
    studentFullNameMasked: entry.studentFullNameMasked,
    membershipId: entry.membershipId,
    summary: entry.payload.summary || null,
    guardianAccessSummary: null,
  }));

  const subjectBreakdown = subjectRows.map((row) => {
    const subjData = aggregated.subjects?.[row.subjectFocus];
    const answers = Number(subjData?.answers) || 0;
    const accuracy = answers > 0 ? Number(subjData?.accuracy) || 0 : null;
    return {
      classId: row.classId,
      subjectFocus: row.subjectFocus,
      subjectLabelHe: schoolSubjectLabelHe(row.subjectFocus),
      teacherId: row.teacherId,
      teacherName: row.teacherName,
      memberCount: memberCountsRes.counts.get(row.classId) ?? 0,
      activityCount: activityCountsRes.counts.get(row.classId) ?? 0,
      accuracy,
      totalAnswers: answers,
    };
  });

  const subjectGuidanceBlocks = subjectRows
    .map((row) =>
      buildPhysicalSubjectGuidanceBlock(studentPayloads, row.subjectFocus, row)
    )
    .sort((a, b) => {
      const tierDiff =
        physicalGuidanceTierRank(a.guidanceSeverityTier) -
        physicalGuidanceTierRank(b.guidanceSeverityTier);
      if (tierDiff !== 0) return tierDiff;
      const accA = a.cohortAccuracyPct != null ? Number(a.cohortAccuracyPct) : 999;
      const accB = b.cohortAccuracyPct != null ? Number(b.cohortAccuracyPct) : 999;
      return accA - accB;
    });

  const physicalClassGuidanceSeverityTier =
    computePhysicalClassGuidanceSeverityTier(subjectGuidanceBlocks);

  const recentActivities = await loadRecentActivitiesForPhysicalClass(
    serviceRole,
    classIds,
    classMetaById
  );

  try {
    const activityIds = recentActivities.map((act) => act.activityId).filter(Boolean);
    const submitCounts = await batchCountSubmittedActivityStatuses(serviceRole, activityIds);
    for (const act of recentActivities) {
      act.submittedCount = submitCounts.get(act.activityId) ?? 0;
    }
  } catch (e) {
    if (e?.code === "db_schema_not_ready") {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const rosterOut = roster.map((m) => ({
    studentId: m.studentId,
    displayName: m.displayName,
    physicalClassName: physName,
    gradeLevel: m.gradeLevel || grade,
  }));

  return {
    ok: true,
    payload: {
      ok: true,
      reportMeta: {
        audience: "school_manager",
        source: "physical_class_report",
        version: "v2",
        loadPhase: "full",
      },
      subjectGuidanceBlocks,
      physicalClassGuidanceSeverityTier,
      physicalClass: {
        name: physName,
        gradeLevel: grade,
        schoolId,
      },
      subjectClassIds: classIds,
      subjectBreakdown,
      roster: rosterOut,
      rosterSummary: {
        studentCount: rosterOut.length,
        activeMemberCount: rosterOut.length,
      },
      cohortSummary: aggregated.cohortSummary,
      subjects: aggregated.subjects,
      weaknessTopics: aggregated.weaknessTopics,
      attentionList: aggregated.attentionList,
      recentActivity: aggregated.recentActivity,
      recentActivities,
      students: studentSummaries,
      range: {
        from: isoDateOnly(fromDate),
        to: isoDateOnly(toDate),
      },
    },
  };
}
