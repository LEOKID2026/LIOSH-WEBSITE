import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { isUuid } from "../../../../../lib/teacher-server/teacher-request.server.js";
import { rejectSchoolRegistration } from "../../../../../lib/auth/auth-registration-request.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";
import { writeAdminAuditRow } from "../../../../../lib/admin-server/admin-audit.server.js";

export default async function handler(req, res) {
  const schoolId = req.query?.schoolId;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (!isUuid(String(schoolId))) {
    return sendAdminApiError(res, 400, "validation_failed", "schoolId must be a UUID");
  }

  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const reason =
      typeof body.reason === "string" ? body.reason.trim().slice(0, 500) || null : null;

    const result = await rejectSchoolRegistration(
      ctx.serviceRole,
      String(schoolId),
      ctx.adminUserId,
      reason
    );
    if (!result.ok) {
      return sendAdminApiError(res, result.status, result.code, result.code);
    }

    await writeAdminAuditRow(ctx.serviceRole, {
      adminUserId: ctx.adminUserId,
      targetType: "school_registration",
      targetId: String(schoolId),
      action: "reject",
      beforeState: null,
      afterState: { schoolId: result.schoolId },
      notes: reason,
    });

    return res.status(200).json({ data: result });
  } catch (_e) {
    safeApiLog("admin_school_reject_error", { route: "admin/schools/[schoolId]/reject" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
