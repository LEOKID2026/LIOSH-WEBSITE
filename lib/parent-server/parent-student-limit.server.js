/**
 * Server-only helper: resolve the per-parent student-creation limit.
 *
 * Default product behavior: every parent can create up to 3 students.
 *
 * QA escape hatch (server-side only, never exposed to the browser as a
 * secret — only the resolved numeric ceiling is sent to the dashboard):
 *   QA_PARENT_STUDENT_LIMIT_EMAILS = comma-separated list of parent emails
 *     allowed a higher limit (e.g. "admin@admin.com"). Compared case-
 *     insensitively after trimming.
 *   QA_PARENT_STUDENT_LIMIT = positive integer override (e.g. 50). Only
 *     applies to emails in the allowlist; ignored otherwise. Values below
 *     the default cap fall back to the default (the override can only
 *     RAISE the cap for QA accounts; it can never lower it).
 *
 * If either env var is missing, malformed, or the email is not in the
 * allowlist, the default 3-student cap is enforced unchanged. The
 * allowlist itself (the email list) is NEVER sent to the client; only
 * the resolved integer the API decides to allow for the authenticated
 * parent is exposed.
 */

export const DEFAULT_PARENT_STUDENT_LIMIT = 3;

export function resolveParentStudentLimit(rawEmail) {
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!email) return DEFAULT_PARENT_STUDENT_LIMIT;

  const rawAllowlist = String(process.env.QA_PARENT_STUDENT_LIMIT_EMAILS || "");
  const allowlist = rawAllowlist
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length === 0) return DEFAULT_PARENT_STUDENT_LIMIT;
  if (!allowlist.includes(email)) return DEFAULT_PARENT_STUDENT_LIMIT;

  const rawOverride = String(process.env.QA_PARENT_STUDENT_LIMIT || "").trim();
  if (!rawOverride) return DEFAULT_PARENT_STUDENT_LIMIT;
  const overrideNum = Number.parseInt(rawOverride, 10);
  if (!Number.isFinite(overrideNum) || overrideNum < DEFAULT_PARENT_STUDENT_LIMIT) {
    return DEFAULT_PARENT_STUDENT_LIMIT;
  }
  return overrideNum;
}
