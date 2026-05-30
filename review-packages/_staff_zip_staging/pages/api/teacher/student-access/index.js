import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../lib/security/production-guard.js";
import { isUuid, requireTeacherApiContext, unknownQueryParams } from "../../../../lib/teacher-server/teacher-request.server.js";
import { listTeacherGuardianAccess } from "../../../../lib/teacher-server/teacher-student-access.server.js";
import {
  rejectIfTeacherPortalDisabled,
  sendTeacherApiError,
} from "../../../../lib/teacher-server/teacher-session.server.js";

const ALLOWED_QUERY = new Set(["studentId", "state"]);

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

  const stateRaw = req.query?.state != null ? String(req.query.state).trim() : "active";
  if (!["active", "revoked", "expired", "all"].includes(stateRaw)) {
    return sendTeacherApiError(res, 400, "validation_failed", "Invalid state");
  }

  const studentId =
    req.query?.studentId != null && String(req.query.studentId).trim()
      ? String(req.query.studentId).trim()
      : null;
  if (studentId && !isUuid(studentId)) {
    return sendTeacherApiError(res, 400, "validation_failed", "Invalid studentId");
  }

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_student_access_list",
        keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
        maxAttempts: 60,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const listed = await listTeacherGuardianAccess(ctx.serviceRole, ctx.teacherId, {
      studentId,
      state: stateRaw,
    });
    if (!listed.ok) {
      return sendTeacherApiError(res, listed.status, listed.code, listed.code);
    }

    return res.status(200).json({ data: { accesses: listed.accesses } });
  } catch (_e) {
    safeApiLog("teacher_student_access_list_error", {});
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
