import { chromium, devices } from "@playwright/test";
import { join } from "path";

const outDir = "qa/screenshots/after-fix-v2";
const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001";

const PILOT = [
  { slug: "math-master", path: "/learning/math-master", waitFor: '[data-testid="math-grade-select"]' },
];

async function loginStudent(page) {
  await page.goto("/student/login", { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.getByTestId("student-login-username").waitFor({ state: "visible", timeout: 90_000 });
  await page.getByTestId("student-login-username").fill(process.env.E2E_ERAN_USERNAME || "eran");
  await page.getByTestId("student-login-pin").fill(process.env.E2E_ERAN_PIN || "7479");
  await page.getByTestId("student-login-submit").click();
  await page.waitForURL(/\/student\/home/, { timeout: 90_000 });
}

for (const [label, isMobile] of [
  ["desktop", false],
  ["mobile", true],
]) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: base,
    locale: "he-IL",
    ...(isMobile ? devices["iPhone 13"] : { viewport: { width: 1280, height: 900 } }),
  });
  const page = await context.newPage();
  await loginStudent(page);
  for (const item of PILOT) {
    await page.goto(item.path, { waitUntil: "load", timeout: 60_000 });
    await page.locator(item.waitFor).first().waitFor({ state: "visible", timeout: 90_000 });
    await page.waitForTimeout(1000);
    const file = join(outDir, `${item.slug}-${label}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`saved ${file}`);
  }
  await browser.close();
}
