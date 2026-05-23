#!/usr/bin/env node
/**
 * Phase C.1 — Parent PDF / print proof (Playwright).
 * Requires a running dev server unless QA_BASE_URL points to a deployed instance.
 *
 * Proof:
 * - DOM: wait for `.parent-report-parent-ai-insight` (deterministic insight paints before async enrich).
 * - Print CSS: `.no-pdf` regions (incl. Parent Copilot) are display:none; insight is not hidden.
 * - Bytes: generated PDF contains Parent AI insight fingerprint (see
 *   `scripts/lib/parent-report-pdf-insight-fingerprint.mjs`) via pdf-parse text extraction.
 *
 * Usage: QA_BASE_URL=http://127.0.0.1:3001 npx tsx scripts/qa-parent-pdf-export.mjs
 */
import fs from "fs";
import path from "path";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { PDFParse } from "pdf-parse";
import {
  domInsightCardShowsParentAiHeading,
  pdfTextContainsParentAiInsightFingerprint,
} from "./lib/parent-report-pdf-insight-fingerprint.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const { buildRealGradeSplitRegressionBaseReport } = await import(
  pathToFileURL(join(__dirname, "fixtures", "parent-report-real-regression-payload.mjs")).href
);
const { baseReportToLocalStorageSnapshot } = await import(
  pathToFileURL(join(__dirname, "lib", "base-report-to-local-storage.mjs")).href
);

/** Regression-shaped localStorage — enough volume for detailed report + deterministic Parent AI insight. */
const QA_STORAGE_SNAPSHOT = baseReportToLocalStorageSnapshot(
  buildRealGradeSplitRegressionBaseReport(),
  "PDFQA"
);

const base = process.env.QA_BASE_URL || "http://127.0.0.1:3001";
/** Brief settle after route navigation — avoids Next dev compile/HMR racing insight wait (Wave 3C). */
const settleMs = Math.max(0, Number(process.env.QA_PDF_SETTLE_MS) || 1500);
const insightTimeoutMs = Math.max(5_000, Number(process.env.QA_PDF_INSIGHT_TIMEOUT_MS) || 90_000);

function logStep(message) {
  console.log(`qa-parent-pdf-export: ${message}`);
}

/** pdf-parse v2 (ESM): no default export; use PDFParse like scripts/hebrew-official-extract-excerpts.mjs */
async function extractPdfText(buf) {
  const parser = new PDFParse({ data: buf });
  try {
    const textResult = await parser.getText();
    return String(textResult?.text || "");
  } finally {
    await parser.destroy?.();
  }
}

const outDir = path.resolve(process.cwd(), "qa-visual-output");

async function assertDevServerReachable(baseUrl) {
  const root = String(baseUrl || "").replace(/\/$/, "");
  const url = `${root}/learning/parent-report-detailed`;
  let lastErr = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 20_000);
    try {
      const res = await fetch(url, { method: "GET", redirect: "follow", signal: ac.signal });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      logStep(`dev server reachable (${url}) after ${attempt + 1} attempt(s)`);
      return;
    } catch (e) {
      lastErr = e?.name === "AbortError" ? new Error("timeout") : e;
      await new Promise((r) => setTimeout(r, attempt < 3 ? 800 : 1500));
    } finally {
      clearTimeout(timer);
    }
  }
  const msg = lastErr ? String(lastErr.message || lastErr) : "unknown";
  throw new Error(
    `QA PDF gate cannot reach ${url} (${msg}). Start Next dev (e.g. npm run dev), wait for Ready, then set QA_BASE_URL if not using default port.`
  );
}

/**
 * @param {import('playwright').Page} page
 * @param {string} label
 */
async function dumpInsightWaitDiagnostics(page, label) {
  const diag = await page.evaluate(() => ({
    url: location.href,
    printRoot: !!document.querySelector("#parent-report-detailed-print"),
    displayMode: document.querySelector("#parent-report-detailed-print")?.getAttribute("data-display-mode") || null,
    insightCount: document.querySelectorAll(".parent-report-parent-ai-insight").length,
    bodyLen: (document.body?.innerText || "").length,
  }));
  console.error(`qa-parent-pdf-export: ${label} insight wait failed — ${JSON.stringify(diag)}`);
}

/**
 * Navigate to a parent-report route and wait for print root + Parent AI insight.
 * @param {import('playwright').Page} page
 * @param {string} routeUrl
 * @param {string} label
 */
async function gotoReportRouteAndWaitForInsight(page, routeUrl, label) {
  logStep(`${label}: goto ${routeUrl}`);
  await page.goto(routeUrl, { waitUntil: "load", timeout: 120_000 });
  if (settleMs > 0) {
    await page.waitForTimeout(settleMs);
  }
  const printRoot = page.locator("#parent-report-detailed-print");
  if ((await printRoot.count()) > 0) {
    await printRoot.first().waitFor({ state: "attached", timeout: insightTimeoutMs });
  }
  try {
    await page.locator(".parent-report-parent-ai-insight").first().waitFor({
      state: "attached",
      timeout: insightTimeoutMs,
    });
  } catch (err) {
    await dumpInsightWaitDiagnostics(page, label);
    throw err;
  }
  logStep(`${label}: insight attached`);
}

/** @param {Record<string, string>} snap */
function applyStorageSnapshot(snap) {
  try {
    for (const [key, value] of Object.entries(snap || {})) {
      if (value == null) continue;
      localStorage.setItem(key, typeof value === "string" ? value : String(value));
    }
  } catch {
    // ignore seeding errors in QA context
  }
}

/**
 * @param {Buffer} buf
 * @param {string} label
 */
