#!/usr/bin/env node
/**
 * Audit + report: TXT → site sync status for math, geometry, science, moledet/geography.
 * Read-only on TXT. Does not modify files unless --apply is passed (runs existing apply scripts).
 *
 * Run: node scripts/audit-stem-books-txt-to-site-sync.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";
import {
  normalizePracticeSectionBody,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import { prepareBookSectionExportNarrationText } from "./lib/prepare-book-export-narration-text.js";
import { normalizeHebrewHyphensForTts } from "../lib/learning-book/audio/prepare-hebrew-book-audio-text.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const REPORT_PATH = path.join(ROOT, "exports/audio-text/stem-books-txt-to-site-audit-report.json");

const DIAGRAM_RE = /:::geometry-diagram[\s\S]*?:::/g;
const IMAGE_RE = /!\[[^\]]*\]\([^)]+\)/g;

/** @type {{ subject: string, grade: string, slug: string, txtDir: string, expectedPages: number, preserveDiagrams?: boolean }[]} */
const BOOKS = [
  ...["g1", "g2", "g3", "g4", "g5", "g6"].map((grade) => ({
    subject: "math",
    grade,
    slug: `math-${grade}`,
    txtDir: path.join(ROOT, "exports/audio-text/books/math", `math-${grade}`),
    expectedPages: { g1: 133, g2: 154, g3: 189, g4: 259, g5: 280, g6: 308 }[grade],
    preserveDiagrams: false,
  })),
  ...["g1", "g2", "g3", "g4", "g5", "g6"].map((grade) => ({
    subject: "geometry",
    grade,
    slug: `geometry-${grade}`,
    txtDir: path.join(ROOT, "exports/audio-text/books/geometry", `geometry-${grade}`),
    expectedPages: { g1: 21, g2: 21, g3: 63, g4: 98, g5: 126, g6: 133 }[grade],
    preserveDiagrams: true,
  })),
  ...["g1", "g2", "g3", "g4", "g5", "g6"].map((grade) => ({
    subject: "science",
    grade,
    slug: `science-${grade}`,
    txtDir: path.join(ROOT, "exports/audio-text/books/science", `science-${grade}`),
    expectedPages: { g1: 42, g2: 49, g3: 49, g4: 42, g5: 42, g6: 42 }[grade],
    preserveDiagrams: false,
  })),
  { subject: "moledet", grade: "g2", slug: "moledet-g2", txtDir: path.join(ROOT, "exports/audio-text/books/moledet-geography/moledet-g2"), expectedPages: 49 },
  { subject: "moledet", grade: "g3", slug: "moledet-g3", txtDir: path.join(ROOT, "exports/audio-text/books/moledet-geography/moledet-g3"), expectedPages: 56 },
  { subject: "moledet", grade: "g4", slug: "moledet-g4", txtDir: path.join(ROOT, "exports/audio-text/books/moledet-geography/moledet-g4"), expectedPages: 49 },
  { subject: "geography", grade: "g5", slug: "geography-g5", txtDir: path.join(ROOT, "exports/audio-text/books/moledet-geography/geography-g5"), expectedPages: 49 },
  { subject: "geography", grade: "g6", slug: "geography-g6", txtDir: path.join(ROOT, "exports/audio-text/books/moledet-geography/geography-g6"), expectedPages: 56 },
];

function padPageNum(n) {
  return String(n).padStart(3, "0");
}

