/**
 * Client-safe public paths for ready question worksheets.
 * @module lib/worksheets/worksheet-ready-public-paths
 */

/**
 * @param {string} slug
 * @returns {string}
 */
export function readyWorksheetPublicPath(slug) {
  return `/practice/worksheets/${String(slug || "").trim()}`;
}
