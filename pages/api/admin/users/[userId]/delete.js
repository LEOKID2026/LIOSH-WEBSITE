import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { isUuid } from "../../../../../lib/teacher-server/teacher-request.server.js";
import { writeAdminAuditRow } from "../../../../../lib/admin-server/admin-audit.server.js";
import { deleteAdminUserAccount } from "../../../../../lib/admin-server/admin-user-delete.server.js";
import {
  requireMainAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";

export default async function handler(req, res) {
  const userId = req.query?.userId;

  try {
    const ctx = await requireMainAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
    }

    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    if (!isUuid(String(userId))) {
      return sendAdminApiError(res, 400, "validation_failed", "userId must be a UUID");
    }

    const confirmCode =
      typeof req.body?.confirmCode === "string" ? req.body.confirmCode : "";

    const result = await deleteAdminUserAccount(
      ctx.serviceRole,
      ctx.adminUserId,
      String(userId),
      { confirmCode }
    );

    if (!result.ok) {
      return res.status(result.status || 400).json({
        error: {
          code: result.code,
          message: result.code,
          blockers: result.blockers || null,
          table: result.table || null,
        },
      });
    }

    await writeAdminAuditRow(ctx.serviceRole, {
      adminUserId: ctx.adminUserId,
      targetType: "teacher",
      targetId: String(userId),
      action: "user_hard_delete",
      beforeState: { email: result.email, userId: result.deletedUserId },
      afterState: { deleted: true, cleaned: result.cleaned || [] },
      notes: null,
    });

    return res.status(200).json({ data: result });
  } catch (_e) {
    safeApiLog("admin_user_delete_error", { route: "admin/users/[userId]/delete" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