function normalizeText(s) {
  return String(s || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function contentKey(s) {
  return normalizeHebrewHyphensForTts(normalizeText(s)).replace(/\s+/g, " ").trim();
}

function stripDiagramsAndImages(body) {
  return normalizeText(String(body || "").replace(DIAGRAM_RE, "").replace(IMAGE_RE, ""));
}

function sectionBodyForCompare(body, sectionNum, preserveDiagrams) {
  let b = preserveDiagrams ? stripDiagramsAndImages(body) : normalizeText(body);
  b = b.replace(/\n---\s*$/u, "");
  if (sectionNum === 7) b = normalizePracticeSectionBody(b);
  return normalizeText(b);
}

/**
 * @param {"identical"|"format_only"|"content_diff"} kind
 */
function classify(txt, mdBody) {
  if (txt === mdBody) return "identical";
  if (contentKey(txt) === contentKey(mdBody)) return "format_only";
  return "content_diff";
}

/** @type {object[]} */
const bookResults = [];
/** @type {object[]} */
const allIssues = [];
/** @type {Map<string, string>} */
const txtHashesBefore = new Map();

for (const book of BOOKS) {
  const entry = getLearningBookEntry(book.subject, book.grade);
  if (!entry) {
    bookResults.push({ ...book, error: "missing catalog entry", ok: false });
    continue;
  }

  let pageNumber = 0;
  let identical = 0;
  let formatOnly = 0;
  let contentDiff = 0;

  for (const page of entry.loader.loadAllPages()) {
    for (const section of page.sections) {
      pageNumber += 1;
      const txtPath = path.join(book.txtDir, "pages", `page-${padPageNum(pageNumber)}.txt`);
      const txtRel = `${book.slug}/pages/page-${padPageNum(pageNumber)}.txt`;

      if (!fs.existsSync(txtPath)) {
        contentDiff += 1;
        allIssues.push({
          book: book.slug,
          pageNumber,
          type: "missing_txt",
          txtFile: txtRel,
          mdFile: `${entry.registry.meta.draftsDir}/${page.pageId}.md`,
        });
        continue;
      }

      const txtRaw = fs.readFileSync(txtPath, "utf8");
      txtHashesBefore.set(txtPath, txtRaw);

      const txt = normalizeText(txtRaw);
      const mdBody = sectionBodyForCompare(section.body, section.number, book.preserveDiagrams);
      const mdRel = `${entry.registry.meta.draftsDir}/${page.pageId}.md`.replace(/\\/g, "/");
      const kind = classify(txt, mdBody);

      if (kind === "identical") identical += 1;
      else if (kind === "format_only") {
        formatOnly += 1;
        allIssues.push({
          book: book.slug,
          pageNumber,
          sectionNumber: section.number,
          type: "format_only",
          txtFile: txtRel,
          mdFile: mdRel,
          topicId: page.pageId,
        });
      } else {
        contentDiff += 1;
        allIssues.push({
          book: book.slug,
          pageNumber,
          sectionNumber: section.number,
          type: "content_diff",
          txtFile: txtRel,
          mdFile: mdRel,
          topicId: page.pageId,
          txtPreview: txt.slice(0, 160),
          mdPreview: mdBody.slice(0, 160),
        });
      }

      const exported = normalizeText(prepareBookSectionExportNarrationText(section));
      if (contentKey(exported) !== contentKey(txt) && kind === "identical") {
        allIssues.push({
          book: book.slug,
          pageNumber,
          sectionNumber: section.number,
          type: "export_narration_drift",
          txtFile: txtRel,
          mdFile: mdRel,
          note: "md body matches TXT but prepareBookSectionExportNarrationText differs (words)",
        });
      }
    }
  }

  const ok =
    pageNumber === book.expectedPages &&
    contentDiff === 0 &&
    identical + formatOnly === pageNumber;

  bookResults.push({
    subject: book.subject,
    grade: book.grade,
    slug: book.slug,
    txtDir: path.relative(ROOT, book.txtDir).replace(/\\/g, "/"),
    totalPages: pageNumber,
    expectedPages: book.expectedPages,
    identical,
    formatOnly,
    contentDiff,
    mdBodySynced: identical,
    ok,
  });
}

const totalTxt = bookResults.reduce((n, b) => n + (b.totalPages || 0), 0);
const totalIdentical = bookResults.reduce((n, b) => n + (b.identical || 0), 0);
const totalFormatOnly = bookResults.reduce((n, b) => n + (b.formatOnly || 0), 0);
const totalContentDiff = bookResults.reduce((n, b) => n + (b.contentDiff || 0), 0);

const report = {
  generatedAt: new Date().toISOString(),
  direction: "TXT → site (TXT is source of truth)",
  subjectsChecked: ["math", "geometry", "science", "moledet", "geography"],
  booksChecked: bookResults.length,
  summary: {
    totalTxtFilesChecked: totalTxt,
    identicalFromStart: totalIdentical,
    formatOnly: totalFormatOnly,
    contentDiff: totalContentDiff,
    exportNarrationDrift: allIssues.filter((i) => i.type === "export_narration_drift").length,
    allBooksMdBodyMatchTxt: bookResults.every((b) => b.ok),
    txtFilesModified: 0,
    mdFilesModified: [],
    safeToProduceAudio: bookResults.every((b) => b.ok) && totalContentDiff === 0,
  },
  books: bookResults,
  issues: allIssues,
  verificationScripts: {
    mathGeometry: "node scripts/verify-math-geometry-content-sync.mjs",
    science: "node scripts/verify-science-content-sync.mjs",
    moledetGeography: "node scripts/verify-moledet-geography-content-sync.mjs",
  },
};

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log("stem-books-txt-to-site-audit");
console.log(`  books: ${bookResults.length}`);
console.log(`  txt pages: ${totalTxt}`);
console.log(`  identical: ${totalIdentical}`);
console.log(`  format_only: ${totalFormatOnly}`);
console.log(`  content_diff: ${totalContentDiff}`);
console.log(`  report: ${path.relative(ROOT, REPORT_PATH)}`);

for (const b of bookResults) {
  if (!b.ok) {
    console.log(
      `  FAIL ${b.slug}: ${b.identical}/${b.totalPages} identical, format=${b.formatOnly}, content=${b.contentDiff}`
    );
  }
}

if (!report.summary.allBooksMdBodyMatchTxt) {
  process.exit(1);
}

console.log("\nOK — all STEM books md body matches TXT. Safe to produce audio when approved.");
