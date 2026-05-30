import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../../lib/security/production-guard.js";
import { isUuid, requireTeacherApiContext } from "../../../../../lib/teacher-server/teacher-request.server.js";
import { revokeTeacherGuardianAccess } from "../../../../../lib/teacher-server/teacher-student-access.server.js";
import {
  rejectIfTeacherPortalDisabled,
  sendTeacherApiError,
} from "../../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfTeacherPortalDisabled(res)) return undefined;
  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  const accessId = String(req.query?.accessId || "").trim();
  if (!isUuid(accessId)) {
    return sendTeacherApiError(res, 400, "validation_failed", "Invalid accessId");
  }

  const ctx = await requireTeacherApiContext(res, req);
  if (ctx.stopped) return undefined;

  try {
    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_student_access_revoke",
        keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
        maxAttempts: 20,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const revoked = await revokeTeacherGuardianAccess({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      accessId,
    });
    if (!revoked.ok) {
      return sendTeacherApiError(res, revoked.status, revoked.code, revoked.code);
    }

    return res.status(200).json({ data: revoked.data });
  } catch (_e) {
    safeApiLog("teacher_student_access_revoke_error", {});
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
