import { safeApiLog } from "../../../lib/security/safe-log.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../lib/admin-server/admin-request.server.js";
import { getAdminAnalyticsDashboard } from "../../../lib/admin-server/admin-analytics.server.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
    }

    const dashboard = await getAdminAnalyticsDashboard(ctx.serviceRole, req.query || {});
    if (!dashboard.ok) {
      return sendAdminApiError(res, dashboard.status || 500, dashboard.code || "internal_error", dashboard.code);
    }

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    return res.status(200).json({ data: dashboard });
  } catch (_error) {
    safeApiLog("admin_analytics_error", { route: "admin/analytics" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
