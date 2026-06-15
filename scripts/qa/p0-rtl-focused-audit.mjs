#!/usr/bin/env node
/**
 * P0 RTL focused visual audit — production build on PORT 3100.
 * Audit-only: captures mobile-first screenshots + lightweight heuristics.
 *
 * Usage:
 *   PLAYWRIGHT_BASE_URL=http://localhost:3100 node --env-file=.env.e2e.local scripts/qa/p0-rtl-focused-audit.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";
import { loadEnvFiles } from "../truth-gates/lib/env.mjs";
import {
  resolveParentBearer,
  resolveTruthGateStudent,
  getServiceSupabase,
  defaultReportRange,
  assertDevServerReachable,
} from "../truth-gates/lib/live-parent-report.mjs";

loadEnvFiles();

if (process.env.E2E_STUDENT_USERNAME === "leo-s01") {
  process.env.E2E_STUDENT_USERNAME = "aaa5";
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ORIGIN = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/qa/p0-rtl-focused-audit-screenshots");
const JSON_OUT = resolve(ROOT, "docs/qa/p0-rtl-focused-audit.json");

mkdirSync(OUT, { recursive: true });

/** @typedef {{ id: string, surface: string, label: string, viewport: 'mobile'|'desktop', screenshot: string|null, pass: boolean|null, blockers: string[], rtlHints: string[], bodySample: string, route?: string, error?: string }} AuditRow */

/** @type {AuditRow[]} */
const rows = [];

const BLOCKER_RES = [
  /Internal Server Error/i,
  /Application error/i,
  /Cannot find module/i,
  /500\s*-\s*Internal/i,
  /This page could not be found/i,
];

const RTL_HINT_RES = [
  { id: "split-decimal", re: /\d+\.\s+\d+/, note: "רווח בין ספרות עשרוניות (למשל 3. 14)" },
  { id: "percent-before-number", re: /%\s*\d/, note: "סימן % לפני מספר" },
  { id: "compare-reversed", re: /=\s*[<>]|[<>]\s*=/, note: "סדר חשוד בסימני השוואה" },
];

async function mockStudent(page) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: {
          id: "e2e-rtl-audit",
          full_name: "rtl-audit",
          grade_level: 5,
          is_active: true,
        },
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

function analyzeText(text) {
  const blockers = BLOCKER_RES.filter((re) => re.test(text)).map(String);
  const rtlHints = RTL_HINT_RES.filter(({ re }) => re.test(text)).map(({ id, note }) => `${id}: ${note}`);
  return { blockers, rtlHints };
}

async function capture(ctx, spec, setup) {
  const page = await ctx.newPage();
  const filename = `${spec.id}-${spec.viewport}.png`;
  const shotPath = join(OUT, filename);
  /** @type {AuditRow} */
  const row = {
    id: spec.id,
    surface: spec.surface,
    label: spec.label,
    viewport: spec.viewport,
    screenshot: shotPath.replace(/\\/g, "/"),
    pass: null,
    blockers: [],
    rtlHints: [],
    bodySample: "",
    route: spec.route,
  };
  try {
    await mockStudent(page);
    await setup(page);
    await page.waitForTimeout(1500);
    const text = await page.locator("body").innerText();
    row.bodySample = text.slice(0, 600);
    const { blockers, rtlHints } = analyzeText(text);
    row.blockers = blockers;
    row.rtlHints = rtlHints;
    await page.screenshot({ path: shotPath, fullPage: true });
    row.pass = blockers.length === 0 ? (rtlHints.length === 0 ? true : null) : false;
  } catch (err) {
    row.error = err?.message || String(err);
    row.pass = false;
    row.blockers.push(row.error);
    await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {
      row.screenshot = null;
    });
  } finally {
    await page.close();
    rows.push(row);
    console.log(`${row.pass === false ? "FAIL" : row.pass === true ? "PASS" : "REVIEW"} ${spec.id} (${spec.viewport})`);
  }
}

async function captureBook(ctx, spec) {
  await capture(ctx, spec, async (page) => {
    await page.goto(`${ORIGIN}${spec.route}`, { waitUntil: "load", timeout: 60_000 });
    await page.waitForTimeout(2500);
  });
}

