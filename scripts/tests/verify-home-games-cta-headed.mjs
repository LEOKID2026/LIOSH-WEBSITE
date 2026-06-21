#!/usr/bin/env node
/**
 * Home "משחקים" CTA flow — headed vs headless, form vs API login.
 * Usage:
 *   node --env-file=.env.local scripts/tests/verify-home-games-cta-headed.mjs
 *   HEADLESS=1 LOGIN_MODE=api node ...
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL || "http://localhost:3001";
const USERNAME = process.env.E2E_STUDENT_USERNAME || "leo-s02";
const PIN = process.env.E2E_STUDENT_PIN || "1234";
const HEADLESS = process.env.HEADLESS === "1";
const LOGIN_MODE = process.env.LOGIN_MODE || "form";

function authHeaders() {
  return { Origin: BASE, Referer: `${BASE}/student/login` };
}

async function loginViaApi(page) {
  await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded" });
  const res = await page.request.post(`${BASE}/api/student/login`, {
    data: { username: USERNAME, pin: PIN },
    headers: authHeaders(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok() || body?.ok !== true) {
    throw new Error(`API login failed: ${res.status()} ${JSON.stringify(body)}`);
  }
  await page.goto(`${BASE}/student/home`, { waitUntil: "domcontentloaded" });
}

async function loginViaForm(page) {
  await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded" });
  await page.getByText("בודקים חיבור...").waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
  await page.getByTestId("student-login-username").fill(USERNAME);
  await page.getByTestId("student-login-pin").fill(PIN);
  await Promise.all([
    page.waitForURL(/\/student\/home/, { timeout: 45_000, waitUntil: "domcontentloaded" }),
    page.getByTestId("student-login-submit").click(),
  ]);
}

async function main() {
  console.log(`Mode: ${HEADLESS ? "headless" : "headed"} | login: ${LOGIN_MODE}`);
  console.log(`BASE=${BASE} user=${USERNAME}\n`);

  const browser = await chromium.launch({
    headless: HEADLESS,
    slowMo: HEADLESS ? 0 : 100,
  });
  const context = await browser.newContext({
    baseURL: BASE,
    locale: "he-IL",
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    if (LOGIN_MODE === "api") await loginViaApi(page);
    else await loginViaForm(page);

    console.log("1. After login URL:", page.url());
    await page.getByText("בודקים התחברות ילד/ה").waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
    await page.getByText("טוען את דף הבית...").waitFor({ state: "detached", timeout: 45_000 }).catch(() => {});

    const soloLink = page.locator('a[href="/student/solo-games"]');
    const linkCount = await soloLink.count();
    const visible = linkCount > 0 && (await soloLink.first().isVisible());
    console.log("2. Home CTA:", { linkCount, visible, url: page.url() });

    if (!visible) {
      console.log("   body:", (await page.locator("body").innerText()).slice(0, 350));
      process.exitCode = 1;
      return;
    }

    await soloLink.first().click();
    await page.waitForURL(/\/student\/solo-games\/?$/, { timeout: 20_000 });
    console.log("3. Hub:", page.url());

    await page.locator('header a[href="/student/home"]').first().click();
    await page.waitForURL(/\/student\/home/, { timeout: 20_000 });
    console.log("4. Back from game header:", page.url());

    await page.waitForTimeout(2500);
    const stuckLoading =
      (await page.getByText("טוען את דף הבית...").count()) > 0 ||
      (await page.getByText("בודקים התחברות ילד/ה").count()) > 0;
    const onLogin = page.url().includes("/student/login");
    console.log("5. Loop check:", { stuckLoading, onLogin });

    if (stuckLoading || onLogin) process.exitCode = 1;
    else console.log("\nPASS");
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
