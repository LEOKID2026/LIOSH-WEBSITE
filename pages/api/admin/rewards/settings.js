import { safeApiLog } from "../../../../lib/security/safe-log.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";
import { guardRewardsAdminApi } from "../../../../lib/rewards/guards.server.js";
import {
  getAllCardSettings,
  updateCardSetting,
} from "../../../../lib/rewards/server/reward-settings.server.js";
import { logEconomyChange } from "../../../../lib/rewards/server/reward-economy.server.js";

export default async function handler(req, res) {
  if (!guardRewardsAdminApi(res)) return;

  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return;

    if (req.method === "GET") {
      const settings = await getAllCardSettings(ctx.serviceRole);
      return res.status(200).json({ ok: true, settings });
    }

    if (req.method === "PUT") {
      const { key, value } = req.body || {};
      if (!key || typeof key !== "string") {
        return sendAdminApiError(res, 400, "missing_key", "missing_key");
      }
      const before = await getAllCardSettings(ctx.serviceRole);
      const row = await updateCardSetting(ctx.serviceRole, key, value);
      await logEconomyChange(ctx.serviceRole, ctx.adminUserId, {
        settingArea: "card_settings",
        entityKey: key,
        fieldName: key,
        oldValue: before[key],
        newValue: value,
      });
      return res.status(200).json({ ok: true, row });
    }

    res.setHeader("Allow", "GET, PUT");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("admin_rewards_settings_error", { route: "admin/rewards/settings" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
