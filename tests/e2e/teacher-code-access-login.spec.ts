import { test, expect, type Page, type Response } from "@playwright/test";
import path from "node:path";

const PARENT_USER = "leo-p01";
const PARENT_PIN = "1234";
const STUDENT_USER = "leo-s01";
const STUDENT_PIN = "1234";
const OLD_PARENT_USER = "leo-01";
const OLD_STUDENT_USER = "simg3-01";

const REPORT_LOAD_ERROR = /לא ניתן לטעון את הדוח כרגע/u;
const NOT_FOUND_RE = /404|This page could not be found|הדף לא נמצא/u;

type ApiLog = { url: string; status: number; count: number };

function trackApi(page: Page, pattern: RegExp) {
  const hits: ApiLog[] = [];
  const map = new Map<string, number>();

  page.on("response", (res: Response) => {
    const url = res.url();
    if (!pattern.test(url)) return;
    const key = `${res.request().method()} ${url.split("?")[0]} -> ${res.status()}`;
    map.set(key, (map.get(key) || 0) + 1);
  });

  return {
    snapshot(): ApiLog[] {
      hits.length = 0;
      for (const [url, count] of map.entries()) {
        const status = Number(url.split("-> ").pop() || 0);
        hits.push({ url, status, count });
      }
      return hits.sort((a, b) => a.url.localeCompare(b.url));
    },
    reset() {
      map.clear();
    },
  };
}

