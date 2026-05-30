import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../../lib/security/production-guard.js";
import { writeTeacherAuditRow } from "../../../../../lib/teacher-server/teacher-audit.server.js";
import {
  addClassMember,
  loadTeacherClassOwned,
} from "../../../../../lib/teacher-server/teacher-classes.server.js";
import { isUuid, requireTeacherApiContext } from "../../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../../lib/teacher-server/teacher-session.server.js";
import { rejectIfSchoolTeacher } from "../../../../../lib/teacher-server/private-teacher-guard.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const classId = req.query?.classId;

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    const schoolBlock = await rejectIfSchoolTeacher(res, ctx.serviceRole, ctx.teacherId);
    if (schoolBlock.blocked) return undefined;

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_class_member_add",
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
    if (owned.row.is_archived || owned.row.archived_at) {
      return sendTeacherApiError(res, 409, "class_archived", "Class is archived");
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const studentId = body.studentId;
    if (!isUuid(studentId)) {
      return sendTeacherApiError(res, 400, "validation_failed", "Invalid studentId");
    }

    const added = await addClassMember(ctx.serviceRole, ctx.teacherId, classId, studentId, {
      maxStudentsPerClass: ctx.limits.maxStudentsPerClass,
    });
    if (!added.ok) {
      return sendTeacherApiError(res, added.status, added.code, added.code);
    }

    await writeTeacherAuditRow({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      studentId: added.studentId,
      action: "class_member_added",
      actorRole: "teacher",
      actorId: ctx.teacherId,
      metadata: { class_id: classId, student_id: added.studentId },
    });

    return res.status(201).json({
      data: { membershipId: added.membershipId, joinedAt: added.joinedAt },
    });
  } catch (_e) {
    safeApiLog("teacher_class_member_add_error", { route: "classes/[classId]/members" });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
