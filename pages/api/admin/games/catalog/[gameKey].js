import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";
import { updateSiteGameCatalogEnabled } from "../../../../../lib/games/server/game-access.server.js";

export default async function handler(req, res) {
  const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return;

  const gameKey = String(req.query.gameKey || "").trim();
  if (!gameKey) {
    return sendAdminApiError(res, 400, "missing_game_key", "missing_game_key");
  }

  if (req.method === "PATCH") {
    const isEnabled = req.body?.isEnabled === true;
    const result = await updateSiteGameCatalogEnabled(
      ctx.serviceRole,
      gameKey,
      isEnabled,
      ctx.adminUserId
    );
    if (!result.ok) {
      return sendAdminApiError(res, 404, result.code, result.message || result.code);
    }
    return res.status(200).json({ ok: true, game: result.game });
  }

  res.setHeader("Allow", "PATCH");
  return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
}
