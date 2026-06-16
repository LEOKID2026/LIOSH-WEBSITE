#!/usr/bin/env node
/**
 * Diagnose place-value order for math:g2:ns_place_tens_units section 3.
 * Run: node scripts/repair/diagnose-place-value-order.mjs
 * Optional screenshot: PLAYWRIGHT_BASE_URL=http://localhost:3100 node scripts/repair/diagnose-place-value-order.mjs --screenshot
 */
import fs from "fs";
import path from "path";
import { loadLearningBookPage } from "../../lib/learning-book/load-learning-book-pages.js";
import {
  MATH_G2_BOOK_META,
  MATH_G2_BOOK_BATCHES,
  MATH_G2_PAGE_ORDER,
  getMathG2PageNeighbors,
  isValidMathG2PageId,
} from "../../lib/learning-book/math-g2-registry.js";
import { classifyBookLine } from "../../lib/learning-book/book-line-classifier.js";
import { splitMixedHebrewMathRuns } from "../../lib/bidi/mixed-hebrew-math-runs.js";
import { describeMixedMathDomContract } from "../../lib/bidi/describe-mixed-math-dom.js";
import { flattenMixedHebrewMathVisibleText } from "../../lib/learning-book/book-visible-text-render.js";
import { canonicalizePlaceValueDecomposition } from "../../lib/learning-book/place-value-equation-order.js";

const ROUTE = "/learning/book/math/g2/ns_place_tens_units";
const PAGE_ID = "ns_place_tens_units";
const SECTION_INDEX = 3;

const g2Registry = {
  batches: MATH_G2_BOOK_BATCHES,
  pageOrder: MATH_G2_PAGE_ORDER,
  meta: MATH_G2_BOOK_META,
  getPageNeighbors: getMathG2PageNeighbors,
  isValidPageId: isValidMathG2PageId,
};

const page = loadLearningBookPage(g2Registry, PAGE_ID);
const section = page.sections[SECTION_INDEX - 1];

/** @param {string} body */
function extractSectionLines(body) {
  return String(body || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const sectionLines = extractSectionLines(section?.body);
const outDir = path.join("docs", "repair");
fs.mkdirSync(outDir, { recursive: true });

/** @type {Record<string, unknown>[]} */
const lineReports = [];

for (const sourceRaw of sectionLines) {
  if (!/124|405|100 \+ 20|400 \+ 0|236 =|200 \+ 30/.test(sourceRaw)) continue;

  const kind = classifyBookLine(sourceRaw);
  lineReports.push({
    sourceRaw,
    route: ROUTE,
    pageIndex: SECTION_INDEX,
    renderer: kind,
    parsedBeforeRenderer: splitMixedHebrewMathRuns(sourceRaw),
    canonicalized: canonicalizePlaceValueDecomposition(sourceRaw),
    domAfterRenderer: describeMixedMathDomContract(sourceRaw).nodes,
    visibleTextAfterRenderer: flattenMixedHebrewMathVisibleText(sourceRaw),
    sourceWasTotalFirst: /^\s*-?\s*\d[\d,]*\s*=\s*\d+\s*\+/.test(
      sourceRaw.replace(/^[-•*]\s+/, "")
    ),
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  route: ROUTE,
  pageId: PAGE_ID,
  sectionIndex: SECTION_INDEX,
  sectionTitle: section?.title,
  finding:
    "Historical source used total-first (124 = 100 + 20 + 4). Root cause: draft template + BookPlaceValueEquation rendered {total} = {terms}. Fixed: canonicalizePlaceValueDecomposition at mathRun(), BookPlaceValueEquation renders terms-first, drafts corrected.",
  lines: lineReports,
};

const jsonPath = path.join(outDir, "place-value-order-diagnostic.json");

if (process.argv.includes("--screenshot")) {
  const { chromium, devices } = await import("playwright");
  const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100";
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "he-IL" });
  const pg = await ctx.newPage();
  await pg.route("**/api/student/me", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: { id: "diag", full_name: "diag", grade_level: 2 },
      }),
    })
  );
  await pg.goto(`${base}${ROUTE}`, { waitUntil: "load", timeout: 90000 });
  await pg.waitForTimeout(1500);
  const nextBtn = pg.getByRole("button", { name: "עמוד הבא" });
  for (let i = 1; i < SECTION_INDEX; i += 1) {
    await nextBtn.click();
    await pg.waitForTimeout(600);
  }
  await pg.waitForSelector('[data-book-place-value-equation="true"]', {
    timeout: 15000,
  }).catch(() => null);
  report.visualDomText = await pg
    .locator('[data-book-place-value-equation="true"]')
    .allTextContents();
  const shot = path.join(outDir, "place-value-g2-section3-mobile.png");
  await pg.screenshot({ path: shot, fullPage: true });
  report.screenshotPath = shot;
  await browser.close();
  console.log(`Screenshot: ${shot}`);
  console.log(`Visual DOM text: ${JSON.stringify(report.visualDomText)}`);
}

fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log(`Wrote ${jsonPath}`);
