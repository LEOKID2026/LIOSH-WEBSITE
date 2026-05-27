const LOGIN_API = `/api/${"guardian"}/login`;
const ME_API = `/api/${"guardian"}/me`;

/**
 * @param {string} loginUsername
 * @param {string} pin
 * @param {string} [studentId]
 */
export async function postParentTeacherCodeLogin(loginUsername, pin, studentId) {
  const body = { loginUsername, pin };
  if (studentId) body.studentId = studentId;

  const res = await fetch(LOGIN_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

/** @returns {Promise<number>} HTTP status from session probe */
export async function fetchParentTeacherCodeSessionStatus() {
  const res = await fetch(ME_API, { credentials: "same-origin", cache: "no-store" });
  return res.status;
}

export function parentTeacherCodeReportPath() {
  return "/parent/child-report";
}

/** Full document navigation after login (avoids client-side 404 on stale mobile/PWA bundles). */
export function redirectAfterParentTeacherCodeLogin() {
  if (typeof window === "undefined") return;
  window.location.assign(parentTeacherCodeReportPath());
}

/**
 * @param {Record<string, unknown>|undefined} body
 */
export function mapParentTeacherCodeLoginError(body) {
  const code = body?.error?.code;
  if (code === "guardian_multiple_students") {
    return "יש לבחור ילד/ה להמשך הכניסה.";
  }
  if (
    code === "access_expired" ||
    code === "access_revoked" ||
    code === "session_revoked" ||
    code === "invitation_invalid"
  ) {
    return "הגישה פגה או בוטלה. פנו למורה לקבלת קוד חדש.";
  }
  return "שם המשתמש או הקוד שגויים.";
}

/**
 * @param {Record<string, unknown>|undefined} body
 * @returns {{ studentId: string, studentFullNameMasked: string }[]}
 */
export function parseGuardianMultipleStudents(body) {
  const list = body?.data?.students;
  if (!Array.isArray(list)) return [];
  return list
    .filter((s) => s && typeof s.studentId === "string")
    .map((s) => ({
      studentId: s.studentId,
      studentFullNameMasked: String(s.studentFullNameMasked || "ילד/ה"),
    }));
}
