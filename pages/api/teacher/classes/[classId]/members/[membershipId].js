import { safeApiLog } from "../../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../../lib/security/same-origin.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../../../lib/security/production-guard.js";
import { writeTeacherAuditRow } from "../../../../../../lib/teacher-server/teacher-audit.server.js";
import {
  loadTeacherClassOwned,
  removeClassMember,
} from "../../../../../../lib/teacher-server/teacher-classes.server.js";
import { requireTeacherApiContext } from "../../../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const classId = req.query?.classId;
  const membershipId = req.query?.membershipId;

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_class_member_remove",
        keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
        maxAttempts: 30,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const owned = await loadTeacherClassOwned(ctx.serviceRole, ctx.teacherId, classId);
    if (!owned.ok) {
      return sendTeacherApiError(res, owned.status, owned.code, owned.code);
    }

    const removed = await removeClassMember(ctx.serviceRole, classId, membershipId);
    if (!removed.ok) {
      return sendTeacherApiError(res, removed.status, removed.code, removed.code);
    }

    await writeTeacherAuditRow({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      studentId: removed.studentId,
      action: "class_member_removed",
      actorRole: "teacher",
      actorId: ctx.teacherId,
      metadata: { class_id: classId, student_id: removed.studentId },
    });

    return res.status(200).json({
      data: { membershipId: removed.membershipId, removedAt: removed.removedAt },
    });
  } catch (_e) {
    safeApiLog("teacher_class_member_remove_error", {
      route: "classes/[classId]/members/[membershipId]",
    });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
