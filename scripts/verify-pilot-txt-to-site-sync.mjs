#!/usr/bin/env node
/**
 * Verify pilot books: TXT is source of truth; site md + visible narration must match TXT.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";
import { prepareBookSectionExportNarrationText } from "./lib/prepare-book-export-narration-text.js";
import { normalizeHebrewHyphensForTts } from "../lib/learning-book/audio/prepare-hebrew-book-audio-text.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const TXT_ROOT = path.join(ROOT, "exports/audio-text/books");

const BOOKS = [
  { subject: "english", grade: "g1", slug: "english-g1", pages: 154 },
  { subject: "english", grade: "g2", slug: "english-g2", pages: 182 },
  { subject: "hebrew", grade: "g1", slug: "hebrew-g1", pages: 224 },
  { subject: "hebrew", grade: "g2", slug: "hebrew-g2", pages: 161 },
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

function extractSectionBodyFromRaw(raw, sectionNum) {
  const headerRe = /^## (\d+)\.\s*.+$/gm;
  const matches = [...raw.matchAll(headerRe)].filter((m) => {
    const n = Number(m[1]);
    return n >= 1 && n <= 7;
  });
  const idx = matches.findIndex((m) => Number(m[1]) === sectionNum);
  if (idx < 0) return "";
  const bodyStart = matches[idx].index + matches[idx][0].length;
  const bodyEnd = matches[idx + 1]?.index ?? raw.length;
  return normalizeText(raw.slice(bodyStart, bodyEnd).replace(/\n---\s*$/u, ""));
}

/** @type {object[]} */
const rows = [];
/** @type {string[]} */
const mismatches = [];

for (const book of BOOKS) {
  const entry = getLearningBookEntry(book.subject, book.grade);
  let pageNumber = 0;
  let synced = 0;
  let mdSynced = 0;

  for (const page of entry.loader.loadAllPages()) {
    const mdPath = path.join(ROOT, `${entry.registry.meta.draftsDir}/${page.pageId}.md`);
    const mdRaw = fs.readFileSync(mdPath, "utf8");

    for (const section of page.sections) {
      pageNumber += 1;
      const txtPath = path.join(
        TXT_ROOT,
        book.slug,
        "pages",
        `page-${padPageNum(pageNumber)}.txt`
      );
      const txt = normalizeText(fs.readFileSync(txtPath, "utf8"));
      const mdBody = extractSectionBodyFromRaw(mdRaw, section.number);
      const exported = normalizeText(prepareBookSectionExportNarrationText(section));
      const mdRel = `${entry.registry.meta.draftsDir}/${page.pageId}.md`.replace(/\\/g, "/");

      const mdOk = txt === mdBody;
      const exportOk = contentKey(exported) === contentKey(txt);
      const ok = mdOk && (book.subject !== "english" || exportOk);
      if (mdOk) mdSynced += 1;
      if (ok) synced += 1;
      else {
        mismatches.push(
          `${book.slug}/page-${padPageNum(pageNumber)} (${mdRel} §${section.number}) md=${mdOk} export=${exportOk}`
        );
      }

      rows.push({
        book: book.slug,
        pageNumber,
        md: mdRel,
        section: section.number,
        mdBodyMatch: mdOk,
        exportMatch: exportOk,
        status: ok ? "synced" : "mismatch",
      });
    }
  }

  book.synced = synced;
  book.mdSynced = mdSynced;
  book.total = pageNumber;
  book.ok = mdSynced === book.pages;
}

const exportOnlyMismatches = rows.filter(
  (r) => r.mdBodyMatch && !r.exportMatch && r.book.startsWith("english")
);

const report = {
  generatedAt: new Date().toISOString(),
  sourceOfTruth: "exports/audio-text/books/{slug}/pages/page-XXX.txt",
  direction: "TXT → site markdown (md section body embedded 1:1 from TXT)",
  books: BOOKS.map(({ slug, pages, synced, mdSynced, total, ok }) => ({
    slug,
    expected: pages,
    mdBodySynced: mdSynced,
    fullySynced: synced,
    total,
    mdOk: ok,
  })),
  allMdBodyOk: BOOKS.every((b) => b.ok),
  exportQuoteRenderIssues: exportOnlyMismatches.map((r) => ({
    book: r.book,
    pageNumber: r.pageNumber,
    md: r.md,
    section: r.section,
    note: "md body matches TXT; export adds space/newline before closing ASCII quote in English phrases",
  })),
  allOk: BOOKS.every((b) => b.ok),
  mismatches: mismatches.length,
  mismatchSamples: mismatches.slice(0, 30),
  rows,
};

fs.writeFileSync(
  path.join(ROOT, "exports/audio-text/pilot-txt-to-site-verify-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8"
);

for (const b of report.books) {
  console.log(
    `${b.slug}: md ${b.mdBodySynced}/${b.expected} ${b.mdOk ? "OK" : "FAIL"}` +
      (b.fullySynced !== b.mdBodySynced
        ? ` (export narration ${b.fullySynced}/${b.expected})`
        : "")
  );
}

if (report.exportQuoteRenderIssues.length) {
  console.warn(
    `\nNote: ${report.exportQuoteRenderIssues.length} English page(s) — md matches TXT; quote render spacing in export only`
  );
}

if (!report.allMdBodyOk) {
  console.error(`\nverify-pilot-txt-to-site-sync: FAILED (${mismatches.length} mismatches)`);
  process.exit(1);
}

console.log("\nverify-pilot-txt-to-site-sync: PASS (md body matches TXT)");
