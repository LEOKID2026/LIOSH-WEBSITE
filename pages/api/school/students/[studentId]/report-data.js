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
  getTeacherPortalServiceRole,
  rejectIfTeacherPortalDisabled,
  resolveAuthenticatedTeacherUserId,
} from "../../../../../lib/teacher-server/teacher-session.server.js";
import { loadTeacherSchoolMembership } from "../../../../../lib/school-server/school-membership.server.js";
import {
  requireSchoolDataViewerContext,
  sendSchoolApiError,
} from "../../../../../lib/school-server/school-request.server.js";
import {
  parseTeacherReportStudentIdParam,
  resolveTeacherReportDateRange,
} from "../../../../../lib/teacher-server/teacher-report.server.js";
import { stripInternalReportPayloadFields } from "../../../../../lib/parent-server/report-data-aggregate.server.js";
import { setSensitiveReportNoStoreHeaders } from "../../../../../lib/security/sensitive-report-response.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    if (rejectIfTeacherPortalDisabled(res)) return undefined;

    const auth = await resolveAuthenticatedTeacherUserId(req.headers.authorization || "", req);
    if (!auth.ok) {
      return sendSchoolApiError(res, auth.status, auth.code, auth.message);
    }

    const serviceRole = getTeacherPortalServiceRole();
    const membershipResult = await loadTeacherSchoolMembership(serviceRole, auth.teacherUserId, {
      ...(auth.authMethod === "staff_cookie" && auth.schoolId
        ? { preferredSchoolId: auth.schoolId }
        : {}),
    });
    if (!membershipResult.ok) {
      return sendSchoolApiError(
        res,
        membershipResult.status,
        membershipResult.code,
        membershipResult.code
      );
    }
    if (!membershipResult.membership?.schoolId) {
      return sendSchoolApiError(res, 403, "not_authorized", "not_authorized");
    }

    const ctx = await requireSchoolDataViewerContext(res, req, membershipResult.membership.schoolId);
    if (ctx.stopped) return undefined;

    const viewerId = ctx.actorUserId || ctx.managerId;

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "school_student_report_data",
        keys: [`ip:${ip}`, `viewer:${viewerId}`],
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
      viewerId,
      ctx.schoolId,
      studentParsed.studentId
    );

    setSensitiveReportNoStoreHeaders(res);
    return res.status(200).json(stripInternalReportPayloadFields(report.payload));
  } catch (_e) {
    safeApiLog("school_student_report_error", { route: "school/students/report-data" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
