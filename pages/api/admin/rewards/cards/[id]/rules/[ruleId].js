import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../../../lib/admin-server/admin-request.server.js";
import { guardRewardsAdminApi } from "../../../../../../../lib/rewards/guards.server.js";
import { isCardRewardsEnabled } from "../../../../../../../lib/rewards/reward-feature-flags.js";
import {
  updateCardRule,
  deleteCardRule,
} from "../../../../../../../lib/rewards/server/admin-card-rules.server.js";

export default async function handler(req, res) {
  if (!guardRewardsAdminApi(res)) return;

  const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return;

  if (!isCardRewardsEnabled()) {
    return sendAdminApiError(res, 404, "feature_disabled", "feature_disabled");
  }

  const { id, ruleId } = req.query;
  if (!id || typeof id !== "string" || !ruleId || typeof ruleId !== "string") {
    return sendAdminApiError(res, 400, "missing_id", "missing_id");
  }

  if (req.method === "PUT") {
    const body = req.body || {};
    const result = await updateCardRule(ctx.serviceRole, ruleId, body);
    if (!result.ok) {
      return sendAdminApiError(res, 400, result.code || "update_failed", result.message || "update_failed");
    }
    return res.status(200).json({ ok: true, rule: result.rule });
  }

  if (req.method === "DELETE") {
    const result = await deleteCardRule(ctx.serviceRole, ruleId);
    if (!result.ok) {
      return sendAdminApiError(res, 400, result.code || "delete_failed", result.message || "delete_failed");
    }
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "PUT, DELETE");
  return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
}
