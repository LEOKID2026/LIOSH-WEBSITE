/**
 * Shared Hebrew display titles for the 7 active arcade board games.
 * Never show a raw English gameKey (e.g. "fourline", "snakes-and-ladders") to a child -
 * always resolve through displayArcadeGameTitle() first.
 */

/** @type {Record<string, string>} */
export const ARCADE_GAME_TITLES_HE = {
  fourline: "ארבע בשורה",
  ludo: "לודו",
  "snakes-and-ladders": "נחשים וסולמות",
  checkers: "דמקה",
  chess: "שחמט",
  dominoes: "דומינו",
  bingo: "בינגו",
};

/**
 * @param {string} [gameKey]
 * @param {string} [fallback] optional Hebrew fallback if gameKey is unmapped
 * @returns {string} Hebrew title, or a generic Hebrew fallback — never the raw gameKey
 */
export function displayArcadeGameTitle(gameKey, fallback = "") {
  const key = String(gameKey || "").trim().toLowerCase();
  return ARCADE_GAME_TITLES_HE[key] || fallback || "משחק";
}
