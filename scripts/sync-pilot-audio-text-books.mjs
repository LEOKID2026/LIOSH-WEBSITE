#!/usr/bin/env node
/**
 * Sync narration TXT for pilot audio books (hebrew/english g1-g2).
 * 1. Classify pre-export mismatches: content_diff vs format_only
 * 2. Re-export pages/page-XXX.txt from live visible narration text
 * 3. Verify 100% match for the four books
 * 4. Write pilot-sync-report.json
 *
 * Does NOT modify book markdown or site content.
 *
 * Run: node scripts/sync-pilot-audio-text-books.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LEARNING_BOOK_CATALOG_LIST } from "../lib/learning-book/learning-book-catalog.js";
import { getSectionDisplayTitle } from "../lib/learning-book/section-display-labels.js";
import {
  countWords,
  hasTechnicalLeak,
  prepareBookSectionExportNarrationText,
} from "./lib/prepare-book-export-narration-text.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_ROOT = path.join(ROOT, "exports", "audio-text", "books");
const REPORT_PATH = path.join(ROOT, "exports", "audio-text", "pilot-sync-report.json");

const PILOT_SLUGS = ["hebrew-g1", "hebrew-g2", "english-g1", "english-g2"];

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

/** Collapse whitespace for content-only comparison (words identical). */
function contentKey(s) {
  return normalizeText(s).replace(/\s+/g, " ").trim();
}

/**
 * @param {string} txt
 * @param {string} site
 * @returns {"content_diff" | "format_only" | "identical"}
 */
function classifyDiff(txt, site) {
  const a = normalizeText(txt);
  const b = normalizeText(site);
  if (a === b) return "identical";
  if (contentKey(a) === contentKey(b)) return "format_only";
  return "content_diff";
}

/**
 * @param {{ subject: string, grade: string, status: string, loader: { loadAllPages: () => unknown[] }, meta: Record<string, unknown> }} entry
 */
function collectSitePages(entry) {
  /** @type {{ pageNumber: number, topicId: string, sectionNumber: number, text: string, sectionTitle: string, topicTitle: string }[]} */
  const rows = [];
  let pageNumber = 0;

  for (const page of entry.loader.loadAllPages()) {
    const topicTitle = String(page.displayTitle || page.pageId || "").trim();
    const sections = Array.isArray(page.sections) ? page.sections : [];
    for (const section of sections) {
      pageNumber += 1;
      rows.push({
        pageNumber,
        topicId: page.pageId,
        sectionNumber: section.number,
        text: prepareBookSectionExportNarrationText(section),
        sectionTitle: getSectionDisplayTitle(section.title),
        topicTitle,
      });
    }
  }

  return rows;
}

/**
 * @param {{ subject: string, grade: string, status: string, loader: { loadAllPages: () => unknown[] }, meta: Record<string, unknown> }} entry
 */
