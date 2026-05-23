/**
 * Server-only helper: resolve the per-parent student-creation limit.
 *
 * Product rule (owner-approved):
 * - Normal parents: max 3 children.
 * - QA/simulation parent `admin@admin.com` only: max 50 children.
 *
 * The allowlist is enforced in code (case-insensitive email match). It is NOT
 * generalized to all parents. Optional env vars `QA_PARENT_STUDENT_LIMIT_EMAILS`
 * and `QA_PARENT_STUDENT_LIMIT` are ignored for limit resolution so misconfiguration
 * cannot widen the cap beyond the hardcoded QA account.
 */

export const DEFAULT_PARENT_STUDENT_LIMIT = 3;

/** Only QA/simulation parent allowed >3 students (case-insensitive). */
export const QA_SIMULATION_PARENT_EMAIL = "admin@admin.com";

export const QA_SIMULATION_PARENT_STUDENT_LIMIT = 50;

export function resolveParentStudentLimit(rawEmail) {
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!email) return DEFAULT_PARENT_STUDENT_LIMIT;
  if (email === QA_SIMULATION_PARENT_EMAIL) {
    return QA_SIMULATION_PARENT_STUDENT_LIMIT;
  }
  return DEFAULT_PARENT_STUDENT_LIMIT;
}

export function isQaSimulationParentEmail(rawEmail) {
  return String(rawEmail || "").trim().toLowerCase() === QA_SIMULATION_PARENT_EMAIL;
}
