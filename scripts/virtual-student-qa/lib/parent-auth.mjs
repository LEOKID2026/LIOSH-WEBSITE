/**
 * Virtual Student QA Runner — Parent authentication.
 *
 * Default mode is `ui`: navigate to /parent/login, fill the real Hebrew
 * email/password form, click submit, and wait for /parent/dashboard.
 * This is the ONLY mode that can produce a full PASS for Phase B.
 *
 * Optional `token` mode is debug-only: it signs in via Supabase from Node,
 * stores the resulting session in the browser's localStorage so the parent
 * dashboard hydrates as authenticated, and skips the real form. Runs that
 * use `token` are explicitly downgraded to `partial` and never count as PASS.
 *
 * Never logs the parent password.
 */

const PARENT_LOGIN_PATH = "/parent/login";
const PARENT_DASHBOARD_PATH = "/parent/dashboard";

function maskEmail(email) {
  const value = String(email || "");
  const at = value.indexOf("@");
  if (at <= 1) return "***";
  const head = value.slice(0, 1);
  const tail = value.slice(at);
  return `${head}***${tail}`;
}

function isOnParentDashboard(page) {
  try {
    const u = new URL(page.url());
    return u.pathname.startsWith(PARENT_DASHBOARD_PATH);
  } catch {
    return false;
  }
}

export async function authenticateParent({
  context,
  page,
  account,
  baseUrl,
  mode,
  log,
}) {
  const resolvedMode = mode === "token" ? "token" : "ui";
  const startedAt = Date.now();

  log?.(`parent-auth: mode=${resolvedMode} email=${maskEmail(account.email)}`);

  if (resolvedMode === "token") {
    const result = await authenticateParentViaToken({
      context,
      page,
      account,
      baseUrl,
      log,
    });
    return {
      ...result,
      mode: "token",
      pass: false,
      partial: true,
      durationMs: Date.now() - startedAt,
    };
  }

  const result = await authenticateParentViaUi({ page, account, baseUrl, log });
  return {
    ...result,
    mode: "ui",
    pass: true,
    partial: false,
    durationMs: Date.now() - startedAt,
  };
}

function resolveParentLoginFields(page) {
  // Current product login tab (2026-06): stable test ids on the login form.
  const emailField = page
    .getByTestId("parent-login-identifier")
    .or(page.getByPlaceholder("אימייל הורה"));
  const passwordField = page
    .getByTestId("parent-login-secret")
    .or(page.getByPlaceholder("סיסמה"));
  return { emailField, passwordField };
}

async function waitForParentLoginFormOrDashboard(page, emailField, log) {
  try {
    await Promise.race([
      emailField.waitFor({ state: "visible", timeout: 15_000 }),
      page.waitForURL("**/parent/dashboard**", { timeout: 15_000 }),
    ]);
  } catch (error) {
    throw new Error(
      `parent-auth/ui: login form did not render and no dashboard redirect within 15s — ${error?.message || error}`
    );
  }

  if (isOnParentDashboard(page)) return;

  // Supabase browser client hydrates after first paint; give the submit
  // handler a moment to bind before we fill + click.
  const submitButton = page.locator("form button[type=\"submit\"]");
  await submitButton.waitFor({ state: "visible", timeout: 5_000 });
  try {
    await submitButton.waitFor({ state: "attached", timeout: 2_000 });
  } catch {
    // Best-effort — older deployments may not need the extra tick.
  }
  log?.("parent-auth/ui: login form ready");
}

async function authenticateParentViaUi({ page, account, baseUrl, log }) {
  const targetUrl = `${baseUrl}${PARENT_LOGIN_PATH}`;
  log?.(`parent-auth/ui: navigate ${PARENT_LOGIN_PATH}`);
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

  // The login page redirects to /parent/dashboard automatically if a session
  // already exists. Race the form-visible state against the post-redirect
  // dashboard URL, so we don't hang on a stale browser context.
  const { emailField, passwordField } = resolveParentLoginFields(page);

  let alreadyAuthenticated = false;
  await waitForParentLoginFormOrDashboard(page, emailField, log);

  if (isOnParentDashboard(page)) {
    log?.(
      "parent-auth/ui: existing parent session detected, skipping form fill"
    );
    alreadyAuthenticated = true;
  } else {
    log?.("parent-auth/ui: filling parent email + password");
    await emailField.fill(account.email);
    await passwordField.fill(account.password);

    // The page has TWO buttons reading "כניסה" — the mode-tab button and the
    // submit button. Use the form's submit button explicitly.
    const submitButton = page.locator("form button[type=\"submit\"]");
    await submitButton.waitFor({ state: "visible", timeout: 5_000 });
    await submitButton.click();
    const authDeadline = Date.now() + 45_000;
    while (Date.now() < authDeadline) {
      if (isOnParentDashboard(page)) break;
      await page.waitForTimeout(500);
    }
    if (!isOnParentDashboard(page)) {
      throw new Error(
        `parent-auth/ui: dashboard not reached within 45s after submit (url=${page.url()})`
      );
    }
    log?.("parent-auth/ui: submit + dashboard navigation observed");
  }

  // Confirm we're really on the dashboard and a session exists in the page.
  if (!isOnParentDashboard(page)) {
    throw new Error(
      `parent-auth/ui: expected dashboard URL after login, got ${page.url()}`
    );
  }

  return {
    alreadyAuthenticated,
    landingUrl: page.url(),
  };
}

async function authenticateParentViaToken({
  context,
  page,
  account,
  baseUrl,
  log,
}) {
  const url = String(process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL || "").trim();
  const anonKey = String(
    process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY || ""
  ).trim();
  if (!url || !anonKey) {
    throw new Error(
      "parent-auth/token: NEXT_PUBLIC_LEARNING_SUPABASE_URL and NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY required for token mode"
    );
  }

  const { createClient } = await import("@supabase/supabase-js");
  const node = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  log?.("parent-auth/token: signing in via Supabase from Node (debug-only)");
  const { data, error } = await node.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });
  if (error || !data?.session) {
    throw new Error(
      `parent-auth/token: signInWithPassword failed — ${error?.message || "no session"}`
    );
  }

  const projectRef = (() => {
    try {
      return new URL(url).hostname.split(".")[0];
    } catch {
      return null;
    }
  })();
  if (!projectRef) {
    throw new Error("parent-auth/token: could not derive Supabase project ref");
  }
  const storageKey = `sb-${projectRef}-auth-token`;
  const sessionForStorage = JSON.stringify(data.session);

  // The Supabase JS client reads localStorage on hydration. We must seed it
  // BEFORE the dashboard JS runs, which means installing an init script
  // and then visiting the dashboard.
  await context.addInitScript(
    ({ key, payload }) => {
      try {
        window.localStorage.setItem(key, payload);
      } catch (_e) {
        // Best-effort — token mode is debug-only.
      }
    },
    { key: storageKey, payload: sessionForStorage }
  );

  log?.("parent-auth/token: localStorage init script seeded for parent session");
  await page.goto(`${baseUrl}${PARENT_DASHBOARD_PATH}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForURL("**/parent/dashboard**", { timeout: 15_000 });
  if (!isOnParentDashboard(page)) {
    throw new Error(
      `parent-auth/token: expected dashboard URL, got ${page.url()}`
    );
  }
  return {
    alreadyAuthenticated: false,
    landingUrl: page.url(),
    note: "token-injection used (debug-only); run is partial, never PASS",
  };
}
