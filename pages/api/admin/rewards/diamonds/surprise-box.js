import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";
import {
  getSurpriseBoxDiamondRewardsAdmin,
  updateSurpriseBoxDiamondRewardsAdmin,
} from "../../../../../lib/rewards/server/diamond-admin.server.js";

export default async function handler(req, res) {
  const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return;

  try {
    if (req.method === "GET") {
      const rewards = await getSurpriseBoxDiamondRewardsAdmin(ctx.serviceRole);
      return res.status(200).json({ ok: true, rewards });
    }

    if (req.method === "PATCH") {
      const result = await updateSurpriseBoxDiamondRewardsAdmin(
        ctx.serviceRole,
        ctx.adminUserId,
        req.body?.rewards
      );
      if (!result.ok) {
        return sendAdminApiError(res, 400, result.code || "update_failed", result.messageHe);
      }
      return res.status(200).json(result);
    }

    res.setHeader("Allow", "GET, PATCH");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch {
    return sendAdminApiError(res, 500, "db_error", "db_error");
  }
}
