#!/usr/bin/env node
/**
 * Hebrew Content Sync — embed approved export txt into website markdown source.
 * Source: exports/audio-text/books/hebrew/hebrew-gX/pages/page-NNN.txt
 * Target: docs/learning-book/hebrew/gX/drafts/{pageId}.md sections 1–7
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";
import { parseLearningPageMarkdown } from "../lib/learning-book/parse-learning-page-markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const TXT_ROOT = path.join(ROOT, "exports/audio-text/books/hebrew");
const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];
const EXPECTED_PAGES = { g1: 224, g2: 161, g3: 217, g4: 203, g5: 196, g6: 203 };

function padPageNum(n) {
  return String(n).padStart(3, "0");
}

/** @returns {{ byFile: Map<string, Map<number, string>>, mapping: object[] }} */
function collectSectionUpdates() {
  /** @type {Map<string, Map<number, string>>} */
  const byFile = new Map();
  /** @type {object[]} */
  const mapping = [];

  for (const grade of GRADES) {
    const entry = getLearningBookEntry("hebrew", grade);
    if (!entry) throw new Error(`Missing hebrew catalog entry: ${grade}`);

    let pageNumber = 0;
    for (const page of entry.loader.loadAllPages()) {
      for (const section of page.sections) {
        pageNumber += 1;
        const fullTxtPath = path.join(
          TXT_ROOT,
          `hebrew-${grade}`,
          "pages",
          `page-${padPageNum(pageNumber)}.txt`
        );

        if (!fs.existsSync(fullTxtPath)) {
          throw new Error(`Missing approved txt: ${fullTxtPath}`);
        }

        const txtBody = fs.readFileSync(fullTxtPath, "utf8").replace(/\r\n/g, "\n").trim();
        const mdRel = `${entry.registry.meta.draftsDir}/${page.pageId}.md`.replace(/\\/g, "/");

        if (!byFile.has(mdRel)) byFile.set(mdRel, new Map());
        byFile.get(mdRel).set(section.number, txtBody);

        mapping.push({
          grade,
          pageNum: pageNumber,
          txt: `hebrew-${grade}/pages/page-${padPageNum(pageNumber)}.txt`,
          md: mdRel,
          section: section.number,
          topicId: page.pageId,
          status: "synced",
        });
      }
    }

    if (pageNumber !== EXPECTED_PAGES[grade]) {
      throw new Error(`hebrew-${grade}: expected ${EXPECTED_PAGES[grade]} pages, got ${pageNumber}`);
    }
  }

  return { byFile, mapping };
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

const { byFile, mapping } = collectSectionUpdates();
const changedFiles = [];

for (const [mdRel, sectionBodies] of byFile.entries()) {
  const mdPath = path.join(ROOT, mdRel);
  if (!fs.existsSync(mdPath)) {
    throw new Error(`Missing markdown draft: ${mdRel}`);
  }

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
  byGrade: Object.fromEntries(
    GRADES.map((g) => [g, mapping.filter((m) => m.grade === g).length])
  ),
  mapping,
};

fs.writeFileSync(
  path.join(ROOT, "docs/learning-book/hebrew/hebrew-content-sync-report.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log(
  JSON.stringify(
    {
      filesChanged: report.filesChanged,
      pagesSynced: report.pagesSynced,
      byGrade: report.byGrade,
    },
    null,
    2
  )
);
