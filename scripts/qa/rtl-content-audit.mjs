#!/usr/bin/env node
/**
 * RTL content-focused visual audit — walks book sections and captures only
 * Hebrew+math pages (exercises, formulas, units). Skips intro/summary pages.
 *
 * Usage: PLAYWRIGHT_BASE_URL=http://localhost:3100 node scripts/qa/rtl-content-audit.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";
import { detectMixedMathRenderIssues } from "../../lib/bidi/mixed-hebrew-math-runs.js";
import {
  analyzeRtlAuditPageText,
  selectRtlAuditSections,
} from "../../lib/bidi/rtl-audit-page-scoring.js";
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
import { SCIENCE_G1_PAGE_ORDER } from "../../lib/learning-book/science-g1-registry.js";
import { SCIENCE_G2_PAGE_ORDER } from "../../lib/learning-book/science-g2-registry.js";
import { SCIENCE_G3_PAGE_ORDER } from "../../lib/learning-book/science-g3-registry.js";
import { SCIENCE_G4_PAGE_ORDER } from "../../lib/learning-book/science-g4-registry.js";
import { SCIENCE_G5_PAGE_ORDER } from "../../lib/learning-book/science-g5-registry.js";
import { SCIENCE_G6_PAGE_ORDER } from "../../lib/learning-book/science-g6-registry.js";
import { assertDevServerReachable } from "../truth-gates/lib/live-parent-report.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ORIGIN = (process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/qa/rtl-content-audit-screenshots");
const CSV_OUT = resolve(ROOT, "docs/qa/rtl-content-audit-results.csv");
const JSON_OUT = resolve(ROOT, "docs/qa/rtl-content-audit-results.json");

mkdirSync(OUT, { recursive: true });

/** Curated RTL-critical topics per grade — validated against registry at runtime. */
const BOOK_AUDIT_TOPICS = {
  math: {
    g1: ["ns_place_tens_units", "cmp", "add_two", "sub_two", "mul"],
    g2: ["ns_place_tens_units", "add_vertical", "sub_vertical", "cmp", "frac_half", "mul", "div"],
    g3: ["ns_place_hundreds", "cmp", "add_three", "sub_two", "mul", "div"],
    g4: ["ns_place_hundreds", "cmp", "mul_vertical", "add_three", "div"],
    g5: ["frac_add_sub", "perc_part_of", "cmp", "mul", "add_three"],
    g6: ["ns_place_hundreds", "frac_multiply", "perc_part_of", "cmp", "mul"],
  },
  geometry: {
    g1: ["shapes_basic_square", "shapes_basic_rectangle"],
    g2: ["square_area", "solids"],
    g3: ["square_area", "square_perimeter", "triangle_perimeter"],
    g4: ["square_area", "square_perimeter", "rectangular_prism_volume", "parallel_perpendicular"],
    g5: ["triangle_area", "square_area", "triangle_angles", "rectangular_prism_volume"],
    g6: ["circle_area", "circle_perimeter", "pythagoras_hyp", "cylinder_volume", "sphere_volume"],
  },
  science: {
    // Science books use dynamic route; covered via science-practice until book hydration is verified.
    g3: [],
    g4: [],
    g5: [],
    g6: [],
  },
};

const PAGE_ORDERS = {
  math: { g1: MATH_G1_PAGE_ORDER, g2: MATH_G2_PAGE_ORDER, g3: MATH_G3_PAGE_ORDER, g4: MATH_G4_PAGE_ORDER, g5: MATH_G5_PAGE_ORDER, g6: MATH_G6_PAGE_ORDER },
  geometry: { g1: GEOMETRY_G1_PAGE_ORDER, g2: GEOMETRY_G2_PAGE_ORDER, g3: GEOMETRY_G3_PAGE_ORDER, g4: GEOMETRY_G4_PAGE_ORDER, g5: GEOMETRY_G5_PAGE_ORDER, g6: GEOMETRY_G6_PAGE_ORDER },
  science: { g1: SCIENCE_G1_PAGE_ORDER, g2: SCIENCE_G2_PAGE_ORDER, g3: SCIENCE_G3_PAGE_ORDER, g4: SCIENCE_G4_PAGE_ORDER, g5: SCIENCE_G5_PAGE_ORDER, g6: SCIENCE_G6_PAGE_ORDER },
};

