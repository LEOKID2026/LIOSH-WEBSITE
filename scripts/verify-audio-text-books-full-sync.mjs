#!/usr/bin/env node
/**
 * Full sync audit: exports/audio-text/books page-XXX.txt files vs live book visible text.
 * Uses the same narration prep as export (prepareBookSectionExportNarrationText).
 * Read-only — does not modify books or TXT.
 *
 * Run: node scripts/verify-audio-text-books-full-sync.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";
import { prepareBookSectionExportNarrationText } from "./lib/prepare-book-export-narration-text.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BOOKS_ROOT = path.join(ROOT, "exports", "audio-text", "books");
const REPORT_PATH = path.join(ROOT, "exports", "audio-text", "full-sync-verify-report.json");

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

/** @returns {string[]} */
function listBookDirs(booksRoot) {
  /** @type {string[]} */
  const dirs = [];
  for (const name of fs.readdirSync(booksRoot)) {
    const entry = path.join(booksRoot, name);
    if (!fs.statSync(entry).isDirectory()) continue;

    const indexPath = path.join(entry, "index.json");
    const pagesDir = path.join(entry, "pages");
    if (fs.existsSync(indexPath) && fs.existsSync(pagesDir)) {
      dirs.push(entry);
      continue;
    }

    for (const sub of fs.readdirSync(entry)) {
      const bookDir = path.join(entry, sub);
      if (!fs.statSync(bookDir).isDirectory()) continue;
      if (
        fs.existsSync(path.join(bookDir, "index.json")) &&
        fs.existsSync(path.join(bookDir, "pages"))
      ) {
        dirs.push(bookDir);
      }
    }
  }
  return dirs.sort();
}

/**
 * @param {string} text
 * @param {number} max
 */
