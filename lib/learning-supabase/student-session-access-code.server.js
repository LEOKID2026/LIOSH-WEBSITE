/**
 * Pure access-code binding rules for student sessions (no I/O).
 * @param {{ access_code_id?: string|null }} sessionRow
 * @param {{ id?: string, is_active?: boolean, revoked_at?: string|null }|null|undefined} codeRow
 */
export function isStudentSessionAccessCodeBindingValid(sessionRow, codeRow) {
  if (!sessionRow?.access_code_id) return false;
  if (!codeRow?.id) return false;
  if (codeRow.is_active === false) return false;
  if (codeRow.revoked_at) return false;
  return true;
}
