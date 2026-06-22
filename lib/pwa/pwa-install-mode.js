/** True when the page should use the parent PWA manifest / install prompt. */
export function isParentPwaInstallActive() {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("pwa_parent") === "1") return true;
  if (window.location.pathname === "/parent/install-app") return true;
  return false;
}

export const PARENT_PWA_INSTALL_QUERY = "pwa_parent=1";
export const PARENT_PWA_INSTALL_SESSION_KEY = "pwa-parent-install-pending";