async function startMathGame(page, { mode = "practice", grade = "5", operation = null } = {}) {
  await page.goto(`${ORIGIN}/learning/math-master`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (mode === "practice") {
    await clickModeTab(page, /^תרגול$/u);
  } else {
    await clickModeTab(page, /^למידה$/u);
  }
  await selectGradeLevel(page, { gradeTestId: "math-grade-select", gradeValue: grade });
  if (operation) {
    await pickOperation(page, "math-operation-select", [operation]);
  }
  await confirmMixed(page);
  await page.getByTestId("math-start-game").click();
  await page.getByTestId("math-question-surface").waitFor({ timeout: 90_000 });
}

async function startGeometryGame(page, { mode = "practice", grade = "5", topicPrefer = [] } = {}) {
  await page.goto(`${ORIGIN}/learning/geometry-master`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (mode === "practice") await clickModeTab(page, /^תרגול$/u);
  else await clickModeTab(page, /^למידה$/u);
  await selectGradeLevel(page, { gradeValue: "g5" });
  const closeCurriculum = page.getByRole("button", { name: /סגירה|סגור|✖/u }).first();
  if (await closeCurriculum.isVisible().catch(() => false)) await closeCurriculum.click();
  await pickOperation(page, "geometry-topic-select", topicPrefer.length ? topicPrefer : ["triangle_area", "square_area", "circle_area"]);
  await confirmMixed(page);
  await page.getByTestId("geometry-start-game").click();
  await page.getByTestId("geometry-question-stem").waitFor({ timeout: 90_000 });
}

async function startScienceGame(page, { mode = "practice" } = {}) {
  await page.goto(`${ORIGIN}/learning/science-master`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (mode === "practice") await clickModeTab(page, /^תרגול$/u);
  else await clickModeTab(page, /^למידה$/u);
  await selectGradeLevel(page, { gradeValue: "4" });
  await pickOperation(page, "science-topic-select", ["materials", "measurements", "body"]);
  await confirmMixed(page);
  await page.getByTestId("science-start-game").click();
  await page.locator('[data-testid^="science-mcq-"], [data-testid="science-question-stem"]').first().waitFor({ timeout: 90_000 });
}

async function triggerLearningFeedback(page, surface) {
  if (surface.startsWith("math")) {
    const mcq = page.locator('[data-testid^="math-mcq-"]').first();
    if (await mcq.isVisible().catch(() => false)) {
      await mcq.click();
      return;
    }
    const input = page.locator('[data-testid="math-answer-surface"] input, [data-testid="math-answer-surface"] textarea').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill("0");
      const check = page.getByTestId("math-check-answer");
      if (await check.isEnabled().catch(() => false)) await check.click();
    }
  } else if (surface.startsWith("geometry")) {
    const mcq = page.locator('[data-testid^="geometry-mcq-"]').first();
    if (await mcq.isVisible().catch(() => false)) {
      await mcq.click();
      return;
    }
    const input = page.locator('[data-testid="geometry-answer-surface"] input').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill("0");
      const check = page.getByTestId("geometry-check-answer");
      if (await check.isEnabled().catch(() => false)) await check.click();
    }
  } else if (surface.startsWith("science")) {
    const mcq = page.locator('[data-testid^="science-mcq-"]').first();
    if (await mcq.isVisible().catch(() => false)) await mcq.click();
  }
  await page.waitForTimeout(2200);
  const stepBtn = page.getByRole("button", { name: /צעד|הסבר|פתרון|הצג/u }).first();
  if (await stepBtn.isVisible().catch(() => false)) {
    await stepBtn.click();
    await page.waitForTimeout(1200);
  }
}

if (!(await assertDevServerReachable(ORIGIN))) {
  console.error(`Server unreachable at ${ORIGIN}`);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const mobileCtx = await browser.newContext({
  ...devices["iPhone 13"],
  locale: "he-IL",
  baseURL: ORIGIN,
});
const desktopCtx = await browser.newContext({
  locale: "he-IL",
  viewport: { width: 1280, height: 900 },
  baseURL: ORIGIN,
});

console.log(`\nRTL focused audit — ${ORIGIN}\nOutput: ${OUT}\n`);

// ── Math practice (mobile) ──
for (const [op, id, label] of [
  ["compare", "math-practice-compare", "חשבון תרגול — < > ="],
  ["fractions", "math-practice-fractions", "חשבון תרגול — שברים"],
  ["percentages", "math-practice-percent", "חשבון תרגול — אחוזים"],
  ["subtraction", "math-practice-vertical", "חשבון תרגול — חיסור (טורים)"],
]) {
  await capture(mobileCtx, { id, surface: "math-practice", label, viewport: "mobile", route: "/learning/math-master" }, async (page) => {
    await startMathGame(page, { mode: "practice", grade: op === "percentages" ? "6" : "5", operation: op });
  });
}

// ── Math learning (mobile) ──
await capture(
  mobileCtx,
  { id: "math-learning-steps", surface: "math-learning", label: "חשבון למידה — צעד-צעד + הסבר", viewport: "mobile", route: "/learning/math-master" },
  async (page) => {
    await startMathGame(page, { mode: "learning", grade: "5", operation: "addition" });
    await triggerLearningFeedback(page, "math-learning");
  }
);

// ── Geometry practice / learning ──
await capture(
  mobileCtx,
  { id: "geometry-practice-area", surface: "geometry-practice", label: "גאומטריה תרגול — שטח/היקף/יחידות", viewport: "mobile", route: "/learning/geometry-master" },
  async (page) => {
    await startGeometryGame(page, { mode: "practice", topicPrefer: ["triangle_area", "square_perimeter", "circle_area"] });
  }
);

await capture(
  mobileCtx,
  { id: "geometry-learning-formula", surface: "geometry-learning", label: "גאומטריה למידה — נוסחאות + צעד-צעד", viewport: "mobile", route: "/learning/geometry-master" },
  async (page) => {
    await startGeometryGame(page, { mode: "learning", topicPrefer: ["triangle_area", "circle_area"] });
    await triggerLearningFeedback(page, "geometry-learning");
  }
);

// ── Science practice / learning ──
await capture(
  mobileCtx,
  { id: "science-practice-units", surface: "science-practice", label: "מדעים תרגול — טבלאות/יחידות/מספרים", viewport: "mobile", route: "/learning/science-master" },
  async (page) => {
    await startScienceGame(page, { mode: "practice" });
  }
);

await capture(
  mobileCtx,
  { id: "science-learning-mixed", surface: "science-learning", label: "מדעים למידה — טקסט מעורב + טבלאות", viewport: "mobile", route: "/learning/science-master" },
  async (page) => {
    await startScienceGame(page, { mode: "learning" });
    await triggerLearningFeedback(page, "science-learning");
  }
);

// ── Books (mobile) — ≥2 per subject ──
const BOOK_PAGES = [
  { id: "book-math-g1-cmp", surface: "books-math", label: "ספר חשבון g1 cmp", route: "/learning/book/math/g1/cmp" },
  { id: "book-math-g2-sub-vertical", surface: "books-math", label: "ספר חשבון g2 sub_vertical", route: "/learning/book/math/g2/sub_vertical" },
  { id: "book-math-g5-perc", surface: "books-math", label: "ספר חשבון g5 perc_part_of", route: "/learning/book/math/g5/perc_part_of" },
  { id: "book-geo-g5-triangle", surface: "books-geometry", label: "ספר גאומטריה g5 triangle_area", route: "/learning/book/geometry/g5/triangle_area" },
  { id: "book-geo-g6-circle", surface: "books-geometry", label: "ספר גאומטריה g6 circle_area", route: "/learning/book/geometry/g6/circle_area" },
  { id: "book-science-g3-materials", surface: "books-science", label: "ספר מדעים g3 materials", route: "/learning/book/science/g3/materials" },
  { id: "book-science-g4-earth", surface: "books-science", label: "ספר מדעים g4 earth_space", route: "/learning/book/science/g4/earth_space" },
];

for (const spec of BOOK_PAGES) {
  await captureBook(mobileCtx, { ...spec, viewport: "mobile" });
}

// ── Parent report (mobile + desktop) ──
const supabase = getServiceSupabase();
const auth = await resolveParentBearer(ORIGIN);
const student = auth.token
  ? await resolveTruthGateStudent(supabase, auth.userId, {
      origin: ORIGIN,
      bearer: auth.token,
      studentUsername: process.env.E2E_STUDENT_USERNAME || "aaa5",
    })
  : null;
const email = process.env.E2E_PARENT_EMAIL || process.env.E2E_PARENT_USERNAME || "";
const password = process.env.E2E_PARENT_PASSWORD || "";
const range = defaultReportRange(7);

for (const viewport of ["mobile", "desktop"]) {
  const ctx = viewport === "mobile" ? mobileCtx : desktopCtx;
  await capture(
    ctx,
    {
      id: `parent-report-short-${viewport}`,
      surface: "parent-report",
      label: "דוח הורים קצר — אחוזים/מספרים בעברית",
      viewport,
      route: "/learning/parent-report",
    },
    async (page) => {
      if (!student?.id || !auth.token) throw new Error("parent fixture unavailable");
      await page.goto(`${ORIGIN}/parent/login`, { waitUntil: "domcontentloaded" });
      await page.getByTestId("parent-login-identifier").fill(email);
      await page.getByTestId("parent-login-secret").fill(password);
      await page.locator("form").getByRole("button", { name: "כניסה" }).click();
      await page.waitForURL("**/parent/dashboard", { timeout: 30_000 });
      const url = `${ORIGIN}/learning/parent-report?source=parent&studentId=${encodeURIComponent(student.id)}&period=custom&start=${range.from}&end=${range.to}`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
      await page.getByRole("heading", { name: /דוח להורים/u }).waitFor({ timeout: 90_000 });
    }
  );
}

await mobileCtx.close();
await desktopCtx.close();
await browser.close();

const surfaceSummary = {};
for (const row of rows) {
  if (!surfaceSummary[row.surface]) {
    surfaceSummary[row.surface] = { pass: true, fails: [], reviews: [], screenshots: [] };
  }
  const s = surfaceSummary[row.surface];
  if (row.screenshot) s.screenshots.push(row.screenshot);
  if (row.pass === false) {
    s.pass = false;
    s.fails.push({ id: row.id, blockers: row.blockers, rtlHints: row.rtlHints, screenshot: row.screenshot });
  } else if (row.pass === null) {
    s.reviews.push({ id: row.id, rtlHints: row.rtlHints, screenshot: row.screenshot });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  origin: ORIGIN,
  outputDir: OUT.replace(/\\/g, "/"),
  mobileScreenshotCount: rows.filter((r) => r.viewport === "mobile" && r.screenshot).length,
  rows,
  surfaceSummary,
};

writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
console.log(`\nWrote ${JSON_OUT}`);
console.log(`Mobile screenshots: ${report.mobileScreenshotCount}`);