function preview(text, max = 240) {
  const t = normalizeText(text).replace(/\n/g, " ↵ ");
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/**
 * @param {string} bookDir
 */
function auditBook(bookDir) {
  const slug = path.basename(bookDir);
  const indexPath = path.join(bookDir, "index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const subject = String(index.subject || slug.split("-")[0]).trim().toLowerCase();
  const grade = String(index.grade || slug.split("-")[1]).trim().toLowerCase();

  /** @type {object[]} */
  const issues = [];

  const entry = getLearningBookEntry(subject, grade);
  if (!entry) {
    issues.push({
      type: "catalog_missing",
      book: slug,
      detail: `no catalog entry for ${subject}/${grade}`,
    });
    return { slug, subject, grade, pageCount: 0, txtFiles: 0, synced: 0, issues };
  }

  const pagesDir = path.join(bookDir, "pages");
  const txtFiles = fs
    .readdirSync(pagesDir)
    .filter((f) => /^page-\d{3}\.txt$/.test(f))
    .sort();

  const txtNumbers = txtFiles.map((f) => Number(f.match(/page-(\d{3})\.txt/)[1]));
  const expectedCount = index.pageCount ?? txtFiles.length;

  if (txtFiles.length !== expectedCount) {
    issues.push({
      type: "txt_count_mismatch",
      book: slug,
      pageNumber: null,
      txtFile: null,
      detail: `index.pageCount=${expectedCount}, txt files on disk=${txtFiles.length}`,
    });
  }

  const seenTxt = new Set();
  for (const n of txtNumbers) {
    if (seenTxt.has(n)) {
      issues.push({
        type: "duplicate_page_file",
        book: slug,
        pageNumber: n,
        txtFile: `pages/page-${padPageNum(n)}.txt`,
        detail: "duplicate page number in pages/ folder",
      });
    }
    seenTxt.add(n);
  }

  for (let i = 1; i <= expectedCount; i += 1) {
    if (!seenTxt.has(i)) {
      issues.push({
        type: "missing_txt",
        book: slug,
        pageNumber: i,
        txtFile: `pages/page-${padPageNum(i)}.txt`,
        detail: "expected sequential page file missing",
      });
    }
  }

  for (const n of txtNumbers) {
    if (n > expectedCount || n < 1) {
      issues.push({
        type: "orphan_txt",
        book: slug,
        pageNumber: n,
        txtFile: `pages/page-${padPageNum(n)}.txt`,
        detail: "txt file outside expected page range",
      });
    }
  }

  const indexPageNums = (index.pages || []).map((p) => p.pageNumber);
  const seenIndex = new Set();
  for (const n of indexPageNums) {
    if (seenIndex.has(n)) {
      issues.push({
        type: "duplicate_index_page",
        book: slug,
        pageNumber: n,
        txtFile: `pages/page-${padPageNum(n)}.txt`,
        detail: "duplicate pageNumber in index.json",
      });
    }
    seenIndex.add(n);
  }

  let pageNumber = 0;
  let synced = 0;
  /** @type {{ pageNumber: number, topicId: string, sectionNumber: number }[]} */
  const sitePages = [];

  for (const page of entry.loader.loadAllPages()) {
    for (const section of page.sections) {
      pageNumber += 1;
      sitePages.push({
        pageNumber,
        topicId: page.pageId,
        sectionNumber: section.number,
      });

      const txtRel = `pages/page-${padPageNum(pageNumber)}.txt`;
      const txtPath = path.join(bookDir, txtRel);
      const expected = normalizeText(prepareBookSectionExportNarrationText(section));
      const mdRel = `${entry.registry.meta.draftsDir}/${page.pageId}.md`.replace(/\\/g, "/");

      if (!fs.existsSync(txtPath)) {
        issues.push({
          type: "missing_txt",
          book: slug,
          pageNumber,
          txtFile: txtRel,
          mdFile: mdRel,
          sectionNumber: section.number,
          detail: "site has page but txt missing",
          txtPreview: null,
          sitePreview: preview(expected),
        });
        continue;
      }

      const txt = normalizeText(fs.readFileSync(txtPath, "utf8"));
      if (txt === expected) {
        synced += 1;
        continue;
      }

      let mismatchKind = "text_mismatch";
      if (!txt && expected) mismatchKind = "txt_empty_site_has_text";
      else if (txt && !expected) mismatchKind = "txt_extra_site_empty";
      else if (txt.length !== expected.length) mismatchKind = "text_mismatch_length";

      issues.push({
        type: mismatchKind,
        book: slug,
        pageNumber,
        txtFile: txtRel,
        mdFile: mdRel,
        sectionNumber: section.number,
        topicId: page.pageId,
        detail:
          txt && expected
            ? "TXT and site visible narration text differ"
            : !txt
              ? "TXT empty but site has visible text"
              : "TXT has content but site section yields empty narration text",
        txtPreview: preview(txt),
        sitePreview: preview(expected),
      });
    }
  }

  if (pageNumber !== expectedCount) {
    issues.push({
      type: "page_count_mismatch",
      book: slug,
      pageNumber: null,
      detail: `site sequential pages=${pageNumber}, index.pageCount=${expectedCount}`,
    });
  }

  if (pageNumber !== txtFiles.length && !issues.some((i) => i.type === "txt_count_mismatch")) {
    issues.push({
      type: "order_count_mismatch",
      book: slug,
      detail: `site pages=${pageNumber}, txt files=${txtFiles.length}`,
    });
  }

  const fullMdPath = path.join(bookDir, "book-full.md");
  if (fs.existsSync(fullMdPath)) {
    const fullMd = fs.readFileSync(fullMdPath, "utf8");
    let fullMismatch = 0;
    for (let i = 1; i <= Math.min(pageNumber, txtFiles.length); i += 1) {
      const txt = normalizeText(
        fs.readFileSync(path.join(bookDir, "pages", `page-${padPageNum(i)}.txt`), "utf8")
      );
      const chapterRe = new RegExp(
        `## Chapter ${padPageNum(i)} — עמוד ${i}\\s*\\n\\n([\\s\\S]*?)(?=\\n## Chapter |\\n*$)`,
        "m"
      );
      const m = fullMd.match(chapterRe);
      const fromFull = normalizeText(m?.[1] || "");
      if (fromFull !== txt) fullMismatch += 1;
    }
    if (fullMismatch > 0) {
      issues.push({
        type: "book_full_md_drift",
        book: slug,
        detail: `${fullMismatch} chapter(s) in book-full.md do not match pages/page-XXX.txt — use pages/*.txt as narration source`,
      });
    }
  }

  return {
    slug,
    subject,
    grade,
    sitePageCount: pageNumber,
    indexPageCount: expectedCount,
    txtFiles: txtFiles.length,
    synced,
    issues,
  };
}

/** @type {ReturnType<typeof auditBook>[]} */
const bookResults = [];

for (const bookDir of listBookDirs(BOOKS_ROOT)) {
  bookResults.push(auditBook(bookDir));
}

const totalBooks = bookResults.length;
const totalTxtChecked = bookResults.reduce((n, b) => n + b.txtFiles, 0);
const totalSynced = bookResults.reduce((n, b) => n + b.synced, 0);
const totalSitePages = bookResults.reduce((n, b) => n + b.sitePageCount, 0);
/** @type {object[]} */
const allIssues = bookResults.flatMap((b) => b.issues);

const report = {
  generatedAt: new Date().toISOString(),
  booksRoot: path.relative(ROOT, BOOKS_ROOT),
  comparisonMethod: "prepareBookSectionExportNarrationText(section.body) — same as export-learning-book-audio-text.mjs",
  narrationSourceOfTruth: "pages/page-XXX.txt (not book-full.md)",
  summary: {
    booksChecked: totalBooks,
    txtFilesOnDisk: totalTxtChecked,
    sitePagesExpected: totalSitePages,
    pagesSynced: totalSynced,
    pagesWithIssues: totalSitePages - totalSynced,
    issueCount: allIssues.length,
    allSynced: allIssues.length === 0 && totalSynced === totalSitePages,
    safeToProduceAudio: allIssues.length === 0 && totalSynced === totalSitePages,
  },
  books: bookResults.map((b) => ({
    slug: b.slug,
    subject: b.subject,
    grade: b.grade,
    sitePageCount: b.sitePageCount,
    indexPageCount: b.indexPageCount,
    txtFiles: b.txtFiles,
    synced: b.synced,
    mismatchCount: b.issues.filter((i) =>
      /text_mismatch|txt_empty|txt_extra|missing_txt/.test(i.type)
    ).length,
    issueCount: b.issues.length,
    ok: b.issues.length === 0 && b.synced === b.sitePageCount,
  })),
  issues: allIssues,
};

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log("verify-audio-text-books-full-sync");
console.log(`  books checked: ${totalBooks}`);
console.log(`  txt files:     ${totalTxtChecked}`);
console.log(`  site pages:    ${totalSitePages}`);
console.log(`  synced:        ${totalSynced}`);
console.log(`  issues:        ${allIssues.length}`);
console.log(`  report:        ${path.relative(ROOT, REPORT_PATH)}`);

if (!report.summary.allSynced) {
  console.error("\nFAIL — not safe to produce new audio until TXT matches site text.");
  const byBook = new Map();
  for (const issue of allIssues) {
    if (!byBook.has(issue.book)) byBook.set(issue.book, []);
    byBook.get(issue.book).push(issue);
  }
  for (const [book, issues] of byBook) {
    console.error(`\n  ${book} (${issues.length} issues):`);
    for (const issue of issues.slice(0, 8)) {
      const page = issue.pageNumber != null ? ` page ${padPageNum(issue.pageNumber)}` : "";
      console.error(`    - [${issue.type}]${page}: ${issue.detail || ""}`);
      if (issue.txtPreview) console.error(`      TXT:  ${issue.txtPreview}`);
      if (issue.sitePreview) console.error(`      SITE: ${issue.sitePreview}`);
    }
    if (issues.length > 8) console.error(`    … and ${issues.length - 8} more`);
  }
  process.exit(1);
}

console.log("\nOK — all TXT pages match site visible narration text. Safe to continue audio production.");
process.exit(0);
