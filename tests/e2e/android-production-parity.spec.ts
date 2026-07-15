import { test, expect, type Page } from "@playwright/test";

const PRODUCTION = process.env.ANDROID_QA_BASE_URL || "https://liosh-website.vercel.app";
const STUDENT_USER = process.env.E2E_STUDENT_USERNAME || process.env.ACTIVITY_SIM_STUDENT_USER || "";
const STUDENT_PIN = process.env.E2E_STUDENT_PIN || process.env.ACTIVITY_SIM_STUDENT_PIN || "";
const PARENT_ID = process.env.E2E_PARENT_EMAIL || "";
const PARENT_SECRET = process.env.E2E_PARENT_PASSWORD || "";
const TEACHER_EMAIL = process.env.TEACHER_PORTAL_VERIFY_EMAIL || "";
const TEACHER_PASSWORD = process.env.TEACHER_PORTAL_VERIFY_PASSWORD || "";

async function waitStudentLoginReady(page: Page) {
  await page.goto("/student/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("בודקים חיבור...")).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByPlaceholder("שם משתמש")).toBeVisible({ timeout: 30_000 });
}

async function submitStudentLogin(page: Page, username: string, pin: string) {
  await page.getByPlaceholder("שם משתמש").fill(username);
  await page.getByPlaceholder("קוד כניסה").fill(pin);
  await page.getByTestId("student-login-submit").click({ force: true });
}

test.describe("Android WebView parity - production mobile @android-qa", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("W0 - homepage loads with RTL on production", async ({ page }) => {
    const res = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('[dir="rtl"]').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("home-hero")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("home-brand-line")).toContainText("LEO KIDS");
    expect(page.url()).toContain(new URL(PRODUCTION).host);
  });

  test("W1 - Hebrew RTL on student login", async ({ page }) => {
    await waitStudentLoginReady(page);
    const rtl = page.locator('[dir="rtl"]').first();
    await expect(rtl).toBeVisible();
    await expect(page.getByText("כניסת ילד/ה")).toBeVisible();
  });

  test("S1–S2 - student login and home", async ({ page }) => {
    test.skip(!STUDENT_USER || !STUDENT_PIN, "Set E2E_STUDENT_USERNAME + E2E_STUDENT_PIN in .env.e2e.local");
    await waitStudentLoginReady(page);
    await submitStudentLogin(page, STUDENT_USER, STUDENT_PIN);
    await page.waitForURL(/\/student\/(home|activity)/, { timeout: 45_000 });
    await expect(page.getByText(/404|הדף לא נמצא/u)).toHaveCount(0);
  });

  test("S3–S4 - learning activity opens (hebrew-master smoke)", async ({ page }) => {
    test.skip(!STUDENT_USER || !STUDENT_PIN, "Set E2E_STUDENT_USERNAME + E2E_STUDENT_PIN");
    await waitStudentLoginReady(page);
    await submitStudentLogin(page, STUDENT_USER, STUDENT_PIN);
    await page.waitForURL(/\/student\//, { timeout: 45_000 });
    const res = await page.goto("/learning/hebrew-master", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByText(/404|הדף לא נמצא/u)).toHaveCount(0, { timeout: 30_000 });
  });

  test("P1–P2 - parent login and dashboard area", async ({ page }) => {
    test.skip(!PARENT_ID || !PARENT_SECRET, "Set E2E_PARENT_EMAIL + E2E_PARENT_PASSWORD");
    await page.goto("/parent/login", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("הקלידו אימייל או שם משתמש שקיבלתם מהמורה").fill(PARENT_ID);
    await page.getByPlaceholder("הקלידו סיסמה או קוד כניסה").fill(PARENT_SECRET);
    await page.locator('form button[type="submit"]').click({ force: true });
    await page.waitForURL(/\/parent\//, { timeout: 45_000 });
    await expect(page.getByText(/404|הדף לא נמצא/u)).toHaveCount(0);
  });

  test("T1 - teacher login page loads", async ({ page }) => {
    await page.goto("/teacher/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/404|הדף לא נמצא/u)).toHaveCount(0);
    await expect(page.locator('[dir="rtl"]').first()).toBeVisible();
  });

  test("T1b - teacher login when credentials available", async ({ page }) => {
    test.skip(!TEACHER_EMAIL || !TEACHER_PASSWORD, "Set TEACHER_PORTAL_VERIFY_EMAIL + TEACHER_PORTAL_VERIFY_PASSWORD");
    await page.goto("/teacher/login", { waitUntil: "domcontentloaded" });
    const emailField = page.getByPlaceholder(/אימייל|email/i).first();
    if (await emailField.count()) {
      await emailField.fill(TEACHER_EMAIL);
      const passField = page.getByPlaceholder(/סיסמה|password/i).first();
      await passField.fill(TEACHER_PASSWORD);
      await page.locator('form button[type="submit"]').click({ force: true });
      await page.waitForURL(/\/teacher\//, { timeout: 45_000 });
      await expect(page.getByText(/404|הדף לא נמצא/u)).toHaveCount(0);
    }
  });

  test("T2–T3 - school staff login page loads", async ({ page }) => {
    await page.goto("/school/staff/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("school-staff-login-root")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[dir="rtl"]').first()).toBeVisible();
  });

  test("G1 - arcade games page loads", async ({ page }) => {
    const res = await page.goto("/game", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByText(/404|הדף לא נמצא/u)).toHaveCount(0);
  });

  test("G2 - learning zone loads", async ({ page }) => {
    const res = await page.goto("/learning", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByText(/404|הדף לא נמצא/u)).toHaveCount(0);
  });

  test("W2 - browser back navigation", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.goto("/student/login", { waitUntil: "domcontentloaded" });
    await page.goBack();
    await expect(page).toHaveURL(/\/?$/);
  });

  test("W6 - keyboard input on login form", async ({ page }) => {
    await waitStudentLoginReady(page);
    const input = page.getByPlaceholder("שם משתמש");
    await input.tap();
    await input.fill("qa-test-user");
    await expect(input).toHaveValue("qa-test-user");
  });
});
