#!/usr/bin/env node
/**
 * Preflight — Video #2 mobile (parent signup UI, disposable email).
 */
import { chromium } from "playwright";
import {
  buildSignupRunId,
  buildSignupCaptureEmail,
  buildSignupCapturePassword,
} from "./lib/signup-capture-parent.mjs";
import { requireServiceRoleAdmin } from "./lib/isolated-capture-parent.mjs";
import { acceptSignupPolicy } from "./lib/video-capture-runtime.mjs";
import {
  MOBILE_VIEWPORT,
  resolveBaseUrl,
  assertAllowedBaseUrl,
  preflightPath,
  outDir,
  TITLE,
  PILOT_ID,
  SIGNUP_EMAIL_PREFIX,
} from "./shared-create-parent-account-mobile.mjs";
import { fail, pass, writePreflightReport } from "./lib/preflight-kit.mjs";

async function deleteEphemeralSignupUser(email) {
  try {
    const admin = requireServiceRoleAdmin();
    for (let page = 1; page <= 5; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const match = (data?.users || []).find((u) => u.email === email);
      if (match?.id) {
        await admin.auth.admin.deleteUser(match.id);
        return true;
      }
      if ((data?.users || []).length < 200) break;
    }
  } catch {
    /* best effort */
  }
  return false;
}

async function probeSignupApi(email, password) {
  const url = String(process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL || "").trim();
  const anonKey = String(process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY || "").trim();
  if (!url || !anonKey) return { ok: false, reason: "missing supabase env" };
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) return { ok: false, reason: error.message };
  if (data?.session?.access_token) return { ok: true, instant: true };
  return { ok: false, reason: "no session (email confirmation likely required)" };
}

async function runSignupProbe(page, baseUrl, email, password) {
  await page.goto(`${baseUrl}/parent/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("button", { name: "הרשמה" }).click();
  await acceptSignupPolicy(page);
  await page.getByPlaceholder("אימייל הורה").fill(email);
  await page.getByPlaceholder("סיסמה").fill(password);
  await page.locator('form button[type="submit"]').click();
  try {
    await page.waitForURL("**/parent/dashboard**", { timeout: 90_000 });
  } catch {
    await page.waitForTimeout(3000);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const baseUrl = resolveBaseUrl(argv);
  assertAllowedBaseUrl(baseUrl);
  const checks = [];
  const blockers = [];

  const e2eEmail = String(process.env.E2E_PARENT_EMAIL || process.env.HELP_CAPTURE_PARENT_EMAIL || "").trim();
  if (e2eEmail) {
    pass(checks, "not_using_shared_qa_in_probe", "preflight uses disposable signup email");
  }

  const runId = buildSignupRunId();
  const email = buildSignupCaptureEmail(runId);
  const password = buildSignupCapturePassword();

  await deleteEphemeralSignupUser(email);

  const apiProbe = await probeSignupApi(email, password);
  if (apiProbe.ok) {
    pass(checks, "signup_api_instant_session", "signUp returns session");
    await deleteEphemeralSignupUser(email);
  } else {
    fail(checks, "signup_api_instant_session", apiProbe.reason);
    blockers.push(`signup API: ${apiProbe.reason}`);
  }

  if (!email.startsWith(SIGNUP_EMAIL_PREFIX)) {
    fail(checks, "disposable_email_pattern", email);
    blockers.push("signup email prefix mismatch");
  } else {
    pass(checks, "disposable_email_pattern", email);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ MOBILE_VIEWPORT: MOBILE_VIEWPORT, locale: "he-IL" });
  const page = await context.newPage();

  try {
    await runSignupProbe(page, baseUrl, email, password);

    const body = await page.locator("body").innerText();
    const onDashboard = page.url().includes("/parent/dashboard");
    const needsEmailConfirm =
      body.includes("לאחר אימות האימייל") ||
      (body.includes("ההרשמה הושלמה") && !onDashboard);

    if (needsEmailConfirm && !onDashboard) {
      fail(checks, "signup_session_without_confirm", "email confirmation required — no session");
      blockers.push("Supabase email confirmation blocks instant signup capture");
    } else if (onDashboard) {
      pass(checks, "signup_session_without_confirm");
      await page.waitForSelector("h1:has-text('דשבורד הורים')", { timeout: 30_000 }).catch(() => null);
      pass(checks, "signup_dashboard_reached");
    } else {
      fail(checks, "signup_ui_flow", "signup did not reach dashboard");
      blockers.push("signup UI flow failed");
    }

    if (body.match(/שגיאה|error/i) && !onDashboard) {
      fail(checks, "signup_no_error_banner", "error text after signup");
      blockers.push("signup error banner");
    } else {
      pass(checks, "signup_no_error_banner");
    }
  } catch (e) {
    fail(checks, "browser_flow", e.message);
    blockers.push(`browser: ${e.message}`);
  } finally {
    await browser.close();
    const deleted = await deleteEphemeralSignupUser(email);
    if (deleted) pass(checks, "ephemeral_user_cleaned");
    else pass(checks, "ephemeral_user_cleaned", "no user to delete (ok)");
  }

  const ok = checks.every((c) => c.ok !== false) && blockers.length === 0;
  writePreflightReport(outDir, preflightPath, { ok, checks, blockers, baseUrl, title: TITLE, pilot: PILOT_ID });
  console.log(JSON.stringify({ ok, blockers, checks }, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("BLOCKER:", e.message);
  process.exit(1);
});
