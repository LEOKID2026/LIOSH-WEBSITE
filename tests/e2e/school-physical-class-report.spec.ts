import { test, expect } from "@playwright/test";

const SCHOOL_MANAGER_EMAIL = process.env.SCHOOL_QA_EMAIL || "school@leo-k.com";
const SCHOOL_PASSWORD =
  process.env.DEMO_TEACHER_PASSWORD ||
  process.env.SCHOOL_QA_PASSWORD ||
  process.env.SCHOOL_SECURITY_TEST_PASSWORD ||
  process.env.TEACHER_PORTAL_VERIFY_PASSWORD ||
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

test.describe("School physical class report", () => {
  test.skip(!SCHOOL_PASSWORD, "Set SCHOOL_QA_PASSWORD or DEMO_TEACHER_PASSWORD");

  test("manager opens physical class report with actions", async ({ page }) => {
    const token = await supabasePasswordToken(SCHOOL_MANAGER_EMAIL, SCHOOL_PASSWORD);
    expect(token).toBeTruthy();

    await page.goto("/teacher/login", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("המייל שלך").fill(SCHOOL_MANAGER_EMAIL);
    await page.locator('input[type="password"]').fill(SCHOOL_PASSWORD);
    await page.locator('[data-testid="teacher-login-root"] form button[type="submit"]').click();
    await page.waitForURL(/\/school\//, { timeout: 30_000 });

    await page.goto("/school/classes", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "בחרו שכבה" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "כיתה א׳" }).click();
    await expect(page.getByRole("heading", { name: /בחרו כיתה/u })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /כיתה א׳ 1/u }).click();
    await expect(page.getByTestId("school-physical-class-report-button")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("school-physical-class-report-button").click();

    const physicalDialog = page.getByTestId("report-hub-main");
    await expect(physicalDialog).toBeVisible({ timeout: 20_000 });
    await expect(physicalDialog.getByTestId("report-hub-summary-ready")).toBeVisible({ timeout: 90_000 });
    await expect(physicalDialog.getByText("טוען דוח כיתה כללי…")).toHaveCount(0);

    await expect(physicalDialog.getByTestId("report-nav-subjects")).toBeVisible();
    await expect(physicalDialog.getByTestId("report-nav-activities")).toBeVisible();
    await expect(physicalDialog.getByTestId("report-nav-students")).toBeVisible();

    await physicalDialog.getByTestId("report-nav-subjects").click();
    const subjectDetail = page.getByTestId("report-hub-detail").first();
    await expect(subjectDetail).toBeVisible({ timeout: 10_000 });
    await expect(subjectDetail.getByRole("button", { name: "דוח מקצוע" }).first()).toBeVisible();
    await expect(subjectDetail.getByRole("button", { name: "כרטיס מורה" }).first()).toBeVisible();

    await subjectDetail.getByRole("button", { name: "דוח מקצוע" }).first().click();
    const subjectDialog = page.getByTestId("report-hub-main").last();
    await expect(subjectDialog).toBeVisible({ timeout: 20_000 });
    await expect(subjectDialog.getByTestId("report-hub-summary-ready")).toBeVisible({ timeout: 90_000 });

    const physicalDetailZ = await subjectDetail.evaluate((el) => Number(window.getComputedStyle(el).zIndex) || 0);
    const subjectMainZ = await subjectDialog.evaluate((el) => Number(window.getComputedStyle(el).zIndex) || 0);
    expect(subjectMainZ).toBeGreaterThan(physicalDetailZ);

    await subjectDialog.getByTestId("report-modal-close").click();
    await expect(page.getByTestId("report-hub-main")).toHaveCount(1);

    await physicalDialog.getByTestId("report-nav-subjects").click();
    await expect(page.getByTestId("report-hub-detail").first()).toBeVisible({ timeout: 10_000 });
    await page
      .getByTestId("report-hub-detail")
      .first()
      .getByRole("button", { name: "כרטיס מורה" })
      .first()
      .click();
    const teacherModal = page.getByTestId("school-teacher-detail-modal");
    await expect(teacherModal).toBeVisible({ timeout: 15_000 });
    await expect(teacherModal.getByTestId("school-teacher-page-ready")).toBeVisible({ timeout: 30_000 });
    await expect(teacherModal.getByRole("heading", { name: "כיתות של המורה" })).toBeVisible();
    await teacherModal.getByTestId("report-modal-close").click();
    await expect(teacherModal).toHaveCount(0);

    await physicalDialog.getByTestId("report-nav-activities").click();
    const actDetail = page.getByTestId("report-hub-detail");
    await expect(actDetail).toBeVisible({ timeout: 10_000 });
    await expect(actDetail.getByRole("button", { name: "דוח מקצוע" }).first()).toBeVisible();
    await actDetail.getByTestId("report-modal-back").click();

    await physicalDialog.getByTestId("report-nav-students").click();
    const studentDetail = page.getByTestId("report-hub-detail");
    await expect(studentDetail).toBeVisible({ timeout: 10_000 });
    await expect(studentDetail.getByRole("button", { name: "דוח ילד/ה" }).first()).toBeVisible();
    await studentDetail.getByRole("button", { name: "דוח ילד/ה" }).first().click();
    await expect(page.getByTestId("report-hub-student-main")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("report-hub-student-main").getByTestId("report-modal-back").click();

    await physicalDialog.getByTestId("report-modal-close").click();
    await expect(physicalDialog).toHaveCount(0);
  });

  test("physical report API returns scoped data", async ({ request }) => {
    const token = await supabasePasswordToken(SCHOOL_MANAGER_EMAIL, SCHOOL_PASSWORD);
    expect(token).toBeTruthy();

    const params = new URLSearchParams({
      windowDays: "30",
      gradeLevel: "1",
      physicalClassName: "כיתה א׳ 1",
    });
    const res = await request.get(`/api/school/classes/physical-report?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.physicalClass?.name).toBe("כיתה א׳ 1");
    expect(body.subjectBreakdown?.length).toBeGreaterThanOrEqual(1);
    expect(body.roster?.length).toBeGreaterThanOrEqual(1);
    expect(body.recentActivities).toBeDefined();
  });
});
