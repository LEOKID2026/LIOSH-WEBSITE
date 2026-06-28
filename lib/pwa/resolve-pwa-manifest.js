/** @typedef {'student' | 'parent' | 'teacher' | null} PwaPortal */

import { normalizeBrowserPath } from "./pwa-scope-routes.js";

export const STUDENT_MANIFEST_HREF = "/manifest-student.webmanifest";
export const PARENT_MANIFEST_HREF = "/manifest-parent.webmanifest";
export const TEACHER_MANIFEST_HREF = "/manifest-teacher.webmanifest";

/**
 * Resolve manifest from the browser URL (asPath), not the internal page file path.
 * @param {string} [pathname] Next.js router.pathname (file route)
 * @param {string} [asPath] Next.js router.asPath (browser URL)
 * @returns {string | null}
 */
export function resolvePwaManifestHref(pathname, asPath) {
  const path = normalizeBrowserPath(asPath || pathname);

  if (path.startsWith("/student/") || path === "/student/install-app" || path === "/kids") {
    return STUDENT_MANIFEST_HREF;
  }
  if (path.startsWith("/parent/") || path === "/parent/install-app" || path === "/parents") {
    return PARENT_MANIFEST_HREF;
  }
  if (path.startsWith("/teacher/") || path === "/teacher/install-app" || path === "/teachers") {
    return TEACHER_MANIFEST_HREF;
  }

  return null;
}

/**
 * @param {string} [pathname]
 * @param {string} [asPath]
 * @returns {PwaPortal}
 */
export function resolvePwaPortal(pathname, asPath) {
  const path = normalizeBrowserPath(asPath || pathname);

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
