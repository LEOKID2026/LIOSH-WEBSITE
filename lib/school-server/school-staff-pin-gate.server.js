/** Staff PIN change gate — blocks protected APIs when must_change_pin is true. */

export const STAFF_PIN_CHANGE_REDIRECT = "/school/staff/change-pin";

const EXEMPT_API_SUFFIXES = [
  "/api/school/staff/change-pin",
  "/api/school/staff/logout",
  "/api/school/staff/login",
];

/**
 * @param {import('http').IncomingMessage} req
 */
export function isStaffPinChangeExemptRequest(req) {
  const raw = typeof req?.url === "string" ? req.url : "";
  const path = raw.split("?")[0] || "";
  return EXEMPT_API_SUFFIXES.some((suffix) => path === suffix || path.endsWith(suffix));
}

/**
 * @param {string|null|undefined} newPin
 * @param {string|null|undefined} confirmPin
 */
export function validateStaffNewPin(newPin, confirmPin) {
  const normalized = String(newPin || "").trim();
  const confirm = String(confirmPin || "").trim();

  if (!/^\d{4}$/.test(normalized)) {
    return { ok: false, status: 400, code: "invalid_new_pin" };
  }
  if (normalized !== confirm) {
    return { ok: false, status: 400, code: "pin_mismatch" };
  }
  return { ok: true, newPin: normalized };
}
