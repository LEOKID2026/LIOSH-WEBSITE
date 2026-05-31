/**
 * Resolve school operator grants from /api/school/me payload.
 * @param {{ portalRole?: string, operator?: { grants?: { studentAccessAdmin?: boolean, studentDataViewer?: boolean } } }|null|undefined} me
 */
export function getOperatorGrants(me) {
  if (!me || me.portalRole !== "school_operator") {
    return { studentAccessAdmin: false, studentDataViewer: false };
  }
  const grants = me.operator?.grants || {};
  return {
    studentAccessAdmin: grants.studentAccessAdmin === true,
    studentDataViewer: grants.studentDataViewer === true,
  };
}

/** @param {Parameters<typeof getOperatorGrants>[0]} me */
export function isSchoolManagerPortal(me) {
  return me?.portalRole === "school_manager";
}

/** @param {Parameters<typeof getOperatorGrants>[0]} me */
export function canManageStudentAccess(me) {
  return isSchoolManagerPortal(me) || getOperatorGrants(me).studentAccessAdmin;
}

/** @param {Parameters<typeof getOperatorGrants>[0]} me */
export function canViewStudentData(me) {
  return isSchoolManagerPortal(me) || getOperatorGrants(me).studentDataViewer;
}

/** @param {Parameters<typeof getOperatorGrants>[0]} me */
export function canBrowseSchoolStudents(me) {
  return canManageStudentAccess(me) || canViewStudentData(me);
}

/** @param {Parameters<typeof getOperatorGrants>[0]} me */
export function operatorHasAnyGrant(me) {
  const grants = getOperatorGrants(me);
  return grants.studentAccessAdmin || grants.studentDataViewer;
}

/**
 * Bearer JWT or staff code/PIN session cookie (same-origin).
 * @param {string|null|undefined} accessToken
 * @param {string|null|undefined} authMethod
 */
export function hasSchoolPortalSession(accessToken, authMethod) {
  return Boolean(accessToken) || authMethod === "staff_cookie";
}
