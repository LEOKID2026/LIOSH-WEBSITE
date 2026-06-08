#!/usr/bin/env node
/**
 * Independent verification: reads ONLY PDFs extracted from the final ZIP.
 * No DB, API, manifest, or loose export-folder paths.
 *
 * Usage:
 *   node scripts/qa/parent-report-q2e-monthly-realistic-zip-independent-verify.mjs <path-to.zip>
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
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

/** Parse only the page-1 summary header block (before subject sections). */
function parseSummaryHeader(text) {
  const page1 = text.split(/--\s*1 of/i)[0] || text.slice(0, 3000);
  const header = page1.slice(0, 3000);
  const dateRange = header.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
  const afterTotal = header.split(/זמן\s*כולל/i)[1]?.slice(0, 500) || "";
  const minutes =
    afterTotal.match(/['׳]?דק\s*['']?\s*(\d{1,4})/)?.[1] ||
    afterTotal.match(/(\d{1,4})\s*['׳]?דק/)?.[1] ||
    null;
  const qBlock = header.split(/שאלות/i)[1]?.slice(0, 80) || "";
  const questions = qBlock.match(/^\s*(\d{1,4})/m)?.[1] || null;
  return {
    dateRange: dateRange ? `${dateRange[1]} - ${dateRange[2]}` : null,
    summaryQuestions: questions != null ? Number(questions) : null,
    summaryMinutes: minutes != null ? Number(minutes) : null,
    hasInactivityWarning: page1.includes(INACTIVITY),
    headerSnippet: header.replace(/\s+/g, " ").slice(0, 1000),
    contains83: /\b83\b/.test(page1),
    contains42: /\b42\b/.test(page1),
  };
}

async function main() {
  const raw = await readFile(zipPath);
  const sha256 = createHash("sha256").update(raw).digest("hex").toUpperCase();
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "parent-report-zip-ind-"));
  const reportDir = path.join(path.dirname(zipPath), "independent-zip-verify");
  await rm(reportDir, { recursive: true, force: true }).catch(() => {});
  await mkdir(reportDir, { recursive: true });

  execSync(
    `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tmpDir.replace(/'/g, "''")}' -Force"`,
    { stdio: "pipe" }
  );

  const allPdfs = (await walkPdfs(tmpDir)).sort();
  const shortReports = allPdfs.filter((f) => f.includes("short-report"));
  const results = [];

  for (const entry of shortReports) {
    const buf = await readFile(path.join(tmpDir, entry));
    const text = await extractPdfText(buf);
    const parsed = parseSummaryHeader(text);
    results.push({
      entry,
      bytes: buf.length,
      ...parsed,
      passRealistic:
        parsed.summaryQuestions >= 150 &&
        parsed.summaryMinutes >= 250 &&
        !parsed.hasInactivityWarning &&
        parsed.dateRange?.includes("01/04/2026") &&
        parsed.dateRange?.includes("30/04/2026"),
    });
  }

  const aaa1 = results.find((r) => r.entry.includes("AAA1/"));
  if (aaa1) {
    await writeFile(path.join(reportDir, "AAA1_short-report_header1000.txt"), aaa1.headerSnippet, "utf8");
  }

  const report = {
    verifiedAt: new Date().toISOString(),
    method: "zip-extract-temp-only",
    zipPath,
    zipSizeBytes: raw.length,
    sha256,
    zipEntryCount: allPdfs.length,
    zipEntries: allPdfs,
    shortReportResults: results,
    passCount: results.filter((r) => r.passRealistic).length,
  };

  const outJson = path.join(reportDir, "independent-zip-verify.json");
  await writeFile(outJson, JSON.stringify(report, null, 2), "utf8");

  console.log("=== Independent ZIP PDF verification ===");
  console.log(`ZIP: ${zipPath}`);
  console.log(`Size: ${report.zipSizeBytes}`);
  console.log(`SHA256: ${sha256}`);
  console.log(`Entries: ${allPdfs.length}`);
  console.log("");
  if (aaa1) {
    console.log("=== AAA1 short-report header (first ~1000 chars from extracted PDF) ===");
    console.log(aaa1.headerSnippet);
    console.log("");
    console.log(`Parsed summary: ${aaa1.summaryQuestions} questions, ${aaa1.summaryMinutes} minutes`);
    console.log(`Inactivity warning in page-1 text: ${aaa1.hasInactivityWarning ? "YES" : "no"}`);
    console.log(`Page-1 contains literal 83/42: ${aaa1.contains83}/${aaa1.contains42}`);
    console.log("");
  }
  console.log("| Student | Summary Q | Summary min | Date | Inactivity | 83 on p1 | PASS |");
  console.log("|---------|-----------|-------------|------|------------|----------|------|");
  for (const r of results) {
    const student = r.entry.split("/")[0];
    console.log(
      `| ${student} | ${r.summaryQuestions ?? "?"} | ${r.summaryMinutes ?? "?"} | ${r.dateRange ?? "?"} | ${r.hasInactivityWarning ? "YES" : "no"} | ${r.contains83 ? "yes" : "no"} | ${r.passRealistic ? "yes" : "NO"} |`
    );
  }
  console.log(`\nWrote ${outJson}`);

  await rm(tmpDir, { recursive: true, force: true });
  if (report.passCount !== 12 || allPdfs.length !== 36) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
