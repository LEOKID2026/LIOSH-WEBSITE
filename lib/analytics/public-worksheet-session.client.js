import {
  PUBLIC_WORKSHEET_PAGE_VIEW_SENT_KEY,
  PUBLIC_WORKSHEET_SESSION_STORAGE_KEY,
} from "./public-worksheet-analytics.constants.js";

export {
  PUBLIC_WORKSHEET_SESSION_STORAGE_KEY,
  PUBLIC_WORKSHEET_PAGE_VIEW_SENT_KEY,
} from "./public-worksheet-analytics.constants.js";

/**
 * @returns {string | null}
 */
export function getPublicWorksheetVisitSessionId() {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.sessionStorage.getItem(PUBLIC_WORKSHEET_SESSION_STORAGE_KEY);
    if (existing && isValidVisitSessionUuid(existing)) return existing;
    const created = createVisitSessionUuid();
    window.sessionStorage.setItem(PUBLIC_WORKSHEET_SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return null;
  }
}

/**
 * @returns {boolean}
 */
export function wasPublicWorksheetPageViewSent() {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(PUBLIC_WORKSHEET_PAGE_VIEW_SENT_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPublicWorksheetPageViewSent() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PUBLIC_WORKSHEET_PAGE_VIEW_SENT_KEY, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Atomically claim the one page-view send slot for this tab session.
 * Prevents duplicate sends under React Strict Mode double-mount.
 *
 * @returns {boolean}
 */
export function claimPublicWorksheetPageViewSend() {
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem(PUBLIC_WORKSHEET_PAGE_VIEW_SENT_KEY) === "1") {
      return false;
    }
    window.sessionStorage.setItem(PUBLIC_WORKSHEET_PAGE_VIEW_SENT_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isValidVisitSessionUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

function createVisitSessionUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}
