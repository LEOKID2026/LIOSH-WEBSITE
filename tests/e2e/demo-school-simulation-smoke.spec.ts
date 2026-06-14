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

const TEACHER_DASHBOARD_PHYSICAL = [
  {
    email: "dan@leo-k.com",
    label: "Dan",
    physicalClasses: 6,
    minStudents: 20,
    maxStudents: 24,
    subjects: ["מתמטיקה", "גאומטריה"],
  },
  {
    email: "michal@leo-k.com",
    label: "Michal",
    physicalClasses: 6,
    minStudents: 20,
    maxStudents: 24,
    subjects: ["אנגלית"],
  },
  {
    email: "liron@leo-k.com",
    label: "Liron",
    physicalClasses: 9,
    minStudents: 20,
    maxStudents: 24,
    subjects: ["מדעים"],
  },
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
  await page.locator('[data-testid="teacher-login-root"] form button[type="submit"]').click();
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

    await page.goto("/school/teachers", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/דן כהן/u)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^math$/i)).toHaveCount(0);
    await expect(page.getByText(/^geometry$/i)).toHaveCount(0);
    await expect(page.getByText(/guided_practice|school_admin|moledet_geography/u)).toHaveCount(0);
    await expect(page.getByText(/מתמטיקה · גאומטריה/u).first()).toBeVisible();

    const teachersListRes = await page.request.get("/api/school/teachers", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(teachersListRes.status()).toBe(200);
    const danTeacher = ((await teachersListRes.json())?.data?.teachers || []).find((t) =>
      /דן כהן/u.test(String(t.displayName || ""))
    );
    expect(danTeacher?.teacherId, "Dan Cohen teacher id").toBeTruthy();
    const danSubjectsRes = await page.request.get(
      `/api/school/teachers/${danTeacher.teacherId}/subjects`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(danSubjectsRes.status()).toBe(200);
    const danSubjects = (await danSubjectsRes.json())?.data?.subjects || [];
    expect(danSubjects.length).toBeGreaterThan(0);
    expect(danSubjects.some((s) => s.subject === "math" || s.subject === "geometry")).toBeTruthy();

    await page.goto(`/school/teachers/${danTeacher.teacherId}`, { waitUntil: "domcontentloaded" });
    await assertNo404(page);
    await expect(page.getByTestId("school-teacher-page-ready")).toBeVisible({ timeout: 45_000 });
    const teacherReady = page.getByTestId("school-teacher-page-ready");
    await expect(teacherReady.getByText("טוען…", { exact: true })).toHaveCount(0);
    await expect(teacherReady).not.toContainText(/guided_practice|school_admin|moledet_geography/u);

    const classesHeading = teacherReady.getByRole("heading", { name: "כיתות של המורה" });
    const permissionsHeading = teacherReady.getByRole("heading", { name: "הרשאות מקצועות" });
    await expect(classesHeading).toBeVisible({ timeout: 15_000 });
    await expect(permissionsHeading).toBeVisible({ timeout: 15_000 });
    const classesBox = await classesHeading.boundingBox();
    const permissionsBox = await permissionsHeading.boundingBox();
    expect(classesBox && permissionsBox && classesBox.y < permissionsBox.y, "classes section above permissions").toBeTruthy();

    const danClassesRes = await page.request.get(
      `/api/school/classes?teacherId=${encodeURIComponent(danTeacher.teacherId)}&isArchived=false`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(danClassesRes.status()).toBe(200);
    const danSubjectClasses = (await danClassesRes.json())?.data?.classes || [];
    expect(danSubjectClasses.length).toBe(12);

    const physicalCards = teacherReady.locator('[data-testid^="school-teacher-physical-class-card-"]');
    await expect(physicalCards).toHaveCount(6, { timeout: 15_000 });
    await expect(physicalCards.first()).toContainText(/מקצועות:\s*מתמטיקה,\s*גאומטריה/u);
    await expect(physicalCards.first()).toContainText(/\d+\s+ילדים/u);
    await expect(teacherReady.getByText(/^math$/i)).toHaveCount(0);
    await expect(teacherReady.getByText(/^geometry$/i)).toHaveCount(0);

    await physicalCards.first().click();
    const picker = page.getByTestId("school-teacher-subject-picker-modal");
    await expect(picker).toBeVisible({ timeout: 10_000 });
    await expect(picker.getByText("מתמטיקה")).toBeVisible();
    await expect(picker.getByText("גאומטריה")).toBeVisible();
    await picker.getByRole("button", { name: "דוח כיתה" }).first().click();
    await expect(page.getByTestId("report-hub-main")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("report-hub-summary-ready")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("report-hub-main").getByTestId("report-modal-close").click();
    await expect(page.getByTestId("report-hub-main")).toHaveCount(0);

    await physicalCards.first().click();
    await expect(picker).toBeVisible({ timeout: 10_000 });
    await picker.getByRole("button", { name: "ילדים בכיתה" }).first().click();
    const studentsModal = page.getByTestId("school-teacher-class-students-modal");
    await expect(studentsModal).toBeVisible({ timeout: 15_000 });
    await expect(studentsModal.getByRole("button", { name: "דוח ילד/ה" }).first()).toBeVisible({
      timeout: 15_000,
    });
    await studentsModal.getByRole("button", { name: "סגירה", exact: false }).click();
    await expect(studentsModal).toHaveCount(0);
    await picker.getByTestId("report-modal-close").click();
    await expect(picker).toHaveCount(0);

    await expect(teacherReady.getByText(/מקצועות מורשים/u)).toBeVisible({ timeout: 15_000 });
    await expect(teacherReady.getByTestId("school-subject-select-he")).toBeVisible({ timeout: 10_000 });
    const optionTexts = await teacherReady.getByTestId("school-subject-select-he").locator("option").allTextContents();
    expect(optionTexts.some((t) => /\b(math|geometry|english|science)\b/i.test(String(t || "")))).toBe(false);

    await page.goto("/school/classes", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "בחרו שכבה" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "כיתה ג׳" }).click();
    await expect(page.getByRole("heading", { name: /בחרו כיתה/u })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /כיתה ג׳ 1/u }).click();
    await expect(page.getByRole("heading", { name: /מקצועות הכיתה/u })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("מתמטיקה")).toBeVisible();
    await expect(page.getByText("גאומטריה")).toBeVisible();
    await page.getByRole("button", { name: "דוח כיתה" }).first().click();
    await expect(page.getByTestId("report-hub-main")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("report-hub-summary-ready")).toBeVisible({ timeout: 60_000 });
    const classDialog = page.getByTestId("report-hub-main");
    await expect(classDialog.getByText("טוען דוח…")).toHaveCount(0);
    await expect(classDialog.getByTestId("report-nav-students")).toBeVisible();
    await expect(classDialog.getByTestId("report-nav-activities")).toBeVisible();
    await expect(classDialog.getByRole("heading", { name: "פעילויות אחרונות" })).toHaveCount(0);
    await expect(classDialog.getByTestId("report-nav-distribution")).toBeVisible();
    await classDialog.getByTestId("report-nav-activities").click();
    await expect(page.getByTestId("report-hub-detail")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("report-hub-detail").getByText("geometry")).toHaveCount(0);
    await page.getByTestId("report-hub-detail").getByTestId("report-modal-back").click();
    await classDialog.getByTestId("report-modal-close").click();
    await expect(page.getByTestId("report-hub-main")).toHaveCount(0);

    await page.getByRole("button", { name: "דוח כיתה" }).nth(1).click();
    await expect(page.getByTestId("report-hub-main")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("report-hub-summary-ready")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("report-hub-main").getByText("טוען דוח…")).toHaveCount(0);
    await page.getByTestId("report-nav-activities").click();
    await expect(page.getByTestId("report-hub-detail")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("report-hub-detail").getByTestId("report-modal-back").click();
    await page.getByTestId("report-hub-main").getByTestId("report-modal-close").click();

    await page.goto("/school/students", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "בחרו שכבה" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "כיתה ג׳" }).click();
    await page.getByRole("button", { name: /כיתה ג׳ 1/u }).click();
    await expect(page.getByRole("button", { name: "דוח ילד/ה" }).first()).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: "דוח ילד/ה" }).first().click();
    await expect(page.getByTestId("report-hub-main")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("report-hub-summary-ready")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("report-hub-main").getByText("טוען דוח…")).toHaveCount(0);
    const studentDialog = page.getByTestId("report-hub-main");
    await expect(studentDialog.getByTestId("report-nav-subjects")).toBeVisible();
    await expect(studentDialog.getByTestId("report-nav-activities")).toBeVisible();
    await expect(studentDialog.getByRole("heading", { name: "פעילות אחרונה" })).toHaveCount(0);
    await studentDialog.getByTestId("report-nav-subjects").click();
    await expect(page.getByTestId("report-hub-detail")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("report-hub-detail").getByText("מתמטיקה")).toBeVisible();
    await page.getByTestId("report-hub-detail").getByTestId("report-modal-back").click();
    await studentDialog.getByTestId("report-modal-close").click();

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

    const browseRes = await page.request.get("/api/school/students/browse-summary", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(browseRes.status()).toBe(200);
    const browse = (await browseRes.json())?.data?.summary;
    expect(browse?.totalStudents).toBe(398);

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
    expect(classReportBody?.schoolManagerExtras?.recentClassroomActivities).toBeDefined();

    const danGeoClass = classes.find(
      (c: { name?: string; subjectFocus?: string; teacherName?: string }) =>
        c.name === "כיתה א׳ 2" &&
        c.subjectFocus === "geometry" &&
        String(c.teacherName || "").includes("דן")
    );
    expect(danGeoClass, "Dan Cohen geometry class א׳ 2").toBeTruthy();
    expect(danGeoClass?.memberCount).toBe(22);
    expect(danGeoClass?.activityCount).toBe(8);

    const danGeoReport = await page.request.get(
      `/api/school/classes/${danGeoClass?.classId}/report-data`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(danGeoReport.status()).toBe(200);
    const danGeoBody = await danGeoReport.json();
    expect(danGeoBody?.roster?.studentCount).toBe(22);
    expect(danGeoBody?.schoolManagerExtras?.classroomActivityCount).toBe(8);
    expect(danGeoBody?.cohortSummary?.studentsWithActivity).toBeGreaterThan(0);
    expect(danGeoBody?.cohortSummary?.totalAnswers).toBeGreaterThan(0);
    expect(danGeoBody?.cohortSummary?.accuracy).toBeGreaterThan(0);

    const sampleStudentFromClass = danGeoBody?.students?.[0];
    expect(sampleStudentFromClass?.studentId, "class report student row").toBeTruthy();
    const nestedStudentReport = await page.request.get(
      `/api/school/students/${sampleStudentFromClass.studentId}/report-data?classId=${danGeoClass?.classId}&windowDays=30`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(nestedStudentReport.status()).toBe(200);
    const nestedStudentBody = await nestedStudentReport.json();
    expect(String(nestedStudentBody?.student?.full_name || "").trim().length).toBeGreaterThan(0);
    expect(nestedStudentBody?.summary?.totalAnswers).toBeGreaterThan(0);
    expect(nestedStudentBody?.summary?.accuracy).toBeGreaterThan(0);

    expect(danTeacher?.teacherId).toBeTruthy();
    const danDetail = await page.request.get(`/api/school/teachers/${danTeacher?.teacherId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(danDetail.status()).toBe(200);
    const danDetailBody = await danDetail.json();
    expect(danDetailBody?.data?.teacher?.activeStudentLinkCount).toBeGreaterThan(0);

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

  test("T12 teacher dashboard groups physical classes", async ({ request, page }) => {
    for (const tc of TEACHER_DASHBOARD_PHYSICAL) {
      const token = await supabasePasswordToken(tc.email, SCHOOL_PASSWORD);
      expect(token, `${tc.label} login`).toBeTruthy();

      const dashRes = await request.get("/api/teacher/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(dashRes.status(), `${tc.label} dashboard`).toBe(200);
      const classes = (await dashRes.json())?.data?.classes || [];
      expect(classes.length, `${tc.label} physical class cards`).toBe(tc.physicalClasses);

      const sample = classes[0];
      expect(sample?.studentCount, `${tc.label} student count`).toBeGreaterThanOrEqual(
        tc.minStudents
      );
      expect(sample?.studentCount, `${tc.label} student count`).toBeLessThanOrEqual(
        tc.maxStudents
      );
      for (const subj of tc.subjects) {
        expect(sample?.subjectsLabel || "", `${tc.label} subjects`).toContain(subj);
      }
      expect(sample?.subjectsLabel || "").not.toMatch(/\bmath\b/i);
    }

    await page.context().clearCookies();
    await page.goto("/teacher/login", { waitUntil: "domcontentloaded" });
    await teacherLogin(page, "dan@leo-k.com", SCHOOL_PASSWORD);
    await page.waitForURL(/\/teacher\/dashboard/u, { timeout: 45_000 });
    await assertNo404(page);

    const cards = page.locator('[data-testid^="teacher-physical-class-card-"]');
    await expect(cards).toHaveCount(6, { timeout: 20_000 });
    await expect(cards.first()).toContainText("מקצועות:");
    await expect(cards.first()).toContainText("מתמטיקה");

    await expect(
      page.getByTestId("teacher-dashboard-summary-students").locator(".font-bold")
    ).not.toHaveText("0", { timeout: 10_000 });
    const summaryCount = Number(
      (await page
        .getByTestId("teacher-dashboard-summary-students")
        .locator(".font-bold")
        .textContent()) || "0"
    );
    expect(summaryCount, "Dan dashboard summary students").toBeGreaterThanOrEqual(20);

    for (let i = 0; i < 6; i += 1) {
      const card = cards.nth(i);
      await expect(card).toContainText(/ילדים:\s*(2[0-4]|[1-9]\d)/u);
    }

    await expect(page.getByText("ילדים: 0")).toHaveCount(0);

    await cards.first().getByRole("button", { name: "דוח כיתה" }).click();
    await expect(page.getByTestId("report-hub-main")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("report-hub-summary-ready")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("report-hub-main").getByText("טוען דוח…")).toHaveCount(0);
    await expect(page.locator('[data-testid^="teacher-report-subject-tab-"]').first()).toBeVisible({
      timeout: 10_000,
    });
    const mainReport = page.getByTestId("report-hub-main");
    await expect(mainReport.getByTestId("report-nav-activities")).toBeVisible();
    await mainReport.getByTestId("report-nav-activities").click();
    await expect(page.getByTestId("report-hub-detail")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/\bgeometry\b/i)).toHaveCount(0);
    await page.getByTestId("report-hub-detail").getByTestId("report-modal-back").click();
    await mainReport.getByTestId("report-modal-close").click();

    await cards.first().getByRole("button", { name: "הצגת ילדי הכיתה" }).click();
    await expect(page.getByTestId("teacher-roster-active-label")).toContainText("כיתה", {
      timeout: 10_000,
    });
    await expect(page.getByTestId("teacher-roster-empty")).toHaveCount(0);
    await expect(page.locator('[data-testid^="teacher-roster-tab-"]').first()).toBeVisible({
      timeout: 10_000,
    });
    const tabTexts = await page.locator('[data-testid^="teacher-roster-tab-"]').allTextContents();
    expect(
      tabTexts.some((t) => /\(\s*[1-9]\d*\s*\)/u.test(String(t || ""))),
      "roster filter chips should show non-zero counts"
    ).toBeTruthy();
    expect(tabTexts.every((t) => /\(\s*0\s*\)/u.test(String(t || "")))).toBe(false);

    await page.screenshot({
      path: "docs/school-portal/ux-evidence/report-hub/teacher-dashboard-grouped-dan-desktop.png",
      fullPage: true,
    });
    await page.screenshot({
      path: "docs/school-portal/ux-evidence/teacher-dashboard-grouped-dan.png",
      fullPage: true,
    });

    const danToken = await supabasePasswordToken("dan@leo-k.com", SCHOOL_PASSWORD);
    expect(danToken).toBeTruthy();
    const schoolClasses = await page.request.get("/api/school/classes", {
      headers: { Authorization: `Bearer ${danToken}` },
    });
    expect(schoolClasses.status()).toBe(403);
    const schoolDash = await page.request.get("/api/school/dashboard", {
      headers: { Authorization: `Bearer ${danToken}` },
    });
    expect(schoolDash.status()).toBe(403);
  });
});
