import { test, expect } from "@playwright/test";

const MAQAF = "\u05BE";

const PUBLIC_ROUTES = [
  { name: "home", path: "/" },
  { name: "parent-login", path: "/parent/login" },
  { name: "student-login", path: "/student/login" },
  { name: "math-master", path: "/learning/math-master" },
  { name: "hebrew-master", path: "/learning/hebrew-master" },
  { name: "english-master", path: "/learning/english-master" },
  { name: "science-master", path: "/learning/science-master" },
  { name: "geometry-master", path: "/learning/geometry-master" },
  { name: "math-book-g1", path: "/learning/book/math/g1" },
  { name: "hebrew-book-g1", path: "/learning/book/hebrew/g1" },
  { name: "offline", path: "/offline" },
];

async function assertNoMaqaf(page: import("@playwright/test").Page, routeName: string) {
  const text = await page.locator("body").innerText();
  expect(text, `${routeName} should not contain Hebrew maqaf U+05BE`).not.toContain(MAQAF);
}

test.describe("Hebrew maqaf sanity - desktop", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.name} has no visible maqaf`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(1500);
      await assertNoMaqaf(page, route.name);
    });
  }

  test("homepage welcome copy", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("home-hero")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /כלים להורים\. חוויה לילדים\./ })
    ).toBeVisible();
    await expect(page.getByText(/מערכת ממוחשבת שממפה את ההתקדמות/)).toBeVisible();
    await expect(page.getByTestId("home-flow-diagram")).toBeVisible();
    await expect(page.getByTestId("home-hero-system-teaser")).toBeVisible();
    await expect(page.getByTestId("home-parent-video")).toBeVisible();
    await expect(page.getByTestId("home-primary-actions")).toBeVisible();
    await expect(page.getByTestId("home-learning-system")).toBeVisible();
    await expect(page.getByText(/ל-LEO KIDS/)).toHaveCount(0);
  });
  test("math book page sample", async ({ page }) => {
    await page.goto("/learning/book/math/g1/add_two");
    await page.waitForTimeout(2500);
    await assertNoMaqaf(page, "math-book-page");
  });
});

test.describe("Hebrew maqaf sanity - mobile viewport", () => {
  test("homepage mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByTestId("home-hero")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /למידה שמתקדמת צעד אחר צעד/ })
    ).toBeVisible();
    await assertNoMaqaf(page, "home-mobile");
  });

  test("math master mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/learning/math-master");
    await page.waitForTimeout(2000);
    await assertNoMaqaf(page, "math-master-mobile");
  });
});

test.describe("Hebrew maqaf sanity - authenticated student", () => {
  const username = process.env.E2E_STUDENT_USERNAME || "";
  const pin = process.env.E2E_STUDENT_PIN || "";
  test.skip(!username || !pin, "Set E2E_STUDENT_USERNAME + E2E_STUDENT_PIN");

  test("student home and arcade", async ({ page }) => {
    await page.goto("/student/login");
    await page.getByPlaceholder("שם משתמש").fill(username);
    await page.getByPlaceholder("קוד כניסה").fill(pin);
    await page.locator("form").getByRole("button", { name: "כניסה" }).click();
    await page.waitForURL("**/student/home", { timeout: 30_000 });
    await assertNoMaqaf(page, "student-home");

    await page.goto("/student/arcade");
    await page.waitForTimeout(1500);
    await assertNoMaqaf(page, "student-arcade");
  });
});

test.describe("Hebrew maqaf sanity - authenticated parent", () => {
  const email = process.env.E2E_PARENT_EMAIL || "";
  const password = process.env.E2E_PARENT_PASSWORD || "";
  test.skip(!email || !password, "Set E2E_PARENT_EMAIL + E2E_PARENT_PASSWORD");

  test("parent dashboard and modals", async ({ page }) => {
    await page.goto("/parent/login");
    await page.getByPlaceholder("הקלידו אימייל או שם משתמש שקיבלתם מהמורה").fill(email);
    await page.getByPlaceholder("הקלידו סיסמה או קוד כניסה").fill(password);
    await page.locator("form").getByRole("button", { name: "כניסה" }).click();
    await page.waitForURL("**/parent/dashboard", { timeout: 30_000 });

    const policyApprove = page.getByRole("button", { name: "אישור והמשך" });
    if (await policyApprove.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await page.getByRole("checkbox").check({ force: true });
      await policyApprove.click();
    }

    await expect(page.getByRole("heading", { name: "דשבורד הורים" })).toBeVisible({ timeout: 20_000 });
    await assertNoMaqaf(page, "parent-dashboard");

    await page.getByRole("button", { name: "הוספת ילד" }).click();
    await assertNoMaqaf(page, "add-child-modal");
    await page.getByLabel("סגור").click();

    const detailsBtn = page.getByRole("button", { name: "פרטים" }).first();
    if ((await detailsBtn.count()) > 0) {
      await detailsBtn.click();
      await assertNoMaqaf(page, "child-details-modal");
    }
  });
});
