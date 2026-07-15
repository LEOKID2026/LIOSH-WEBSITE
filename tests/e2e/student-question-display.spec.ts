import { mkdir } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import {
  splitStudentQuestionForDisplay,
  formatFormulaSpacing,
  formatCompactExpression,
  shouldOmitInstructionLead,
  formatGeometryChildFriendlyQuestion,
} from "../../utils/student-question-display.js";
import {
  assertStemNoHorizontalScroll,
  assertGeometryWording,
  assertCompactMathSpacing,
} from "./helpers/student-question-stem-layout";

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

test.describe("Student question display - layout (mobile)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEW);
    await mockStudentSession(page);
  });

  test("unit: compact expression and omit redundant lead", () => {
    expect(formatCompactExpression("13   +   10 × 6 = __")).toBe("13 + 10 × 6 = __");
    expect(
      shouldOmitInstructionLead("מצאו את הנעלם:", "13 + 10 × 6 = __")
    ).toBe(true);
    const split = splitStudentQuestionForDisplay("מצאו את הנעלם: 13 + 10 × 6 = __");
    expect(split.leadText).toBe("");
    expect(split.bodyText).toBe("13 + 10 × 6 = __");
  });

  test("unit: formats geometry formula spacing and child-friendly wording", () => {
    expect(formatFormulaSpacing("שטח = חצי×בסיס×גובה")).toBe(
      "שטח = חצי × בסיס × גובה"
    );
    expect(
      formatGeometryChildFriendlyQuestion(
        "מלבן במישור: 2 על 4. מה שטח הפנים?"
      )
    ).toContain("מלבן שאורכו 2 יחידות ורוחבו 4 יחידות");
    expect(
      formatGeometryChildFriendlyQuestion(
        "מלבן במישור: 2 על 4. מה שטח הפנים?"
      )
    ).toContain("מה שטח המלבן");
    expect(
      formatGeometryChildFriendlyQuestion(
        "בסיסים 1 ו - 8 , גובה 1. מה השטח? ( ממוצע הבסיסים × גובה )"
      )
    ).toBe("בסיסים 1 ו - 8 , גובה 1. מה השטח?");
  });

  test("math: compact equation without horizontal scroll", async ({ page }) => {
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
    await expect(body).toBeVisible();
    if (await lead.isVisible()) {
      await expect(lead).not.toContainText("מצאו את הנעלם");
    }
    const bodyText = await body.innerText();
    expect(bodyText).toMatch(/=|×|\+|−|-|\(/);
    expect(bodyText).not.toMatch(/מצאו את הנעלם/);
    await expect(body).toHaveAttribute("dir", "ltr");
    await assertStemNoHorizontalScroll(surface);
    await assertCompactMathSpacing(body);
  });

  test("geometry: child-friendly wording and no horizontal scroll", async ({ page }) => {
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
    if (/מלבן/u.test(full)) {
      assertGeometryWording(full);
    }
    await assertStemNoHorizontalScroll(stem);
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
    await assertStemNoHorizontalScroll(mathSurface);
    await mathSurface.screenshot({
      path: `${SCREENSHOT_DIR}/math-display-mobile-expression.png`,
    });

    await page.goto("/learning/geometry-master");
    await page.locator("select").first().selectOption("g3");
    await page.locator("select").nth(1).selectOption("medium");
    const topicSel = page.getByTestId("geometry-topic-select");
    const vals = await topicSel.evaluate((el: HTMLSelectElement) =>
      [...el.options].map((o) => o.value).filter((v) => v && v !== "mixed")
    );
    const areaVal = vals.find((v) => v === "area") || vals[0];
    if (areaVal) await topicSel.selectOption(areaVal);
    await expect(page.getByTestId("geometry-player-name")).toContainText(QA_USER);
    await confirmMixedModal(page);
    await page.getByTestId("geometry-start-game").click();
    const geoStem = page.getByTestId("geometry-question-stem");
    await expect(geoStem).toBeVisible({ timeout: 60_000 });
    await assertStemNoHorizontalScroll(geoStem);
    await geoStem.screenshot({
      path: `${SCREENSHOT_DIR}/geometry-display-mobile-rectangle.png`,
    });

    const perimeterVal = vals.find((v) => v === "perimeter");
    if (perimeterVal) {
      await page.goto("/learning/geometry-master");
      await page.locator("select").first().selectOption("g3");
      await page.locator("select").nth(1).selectOption("medium");
      await page.getByTestId("geometry-topic-select").selectOption(perimeterVal);
      await expect(page.getByTestId("geometry-player-name")).toContainText(QA_USER);
      await confirmMixedModal(page);
      await page.getByTestId("geometry-start-game").click();
      const perimeterStem = page.getByTestId("geometry-question-stem");
      await expect(perimeterStem).toBeVisible({ timeout: 60_000 });
      await perimeterStem.screenshot({
        path: `${SCREENSHOT_DIR}/geometry-display-mobile-perimeter.png`,
      });
    }
  });
});
