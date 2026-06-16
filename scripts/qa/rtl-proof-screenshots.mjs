#!/usr/bin/env node
/**
 * Short RTL proof capture — 10–15 mobile screenshots of hard Hebrew+math cases.
 * Usage: PLAYWRIGHT_BASE_URL=http://localhost:3100 node scripts/qa/rtl-proof-screenshots.mjs
 *
 * Output: docs/qa/rtl-proof-screenshots/
 * Report: docs/qa/rtl-proof-screenshots/results.json
 */
import { chromium, devices } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import {
  detectMixedMathRenderIssues,
  splitMixedHebrewMathRuns,
} from "../../lib/bidi/mixed-hebrew-math-runs.js";

const OUT = join("docs", "qa", "rtl-proof-screenshots");
const ORIGIN = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100").replace(/\/$/, "");
mkdirSync(OUT, { recursive: true });

const BLOCKER_RES = [/Internal Server Error/i, /Application error/i, /Cannot find module/i];

/** @type {{ id: string, label: string, path: string }[]} */
const BOOK_SHOTS = [
  { id: "01-place-value", label: "ערך מקום", path: "/learning/book/math/g2/ns_place_tens_units" },
  { id: "02-carry-add", label: "חיבור עם נשיאה", path: "/learning/book/math/g2/add_vertical" },
  { id: "03-subtraction", label: "חיסור", path: "/learning/book/math/g1/sub_two" },
  { id: "04-fractions", label: "שברים", path: "/learning/book/math/g2/frac_half" },
  { id: "05-percent", label: "אחוזים", path: "/learning/book/math/g6/perc_part_of" },
  { id: "06-pi-circle", label: "גאומטריה π", path: "/learning/book/geometry/g6/circle_area" },
  { id: "07-area-units", label: "שטח/יחידות", path: "/learning/book/geometry/g5/triangle_area" },
  { id: "08-perimeter", label: "היקף/יחידות", path: "/learning/book/geometry/g3/square_perimeter" },
  { id: "09-science-units", label: "מדעים יחידות", path: "/learning/book/science/g4/measurement_units" },
  { id: "10-step-explanation", label: "הסבר צעד-צעד", path: "/learning/book/math/g2/add_vertical" },
];

async function mockStudent(page) {
  await page.route("**/api/student/me", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: { id: "rtl-proof", full_name: "RTL Proof", grade_level: 5, is_active: true },
      }),
    })
  );
}

function scorePageText(text) {
  const blockers = BLOCKER_RES.filter((re) => re.test(text)).map(String);
  const lines = String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const mathLines = lines.filter((l) => /\d/.test(l) && /[\u0590-\u05FF]/.test(l));
  /** @type {string[]} */
  const issues = [];
  for (const line of mathLines.slice(0, 80)) {
    issues.push(...detectMixedMathRenderIssues(line));
  }
  const uniqueIssues = [...new Set(issues)];
  return {
    blockers,
    issues: uniqueIssues,
    pass: blockers.length === 0 && uniqueIssues.length === 0,
  };
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  ...devices["iPhone 13"],
  locale: "he-IL",
  baseURL: ORIGIN,
});
const page = await ctx.newPage();
await mockStudent(page);

/** @type {Record<string, unknown>[]} */
const results = [];

for (const shot of BOOK_SHOTS) {
  const file = join(OUT, `${shot.id}-mobile.png`);
  try {
    await page.goto(shot.path, { waitUntil: "load", timeout: 90_000 });
    await page.waitForTimeout(2000);
    if (shot.id === "10-step-explanation") {
      const explainBtn = page.getByRole("button", { name: /הסבר|איך פותרים|צעד/i }).first();
      if (await explainBtn.isVisible().catch(() => false)) {
        await explainBtn.click();
        await page.waitForTimeout(1200);
      }
    }
    const text = await page.locator("body").innerText();
    await page.screenshot({ path: file, fullPage: true });
    const verdict = scorePageText(text);
    results.push({
      id: shot.id,
      label: shot.label,
      path: shot.path,
      screenshot: file.replace(/\\/g, "/"),
      ...verdict,
    });
    console.log(`${verdict.pass ? "PASS" : "REVIEW"} ${shot.id} ${shot.label}`);
  } catch (err) {
    await page.screenshot({ path: file, fullPage: true }).catch(() => null);
    results.push({
      id: shot.id,
      label: shot.label,
      path: shot.path,
      screenshot: file.replace(/\\/g, "/"),
      pass: false,
      blockers: [String(err)],
      issues: [],
    });
    console.log(`FAIL ${shot.id}`, String(err).slice(0, 120));
  }
}

