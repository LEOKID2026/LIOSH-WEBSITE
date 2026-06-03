/**
 * One-off manual QA runner for math scratchpad MVP.
 * Not part of committed test suite — tmp only.
 *
 * Usage (dev server running on 3001 with NEXT_PUBLIC_MATH_SCRATCHPAD_V1=true):
 *   node tmp/math-scratchpad-qa-run.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL || "http://localhost:3001";
const results = [];

function record(id, pass, note) {
  results.push({ id, pass, note });
  console.log(`${pass ? "PASS" : "FAIL"} — ${id}: ${note}`);
}

async function mockStudent(page) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: {
          id: "00000000-0000-0000-0000-0000000000sp",
          full_name: "scratchpad-qa",
          grade_level: 3,
          is_active: true,
          coin_balance: 0,
        },
      }),
    });
  });
}

async function startLearningQuestion(page, { grade, operation }) {
  await page.goto(`${BASE}/learning/math-master`);
  await page.waitForLoadState("networkidle");
  const startBtn = page.getByTestId("math-start-game");
  if (await startBtn.isDisabled()) {
    const nameInput = page.locator('input[placeholder*="שם"], input[name="playerName"]');
    if ((await nameInput.count()) > 0) {
      await nameInput.first().fill("QA");
    }
  }
  await page.getByTestId("math-grade-select").selectOption(String(grade));
  await page.getByTestId("math-operation-select").selectOption(operation);
  await startBtn.click();
  await page.getByTestId("math-question-surface").waitFor({ timeout: 30000 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await mockStudent(page);

  try {
    // Grade 1 addition — scratchpad button + workspace
    await startLearningQuestion(page, { grade: 1, operation: "addition" });
    const g1Btn = page.getByTestId("math-scratchpad-open");
    await g1Btn.waitFor({ timeout: 15000 });
    record("B-g1-button", true, "Grade 1 addition shows דף טיוטה button");

    await g1Btn.click();
    await page.getByTestId("math-scratchpad-panel").waitFor();
    const panelText = await page.getByTestId("math-scratchpad-panel").innerText();
    const forbidden = ["נשאר", "סה״כ", "תוצאה", "נכון", "לא נכון"];
    const hasForbidden = forbidden.some((w) => panelText.includes(w));
    record(
      "B-g1-non-hinting",
      !hasForbidden,
      hasForbidden
        ? `Panel contains forbidden hint text: ${panelText.slice(0, 120)}`
        : "No answer/total/validation text in g1 panel"
    );

    await page.getByTestId("math-scratchpad-close").click();
    await page.getByTestId("math-scratchpad-panel").waitFor({ state: "hidden" });

    // Grade 1 multiplication — no button
    await page.goto(`${BASE}/learning/math-master`);
    await startLearningQuestion(page, { grade: 1, operation: "multiplication" });
    const g1MultCount = await page.getByTestId("math-scratchpad-open").count();
    record(
      "B-g1-mult-none",
      g1MultCount === 0,
      g1MultCount === 0 ? "No scratchpad for g1 multiplication" : "Unexpected scratchpad button"
    );

    // Grade 2 addition — base ten blocks
    await page.goto(`${BASE}/learning/math-master`);
    await startLearningQuestion(page, { grade: 2, operation: "addition" });
    await page.getByTestId("math-scratchpad-open").click();
    await page.getByTestId("math-scratchpad-panel").waitFor();
    const g2Text = await page.getByTestId("math-scratchpad-panel").innerText();
    record(
      "C-g2-blocks",
      g2Text.includes("+10") && g2Text.includes("+1"),
      "Base-ten block controls present (+10/+1)"
    );
    await page.getByTestId("math-scratchpad-close").click();

    // Grade 3 addition — place value table
    await page.goto(`${BASE}/learning/math-master`);
    await startLearningQuestion(page, { grade: 3, operation: "addition" });
    await page.getByTestId("math-scratchpad-open").click();
    await page.getByTestId("math-scratchpad-panel").waitFor();
    const g3Inputs = await page
      .getByTestId("math-scratchpad-panel")
      .locator("input")
      .count();
    record(
      "D-g3-place-value",
      g3Inputs > 0,
      `Place-value table has ${g3Inputs} manual input cells`
    );
    await page.getByTestId("math-scratchpad-close").click();

    // Grade 4 addition — vertical layout inputs
    await page.goto(`${BASE}/learning/math-master`);
    await startLearningQuestion(page, { grade: 4, operation: "addition" });
    await page.getByTestId("math-scratchpad-open").click();
    await page.getByTestId("math-scratchpad-panel").waitFor();
    const g4Inputs = await page
      .getByTestId("math-scratchpad-panel")
      .locator("input")
      .count();
    record(
      "D-g4-vertical",
      g4Inputs >= 6,
      `Vertical scratchpad has ${g4Inputs} empty digit inputs`
    );

    // Step-by-step mutual exclusion
    await page.getByTestId("math-scratchpad-close").click();
    await page.getByRole("button", { name: /צעד-צעד/ }).click();
    await page.waitForTimeout(500);
    const panelVisibleAfterStep = await page.getByTestId("math-scratchpad-panel").isVisible().catch(() => false);
    const stepVisible = await page.getByText(/צעד \d+ מתוך/).isVisible().catch(() => false);
    record(
      "E-step-by-step",
      !panelVisibleAfterStep && stepVisible,
      !panelVisibleAfterStep && stepVisible
        ? "Scratchpad closed; step-by-step modal visible"
        : `panel=${panelVisibleAfterStep} step=${stepVisible}`
    );

    // Answer field isolation — scratchpad input must not fill answer
    await page.goto(`${BASE}/learning/math-master`);
    await startLearningQuestion(page, { grade: 4, operation: "addition" });
    await page.getByTestId("math-scratchpad-open").click();
    const firstScratchInput = page.getByTestId("math-scratchpad-panel").locator("input").first();
    await firstScratchInput.fill("9");
    const answerField = page.getByTestId("math-text-answer");
    const answerVal = (await answerField.inputValue().catch(() => "")) || "";
    record(
      "G-answer-isolation",
      answerVal !== "9",
      `Answer field value after scratchpad typing: "${answerVal}" (expected not "9")`
    );

    // Mobile viewport bottom sheet
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/learning/math-master`);
    await startLearningQuestion(page, { grade: 1, operation: "addition" });
    await page.getByTestId("math-scratchpad-open").click();
    await page.getByTestId("math-scratchpad-panel").waitFor();
    const questionStillVisible = await page.getByTestId("student-question-body").isVisible();
    const panelBox = await page.getByTestId("math-scratchpad-panel").boundingBox();
    record(
      "I-mobile",
      questionStillVisible && panelBox && panelBox.y > 200,
      questionStillVisible
        ? `Question visible; panel y=${panelBox?.y ?? "?"} (bottom sheet)`
        : "Question not visible on mobile"
    );

    // Zero scratchpad API calls during session
    const apiCalls = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/api/") && url.includes("scratchpad")) apiCalls.push(url);
    });
    record(
      "H-no-scratchpad-api",
      apiCalls.length === 0,
      `Scratchpad-specific API calls: ${apiCalls.length}`
    );
  } catch (err) {
    record("RUNNER", false, String(err?.message || err));
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.pass);
  console.log("\n=== SUMMARY ===");
  console.log(`Total: ${results.length}, Pass: ${results.length - failed.length}, Fail: ${failed.length}`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

main();
