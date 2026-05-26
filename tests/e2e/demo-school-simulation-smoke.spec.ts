import { test, expect } from "@playwright/test";

const DEMO_SCHOOL_ID = process.env.DEMO_SCHOOL_ID || "bb4e5984-d95f-438f-a465-e1a8208ea7de";
const SCHOOL_MANAGER_EMAIL = process.env.SCHOOL_QA_EMAIL || "school@leo-k.com";
const SCHOOL_PASSWORD =
  process.env.DEMO_TEACHER_PASSWORD ||
  process.env.SCHOOL_QA_PASSWORD ||
  process.env.SCHOOL_SECURITY_TEST_PASSWORD ||
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
  "";

const TEACHER_CASES = [
  { email: "dan@leo-k.com", label: "Dan math", minClasses: 6, maxClasses: 12 },
  { email: "michal@leo-k.com", label: "Michal english", minClasses: 6, maxClasses: 6 },
  { email: "liron@leo-k.com", label: "Liron science", minClasses: 9, maxClasses: 9 },
];

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

test.describe("demo school simulation browser smoke @demo-school", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test.skip(!SCHOOL_PASSWORD, "SCHOOL_QA_PASSWORD / DEMO_TEACHER_PASSWORD required");

  test("T9 owner admin /admin/schools includes demo school", async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, "Admin password required");

    await teacherLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.waitForURL(/\/admin\//u, { timeout: 45_000 });

    await page.goto("/admin/schools", { waitUntil: "domcontentloaded" });
    await assertNo404(page);
    await expect(page.getByRole("heading", { name: "ניהול בתי ספר" })).toBeVisible({ timeout: 30_000 });

    const demoLink = page.locator(`a[href="/admin/schools/${DEMO_SCHOOL_ID}"]`);
    await expect(demoLink).toBeVisible({ timeout: 20_000 });
    await demoLink.click();
    await assertNo404(page);
    await expect(page.getByText("בית ספר ניסוי לאו קידס")).toBeVisible({ timeout: 20_000 });
  });

  test("T10 school manager portal pages and reports", async ({ page }) => {
    await teacherLogin(page, SCHOOL_MANAGER_EMAIL, SCHOOL_PASSWORD);
    await page.waitForURL(/\/school\/dashboard/u, { timeout: 45_000 });
    await assertNo404(page);

    const token = await supabasePasswordToken(SCHOOL_MANAGER_EMAIL, SCHOOL_PASSWORD);
    expect(token, "School manager token").toBeTruthy();

    const dash = await page.request.get("/api/school/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(dash.status()).toBe(200);
    const stats = (await dash.json())?.data?.stats;
    expect(stats?.activeClassCount).toBe(108);
    expect(stats?.enrolledStudentCount).toBe(398);

    for (const path of ["/school/classes", "/school/teachers", "/school/students"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await assertNo404(page);
    }

    await page.goto("/school/classes", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("בחרו שכבה")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "כיתה ג׳" }).click();
    await expect(page.getByText("בחרו כיתה")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /כיתה ג׳ 1/u }).click();
    await expect(page.getByText("מקצועות הכיתה")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("מתמטיקה")).toBeVisible();
    await expect(page.getByText("גיאומטריה")).toBeVisible();
    await page.getByRole("button", { name: "דוח כיתה" }).first().click();
    await expect(page.getByText("סיכום דוח")).toBeVisible({ timeout: 20_000 });

    await page.goto("/school/students", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "כיתה ג׳" }).click();
    await page.getByRole("button", { name: /כיתה ג׳ 1/u }).click();
    await expect(page.getByRole("button", { name: "דוח תלמיד" }).first()).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/school/teachers", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("דן כהן")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("מתמטיקה · גיאומטריה")).toBeVisible();

    const classesRes = await page.request.get("/api/school/classes", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(classesRes.status()).toBe(200);
    const classes = (await classesRes.json())?.data?.classes || [];
    expect(classes.length).toBe(108);
    const withMembers = classes.filter((c: { memberCount?: number }) => (c.memberCount ?? 0) > 0);
    expect(withMembers.length, "classes with roster counts").toBeGreaterThan(0);
    const names = classes.map((c: { name?: string; subjectFocus?: string }) =>
      `${c.name} ${c.subjectFocus || ""}`.trim()
    );
    expect(names.some((n: string) => /math/u.test(n))).toBeTruthy();
    expect(names.some((n: string) => /geometry/u.test(n))).toBeTruthy();

    const studentsRes = await page.request.get("/api/school/students", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(studentsRes.status()).toBe(200);
    const students = (await studentsRes.json())?.data?.students || [];
    expect(students.length).toBe(398);
    expect(students[0]?.physicalClassName, "physical class on student").toBeTruthy();

    const sampleClassId = classes[0]?.classId || classes[0]?.id;
    const sampleStudentId = students[0]?.studentId || students[0]?.id;
    expect(sampleClassId, "sample class for report").toBeTruthy();
    expect(sampleStudentId, "sample student for report").toBeTruthy();

    const classReport = await page.request.get(`/api/school/classes/${sampleClassId}/report-data`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(classReport.status()).toBe(200);
    const classReportBody = await classReport.json();
    expect(classReportBody?.cohortSummary || classReportBody?.summary).toBeTruthy();

    const studentReport = await page.request.get(
      `/api/school/students/${sampleStudentId}/report-data`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    expect(studentReport.status()).toBe(200);
  });

  test("T11 three teachers see only their classes; /school/* blocked", async ({ request }) => {
    for (const tc of TEACHER_CASES) {
      const token = await supabasePasswordToken(tc.email, SCHOOL_PASSWORD);
      expect(token, `${tc.label} login`).toBeTruthy();

      const classesRes = await request.get("/api/teacher/classes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(classesRes.status(), `${tc.label} teacher classes`).toBe(200);
      const classes = (await classesRes.json())?.data?.classes || [];
      expect(classes.length, `${tc.label} class count`).toBeGreaterThanOrEqual(tc.minClasses);
      expect(classes.length, `${tc.label} class count`).toBeLessThanOrEqual(tc.maxClasses);

      const schoolMe = await request.get("/api/school/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(schoolMe.status(), `${tc.label} school/me`).toBe(403);

      const schoolDash = await request.get("/api/school/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(schoolDash.status(), `${tc.label} school/dashboard`).toBe(403);
    }
  });
});
