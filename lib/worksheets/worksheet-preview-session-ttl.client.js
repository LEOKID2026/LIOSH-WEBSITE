/**
 * Shared 2h TTL for worksheet preview session storage.
 * @module lib/worksheets/worksheet-preview-session-ttl.client
 */

/** @type {number} */
export const WORKSHEET_PREVIEW_SESSION_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * @param {{ savedAt?: number | null }} [data]
 * @returns {boolean}
 */
export function isWorksheetPreviewSessionExpired(data) {
  if (!data?.savedAt || typeof data.savedAt !== "number") return false;
  return Date.now() - data.savedAt > WORKSHEET_PREVIEW_SESSION_TTL_MS;
}
