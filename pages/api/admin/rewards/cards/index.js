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

  if (req.method === "GET") {
    const includeInactive = req.query.includeInactive === "true";
    let query = ctx.serviceRole
      .from("reward_cards")
      .select("*, reward_card_series(name_he, slug)")
      .order("created_at", { ascending: false });
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }
    const { data, error } = await query;
    if (error) return sendAdminApiError(res, 500, "db_error", error.message);
    return res.status(200).json({ ok: true, cards: data || [], includeInactive });
  }

  if (req.method === "POST") {
    const body = pickCardWritableFields(req.body || {});
    const validation = validateCardPayload(body);
    if (!validation.ok) {
      return sendAdminApiError(res, 400, validation.code, validation.message);
    }
    const { data, error } = await ctx.serviceRole.from("reward_cards").insert(body).select("*").single();
    if (error) return sendAdminApiError(res, 400, "insert_failed", error.message);
    return res.status(201).json({ ok: true, card: data });
  }

  res.setHeader("Allow", "GET, POST");
  return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
}
