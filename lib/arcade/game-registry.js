/**
 * Static arcade catalog for UI/fallback. Database `arcade_games` is authoritative when seeded.
 * Phase Arcade-1: all games remain disabled until wired (Arcade-2/3).
 */

export const ARCADE_ENTRY_COSTS = [10, 100, 1000, 10000];

export const ARCADE_GAME_REGISTRY = [
  {
    gameKey: "fourline",
    title: "ארבע בשורה",
    foundationOnly: true,
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    gameKey: "checkers",
    title: "Checkers",
    foundationOnly: true,
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    gameKey: "chess",
    title: "Chess",
    foundationOnly: true,
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    gameKey: "snakes-and-ladders",
    title: "Snakes and Ladders",
    foundationOnly: true,
    minPlayers: 2,
    maxPlayers: 4,
  },
  {
    gameKey: "dominoes",
    title: "Dominoes",
    foundationOnly: true,
    minPlayers: 2,
    maxPlayers: 4,
  },
  {
    gameKey: "bingo",
    title: "Bingo",
    foundationOnly: true,
    minPlayers: 2,
    maxPlayers: 8,
  },
  {
    gameKey: "ludo",
    title: "לודו",
    foundationOnly: true,
    minPlayers: 2,
    maxPlayers: 4,
  },
];

export function findRegistryGame(gameKey) {
  return ARCADE_GAME_REGISTRY.find((g) => g.gameKey === gameKey) || null;
}
