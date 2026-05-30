import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { isUuid } from "../../../../lib/teacher-server/teacher-request.server.js";
import { listAdminEntitlementsForUser } from "../../../../lib/admin-server/admin-entitlements.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const userIdRaw = req.query?.userId;
    const userId = typeof userIdRaw === "string" ? userIdRaw.trim() : "";
    if (!isUuid(userId)) {
      return sendAdminApiError(res, 400, "validation_failed", "userId query param must be a UUID");
    }

    const listed = await listAdminEntitlementsForUser(ctx.serviceRole, userId);
    if (!listed.ok) {
      return sendAdminApiError(res, listed.status, listed.code, listed.code);
    }

    return res.status(200).json({ data: { entitlements: listed.entitlements } });
  } catch (_e) {
    safeApiLog("admin_entitlements_index_error", { route: "admin/entitlements" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
