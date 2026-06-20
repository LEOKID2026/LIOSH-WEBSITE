import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";
import { guardRewardsAdminApi } from "../../../../../lib/rewards/guards.server.js";
import { isCardRewardsEnabled } from "../../../../../lib/rewards/reward-feature-flags.js";
import {
  pickCardWritableFields,
  validateCardPayload,
} from "../../../../../lib/rewards/server/admin-card-rules.server.js";

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
    const { data: existing, error: fetchErr } = await ctx.serviceRole
      .from("reward_cards")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr) return sendAdminApiError(res, 500, "db_error", fetchErr.message);
    if (!existing) return sendAdminApiError(res, 404, "card_not_found", "קלף לא נמצא");

    const body = pickCardWritableFields(req.body || {});
    if (Object.prototype.hasOwnProperty.call(body, "id")) {
      delete body.id;
    }
    const merged = { ...existing, ...body };
    const validation = validateCardPayload(merged);
    if (!validation.ok) {
      return sendAdminApiError(res, 400, validation.code, validation.message);
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
