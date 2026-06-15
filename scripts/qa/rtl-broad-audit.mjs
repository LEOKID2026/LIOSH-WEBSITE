#!/usr/bin/env node
/**
 * Broad RTL visual audit — DEPRECATED: use rtl-content-audit.mjs instead.
 * This script captured whole routes including intro pages; insufficient for RTL proof.
 *
 * Usage (legacy): PLAYWRIGHT_BASE_URL=http://localhost:3100 node scripts/qa/rtl-broad-audit.mjs
 * Preferred:      PLAYWRIGHT_BASE_URL=http://localhost:3100 node scripts/qa/rtl-content-audit.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";
import { detectMixedMathRenderIssues } from "../../lib/bidi/mixed-hebrew-math-runs.js";
import { MATH_G1_PAGE_ORDER } from "../../lib/learning-book/math-g1-registry.js";
import { MATH_G2_PAGE_ORDER } from "../../lib/learning-book/math-g2-registry.js";
import { MATH_G3_PAGE_ORDER } from "../../lib/learning-book/math-g3-registry.js";
import { MATH_G4_PAGE_ORDER } from "../../lib/learning-book/math-g4-registry.js";
import { MATH_G5_PAGE_ORDER } from "../../lib/learning-book/math-g5-registry.js";
import { MATH_G6_PAGE_ORDER } from "../../lib/learning-book/math-g6-registry.js";
import { GEOMETRY_G1_PAGE_ORDER } from "../../lib/learning-book/geometry-g1-registry.js";
import { GEOMETRY_G2_PAGE_ORDER } from "../../lib/learning-book/geometry-g2-registry.js";
import { GEOMETRY_G3_PAGE_ORDER } from "../../lib/learning-book/geometry-g3-registry.js";
import { GEOMETRY_G4_PAGE_ORDER } from "../../lib/learning-book/geometry-g4-registry.js";
import { GEOMETRY_G5_PAGE_ORDER } from "../../lib/learning-book/geometry-g5-registry.js";
import { GEOMETRY_G6_PAGE_ORDER } from "../../lib/learning-book/geometry-g6-registry.js";
import { SCIENCE_G3_PAGE_ORDER } from "../../lib/learning-book/science-g3-registry.js";
import { SCIENCE_G4_PAGE_ORDER } from "../../lib/learning-book/science-g4-registry.js";
import { SCIENCE_G5_PAGE_ORDER } from "../../lib/learning-book/science-g5-registry.js";
import { SCIENCE_G6_PAGE_ORDER } from "../../lib/learning-book/science-g6-registry.js";
import { assertDevServerReachable } from "../truth-gates/lib/live-parent-report.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ORIGIN = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/qa/rtl-broad-audit-screenshots");
const CSV_OUT = resolve(ROOT, "docs/qa/rtl-broad-audit-results.csv");
const JSON_OUT = resolve(ROOT, "docs/qa/rtl-broad-audit-results.json");

mkdirSync(OUT, { recursive: true });

const MATH_RTL_RE =
  /^(ns_|cmp|add|sub|mul|div|frac|perc|percent|thousand|place|vertical|column|carry|compare)/i;

/** @param {string[]} pages */
function pickMathRtlPages(pages) {
  return pages.filter((p) => MATH_RTL_RE.test(p));
}

/** @type {{ id: string, route: string, subject: string, surface: string, label: string, setup?: string }[]} */
const TARGETS = [];

for (const [grade, pages] of [
  ["g1", MATH_G1_PAGE_ORDER],
  ["g2", MATH_G2_PAGE_ORDER],
  ["g3", MATH_G3_PAGE_ORDER],
  ["g4", MATH_G4_PAGE_ORDER],
  ["g5", MATH_G5_PAGE_ORDER],
  ["g6", MATH_G6_PAGE_ORDER],
]) {
  for (const pageId of pickMathRtlPages(pages)) {
    TARGETS.push({
      id: `book-math-${grade}-${pageId}`,
      route: `/learning/book/math/${grade}/${pageId}`,
      subject: "math",
      surface: "books-math",
      label: `ספר חשבון ${grade} ${pageId}`,
    });
  }
}

