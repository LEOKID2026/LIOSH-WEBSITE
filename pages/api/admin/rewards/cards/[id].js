import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";
import { guardRewardsAdminApi } from "../../../../../lib/rewards/guards.server.js";
import { isCardRewardsEnabled } from "../../../../../lib/rewards/reward-feature-flags.js";

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

  if (req.method === "PUT") {
    const body = req.body || {};
    if (body.card_type === "achievement" && (body.can_be_purchased || body.can_appear_in_surprise_box)) {
      return sendAdminApiError(res, 400, "invalid_achievement", "קלף הישג לא יכול להיות בחנות או בקופסה");
    }
    const { data, error } = await ctx.serviceRole
      .from("reward_cards")
      .update(body)
      .eq("id", id)
      .select("*")
      .single();
    if (error) return sendAdminApiError(res, 400, "update_failed", error.message);
    return res.status(200).json({ ok: true, card: data });
  }

  res.setHeader("Allow", "PUT");
  return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
}
