import { test, expect } from "@playwright/test";

test.describe("Phase D.2B — parent policy acceptance", () => {
  test("A: wrong credentials show Hebrew error, not English", async ({ page }) => {
    await page.goto("/parent/login");
    await page.getByPlaceholder("אימייל הורה").fill("wrong-parent@example.com");
    await page.getByPlaceholder("סיסמה").fill("wrong-password-123");
    await page.locator("form").getByRole("button", { name: "כניסה" }).click();

    const alert = page.locator('[role="alert"]');
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await expect(alert).toContainText("פרטי ההתחברות שגויים");
    await expect(alert).not.toContainText(/Invalid login credentials/i);
  });

  test("D: signup no longer requires policy checkbox", async ({ page }) => {
    await page.goto("/parent/login");
    await page.getByRole("button", { name: "הרשמה" }).click();

    await expect(page.getByPlaceholder("אימייל הורה")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("parent-policy-acceptance-checkbox")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "יצירת חשבון הורה" })).toBeEnabled();
    await expect(page.getByText("בהמשך השימוש ב־Leo Kids")).toBeVisible();
  });

  test("E: Google sign-in button appears on parent login only", async ({ page }) => {
    await page.goto("/parent/login");
    await expect(page.getByTestId("parent-google-sign-in")).toBeVisible();
    await expect(page.getByTestId("parent-google-sign-in")).toContainText("התחברות עם Google");

    await page.goto("/student/login");
    await expect(page.getByTestId("parent-google-sign-in")).toHaveCount(0);

    await page.goto("/teacher/login");
    await expect(page.getByTestId("parent-google-sign-in")).toHaveCount(0);
  });
});

test.describe("Phase D.2B — parent policy acceptance (authenticated)", () => {
  const email = process.env.E2E_PARENT_POLICY_EMAIL || process.env.E2E_PARENT_EMAIL || "";
  const password = process.env.E2E_PARENT_POLICY_PASSWORD || process.env.E2E_PARENT_PASSWORD || "";

  test.skip(!email || !password, "Set E2E_PARENT_EMAIL + E2E_PARENT_PASSWORD for authenticated flows");

  test("B: parent dashboard opens without policy gate", async ({ page }) => {
    await page.goto("/parent/login");
    await page.getByPlaceholder("אימייל הורה").fill(email);
    await page.getByPlaceholder("סיסמה").fill(password);
    await page.locator("form").getByRole("button", { name: "כניסה" }).click();

    await page.waitForURL("**/parent/**", { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "דשבורד הורים" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('[data-policy-acceptance-root]')).toHaveCount(0);
  });
});
