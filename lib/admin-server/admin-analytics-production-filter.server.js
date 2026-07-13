import { isQaTestAccountEmail } from "./admin-all-accounts.server.js";
import { isQaSimulationParentEmail } from "../parent-server/parent-student-limit.server.js";
import {
  PROTECTED_DELETE_EMAILS,
  getMainAdminEmailSet,
  normalizeUserEmail,
} from "./admin-user-delete.server.js";
import { GUEST_SYSTEM_PARENT_EMAIL } from "../guest/constants.js";

/** @param {string|null|undefined} email */
export function isExcludedAnalyticsParentEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return false;
  if (e === String(GUEST_SYSTEM_PARENT_EMAIL).trim().toLowerCase()) return true;
  if (PROTECTED_DELETE_EMAILS.has(e)) return true;
  if (getMainAdminEmailSet().has(e)) return true;
  if (isQaSimulationParentEmail(e)) return true;
  if (isQaTestAccountEmail(e)) return true;
  if (e.endsWith("@leo.test")) return true;
  return false;
}

/** @param {{ email?: string|null, app_metadata?: { role?: string } }|null|undefined} user */
export function isExcludedAnalyticsAuthUser(user) {
  if (!user?.id) return true;
  if (isExcludedAnalyticsParentEmail(normalizeUserEmail(user))) return true;
  const role = String(user?.app_metadata?.role || "").trim().toLowerCase();
  return role === "admin";
}

/**
 * @param {{ account_kind?: string|null, parent_id?: string|null }} student
 * @param {Map<string, string>} parentEmailById
 */
export function isIncludedAnalyticsStudent(student, parentEmailById) {
  if (!student?.id) return false;
  if (student.account_kind === "guest") return true;
  const parentEmail = student.parent_id ? parentEmailById.get(student.parent_id) || "" : "";
  return !isExcludedAnalyticsParentEmail(parentEmail);
}

/**
 * @param {{ id?: string }} parentProfile
 * @param {Map<string, string>} parentEmailById
 */
export function isIncludedAnalyticsParentProfile(parentProfile, parentEmailById) {
  if (!parentProfile?.id) return false;
  const email = parentEmailById.get(parentProfile.id) || "";
  return !isExcludedAnalyticsParentEmail(email);
}
