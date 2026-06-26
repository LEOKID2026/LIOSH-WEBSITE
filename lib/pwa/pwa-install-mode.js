/** Dedicated student PWA install page (beforeinstallprompt capture). */
export function isStudentPwaInstallActive() {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return path === STUDENT_PWA_INSTALL_PATH || path === "/kids";
}

/** Dedicated parent PWA install page (manifest-parent loaded there only). */
export function isParentPwaInstallActive() {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return path === PARENT_PWA_INSTALL_PATH || path === "/parents";
}

/** Dedicated teacher PWA install page (manifest-teacher loaded there only). */
export function isTeacherPwaInstallActive() {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return path === TEACHER_PWA_INSTALL_PATH || path === "/teachers";
}

export const STUDENT_PWA_INSTALL_PATH = "/student/install-app";
export const PARENT_PWA_INSTALL_PATH = "/parent/install-app";
export const TEACHER_PWA_INSTALL_PATH = "/teacher/install-app";
