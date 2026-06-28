/**
 * Student authentication for the Virtual Student QA Runner.
 *
 * Default mode 'ui' — drives the real /student/login Hebrew form:
 *   fill שם משתמש + קוד כניסה → click כניסה ללמידה → wait for /student/home.
 *
 * Temporary opt-in mode 'api' (VIRTUAL_STUDENT_STUDENT_AUTH=api) — wraps the
 * existing API helper. Logged loudly as [TEMPORARY:api-shortcut] so this can
 * never be confused with a true real-UI run. Final flow MUST use 'ui'; this
 * exists only as a debug / triage path while the runner is being stabilized.
 */
import { applyStudentSessionFromLogin } from "../../e2e-lib/hebrew-e2e-student-auth.mjs";

const STUDENT_HOME = "/student/home";
const STUDENT_LOGIN = "/student/login";
const MAX_UI_AUTH_ATTEMPTS = 3;
const RETRYABLE_AUTH_RE =
  /שגיאת רשת|network|timeout|locator\.fill|did not reach \/student\/home|page\.goto|student-login-username/i;

async function probeLoginHttp(baseUrl, timeoutMs = 12_000) {
  const url = `${String(baseUrl).replace(/\/$/, "")}/student/login`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

function loginTimeoutMs() {
  const raw = Number(
    process.env.VISUAL_QA_LOGIN_TIMEOUT_MS || process.env.STUDENT_AUTH_UI_TIMEOUT_MS || 60_000
  );
  return Number.isFinite(raw) && raw > 0 ? raw : 60_000;
}

/**
 * @param {object} args
 * @param {import("playwright").BrowserContext} args.context
 * @param {import("playwright").Page} args.page
 * @param {{label: string, username: string, code: string, pin: string}} args.account
 * @param {string} args.baseUrl
 * @param {"ui"|"api"} args.mode
 * @param {(line: string) => void} args.log
 */
export async function authenticateStudent({ context, page, account, baseUrl, mode, log }) {
  if (mode === "api") {
    return authenticateViaApi({ context, page, account, baseUrl, log });
  }

  await context.clearCookies();

  const url = new URL(STUDENT_LOGIN, baseUrl).toString();
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_UI_AUTH_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      log(
        `student-auth(ui): retry ${attempt}/${MAX_UI_AUTH_ATTEMPTS} after ` +
          `${String(lastError?.message || lastError).slice(0, 160)}`
      );
      for (let probe = 0; probe < 4; probe += 1) {
        if (await probeLoginHttp(baseUrl)) break;
        await page.waitForTimeout(2500);
      }
      await page.waitForTimeout(1200 * attempt);
      const retryNavTimeout = Math.max(loginTimeoutMs(), 90_000);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: retryNavTimeout }).catch(() => {});
    }

    try {
      return await authenticateViaUi({ page, account, baseUrl, log, loginUrl: url });
    } catch (error) {
      lastError = error;
      const retryable = RETRYABLE_AUTH_RE.test(String(error?.message || error));
      if (!retryable || attempt >= MAX_UI_AUTH_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw lastError || new Error("student-auth(ui): authentication failed");
}

async function authenticateViaUi({ page, account, baseUrl, log, loginUrl }) {
  const url = loginUrl || new URL(STUDENT_LOGIN, baseUrl).toString();
  const navTimeout = Math.max(loginTimeoutMs(), 90_000);
  log(`student-auth(ui): navigate ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: navTimeout });

  if (new URL(page.url()).pathname === STUDENT_HOME) {
    log("student-auth(ui): already authenticated, /student/login redirected to /student/home");
    return { mode: "ui", path: STUDENT_HOME, alreadyAuthenticated: true };
  }

  await page.getByText("בודקים חיבור...").waitFor({ state: "detached", timeout: loginTimeoutMs() }).catch(() => {});
  await page.waitForTimeout(500);

  const usernameField =
    page.getByTestId("student-login-username").or(page.getByPlaceholder("שם משתמש")).or(
      page.getByLabel("שם משתמש")
    );
  const pinField =
    page.getByTestId("student-login-pin").or(page.getByPlaceholder("קוד כניסה")).or(
      page.getByLabel("קוד כניסה")
    );
  const submitButton = page
    .getByTestId("student-login-submit")
    .or(page.getByRole("button", { name: /כניסה לעולם הילדים של ליאו|כניסה ללמידה/ }))
    .or(page.getByRole("button", { name: "כניסה" }));

  const loginMs = loginTimeoutMs();
  await usernameField.first().waitFor({ state: "visible", timeout: loginMs });
  await pinField.first().waitFor({ state: "visible", timeout: loginMs });

  const identifier = account.username || account.code;
  if (!identifier) {
    throw new Error("student-auth(ui): account is missing both username and code");
  }

  await usernameField.first().fill(identifier, { timeout: loginMs });
  await pinField.first().fill(account.pin, { timeout: loginMs });

  log(`student-auth(ui): submitting login form for label=${account.label}`);
  const postSubmitTimeout = Math.max(loginTimeoutMs(), 60_000);
  const navigationPromise = page.waitForURL(
    (targetUrl) => new URL(targetUrl).pathname === STUDENT_HOME,
    { timeout: postSubmitTimeout }
  );
  await submitButton.first().click();

  try {
    await navigationPromise;
  } catch (error) {
    const errorText = await page.locator("p.text-sm").first().innerText().catch(() => "");
    const currentPath = new URL(page.url()).pathname;
    if (currentPath !== STUDENT_HOME) {
      const detail = errorText ? ` — page text: "${errorText.slice(0, 200)}"` : "";
      throw new Error(
        `student-auth(ui): did not reach ${STUDENT_HOME} after submit (current=${currentPath}).${detail} ${error?.message || ""}`
      );
    }
  }

  const finalPath = new URL(page.url()).pathname;
  if (finalPath !== STUDENT_HOME) {
    throw new Error(`student-auth(ui): expected ${STUDENT_HOME}, got ${finalPath}`);
  }

  log(`student-auth(ui): authenticated, on ${finalPath}`);
  return { mode: "ui", path: finalPath };
}

async function authenticateViaApi({ context, page, account, baseUrl, log }) {
  log("[TEMPORARY:api-shortcut] student-auth(api): using POST /api/student/login + cookie injection");
  log("[TEMPORARY:api-shortcut] this is a debug-only path and is NOT the real-UI flow");

  const previous = {
    username: process.env.E2E_STUDENT_USERNAME,
    code: process.env.E2E_STUDENT_CODE,
    pin: process.env.E2E_STUDENT_PIN,
  };
  try {
    process.env.E2E_STUDENT_USERNAME = account.username || "";
    process.env.E2E_STUDENT_CODE = account.code || "";
    process.env.E2E_STUDENT_PIN = account.pin;
    await applyStudentSessionFromLogin(context, baseUrl);
    log("[TEMPORARY:api-shortcut] student-auth(api): cookie installed");
    await page.goto(new URL(STUDENT_HOME, baseUrl).toString(), { waitUntil: "domcontentloaded" });
    return { mode: "api-shortcut", path: STUDENT_HOME };
  } finally {
    restoreEnv("E2E_STUDENT_USERNAME", previous.username);
    restoreEnv("E2E_STUDENT_CODE", previous.code);
    restoreEnv("E2E_STUDENT_PIN", previous.pin);
  }
}

function restoreEnv(key, previousValue) {
  if (previousValue === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = previousValue;
  }
}
