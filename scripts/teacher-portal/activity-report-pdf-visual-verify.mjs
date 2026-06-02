#!/usr/bin/env node
/**
 * Visual/text verification for teacher activity report PDF Hebrew rendering.
 *
 * Generates a sample PDF from mock payload, extracts text via pdf-parse,
 * renders pages to PNG via Playwright (Chromium PDF viewer), and asserts
 * required Hebrew labels are present and not character-reversed.
 *
 * Run: node scripts/teacher-portal/activity-report-pdf-visual-verify.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";
import { chromium } from "playwright";
import {
  buildTeacherActivityReportPdf,
  TEACHER_PDF_DOCUMENT_TITLE_HE,
  TEACHER_PDF_REQUIRED_SECTION_TITLES_HE,
  teacherActivityReportPdfContainsReversedHebrewMarkers,
} from "../../lib/teacher-portal/teacher-activity-report-pdf.js";
import { resetHebrewPdfFontCacheForTests } from "../../lib/teacher-portal/teacher-activity-report-pdf-he.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "../..");
const OUT_DIR = path.join(REPO_ROOT, "reports", "teacher-pdf-verify");

const MOCK_PAYLOAD = {
  activity: {
    title: "יום 160 שעה 6 — geometry SIM:2026-04-12 ש׳6",
    subject: "geometry",
    topic: "angles",
    mode: "quiz",
    difficultyLevel: "medium",
    questionCount: 2,
    activatedAt: "2026-04-12T08:00:00Z",
    closedAt: "2026-04-12T10:00:00Z",
  },
  summary: {
    rosterCount: 2,
    submittedCount: 2,
    notStartedCount: 0,
    inProgressCount: 0,
    completionRate: 100,
    classAccuracy: 75,
  },
  students: [
    {
      studentId: "s1",
      studentFullNameMasked: "א.ב.",
      status: "submitted",
      answersCount: 2,
      correctCount: 2,
      scorePct: 100,
      startedAt: "2026-04-12T08:05:00Z",
      submittedAt: "2026-04-12T08:20:00Z",
    },
    {
      studentId: "s2",
      studentFullNameMasked: "ג.ד.",
      status: "submitted",
      answersCount: 2,
      correctCount: 1,
      scorePct: 50,
      startedAt: "2026-04-12T08:06:00Z",
      submittedAt: "2026-04-12T08:25:00Z",
    },
  ],
  questions: [
    {
      questionIndex: 0,
      questionText: "מהי זווית ישרה?",
      choices: ["45°", "90°", "120°", "180°"],
      correctAnswer: "ב",
      correctAnswerDisplay: "ב — 90°",
      skillLabelHe: "זוויות",
    },
    {
      questionIndex: 1,
      questionText: "כמה צלעות למשולש?",
      choices: ["2", "3", "4", "5"],
      correctAnswer: "ב",
      correctAnswerDisplay: "ב — 3",
      skillLabelHe: "צורות",
    },
  ],
  responses: [],
  perQuestion: [
    { questionIndex: 0, totalAnswers: 2, correctCount: 2, wrongCount: 0, accuracyPct: 100 },
    { questionIndex: 1, totalAnswers: 2, correctCount: 1, wrongCount: 1, accuracyPct: 50 },
  ],
  allSkills: [
    { skillLabelHe: "זוויות", answers: 2, correct: 2, accuracyPct: 100, isWeak: false },
    { skillLabelHe: "צורות", answers: 2, correct: 1, accuracyPct: 50, isWeak: false },
  ],
  classInfo: { className: "כיתה ה׳ 1", gradeLevel: "grade_5" },
  teacherInfo: { displayName: "דן כהן" },
  exportMeta: { generatedAt: "2026-04-12T12:00:00Z" },
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
  console.log(`  OK: ${message}`);
}

async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return String(result?.text || "");
  } finally {
    await parser.destroy?.();
  }
}

async function renderPdfPagesToPng(pdfPath, outDir) {
  const browser = await chromium.launch({ headless: true });
  try {
    const pdfBase64 = fs.readFileSync(pdfPath).toString("base64");
    const htmlPath = path.join(outDir, "pdf-canvas-viewer.html");
    fs.writeFileSync(
      htmlPath,
      `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <style>
    body { margin: 0; background: #fff; }
    #wrap { width: 794px; padding: 8px; }
    canvas { display: block; width: 794px; height: auto; border: 1px solid #eee; }
  </style>
</head>
<body>
  <div id="wrap"><canvas id="c"></canvas></div>
  <script type="module">
    import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
    const data = atob("${pdfBase64}");
    const bytes = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i);
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.35 });
    const canvas = document.getElementById("c");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    document.body.dataset.rendered = "1";
  </script>
</body>
</html>`,
      "utf8"
    );

    const context = await browser.newContext({
      viewport: { width: 820, height: 1200 },
      locale: "he-IL",
    });
    const page = await context.newPage();
    await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.waitForFunction(() => document.body.dataset.rendered === "1", null, {
      timeout: 120_000,
    });

    const pngPath = path.join(outDir, "page-1.png");
    await page.locator("#wrap").screenshot({ path: pngPath });
    console.log(`  PNG saved (pdf.js canvas): ${pngPath}`);
    return pngPath;
  } finally {
    await browser.close();
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  resetHebrewPdfFontCacheForTests();

  const fontPath = path.join(REPO_ROOT, "public", "fonts", "NotoSansHebrew-Regular.ttf");
  const readFontBase64 = () => fs.readFileSync(fontPath).toString("base64");

  console.log("\n── Generate sample PDF ──");
  const doc = await buildTeacherActivityReportPdf(MOCK_PAYLOAD, { readFontBase64 });
  const buffer = Buffer.from(doc.output("arraybuffer"));
  const pdfPath = path.join(OUT_DIR, "teacher-activity-report-sample.pdf");
  fs.writeFileSync(pdfPath, buffer);
  console.log(`  PDF saved: ${pdfPath} (${buffer.length} bytes)`);

  console.log("\n── Extract and verify Hebrew text ──");
  const text = await extractPdfText(buffer);
  const normalized = text.replace(/\s+/g, " ");

  assert(text.includes("דוח פעילות") && text.includes("מורה"), `title contains דוח פעילות … מורה`);
  for (const sectionTitle of TEACHER_PDF_REQUIRED_SECTION_TITLES_HE) {
    assert(text.includes(sectionTitle), `section: "${sectionTitle}"`);
  }
  assert(text.includes("גאומטריה"), "export subject label גאומטריה");
  assert(text.includes("בוחן"), "export mode label בוחן");
  assert(!text.includes("geometry"), "no raw geometry key");
  assert(!text.includes("SIM"), "no SIM marker");
  assert(!teacherActivityReportPdfContainsReversedHebrewMarkers(text), "no character-reversed Hebrew");
  assert(text.includes("שם פעילות"), "table header שם פעילות readable");
  assert(text.includes("נכונות מתוך כלל התשובות"), "Hebrew X/N column header");
  assert(!normalized.includes("דיוק X/N"), "no legacy דיוק X/N in PDF text");

  console.log("\n── Render PDF to PNG (Playwright) ──");
  await renderPdfPagesToPng(pdfPath, OUT_DIR);

  console.log("\nTeacher PDF Hebrew visual verification passed.");
}

main().catch((err) => {
  console.error("\nTeacher PDF visual verification FAILED:");
  console.error(err?.stack || err);
  process.exit(1);
});
