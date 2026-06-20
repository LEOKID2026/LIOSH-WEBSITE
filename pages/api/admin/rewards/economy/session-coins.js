import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";
import { guardRewardsAdminApi } from "../../../../../lib/rewards/guards.server.js";
import {
  getSessionCoinsAdmin,
  updateSessionCoinsAdmin,
} from "../../../../../lib/rewards/server/economy-config.server.js";

export default async function handler(req, res) {
  if (!guardRewardsAdminApi(res)) return;

  const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return;

  if (req.method === "GET") {
    const row = await getSessionCoinsAdmin(ctx.serviceRole);
    return res.status(200).json({ ok: true, row });
  }

  if (req.method === "PUT") {
    const { patch } = req.body || {};
    const result = await updateSessionCoinsAdmin(ctx.serviceRole, ctx.adminUserId, patch || {});
    if (!result.ok) return sendAdminApiError(res, 404, result.code, result.code);
    return res.status(200).json(result);
  }

  res.setHeader("Allow", "GET, PUT");
  return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
}
