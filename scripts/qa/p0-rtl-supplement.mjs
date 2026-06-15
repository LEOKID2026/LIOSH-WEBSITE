#!/usr/bin/env node
import { chromium, devices } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const OUT = "docs/qa/p0-rtl-focused-audit-screenshots";
const ORIGIN = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "he-IL", baseURL: ORIGIN });
await ctx.route("**/api/student/me", (r) =>
  r.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true, student: { id: "e2e", full_name: "rtl", grade_level: 5, is_active: true } }),
  })
);
const page = await ctx.newPage();

async function confirmMixed() {
  const save = page.getByRole("button", { name: "שמור", exact: true });
  if (await save.isVisible().catch(() => false)) {
    if (await page.getByRole("button", { name: "הכל", exact: true }).isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "הכל", exact: true }).click();
    }
    await save.click();
  }
}

async function shot(name, fn) {
  try {
    await fn();
    await page.waitForTimeout(1800);
    await page.screenshot({ path: join(OUT, name), fullPage: true });
    console.log("OK", name);
  } catch (e) {
    await page.screenshot({ path: join(OUT, name), fullPage: true }).catch(() => null);
    console.log("ERR", name, String(e).slice(0, 140));
  }
}

await shot("math-learning-step-panel-mobile.png", async () => {
  await page.goto("/learning/math-master");
  await page.getByRole("button", { name: "למידה", exact: true }).click();
  await page.getByTestId("math-grade-select").selectOption("5");
  await page.getByTestId("math-operation-select").selectOption("compare");
  await confirmMixed();
  await page.getByTestId("math-start-game").click();
  await page.getByTestId("math-question-surface").waitFor({ timeout: 60_000 });
  const mcq = page.locator('[data-testid^="math-mcq-"]');
  if ((await mcq.count()) > 0) {
    await mcq.nth(1).click({ force: true }).catch(() => mcq.first().click({ force: true }));
  } else {
    await page.getByRole("button", { name: /הסבר/ }).first().click({ force: true }).catch(() => null);
  }
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /צעד-צעד/ }).click({ force: true });
  await page.waitForTimeout(1500);
});

await shot("math-practice-mode-compare-mobile.png", async () => {
  await page.goto("/learning/math-master");
  await page.getByRole("button", { name: "תרגול", exact: true }).click();
  await page.getByTestId("math-grade-select").selectOption("5");
  await page.getByTestId("math-operation-select").selectOption("compare");
  await page.getByTestId("math-start-game").click();
  await page.getByTestId("math-question-surface").waitFor({ timeout: 60_000 });
});

await shot("science-learning-explain-mobile.png", async () => {
  await page.goto("/learning/science-master");
  await page.getByRole("button", { name: "למידה", exact: true }).click();
  await page.locator("select").first().selectOption({ index: 0 });
  await page.getByTestId("science-topic-select").selectOption({ index: 0 });
  await confirmMixed();
  await page.getByTestId("science-start-game").click();
  await page.locator('[data-testid^="science-mcq-"]').first().waitFor({ timeout: 60_000 });
  await page.getByRole("button", { name: /הסבר מלא/ }).click({ force: true });
  await page.waitForTimeout(1500);
});

await shot("geometry-learning-ingame-steps-mobile.png", async () => {
  await page.goto("/learning/geometry-master");
  await page.getByRole("button", { name: "למידה", exact: true }).click();
  const gradeSel = page.locator("select").first();
  await gradeSel.waitFor({ state: "visible", timeout: 45_000 });
  const gradeVals = await gradeSel.evaluate((el) => [...el.options].map((o) => o.value).filter(Boolean));
  await gradeSel.selectOption(gradeVals.find((v) => v === "g5") || gradeVals[0]);
  const close = page.getByRole("button", { name: /סגירה|סגור|✖/ }).first();
  if (await close.isVisible().catch(() => false)) await close.click();
  const topicSel = page.getByTestId("geometry-topic-select");
  await topicSel.waitFor({ state: "visible", timeout: 45_000 });
  const topicVals = await topicSel.evaluate((el) => [...el.options].map((o) => o.value).filter(Boolean));
  await topicSel.selectOption(topicVals.find((v) => v === "triangle_area") || topicVals[0]);
  await confirmMixed();
  await page.getByTestId("geometry-start-game").click();
  await page.getByTestId("geometry-question-stem").waitFor({ timeout: 60_000 });
  const n1 = page.locator('[data-testid="geometry-numpad"] button').filter({ hasText: "1" }).first();
  if (await n1.isVisible().catch(() => false)) await n1.click();
  const check = page.getByTestId("geometry-check-answer");
  if (await check.isEnabled().catch(() => false)) await check.click({ force: true });
  else {
    await page.getByRole("button", { name: /הסבר/ }).first().click({ force: true }).catch(() => null);
  }
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /צעד-צעד/ }).click({ force: true });
  await page.waitForTimeout(1500);
});

await browser.close();
