#!/usr/bin/env node
/**
 * Preflight — Video #4 desktop (student login with code + PIN).
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  resolveStudentDemoAccount,
  expectedDemoStudentName,
} from "./lib/student-demo-account.mjs";
import {
  VIEWPORT,
  resolveBaseUrl,
  assertAllowedBaseUrl,
  preflightPath,
  outDir,
  TITLE,
  PILOT_ID,
} from "./shared-student-login-desktop.mjs";
import { fail, pass, writePreflightReport } from "./lib/preflight-kit.mjs";
import { waitStudentLoginReady } from "./lib/wait-student-login-ready.mjs";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function tryStudentLogin(baseUrl, account) {
  const res = await fetch(new URL("/api/student/login", baseUrl).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: account.username, pin: account.pin }),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json?.ok !== false, status: res.status, json };
}

async function provisionDemoIfNeeded(checks, blockers) {
  const prov = spawnSync(
    "node --env-file=.env.local scripts/help-center/provision-demo-account.mjs",
    { encoding: "utf8", cwd: rootDir, shell: true }
  );
  if (prov.status !== 0) {
    fail(checks, "provision_demo_account", prov.stderr || prov.stdout || "provision failed");
    blockers.push("provision-demo-account failed");
    return false;
  }
  pass(checks, "provision_demo_account");
  return true;
}

async function main() {
  const argv = process.argv.slice(2);
  const baseUrl = resolveBaseUrl(argv);
  assertAllowedBaseUrl(baseUrl);
  const checks = [];
  const blockers = [];
  const account = resolveStudentDemoAccount();
  const demoName = expectedDemoStudentName();

  pass(checks, "student_account_resolved", `${account.username}/****`);

  let login = await tryStudentLogin(baseUrl, account);
  if (!login.ok) {
    fail(checks, "student_login_api_initial", login.json?.error || String(login.status));
    const provisioned = await provisionDemoIfNeeded(checks, blockers);
    if (provisioned) {
      login = await tryStudentLogin(baseUrl, account);
      if (login.ok) {
        pass(checks, "student_login_api_after_provision");
      } else {
        fail(checks, "student_login_api_after_provision", login.json?.error || String(login.status));
        blockers.push("student login API still failing after provision");
      }
    }
  } else {
    pass(checks, "student_login_api");
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, locale: "he-IL" });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/student/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await waitStudentLoginReady(page, 60_000);
    pass(checks, "student_login_page_loads");

    await page.getByPlaceholder("שם משתמש").fill(account.username);
    await page.getByPlaceholder("PIN").fill(account.pin);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL("**/student/home**", { timeout: 60_000 });
    pass(checks, "student_ui_login");

    await page.waitForFunction(
      (name) => {
        const t = document.body?.innerText || "";
        return t.includes("שלום") && t.includes(name);
      },
      demoName,
      { timeout: 60_000 }
    );
    const body = await page.locator("body").innerText();
    if (!body.includes(demoName)) {
      fail(checks, "student_home_greeting", `expected "${demoName}" on home`);
      blockers.push(`home missing ${demoName}`);
    } else {
      pass(checks, "student_home_greeting", demoName);
    }
  } catch (e) {
    fail(checks, "browser_flow", e.message);
    blockers.push(`browser: ${e.message}`);
  } finally {
    await browser.close();
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
