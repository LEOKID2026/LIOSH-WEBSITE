import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../../lib/security/production-guard.js";
import { verifyStudentVisibleToSchool } from "../../../../../lib/school-server/school-scope.server.js";
import {
  getSchoolStudentAdminProfile,
  stripTeacherAdminProfileFields,
} from "../../../../../lib/school-server/school-student-profile.server.js";
import { loadTeacherSchoolMembership } from "../../../../../lib/school-server/school-membership.server.js";
import {
  requireTeacherApiContext,
} from "../../../../../lib/teacher-server/teacher-request.server.js";
import {
  parseTeacherReportStudentIdParam,
  teacherHasReportAccessToStudent,
} from "../../../../../lib/teacher-server/teacher-report.server.js";
import {
  rejectIfTeacherPortalDisabled,
  sendTeacherApiError,
} from "../../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfTeacherPortalDisabled(res)) return undefined;

  const studentParsed = parseTeacherReportStudentIdParam(req.query?.studentId);
  if (!studentParsed.ok) {
    return sendTeacherApiError(res, 400, studentParsed.code, studentParsed.code);
  }

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_student_admin_profile_read",
        keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
        maxAttempts: 60,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const membershipResult = await loadTeacherSchoolMembership(ctx.serviceRole, ctx.teacherId);
    if (!membershipResult.ok) {
      return sendTeacherApiError(
        res,
        membershipResult.status,
        membershipResult.code,
        membershipResult.code
      );
    }
    if (!membershipResult.membership?.schoolId) {
      return sendTeacherApiError(res, 403, "not_authorized", "not_authorized");
    }

    const access = await teacherHasReportAccessToStudent(
      ctx.serviceRole,
      ctx.teacherId,
      studentParsed.studentId
    );
    if (!access.ok) {
      return sendTeacherApiError(res, access.status, access.code, access.code);
    }
    if (!access.allowed) {
      return sendTeacherApiError(res, 403, "not_authorized", "not_authorized");
    }

    const visible = await verifyStudentVisibleToSchool(
      ctx.serviceRole,
      membershipResult.membership.schoolId,
      studentParsed.studentId
    );
    if (!visible.ok) {
      return sendTeacherApiError(res, visible.status, visible.code, visible.code);
    }

    const result = await getSchoolStudentAdminProfile(
      ctx.serviceRole,
      membershipResult.membership.schoolId,
      studentParsed.studentId,
      { forTeacher: true }
    );
    if (!result.ok) {
      return sendTeacherApiError(res, result.status, result.code, result.code);
    }

    const profile = result.profile ? stripTeacherAdminProfileFields(result.profile) : null;

    if (
      profile &&
      ("parent1NationalId" in profile ||
        "parent2NationalId" in profile ||
        "updatedBy" in profile ||
        "updatedByName" in profile)
    ) {
      safeApiLog("teacher_admin_profile_security_regression", {
        studentId: studentParsed.studentId,
      });
      return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
    }

    return res.status(200).json({
      profile,
      isEmpty: result.isEmpty,
    });
  } catch (_e) {
    safeApiLog("teacher_student_admin_profile_error", {
      route: "teacher/students/admin-profile",
    });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