for (const [grade, pages] of [
  ["g1", GEOMETRY_G1_PAGE_ORDER],
  ["g2", GEOMETRY_G2_PAGE_ORDER],
  ["g3", GEOMETRY_G3_PAGE_ORDER],
  ["g4", GEOMETRY_G4_PAGE_ORDER],
  ["g5", GEOMETRY_G5_PAGE_ORDER],
  ["g6", GEOMETRY_G6_PAGE_ORDER],
]) {
  for (const pageId of pages) {
    TARGETS.push({
      id: `book-geo-${grade}-${pageId}`,
      route: `/learning/book/geometry/${grade}/${pageId}`,
      subject: "geometry",
      surface: "books-geometry",
      label: `ספר גאומטריה ${grade} ${pageId}`,
    });
  }
}

for (const [grade, pages] of [
  ["g3", SCIENCE_G3_PAGE_ORDER],
  ["g4", SCIENCE_G4_PAGE_ORDER],
  ["g5", SCIENCE_G5_PAGE_ORDER],
  ["g6", SCIENCE_G6_PAGE_ORDER],
]) {
  for (const pageId of pages.slice(0, 4)) {
    TARGETS.push({
      id: `book-sci-${grade}-${pageId}`,
      route: `/learning/book/science/${grade}/${pageId}`,
      subject: "science",
      surface: "books-science",
      label: `ספר מדעים ${grade} ${pageId}`,
    });
  }
}

const PRACTICE = [
  { id: "math-practice-compare", route: "/learning/math-master", subject: "math", surface: "practice-math", label: "תרגול חשבון — השוואות", setup: "math-practice-compare" },
  { id: "math-practice-fractions", route: "/learning/math-master", subject: "math", surface: "practice-math", label: "תרגול חשבון — שברים", setup: "math-practice-fractions" },
  { id: "math-practice-percent", route: "/learning/math-master", subject: "math", surface: "practice-math", label: "תרגול חשבון — אחוזים", setup: "math-practice-percent" },
  { id: "math-practice-vertical", route: "/learning/math-master", subject: "math", surface: "practice-math", label: "תרגול חשבון — טורים", setup: "math-practice-vertical" },
  { id: "math-learning-steps", route: "/learning/math-master", subject: "math", surface: "learning-math", label: "למידה חשבון — צעד-צעד", setup: "math-learning" },
  { id: "geometry-practice", route: "/learning/geometry-master", subject: "geometry", surface: "practice-geometry", label: "תרגול גאומטריה", setup: "geometry-practice" },
  { id: "geometry-learning", route: "/learning/geometry-master", subject: "geometry", surface: "learning-geometry", label: "למידה גאומטריה", setup: "geometry-learning" },
  { id: "science-practice", route: "/learning/science-master", subject: "science", surface: "practice-science", label: "תרגול מדעים", setup: "science-practice" },
  { id: "science-learning", route: "/learning/science-master", subject: "science", surface: "learning-science", label: "למידה מדעים", setup: "science-learning" },
  { id: "hebrew-practice", route: "/learning/hebrew-master", subject: "hebrew", surface: "practice-hebrew", label: "תרגול עברית", setup: "hebrew-practice" },
  { id: "english-practice", route: "/learning/english-master", subject: "english", surface: "practice-english", label: "תרגול אנגלית", setup: "english-practice" },
  { id: "moledet-practice", route: "/learning/moledet-geography-master", subject: "moledet", surface: "practice-moledet", label: "תרגול מולדת", setup: "moledet-practice" },
];

TARGETS.push(...PRACTICE);

/** @typedef {{ route: string, subject: string, surface: string, screenshot: string, pass: string, issue: string, suspectFile: string, id: string, label: string }} Row */

/** @type {Row[]} */
const rows = [];

async function mockStudent(page) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: { id: "rtl-broad-audit", full_name: "rtl-audit", grade_level: 5, is_active: true },
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

async function selectGradeLevel(page, { gradeTestId, gradeValue, levelValue = "easy" } = {}) {
  const gradeSel = gradeTestId ? page.getByTestId(gradeTestId) : page.locator("select").first();
  await gradeSel.waitFor({ state: "visible", timeout: 45_000 });
  const gradeVals = await gradeSel.evaluate((el) => [...el.options].map((o) => o.value).filter(Boolean));
  const gradePick =
    gradeValue && gradeVals.includes(String(gradeValue))
      ? String(gradeValue)
      : gradeVals.find((v) => v === "5" || v === "g5") || gradeVals[0];
  await gradeSel.selectOption(gradePick);
  const levelSel = page.locator("select").nth(1);
  if (await levelSel.isVisible().catch(() => false)) {
    const levelVals = await levelSel.evaluate((el) => [...el.options].map((o) => o.value).filter(Boolean));
    const levelPick = levelVals.includes(levelValue) ? levelValue : levelVals[0];
    if (levelPick) await levelSel.selectOption(levelPick);
  }
}

