import { safeApiLog } from "../../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../../lib/security/same-origin.js";
import {
  removeTeacherFromSchool,
  writeAdminAuditRow,
} from "../../../../../../lib/admin-server/admin-schools.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../../lib/admin-server/admin-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const schoolId = req.query?.schoolId;
  const teacherId = req.query?.teacherId;

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const result = await removeTeacherFromSchool(
      ctx.serviceRole,
      String(schoolId),
      String(teacherId)
    );
    if (!result.ok) {
      return sendAdminApiError(res, result.status, result.code, result.code);
    }

    await writeAdminAuditRow(ctx.serviceRole, {
      adminUserId: ctx.adminUserId,
      targetType: "school",
      targetId: String(schoolId),
      action: "school_teacher_removed",
      beforeState: { teacherId: result.teacherId, membership: result.membership },
      afterState: { teacherId: result.teacherId, removed: true },
    });

    return res.status(200).json({ data: { removed: true, teacherId: result.teacherId } });
  } catch (_e) {
    safeApiLog("admin_school_remove_teacher_error", {
      route: "admin/schools/[schoolId]/teachers/[teacherId]",
    });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
