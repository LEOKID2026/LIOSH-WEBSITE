/** Exact pathnames historically wrapped by StudentAccessGate (kept for regression tests). */
export const STUDENT_PROTECTED_ROUTE_EXACT = new Set([
  "/games",
  "/game",
  "/gallery",
  "/offline",
  "/offline/tic-tac-toe",
  "/offline/rock-paper-scissors",
  "/offline/tap-battle",
  "/offline/memory-match",
  "/student/home",
  "/student/game",
  "/student/games",
  "/student/cards",
  "/student/arcade",
  "/student/arcade/my-room",
  "/student/games/fourline",
  "/student/games/ludo",
  "/student/games/snakes-and-ladders",
  "/student/games/checkers",
  "/student/games/chess",
  "/student/games/dominoes",
  "/student/games/bingo",
  "/student/solo-games",
  "/student/solo-games/catcher",
  "/student/solo-games/puzzle",
  "/student/solo-games/memory",
  "/student/solo-games/flyer",
  "/student/solo-games/leo-jump",
  "/student/solo-games/balloons",
  "/student/solo-games/maze",
  "/student/solo-games/picture-puzzle",
  "/student/solo-games/target-tap",
  "/student/solo-games/sort-shapes",
  "/student/solo-games/smart-blocks",
  "/student/solo-games/fruit-slice",
  "/student/solo-games/leo-miners",
  "/student/educational-games",
  "/student/educational-games/recycling-factory",
  "/student/educational-games/leo-supermarket",
  "/student/educational-games/leo-lab",
  "/student/educational-games/leo-gifts",
  "/student/educational-games/leo-bakery",
  "/student/educational-games/leo-number-path",
  "/student/educational-games/leo-pizzeria",
  "/student/educational-games/leo-word-train",
  "/student/educational-games/leo-word-detective",
  "/student/activity/[activityId]",
  "/student/offline",
  "/student/offline/solo/[gameKey]",
  "/student/offline/educational/[gameKey]",
  "/learning",
  "/learning/math-master",
  "/learning/geometry-master",
  "/learning/english-master",
  "/learning/hebrew-master",
  "/learning/science-master",
  "/learning/moledet-master",
  "/learning/geography-master",
  "/learning/history-master",
  "/learning/moledet-geography-master",
  "/learning/curriculum",
  "/learning/geometry-curriculum",
  "/learning/book/math/g1",
  "/learning/book/math/g1/[pageId]",
  "/learning/book/geometry/g1",
  "/learning/book/geometry/g1/[pageId]",
  "/learning/book/geometry/g3",
  "/learning/book/geometry/g3/[pageId]",
  "/learning/book/[subject]/[grade]",
  "/learning/book/[subject]/[grade]/[pageId]",
  "/student/learning/book/[subject]/[grade]",
  "/student/learning/book/[subject]/[grade]/[pageId]",
  "/student/learning",
  "/student/learning/math-master",
  "/student/learning/geometry-master",
  "/student/learning/english-master",
  "/student/learning/hebrew-master",
  "/student/learning/science-master",
  "/student/learning/moledet-master",
  "/student/learning/geography-master",
  "/student/learning/history-master",
  "/student/learning/moledet-geography-master",
  "/learning/dev-student-simulator",
]);

/** Student routes that must NOT require session (login, install, debug). */
export const STUDENT_ROUTE_PUBLIC_EXACT = new Set([
  "/student/login",
  "/student/install-app",
  "/student/pwa-debug",
  "/student/world-home-prototype",
]);

/** Learning routes excluded from student gate (parent reports, dev tools). */
export const LEARNING_ROUTE_PUBLIC_PREFIXES = [
  "/learning/parent-report",
  "/learning/dev/",
];

/** @param {string} pathname */
function isLearningProtectedRoute(pathname) {
  const p = pathname || "";
  if (!p.startsWith("/learning")) return false;
  if (p === "/learning/dev-student-simulator" || p === "/learning/dev-db-report-preview") {
    return true;
  }
  if (LEARNING_ROUTE_PUBLIC_PREFIXES.some((prefix) => p.startsWith(prefix))) {
    return false;
  }
  return p === "/learning" || p.startsWith("/learning/");
}

/** @param {string} pathname */
function isStudentPortalRoute(pathname) {
  const p = pathname || "";
  if (!p.startsWith("/student/")) return false;
  if (STUDENT_ROUTE_PUBLIC_EXACT.has(p)) return false;
  return true;
}

/** @param {string} pathname */
export function isStudentProtectedRoute(pathname) {
  const p = pathname || "";
  if (STUDENT_PROTECTED_ROUTE_EXACT.has(p)) return true;
  if (isStudentPortalRoute(p)) return true;
  return false;
}

/** Routes accessible with leokids_demo_session (no student cookie). */
export const DEMO_ACCESSIBLE_ROUTE_EXACT = new Set([
  ...STUDENT_PROTECTED_ROUTE_EXACT,
  "/student/worksheet/[worksheetId]",
]);

/** @param {string} pathname */
export function isDemoAccessibleRoute(pathname) {
  const p = pathname || "";
  if (DEMO_ACCESSIBLE_ROUTE_EXACT.has(p)) return true;
  if (isStudentPortalRoute(p)) return true;
  if (STUDENT_PROTECTED_ROUTE_EXACT.has(p)) return true;
  return false;
}

/** True when pathname is under the student portal shell (for prefetch). */
export function isStudentWorldRoute(pathname) {
  return isStudentPortalRoute(pathname) || isLearningProtectedRoute(pathname);
}
