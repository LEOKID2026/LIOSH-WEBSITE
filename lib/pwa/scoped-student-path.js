/**
 * Student portal URLs under /student/* (PWA manifest scope).
 * Legacy /games, /learning, /offline remain for bookmarks — no redirects yet.
 */

export const STUDENT_HOME_HREF = "/student/home";
export const STUDENT_GAMES_HREF = "/student/games";
export const STUDENT_GAME_HREF = "/student/game";
export const STUDENT_LEARNING_HREF = "/student/learning";
export const STUDENT_OFFLINE_HREF = "/student/offline";

/** @param {string} [subpath] e.g. "math-master" or "curriculum?subject=math" */
export function studentLearningHref(subpath = "") {
  const raw = String(subpath || "").replace(/^\//, "");
  return raw ? `${STUDENT_LEARNING_HREF}/${raw}` : STUDENT_LEARNING_HREF;
}

/** @param {string} [subpath] e.g. "tic-tac-toe" */
export function studentOfflineHref(subpath = "") {
  const raw = String(subpath || "").replace(/^\//, "");
  return raw ? `${STUDENT_OFFLINE_HREF}/${raw}` : STUDENT_OFFLINE_HREF;
}

export const PARENT_REPORT_HREF = "/parent/parent-report";
export const PARENT_REPORT_DETAILED_HREF = "/parent/parent-report-detailed";
export const PARENT_GUARDIAN_VIEW_HREF = "/parent/guardian/view";
export const TEACHER_PARENT_REPORT_HREF = "/teacher/parent-report";
export const TEACHER_PARENT_REPORT_DETAILED_HREF = "/teacher/parent-report-detailed";

/**
 * Parent/teacher report pages share one component; pick scoped base from Next pathname.
 * @param {string} pathname router.pathname
 * @returns {"/parent" | "/teacher" | "/learning"}
 */
export function reportPortalBase(pathname) {
  const path = pathname || "";
  if (path.startsWith("/parent/")) return "/parent";
  if (path.startsWith("/teacher/")) return "/teacher";
  return "/learning";
}

/**
 * Maps legacy student URLs to /student/* scope (PWA). Non-student paths unchanged.
 * @param {string} path
 */
export function studentScopeLegacyPath(path) {
  const raw = String(path || "");
  if (!raw || raw.startsWith("/student/")) return raw;
  if (raw === "/games") return STUDENT_GAMES_HREF;
  if (raw === "/game") return STUDENT_GAME_HREF;
  if (raw === "/offline" || raw.startsWith("/offline/")) return `/student${raw}`;
  if (raw === "/learning" || raw.startsWith("/learning/")) return `/student${raw}`;
  return raw;
}

/** @param {string} pathname router.pathname */
export function reportDetailedPathname(pathname) {
  return `${reportPortalBase(pathname)}/parent-report-detailed`;
}

/** @param {string} pathname router.pathname */
export function reportSummaryPathname(pathname) {
  return `${reportPortalBase(pathname)}/parent-report`;
}

/** @param {string} pathname router.pathname */
export function reportExitHref(pathname) {
  const base = reportPortalBase(pathname);
  if (base === "/parent") return "/parent/dashboard";
  if (base === "/teacher") return "/teacher/dashboard";
  return STUDENT_LEARNING_HREF;
}
