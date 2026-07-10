/** Routes that prefetch /api/student/game-access behind StudentAccessGate. */
export function studentPathNeedsGameAccess(pathname) {
  const p = pathname || "";
  return (
    p === "/games" ||
    p === "/game" ||
    p === "/offline" ||
    p.startsWith("/offline/") ||
    p.startsWith("/student/offline") ||
    p === "/student/games" ||
    p.startsWith("/student/games/") ||
    p === "/student/game" ||
    p.startsWith("/student/solo-games") ||
    p.startsWith("/student/educational-games") ||
    p.startsWith("/student/arcade")
  );
}
