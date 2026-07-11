/**
 * Maps learning engine subjects / routes to parent permission keys.
 * LEARNING_SUBJECT_ALLOWLIST is unchanged — moledet_geography stays the engine key.
 */

/** @type {readonly string[]} */
export const SUBJECT_PERMISSION_KEYS = Object.freeze([
  "math",
  "geometry",
  "hebrew",
  "english",
  "science",
  "history",
  "moledet",
  "geography",
]);

const PERMISSION_KEY_SET = new Set(SUBJECT_PERMISSION_KEYS);

const DIRECT_MAP = Object.freeze({
  math: "math",
  geometry: "geometry",
  hebrew: "hebrew",
  english: "english",
  science: "science",
  history: "history",
  moledet: "moledet",
  geography: "geography",
});

/**
 * @param {string|null|undefined} permissionKey
 */
export function isSubjectPermissionKey(permissionKey) {
  return PERMISSION_KEY_SET.has(String(permissionKey || "").trim());
}

/**
 * Resolve parent permission key from activity/session subject and optional strand.
 * @param {{
 *   subject?: string|null,
 *   visualStrand?: string|null,
 *   permissionSubjectKey?: string|null,
 *   routeSubject?: string|null,
 * }} input
 * @returns {string|null}
 */
export function resolvePermissionSubjectKey(input = {}) {
  const explicit = String(input.permissionSubjectKey || "").trim();
  if (isSubjectPermissionKey(explicit)) return explicit;

  const routeSubject = String(input.routeSubject || "").trim().toLowerCase();
  if (isSubjectPermissionKey(routeSubject)) return routeSubject;

  const subject = String(input.subject || "").trim().toLowerCase();
  if (subject === "moledet_geography") {
    const strand = String(input.visualStrand || "").trim().toLowerCase();
    if (strand === "moledet") return "moledet";
    if (strand === "geography") return "geography";
    if (routeSubject === "moledet") return "moledet";
    if (routeSubject === "geography") return "geography";
    return null;
  }

  return DIRECT_MAP[subject] || null;
}

/**
 * Engine subject key for sessions/API from permission key (inverse for writes).
 * @param {string} permissionKey
 * @param {{ visualStrand?: string|null }} [options]
 */
export function permissionKeyToEngineSubject(permissionKey, options = {}) {
  const key = String(permissionKey || "").trim();
  if (key === "moledet" || key === "geography") return "moledet_geography";
  return DIRECT_MAP[key] || key;
}
