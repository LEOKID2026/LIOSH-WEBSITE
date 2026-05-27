/**
 * Capture report-hub UX evidence (school manager + teacher + mobile).
 * PLAYWRIGHT_BASE_URL=http://127.0.0.1:3005 node --env-file=.env.local scripts/school-portal/capture-report-hub-screenshots.mjs
 */
import { chromium, devices, expect } from "@playwright/test";
import { mkdirSync } from "fs";

const out = "docs/school-portal/ux-evidence/report-hub";
const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3005";
const pw =
  process.env.DEMO_TEACHER_PASSWORD ||
  process.env.SCHOOL_QA_PASSWORD ||
  process.env.SCHOOL_SECURITY_TEST_PASSWORD ||
  process.env.TEACHER_PORTAL_VERIFY_PASSWORD ||
  "";

if (!pw) {
  console.error(
    "Set DEMO_TEACHER_PASSWORD, SCHOOL_QA_PASSWORD, SCHOOL_SECURITY_TEST_PASSWORD, or TEACHER_PORTAL_VERIFY_PASSWORD (.env.local / .env.e2e.local)"
  );
  process.exit(1);
}

mkdirSync(out, { recursive: true });

async function schoolLogin(page, email = "school@leo-k.com") {
  await page.goto("/teacher/login");
  await page.getByPlaceholder("המייל שלך").fill(email);
  await page.locator('input[type="password"]').fill(pw);
  await page.locator('form button[type="submit"]').click({ force: true });
  await page.waitForURL(/\/school\/dashboard/u, { timeout: 60_000 });
}

async function teacherLogin(page, email) {
  await page.goto("/teacher/login");
  await page.getByPlaceholder("המייל שלך").fill(email);
  await page.locator('input[type="password"]').fill(pw);
  await page.locator('form button[type="submit"]').click({ force: true });
  await page.waitForURL(/\/teacher\/dashboard/u, { timeout: 60_000 });
}

/** Modal is mounted with report-hub-main; wait until summary UX is hydrated (no stale טוען דוח… screenshot). */
async function waitReportHubMainLoaded(page) {
  const main = page.getByTestId("report-hub-main");
  await main.waitFor({ state: "visible", timeout: 45_000 });
  await expect(page.getByTestId("report-hub-summary-ready")).toBeVisible({ timeout: 60_000 });
  await expect(main.getByText("טוען דוח…")).toHaveCount(0);
}

async function waitReportDetailLoaded(page, testId = "report-hub-detail") {
  const modal = page.getByTestId(testId);
  await modal.waitFor({ state: "visible", timeout: 45_000 });
  await expect(modal.getByText("טוען דוח…")).toHaveCount(0);
}

async function waitNestedStudentSummaryLoaded(page) {
  const shell = page.getByTestId("report-hub-student-main");
  await shell.waitFor({ state: "visible", timeout: 45_000 });
  await expect(page.getByTestId("report-hub-summary-ready")).toBeVisible({ timeout: 60_000 });
  await expect(shell.getByText("טוען דוח תלמיד…")).toHaveCount(0);
}

async function openSchoolClassReport(page) {
  await page.goto("/school/classes");
  await page.getByRole("button", { name: "כיתה ג׳" }).click();
  await page.getByRole("button", { name: /כיתה ג׳ 1/u }).click();
  await page.getByRole("button", { name: "דוח כיתה" }).first().click();
  await waitReportHubMainLoaded(page);
}

async function captureSchoolManager(label, device) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...(device || {}), baseURL: base, locale: "he-IL" });
  const page = await context.newPage();

  await schoolLogin(page);
  await openSchoolClassReport(page);

  const main = page.getByTestId("report-hub-main");
  await page.screenshot({ path: `${out}/school-class-report-hub-${label}.png` });

  await main.getByTestId("report-nav-activities").click();
  await waitReportDetailLoaded(page);
  await page.screenshot({ path: `${out}/school-class-activities-detail-${label}.png` });
  await page.getByTestId("report-hub-detail").getByTestId("report-modal-back").click();

  await main.getByTestId("report-nav-students").click();
  await waitReportDetailLoaded(page);
  await page.screenshot({ path: `${out}/school-class-students-detail-${label}.png` });

  const firstStudentBtn = page.getByTestId("report-hub-detail").locator('[data-testid^="report-open-student-"]').first();
  if ((await firstStudentBtn.count()) > 0) {
    await firstStudentBtn.click();
    await waitNestedStudentSummaryLoaded(page);
    await page.screenshot({ path: `${out}/school-nested-student-hub-${label}.png` });
    await page.getByTestId("report-hub-student-main").getByTestId("report-nav-subjects").click();
    await waitReportDetailLoaded(page, "report-hub-student-detail");
    await page.screenshot({ path: `${out}/school-student-subject-detail-${label}.png` });
    await page.getByTestId("report-hub-student-detail").getByTestId("report-modal-close").click();
  } else {
    await page.getByTestId("report-hub-detail").getByTestId("report-modal-back").click();
    await main.getByTestId("report-modal-close").click();
    await page.goto("/school/students");
    await page.getByRole("button", { name: "כיתה ג׳" }).click();
    await page.getByRole("button", { name: /כיתה ג׳ 1/u }).click();
    await page.getByRole("button", { name: "דוח תלמיד" }).first().click();
    await waitReportHubMainLoaded(page);
    await page.screenshot({ path: `${out}/school-nested-student-hub-${label}.png` });
    await page.getByTestId("report-hub-main").getByTestId("report-nav-subjects").click();
    await waitReportDetailLoaded(page, "report-hub-detail");
    await page.screenshot({ path: `${out}/school-student-subject-detail-${label}.png` });
    await page.getByTestId("report-hub-detail").getByTestId("report-modal-close").click();
  }

  await browser.close();
}

async function captureTeacher(label, device) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...(device || {}), baseURL: base, locale: "he-IL" });
  const page = await context.newPage();

  await teacherLogin(page, "dan@leo-k.com");
  await page.locator('[data-testid^="teacher-physical-class-card-"]').first().waitFor({ timeout: 30_000 });
  await page.screenshot({ path: `${out}/teacher-dashboard-grouped-dan-${label}.png`, fullPage: true });

  await page.locator('[data-testid^="teacher-physical-class-card-"]').first().getByRole("button", { name: "דוח כיתה" }).click();
  await waitReportHubMainLoaded(page);
  await page.screenshot({ path: `${out}/teacher-class-report-hub-${label}.png` });

  await page.getByTestId("report-hub-main").getByTestId("report-nav-activities").click();
  await waitReportDetailLoaded(page);
  await page.screenshot({ path: `${out}/teacher-class-activities-detail-${label}.png` });

  await browser.close();
}

await captureSchoolManager("desktop", null);
await captureSchoolManager("mobile", devices["iPhone 13"]);
await captureTeacher("desktop", null);
console.log(`Report hub screenshots saved under ${out}/`);
