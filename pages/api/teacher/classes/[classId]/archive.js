import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../../lib/security/production-guard.js";
import { writeTeacherAuditRow } from "../../../../../lib/teacher-server/teacher-audit.server.js";
import {
  archiveTeacherClass,
  loadTeacherClassOwned,
} from "../../../../../lib/teacher-server/teacher-classes.server.js";
import { requireTeacherApiContext } from "../../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../../lib/teacher-server/teacher-session.server.js";

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

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_class_archive",
        keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
        maxAttempts: 10,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const owned = await loadTeacherClassOwned(ctx.serviceRole, ctx.teacherId, classId, {
      allowArchived: true,
    });
    if (!owned.ok) {
      return sendTeacherApiError(res, owned.status, owned.code, owned.code);
    }
    if (owned.row.is_archived || owned.row.archived_at) {
      return sendTeacherApiError(res, 409, "already_archived", "Class already archived");
    }

    const archived = await archiveTeacherClass(ctx.serviceRole, classId);
    if (!archived.ok) {
      return sendTeacherApiError(res, archived.status, archived.code, archived.code);
    }

    await writeTeacherAuditRow({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      action: "class_archived",
      actorRole: "teacher",
      actorId: ctx.teacherId,
      metadata: {
        class_id: classId,
        member_rows_archived: archived.memberRowsArchived,
      },
    });

    return res.status(200).json({
      data: {
        classId: archived.classId,
        archivedAt: archived.archivedAt,
        memberRowsArchived: archived.memberRowsArchived,
      },
    });
  } catch (_e) {
    safeApiLog("teacher_class_archive_error", { route: "classes/[classId]/archive" });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
