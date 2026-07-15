import { test, expect, devices } from "@playwright/test";

const email = process.env.E2E_PARENT_EMAIL || "";
const password = process.env.E2E_PARENT_PASSWORD || "";

test.use({
  ...devices["iPhone 13"],
});

test.describe("Parent dashboard modals - mobile input stability", () => {
  test.skip(!email || !password, "Set E2E_PARENT_EMAIL + E2E_PARENT_PASSWORD");

  async function loginParent(page: import("@playwright/test").Page) {
    await page.goto("/parent/login");
    await page.getByPlaceholder("הקלידו אימייל או שם משתמש שקיבלתם מהמורה").fill(email);
    await page.getByPlaceholder("הקלידו סיסמה או קוד כניסה").fill(password);
    await page.locator("form").getByRole("button", { name: "כניסה" }).click();
    await page.waitForURL("**/parent/dashboard", { timeout: 20_000 });
    const policyApprove = page.getByRole("button", { name: "אישור והמשך" });
    if (await policyApprove.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await page.getByRole("checkbox").check({ force: true });
      await policyApprove.click();
      await expect(page.getByRole("heading", { name: "דשבורד הורים" })).toBeVisible({
        timeout: 15_000,
      });
    }
  }

  test("add-child modal keeps focus while typing name", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginParent(page);
    await page.getByRole("button", { name: "הוספת ילד" }).click();
    const nameInput = page.getByPlaceholder("שם הילד");
    await expect(nameInput).toBeVisible();
    await nameInput.click();
    await nameInput.fill("בדיקת מובייל");

    await expect(nameInput).toBeFocused();
    await expect(nameInput).toHaveValue("בדיקת מובייל");
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("details modal keeps focus while typing PIN", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginParent(page);
    const detailsBtn = page.getByRole("button", { name: "פרטים" }).first();
    if ((await detailsBtn.count()) === 0) return;

    await detailsBtn.click();
    const pinInput = page.getByPlaceholder("4 ספרות").first();
    await expect(pinInput).toBeVisible({ timeout: 10_000 });
    await pinInput.click();
    await pinInput.pressSequentially("1234", { delay: 80 });

    await expect(pinInput).toBeFocused();
    await expect(pinInput).toHaveValue("1234");
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(errors).toEqual([]);
  });
});
