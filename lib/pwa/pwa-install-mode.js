/** True when the page uses the parent PWA manifest (dedicated install route only). */
export function isParentPwaInstallActive() {
  if (typeof window === "undefined") return false;
  return window.location.pathname === "/parent/install-app";
}

export const PARENT_PWA_INSTALL_PATH = "/parent/install-app";
