/**
 * Fetch GET /api/student/home-profile (missions init + account snapshot).
 * Read-only - used by subject-page "אתגרים" modal.
 */

import { syncMonthlyProgressCacheFromServer } from "../../utils/progress-storage.js";

/**
 * @returns {Promise<Record<string, unknown>>}
 */
export async function fetchStudentHomeProfile() {
  const res = await fetch("/api/student/home-profile", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok !== true) {
    const msg = json?.error ? String(json.error) : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (json?.derived) {
    syncMonthlyProgressCacheFromServer(json.studentId, json.derived);
  }
  return json;
}
