import { useStudentSubjectAccessContext } from "../contexts/StudentSubjectAccessContext.jsx";

/**
 * @param {string} permissionKey
 */
export function useStudentSubjectAccess(permissionKey) {
  const ctx = useStudentSubjectAccessContext();
  const key = String(permissionKey || "").trim();
  const row = ctx?.subjectPermissions?.[key];

  const enforced = ctx?.enforced === true;

  return {
    enforced,
    /** @deprecated use `enforced` — kept for callers that already destructure this name */
    subjectAccessEnforced: enforced,
    canPickGrade: ctx?.enforced !== true || ctx?.allowStudentGradePicker === true,
    isSubjectLocked: enforced && row?.isEnabled === false,
    isGradeSuitable: row?.isGradeSuitable === true,
    effectiveGrade: row?.effectiveGrade || null,
    subjectPermission: row || null,
  };
}
