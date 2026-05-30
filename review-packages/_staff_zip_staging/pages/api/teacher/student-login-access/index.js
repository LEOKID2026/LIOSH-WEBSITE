import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../lib/security/production-guard.js";
import { isUuid, requireTeacherApiContext, unknownQueryParams } from "../../../../lib/teacher-server/teacher-request.server.js";
import { listTeacherStudentLoginAccess } from "../../../../lib/teacher-server/teacher-student-login-access.server.js";
import {
  rejectIfTeacherPortalDisabled,
  sendTeacherApiError,
} from "../../../../lib/teacher-server/teacher-session.server.js";

const ALLOWED_QUERY = new Set(["studentId"]);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfTeacherPortalDisabled(res)) return undefined;

  const unknown = unknownQueryParams(req.query, ALLOWED_QUERY);
  if (unknown.length) {
    return sendTeacherApiError(res, 400, "unknown_query_param", "Unknown query parameter");
  }

  const studentId = String(req.query?.studentId || "").trim();
  if (!isUuid(studentId)) {
    return sendTeacherApiError(res, 400, "validation_failed", "Invalid studentId");
  }

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_student_login_access_list",
        keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
        maxAttempts: 60,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const listed = await listTeacherStudentLoginAccess(ctx.serviceRole, ctx.teacherId, studentId);
    if (!listed.ok) {
      return sendTeacherApiError(res, listed.status, listed.code, listed.code);
    }

    return res.status(200).json({ data: { accesses: listed.accesses } });
  } catch (_e) {
    safeApiLog("teacher_student_login_access_list_error", {});
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