async function openParentTeacherCodeForm(page: Page) {
  await page.goto("/parent/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "קיבלתי קוד מהמורה" }).click();
  await expect(page.getByRole("button", { name: "כניסה לדוח הילד" })).toBeVisible();
}

async function submitParentTeacherCode(page: Page, username: string, pin: string) {
  await page.getByPlaceholder("שם המשתמש שקיבלתם מהמורה").fill(username);
  await page.getByPlaceholder("הקוד שקיבלתם מהמורה").fill(pin);
  await page.getByRole("button", { name: "כניסה לדוח הילד" }).click();
}

async function openStudentTeacherCodeForm(page: Page) {
  await page.goto("/student/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("בודקים חיבור...")).toHaveCount(0, { timeout: 30_000 });
  await page.getByRole("button", { name: "קיבלתי קוד מהמורה" }).click();
  await expect(page.getByRole("button", { name: "כניסה ללמידה" })).toBeVisible();
}

async function submitStudentTeacherCode(page: Page, username: string, pin: string) {
  await page.getByPlaceholder("שם המשתמש שקיבלתם מהמורה").fill(username);
  await page.getByPlaceholder("הקוד שקיבלתם מהמורה").fill(pin);
  await page.getByRole("button", { name: "כניסה ללמידה" }).click();
}

async function assertNo404(page: Page) {
  await expect(page.getByText(NOT_FOUND_RE)).toHaveCount(0);
  expect(page.url()).not.toMatch(/\/404/u);
}

test.describe("teacher code access — full browser flows @teacher-code-access", () => {
  test.describe.configure({ mode: "serial" });

  test("1. parent code login → child report renders (desktop)", async ({ page }, testInfo) => {
    const api = trackApi(page, /\/api\/(guardian|parent)/);
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(String(e)));

    await openParentTeacherCodeForm(page);
    await submitParentTeacherCode(page, PARENT_USER, PARENT_PIN);

    await page.waitForURL(/\/parent\/child-report\/?(\?.*)?$/, { timeout: 45_000 });
    await assertNo404(page);

    const reportRoot = page.locator('[data-testid="parent-teacher-code-report-root"][data-report-ok="1"]');
    await expect(reportRoot).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(REPORT_LOAD_ERROR)).toHaveCount(0);
    await expect(page.getByText(/סיכום פעילות/u)).toBeVisible();
    await expect(page.getByText(/אתם צופים בדוח מוגבל/u)).toBeVisible();

    const logs = api.snapshot();
    const me = logs.find((l) => l.url.includes("/api/guardian/me"));
    expect(me?.status, `guardian/me: ${JSON.stringify(logs)}`).toBe(200);
    expect(logs.filter((l) => l.url.includes("report-data")).every((l) => l.status === 200)).toBeTruthy();
    expect(logs.every((l) => l.count <= 3), `request loop? ${JSON.stringify(logs)}`).toBeTruthy();
    expect(pageErrors).toEqual([]);

    await page.screenshot({
      path: path.join(testInfo.outputDir, "parent-child-report-desktop.png"),
      fullPage: true,
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(reportRoot).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(REPORT_LOAD_ERROR)).toHaveCount(0);
    await assertNo404(page);
  });

  test("2. parent invalid old credentials leo-01", async ({ page }) => {
    await openParentTeacherCodeForm(page);
    await submitParentTeacherCode(page, OLD_PARENT_USER, PARENT_PIN);

    await expect(page).toHaveURL(/\/parent\/login/);
    await expect(page.getByText(/שם המשתמש או הקוד שגויים|פגה|בוטלה/u)).toBeVisible();
    await assertNo404(page);
  });

  test("3. student code login → student home renders (desktop)", async ({ page }, testInfo) => {
    const api = trackApi(page, /\/api\/student/);
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(String(e)));

    await openStudentTeacherCodeForm(page);
    await submitStudentTeacherCode(page, STUDENT_USER, STUDENT_PIN);

    await page.waitForURL(/\/student\/home\/?(\?.*)?$/, { timeout: 45_000 });
    await assertNo404(page);

    await expect(page.getByRole("heading", { name: /שלום/u })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("link", { name: "התחל ללמוד" })).toBeVisible();
    await expect(page.getByText(/טוען את דף הבית/u)).toHaveCount(0);
    await expect(page.getByText(/מעבירים לכניסה/u)).toHaveCount(0);

    const logs = api.snapshot();
    const loginHit = logs.find((l) => l.url.includes("/api/student/login"));
    const meHit = logs.find((l) => l.url.includes("/api/student/me"));
    expect(loginHit?.status, `student login: ${JSON.stringify(logs)}`).toBe(200);
    expect(meHit?.status, `student me: ${JSON.stringify(logs)}`).toBe(200);
    expect(logs.every((l) => l.count <= 4), `request loop? ${JSON.stringify(logs)}`).toBeTruthy();
    expect(pageErrors).toEqual([]);

    await page.screenshot({
      path: path.join(testInfo.outputDir, "student-home-desktop.png"),
      fullPage: true,
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /שלום/u })).toBeVisible({ timeout: 60_000 });
    await assertNo404(page);
  });

  test("4. student invalid old credentials simg3-01", async ({ page }) => {
    await openStudentTeacherCodeForm(page);
    await submitStudentTeacherCode(page, OLD_STUDENT_USER, STUDENT_PIN);

    await expect(page).toHaveURL(/\/student\/login/);
    await expect(page.getByText(/שם המשתמש או הקוד שגויים|שגויים/u)).toBeVisible();
    await assertNo404(page);
  });

  test("5a. mobile viewport — parent code login → child report", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openParentTeacherCodeForm(page);
    await submitParentTeacherCode(page, PARENT_USER, PARENT_PIN);

    await page.waitForURL(/\/parent\/child-report/, { timeout: 45_000 });
    await assertNo404(page);
    await expect(
      page.locator('[data-testid="parent-teacher-code-report-root"][data-report-ok="1"]')
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(REPORT_LOAD_ERROR)).toHaveCount(0);

    await page.screenshot({
      path: path.join(testInfo.outputDir, "parent-child-report-mobile.png"),
      fullPage: true,
    });
  });

  test("5b. mobile viewport — student code login → student home", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openStudentTeacherCodeForm(page);
    await submitStudentTeacherCode(page, STUDENT_USER, STUDENT_PIN);

    await page.waitForURL(/\/student\/home/, { timeout: 45_000 });
    await assertNo404(page);
    await expect(page.getByRole("heading", { name: /שלום/u })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/טוען את דף הבית/u)).toHaveCount(0);

    await page.screenshot({
      path: path.join(testInfo.outputDir, "student-home-mobile.png"),
      fullPage: true,
    });
  });
});
