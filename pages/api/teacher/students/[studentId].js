import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../lib/security/production-guard.js";
import { writeTeacherAuditRow } from "../../../../lib/teacher-server/teacher-audit.server.js";
import { requireTeacherApiContext } from "../../../../lib/teacher-server/teacher-request.server.js";
import { updateTeacherStudentName } from "../../../../lib/teacher-server/teacher-student-manage.server.js";
import { sendTeacherApiError } from "../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  const studentId = req.query?.studentId;

  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_student_patch",
        keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
        maxAttempts: 30,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const fullName = body.fullName;

    const updated = await updateTeacherStudentName({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      studentId,
      fullName,
    });

    if (!updated.ok) {
      return sendTeacherApiError(res, updated.status, updated.code, updated.code);
    }

    await writeTeacherAuditRow({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      studentId: updated.studentId,
      action: "student_name_updated",
      actorRole: "teacher",
      actorId: ctx.teacherId,
      metadata: { student_id: updated.studentId },
    });

    return res.status(200).json({
      data: { studentId: updated.studentId, fullName: updated.fullName },
    });
  } catch (_e) {
    safeApiLog("teacher_student_patch_error", { route: "students/[studentId]" });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
