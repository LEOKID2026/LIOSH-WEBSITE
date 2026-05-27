#!/usr/bin/env node
/**
 * Diagnose student report empty-data regression for a named student.
 * Run: node --env-file=.env.local scripts/school-portal/diagnose-student-report-context.mjs [studentName]
 */
import { createServiceRole } from "./demo-school-lib.mjs";
import { buildTeacherStudentReportPayload } from "../../lib/teacher-server/teacher-report.server.js";
import {
  loadSchoolScopedClassroomActivityRollupForStudentReport,
  mergeClassroomActivityRollupIntoReportPayload,
} from "../../lib/teacher-server/classroom-activity-class-report.server.js";
import { aggregateParentReportPayload } from "../../lib/parent-server/report-data-aggregate.server.js";
import { schoolCacheKey } from "../../lib/school-portal/school-portal-cache.js";
import { physicalClassName } from "./demo-school-data.mjs";

const DEMO_SCHOOL_ID = "bb4e5984-d95f-438f-a465-e1a8208ea7de";

const arg1 = process.argv[2] || "";
const arg2 = process.argv[3] || "";
const STUDENT_ID_ARG = /^[0-9a-f-]{36}$/i.test(arg1) ? arg1 : /^[0-9a-f-]{36}$/i.test(arg2) ? arg2 : null;
const STUDENT_NAME = STUDENT_ID_ARG ? "אוהד מזרחי" : arg1 || "אוהד מזרחי";

async function countClassroomAnswers(admin, classId, studentId) {
  const { data: acts } = await admin
    .from("classroom_activities")
    .select("id")
    .eq("class_id", classId)
    .neq("status", "archived");
  const ids = (acts || []).map((a) => a.id);
  if (!ids.length) return 0;
  const { data: st } = await admin
    .from("classroom_activity_student_status")
    .select("answers_count")
    .in("activity_id", ids)
    .eq("student_id", studentId);
  return (st || []).reduce((s, r) => s + Number(r.answers_count || 0), 0);
}

async function main() {
  const admin = createServiceRole();

  let student = null;
  if (STUDENT_ID_ARG) {
    const { data } = await admin
      .from("students")
      .select("id, full_name, grade_level, is_active")
      .eq("id", STUDENT_ID_ARG)
      .maybeSingle();
    student = data;
  } else {
    const { data: students } = await admin
      .from("students")
      .select("id, full_name, grade_level, is_active")
      .ilike("full_name", `%${STUDENT_NAME.split(" ").pop()}%`)
      .limit(20);
    student = (students || []).find((s) => String(s.full_name || "").includes(STUDENT_NAME.split(" ")[0]));
  }
  if (!student?.id) {
    throw new Error(`Student not found matching "${STUDENT_NAME}"`);
  }

  const targetName = physicalClassName(1, 2);
  const { data: cls } = await admin
    .from("teacher_classes")
    .select("id, name, subject_focus, teacher_id")
    .eq("name", targetName)
    .eq("subject_focus", "geometry")
    .maybeSingle();

  const toDate = new Date();
  toDate.setUTCHours(0, 0, 0, 0);
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);

  const baseAgg = await aggregateParentReportPayload(admin, student, fromDate, toDate);

  const withoutClassId = await buildTeacherStudentReportPayload(
    {
      serviceRole: admin,
      teacherId: cls?.teacher_id,
      studentId: student.id,
      fromDate,
      toDate,
    },
    { skipAudit: true }
  );

  const withClassId = cls?.id
    ? await buildTeacherStudentReportPayload(
        {
          serviceRole: admin,
          teacherId: cls.teacher_id,
          studentId: student.id,
          fromDate,
          toDate,
        },
        { skipAudit: true, classId: cls.id }
      )
    : null;

  const classroomAnswers = cls?.id ? await countClassroomAnswers(admin, cls.id, student.id) : 0;

  const toDateNorm = new Date(toDate);
  toDateNorm.setUTCHours(0, 0, 0, 0);
  const fromDateNorm = new Date(toDateNorm);
  fromDateNorm.setUTCDate(fromDateNorm.getUTCDate() - 29);

  const schoolRollup = await loadSchoolScopedClassroomActivityRollupForStudentReport({
    serviceRole: admin,
    schoolId: DEMO_SCHOOL_ID,
    studentId: student.id,
    fromDate: fromDateNorm,
    toDate: toDateNorm,
  });

  let schoolMerged = null;
  if (withoutClassId.ok && schoolRollup.ok && schoolRollup.rollup?.answers) {
    schoolMerged = structuredClone(withoutClassId.payload);
    mergeClassroomActivityRollupIntoReportPayload(schoolMerged, schoolRollup.rollup);
  }

  const schoolId = DEMO_SCHOOL_ID;
  const pathWithClass = `/api/school/students/${student.id}/report-data?windowDays=30&classId=${cls?.id || ""}`;
  const pathWithoutClass = `/api/school/students/${student.id}/report-data?windowDays=30`;

  console.log(
    JSON.stringify(
      {
        student: { id: student.id, full_name: student.full_name },
        geometryClass: cls ? { id: cls.id, name: cls.name, teacher_id: cls.teacher_id } : null,
        apiPaths: {
          withoutClassId: pathWithoutClass,
          withClassId: pathWithClass,
        },
        cacheKeys: {
          withoutClassId: schoolCacheKey(schoolId, pathWithoutClass),
          withClassId: schoolCacheKey(schoolId, pathWithClass),
        },
        db: {
          baseLearningAnswers: Number(baseAgg.summary?.totalAnswers || 0),
          classroomAnswersInGeometryClass: classroomAnswers,
        },
        reports: {
          withoutClassId: withoutClassId.ok
            ? {
                totalAnswers: withoutClassId.payload.summary?.totalAnswers,
                totalSessions: withoutClassId.payload.summary?.totalSessions,
                accuracy: withoutClassId.payload.summary?.accuracy,
              }
            : { error: withoutClassId.code },
          withClassId: withClassId?.ok
            ? {
                totalAnswers: withClassId.payload.summary?.totalAnswers,
                totalSessions: withClassId.payload.summary?.totalSessions,
                accuracy: withClassId.payload.summary?.accuracy,
              }
            : withClassId
              ? { error: withClassId.code }
              : null,
          schoolScopedMerge: schoolMerged
            ? {
                rollupClassIds: schoolRollup.classIds,
                classroomAnswers: schoolRollup.rollup?.answers,
                classroomActivityCount: schoolRollup.activityCount,
                totalAnswers: schoolMerged.summary?.totalAnswers,
                totalSessions: schoolMerged.summary?.totalSessions,
                accuracy: schoolMerged.summary?.accuracy,
              }
            : null,
        },
        diagnosis:
          classroomAnswers > 0 && Number(withClassId?.payload?.summary?.totalAnswers || 0) === 0
            ? "BUG: classroom data exists but classId merge failed"
            : classroomAnswers > 0 && Number(schoolMerged?.summary?.totalAnswers || 0) > 0
              ? "FIXED: school-scoped merge without classId works"
              : classroomAnswers > 0 && Number(withoutClassId.payload?.summary?.totalAnswers || 0) === 0
                ? "BUG: school-scoped merge still zero"
                : "OK",
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
