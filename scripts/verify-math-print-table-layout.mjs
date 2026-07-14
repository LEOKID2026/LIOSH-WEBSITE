/**
 * One-off print DOM verification — emulates @media print in Chromium.
 * Run: node scripts/verify-math-print-table-layout.mjs
 */

import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { selectMathWorksheetQuestions } from "../lib/worksheets/worksheet-math-selector.server.js";
import {
  buildWorksheetPayload,
  worksheetPayloadToPreviewHtml,
} from "../lib/worksheets/worksheet-payload-build.server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PRINT_CSS = readFileSync(join(ROOT, "styles/worksheet-print.css"), "utf8");

const META = {
  titleHe: "דף עבודה — חיבור",
  subjectHe: "מתמטיקה",
  gradeHe: "כיתה ג׳",
  topicHe: "חיבור",
  levelHe: "רגיל",
  inkSave: false,
  subjectId: "math",
  gradeKey: "g3",
  topicKey: "addition",
  levelKey: "regular",
  mathPracticeFormat: "horizontal_add_sub",
};

async function buildPrintFixture(preferMcq) {
  const { questions: rawQuestions } = selectMathWorksheetQuestions({
    gradeKey: "g3",
    topicKey: "addition",
    levelKey: "regular",
    count: 12,
    seed: 88001,
    mathPracticeFormat: "horizontal_add_sub",
    preferMcq,
  });
  const payload = buildWorksheetPayload(rawQuestions, META, {
    subjectId: "math",
    mathPracticeFormat: "horizontal_add_sub",
    preferMcq,
  });
  const bodyHtml = worksheetPayloadToPreviewHtml(payload);
  const mainMatch = bodyHtml.match(/<main[\s\S]*?<\/main>/);
  const headerMatch = bodyHtml.match(/<header[\s\S]*?<\/header>/);
  return {
    preferMcq,
    mainHtml: mainMatch?.[0] ?? "",
    headerHtml: headerMatch?.[0] ?? "",
    questionCount: payload.questions.length,
  };
}

function wrapPreviewShell({ headerHtml, mainHtml }) {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>Math print verify</title>
  <style>${PRINT_CSS}</style>
</head>
<body class="worksheet-print-mode">
  <div class="worksheet-preview-shell">
    <div class="worksheet-screen-preview" data-test="screen-preview">
      <p>screen preview hidden in print</p>
    </div>
    <div class="worksheet-print-document" data-test="print-document">
      <article class="worksheet-root">
        ${headerHtml}
        ${mainHtml}
      </article>
    </div>
  </div>
</body>
</html>`;
}

async function verifyFixture(browser, fixture) {
  const html = wrapPreviewShell(fixture);
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  await page.emulateMedia({ media: "print" });

  const report = await page.evaluate(() => {
    const screen = document.querySelector(".worksheet-screen-preview");
    const printDoc = document.querySelector(".worksheet-print-document");
    const mathPages = document.querySelector(".worksheet-print-math-pages");
    const firstPage = document.querySelector(
      '.worksheet-print-page--math-cards[data-print-page="1"]'
    );
    const table = firstPage?.querySelector(".worksheet-print-math-table");
    const rows = table ? table.querySelectorAll("tbody > tr") : [];
    const cells = table ? table.querySelectorAll("tbody > tr > td") : [];
    const cards = firstPage ? firstPage.querySelectorAll(".worksheet-print-math-card") : [];
    const cardRow = document.querySelector(".worksheet-print-card-row");
    const screenStyle = screen ? getComputedStyle(screen).display : null;
    const printStyle = printDoc ? getComputedStyle(printDoc).display : null;
    const firstCardStyle = cards[0] ? getComputedStyle(cards[0]) : null;
    const tableStyle = table ? getComputedStyle(table) : null;

    return {
      screenHidden: screenStyle === "none",
      printVisible: printStyle === "block",
      hasMathPages: Boolean(mathPages),
      hasTable: Boolean(table),
      rowCount: rows.length,
      cellCount: cells.length,
      cardCount: cards.length,
      hasCardRow: Boolean(cardRow),
      firstCardMinHeight: firstCardStyle?.minHeight,
      firstCardHeight: firstCardStyle?.height,
      firstCardBorderBottom: firstCardStyle?.borderBottomWidth,
      firstCardBorderBottomStyle: firstCardStyle?.borderBottomStyle,
      tableBorderSpacing: tableStyle?.borderSpacing,
      layoutMode: mathPages?.getAttribute("data-print-layout") ?? null,
    };
  });

  await page.close();
  return report;
}

const browser = await chromium.launch({ headless: true });
try {
  for (const preferMcq of [false, true]) {
    const fixture = await buildPrintFixture(preferMcq);
    const report = await verifyFixture(browser, fixture);
    console.log(`\n=== preferMcq=${preferMcq} ===`);
    console.log(JSON.stringify(report, null, 2));

    const ok =
      report.screenHidden &&
      report.printVisible &&
      report.hasMathPages &&
      report.hasTable &&
      report.rowCount === 2 &&
      report.cellCount === 4 &&
      report.cardCount === 4 &&
      !report.hasCardRow &&
      report.layoutMode === "math-card-pages";

    if (!ok) {
      console.error("FAIL: print table layout verification failed");
      process.exitCode = 1;
    } else {
      console.log("PASS: 2×2 table with 4 bordered cards in print emulation");
    }
  }
} finally {
  await browser.close();
}
