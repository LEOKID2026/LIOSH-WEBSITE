import { assertGuestArcadeFeature } from "../../guest/guest-feature-permissions.server.js";

const FEATURE_BY_ROOM_ACTION = Object.freeze({
  public: "room_public_create",
  private: "room_private_create",
  quick: "quick_game",
});

/**
 * Unified arcade permission gate: game access + guest feature (Admin-controlled).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} gameKey
 * @param {{ roomAction?: 'public'|'private'|'quick'|'join'|'join_by_code', featureKey?: string }} opts
 */
export async function assertArcadePlayAccess(supabase, studentId, gameKey, opts = {}) {
  const { assertStudentCanPlayGame } = await import("../../games/server/game-access.server.js");

  const gameAccess = await assertStudentCanPlayGame(supabase, studentId, gameKey);
  if (!gameAccess.ok) return gameAccess;

  let featureKey = opts.featureKey || null;
  if (!featureKey && opts.roomAction) {
    if (opts.roomAction === "join_by_code") featureKey = "room_join_by_code";
    else featureKey = FEATURE_BY_ROOM_ACTION[opts.roomAction] || null;
  }

  if (featureKey) {
    const feature = await assertGuestArcadeFeature(supabase, studentId, featureKey);
    if (!feature.ok) return feature;
  }

  return { ok: true, access: gameAccess.access, catalogRow: gameAccess.catalogRow };
}
