import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";
import {
  listSoloDiamondRulesAdmin,
  updateSoloDiamondRulesAdmin,
} from "../../../../../lib/rewards/server/diamond-admin.server.js";

export default async function handler(req, res) {
  const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return;

  try {
    if (req.method === "GET") {
      const games = await listSoloDiamondRulesAdmin(ctx.serviceRole);
      return res.status(200).json({ ok: true, games });
    }

    if (req.method === "PATCH") {
      const gameKey = String(req.body?.gameKey || "").trim();
      const diamondRules = req.body?.diamondRules;
      if (!gameKey) {
        return sendAdminApiError(res, 400, "missing_game_key", "missing_game_key");
      }
      const result = await updateSoloDiamondRulesAdmin(
        ctx.serviceRole,
        ctx.adminUserId,
        gameKey,
        diamondRules
      );
      if (!result.ok) {
        return sendAdminApiError(
          res,
          result.code === "not_found" ? 404 : 400,
          result.code || "update_failed",
          result.messageHe || result.code
        );
      }
      return res.status(200).json(result);
    }

    res.setHeader("Allow", "GET, PATCH");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch {
    return sendAdminApiError(res, 500, "db_error", "db_error");
  }
}
