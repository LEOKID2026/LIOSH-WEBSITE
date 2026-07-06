import { GUEST_STATUS_LINKED } from "./constants.js";

/**
 * Whether logout should remove the browser guest resume token.
 * Active unlinked guests keep the token so the same device can resume after logout.
 *
 * @param {{ guest_status?: string, guestStatus?: string } | null | undefined} student
 * @param {boolean} isGuestHome
 */
export function shouldClearGuestResumeTokenOnLogout(student, isGuestHome) {
  if (!isGuestHome) return true;
  const status = student?.guest_status ?? student?.guestStatus;
  return status === GUEST_STATUS_LINKED;
}

/**
 * @param {string | null | undefined} code
 */
export function shouldClearGuestResumeTokenOnResumeFailure(code) {
  // Invalid resume tokens stay until the child explicitly confirms a new guest.
  return code === "guest_already_linked";
}
