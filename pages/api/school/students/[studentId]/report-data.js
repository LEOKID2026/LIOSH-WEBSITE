import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../../lib/security/production-guard.js";
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
import { stripInternalReportPayloadFields } from "../../../../../lib/parent-server/report-data-aggregate.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireSchoolManagerApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "school_student_report_data",
        keys: [`ip:${ip}`, `manager:${ctx.managerId}`],
        maxAttempts: 30,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendSchoolApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

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
      { skipAudit: true, classId, gradeLevel, physicalClassName }
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

    return res.status(200).json(stripInternalReportPayloadFields(report.payload));
  } catch (_e) {
    safeApiLog("school_student_report_error", { route: "school/students/report-data" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
