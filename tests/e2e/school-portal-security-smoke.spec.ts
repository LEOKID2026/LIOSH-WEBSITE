import { test, expect } from "@playwright/test";

const SCHOOL_MANAGER_EMAIL = process.env.SCHOOL_QA_EMAIL || "school@leo.com";
const PRIVATE_TEACHER_EMAIL = "school-private@leo.com";
const SCHOOL_PASSWORD =
  process.env.SCHOOL_SECURITY_TEST_PASSWORD ||
  process.env.SCHOOL_QA_PASSWORD ||
  process.env.TEACHER_PORTAL_VERIFY_PASSWORD ||
  "";

const ADMIN_EMAIL =
  process.env.ADMIN_PORTAL_EMAIL ||
  process.env.E2E_ADMIN_EMAIL ||
  process.env.ADMIN_TEST_EMAIL ||
  "office@leo.com";
const ADMIN_PASSWORD =
  process.env.ADMIN_PORTAL_PASSWORD ||
  process.env.E2E_ADMIN_PASSWORD ||
  process.env.ADMIN_TEST_PASSWORD ||
  process.env.SCHOOL_SECURITY_TEST_PASSWORD ||
  process.env.SCHOOL_QA_PASSWORD ||
  "";

async function supabasePasswordToken(email: string, password: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !email || !password) return null;
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.access_token || null;
}

const NOT_FOUND_RE = /404|This page could not be found|הדף לא נמצא/u;

async function teacherLogin(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/teacher/login", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("המייל שלך").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('form button[type="submit"]').click({ force: true });
}

async function assertNo404(page: import("@playwright/test").Page) {
  await expect(page.getByText(NOT_FOUND_RE)).toHaveCount(0);
  expect(page.url()).not.toMatch(/\/404/u);
}

test.describe("school portal security smoke @school-portal", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test.skip(!SCHOOL_PASSWORD, "SCHOOL_SECURITY_TEST_PASSWORD / SCHOOL_QA_PASSWORD required");

  test("school manager login → dashboard and portal pages", async ({ page }) => {
    await teacherLogin(page, SCHOOL_MANAGER_EMAIL, SCHOOL_PASSWORD);
    await page.waitForURL(/\/school\/dashboard/u, { timeout: 45_000 });
    await assertNo404(page);

    for (const path of ["/school/teachers", "/school/classes", "/school/students"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await assertNo404(page);
      await expect(page).not.toHaveURL(/\/teacher\/login/u);
    }
  });

  test("private teacher → teacher dashboard; school routes blocked", async ({ page }) => {
    await teacherLogin(page, PRIVATE_TEACHER_EMAIL, SCHOOL_PASSWORD);
    await page.waitForURL(/\/teacher\/dashboard/u, { timeout: 45_000 });
    await assertNo404(page);

    await page.goto("/school/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/teacher\/dashboard/u, { timeout: 20_000 });
  });

  test("owner admin schools UI", async ({ page, request }) => {
    test.skip(!ADMIN_PASSWORD, "Admin password required (ADMIN_PORTAL_PASSWORD / ADMIN_TEST_PASSWORD)");

    await teacherLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.waitForURL(/\/admin\//u, { timeout: 45_000 });

    await page.goto("/admin/schools", { waitUntil: "domcontentloaded" });
    await assertNo404(page);
    await expect(page.getByRole("heading", { name: "ניהול בתי ספר" })).toBeVisible({ timeout: 30_000 });

    const table = page.locator("table");
    const emptyList = page.getByText("אין בתי ספר.");
    await expect(table.or(emptyList)).toBeVisible({ timeout: 30_000 });

    const manageLink = page.locator('a[href^="/admin/schools/"]').first();
    await expect(manageLink).toBeVisible({ timeout: 15_000 });
    await manageLink.click();
    await assertNo404(page);

    await expect(page.getByRole("heading", { name: "מורים בבית הספר" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("מינוי מנהל/ת בית ספר")).toBeVisible();
    await expect(page.getByText("שיוך מורה")).toBeVisible();

    const managerToken = await supabasePasswordToken(SCHOOL_MANAGER_EMAIL, SCHOOL_PASSWORD);
    test.skip(!managerToken, "School manager token unavailable");
    const adminSchoolsRes = await request.get("/api/admin/schools", {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    expect(adminSchoolsRes.status()).toBe(403);
    const adminTeachersRes = await request.get("/api/admin/teachers", {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    expect(adminTeachersRes.status()).toBe(403);
  });
});
