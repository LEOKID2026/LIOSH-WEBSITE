/** Client-safe helpers for admin lifecycle UI (no server imports). */

import { personaLabelHe } from "./admin-ui.he.js";

/** @param {string} role */
export function schoolMembershipRoleToPersona(role) {
  if (role === "school_admin") return "school_manager";
  if (role === "school_operator") return "school_operator";
  return "school_teacher";
}

/** @param {string} role */
export function schoolStaffPersonaLabel(role) {
  return personaLabelHe(schoolMembershipRoleToPersona(role));
}
