/**
 * Runtime browser verification — trace SVG loads inline, single print page DOM.
 * Run: node tests/writing/writing-preview-runtime.test.mjs
 * Requires: dev server on PORT (default 3000) OR set WRITING_TEST_BASE_URL
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import { getReadyWritingBySlug } from "../../lib/writing/writing-ready-catalog.js";
import { generateWritingForParent } from "../../lib/writing/writing-generate.server.js";
import { buildReadyWritingPayload } from "../../lib/writing/writing-payload-build.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.WRITING_TEST_BASE_URL || "http://localhost:3001";
const PREVIEW_PATH = "/practice/worksheets/preview";
const PUBLIC_PREVIEW_KEY = "leo_worksheet_public_preview_v1";

/** @param {import("playwright").Page} page */
async function injectPreviewSession(page, worksheetPayload) {
  await page.goto(`${BASE}/practice/worksheets`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ payload, storageKey }) => {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          worksheetPayload: payload,
          generation: { seed: 1, worksheetType: "writing" },
          includeAnswers: false,
          source: "public-writing-demo",
          savedAt: Date.now(),
        })
      );
    },
    { payload: worksheetPayload, storageKey: PUBLIC_PREVIEW_KEY }
  );
  await page.goto(`${BASE}${PREVIEW_PATH}`, { waitUntil: "networkidle" });
  await page.waitForSelector(".writing-screen-page", { state: "attached", timeout: 20000 });
  for (const label of ["אישור", "Confirm", "OK"]) {
    const btn = page.getByRole("button", { name: label });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      break;
    }
  }
}

/** @param {import("playwright").Page} page */
async function assertTraceSvgsLoaded(page) {
  await page.waitForFunction(
    () => {
      const pending = document.querySelectorAll('[data-writing-trace-pending="true"]').length;
      const ready = document.querySelectorAll('[data-writing-trace-ready="true"]').length;
      const errors = document.querySelectorAll('[data-writing-trace-error="true"]').length;
      return pending === 0 && (ready > 0 || errors > 0);
    },
    undefined,
    { timeout: 20000 }
  );
  const errorText = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-writing-trace-error="true"]'))
      .map((el) => el.getAttribute("data-writing-trace-error-message") || el.textContent)
      .join("; ")
  );
  const errors = await page.$$('[data-writing-trace-error="true"]');
  assert.equal(errors.length, 0, `trace SVG load errors: ${errorText}`);
  const ready = await page.$$('[data-writing-trace-ready="true"]');
  assert.ok(ready.length > 0, "expected inline trace SVGs in preview");
  const inlinePaths = await page.$$('[data-writing-trace-ready="true"] svg path[stroke-dasharray]');
  assert.ok(inlinePaths.length > 0, "expected dashed path elements in inline SVG");
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  for (const [label, url] of [
    ["he-print aleph", `${BASE}/assets/writing/full-trace/he-print/aleph.svg`],
    ["he-script aleph", `${BASE}/assets/writing/full-trace/he-script/aleph.svg`],
    ["en-lower g", `${BASE}/assets/writing/full-trace/en-lower/g.svg`],
    ["digit 2", `${BASE}/assets/writing/full-trace/digits/digit-2.svg`],
    ["digit 5", `${BASE}/assets/writing/full-trace/digits/digit-5.svg`],
  ]) {
    const res = await page.goto(url, { waitUntil: "domcontentloaded" });
    assert.equal(res?.status(), 200, `${label} HTTP status`);
    const ct = res?.headers()["content-type"] || "";
    assert.match(ct, /svg/i, `${label} content-type`);
    const body = await page.content();
    assert.ok(body.includes("stroke-dasharray") || body.includes("<path"), `${label} SVG body`);
  }

  const readyEntry = getReadyWritingBySlug("writing-he-aleph-trace-standard");
  assert.ok(readyEntry);
  const readyPayload = buildReadyWritingPayload(readyEntry);

  const screenshotDir = path.resolve(__dirname, "../../docs/audits/writing-print-preview-qa");
  fs.mkdirSync(screenshotDir, { recursive: true });

  /** @type {Array<{ name: string, payload: import("../../lib/writing/writing-worksheet-types.js").WritingWorksheetPayload }>} */
  const samples = [
    { name: "he-aleph-print", payload: readyPayload },
    {
      name: "he-aleph-script",
      payload: generateWritingForParent({
        worksheetType: "writing",
        writingCategory: "hebrew_letters",
        characters: ["א"],
        scriptStyle: "script",
        tracingMode: "trace",
        traceRenderMode: "full_trace",
        nikudMode: "none",
        lineTemplate: "trace_row",
        lineCount: 4,
        itemsPerLine: 3,
        repeatsPerLine: 1,
        fontSize: "md",
        strokeStyle: "dashed",
        includeExample: false,
        includeCopyRows: false,
        includeIndependentRows: false,
        includeImage: false,
        includeNameField: false,
        includeDateField: false,
        pageOrientation: "portrait",
        pageDensity: "comfortable",
        inkSave: false,
      }).worksheetPayload,
    },
    {
      name: "en-lower-g",
      payload: generateWritingForParent({
        worksheetType: "writing",
        writingCategory: "english_letters",
        characters: ["g"],
        letterCase: "lower",
        scriptStyle: "print",
        tracingMode: "trace",
        traceRenderMode: "full_trace",
        nikudMode: "none",
        lineTemplate: "english_four_line",
        lineCount: 4,
        itemsPerLine: 3,
        repeatsPerLine: 1,
        fontSize: "md",
        strokeStyle: "dashed",
        includeExample: false,
        includeCopyRows: false,
        includeIndependentRows: false,
        includeImage: false,
        includeNameField: false,
        includeDateField: false,
        pageOrientation: "portrait",
        pageDensity: "comfortable",
        inkSave: false,
      }).worksheetPayload,
    },
    {
      name: "digit-2-5",
      payload: generateWritingForParent({
        worksheetType: "writing",
        writingCategory: "numbers",
        numberRange: { min: 2, max: 5 },
        numberMode: "digit",
        tracingMode: "trace",
        traceRenderMode: "full_trace",
        nikudMode: "none",
        lineTemplate: "number_cell",
        lineCount: 4,
        itemsPerLine: 1,
        repeatsPerLine: 1,
        fontSize: "md",
        strokeStyle: "dashed",
        includeExample: false,
        includeCopyRows: false,
        includeIndependentRows: false,
        includeImage: false,
        includeNameField: false,
        includeDateField: false,
        pageOrientation: "portrait",
        pageDensity: "comfortable",
        inkSave: false,
      }).worksheetPayload,
    },
  ];

  for (const sample of samples) {
    const samplePage = await browser.newPage();
    try {
      await injectPreviewSession(samplePage, sample.payload);
      await assertTraceSvgsLoaded(samplePage);
      const printPageCount = await samplePage.evaluate(() => {
        return document.querySelectorAll(".writing-print-document .writing-print-page").length;
      });
      assert.equal(printPageCount, sample.payload.pages.length, `${sample.name} print DOM pages`);
      await samplePage.emulateMedia({ media: "screen" });
      await samplePage.screenshot({
        path: path.join(screenshotDir, `${sample.name}-screen.png`),
        fullPage: true,
      });
      await samplePage.emulateMedia({ media: "print" });
      await samplePage.screenshot({
        path: path.join(screenshotDir, `${sample.name}-print.png`),
        fullPage: true,
      });
    } finally {
      await samplePage.close();
    }
  }

  console.log("writing-preview-runtime.test.mjs OK (Playwright trace load + 1 print page DOM)");
} finally {
  await browser.close();
}