/** @type {{ subject: string, grade: string, pageId: string, route: string }[]} */
const BOOK_TARGETS = [];

for (const subject of ["math", "geometry", "science"]) {
  for (const [grade, pageIds] of Object.entries(BOOK_AUDIT_TOPICS[subject] || {})) {
    const order = PAGE_ORDERS[subject]?.[grade] || [];
    for (const pageId of pageIds) {
      if (!order.includes(pageId)) continue;
      BOOK_TARGETS.push({
        subject,
        grade,
        pageId,
        route: `/learning/book/${subject}/${grade}/${pageId}`,
      });
    }
  }
}

const PRACTICE_TARGETS = [
  { id: "math-practice-compare", subject: "math", surface: "practice", route: "/learning/math-master", setup: "math-practice-compare" },
  { id: "math-practice-fractions", subject: "math", surface: "practice", route: "/learning/math-master", setup: "math-practice-fractions" },
  { id: "math-practice-percent", subject: "math", surface: "practice", route: "/learning/math-master", setup: "math-practice-percent" },
  { id: "math-practice-vertical", subject: "math", surface: "practice", route: "/learning/math-master", setup: "math-practice-vertical" },
  { id: "math-learning-steps", subject: "math", surface: "learning", route: "/learning/math-master", setup: "math-learning" },
  { id: "geometry-practice", subject: "geometry", surface: "practice", route: "/learning/geometry-master", setup: "geometry-practice" },
  { id: "geometry-learning", subject: "geometry", surface: "learning", route: "/learning/geometry-master", setup: "geometry-learning" },
  { id: "science-practice", subject: "science", surface: "practice", route: "/learning/science-master", setup: "science-practice" },
];

/** Write results even when the run aborts mid-way. */
function writeResults() {
  if (rows.length === 0) return;
  const csvHeader =
    "screenshot,route,subject,surface,grade,pageId,sectionIndex,sectionTotal,sectionTitle,selectionReason,matchedSignals,pass,issue,suspectFile,viewport,id\n";
  const csvBody = rows
    .map((r) =>
      [
        r.screenshot,
        r.route,
        r.subject,
        r.surface,
        r.grade,
        r.pageId,
        r.sectionIndex,
        r.sectionTotal,
        r.sectionTitle,
        r.selectionReason,
        r.matchedSignals,
        r.pass,
        r.issue,
        r.suspectFile,
        r.viewport,
        r.id,
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
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
        bookTopics: BOOK_TARGETS.length,
        rows,
        summary: {
          pass: rows.filter((r) => r.pass === "PASS").length,
          review: rows.filter((r) => r.pass === "REVIEW").length,
          fail: rows.filter((r) => r.pass === "FAIL").length,
          skip: rows.filter((r) => r.pass === "SKIP").length,
          screenshots: rows.filter((r) => r.screenshot).length,
        },
      },
      null,
      2
    )
  );
}

process.on("SIGINT", () => {
  writeResults();
  process.exit(130);
});

/** @typedef {{ screenshot: string, route: string, subject: string, surface: string, grade: string, pageId: string, sectionIndex: number, sectionTotal: number, sectionTitle: string, selectionReason: string, matchedSignals: string, pass: string, issue: string, suspectFile: string, viewport: string, id: string }} AuditRow */

/** @type {AuditRow[]} */
const rows = [];

function guessSuspectFile(subject, issues) {
  if (subject && String(subject).startsWith("book") || ["math", "geometry", "science"].includes(subject)) {
    if (issues?.includes("unisolated-math-in-prose")) {
      return "lib/bidi/mixed-hebrew-math-runs.js; components/learning-book/MixedHebrewMathText.js";
    }
    return "components/learning-book/MixedHebrewMathText.js; lib/learning-book/book-math-display.js";
  }
  return "lib/bidi/mixed-hebrew-math-runs.js; components/learning/LearningMixedHebrewMathText.jsx";
}

