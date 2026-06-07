#!/usr/bin/env node
/**
 * Post-hoc PDF content verification for realistic monthly export pack.
 * Run: node scripts/qa/parent-report-q2e-monthly-realistic-pdf-content-verify.mjs
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const exportDirArg = process.argv.find((a) => a.startsWith("--export-dir="))?.split("=")[1];
const EXPORT_ROOT = exportDirArg
  ? path.resolve(ROOT, exportDirArg)
  : path.join(ROOT, "docs/qa/_artifacts/parent-report-q2e-monthly-realistic/pdf-export");
const INACTIVITY_PHRASE = "לא הייתה פעילות לאחרונה";

async function extractPdfText(buf) {
  const parser = new PDFParse({ data: buf });
  try {
    const textResult = await parser.getText();
    return String(textResult?.text || "");
  } finally {
    await parser.destroy?.();
  }
}

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
  const m =
    text.match(/שאלות[\s\n\r]*(\d{2,4})/) ||
    text.match(/(\d{2,4})[\s\n\r]*שאלות/) ||
    text.match(/שאל[\s\S]{0,12}(\d{2,4})/);
  return m ? Number(m[1]) : null;
}

function verifyPdfContent(text, typeId) {
  const pdfMinutes = parsePdfMinutes(text);
  const pdfQuestions = parsePdfQuestionCount(text);
  const checks = [
    { name: "date_start_april_1", pass: text.includes("01/04/2026") },
    { name: "date_end_april_30", pass: text.includes("30/04/2026") },
    { name: "no_march_31_start", pass: !text.includes("31/03/2026") },
    { name: "hebrew_parent_signal", pass: /להורה|סיכום|דוח/.test(text) },
    {
      name: "no_school_classroom_context",
      pass: !/(בית\s+ספר|מורה\s+פרטי|private\s+teacher|classroom\s+activity|פעילות\s+כיתה)/i.test(text),
    },
    { name: "pdf_minutes_at_least_250", pass: pdfMinutes != null && pdfMinutes >= 250 && pdfMinutes <= 650 },
    { name: "pdf_questions_at_least_150", pass: pdfQuestions != null && pdfQuestions >= 150 },
    { name: "no_recent_inactivity_warning", pass: !text.includes(INACTIVITY_PHRASE) },
  ];
  if (typeId.startsWith("detailed")) {
    checks.push({
      name: "has_practiced_subject_section",
      pass: /מתמטיקה|חשבון|עברית|אנגלית|מדעים|מולדת/.test(text),
    });
  }
  return {
    pass: checks.every((c) => c.pass),
    failures: checks.filter((c) => !c.pass),
    pdfMinutes,
    pdfQuestions,
  };
}

async function main() {
  const results = [];
  for (let i = 1; i <= 12; i += 1) {
    const label = `AAA${i}`;
    const dir = path.join(EXPORT_ROOT, label);
    let files;
    try {
      files = (await readdir(dir)).filter((f) => f.endsWith(".pdf"));
    } catch {
      files = [];
    }
    for (const file of files.sort()) {
      const buf = await readFile(path.join(dir, file));
      const text = await extractPdfText(buf);
      const typeId = file.includes("detailed-full")
        ? "detailed-full"
        : file.includes("detailed-summary")
          ? "detailed-summary"
          : "short-report";
      const v = verifyPdfContent(text, typeId);
      results.push({
        student: label,
        file,
        bytes: buf.length,
        pass: v.pass,
        pdfMinutes: v.pdfMinutes,
        pdfQuestions: v.pdfQuestions,
        failures: v.failures,
        datesFound: {
          apr1: text.includes("01/04/2026"),
          apr30: text.includes("30/04/2026"),
          mar31: text.includes("31/03/2026"),
        },
        hasInactivityWarning: text.includes(INACTIVITY_PHRASE),
      });
    }
  }

  const passCount = results.filter((r) => r.pass).length;
  const outPath = path.join(EXPORT_ROOT, "pdf-content-verification-final.json");
  await writeFile(
    outPath,
    JSON.stringify({ runAt: new Date().toISOString(), total: results.length, passCount, results }, null, 2),
    "utf8"
  );
  console.log(`PDF content verification: ${passCount}/${results.length} PASS`);
  console.log(`Wrote ${outPath}`);
  for (const r of results.filter((x) => !x.pass)) {
    console.log(
      `FAIL ${r.student}/${r.file}: mins=${r.pdfMinutes} qs=${r.pdfQuestions} ${JSON.stringify(r.failures.map((f) => f.name))}`
    );
  }
  if (results.length !== 36) {
    console.error(`Expected 36 PDFs, found ${results.length}`);
    process.exit(1);
  }
  if (passCount !== 36) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
