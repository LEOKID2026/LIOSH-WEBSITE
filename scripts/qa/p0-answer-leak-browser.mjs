#!/usr/bin/env node
/** Answer leak spot-check on PORT=3100 — wrong answer must not reveal correct answer. */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ORIGIN = (process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100").replace(/\/$/, "");
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/p0-final-verification-screenshots");
const FORBIDDEN = [/Wrong!/i, /Correct!/i, /Correct answer/i, /Game Over!/i, /תשובה נכונה:/u, /התשובה הנכונה:/u];

mkdirSync(OUT, { recursive: true });

async function mockStudent(page) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: { id: "e2e-leak", full_name: "leak-test", grade_level: 3, is_active: true },
      }),
    });
  });
}

async function confirmMixed(page) {
  const save = page.getByRole("button", { name: "שמור", exact: true });
  if (await save.isVisible().catch(() => false)) {
    if (await page.getByRole("button", { name: "הכל", exact: true }).isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "הכל", exact: true }).click();
    }
    await save.click();
  }
}

async function checkMaster(page, name, setup, pickWrong) {
  await mockStudent(page);
  await setup(page);
  await pickWrong(page);
  await page.waitForTimeout(1500);
  const text = await page.locator("body").innerText();
  const leaks = FORBIDDEN.filter((re) => re.test(text));
  const shot = resolve(OUT, `${name}-wrong-feedback.png`);
  await page.screenshot({ path: shot });
  return { master: name, pass: leaks.length === 0, leaks: leaks.map(String), screenshot: shot, sample: text.slice(0, 350) };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: "he-IL", viewport: { width: 390, height: 844 } });
const results = [];

try {
  results.push(
    await checkMaster(
      page,
      "math-master",
      async (p) => {
        await p.goto(`${ORIGIN}/learning/math-master`);
        await p.locator("select").first().selectOption("3");
        await p.locator("select").nth(1).selectOption("easy");
        const op = p.getByTestId("math-operation-select");
        const vals = await op.evaluate((el) => [...el.options].map((o) => o.value));
        await op.selectOption(vals.find((v) => v === "addition") || vals[0]);
        await confirmMixed(p);
        await p.getByTestId("math-start-game").click();
        await p.getByTestId("math-question-surface").waitFor({ timeout: 60_000 });
      },
      async (p) => {
        const btns = p.locator('[data-testid="math-answer-surface"] button');
        const n = await btns.count();
        if (n > 0) await btns.first().click();
        else await p.getByTestId("math-check-answer").click().catch(() => null);
      }
    )
  );

  results.push(
    await checkMaster(
      page,
      "geometry-master",
      async (p) => {
        await p.goto(`${ORIGIN}/learning/geometry-master`);
        await p.locator("select").first().selectOption("g3");
        await p.locator("select").nth(1).selectOption("easy");
        const sel = p.getByTestId("geometry-topic-select");
        const vals = await sel.evaluate((el) => [...el.options].map((o) => o.value).filter(Boolean));
        await sel.selectOption(vals[0]);
        await confirmMixed(p);
        await p.getByTestId("geometry-start-game").click();
        await p.getByTestId("geometry-question-stem").waitFor({ timeout: 60_000 });
      },
      async (p) => {
        const btns = p.locator("button").filter({ hasNotText: /התחל|שמור|הכל|דף|סיום|הגדר/i });
        const n = await btns.count();
        for (let i = 0; i < Math.min(n, 8); i++) {
          const t = await btns.nth(i).innerText().catch(() => "");
          if (t && t.length < 40) {
            await btns.nth(i).click();
            break;
          }
        }
      }
    )
  );
} finally {
  await browser.close();
}

const out = { origin: ORIGIN, results, pass: results.every((r) => r.pass) };
writeFileSync(resolve(OUT, "../p0-answer-leak-browser.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
