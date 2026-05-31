import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { isUuid } from "../../../../../lib/teacher-server/teacher-request.server.js";
import { getAdminUserDeletePreview } from "../../../../../lib/admin-server/admin-user-delete.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";

export default async function handler(req, res) {
  const userId = req.query?.userId;

  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
    }

    if (!isUuid(String(userId))) {
      return sendAdminApiError(res, 400, "validation_failed", "userId must be a UUID");
    }

    const preview = await getAdminUserDeletePreview(
      ctx.serviceRole,
      ctx.adminUserId,
      ctx.user,
      String(userId)
    );

    if (!preview.ok) {
      return sendAdminApiError(res, preview.status, preview.code, preview.code);
    }

    return res.status(200).json({ data: preview });
  } catch (_e) {
    safeApiLog("admin_user_delete_preview_error", { route: "admin/users/[userId]/delete-preview" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
