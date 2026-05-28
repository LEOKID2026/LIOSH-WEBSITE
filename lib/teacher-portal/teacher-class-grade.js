import { normalizeSubject } from "../learning-supabase/learning-activity.js";
import { formatGradeLevelHe, normalizeGradeLevelToKey } from "../learning-student-defaults.js";

export { formatGradeLevelHe, normalizeGradeLevelToKey };

/**
 * Canonical g1–g6 key for activity/discussion flows, or "" when unknown.
 * @param {unknown} raw
 */
export function resolveCanonicalGradeKey(raw) {
  return normalizeGradeLevelToKey(raw);
}

/**
 * School class create authorization: compare normalized grade keys only.
 * @param {unknown} bodyGrade
 * @param {unknown} classGrade
 */
export function classGradeKeysMatch(bodyGrade, classGrade) {
  const bodyKey = normalizeGradeLevelToKey(bodyGrade);
  const classKey = normalizeGradeLevelToKey(classGrade);
  return Boolean(bodyKey && classKey && bodyKey === classKey);
}

/**
 * Normalize class subject_focus to canonical allowlist key when possible.
 * @param {unknown} raw
 */
export function resolveClassSubjectFocus(raw) {
  if (raw == null || String(raw).trim() === "") return null;
  return normalizeSubject(raw) || String(raw).trim().toLowerCase();
}

/**
 * Grade keys match when either side is unrestricted (null/empty), or normalized keys equal.
 * Used for school_teacher_subjects permission rows.
 * @param {unknown} permittedGrade
 * @param {unknown} requestGrade
 */
export function schoolSubjectGradeKeysMatch(permittedGrade, requestGrade) {
  if (permittedGrade == null || String(permittedGrade).trim() === "") return true;
  const requestKey = normalizeGradeLevelToKey(requestGrade);
  if (!requestKey) return true;
  const permittedKey = normalizeGradeLevelToKey(permittedGrade);
  if (!permittedKey) return true;
  return permittedKey === requestKey;
}

/**
 * @param {{ gradeLevel?: string|null, subjectFocus?: string|null, name?: string|null }|null|undefined} cls
 */
export function loadClassActivityContextFromApiClass(cls) {
  const gradeKey = resolveCanonicalGradeKey(cls?.gradeLevel);
  const subjectFocus = cls?.subjectFocus ? resolveClassSubjectFocus(cls.subjectFocus) : null;
  return {
    gradeKey,
    subjectFocus,
    gradeLocked: Boolean(cls?.gradeLevel),
    subjectLocked: Boolean(cls?.subjectFocus),
    className: cls?.name || "",
    loaded: Boolean(cls),
  };
}
