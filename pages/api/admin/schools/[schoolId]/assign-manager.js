import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import {
  assignSchoolManager,
  writeAdminAuditRow,
} from "../../../../../lib/admin-server/admin-schools.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";
import { isUuid } from "../../../../../lib/teacher-server/teacher-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const schoolId = req.query?.schoolId;

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const teacherId = body.teacherId;
    if (!isUuid(teacherId)) {
      return sendAdminApiError(res, 400, "validation_failed", "Invalid teacherId");
    }

    const result = await assignSchoolManager(ctx.serviceRole, String(schoolId), String(teacherId));
    if (!result.ok) {
      return sendAdminApiError(res, result.status, result.code, result.code);
    }

    await writeAdminAuditRow(ctx.serviceRole, {
      adminUserId: ctx.adminUserId,
      targetType: "school",
      targetId: String(schoolId),
      action: "school_manager_assigned",
      beforeState: { teacherId: result.beforeProfile },
      afterState: { teacherId: result.teacherId, schoolId: result.schoolId, role: "school_admin" },
    });

    return res.status(200).json({
      data: { teacherId: result.teacherId, schoolId: result.schoolId, role: "school_admin" },
    });
  } catch (_e) {
    safeApiLog("admin_school_assign_manager_error", { route: "admin/schools/assign-manager" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
