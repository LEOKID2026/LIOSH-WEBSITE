/**
 * Client-safe helpers for hiding internal/demo access usernames in user-facing UI.
 */

const DEMO_USERNAME_PREFIX = "demo-";
const LEOK_SIM_USERNAME_RE = /^leok-s\d+$/i;
const SIMULATION_TEACHER_PREFIX = "leo";
const MODERN_ACCESS_USERNAME_RE = /^([a-z]{3})-([ps])(\d+)$/;
const LEGACY_ACCESS_USERNAME_RE = /^([a-z]{3})-(\d+)$/;

/**
 * @param {string} username
 * @returns {string|null}
 */
function accessUsernamePrefix(username) {
  const normalized = String(username || "").trim().toLowerCase();
  const modern = MODERN_ACCESS_USERNAME_RE.exec(normalized);
  if (modern) return modern[1];
  const legacy = LEGACY_ACCESS_USERNAME_RE.exec(normalized);
  if (legacy) return legacy[1];
  return null;
}

/**
 * Internal/demo/simulation usernames that must not appear in normal user-facing UI.
 * @param {string|null|undefined} username
 */
export function isInternalDemoStudentAccessUsername(username) {
  const normalized = String(username || "").trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith(DEMO_USERNAME_PREFIX)) return true;
  if (LEOK_SIM_USERNAME_RE.test(normalized)) return true;
  if (accessUsernamePrefix(normalized) === SIMULATION_TEACHER_PREFIX) return true;
  return false;
}

/**
 * @param {string|null|undefined} accessCode
 * @param {Record<string, unknown>|null|undefined} [_student]
 * @param {Record<string, unknown>|null|undefined} [_context]
 */
export function shouldDisplayStudentAccessCode(accessCode, _student = null, _context = null) {
  void _student;
  void _context;
  const code = String(accessCode || "").trim();
  if (!code) return false;
  return !isInternalDemoStudentAccessUsername(code);
}

/**
 * @param {string|null|undefined} accessCode
 * @param {Record<string, unknown>|null|undefined} [student]
 * @param {Record<string, unknown>|null|undefined} [context]
 */
export function formatStudentAccessDisplayLabel(accessCode, student = null, context = null) {
  return shouldDisplayStudentAccessCode(accessCode, student, context) ? String(accessCode).trim() : null;
}
