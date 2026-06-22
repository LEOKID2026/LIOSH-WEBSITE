import { test, expect } from "@playwright/test";

const POLICY_PANEL = "[data-policy-acceptance-root]";
const APPROVE_BTN = 'button:has-text("אישור והמשך")';

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

  test("D: signup shows compact checkbox gate on the same form", async ({ page }) => {
    await page.goto("/parent/login");
    await page.getByRole("button", { name: "הרשמה" }).click();

    await expect(page.getByPlaceholder("אימייל הורה")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(POLICY_PANEL)).toBeVisible();
    await expect(page.locator(`${POLICY_PANEL} input[type="checkbox"]`)).not.toBeChecked();
    await expect(page.getByRole("button", { name: "יצירת חשבון הורה" })).toBeDisabled();

    await page.locator(`${POLICY_PANEL} input[type="checkbox"]`).check();
    await expect(page.getByRole("button", { name: "יצירת חשבון הורה" })).toBeEnabled();
  });
});

test.describe("Phase D.2B — parent policy acceptance (authenticated)", () => {
  const email = process.env.E2E_PARENT_POLICY_EMAIL || process.env.E2E_PARENT_EMAIL || "";
  const password = process.env.E2E_PARENT_POLICY_PASSWORD || process.env.E2E_PARENT_PASSWORD || "";

  test.skip(!email || !password, "Set E2E_PARENT_EMAIL + E2E_PARENT_PASSWORD for authenticated flows");

  test("B: unaccepted parent sees compact policy gate on dashboard, not teaser", async ({ page }) => {
    await page.goto("/parent/login");
    await page.getByPlaceholder("אימייל הורה").fill(email);
    await page.getByPlaceholder("סיסמה").fill(password);
    await page.locator("form").getByRole("button", { name: "כניסה" }).click();

    await page.waitForURL("**/parent/dashboard", { timeout: 20_000 });
    await expect(page.locator(POLICY_PANEL)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "דשבורד הורים" })).toHaveCount(0);
    await expect(page.locator(APPROVE_BTN)).toBeDisabled();
  });

  test("B cont: checkbox enables approve and unlocks dashboard", async ({ page }) => {
    await page.goto("/parent/login");
    await page.getByPlaceholder("אימייל הורה").fill(email);
    await page.getByPlaceholder("סיסמה").fill(password);
    await page.locator("form").getByRole("button", { name: "כניסה" }).click();
    await page.waitForURL("**/parent/dashboard", { timeout: 20_000 });
    await expect(page.locator(POLICY_PANEL)).toBeVisible({ timeout: 15_000 });

    await expect(page.locator(POLICY_PANEL)).toHaveAttribute("data-policy-scroll-mode", "compact");
    await page.locator(`${POLICY_PANEL} input[type="checkbox"]`).check();
    await expect(page.locator(APPROVE_BTN)).toBeEnabled();
    await page.locator(APPROVE_BTN).click();

    await expect(page.getByRole("heading", { name: "דשבורד הורים" })).toBeVisible({
      timeout: 15_000,
    });
    await page.reload();
    await expect(page.locator(POLICY_PANEL)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "דשבורד הורים" })).toBeVisible({
      timeout: 15_000,
    });
  });
});
