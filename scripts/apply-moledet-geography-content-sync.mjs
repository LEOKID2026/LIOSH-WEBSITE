#!/usr/bin/env node
/**
 * Moledet + Geography Content Sync — embed approved export txt into website markdown.
 * Source: exports/audio-text/books/moledet-geography/{moledet-g2|g3|g4|geography-g5|g6}/pages/
 * Target: docs/learning-book/moledet-geography/gX/drafts/{pageId}.md sections 1–7
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";
import { parseLearningPageMarkdown } from "../lib/learning-book/parse-learning-page-markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const TXT_ROOT = path.join(ROOT, "exports/audio-text/books/moledet-geography");

/** @type {{ websiteSubject: string, grade: string, txtFolder: string, expectedPages: number }[]} */
const BOOKS = [
  { websiteSubject: "moledet", grade: "g2", txtFolder: "moledet-g2", expectedPages: 49 },
  { websiteSubject: "moledet", grade: "g3", txtFolder: "moledet-g3", expectedPages: 56 },
  { websiteSubject: "moledet", grade: "g4", txtFolder: "moledet-g4", expectedPages: 49 },
  { websiteSubject: "geography", grade: "g5", txtFolder: "geography-g5", expectedPages: 49 },
  { websiteSubject: "geography", grade: "g6", txtFolder: "geography-g6", expectedPages: 56 },
];

const TOTAL_EXPECTED = 259;

function padPageNum(n) {
  return String(n).padStart(3, "0");
}

function normalizeText(s) {
  return String(s || "").replace(/\r\n/g, "\n").trim();
}

/** @returns {{ byFile: Map<string, Map<number, string>>, mapping: object[], byGrade: Record<string, number> }} */
function collectSectionUpdates() {
  /** @type {Map<string, Map<number, string>>} */
  const byFile = new Map();
  /** @type {object[]} */
  const mapping = [];
  /** @type {Record<string, number>} */
  const byGrade = {};

  for (const book of BOOKS) {
    const entry = getLearningBookEntry(book.websiteSubject, book.grade);
    if (!entry) throw new Error(`Missing catalog entry: ${book.websiteSubject}/${book.grade}`);

    let pageNumber = 0;
    for (const page of entry.loader.loadAllPages()) {
      for (const section of page.sections) {
        pageNumber += 1;
        const txtPath = path.join(
          TXT_ROOT,
          book.txtFolder,
          "pages",
          `page-${padPageNum(pageNumber)}.txt`
        );

        if (!fs.existsSync(txtPath)) {
          throw new Error(`Missing approved txt: ${txtPath}`);
        }

        const txtBody = normalizeText(fs.readFileSync(txtPath, "utf8"));
        const mdRel = `${entry.registry.meta.draftsDir}/${page.pageId}.md`.replace(/\\/g, "/");

        if (!byFile.has(mdRel)) byFile.set(mdRel, new Map());
        byFile.get(mdRel).set(section.number, txtBody);

        mapping.push({
          websiteSubject: book.websiteSubject,
          grade: book.grade,
          txtFolder: book.txtFolder,
          pageNum: pageNumber,
          txt: `${book.txtFolder}/pages/page-${padPageNum(pageNumber)}.txt`,
          md: mdRel,
          section: section.number,
          topicId: page.pageId,
        });
      }
    }

    if (pageNumber !== book.expectedPages) {
      throw new Error(`${book.txtFolder}: expected ${book.expectedPages} pages, got ${pageNumber}`);
    }
    byGrade[book.grade] = pageNumber;
  }

  if (mapping.length !== TOTAL_EXPECTED) {
    throw new Error(`Expected ${TOTAL_EXPECTED} section mappings, got ${mapping.length}`);
  }

  return { byFile, mapping, byGrade };
}

/**
 * @param {string} raw
 * @param {Map<number, string>} sectionBodies
 */
function patchMarkdownSections(raw, sectionBodies) {
  const headerRe = /^## (\d+)\.\s*.+$/gm;
  const matches = [...raw.matchAll(headerRe)].filter((m) => {
    const n = Number(m[1]);
    return n >= 1 && n <= 7;
  });

  if (matches.length !== 7) {
    throw new Error(`Expected 7 numbered sections, found ${matches.length}`);
  }

  const prefix = raw.slice(0, matches[0].index);
  let out = prefix;

  for (let i = 0; i < matches.length; i++) {
    const num = Number(matches[i][1]);
    const titleLine = matches[i][0];
    const body = sectionBodies.get(num);
    if (body == null) {
      throw new Error(`Missing txt body for section ${num}`);
    }
    out += `${titleLine}\n\n${body.trim()}`;
    if (i < matches.length - 1) {
      out += "\n\n---\n\n";
    } else {
      out += "\n";
    }
  }

  return out;
}

const { byFile, mapping, byGrade } = collectSectionUpdates();
const changedFiles = [];

for (const [mdRel, sectionBodies] of byFile.entries()) {
  const mdPath = path.join(ROOT, mdRel);
  const original = fs.readFileSync(mdPath, "utf8");
  const next = patchMarkdownSections(original, sectionBodies);

  if (next !== original) {
    fs.writeFileSync(mdPath, next, "utf8");
    changedFiles.push(mdRel);
  }

  const parsed = parseLearningPageMarkdown(next, path.basename(mdPath, ".md"));
  if (parsed.sections.length !== 7) {
    throw new Error(`${mdRel}: parse failed after sync`);
  }
}

const report = {
  filesChanged: changedFiles.length,
  files: changedFiles.sort(),
  pagesSynced: mapping.length,
  byGrade,
  totalExpected: TOTAL_EXPECTED,
};

fs.writeFileSync(
  path.join(ROOT, "docs/learning-book/moledet-geography/moledet-geography-content-sync-report.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log(JSON.stringify(report, null, 2));
