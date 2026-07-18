const DEMO_ONLINE_GAME_ROUTES = new Set([
  "/student/games/fourline",
  "/student/games/ludo",
  "/student/games/snakes-and-ladders",
  "/student/games/checkers",
  "/student/games/chess",
  "/student/games/dominoes",
  "/student/games/bingo",
]);

/** @param {string} pathname */
export function isDemoOnlineGameRoute(pathname) {
  return DEMO_ONLINE_GAME_ROUTES.has(String(pathname || "").trim());
}
