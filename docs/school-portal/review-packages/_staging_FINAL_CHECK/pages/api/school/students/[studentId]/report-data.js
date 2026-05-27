import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import {
  loadSchoolScopedClassroomActivityRollupForStudentReport,
  mergeClassroomActivityRollupIntoReportPayload,
} from "../../../../../lib/teacher-server/classroom-activity-class-report.server.js";
import { buildTeacherStudentReportPayload } from "../../../../../lib/teacher-server/teacher-report.server.js";
import {
  resolveSchoolReportTeacherForStudent,
  verifyStudentVisibleToSchool,
} from "../../../../../lib/school-server/school-scope.server.js";
import { writeSchoolStudentReportViewedAudit } from "../../../../../lib/school-server/school-reports.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../../lib/school-server/school-request.server.js";
import {
  parseTeacherReportStudentIdParam,
  resolveTeacherReportDateRange,
} from "../../../../../lib/teacher-server/teacher-report.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireSchoolManagerApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const studentParsed = parseTeacherReportStudentIdParam(req.query?.studentId);
    if (!studentParsed.ok) {
      return sendSchoolApiError(res, 400, studentParsed.code, studentParsed.code);
    }

    const visible = await verifyStudentVisibleToSchool(
      ctx.serviceRole,
      ctx.schoolId,
      studentParsed.studentId
    );
    if (!visible.ok) {
      return sendSchoolApiError(res, visible.status, visible.code, visible.code);
    }

    const classIdRaw = req.query?.classId;
    const classId =
      typeof classIdRaw === "string" && classIdRaw.trim() ? classIdRaw.trim() : null;

    const gradeLevelRaw = req.query?.gradeLevel;
    const gradeLevel =
      typeof gradeLevelRaw === "string" && gradeLevelRaw.trim() ? gradeLevelRaw.trim() : null;
    const physicalClassNameRaw = req.query?.physicalClassName;
    const physicalClassName =
      typeof physicalClassNameRaw === "string" && physicalClassNameRaw.trim()
        ? physicalClassNameRaw.trim()
        : null;

    const reportTeacher = await resolveSchoolReportTeacherForStudent(
      ctx.serviceRole,
      ctx.schoolId,
      studentParsed.studentId,
      { classId }
    );
    if (!reportTeacher.ok) {
      return sendSchoolApiError(res, reportTeacher.status, reportTeacher.code, reportTeacher.code);
    }

    const range = resolveTeacherReportDateRange(req.query);
    if (!range.ok) {
      return sendSchoolApiError(res, 400, range.code, range.code);
    }

    const report = await buildTeacherStudentReportPayload(
      {
        serviceRole: ctx.serviceRole,
        teacherId: reportTeacher.teacherId,
        studentId: studentParsed.studentId,
        fromDate: range.fromDate,
        toDate: range.toDate,
      },
      { skipAudit: true, classId }
    );

    if (!report.ok) {
      return sendSchoolApiError(res, report.status, report.code, report.code);
    }

    if (!classId) {
      const schoolRollup = await loadSchoolScopedClassroomActivityRollupForStudentReport({
        serviceRole: ctx.serviceRole,
        schoolId: ctx.schoolId,
        studentId: studentParsed.studentId,
        fromDate: range.fromDate,
        toDate: range.toDate,
        gradeLevel,
        physicalClassName,
      });
      if (!schoolRollup.ok) {
        return sendSchoolApiError(res, schoolRollup.status, schoolRollup.code, schoolRollup.code);
      }
      if (schoolRollup.rollup?.answers) {
        mergeClassroomActivityRollupIntoReportPayload(report.payload, schoolRollup.rollup);
      }
      if (process.env.SCHOOL_STUDENT_REPORT_DEBUG === "1") {
        report.payload._schoolReportDebug = {
          studentId: studentParsed.studentId,
          schoolId: ctx.schoolId,
          classId: null,
          gradeLevel,
          physicalClassName,
          rollupClassIds: schoolRollup.classIds || [],
          classroomActivityCount: schoolRollup.activityCount || 0,
          classroomAnswers: Number(schoolRollup.rollup?.answers || 0),
          summary: {
            totalAnswers: report.payload.summary?.totalAnswers,
            totalSessions: report.payload.summary?.totalSessions,
            accuracy: report.payload.summary?.accuracy,
          },
        };
      }
    }

    await writeSchoolStudentReportViewedAudit(
      ctx.serviceRole,
      ctx.managerId,
      ctx.schoolId,
      studentParsed.studentId
    );

    return res.status(200).json(report.payload);
  } catch (_e) {
    safeApiLog("school_student_report_error", { route: "school/students/report-data" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
