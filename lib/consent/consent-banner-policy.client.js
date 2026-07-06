import { isImmersiveGameLayoutPath } from "../site-nav.js";

/**
 * Defer the cookie banner on immersive game/learning shells so it does not
 * cover active answer buttons or game controls. Consent defaults stay denied.
 * @param {string} pathname
 */
export function shouldDeferCookieConsentBanner(pathname) {
  const path = pathname || "";
  if (isImmersiveGameLayoutPath(path)) return true;
  if (path === "/game") return true;
  if (path.startsWith("/student/solo-games")) return true;
  if (path.startsWith("/student/educational-games")) return true;
  if (path.startsWith("/student/arcade")) return true;
  return false;
}
