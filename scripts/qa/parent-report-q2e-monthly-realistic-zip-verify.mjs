#!/usr/bin/env node
/**
 * Verify parent-report PDF content directly from a ZIP archive (not DB / not loose folders).
 *
 * Usage:
 *   node scripts/qa/parent-report-q2e-monthly-realistic-zip-verify.mjs <path-to.zip>
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
  console.error("Usage: node scripts/qa/parent-report-q2e-monthly-realistic-zip-verify.mjs <path-to.zip>");
  process.exit(1);
}

const zipPath = path.isAbsolute(zipArg) ? zipArg : path.join(ROOT, zipArg);

function parsePdfMinutes(text) {
  const totalBlock =
    text.match(/זמן\s*כולל[\s\S]{0,120}?['׳]?דק\s*(\d{2,4})/) ||
    text.match(/זמן\s*כולל[\s\S]{0,120}?(\d{2,4})\s*['׳]?דק/);
  if (totalBlock) return Number(totalBlock[1]);
  const m =
    text.match(/['׳]?דק\s*(\d{2,4})/) ||
    text.match(/דק['׳]\s*(\d{2,4})/) ||
    text.match(/(\d{2,4})\s*['׳]?דק[^\d]{0,20}שעות/);
  return m ? Number(m[1]) : null;
}

function parsePdfQuestionCount(text) {
  const block =
    text.match(/זמן\s*כולל[\s\S]{0,200}?שאלות[\s\n\r]*(\d{2,4})/) ||
    text.match(/שאלות[\s\n\r]*(\d{2,4})/);
  return block ? Number(block[1]) : null;
}

function parseDateRange(text) {
  const m = text.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
  return m ? `${m[1]} - ${m[2]}` : null;
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

async function walkPdfs(dir, base = dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const full = path.join(dir, name);
    const st = await stat(full);
    if (st.isDirectory()) {
      out.push(...(await walkPdfs(full, base)));
    } else if (name.toLowerCase().endsWith(".pdf")) {
      out.push(path.relative(base, full).replace(/\\/g, "/"));
    }
  }
  return out;
}

async function main() {
  const raw = await readFile(zipPath);
  const sha256 = createHash("sha256").update(raw).digest("hex").toUpperCase();
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "parent-report-zip-verify-"));
  try {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tmpDir.replace(/'/g, "''")}' -Force"`,
      { stdio: "pipe" }
    );
    const allFilenames = (await walkPdfs(tmpDir)).sort();
    const shortReports = allFilenames.filter((f) => f.includes("short-report"));
    const results = [];

    for (const entry of shortReports) {
      const buf = await readFile(path.join(tmpDir, entry));
      const text = await extractPdfText(buf);
      const pdfQuestions = parsePdfQuestionCount(text);
      const pdfMinutes = parsePdfMinutes(text);
      results.push({
        entry,
        bytes: buf.length,
        pdfQuestions,
        pdfMinutes,
        dateRange: parseDateRange(text),
        hasInactivityWarning: text.includes(INACTIVITY),
        passRealistic:
          pdfQuestions >= 150 &&
          pdfMinutes >= 250 &&
          !text.includes(INACTIVITY) &&
          text.includes("01/04/2026") &&
          text.includes("30/04/2026"),
      });
    }

    const report = {
      verifiedAt: new Date().toISOString(),
      zipPath,
      zipSizeBytes: raw.length,
      sha256,
      totalPdfEntries: allFilenames.length,
      expectedPdfEntries: 36,
      allFilenames,
      shortReportResults: results,
      passCount: results.filter((r) => r.passRealistic).length,
      shortReportCount: results.length,
    };

    const outPath = path.join(
      path.dirname(zipPath),
      `${path.basename(zipPath, ".zip")}-zip-content-verification.json`
    );
    await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

    console.log(`ZIP: ${zipPath}`);
    console.log(`Size: ${report.zipSizeBytes} bytes`);
    console.log(`SHA256: ${sha256}`);
    console.log(`PDF entries: ${report.totalPdfEntries}/36`);
    console.log(`Short reports: ${report.shortReportCount}/12`);
    console.log(`Realistic content PASS: ${report.passCount}/${report.shortReportCount}`);
    console.log("");
    console.log("Filenames in ZIP:");
    for (const f of allFilenames) console.log(`  ${f}`);
    console.log("");
    console.log("| Student | Questions | Minutes | Date range | Inactivity warn | PASS |");
    console.log("|---------|-----------|---------|------------|-----------------|------|");
    for (const r of results) {
      const student = r.entry.split("/")[0];
      console.log(
        `| ${student} | ${r.pdfQuestions ?? "?"} | ${r.pdfMinutes ?? "?"} | ${r.dateRange ?? "?"} | ${r.hasInactivityWarning ? "YES" : "no"} | ${r.passRealistic ? "yes" : "NO"} |`
      );
    }
    console.log(`\nWrote ${outPath}`);

    if (report.totalPdfEntries !== 36 || report.passCount !== 12) {
      process.exit(1);
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
