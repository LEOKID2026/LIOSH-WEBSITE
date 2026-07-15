/** @typedef {{ code?: string|null, message?: string|null, error?: string|null }} GuestResumeFailurePayload */

export const GUEST_RESUME_LINKED_MESSAGE_HE =
  "המספר כבר שויך להורה. התחבר/י עם שם משתמש וקוד, או בקש/י מההורה את פרטי הכניסה.";

export const GUEST_RESUME_INVALID_MESSAGE_HE =
  "לא הצלחנו לחדש את האורח במכשיר הזה. אם תיכנס/י כאורח מחדש - ייווצר מספר ליאו חדש וההתקדמות הקודמת לא תישמר.";

export const GUEST_NEW_AFTER_FAILED_RESUME_CONFIRM_HE =
  "לא הצלחנו לחדש את האורח הקודם. כניסה כאורח חדש תיצור מספר ליאו חדש וההתקדמות הקודמת לא תישמר. להמשיך?";

/**
 * @param {GuestResumeFailurePayload | null | undefined} payload
 * @returns {{ code: string, messageHe: string } | null}
 */
export function guestResumeFailureBannerFromPayload(payload) {
  const code = String(payload?.code || "").trim();
  if (!code) return null;
  const serverText = String(payload?.message || payload?.error || "").trim();
  if (code === "guest_already_linked") {
    return {
      code,
      messageHe: serverText || GUEST_RESUME_LINKED_MESSAGE_HE,
    };
  }
  if (code === "guest_resume_invalid") {
    return {
      code,
      messageHe: serverText || GUEST_RESUME_INVALID_MESSAGE_HE,
    };
  }
  if (serverText) {
    return { code, messageHe: serverText };
  }
  return null;
}

/**
 * Linked guests cannot start a new guest session from this device.
 * @param {string | null | undefined} code
 */
export function shouldBlockGuestStartAfterResumeFailure(code) {
  return code === "guest_already_linked";
}

/**
 * Before creating a fresh guest after a failed resume, confirm with the child.
 * @param {string | null | undefined} code
 */
export function shouldConfirmNewGuestAfterResumeFailure(code) {
  return code === "guest_resume_invalid";
}
