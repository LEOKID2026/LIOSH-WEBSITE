import { GUEST_ACCOUNT_KIND } from "./constants.js";

/**
 * Server-only guest check after loading authenticated students row from DB.
 * @param {{ account_kind?: string|null }} studentRow
 */
export function isGuestStudentFromDbRow(studentRow) {
  return studentRow?.account_kind === GUEST_ACCOUNT_KIND;
}

/**
 * @param {{ parent_id?: string|null }} studentRow
 */
export function isChildUnderParentFromDbRow(studentRow) {
  const parentId = studentRow?.parent_id;
  return typeof parentId === "string" && parentId.length > 0;
}
