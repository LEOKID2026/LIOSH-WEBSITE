/** @typedef {{ ok?: boolean, student?: { id: string, full_name?: string, grade_level?: string|null, coin_balance?: number, is_active?: boolean } }} StudentMeResponse */

/** @type {StudentMeResponse | null} */
let cachedStudentMe = null;

/** @returns {StudentMeResponse | null} */
export function getCachedStudentMe() {
  return cachedStudentMe;
}

/** @param {StudentMeResponse | null} payload */
export function setCachedStudentMe(payload) {
  cachedStudentMe = payload && typeof payload === "object" ? payload : null;
}

export function invalidateStudentMeClientCache() {
  cachedStudentMe = null;
}
