/** Dedicated student PWA install page (manifest.json loaded there only). */
export function isStudentPwaInstallActive() {
  if (typeof window === "undefined") return false;
  return window.location.pathname === "/student/install-app";
}

/** Dedicated parent PWA install page (manifest-parent loaded there only). */
export function isParentPwaInstallActive() {
  if (typeof window === "undefined") return false;
  return window.location.pathname === "/parent/install-app";
}

/** Dedicated teacher PWA install page (manifest-teacher loaded there only). */
export function isTeacherPwaInstallActive() {
  if (typeof window === "undefined") return false;
  return window.location.pathname === "/teacher/install-app";
}

export const STUDENT_PWA_INSTALL_PATH = "/student/install-app";
export const PARENT_PWA_INSTALL_PATH = "/parent/install-app";
export const TEACHER_PWA_INSTALL_PATH = "/teacher/install-app";
