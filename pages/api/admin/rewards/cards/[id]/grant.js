import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../../lib/admin-server/admin-request.server.js";
import { guardRewardsAdminApi } from "../../../../../../lib/rewards/guards.server.js";
import { isCardRewardsEnabled } from "../../../../../../lib/rewards/reward-feature-flags.js";
import { adminGrantCardToStudent } from "../../../../../../lib/rewards/server/admin-card-rules.server.js";

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

  if (req.method === "POST") {
    const body = req.body || {};
    const studentId = String(body.student_id || body.studentId || "").trim();
    if (!studentId) {
      return sendAdminApiError(res, 400, "validation_failed", "מזהה תלמיד חובה");
    }

    const result = await adminGrantCardToStudent(ctx.serviceRole, id, studentId, {
      reason: body.reason || "admin_grant",
    });
    if (!result.ok) {
      return sendAdminApiError(res, 400, result.code || "grant_failed", result.message || "grant_failed");
    }
    return res.status(200).json({
      ok: true,
      alreadyOwned: result.alreadyOwned,
      duplicate: result.duplicate,
      card: result.grant?.card,
    });
  }

  res.setHeader("Allow", "POST");
  return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
}
