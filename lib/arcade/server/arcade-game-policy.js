/**
 * Controls whether arcade spends are allowed for games still in foundation/disabled state.
 * Production default: real students cannot spend coins on foundation-only or disabled games.
 */

export function allowFoundationArcadeActions() {
  return String(process.env.ARCADE_ALLOW_FOUNDATION_ACTIONS || "").trim() === "true";
}

/**
 * @param {Record<string, unknown>} gameRow — row from arcade_games (snake_case fields from PostgREST)
 */
export function assertGameAllowsArcadeSpend(gameRow) {
  if (!gameRow || typeof gameRow !== "object") {
    return { error: { code: "unknown_game", message: "משחק לא קיים" } };
  }

  if (allowFoundationArcadeActions()) {
    return { ok: true };
  }

  const enabled = gameRow.enabled === true;
  const foundationOnly = gameRow.foundation_only === true;

  if (!enabled || foundationOnly) {
    return {
      error: {
        code: "game_not_active",
        message: "המשחק עדיין לא פעיל",
      },
    };
  }

  return { ok: true };
}

/** תקרת שחקנים לפי מנוע — כשה-DB/seed עדיין לא מסונכרן (למשל dominoes היה 4 ב-004). */
export const ARCADE_ENGINE_PLAYER_CAPS = {
  dominoes: 2,
};

/**
 * @param {string} gameKey
 * @param {number | null | undefined} catalogOrRoomMax
 */
export function effectiveRoomPlayerCap(gameKey, catalogOrRoomMax) {
  const engineCap = ARCADE_ENGINE_PLAYER_CAPS[String(gameKey || "")];
  if (engineCap != null) return engineCap;
  return Math.max(1, Math.floor(Number(catalogOrRoomMax ?? 1)));
}
