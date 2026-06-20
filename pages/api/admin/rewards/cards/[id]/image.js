import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../../lib/admin-server/admin-request.server.js";
import { guardRewardsAdminApi } from "../../../../../../lib/rewards/guards.server.js";
import { isCardRewardsEnabled } from "../../../../../../lib/rewards/reward-feature-flags.js";
import {
  parseRewardCardImageUpload,
  uploadRewardCardImageForCard,
} from "../../../../../../lib/rewards/server/reward-card-image.server.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

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

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const parsed = await parseRewardCardImageUpload(req);
  if (!parsed.ok) {
    return sendAdminApiError(res, parsed.status || 400, parsed.code, parsed.message || parsed.code);
  }

  const result = await uploadRewardCardImageForCard(
    ctx.serviceRole,
    id,
    parsed.buffer,
    parsed.contentType
  );

  if (!result.ok) {
    return sendAdminApiError(res, result.status || 400, result.code, result.message || result.code);
  }

  return res.status(200).json({
    ok: true,
    card: result.card,
    imageUrl: result.imageUrl,
    storagePath: result.storagePath,
    width: result.width,
    height: result.height,
  });
}
