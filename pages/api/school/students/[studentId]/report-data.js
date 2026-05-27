import { safeApiLog } from "../../../../../lib/security/safe-log.js";
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
