#!/usr/bin/env node
/**
 * Independent ZIP PDF verification — reads ONLY PDFs extracted from the given ZIP.
 * No DB, API, manifest, or loose export-folder reuse.
 *
 * Usage:
 *   node scripts/qa/parent-report-q2e-monthly-realistic-zip-independent-verify.mjs <path-to.zip>
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const INACTIVITY = "לא הייתה פעילות לאחרונה";

const zipArg = process.argv[2];
if (!zipArg) {
  console.error("Usage: node ...-zip-independent-verify.mjs <path-to.zip>");
  process.exit(1);
}

const zipPath = path.isAbsolute(zipArg) ? zipArg : path.join(ROOT, zipArg);

async function walkPdfs(dir, base = dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const full = path.join(dir, name);
    const st = await stat(full);
    if (st.isDirectory()) out.push(...(await walkPdfs(full, base)));
    else if (name.toLowerCase().endsWith(".pdf")) out.push(path.relative(base, full).replace(/\\/g, "/"));
  }
  return out;
}

async function extractPdfText(buf) {
  const parser = new PDFParse({ data: buf });
  try {
    const textResult = await parser.getText();
    return String(textResult?.text || "");
  } finally {
    await parser.destroy?.();
  }
}

/** Extract summary-block totals as they appear near "זמן כולל" on page 1. */
function extractSummaryHeader(text) {
  const header = text.slice(0, 2500);
  const dateRange = header.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
  const afterTotalTime = header.split(/זמן\s*כולל/i)[1]?.slice(0, 400) || header.slice(0, 400);
  const minutes =
    afterTotalTime.match(/['׳]?דק\s*(\d{1,4})/)?.[1] ||
    afterTotalTime.match(/(\d{1,4})\s*['׳]?דק/)?.[1] ||
    null;
  const afterQuestions = header.split(/שאלות/i)[1]?.slice(0, 120) || "";
  const questions =
    afterQuestions.match(/^[\s\n\r]*(\d{1,4})/)?.[1] ||
    header.match(/שאלות[\s\n\r]*(\d{1,4})/)?.[1] ||
    null;
  return {
    dateRange: dateRange ? `${dateRange[1]} - ${dateRange[2]}` : null,
    summaryMinutes: minutes != null ? Number(minutes) : null,
    summaryQuestions: questions != null ? Number(questions) : null,
    hasInactivityWarning: text.includes(INACTIVITY),
    headerSnippet: header.replace(/\s+/g, " ").slice(0, 1000),
  };
}

async function renderPage1(pdfPath, pngPath) {
  try {
    execSync(
      `npx --yes pdf-to-img "${pdfPath.replace(/"/g, '\\"')}" --output "${path.dirname(pngPath).replace(/"/g, '\\"')}" --format png --pages 1`,
      { stdio: "pipe", cwd: ROOT, timeout: 120_000 }
    );
  } catch {
    /* fallback below */
  }
  const base = path.basename(pdfPath, ".pdf");
  const candidates = [
    pngPath,
    path.join(path.dirname(pngPath), `${base}-1.png`),
    path.join(path.dirname(pngPath), `${base}_1.png`),
    path.join(path.dirname(pngPath), "page-1.png"),
  ];
  for (const c of candidates) {
    try {
      await stat(c);
      return c;
    } catch {
      /* try playwright */
    }
  }
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`file:///${pdfPath.replace(/\\/g, "/")}`, { waitUntil: "load", timeout: 60_000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: pngPath, fullPage: false });
    await browser.close();
    return pngPath;
  } catch (err) {
    return null;
  }
}

async function main() {
  const raw = await readFile(zipPath);
  const sha256 = createHash("sha256").update(raw).digest("hex").toUpperCase();
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "parent-report-zip-ind-"));
  const reportDir = path.join(path.dirname(zipPath), "independent-zip-verify");
  await rm(reportDir, { recursive: true, force: true }).catch(() => {});
  await mkdtemp(reportDir + path.sep).catch(async () => {
    await import("node:fs/promises").then(({ mkdir }) => mkdir(reportDir, { recursive: true }));
  });

  execSync(
    `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tmpDir.replace(/'/g, "''")}' -Force"`,
    { stdio: "pipe" }
  );

  const allPdfs = (await walkPdfs(tmpDir)).sort();
  const shortReports = allPdfs.filter((f) => f.includes("short-report"));
  const results = [];

  for (const entry of shortReports) {
    const pdfPath = path.join(tmpDir, entry);
    const buf = await readFile(pdfPath);
    const text = await extractPdfText(buf);
    const summary = extractSummaryHeader(text);
    results.push({
      entry,
      bytes: buf.length,
      ...summary,
    });
  }

  const aaa1 = results.find((r) => r.entry.includes("AAA1/"));
  let page1Png = null;
  if (aaa1) {
    const aaa1Path = path.join(tmpDir, aaa1.entry);
    page1Png = path.join(reportDir, "AAA1_2026-04_short-report_page1.png");
    await renderPage1(aaa1Path, page1Png).catch(() => null);
    await writeFile(path.join(reportDir, "AAA1_short-report_first1000.txt"), aaa1.headerSnippet, "utf8");
  }

  const out = {
    verifiedAt: new Date().toISOString(),
    method: "independent-zip-extract-only",
    zipPath,
    zipSizeBytes: raw.length,
    sha256,
    zipEntryCount: allPdfs.length,
    zipEntries: allPdfs,
    shortReportResults: results,
    aaa1Page1Screenshot: page1Png,
  };
  const outJson = path.join(reportDir, "independent-zip-verify.json");
  await writeFile(outJson, JSON.stringify(out, null, 2), "utf8");

  console.log("=== Independent ZIP verification ===");
  console.log(`ZIP: ${zipPath}`);
  console.log(`Size: ${raw.length}`);
  console.log(`SHA256: ${sha256}`);
  console.log(`PDF entries: ${allPdfs.length}`);
  console.log("");
  if (aaa1) {
    console.log("=== AAA1 short-report — first ~1000 chars (pdf-parse) ===");
    console.log(aaa1.headerSnippet);
    console.log("");
    console.log(`Summary header parse: questions=${aaa1.summaryQuestions} minutes=${aaa1.summaryMinutes}`);
    console.log(`Inactivity warning: ${aaa1.hasInactivityWarning ? "YES" : "no"}`);
    console.log(`Page-1 screenshot: ${page1Png || "not rendered"}`);
    console.log("");
  }
  console.log("| Student | Summary Q | Summary min | Date | Inactivity |");
  console.log("|---------|-----------|-------------|------|------------|");
  for (const r of results) {
    const student = r.entry.split("/")[0];
    console.log(
      `| ${student} | ${r.summaryQuestions ?? "?"} | ${r.summaryMinutes ?? "?"} | ${r.dateRange ?? "?"} | ${r.hasInactivityWarning ? "YES" : "no"} |`
    );
  }
  console.log(`\nWrote ${outJson}`);

  await rm(tmpDir, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
