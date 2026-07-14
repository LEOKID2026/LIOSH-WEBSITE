import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";
import { loadSiteGameCatalog } from "../../../../lib/games/server/game-access.server.js";
import {
  loadGuestGameAccessRows,
  resolveDefaultGuestPlayableGameKeys,
} from "../../../../lib/guest/guest-access-policy.server.js";
import { loadGuestRuntimeConfig } from "../../../../lib/guest/guest-settings.server.js";

export default async function handler(req, res) {
  const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return;

  if (req.method === "GET") {
    try {
      const [catalog, guestRows, config] = await Promise.all([
        loadSiteGameCatalog(ctx.serviceRole),
        loadGuestGameAccessRows(ctx.serviceRole),
        loadGuestRuntimeConfig(ctx.serviceRole),
      ]);
      const guestByKey = Object.fromEntries((guestRows || []).map((r) => [r.game_key, r]));
      const effectivePlayable = resolveDefaultGuestPlayableGameKeys(
        guestRows,
        catalog,
        config.defaults.gamesPerCategory
      );
      const games = (catalog || []).map((row) => ({
        gameKey: row.game_key,
        category: row.category,
        titleHe: row.title_he,
        isEnabled: row.is_enabled === true,
        sortOrder: row.sort_order,
        guestPlayable: effectivePlayable.get(row.game_key) === true,
        sortPriority: guestByKey[row.game_key]?.sort_priority ?? row.sort_order ?? 0,
      }));
      return res.status(200).json({ ok: true, games });
    } catch (_e) {
      return sendAdminApiError(res, 500, "db_error", "db_error");
    }
  }

  if (req.method === "PUT") {
    try {
      const games = Array.isArray(req.body?.games) ? req.body.games : [];
      const [catalog, config] = await Promise.all([
        loadSiteGameCatalog(ctx.serviceRole),
        loadGuestRuntimeConfig(ctx.serviceRole),
      ]);
      const baselinePlayable = resolveDefaultGuestPlayableGameKeys(
        [],
        catalog,
        config.defaults.gamesPerCategory
      );

      for (const item of games) {
        const gameKey = String(item?.gameKey || item?.game_key || "").trim();
        if (!gameKey) continue;
        const requestedPlayable = item.guestPlayable === true || item.guest_playable === true;
        const baselinePlayableForGame = baselinePlayable.get(gameKey) === true;

        if (requestedPlayable === baselinePlayableForGame) {
          await ctx.serviceRole.from("guest_game_access").delete().eq("game_key", gameKey);
          continue;
        }

        await ctx.serviceRole.from("guest_game_access").upsert(
          {
            game_key: gameKey,
            guest_playable: requestedPlayable,
            sort_priority: Number(item.sortPriority ?? item.sort_priority ?? 0) || 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "game_key" }
        );
      }
      return res.status(200).json({ ok: true });
    } catch (_e) {
      return sendAdminApiError(res, 500, "db_error", "db_error");
    }
  }

  res.setHeader("Allow", "GET, PUT");
  return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
}
