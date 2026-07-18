/** @type {Set<string>} */
const prefetched = new Set();

const STUDENT_HUB_ROUTES = [
  "/student/home",
  "/student/games",
  "/student/arcade",
  "/student/cards",
  "/student/game",
  "/student/educational-games",
];

/**
 * Prefetch central student hub routes once per tab session.
 * @param {import("next/router").NextRouter} router
 */
export function prefetchStudentHubRoutes(router) {
  if (typeof window === "undefined" || !router?.prefetch) return;
  for (const route of STUDENT_HUB_ROUTES) {
    if (prefetched.has(route)) continue;
    prefetched.add(route);
    void router.prefetch(route);
  }
}

/**
 * Prefetch a game route on intent (hover/focus/touch).
 * @param {import("next/router").NextRouter} router
 * @param {string} href
 */
export function prefetchStudentGameRoute(router, href) {
  if (typeof window === "undefined" || !router?.prefetch || !href) return;
  const path = String(href).split("?")[0].split("#")[0];
  if (!path.startsWith("/student/")) return;
  if (prefetched.has(path)) return;
  prefetched.add(path);
  void router.prefetch(path);
}

export function resetStudentHubPrefetchForTests() {
  prefetched.clear();
}
