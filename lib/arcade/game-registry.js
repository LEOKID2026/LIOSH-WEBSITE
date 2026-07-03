/**
 * Static arcade catalog for UI. Database `arcade_games` is authoritative when seeded.
 * Entry costs come from reward_economy_entry_cost_options (Admin/DB).
 */

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
    maxPlayers: 2,
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
