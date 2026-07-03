import { requireArcadeStudent } from "../../../lib/arcade/server/arcade-auth";
import { ARCADE_GAME_REGISTRY } from "../../../lib/arcade/game-registry";
import { effectiveRoomPlayerCap } from "../../../lib/arcade/server/arcade-game-policy";
import { getEntryCostOptions } from "../../../lib/rewards/server/economy-config.server.js";
import { buildStudentGameAccessPayload } from "../../../lib/games/server/game-access.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = await requireArcadeStudent(req, res);
  if (!auth) return;

  try {
    const [gamesQuery, entryCostOptions, accessPayload] = await Promise.all([
      auth.supabase
        .from("arcade_games")
        .select(
          "game_key,title,enabled,foundation_only,min_players,max_players,supports_quick_match,supports_public_rooms,supports_private_rooms,allowed_entry_costs,created_at",
        )
        .order("game_key", { ascending: true }),
      getEntryCostOptions(auth.supabase),
      buildStudentGameAccessPayload(auth.supabase, auth.studentId),
    ]);

    const { data: rows, error } = gamesQuery;

    if (error) {
      return res.status(500).json({ ok: false, error: "טעינת משחקים נכשלה", code: "db_error" });
    }

    const catalogAmounts = new Set(entryCostOptions.map((o) => o.amount));
    const isGuest = accessPayload.isGuest === true;
    const playableKeys = new Set(
      (accessPayload.games || [])
        .filter((g) => g.category === "online" && g.playable)
        .map((g) => g.gameKey)
    );
    const enabledOnlineKeys = new Set(
      (accessPayload.games || [])
        .filter((g) => g.category === "online" && g.isEnabled)
        .map((g) => g.gameKey)
    );

    const list = (rows || [])
      .filter((r) => {
        if (isGuest) return enabledOnlineKeys.has(r.game_key);
        return playableKeys.has(r.game_key);
      })
      .map((r) => ({
      gameKey: r.game_key,
      title: r.title,
      enabled: r.enabled,
      foundationOnly: r.foundation_only,
      minPlayers: r.min_players,
      maxPlayers: effectiveRoomPlayerCap(r.game_key, r.max_players),
      supportsQuickMatch: r.supports_quick_match,
      supportsPublicRooms: r.supports_public_rooms,
      supportsPrivateRooms: r.supports_private_rooms,
      allowedEntryCosts: (Array.isArray(r.allowed_entry_costs) ? r.allowed_entry_costs : []).filter(
        (c) => catalogAmounts.has(c)
      ),
      createdAt: r.created_at,
      playable: playableKeys.has(r.game_key),
      guestLocked: isGuest && !playableKeys.has(r.game_key),
    }));

    const entryCostPayload = entryCostOptions.map((o) => ({
      amount: o.amount,
      labelHe: o.labelHe,
    }));

    if (list.length === 0) {
      return res.status(200).json({
        ok: true,
        games: ARCADE_GAME_REGISTRY.map((g) => ({
          gameKey: g.gameKey,
          title: g.title,
          enabled: false,
          foundationOnly: g.foundationOnly,
          minPlayers: g.minPlayers,
          maxPlayers: g.maxPlayers,
          supportsQuickMatch: true,
          supportsPublicRooms: true,
          supportsPrivateRooms: true,
          allowedEntryCosts: entryCostOptions.map((o) => o.amount),
          createdAt: null,
        })),
        entryCostOptions: entryCostPayload,
        fallback: true,
      });
    }

    return res.status(200).json({ ok: true, games: list, entryCostOptions: entryCostPayload });
  } catch (e) {
    if (e?.name === "EconomyUnavailableError") {
      return res.status(503).json({
        ok: false,
        error: e.code || "economy_unavailable",
        unavailable: true,
      });
    }
    return res.status(500).json({ ok: false, error: "שגיאת שרת" });
  }
}
