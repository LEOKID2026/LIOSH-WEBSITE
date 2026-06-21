import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";
import {
  loadSiteGameCatalog,
  updateSiteGameCatalogEnabled,
} from "../../../../lib/games/server/game-access.server.js";

export default async function handler(req, res) {
  const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return;

  if (req.method === "GET") {
    try {
      const games = await loadSiteGameCatalog(ctx.serviceRole);
      return res.status(200).json({ ok: true, games });
    } catch (_e) {
      return sendAdminApiError(res, 500, "db_error", "db_error");
    }
  }

  res.setHeader("Allow", "GET");
  return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
}