function gradePass(text, subject, issues, blockers) {
  if (blockers.length) return { pass: "FAIL", issue: `blocker: ${blockers.join(", ")}` };
  if (issues.length) return { pass: "REVIEW", issue: issues.join("; ") };
  return { pass: "PASS", issue: "" };
}

async function mockStudent(page) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: { id: "rtl-content-audit", full_name: "rtl-audit", grade_level: 5, is_active: true },
      }),
    });
  });
}

/**
 * Walk all sections in current book topic page.
 * @param {import('playwright').Page} page
 */
async function walkBookSections(page) {
  await page.waitForSelector("article", { timeout: 20_000 });
  /** @type {{ sectionIndex: number, sectionTotal: number, title: string, text: string, analysis: ReturnType<typeof analyzeRtlAuditPageText> }[]} */
  const sections = [];

  for (let guard = 0; guard < 24; guard += 1) {
    const footerText = (await page.locator("footer p").first().textContent()) || "";
    const m = footerText.match(/עמוד\s+(\d+)\s+מתוך\s+(\d+)/u);
    const sectionIndex = m ? Number(m[1]) : guard + 1;
    const sectionTotal = m ? Number(m[2]) : 1;
    const title = ((await page.locator("article h2").first().textContent()) || "").trim();
    const text = ((await page.locator("article").innerText()) || "").trim();
    const analysis = analyzeRtlAuditPageText(text, title);

    sections.push({ sectionIndex, sectionTotal, title, text, analysis });

    const nextBtn = page.getByRole("button", { name: "עמוד הבא" });
    if (await nextBtn.isDisabled().catch(() => true)) break;
    await nextBtn.click();
    await page.waitForTimeout(450);
  }

  return sections;
}

/**
 * @param {import('playwright').Page} page
 * @param {number} sectionIndex 1-based
 */
async function goToBookSection(page, sectionIndex) {
  await page.waitForSelector("article", { timeout: 60_000 });
  for (let i = 1; i < sectionIndex; i += 1) {
    const nextBtn = page.getByRole("button", { name: "עמוד הבא" });
    if (await nextBtn.isDisabled().catch(() => true)) break;
    await nextBtn.click();
    await page.waitForTimeout(450);
  }
}

