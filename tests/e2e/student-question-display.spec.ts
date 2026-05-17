import { mkdir } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import {
  splitStudentQuestionForDisplay,
  formatFormulaSpacing,
} from "../../utils/student-question-display.js";

const QA_USER = "e2e-display-qa";
const MOBILE_VIEW = { width: 390, height: 844 };
const SCREENSHOT_DIR = "reports/question-audit/screenshots";

async function mockStudentSession(page: Page) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: {
          id: "00000000-0000-0000-0000-000000000e2d",
          full_name: QA_USER,
          grade_level: 3,
          is_active: true,
          coin_balance: 0,
        },
      }),
    });
  });
}

async function pickMathOperation(page: Page, preferred: string) {
  const sel = page.getByTestId("math-operation-select");
  const values = await sel.evaluate((el: HTMLSelectElement) =>
    [...el.options].map((o) => o.value).filter((v) => v && v !== "mixed")
  );
  const pick = values.includes(preferred)
    ? preferred
    : values.find((v) => /equation|order_of_operations/i.test(v)) || values[0];
  if (pick) await sel.selectOption(pick);
}

async function confirmMixedModal(page: Page) {
  const save = page.getByRole("button", { name: "שמור", exact: true });
  if (await save.isVisible()) {
    const allBtn = page.getByRole("button", { name: "הכל", exact: true });
    if (await allBtn.isVisible()) await allBtn.click();
    await save.click();
  }
}

test.describe("Student question display — layout (mobile)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEW);
    await mockStudentSession(page);
  });

  test("unit: splits instruction from equation", () => {
    const split = splitStudentQuestionForDisplay(
      "מצאו את הנעלם: ___ = 8 × (4 - 19)"
    );
    expect(split.leadText).toBe("מצאו את הנעלם:");
    expect(split.bodyText).toContain("8 × (4 - 19)");
    expect(split.bodyKind).toBe("equation");
    expect(split.bodyText).not.toMatch(/מצאו/);
  });

  test("unit: formats geometry formula spacing", () => {
    expect(formatFormulaSpacing("שטח = חצי×בסיס×גובה")).toBe(
      "שטח = חצי × בסיס × גובה"
    );
  });

  test("math: equation stem split in DOM", async ({ page }) => {
    await page.goto("/learning/math-master");
    await page.locator("select").first().selectOption("6");
    await page.locator("select").nth(1).selectOption("easy");
    await pickMathOperation(page, "equations");
    await expect(page.getByTestId("math-player-name")).toContainText(QA_USER);
    await confirmMixedModal(page);
    await page.getByTestId("math-start-game").click();

    const surface = page.getByTestId("math-question-surface");
    await expect(surface).toBeVisible({ timeout: 60_000 });

    const lead = surface.getByTestId("student-question-lead");
    const body = surface.getByTestId("student-question-body");
    await expect(lead).toBeVisible();
    await expect(body).toBeVisible();
    await expect(lead).toContainText("מצאו");
    const bodyText = await body.innerText();
    expect(bodyText).toMatch(/=|×|\+|−|-|\(/);
    expect(bodyText).not.toMatch(/מצאו את הנעלם/);
    await expect(body).toHaveAttribute("dir", "ltr");
  });

  test("geometry: formula readable in DOM", async ({ page }) => {
    await page.goto("/learning/geometry-master");
    await page.locator("select").first().selectOption("g3");
    await page.locator("select").nth(1).selectOption("easy");
    const topicSel = page.getByTestId("geometry-topic-select");
    const vals = await topicSel.evaluate((el: HTMLSelectElement) =>
      [...el.options].map((o) => o.value).filter((v) => v && v !== "mixed")
    );
    const areaVal = vals.find((v) => v === "area") || vals[0];
    if (areaVal) await topicSel.selectOption(areaVal);
    await expect(page.getByTestId("geometry-player-name")).toContainText(QA_USER);
    await confirmMixedModal(page);
    await page.getByTestId("geometry-start-game").click();

    const stem = page.getByTestId("geometry-question-stem");
    await expect(stem).toBeVisible({ timeout: 60_000 });
    const full = await stem.innerText();
    if (/שטח\s*=/.test(full)) {
      expect(full).not.toMatch(/חציבסיסגובה/);
      expect(full).toMatch(/×/);
    }
  });

  test("screenshots: math and geometry display (mobile)", async ({ page }) => {
    await mkdir(SCREENSHOT_DIR, { recursive: true });

    await page.goto("/learning/math-master");
    await page.locator("select").first().selectOption("6");
    await page.locator("select").nth(1).selectOption("easy");
    await pickMathOperation(page, "equations");
    await expect(page.getByTestId("math-player-name")).toContainText(QA_USER);
    await confirmMixedModal(page);
    await page.getByTestId("math-start-game").click();
    const mathSurface = page.getByTestId("math-question-surface");
    await expect(mathSurface).toBeVisible({ timeout: 60_000 });
    await mathSurface.screenshot({
      path: `${SCREENSHOT_DIR}/math-display-mobile.png`,
    });

    await page.goto("/learning/geometry-master");
    await page.locator("select").first().selectOption("g3");
    await page.locator("select").nth(1).selectOption("easy");
    const topicSel = page.getByTestId("geometry-topic-select");
    const vals = await topicSel.evaluate((el: HTMLSelectElement) =>
      [...el.options].map((o) => o.value).filter((v) => v && v !== "mixed")
    );
    if (vals[0]) await topicSel.selectOption(vals[0]);
    await expect(page.getByTestId("geometry-player-name")).toContainText(QA_USER);
    await confirmMixedModal(page);
    await page.getByTestId("geometry-start-game").click();
    const geoStem = page.getByTestId("geometry-question-stem");
    await expect(geoStem).toBeVisible({ timeout: 60_000 });
    await geoStem.screenshot({
      path: `${SCREENSHOT_DIR}/geometry-display-mobile.png`,
    });
  });
});