async function pickOperation(page, testId, preferred) {
  const sel = page.getByTestId(testId);
  if (!(await sel.isVisible().catch(() => false))) return null;
  const vals = await sel.evaluate((el) => [...el.options].map((o) => o.value).filter(Boolean));
  const pick = preferred.find((v) => vals.includes(v)) || vals[0];
  if (pick) await sel.selectOption(pick);
  return pick;
}

async function clickModeTab(page, labelRe) {
  const btn = page.getByRole("button", { name: labelRe }).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(400);
  }
}

async function runSetup(page, setup) {
  if (!setup || setup.startsWith("book-")) return;
  if (setup.startsWith("math-practice")) {
    await page.goto(`${ORIGIN}/learning/math-master`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await clickModeTab(page, /^תרגול$/u);
    const op =
      setup.includes("compare") ? "compare"
      : setup.includes("fractions") ? "fractions"
      : setup.includes("percent") ? "percentages"
      : "subtraction";
    await selectGradeLevel(page, { gradeTestId: "math-grade-select", gradeValue: setup.includes("percent") ? "6" : "5" });
    await pickOperation(page, "math-operation-select", [op]);
    await confirmMixed(page);
    await page.getByTestId("math-start-game").click();
    await page.getByTestId("math-question-surface").waitFor({ timeout: 90_000 });
    return;
  }
  if (setup === "math-learning") {
    await page.goto(`${ORIGIN}/learning/math-master`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await clickModeTab(page, /^למידה$/u);
    await selectGradeLevel(page, { gradeTestId: "math-grade-select", gradeValue: "5" });
    await pickOperation(page, "math-operation-select", ["addition"]);
    await confirmMixed(page);
    await page.getByTestId("math-start-game").click();
    await page.getByTestId("math-question-surface").waitFor({ timeout: 90_000 });
    const mcq = page.locator('[data-testid^="math-mcq-"]').first();
    if (await mcq.isVisible().catch(() => false)) await mcq.click();
    await page.waitForTimeout(1500);
    const stepBtn = page.getByRole("button", { name: /צעד|הסבר|פתרון|הצג/u }).first();
    if (await stepBtn.isVisible().catch(() => false)) await stepBtn.click();
    return;
  }
  if (setup === "geometry-practice") {
    await page.goto(`${ORIGIN}/learning/geometry-master`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await clickModeTab(page, /^תרגול$/u);
    await selectGradeLevel(page, { gradeValue: "g5" });
    await pickOperation(page, "geometry-topic-select", ["triangle_area", "circle_area", "square_perimeter"]);
    await confirmMixed(page);
    await page.getByTestId("geometry-start-game").click();
    await page.getByTestId("geometry-question-stem").waitFor({ timeout: 90_000 });
    return;
  }
  if (setup === "geometry-learning") {
    await page.goto(`${ORIGIN}/learning/geometry-master`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await clickModeTab(page, /^למידה$/u);
    await selectGradeLevel(page, { gradeValue: "g5" });
    await pickOperation(page, "geometry-topic-select", ["circle_area", "triangle_area"]);
    await confirmMixed(page);
    await page.getByTestId("geometry-start-game").click();
    await page.getByTestId("geometry-question-stem").waitFor({ timeout: 90_000 });
    const mcq = page.locator('[data-testid^="geometry-mcq-"]').first();
    if (await mcq.isVisible().catch(() => false)) await mcq.click();
    await page.waitForTimeout(1500);
    return;
  }
  if (setup.startsWith("science")) {
    await page.goto(`${ORIGIN}/learning/science-master`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await clickModeTab(page, setup.includes("learning") ? /^למידה$/u : /^תרגול$/u);
    await selectGradeLevel(page, { gradeValue: "4" });
    await pickOperation(page, "science-topic-select", ["materials", "measurements", "body"]);
    await confirmMixed(page);
    await page.getByTestId("science-start-game").click();
    await page.locator('[data-testid^="science-mcq-"], [data-testid="science-question-stem"]').first().waitFor({ timeout: 90_000 });
    return;
  }
  if (setup === "hebrew-practice") {
    await page.goto(`${ORIGIN}/learning/hebrew-master`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await clickModeTab(page, /^תרגול$/u);
    await confirmMixed(page);
    await page.getByTestId("hebrew-start-game").click().catch(() => {});
    await page.waitForTimeout(2000);
    return;
  }
  if (setup === "english-practice") {
    await page.goto(`${ORIGIN}/learning/english-master`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await clickModeTab(page, /^תרגול$/u);
    await confirmMixed(page);
    await page.getByTestId("english-start-game").click().catch(() => {});
    await page.waitForTimeout(2000);
    return;
  }
  if (setup === "moledet-practice") {
    await page.goto(`${ORIGIN}/learning/moledet-geography-master`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await clickModeTab(page, /^תרגול$/u);
    await confirmMixed(page);
    await page.getByTestId("moledet-start-game").click().catch(() => {});
    await page.waitForTimeout(2000);
  }
}

function guessSuspectFile(target, issues) {
  if (target.surface.startsWith("books")) {
    return "components/learning-book/MixedHebrewMathText.js; lib/learning-book/book-math-display.js";
  }
  if (issues.includes("unisolated-math-in-prose")) {
    return "lib/bidi/mixed-hebrew-math-runs.js; components/learning/LearningMixedHebrewMathText.jsx";
  }
  return "lib/bidi/mixed-hebrew-math-runs.js; utils/learning-mixed-hebrew-math-render.js";
}

if (!(await assertDevServerReachable(ORIGIN))) {
  console.error(`Server unreachable at ${ORIGIN}`);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  ...devices["iPhone 13"],
  locale: "he-IL",
  baseURL: ORIGIN,
});

console.log(`\nRTL broad audit — ${TARGETS.length} targets — ${ORIGIN}\n`);

for (const target of TARGETS) {
  const page = await ctx.newPage();
  const filename = `${target.id}-mobile.png`;
  const shotPath = join(OUT, filename);
  /** @type {Row} */
  const row = {
    id: target.id,
    route: target.route,
    subject: target.subject,
    surface: target.surface,
    label: target.label,
    screenshot: shotPath.replace(/\\/g, "/"),
    pass: "PASS",
    issue: "",
    suspectFile: "",
  };
  try {
    await mockStudent(page);
    if (target.setup && !target.route.includes("/learning/book/")) {
      await runSetup(page, target.setup);
    } else {
      await page.goto(`${ORIGIN}${target.route}`, { waitUntil: "load", timeout: 90_000 });
      await page.waitForTimeout(2000);
    }
    const text = await page.locator("body").innerText();
    const blockers = [/Internal Server Error/i, /Application error/i, /500\s*-\s*Internal/i].filter((re) =>
      re.test(text)
    );
    const issues = detectMixedMathRenderIssues(text);
    if (blockers.length) {
      row.pass = "FAIL";
      row.issue = `blocker: ${blockers.map(String)}`;
    } else if (issues.length) {
      row.pass = "REVIEW";
      row.issue = issues.join("; ");
      row.suspectFile = guessSuspectFile(target, issues);
    }
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`${row.pass} ${target.id}`);
  } catch (err) {
    row.pass = "FAIL";
    row.issue = err?.message || String(err);
    row.suspectFile = target.route;
    await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {
      row.screenshot = "";
    });
    console.log(`FAIL ${target.id}: ${row.issue}`);
  } finally {
    await page.close();
    rows.push(row);
  }
}

await ctx.close();
await browser.close();

const csvHeader = "route,subject,surface,screenshot,pass,issue,suspectFile,id,label\n";
const csvBody = rows
  .map((r) =>
    [r.route, r.subject, r.surface, r.screenshot, r.pass, r.issue, r.suspectFile, r.id, r.label]
      .map((v) => `"${String(v || "").replace(/"/g, '""')}"`)
      .join(",")
  )
  .join("\n");
writeFileSync(CSV_OUT, csvHeader + csvBody);
writeFileSync(
  JSON_OUT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      origin: ORIGIN,
      targetCount: TARGETS.length,
      pass: rows.filter((r) => r.pass === "PASS").length,
      review: rows.filter((r) => r.pass === "REVIEW").length,
      fail: rows.filter((r) => r.pass === "FAIL").length,
      rows,
    },
    null,
    2
  )
);

console.log(`\nWrote ${CSV_OUT}`);
console.log(`Screenshots: ${rows.filter((r) => r.screenshot).length}`);
console.log(`PASS ${rows.filter((r) => r.pass === "PASS").length} | REVIEW ${rows.filter((r) => r.pass === "REVIEW").length} | FAIL ${rows.filter((r) => r.pass === "FAIL").length}`);
