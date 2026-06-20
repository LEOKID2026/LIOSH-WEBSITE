import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";
import { guardRewardsAdminApi } from "../../../../lib/rewards/guards.server.js";
import { isCardRewardsEnabled } from "../../../../lib/rewards/reward-feature-flags.js";
import { cardRuleTypeOptionsForAdmin } from "../../../../lib/rewards/card-rule-types.js";

export default async function handler(req, res) {
  if (!guardRewardsAdminApi(res)) return;

  const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return;

  if (!isCardRewardsEnabled()) {
    return sendAdminApiError(res, 404, "feature_disabled", "feature_disabled");
  }

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, ruleTypes: cardRuleTypeOptionsForAdmin() });
  }

  res.setHeader("Allow", "GET");
  return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
}
