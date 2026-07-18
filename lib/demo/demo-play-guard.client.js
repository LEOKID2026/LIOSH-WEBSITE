import { isDemoMode, isPlayExpired, readDemoSession } from "./demo-mode.client.js";

/** @type {(() => void) | null} */
let notifyDemoTimeExpiredFn = null;

/** @param {(() => void) | null} fn */
export function registerDemoTimeExpiredNotifier(fn) {
  notifyDemoTimeExpiredFn = fn;
}

export function notifyDemoTimeExpired() {
  notifyDemoTimeExpiredFn?.();
}

/** Only when starting a new activity / session / game / round. */
export function assertDemoPlayAllowed() {
  if (!isDemoMode()) return true;
  if (!isPlayExpired(readDemoSession())) return true;
  notifyDemoTimeExpired();
  return false;
}

export const DEMO_TIME_EXPIRED_CODE = "demo_time_expired";
