import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";
import {
  loadGuestRuntimeConfig,
  loadGuestSettingsMap,
  upsertGuestSetting,
  invalidateGuestSettingsCache,
  parseGuestModeEnabled,
  parseGuestDefaults,
  parseGuestEconomy,
  parseGuestSurpriseBoxSettings,
} from "../../../../lib/guest/guest-settings.server.js";

export default async function handler(req, res) {
  const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return;

  if (req.method === "GET") {
    try {
      const config = await loadGuestRuntimeConfig(ctx.serviceRole);
      const map = await loadGuestSettingsMap(ctx.serviceRole);
      return res.status(200).json({
        ok: true,
        settings: {
          guestModeEnabled: config.enabled,
          defaults: config.defaults,
          economy: config.economy,
          surpriseBox: config.surpriseBox,
        },
        raw: Object.fromEntries(map.entries()),
      });
    } catch (_e) {
      return sendAdminApiError(res, 500, "db_error", "db_error");
    }
  }

  if (req.method === "PUT") {
    try {
      const body = req.body || {};
      if (body.guestModeEnabled != null) {
        await upsertGuestSetting(ctx.serviceRole, "guest_mode_enabled", { enabled: body.guestModeEnabled === true });
      }
      if (body.defaults && typeof body.defaults === "object") {
        const rawGames = Number(body.defaults.gamesPerCategory ?? body.defaults.games_per_category ?? 2);
        const rawTopics = Number(body.defaults.topicsPerSubject ?? body.defaults.topics_per_subject ?? 2);
        const gamesPerCategory =
          Number.isFinite(rawGames) && rawGames > 0 ? Math.min(Math.floor(rawGames), 20) : 2;
        const topicsPerSubject =
          Number.isFinite(rawTopics) && rawTopics > 0 ? Math.min(Math.floor(rawTopics), 20) : 2;
        await upsertGuestSetting(ctx.serviceRole, "guest_defaults", {
          games_per_category: gamesPerCategory,
          topics_per_subject: topicsPerSubject,
        });
      }
      if (body.economy && typeof body.economy === "object") {
        await upsertGuestSetting(ctx.serviceRole, "guest_economy", {
          shop_enabled: body.economy.shopEnabled !== false,
          cards_enabled: body.economy.cardsEnabled !== false,
        });
      }
      if (body.surpriseBox && typeof body.surpriseBox === "object") {
        await upsertGuestSetting(ctx.serviceRole, "surprise_box_guest_settings", body.surpriseBox);
      }
      invalidateGuestSettingsCache();
      const config = await loadGuestRuntimeConfig(ctx.serviceRole);
      return res.status(200).json({
        ok: true,
        settings: {
          guestModeEnabled: config.enabled,
          defaults: config.defaults,
          economy: config.economy,
          surpriseBox: config.surpriseBox,
        },
      });
    } catch (_e) {
      return sendAdminApiError(res, 500, "db_error", "db_error");
    }
  }

  res.setHeader("Allow", "GET, PUT");
  return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
}