async function captureBookTopic(ctx, target, viewport) {
  const page = await ctx.newPage();
  try {
    await mockStudent(page);
    await page.goto(`${ORIGIN}${target.route}`, { waitUntil: "load", timeout: 90_000 });
    await page.waitForTimeout(1200);

    const walked = await walkBookSections(page);
    const picked = selectRtlAuditSections(walked);

    if (picked.length === 0) {
      rows.push({
        id: `book-${target.subject}-${target.grade}-${target.pageId}-none`,
        screenshot: "",
        route: target.route,
        subject: target.subject,
        surface: `books-${target.subject}`,
        grade: target.grade,
        pageId: target.pageId,
        sectionIndex: 0,
        sectionTotal: walked[0]?.sectionTotal || 0,
        sectionTitle: "",
        selectionReason: "לא נמצאו עמודי תוכן עם מתמטיקה/יחידות/תרגילים",
        matchedSignals: "",
        pass: "SKIP",
        issue: `נסרקו ${walked.length} עמודים — אף אחד לא עבר סף RTL`,
        suspectFile: "",
        viewport,
      });
      console.log(`SKIP ${target.subject}/${target.grade}/${target.pageId} — no math sections`);
      return;
    }

    for (const sec of picked) {
      try {
        await page.goto(`${ORIGIN}${target.route}`, { waitUntil: "load", timeout: 90_000 });
        await page.waitForTimeout(800);
        await goToBookSection(page, sec.sectionIndex);

        const text = ((await page.locator("article").innerText()) || "").trim();
        const blockers = [/Internal Server Error/i, /Application error/i].filter((re) => re.test(text)).map(String);
        const issues = detectMixedMathRenderIssues(text);
        const { pass, issue } = gradePass(text, target.subject, issues, blockers);

        const id = `book-${target.subject}-${target.grade}-${target.pageId}-s${sec.sectionIndex}`;
        const filename = `${id}-${viewport}.png`;
        const shotPath = join(OUT, filename);
        await page.screenshot({ path: shotPath, fullPage: true });

        rows.push({
          id,
          screenshot: shotPath.replace(/\\/g, "/"),
          route: target.route,
          subject: target.subject,
          surface: `books-${target.subject}`,
          grade: target.grade,
          pageId: target.pageId,
          sectionIndex: sec.sectionIndex,
          sectionTotal: sec.sectionTotal,
          sectionTitle: sec.title,
          selectionReason: sec.analysis.selectionReason,
          matchedSignals: sec.analysis.matchedSignals.join(", "),
          pass,
          issue,
          suspectFile: pass === "PASS" ? "" : guessSuspectFile(target.subject, issues),
          viewport,
        });
        console.log(`${pass} ${id} [${sec.analysis.matchedSignals.join(", ")}]`);
      } catch (secErr) {
        rows.push({
          id: `book-${target.subject}-${target.grade}-${target.pageId}-s${sec.sectionIndex}`,
          screenshot: "",
          route: target.route,
          subject: target.subject,
          surface: `books-${target.subject}`,
          grade: target.grade,
          pageId: target.pageId,
          sectionIndex: sec.sectionIndex,
          sectionTotal: sec.sectionTotal,
          sectionTitle: sec.title,
          selectionReason: sec.analysis.selectionReason,
          matchedSignals: sec.analysis.matchedSignals.join(", "),
          pass: "FAIL",
          issue: secErr?.message || String(secErr),
          suspectFile: target.route,
          viewport,
        });
        console.log(`FAIL ${target.pageId} s${sec.sectionIndex}: ${secErr?.message}`);
      }
    }
  } catch (err) {
    rows.push({
      id: `book-${target.subject}-${target.grade}-${target.pageId}-error`,
      screenshot: "",
      route: target.route,
      subject: target.subject,
      surface: `books-${target.subject}`,
      grade: target.grade,
      pageId: target.pageId,
      sectionIndex: 0,
      sectionTotal: 0,
      sectionTitle: "",
      selectionReason: "",
      matchedSignals: "",
      pass: "FAIL",
      issue: err?.message || String(err),
      suspectFile: target.route,
      viewport,
    });
    console.log(`FAIL ${target.subject}/${target.grade}/${target.pageId}: ${err?.message}`);
  } finally {
    await page.close();
  }
}

// ── Practice setup helpers (from rtl-broad-audit) ──

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

async function runPracticeSetup(page, setup) {
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
    await page.waitForTimeout(1200);
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
    await pickOperation(page, "geometry-topic-select", ["triangle_area", "square_area"]);
    await confirmMixed(page);
    await page.getByTestId("geometry-start-game").click();
    await page.getByTestId("geometry-question-stem").waitFor({ timeout: 90_000 });
    const mcq = page.locator('[data-testid^="geometry-mcq-"]').first();
    if (await mcq.isVisible().catch(() => false)) await mcq.click();
    await page.waitForTimeout(1200);
    return;
  }
  if (setup.startsWith("science")) {
    await page.goto(`${ORIGIN}/learning/science-master`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await clickModeTab(page, /^תרגול$/u);
    await selectGradeLevel(page, { gradeValue: "4" });
    await pickOperation(page, "science-topic-select", ["materials", "measurements", "body"]);
    await confirmMixed(page);
    await page.getByTestId("science-start-game").click();
    await page.locator('[data-testid^="science-mcq-"], [data-testid="science-question-stem"]').first().waitFor({ timeout: 90_000 });
  }
}

