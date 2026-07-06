import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";
import {
  getLeoMinersAdminConfigView,
  updateLeoMinersAdminConfig,
} from "../../../../lib/leo-miners/server/leo-miners-admin-config.server.js";

export default async function handler(req, res) {
  const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return;

  try {
    if (req.method === "GET") {
      const view = await getLeoMinersAdminConfigView(ctx.serviceRole);
      const status = view.dbReady ? 200 : 503;
      return res.status(status).json({
        ok: view.dbReady,
        code: view.dbReady ? null : "miners_db_not_ready",
        dbReady: view.dbReady,
        defaults: view.defaults,
        config: view.config,
        merged: view.config.merged,
        catalogEnabled: view.catalogEnabled,
        soloRuleActive: view.soloRuleActive,
        soloPayoutRules: view.soloPayoutRules,
        gameEnabled: view.gameEnabled,
      });
    }

    if (req.method === "POST") {
      const result = await updateLeoMinersAdminConfig(
        ctx.serviceRole,
        ctx.adminUserId,
        req.body || {}
      );
      if (!result.ok) {
        return sendAdminApiError(
          res,
          result.status || 400,
          result.code || "update_failed",
          result.message || result.code
        );
      }
      return res.status(200).json(result);
    }

    res.setHeader("Allow", "GET, POST");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (e) {
    console.error("[admin/leo-miners/config]", e);
    return sendAdminApiError(res, 500, "internal_error", "internal_error");
  }
}
