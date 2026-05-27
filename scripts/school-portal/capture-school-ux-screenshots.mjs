import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "fs";

const out = "docs/school-portal/ux-evidence";
const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3005";
const pw =
  process.env.DEMO_TEACHER_PASSWORD ||
  process.env.SCHOOL_QA_PASSWORD ||
  process.env.SCHOOL_SECURITY_TEST_PASSWORD ||
  "";

if (!pw) {
  console.error("Set DEMO_TEACHER_PASSWORD or SCHOOL_QA_PASSWORD");
  process.exit(1);
}

mkdirSync(out, { recursive: true });

async function login(page) {
  await page.goto("/teacher/login");
  await page.getByPlaceholder("המייל שלך").fill("school@leo-k.com");
  await page.locator('input[type="password"]').fill(pw);
  await page.locator('form button[type="submit"]').click({ force: true });
  await page.waitForURL(/\/school\/dashboard/u, { timeout: 60_000 });
}

async function openClassReport(page, subjectButtonIndex = 0) {
  await page.goto("/school/classes");
  await page.getByRole("button", { name: "כיתה ג׳" }).click();
  await page.getByRole("button", { name: /כיתה ג׳ 1/u }).click();
  await page.getByRole("button", { name: "דוח כיתה" }).nth(subjectButtonIndex).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ timeout: 20_000 });
  await dialog.getByText("תלמידים בכיתה").waitFor({ timeout: 20_000 });
  await page.waitForTimeout(300);
}

async function capture(label, device) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...(device || {}), baseURL: base, locale: "he-IL" });
  const page = await context.newPage();

  await login(page);
  await page.screenshot({ path: `${out}/dashboard-${label}.png`, fullPage: true });

  await page.goto("/school/students");
  await page.getByRole("heading", { name: "בחרו שכבה" }).waitFor({ timeout: 30_000 });
  await page.screenshot({ path: `${out}/students-grades-${label}.png`, fullPage: true });

  await page.goto("/school/teachers");
  await page.getByRole("link", { name: "הרשאות מקצועות" }).first().click();
  await page.getByRole("heading", { name: "הרשאות מקצועות" }).waitFor({ timeout: 20_000 });
  await page.screenshot({ path: `${out}/teacher-subject-permissions-${label}.png`, fullPage: true });

  await openClassReport(page, 0);
  await page.screenshot({ path: `${out}/class-report-modal-math-${label}.png`, fullPage: true });
  await page.getByRole("dialog").getByRole("button", { name: "סגירה" }).click();

  await openClassReport(page, 1);
  await page.screenshot({ path: `${out}/class-report-modal-geometry-${label}.png`, fullPage: true });
  await page.getByRole("dialog").getByRole("button", { name: "סגירה" }).click();

  await page.goto("/school/students");
  await page.getByRole("button", { name: "כיתה ג׳" }).click();
  await page.getByRole("button", { name: /כיתה ג׳ 1/u }).click();
  await page.getByRole("button", { name: "דוח תלמיד" }).first().click();
  const studentDialog = page.getByRole("dialog");
  await studentDialog.waitFor({ timeout: 20_000 });
  await studentDialog.getByRole("heading", { name: "פירוט לפי מקצוע" }).waitFor({ timeout: 20_000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/student-report-modal-${label}.png`, fullPage: true });

  await browser.close();
}

await capture("desktop", null);
await capture("mobile", devices["iPhone 13"]);
console.log(`Screenshots saved to ${out}/`);
