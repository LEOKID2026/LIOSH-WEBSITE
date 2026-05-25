/**
 * Whether HttpOnly session cookies should include the Secure attribute.
 * Local Playwright runs against http://127.0.0.1 with `next start` set
 * E2E_INSECURE_SESSION_COOKIES=1 on the webServer process only.
 */
export function isSessionCookieSecure() {
  if (process.env.E2E_INSECURE_SESSION_COOKIES === "1") return false;
  return process.env.NODE_ENV === "production";
}
