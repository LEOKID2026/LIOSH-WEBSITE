import { test, expect } from "@playwright/test";
import { buildParentReportApiBodyE2e } from "../fixtures/parent-report-api-body-e2e.mjs";

const STUDENT_ID = "74c30e48-895b-4f4c-a65a-888f656f54f6";
const LOAD_ERROR_RE = /שגיאת רשת בטעינת הדוח|שגיאה בעת טעינת הדוח/u;

test.describe("parent report UI load - MOCK_UI_PASS @mock-ui-pass @parent-report-ui", () => {
  test.beforeEach(async ({ page }) => {
    const apiBody = buildParentReportApiBodyE2e();

    await page.route(`**/api/parent/students/${STUDENT_ID}/report-data**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(apiBody),
      });
    });

    await page.addInitScript(() => {
      const w = window as Window & { __parentReportPlaywrightE2eSession?: boolean };
      w.__parentReportPlaywrightE2eSession = true;
    });
  });

  test("parent source URL loads without report failure screen (desktop)", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(String(e)));

    await page.goto(
      `/learning/parent-report?studentId=${STUDENT_ID}&source=parent`,
      { waitUntil: "networkidle" }
    );

    await expect(page.getByText(LOAD_ERROR_RE)).toHaveCount(0);
    await expect(page.getByText(/נדרשת התחברות כהורה/u)).toHaveCount(0);
    await expect(page.getByRole("link", { name: /כניסת הורה/u })).toHaveCount(0);

    await expect(page.getByRole("heading", { name: /דוח להורים/u })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/טוען דוח/u)).toHaveCount(0);

    const table = page.locator("table.parent-report-subject-table").first();
    const hasTable = await table.isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/אין עדיין מספיק פעילות/u).isVisible().catch(() => false);
    expect(hasTable || hasEmptyState, "report shell renders (data table or empty-state, not error)").toBeTruthy();

    expect(pageErrors, `page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  });

  test("parent source URL loads on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 428, height: 810 });
    await page.goto(
      `/learning/parent-report?studentId=${STUDENT_ID}&source=parent`,
      { waitUntil: "networkidle" }
    );

    await expect(page.getByText(LOAD_ERROR_RE)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /דוח להורים/u })).toBeVisible({ timeout: 60_000 });
  });
});
