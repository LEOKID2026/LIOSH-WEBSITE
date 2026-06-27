/** @typedef {'student' | 'parent' | 'teacher' | null} PwaPortal */

export const STUDENT_MANIFEST_HREF = "/manifest-student.webmanifest";
export const PARENT_MANIFEST_HREF = "/manifest-parent.webmanifest";
export const TEACHER_MANIFEST_HREF = "/manifest-teacher.webmanifest";

/**
 * Exactly one manifest per page — never stack multiple link[rel=manifest].
 * Only install routes and in-portal pages (not marketing landings).
 * @param {string} pathname Next.js router.pathname
 * @returns {string | null}
 */
export function resolvePwaManifestHref(pathname) {
  const path = pathname || "";

  if (path.startsWith("/student/")) {
    return STUDENT_MANIFEST_HREF;
  }
  if (path.startsWith("/parent/")) {
    return PARENT_MANIFEST_HREF;
  }
  if (path.startsWith("/teacher/")) {
    return TEACHER_MANIFEST_HREF;
  }

  return null;
}

/**
 * @param {string} pathname
 * @returns {PwaPortal}
 */
export function resolvePwaPortal(pathname) {
  const path = pathname || "";
  if (path === "/student/install-app" || path.startsWith("/student/") || path === "/kids") {
    return "student";
  }
  if (path === "/parent/install-app" || path.startsWith("/parent/") || path === "/parents") {
    return "parent";
  }
  if (path === "/teacher/install-app" || path.startsWith("/teacher/") || path === "/teachers") {
    return "teacher";
  }
  return null;
}
