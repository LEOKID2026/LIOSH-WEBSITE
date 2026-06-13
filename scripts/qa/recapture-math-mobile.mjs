import { chromium, devices } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001";
const browser = await chromium.launch();
const ctx = await browser.newContext({ baseURL: base, locale: "he-IL", ...devices["iPhone 13"] });
const page = await ctx.newPage();
page.setDefaultTimeout(120_000);
await page.goto("/student/login", { waitUntil: "networkidle", timeout: 120_000 });
await page.getByTestId("student-login-username").waitFor({ state: "visible", timeout: 120_000 });
await page.getByTestId("student-login-username").fill("eran");
await page.getByTestId("student-login-pin").fill("7479");
await page.getByTestId("student-login-submit").click();
await page.waitForURL(/\/student\/home/, { timeout: 120_000 });
await page.goto("/learning/math-master", { waitUntil: "networkidle", timeout: 120_000 });
await page.locator('[data-testid="math-grade-select"]').waitFor({ state: "visible", timeout: 120_000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "qa/screenshots/after-fix-v2/math-master-mobile.png", fullPage: true });
console.log("saved math-master-mobile.png");
await browser.close();
