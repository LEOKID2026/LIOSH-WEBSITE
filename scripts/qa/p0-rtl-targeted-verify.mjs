#!/usr/bin/env node
/** Targeted RTL re-verify after fixes — key surfaces only. */
import { chromium, devices } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const OUT = "docs/qa/p0-rtl-focused-audit-screenshots";
const ORIGIN = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100";
const JSON_OUT = "docs/qa/p0-rtl-targeted-verify.json";
mkdirSync(OUT, { recursive: true });

const BLOCKER_RES = [/Internal Server Error/i, /Application error/i, /Cannot find module/i];
const RTL_HINT_RES = [
  { id: "split-decimal", re: /\d+\.\s+\d+/, note: "רווח בין ספרות עשרוניות" },
  { id: "pi-reversed", re: /\.14\s*3\.|3\.\s+14/, note: "3.14 הפוך/מפורק" },
];

async function mockStudent(page) {
  await page.route("**/api/student/me", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: { id: "e2e-rtl", full_name: "rtl", grade_level: 5, is_active: true },
      }),
    })
  );
}

function analyze(text) {
  const blockers = BLOCKER_RES.filter((re) => re.test(text)).map(String);
  const rtlHints = RTL_HINT_RES.filter(({ re }) => re.test(text)).map(({ id, note }) => `${id}: ${note}`);
  return { blockers, rtlHints, pass: blockers.length === 0 && rtlHints.length === 0 };
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

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "he-IL", baseURL: ORIGIN });
const page = await ctx.newPage();
await mockStudent(page);

/** @type {Record<string, unknown>[]} */
const results = [];

async function capture(id, setup) {
  const shot = join(OUT, `${id}-mobile.png`);
  try {
    await setup();
    await page.waitForTimeout(1800);
    const text = await page.locator("body").innerText();
    await page.screenshot({ path: shot, fullPage: true });
    const verdict = analyze(text);
    results.push({ id, screenshot: shot.replace(/\\/g, "/"), ...verdict, sample: text.slice(0, 400) });
    console.log(`${verdict.pass ? "PASS" : "FAIL"} ${id}`);
  } catch (err) {
    await page.screenshot({ path: shot, fullPage: true }).catch(() => null);
    results.push({ id, screenshot: shot.replace(/\\/g, "/"), pass: false, blockers: [String(err)], rtlHints: [] });
    console.log(`FAIL ${id}`, String(err).slice(0, 100));
  }
}

await capture("book-geo-g6-circle", async () => {
  await page.goto("/learning/book/geometry/g6/circle_area", { waitUntil: "load", timeout: 60_000 });
});

await capture("geometry-practice-area", async () => {
  await page.goto("/learning/geometry-master");
  await page.getByRole("button", { name: "תרגול", exact: true }).click();
  const gradeSel = page.locator("select").first();
  await gradeSel.waitFor({ state: "visible" });
  const vals = await gradeSel.evaluate((el) => [...el.options].map((o) => o.value));
  await gradeSel.selectOption(vals.find((v) => v === "g5") || vals[0]);
  const close = page.getByRole("button", { name: /סגירה|סגור|✖/ }).first();
  if (await close.isVisible().catch(() => false)) await close.click();
  const topicSel = page.getByTestId("geometry-topic-select");
  await topicSel.waitFor({ state: "visible" });
  const tvals = await topicSel.evaluate((el) => [...el.options].map((o) => o.value));
  await topicSel.selectOption(tvals.find((v) => v.includes("angle") || v.includes("triangle")) || tvals[0]);
  await confirmMixed(page);
  await page.getByTestId("geometry-start-game").click();
  await page.getByTestId("geometry-question-stem").waitFor({ timeout: 60_000 });
});

await capture("math-practice-percent", async () => {
  await page.goto("/learning/math-master");
  await page.getByRole("button", { name: "תרגול", exact: true }).click();
  await page.getByTestId("math-grade-select").selectOption("6");
  await page.getByTestId("math-operation-select").selectOption("percentages");
  await page.getByTestId("math-start-game").click();
  await page.getByTestId("math-question-surface").waitFor({ timeout: 60_000 });
});

await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  origin: ORIGIN,
  pass: results.every((r) => r.pass),
  results,
};
writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
