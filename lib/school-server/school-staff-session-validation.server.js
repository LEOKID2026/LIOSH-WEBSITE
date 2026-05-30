/**
 * Pure staff session validation rules (no I/O).
 */

/**
 * @param {{ id?: string, expires_at?: string|null, revoked_at?: string|null }} sessionRow
 * @param {number} [nowMs]
 */
export function isStaffSessionRowActive(sessionRow, nowMs = Date.now()) {
  if (!sessionRow?.id) return false;
  if (sessionRow.revoked_at != null) return false;
  const exp = new Date(sessionRow.expires_at).getTime();
  if (!Number.isFinite(exp) || exp <= nowMs) return false;
  return true;
}

/**
 * Access row is usable for an authenticated staff session (excludes lockout — checked separately).
 * @param {{ id?: string, is_active?: boolean, revoked_at?: string|null }} accessRow
 */
export function isStaffAccessRowActiveForSession(accessRow) {
  if (!accessRow?.id) return false;
  if (!accessRow.is_active || accessRow.revoked_at != null) return false;
  return true;
}

/**
 * @param {string|null|undefined} staffRole
 */
export function staffPersonaForStaffRole(staffRole) {
  return staffRole === "school_operator" ? "school_operator" : "school_teacher";
}