async function capturePractice(id, label, setup) {
  const file = join(OUT, `${id}-mobile.png`);
  try {
    await setup();
    await page.waitForTimeout(2000);
    const text = await page.locator("body").innerText();
    await page.screenshot({ path: file, fullPage: true });
    const verdict = scorePageText(text);
    results.push({ id, label, screenshot: file.replace(/\\/g, "/"), ...verdict });
    console.log(`${verdict.pass ? "PASS" : "REVIEW"} ${id} ${label}`);
  } catch (err) {
    results.push({ id, label, pass: false, blockers: [String(err)], issues: [] });
    console.log(`FAIL ${id}`, String(err).slice(0, 120));
  }
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

await capturePractice("11-math-practice-carry", "תרגול חיבור", async () => {
  await page.goto("/learning/math-master", { waitUntil: "load", timeout: 90_000 });
  await page.getByRole("button", { name: "תרגול", exact: true }).click();
  await page.getByTestId("math-grade-select").selectOption("2");
  await page.getByTestId("math-operation-select").selectOption("addition");
  await page.getByTestId("math-start-game").click();
  await page.getByTestId("math-question-surface").waitFor({ timeout: 60_000 });
});

await capturePractice("12-math-explanation", "הסבר תרגול", async () => {
  await page.goto("/learning/math-master", { waitUntil: "load", timeout: 90_000 });
  await page.getByRole("button", { name: "תרגול", exact: true }).click();
  await page.getByTestId("math-grade-select").selectOption("2");
  await page.getByTestId("math-operation-select").selectOption("addition");
  await page.getByTestId("math-start-game").click();
  await page.getByTestId("math-question-surface").waitFor({ timeout: 60_000 });
  const help = page.getByRole("button", { name: /איך פותרים|הסבר|פתרון/i }).first();
  if (await help.isVisible().catch(() => false)) await help.click();
});

await capturePractice("13-geometry-practice", "תרגול גאומטריה", async () => {
  await page.goto("/learning/geometry-master", { waitUntil: "load", timeout: 90_000 });
  await page.getByRole("button", { name: "תרגול", exact: true }).click();
  const gradeSel = page.locator("select").first();
  await gradeSel.waitFor({ state: "visible" });
  const vals = await gradeSel.evaluate((el) => [...el.options].map((o) => o.value));
  await gradeSel.selectOption(vals.find((v) => v === "g6") || vals[0]);
  const close = page.getByRole("button", { name: /סגירה|סגור|✖/ }).first();
  if (await close.isVisible().catch(() => false)) await close.click();
  const topicSel = page.getByTestId("geometry-topic-select");
  await topicSel.waitFor({ state: "visible" });
  const tvals = await topicSel.evaluate((el) => [...el.options].map((o) => o.value));
  await topicSel.selectOption(tvals.find((v) => /circle|area|pi/i.test(v)) || tvals[0]);
  await confirmMixed(page);
  await page.getByTestId("geometry-start-game").click();
  await page.getByTestId("geometry-question-stem").waitFor({ timeout: 60_000 });
});

await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  origin: ORIGIN,
  policyFixtures: [
    "100 + 20 + 4 = 124",
    "1 מאה + 2 עשרות + 4 אחדות = 124",
    "8 + 7 = 15 → 5, נשיאה 1",
    "π ≈ 3.14",
    "10% מתוך 490",
    "12 ס״מ",
    "1,000",
  ].map((line) => ({ line, runs: splitMixedHebrewMathRuns(line) })),
  pass: results.every((r) => r.pass),
  results,
};
writeFileSync(join(OUT, "results.json"), JSON.stringify(report, null, 2));
console.log(`\nRTL proof: ${report.pass ? "PASS" : "REVIEW"} (${results.length} shots)`);
console.log(`Report: ${join(OUT, "results.json")}`);
