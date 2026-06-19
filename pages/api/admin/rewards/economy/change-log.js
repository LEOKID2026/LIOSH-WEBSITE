import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";
import { guardRewardsAdminApi } from "../../../../../lib/rewards/guards.server.js";
import { listEconomyChangeLog } from "../../../../../lib/rewards/server/reward-economy.server.js";

export default async function handler(req, res) {
  if (!guardRewardsAdminApi(res)) return;

  const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const rows = await listEconomyChangeLog(ctx.serviceRole, { limit, offset });
  return res.status(200).json({ ok: true, rows });
}
