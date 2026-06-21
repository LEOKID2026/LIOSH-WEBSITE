import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";
import {
  getDiamondSettings,
  updateDiamondSettings,
} from "../../../../../lib/rewards/server/diamond-ledger.server.js";

export default async function handler(req, res) {
  const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return;

  try {
    if (req.method === "GET") {
      const settings = await getDiamondSettings(ctx.serviceRole);
      return res.status(200).json({ ok: true, settings });
    }

    if (req.method === "PATCH") {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const patch = {};
      if (typeof body.system_enabled === "boolean") patch.system_enabled = body.system_enabled;
      if (typeof body.daily_cap_mode === "string") patch.daily_cap_mode = body.daily_cap_mode;
      if (body.global_daily_cap !== undefined) patch.global_daily_cap = body.global_daily_cap;
      if (body.solo_daily_cap !== undefined) patch.solo_daily_cap = body.solo_daily_cap;
      if (body.surprise_box_daily_cap !== undefined) {
        patch.surprise_box_daily_cap = body.surprise_box_daily_cap;
      }
      if (body.per_game_daily_cap !== undefined) patch.per_game_daily_cap = body.per_game_daily_cap;

      const settings = await updateDiamondSettings(ctx.serviceRole, patch);
      return res.status(200).json({ ok: true, settings });
    }

    res.setHeader("Allow", "GET, PATCH");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch {
    return sendAdminApiError(res, 500, "db_error", "db_error");
  }
}
