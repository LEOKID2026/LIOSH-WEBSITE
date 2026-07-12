import { NAV_AREAS } from "./site-nav.js";

const STORAGE_KEY = "leo-site-nav-portal-v1";

/** @param {string | null | undefined} value */
export function normalizeSiteNavPortal(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v === NAV_AREAS.student || v === NAV_AREAS.parent || v === NAV_AREAS.teacher) {
    return v;
  }
  return null;
}

/** @returns {string | null} */
export function readSiteNavPortal() {
  if (typeof window === "undefined") return null;
  try {
    return normalizeSiteNavPortal(window.sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** @param {string} area */
export function persistSiteNavPortal(area) {
  if (typeof window === "undefined") return;
  const normalized = normalizeSiteNavPortal(area);
  if (!normalized) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    /* quota / private mode */
  }
}

export function clearSiteNavPortal() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
