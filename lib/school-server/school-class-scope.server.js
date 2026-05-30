/**
 * Pure school class scope rules (no I/O).
 * A class is in scope only when school_id matches AND the owning teacher is in the school roster.
 *
 * @param {{ id?: string, teacher_id?: string, school_id?: string|null }} classRow
 * @param {string} schoolId
 * @param {string[]} schoolTeacherIds
 */
export function isSchoolClassRowInScope(classRow, schoolId, schoolTeacherIds) {
  if (!classRow?.id) return false;
  if (!classRow.teacher_id) return false;
  if (!schoolId || classRow.school_id !== schoolId) return false;
  if (!Array.isArray(schoolTeacherIds) || !schoolTeacherIds.includes(classRow.teacher_id)) {
    return false;
  }
  return true;
}
