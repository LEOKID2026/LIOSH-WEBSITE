/**
 * Student login session helpers — UI login + demo provisioning.
 */
import { spawnSync } from "node:child_process";
import {
  resolveStudentDemoAccount,
  expectedDemoStudentName,
} from "../../parent-video-pilot/lib/student-demo-account.mjs";
import { waitStudentLoginReady } from "../../parent-video-pilot/lib/wait-student-login-ready.mjs";
import { root } from "./common.mjs";

export { resolveStudentDemoAccount, expectedDemoStudentName };

export async function tryStudentLoginApi(baseUrl, account) {
  const res = await fetch(new URL("/api/student/login", baseUrl).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: account.username, pin: account.pin }),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json?.ok !== false, status: res.status, json };
}

export function provisionDemoIfNeeded() {
  const prov = spawnSync(
    "node --env-file=.env.local scripts/help-center/provision-demo-account.mjs",
    { encoding: "utf8", cwd: root, shell: true }
  );
  return { ok: prov.status === 0, output: prov.stderr || prov.stdout || "" };
}

async function warmupStudentApi(baseUrl) {
  await fetch(new URL("/student/login", baseUrl).toString(), {
    method: "GET",
    redirect: "manual",
  }).catch(() => {});
  await fetch(new URL("/api/student/login", baseUrl).toString(), {
    method: "OPTIONS",
  }).catch(() => {});
}

export async function ensureDemoStudentAccess(baseUrl) {
  const account = resolveStudentDemoAccount();
  let login = await tryStudentLoginApi(baseUrl, account);
  if (login.ok) return { account, provisioned: false };

  const prov = provisionDemoIfNeeded();
  if (!prov.ok) {
    throw new Error(`provision-demo failed: ${prov.output}`);
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      await warmupStudentApi(baseUrl);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
    login = await tryStudentLoginApi(baseUrl, account);
    if (login.ok) return { account, provisioned: true };
    if (login.status !== 500) break;
  }

  if (!login.ok) {
    throw new Error(`student login API failed after provision: ${login.json?.error || login.status}`);
  }
  return { account, provisioned: true };
}

export async function fillStudentPin(page, pin) {
  const pinInput = page.getByPlaceholder("PIN");
  await pinInput.click({ force: true });
  await pinInput.fill("");
  await pinInput.evaluate((el, value) => {
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, pin);
}

export async function loginStudentViaApiInBrowser(page, baseUrl, account) {
  const res = await page.request.post(`${baseUrl}/api/student/login`, {
    data: { username: account.username, pin: account.pin },
    headers: { "Content-Type": "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok() || json?.ok === false) {
    throw new Error(json?.error || `student login API ${res.status()}`);
  }
}

export async function loginStudentViaUI(page, baseUrl, account = resolveStudentDemoAccount()) {
  const demoName = expectedDemoStudentName();
  const url = page.url();
  if (url.includes("/student/home")) {
    const body = await page.locator("body").innerText();
    if (body.includes(demoName)) return { alreadyLoggedIn: true };
  }

  await page.goto(`${baseUrl}/student/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitStudentLoginReady(page, 60_000);

  try {
    await loginStudentViaApiInBrowser(page, baseUrl, account);
    await page.goto(`${baseUrl}/student/home`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  } catch {
    await page.getByPlaceholder("שם משתמש").fill(account.username);
    await fillStudentPin(page, account.pin);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL("**/student/home**", { timeout: 60_000, waitUntil: "domcontentloaded" });
  }

  await page.waitForFunction(
    (name) => {
      const t = document.body?.innerText || "";
      return t.includes("שלום") && t.includes(name);
    },
    demoName,
    { timeout: 90_000 }
  );
  return { alreadyLoggedIn: false };
}

export async function ensureStudentSession(page, baseUrl, account = resolveStudentDemoAccount()) {
  await ensureDemoStudentAccess(baseUrl);
  const demoName = expectedDemoStudentName();
  await page.goto(`${baseUrl}/student/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitStudentLoginReady(page, 60_000);
  await loginStudentViaApiInBrowser(page, baseUrl, account);
  await page.goto(`${baseUrl}/student/home`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForFunction(
    (name) => {
      const t = document.body?.innerText || "";
      return t.includes(name) || (t.includes("שלום") && t.length > 200);
    },
    demoName,
    { timeout: 120_000 }
  );
  return { alreadyLoggedIn: false };
}

export async function waitForStudentHomeReady(page, demoName = expectedDemoStudentName()) {
  await page.waitForFunction(
    (name) => {
      const t = document.body?.innerText || "";
      if (!t.includes("שלום") && !t.includes(name)) return false;
      return (
        t.includes("התחל ללמוד") ||
        t.includes("הנתונים שלי") ||
        t.includes("הנושאים") ||
        t.includes("המשימות")
      );
    },
    demoName,
    { timeout: 120_000 }
  );
}