async function capturePractice(ctx, target, viewport) {
  const page = await ctx.newPage();
  try {
    await mockStudent(page);
    await runPracticeSetup(page, target.setup);
    await page.waitForTimeout(1200);

    const stem = page.locator(
      '[data-testid="math-question-surface"], [data-testid="geometry-question-stem"], [data-testid^="science-"], [class*="learning"]'
    ).first();
    const text = ((await page.locator("body").innerText()) || "").trim();
    const analysis = analyzeRtlAuditPageText(text);

    if (!analysis.isRtlRelevant) {
      rows.push({
        id: `${target.id}-${viewport}`,
        screenshot: "",
        route: target.route,
        subject: target.subject,
        surface: target.surface,
        grade: "",
        pageId: "",
        sectionIndex: 0,
        sectionTotal: 0,
        sectionTitle: "",
        selectionReason: analysis.selectionReason,
        matchedSignals: analysis.matchedSignals.join(", "),
        pass: "SKIP",
        issue: "מסך תרגול ללא תוכן מתמטיקה מספק בטקסט",
        suspectFile: "",
        viewport,
      });
      console.log(`SKIP ${target.id} — low math signal`);
      return;
    }

    const blockers = [/Internal Server Error/i].filter((re) => re.test(text)).map(String);
    const issues = detectMixedMathRenderIssues(text);
    const { pass, issue } = gradePass(text, target.subject, issues, blockers);

    const filename = `${target.id}-${viewport}.png`;
    const shotPath = join(OUT, filename);
    await page.screenshot({ path: shotPath, fullPage: true });

    rows.push({
      id: `${target.id}-${viewport}`,
      screenshot: shotPath.replace(/\\/g, "/"),
      route: target.route,
      subject: target.subject,
      surface: target.surface,
      grade: "",
      pageId: "",
      sectionIndex: 0,
      sectionTotal: 0,
      sectionTitle: (await stem.textContent().catch(() => ""))?.slice(0, 80) || "",
      selectionReason: analysis.selectionReason,
      matchedSignals: analysis.matchedSignals.join(", "),
      pass,
      issue,
      suspectFile: pass === "PASS" ? "" : guessSuspectFile(target.subject, issues),
      viewport,
    });
    console.log(`${pass} ${target.id}`);
  } catch (err) {
    rows.push({
      id: `${target.id}-${viewport}`,
      screenshot: "",
      route: target.route,
      subject: target.subject,
      surface: target.surface,
      grade: "",
      pageId: "",
      sectionIndex: 0,
      sectionTotal: 0,
      sectionTitle: "",
      selectionReason: "",
      matchedSignals: "",
      pass: "FAIL",
      issue: err?.message || String(err),
      suspectFile: target.route,
      viewport,
    });
    console.log(`FAIL ${target.id}: ${err?.message}`);
  } finally {
    await page.close();
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

console.log(`\nRTL content audit — ${BOOK_TARGETS.length} book topics + ${PRACTICE_TARGETS.length} practice surfaces\n`);

for (const target of BOOK_TARGETS) {
  await captureBookTopic(mobileCtx, target, "mobile");
}

for (const target of PRACTICE_TARGETS) {
  await capturePractice(mobileCtx, target, "mobile");
}

// Desktop sample: one section per subject from first captured book topic
for (const subject of ["math", "geometry", "science"]) {
  const sample = BOOK_TARGETS.find((t) => t.subject === subject);
  if (sample) await captureBookTopic(desktopCtx, sample, "desktop");
}

await mobileCtx.close();
await desktopCtx.close();
await browser.close();

writeResults();

console.log(`\nWrote ${CSV_OUT}`);
console.log(
  `PASS ${rows.filter((r) => r.pass === "PASS").length} | REVIEW ${rows.filter((r) => r.pass === "REVIEW").length} | FAIL ${rows.filter((r) => r.pass === "FAIL").length} | SKIP ${rows.filter((r) => r.pass === "SKIP").length} | shots ${rows.filter((r) => r.screenshot).length}`
);
