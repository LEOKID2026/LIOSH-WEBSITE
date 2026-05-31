import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../../lib/security/production-guard.js";
import { verifyStudentVisibleToSchool } from "../../../../../lib/school-server/school-scope.server.js";
import {
  getSchoolStudentAdminProfile,
  parseSchoolStudentAdminProfileInput,
  upsertSchoolStudentAdminProfile,
} from "../../../../../lib/school-server/school-student-profile.server.js";
import {
  getTeacherPortalServiceRole,
  rejectIfTeacherPortalDisabled,
  resolveAuthenticatedTeacherUserId,
} from "../../../../../lib/teacher-server/teacher-session.server.js";
import { loadTeacherSchoolMembership } from "../../../../../lib/school-server/school-membership.server.js";
import {
  requireSchoolCredentialAdminApiContext,
  requireSchoolStudentBrowseContext,
  sendSchoolApiError,
} from "../../../../../lib/school-server/school-request.server.js";
import { parseTeacherReportStudentIdParam } from "../../../../../lib/teacher-server/teacher-report.server.js";
import { safeUuid } from "../../../../../lib/security/api-input.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", "GET, PUT");
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

    const studentParsed = parseTeacherReportStudentIdParam(req.query?.studentId);
    if (!studentParsed.ok) {
      return sendSchoolApiError(res, 400, studentParsed.code, studentParsed.code);
    }

    if (req.method === "GET") {
      const ctx = await requireSchoolStudentBrowseContext(
        res,
        req,
        membershipResult.membership.schoolId
      );
      if (ctx.stopped) return undefined;

      const visible = await verifyStudentVisibleToSchool(
        ctx.serviceRole,
        ctx.schoolId,
        studentParsed.studentId
      );
      if (!visible.ok) {
        return sendSchoolApiError(res, visible.status, visible.code, visible.code);
      }

      const result = await getSchoolStudentAdminProfile(
        ctx.serviceRole,
        ctx.schoolId,
        studentParsed.studentId
      );
      if (!result.ok) {
        return sendSchoolApiError(res, result.status, result.code, result.code);
      }

      return res.status(200).json({
        profile: result.profile,
        isEmpty: result.isEmpty,
      });
    }

    const ctx = await requireSchoolCredentialAdminApiContext(res, req);
    if (ctx.stopped) return undefined;

    if (ctx.schoolId !== membershipResult.membership.schoolId) {
      return sendSchoolApiError(res, 403, "wrong_school", "wrong_school");
    }

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "school_student_admin_profile_write",
        keys: [`ip:${ip}`, `actor:${ctx.actorUserId}`],
        maxAttempts: 60,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendSchoolApiError(res, 429, "rate_limited", "Too many requests");
      }
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
    const parsed = parseSchoolStudentAdminProfileInput(body);
    if (!parsed.ok) {
      return sendSchoolApiError(res, 400, parsed.code, parsed.code);
    }

    const actorUserId = ctx.actorUserId || ctx.managerId;
    if (!safeUuid(actorUserId)) {
      return sendSchoolApiError(res, 403, "not_authorized", "not_authorized");
    }

    const saved = await upsertSchoolStudentAdminProfile(ctx.serviceRole, {
      schoolId: ctx.schoolId,
      studentId: studentParsed.studentId,
      actorUserId,
      fields: parsed.fields,
      presentKeys: parsed.presentKeys,
    });
    if (!saved.ok) {
      return sendSchoolApiError(res, saved.status, saved.code, saved.code);
    }

    return res.status(200).json({
      profile: saved.profile,
      isEmpty: saved.isEmpty,
    });
  } catch (_e) {
    safeApiLog("school_student_admin_profile_error", {
      route: "school/students/admin-profile",
      method: req.method,
    });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
