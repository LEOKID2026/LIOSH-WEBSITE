import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const TEACHER_EMAIL = process.env.TEACHER_PORTAL_VERIFY_EMAIL || "teacher@leo.com";
const TEACHER_PASSWORD = process.env.TEACHER_PORTAL_VERIFY_PASSWORD || "747975";

async function teacherToken(request: APIRequestContext): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const res = await request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email: TEACHER_EMAIL, password: TEACHER_PASSWORD },
  });
  if (!res.ok()) return null;
  const json = await res.json();
  return json.access_token || null;
}

async function teacherLoginViaUi(page: Page) {
  await page.goto("/teacher/login", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-testid="teacher-login-root"]')).toBeVisible({
    timeout: 30_000,
  });
  await page.getByPlaceholder("המייל שלך").fill(TEACHER_EMAIL);
  await page.locator('input[type="password"]').fill(TEACHER_PASSWORD);
  await page.getByRole("button", { name: "כניסה" }).click();
  await page.waitForURL(/\/teacher\/dashboard\/?(\?.*)?$/, { timeout: 45_000 });
}

test.describe("teacher activity draft - browser UI auth @teacher-activity-draft-ui", () => {
  test("[T-ACT-UI-01] login → preview → save draft sends valid bearer token", async ({
    page,
    request,
  }) => {
    const setupToken = await teacherToken(request);
    test.skip(!setupToken, "Supabase teacher credentials unavailable");

    const classesRes = await request.get("/api/teacher/classes", {
      headers: { Authorization: `Bearer ${setupToken}` },
    });
    test.skip(!classesRes.ok(), "Teacher classes API unavailable");
    const classesBody = await classesRes.json();
    const classId = classesBody?.data?.classes?.[0]?.classId;
    test.skip(!classId, "No teacher class for UI draft test");

    let createAuthHeader = "";
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().includes("/api/teacher/activities")) {
        createAuthHeader = req.headers().authorization || "";
      }
    });

    await teacherLoginViaUi(page);

    await page.goto(`/teacher/class/${encodeURIComponent(classId)}/activities/new`, {
      waitUntil: "domcontentloaded",
    });

    const title = `UI E2E draft ${Date.now()}`;
    await page.locator("label").filter({ hasText: "כותרת" }).locator("input").fill(title);

    await page.getByRole("button", { name: "תצוגה מקדימה של שאלות" }).click();
    await expect(page.getByRole("heading", { name: /תצוגה מקדימה/u })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("button", { name: "שמירה כטיוטה" }).click();

    await expect(page.getByText("Invalid session")).toHaveCount(0);
    await page.waitForURL(
      new RegExp(`/teacher/class/${classId}/activities/[^/]+/monitor`),
      { timeout: 45_000 }
    );

    expect(createAuthHeader).toMatch(/^Bearer eyJ/u);
    expect(createAuthHeader).not.toContain("[object Object]");
  });
});