function exportBookPages(entry) {
  const { subject, grade } = entry;
  const slug = `${subject}-${grade}`;
  const bookDir = path.join(OUT_ROOT, slug);
  const pagesDir = path.join(bookDir, "pages");
  fs.mkdirSync(pagesDir, { recursive: true });

  const sitePages = collectSitePages(entry);
  /** @type {object[]} */
  const exportedPages = [];
  /** @type {object[]} */
  const issues = [];

  const bookTitle =
    String(entry.meta?.bookTitleHe || "").trim() || `ספר ${subject} — ${grade}`;

  /** @type {string[]} */
  const fullMdParts = [`# ${bookTitle}`, ""];

  for (const row of sitePages) {
    const { pageNumber, text, topicId, sectionNumber, sectionTitle, topicTitle } = row;
    const fileName = `page-${padPageNum(pageNumber)}.txt`;
    const textFile = `pages/${fileName}`;
    const indexTitle = sectionTitle || topicTitle || `עמוד ${pageNumber}`;

    if (!text.trim()) {
      issues.push({ pageNumber, topicId, sectionNumber, issue: "empty" });
    } else if (hasTechnicalLeak(text)) {
      issues.push({ pageNumber, topicId, sectionNumber, issue: "technical_leak" });
    }

    fs.writeFileSync(path.join(bookDir, textFile), `${text}\n`, "utf8");
    fullMdParts.push(
      `## Chapter ${padPageNum(pageNumber)} — עמוד ${pageNumber}`,
      "",
      text,
      ""
    );

    exportedPages.push({
      pageNumber,
      title: indexTitle,
      textFile,
      estimatedCharacters: text.length,
      estimatedWords: countWords(text),
    });
  }

  const index = {
    bookSlug: slug,
    bookTitle,
    subject,
    grade,
    pageCount: exportedPages.length,
    pages: exportedPages,
  };

  fs.writeFileSync(
    path.join(bookDir, "index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(path.join(bookDir, "book-full.md"), fullMdParts.join("\n"), "utf8");

  return { slug, pageCount: exportedPages.length, issues };
}

/**
 * @param {string} slug
 * @param {ReturnType<typeof collectSitePages>} sitePages
 */
function verifyBook(slug, sitePages) {
  const bookDir = path.join(OUT_ROOT, slug);
  let synced = 0;
  /** @type {object[]} */
  const issues = [];

  for (const row of sitePages) {
    const txtPath = path.join(bookDir, "pages", `page-${padPageNum(row.pageNumber)}.txt`);
    const expected = normalizeText(row.text);
    if (!fs.existsSync(txtPath)) {
      issues.push({ pageNumber: row.pageNumber, type: "missing_txt" });
      continue;
    }
    const txt = normalizeText(fs.readFileSync(txtPath, "utf8"));
    if (txt === expected) synced += 1;
    else issues.push({ pageNumber: row.pageNumber, type: "text_mismatch" });
  }

  return {
    slug,
    total: sitePages.length,
    synced,
    ok: synced === sitePages.length && issues.length === 0,
    issues,
  };
}

/** @type {object[]} */
const pilotEntries = [];

for (const slug of PILOT_SLUGS) {
  const entry = LEARNING_BOOK_CATALOG_LIST.find(
    (e) => e.status === "authored" && `${e.subject}-${e.grade}` === slug
  );
  if (!entry) {
    console.error(`Missing catalog entry for ${slug}`);
    process.exit(1);
  }
  pilotEntries.push({ slug, entry });
}

/** @type {Record<string, object>} */
const bookReports = {};

for (const { slug, entry } of pilotEntries) {
  const bookDir = path.join(OUT_ROOT, slug);
  const sitePages = collectSitePages(entry);

  /** @type {object[]} */
  const preExport = [];
  /** @type {Record<number, string>} */
  const beforeContent = {};

  for (const row of sitePages) {
    const txtPath = path.join(bookDir, "pages", `page-${padPageNum(row.pageNumber)}.txt`);
    const expected = normalizeText(row.text);
    const before = fs.existsSync(txtPath)
      ? normalizeText(fs.readFileSync(txtPath, "utf8"))
      : "";
    beforeContent[row.pageNumber] = before;

    const kind = classifyDiff(before, expected);
    if (kind !== "identical") {
      preExport.push({
        pageNumber: row.pageNumber,
        txtFile: `pages/page-${padPageNum(row.pageNumber)}.txt`,
        topicId: row.topicId,
        sectionNumber: row.sectionNumber,
        diffType: kind,
        beforePreview: before.slice(0, 200),
        afterPreview: expected.slice(0, 200),
      });
    }
  }

  const exportResult = exportBookPages(entry);

  /** @type {object[]} */
  const changedPages = [];
  for (const row of sitePages) {
    const txtPath = path.join(bookDir, "pages", `page-${padPageNum(row.pageNumber)}.txt`);
    const after = normalizeText(fs.readFileSync(txtPath, "utf8"));
    const before = beforeContent[row.pageNumber] ?? "";
    if (before !== after) {
      const pre = preExport.find((p) => p.pageNumber === row.pageNumber);
      changedPages.push({
        pageNumber: row.pageNumber,
        txtFile: `pages/page-${padPageNum(row.pageNumber)}.txt`,
        diffType: pre?.diffType ?? classifyDiff(before, after),
        topicId: row.topicId,
        sectionNumber: row.sectionNumber,
      });
    }
  }

  const verify = verifyBook(slug, sitePages);

  const contentDiffPages = changedPages.filter((p) => p.diffType === "content_diff");
  const formatOnlyPages = changedPages.filter((p) => p.diffType === "format_only");

  bookReports[slug] = {
    slug,
    pageCount: sitePages.length,
    preExportMismatchCount: preExport.length,
    preExportContentDiff: preExport.filter((p) => p.diffType === "content_diff").length,
    preExportFormatOnly: preExport.filter((p) => p.diffType === "format_only").length,
    txtFilesChanged: changedPages.length,
    changedPages,
    contentDiffPages: contentDiffPages.map((p) => p.pageNumber),
    formatOnlyPages: formatOnlyPages.map((p) => p.pageNumber),
    verify,
    exportIssues: exportResult.issues,
    audioRecommendation:
      contentDiffPages.length === 0
        ? "no_re_record_needed — only format/whitespace sync"
        : contentDiffPages.length === sitePages.length
          ? "re_record_full_book"
          : contentDiffPages.length >= sitePages.length * 0.5
            ? "re_record_full_book — majority of pages have content changes"
            : "re_record_selected_pages_only",
  };
}

const allOk = PILOT_SLUGS.every((slug) => bookReports[slug].verify.ok);

const report = {
  generatedAt: new Date().toISOString(),
  pilotBooks: PILOT_SLUGS,
  comparisonMethod: "prepareBookSectionExportNarrationText — visible site narration text",
  summary: {
    booksSynced: PILOT_SLUGS.length,
    allPilotBooks100Percent: allOk,
    totalTxtChanged: PILOT_SLUGS.reduce((n, s) => n + bookReports[s].txtFilesChanged, 0),
    totalContentDiffPages: PILOT_SLUGS.reduce(
      (n, s) => n + bookReports[s].contentDiffPages.length,
      0
    ),
    totalFormatOnlyPages: PILOT_SLUGS.reduce(
      (n, s) => n + bookReports[s].formatOnlyPages.length,
      0
    ),
    safeToProduceAudioForPilotBooks: allOk,
  },
  books: bookReports,
};

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log("sync-pilot-audio-text-books");
for (const slug of PILOT_SLUGS) {
  const b = bookReports[slug];
  console.log(
    `  ${slug}: ${b.verify.synced}/${b.verify.total} synced | changed=${b.txtFilesChanged} (content=${b.contentDiffPages.length}, format=${b.formatOnlyPages.length}) | ${b.audioRecommendation}`
  );
}
console.log(`  report: ${path.relative(ROOT, REPORT_PATH)}`);

if (!allOk) {
  console.error("\nFAIL — pilot books not 100% synced after export.");
  process.exit(1);
}

console.log("\nOK — all four pilot books 100% match site visible narration text.");
process.exit(0);
