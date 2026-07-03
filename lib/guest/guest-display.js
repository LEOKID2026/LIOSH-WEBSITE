import { GUEST_ACCOUNT_KIND } from "./constants.js";
import { isValidLeoNumberString } from "./leo-number.constants.js";

/**
 * @param {{ account_kind?: string, accountKind?: string, leo_number?: string|null, leoNumber?: string|null, full_name?: string }} student
 */
export function isGuestStudent(student) {
  const kind = student?.account_kind ?? student?.accountKind;
  return kind === GUEST_ACCOUNT_KIND;
}

/**
 * Valid 8-digit students.leo_number (registered + guest).
 * @param {{ leo_number?: string|null, leoNumber?: string|null }} student
 */
export function getGuestLeoNumber(student) {
  const raw = student?.leo_number ?? student?.leoNumber;
  return isValidLeoNumberString(raw);
}

/**
 * @param {{ account_kind?: string, accountKind?: string, leo_number?: string|null, leoNumber?: string|null, full_name?: string }} student
 */
export function formatGuestDisplayNameHe(student) {
  const leo = getGuestLeoNumber(student);
  if (leo) return `אורח ${leo}`;
  return "אורח";
}

/**
 * @param {{ account_kind?: string, accountKind?: string, leo_number?: string|null, leoNumber?: string|null, full_name?: string }} student
 */
export function formatStudentGreetingHe(student) {
  if (isGuestStudent(student)) {
    const leo = getGuestLeoNumber(student);
    return leo ? `שלום אורח ${leo}` : "שלום אורח";
  }
  const name = String(student?.full_name || "").trim();
  return name ? `שלום ${name}` : "שלום";
}

/**
 * @param {{ account_kind?: string, accountKind?: string, leo_number?: string|null, leoNumber?: string|null }} student
 */
export function formatLeoNumberLabelHe(student) {
  const leo = getGuestLeoNumber(student);
  return leo ? `מספר ליאו: ${leo}` : "";
}
