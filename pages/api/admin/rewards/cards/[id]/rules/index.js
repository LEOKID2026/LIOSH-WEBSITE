import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../../../lib/admin-server/admin-request.server.js";
import { guardRewardsAdminApi } from "../../../../../../../lib/rewards/guards.server.js";
import { isCardRewardsEnabled } from "../../../../../../../lib/rewards/reward-feature-flags.js";
import {
  listCardRules,
  createCardRule,
} from "../../../../../../../lib/rewards/server/admin-card-rules.server.js";

export default async function handler(req, res) {
  if (!guardRewardsAdminApi(res)) return;

  const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return;

  if (!isCardRewardsEnabled()) {
    return sendAdminApiError(res, 404, "feature_disabled", "feature_disabled");
  }

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return sendAdminApiError(res, 400, "missing_id", "missing_id");
  }

  if (req.method === "GET") {
    try {
      const rules = await listCardRules(ctx.serviceRole, id);
      return res.status(200).json({ ok: true, rules });
    } catch (err) {
      return sendAdminApiError(res, 500, "db_error", err?.message || "db_error");
    }
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const result = await createCardRule(ctx.serviceRole, id, body);
    if (!result.ok) {
      return sendAdminApiError(res, 400, result.code || "insert_failed", result.message || "insert_failed");
    }
    return res.status(201).json({ ok: true, rule: result.rule });
  }

  res.setHeader("Allow", "GET, POST");
  return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
}
