import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../lib/security/production-guard.js";
import { requireTeacherApiContext } from "../../../../lib/teacher-server/teacher-request.server.js";
import {
  createTeacherGuardianAccess,
  parseCreateGuardianAccessBody,
} from "../../../../lib/teacher-server/teacher-student-access.server.js";
import {
  rejectIfTeacherPortalDisabled,
  sendTeacherApiError,
} from "../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfTeacherPortalDisabled(res)) return undefined;
  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  const ctx = await requireTeacherApiContext(res, req);
  if (ctx.stopped) return undefined;

  try {
    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_student_access_create",
        keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
        maxAttempts: 5,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const parsed = parseCreateGuardianAccessBody(req.body);
    if (!parsed.ok) {
      return sendTeacherApiError(res, 400, parsed.code, parsed.code);
    }

    const created = await createTeacherGuardianAccess({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      studentId: parsed.studentId,
      expiresInDays: parsed.expiresInDays,
      deliveryChannel: parsed.deliveryChannel,
      req,
    });

    if (!created.ok) {
      return sendTeacherApiError(res, created.status, created.code, created.code);
    }

    return res.status(201).json({ data: created.data });
  } catch (e) {
    safeApiLog("teacher_student_access_create_error", {
      message: e instanceof Error ? e.message : String(e),
    });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
