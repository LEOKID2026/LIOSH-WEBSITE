/**
 * Capture pilot + regression screenshots for student bright UI v2 fix.
 * Usage: PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 node scripts/qa/capture-student-bright-pilot-screenshots.mjs
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "fs";
import { join } from "path";

const outDir = process.env.SCREENSHOT_OUT || "qa/screenshots/after-fix-v2";
const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001";
const studentUser = process.env.E2E_ERAN_USERNAME || "eran";
const studentPin = process.env.E2E_ERAN_PIN || "7479";

const PILOT = [
  { slug: "student-home", path: "/student/home", waitFor: "text=למידה" },
  { slug: "learning", path: "/learning", waitFor: "h1" },
  {
    slug: "math-master",
    path: "/learning/math-master",
    waitFor: '[data-testid="math-grade-select"]',
  },
];

const REGRESSION = [
  { slug: "home", path: "/" },
  { slug: "parent-login", path: "/parent/login" },
  { slug: "teacher-login", path: "/teacher/login" },
  { slug: "school", path: "/school" },
  { slug: "admin", path: "/admin" },
];

mkdirSync(outDir, { recursive: true });

function contextOptions(isMobile) {
  return {
    baseURL: base,
    locale: "he-IL",
    ...(isMobile ? devices["iPhone 13"] : { viewport: { width: 1280, height: 900 } }),
  };
}

async function loginStudent(page) {
  await page.goto("/student/login", { waitUntil: "domcontentloaded" });
  await page.getByTestId("student-login-username").fill(studentUser);
  await page.getByTestId("student-login-pin").fill(studentPin);
  await page.getByTestId("student-login-submit").click();
  await page.waitForURL(/\/student\/home/, { timeout: 60_000 });
  await page.waitForTimeout(1000);
}

async function capturePage(page, urlPath, filePath, waitFor) {
  await page.goto(urlPath, { waitUntil: "load", timeout: 60_000 });
  if (waitFor) {
    await page.locator(waitFor).first().waitFor({ state: "visible", timeout: 60_000 });
  } else {
    await page.waitForTimeout(1200);
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: filePath, fullPage: true });
}

async function capturePilot(label, isMobile) {
  const browser = await chromium.launch();
  const context = await browser.newContext(contextOptions(isMobile));
  const page = await context.newPage();
  await loginStudent(page);

  for (const item of PILOT) {
    const file = join(outDir, `${item.slug}-${label}.png`);
    await capturePage(page, item.path, file, item.waitFor);
    console.log(`saved ${file}`);
  }

  await browser.close();
}

async function captureRegression(label, isMobile) {
  const browser = await chromium.launch();

  for (const item of REGRESSION) {
    const context = await browser.newContext(contextOptions(isMobile));
    const page = await context.newPage();
    const file = join(outDir, `regression-${item.slug}-${label}.png`);
    await capturePage(page, item.path, file);
    console.log(`saved ${file}`);
    await context.close();
  }

  await browser.close();
}

console.log(`Base URL: ${base}`);
console.log(`Output: ${outDir}/`);
await capturePilot("desktop", false);
await captureRegression("desktop", false);
await capturePilot("mobile", true);
await captureRegression("mobile", true);
console.log("Done.");