async function assertPdfBufferContainsInsightHeading(buf, label) {
  const raw = await extractPdfText(buf);
  assert.ok(
    pdfTextContainsParentAiInsightFingerprint(raw),
    `${label}: extracted PDF text must include Parent AI insight (heading or structured provenance; see parent-report-pdf-insight-fingerprint.mjs)`,
  );
}

/** Copilot panel uses this placeholder; it must not appear in exported PDF text (Phase C.1). */
async function assertPdfBufferExcludesCopilotPlaceholder(buf, label) {
  const t = await extractPdfText(buf);
  assert.ok(!t.includes("שאלה על הדוח"), `${label}: PDF text must not include Parent Copilot chat placeholder`);
}

/**
 * Detailed report: insight mounted + Copilot wrapper uses `.no-pdf` (hidden in print).
 * @param {import('playwright').Page} page
 * @param {string} label
 */
async function assertDetailedInsightAndCopilotPrintBehavior(page, label) {
  const card = page.locator(".parent-report-parent-ai-insight").first();
  await card.waitFor({ state: "attached", timeout: insightTimeoutMs });
  assert.ok(
    domInsightCardShowsParentAiHeading(await card.innerText()),
    `${label}: insight card must show heading תובנה להורה or סיכום חכם להורה`,
  );

  await page.emulateMedia({ media: "print" });
  const printStats = await page.evaluate(() => {
    const noPdf = Array.from(document.querySelectorAll(".no-pdf"));
    const displays = noPdf.map((n) => window.getComputedStyle(n).display);
    const hiddenOk = displays.length > 0 && displays.every((d) => d === "none");
    const insightEl = document.querySelector(".parent-report-parent-ai-insight");
    const insightDisplay = insightEl ? window.getComputedStyle(insightEl).display : "missing";
    return { noPdfCount: noPdf.length, hiddenOk, insightDisplay };
  });
  assert.ok(printStats.hiddenOk, `${label}: all .no-pdf regions must be display:none in print (${JSON.stringify(printStats)})`);
  assert.notEqual(printStats.insightDisplay, "none", `${label}: insight must not be hidden in print`);

  await page.emulateMedia({ media: "screen" });
}

/** Short report: wait for insight (async enrich may still apply; often fast). */
async function assertShortInsightVisible(page, label) {
  const insight = page.locator(".parent-report-parent-ai-insight").first();
  await insight.waitFor({ state: "attached", timeout: insightTimeoutMs });
  const txt = await insight.innerText();
  assert.ok(domInsightCardShowsParentAiHeading(txt), `${label}: short report insight heading`);
}

async function main() {
  await assertDevServerReachable(base);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "he-IL" });
  await context.addInitScript(applyStorageSnapshot, QA_STORAGE_SNAPSHOT);
  const page = await context.newPage();
  /** Warm origin + re-apply seed so localStorage is populated before the detailed route reads it. */
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.evaluate((data) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(data || {})) {
      if (v == null) continue;
      localStorage.setItem(k, typeof v === "string" ? v : String(v));
    }
  }, QA_STORAGE_SNAPSHOT);

  const pdfOpts = {
    format: "A4",
    printBackground: true,
    margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
    preferCSSPageSize: true,
  };

  /** month window keeps regression fixture sessions in-range (same as learning-simulator pdf gate). */
  await gotoReportRouteAndWaitForInsight(
    page,
    `${base}/learning/parent-report-detailed?period=month`,
    "detailed-full",
  );
  await assertDetailedInsightAndCopilotPrintBehavior(page, "detailed-full");
  /* Playwright PDF uses current media; assert* ends in screen mode — re-enter print so .no-pdf applies. */
  await page.emulateMedia({ media: "print" });
  let buf = await page.pdf({ ...pdfOpts });
  const fullPath = path.join(outDir, "parent-detailed-full.pdf");
  fs.writeFileSync(fullPath, buf);
  await assertPdfBufferContainsInsightHeading(buf, "detailed-full pdf");
  await assertPdfBufferExcludesCopilotPlaceholder(buf, "detailed-full pdf");

  await gotoReportRouteAndWaitForInsight(
    page,
    `${base}/learning/parent-report-detailed?period=month&mode=summary`,
    "detailed-summary",
  );
  await assertDetailedInsightAndCopilotPrintBehavior(page, "detailed-summary");
  await page.emulateMedia({ media: "print" });
  buf = await page.pdf({ ...pdfOpts });
  const summaryPath = path.join(outDir, "parent-detailed-summary.pdf");
  fs.writeFileSync(summaryPath, buf);
  await assertPdfBufferContainsInsightHeading(buf, "detailed-summary pdf");
  await assertPdfBufferExcludesCopilotPlaceholder(buf, "detailed-summary pdf");

  logStep("short-report: goto");
  await page.goto(`${base}/learning/parent-report?period=month`, {
    waitUntil: "load",
    timeout: 120_000,
  });
  if (settleMs > 0) {
    await page.waitForTimeout(settleMs);
  }
  try {
    await assertShortInsightVisible(page, "short-report");
  } catch (err) {
    await dumpInsightWaitDiagnostics(page, "short-report");
    throw err;
  }
  logStep("short-report: insight attached");
  await page.emulateMedia({ media: "print" });
  buf = await page.pdf({ ...pdfOpts });
  const parentPath = path.join(outDir, "parent-report-main.pdf");
  fs.writeFileSync(parentPath, buf);
  await assertPdfBufferContainsInsightHeading(buf, "short-report pdf");
  await assertPdfBufferExcludesCopilotPlaceholder(buf, "short-report pdf");

  await browser.close();
  console.log("Phase C.1 PDF gate OK", fullPath, summaryPath, parentPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
