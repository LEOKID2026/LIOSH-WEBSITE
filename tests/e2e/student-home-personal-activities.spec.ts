import { expect, test } from "@playwright/test";

const STUDENT_USERNAME = process.env.E2E_ERAN_USERNAME || "eran";
const STUDENT_PIN = process.env.E2E_ERAN_PIN || "7479";

async function loginStudent(page: import("@playwright/test").Page) {
  await page.goto("/student/login", { waitUntil: "domcontentloaded" });
  await page.getByTestId("student-login-username").fill(STUDENT_USERNAME);
  await page.getByTestId("student-login-pin").fill(STUDENT_PIN);
  const activitiesResPromise = page.waitForResponse(
    (res) => res.url().includes("/api/student/activities") && res.request().method() === "GET",
    { timeout: 90_000 }
  );
  await page.getByTestId("student-login-submit").click();
  await page.waitForURL(/\/student\/home/, { timeout: 60_000 });
  const activitiesRes = await activitiesResPromise;
  expect(activitiesRes.status()).toBe(200);
  const activitiesJson = await activitiesRes.json();
  expect(activitiesJson?.ok).toBe(true);
  expect(Array.isArray(activitiesJson?.activities)).toBe(true);
  return activitiesJson;
}

test.describe("student home personal activities", () => {
  test("tile and modal show parent-assigned activities for eran", async ({ page }) => {
    const activitiesJson = await loginStudent(page);

    const parentCount = (activitiesJson.activities as { scope?: string }[]).filter(
      (a) => a.scope === "parent" || a.scope === "student"
    ).length;
    test.skip(parentCount < 1, "no personal activities in API for this student");

    const tile = page.getByRole("button", { name: /פעילויות אישיות/ });
    await expect(tile).toBeVisible({ timeout: 60_000 });
    await expect(tile).toContainText(String(parentCount));

    await tile.click();
    await expect(page.getByTestId("student-parent-activities")).toBeVisible({
      timeout: 30_000,
    });
    const cards = page.getByTestId("student-parent-activities").locator("h3");
    await expect(cards).toHaveCount(parentCount);
  });
});
