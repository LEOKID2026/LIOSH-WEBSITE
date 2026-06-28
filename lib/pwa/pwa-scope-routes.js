/** Canonical browser URLs for scoped PWAs (must stay within manifest scope). */

export const STUDENT_GAMES_HUB = "/student/games";
export const STUDENT_SOLO_HUB = "/student/game";
export const STUDENT_OFFLINE_HUB = "/student/offline";
export const STUDENT_LEARNING_HUB = "/student/learning";
export const STUDENT_GALLERY = "/student/gallery";

export const PARENT_REPORT_PATH = "/parent/parent-report";
export const PARENT_REPORT_DETAILED_PATH = "/parent/parent-report-detailed";
export const TEACHER_REPORT_PATH = "/teacher/parent-report";
export const TEACHER_REPORT_DETAILED_PATH = "/teacher/parent-report-detailed";

export const PARENT_GUARDIAN_VIEW_PATH = "/parent/guardian/view";
export const PARENT_GUARDIAN_LOGIN_PATH = "/parent/guardian/login";

/**
 * Strip query/hash for scope checks.
 * @param {string} [pathOrUrl]
 */
export function normalizeBrowserPath(pathOrUrl) {
  return String(pathOrUrl || "").split("?")[0].split("#")[0] || "/";
}

/**
 * Maps legacy out-of-scope paths to scoped PWA browser URLs.
 * @param {string} pathname
 * @param {URLSearchParams} [searchParams]
 * @returns {string | null}
 */
export function mapLegacyPathToScopedPath(pathname, searchParams) {
  const path = normalizeBrowserPath(pathname);
  if (!path || path.startsWith("/student/") || path.startsWith("/parent/") || path.startsWith("/teacher/")) {
    return null;
  }

  if (path === "/games") return STUDENT_GAMES_HUB;
  if (path === "/game") return STUDENT_SOLO_HUB;
  if (path === "/gallery") return STUDENT_GALLERY;
  if (path === "/offline") return STUDENT_OFFLINE_HUB;
  if (path.startsWith("/offline/")) return `/student${path}`;

  if (path === "/learning/parent-report" || path === "/learning/parent-report-detailed") {
    const source = String(searchParams?.get("source") || "").trim().toLowerCase();
    if (source === "teacher") {
      return path === "/learning/parent-report" ? TEACHER_REPORT_PATH : TEACHER_REPORT_DETAILED_PATH;
    }
    return path === "/learning/parent-report" ? PARENT_REPORT_PATH : PARENT_REPORT_DETAILED_PATH;
  }

  if (path === "/learning") return STUDENT_LEARNING_HUB;
  if (path.startsWith("/learning/")) return `/student${path}`;

  if (path === "/guardian/view") return PARENT_GUARDIAN_VIEW_PATH;
  if (path === "/guardian/login") return PARENT_GUARDIAN_LOGIN_PATH;

  return null;
}

/**
 * @param {"parent" | "teacher" | string} [source]
 */
export function reportHubPathForSource(source) {
  return String(source || "").trim().toLowerCase() === "teacher" ? TEACHER_REPORT_PATH : PARENT_REPORT_PATH;
}

/**
 * @param {"parent" | "teacher" | string} [source]
 */
export function reportDetailedPathForSource(source) {
  return String(source || "").trim().toLowerCase() === "teacher"
    ? TEACHER_REPORT_DETAILED_PATH
    : PARENT_REPORT_DETAILED_PATH;
}

export function reportExitPathForSource(source) {
  return String(source || "").trim().toLowerCase() === "teacher" ? "/teacher/dashboard" : "/parent/dashboard";
}

/**
 * Prefix learning routes for student PWA scope.
 * @param {string} path
 */
export function toStudentLearningPath(path) {
  const raw = String(path || "");
  const base = normalizeBrowserPath(raw);
  if (base.startsWith("/student/learning")) return raw;
  if (base === "/learning") return STUDENT_LEARNING_HUB;
  if (base.startsWith("/learning/")) return `/student${base}${raw.slice(base.length)}`;
  return raw;
}
