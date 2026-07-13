import { safeApiLog } from "../../../../lib/security/safe-log.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";
import { getAdminWebTrafficAnalytics } from "../../../../lib/admin-server/admin-web-traffic.server.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
    }

    const payload = await getAdminWebTrafficAnalytics(req.query || {});
    if (!payload.ok) {
      return sendAdminApiError(res, payload.status || 500, payload.code || "internal_error", payload.code);
    }

    res.setHeader("Cache-Control", "private, max-age=90");
    return res.status(200).json({ data: payload });
  } catch (_error) {
    safeApiLog("admin_web_traffic_error", { route: "admin/analytics/web-traffic" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
