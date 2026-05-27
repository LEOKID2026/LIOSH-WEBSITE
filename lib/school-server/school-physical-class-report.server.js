import { aggregateParentReportPayload, isoDateOnly } from "../parent-server/report-data-aggregate.server.js";
import { mapWithConcurrency } from "../teacher-portal/async-utils.js";
import {
  aggregateClassReportFromStudentPayloads,
} from "../teacher-server/teacher-class-report.server.js";
import {
  loadClassroomActivityRollupsForClassReport,
  mergeClassroomActivityRollupIntoReportPayload,
} from "../teacher-server/classroom-activity-class-report.server.js";
import { loadStudentRowForTeacherReport } from "../teacher-server/teacher-report.server.js";
import { maskStudentFullName } from "../teacher-server/teacher-students.server.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { schoolSubjectLabelHe } from "../school-portal/school-ui.he.js";
import { chunkIds, countRowsByGroupColumn } from "./school-query-chunks.server.js";
import { loadSubjectClassesForPhysicalReport } from "./school-operations.server.js";

const PHYSICAL_REPORT_STUDENT_CONCURRENCY = 6;

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
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   member: { studentId: string, membershipId: string },
 *   fromDate: Date,
 *   toDate: Date,
 * }} input
 */
async function buildPhysicalReportStudentEntry(input) {
  const { serviceRole, member, fromDate, toDate } = input;
  const loaded = await loadStudentRowForTeacherReport(serviceRole, member.studentId);
  if (!loaded.ok) return null;

  const analytics = await aggregateParentReportPayload(
    serviceRole,
    loaded.student,
    fromDate,
    toDate
  );

  const fullName = loaded.student.full_name || member.displayName || "";
  return {
    studentId: member.studentId,
    studentFullName: fullName,
    studentFullNameMasked: maskStudentFullName(fullName),
    membershipId: member.membershipId,
    payload: analytics,
  };
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
 * }} input
 */
export async function buildSchoolPhysicalClassReportPayload(input) {
  const { serviceRole, schoolId, gradeLevel, physicalClassName, fromDate, toDate } = input;
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

  const entries = await mapWithConcurrency(
    roster,
    PHYSICAL_REPORT_STUDENT_CONCURRENCY,
    (member) => buildPhysicalReportStudentEntry({ serviceRole, member, fromDate, toDate })
  );

  const studentPayloadMap = new Map();
  for (const entry of entries.filter(Boolean)) {
    studentPayloadMap.set(entry.studentId, entry);
  }

  const rollupResults = await Promise.all(
    classIds.map((classId) =>
      loadClassroomActivityRollupsForClassReport({
        serviceRole,
        classId,
        studentIds,
        fromDate,
        toDate,
      })
    )
  );

  for (const rollupResult of rollupResults) {
    if (!rollupResult.ok) return rollupResult;
    for (const [studentId, rollup] of rollupResult.byStudentId.entries()) {
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

  const recentActivities = await loadRecentActivitiesForPhysicalClass(
    serviceRole,
    classIds,
    classMetaById
  );

  await Promise.all(
    recentActivities.map(async (act) => {
      const { count } = await serviceRole
        .from("classroom_activity_student_status")
        .select("id", { count: "exact", head: true })
        .eq("activity_id", act.activityId)
        .in("status", ["submitted", "timed_out"]);
      act.submittedCount = count ?? 0;
    })
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
        version: "v1",
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
