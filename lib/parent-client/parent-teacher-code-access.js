const LOGIN_API = `/api/${"guardian"}/login`;
const ME_API = `/api/${"guardian"}/me`;

/**
 * @param {string} loginUsername
 * @param {string} pin
 */
export async function postParentTeacherCodeLogin(loginUsername, pin) {
  const res = await fetch(LOGIN_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ loginUsername, pin }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
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
