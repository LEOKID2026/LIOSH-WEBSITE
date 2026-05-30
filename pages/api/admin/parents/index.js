import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { listAdminParents } from "../../../../lib/admin-server/admin-parent-settings.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    if (req.method === "GET") {
      const listed = await listAdminParents(ctx.serviceRole);
      if (!listed.ok) {
        return sendAdminApiError(res, listed.status, listed.code, listed.code);
      }
      return res.status(200).json({ data: { parents: listed.parents } });
    }

    res.setHeader("Allow", "GET");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("admin_parents_list_error", { route: "admin/parents" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
