import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../../lib/security/production-guard.js";
import { verifyStudentVisibleToSchool } from "../../../../../lib/school-server/school-scope.server.js";
import {
  parseSchoolStudentNameInput,
  updateSchoolStudentName,
} from "../../../../../lib/school-server/school-student-profile.server.js";
import {
  requireSchoolCredentialAdminApiContext,
  sendSchoolApiError,
} from "../../../../../lib/school-server/school-request.server.js";
import { parseTeacherReportStudentIdParam } from "../../../../../lib/teacher-server/teacher-report.server.js";
import { safeUuid } from "../../../../../lib/security/api-input.server.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireSchoolCredentialAdminApiContext(res, req);
    if (ctx.stopped) return undefined;

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const actorUserId = ctx.actorUserId || ctx.managerId;
      const rl = consumeRateLimit({
        namespace: "school_student_name_update",
        keys: [`ip:${ip}`, `actor:${actorUserId}`],
        maxAttempts: 20,
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

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const parsed = parseSchoolStudentNameInput(body.fullName);
    if (!parsed.ok) {
      return sendSchoolApiError(res, 400, parsed.code, parsed.code);
    }

    const actorUserId = ctx.actorUserId || ctx.managerId;
    if (!safeUuid(actorUserId)) {
      return sendSchoolApiError(res, 403, "not_authorized", "not_authorized");
    }

    const updated = await updateSchoolStudentName(ctx.serviceRole, {
      schoolId: ctx.schoolId,
      studentId: studentParsed.studentId,
      actorUserId,
      fullName: parsed.fullName,
    });
    if (!updated.ok) {
      return sendSchoolApiError(res, updated.status, updated.code, updated.code);
    }

    return res.status(200).json({
      studentId: updated.studentId,
      fullName: updated.fullName,
    });
  } catch (_e) {
    safeApiLog("school_student_name_update_error", { route: "school/students/name" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
