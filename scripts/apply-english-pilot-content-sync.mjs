#!/usr/bin/env node
/**
 * English pilot content sync — embed approved TXT into website markdown (TXT → site).
 * Source: exports/audio-text/books/english-g1|g2/pages/page-NNN.txt
 * Target: docs/learning-book/english/gX/drafts/{pageId}.md sections 1–7
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";
import { parseLearningPageMarkdown } from "../lib/learning-book/parse-learning-page-markdown.js";
import { prepareBookSectionExportNarrationText } from "./lib/prepare-book-export-narration-text.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const TXT_ROOT = path.join(ROOT, "exports/audio-text/books");
const GRADES = ["g1", "g2"];
const EXPECTED_PAGES = { g1: 154, g2: 182 };

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
  return normalizeText(s).replace(/\s+/g, " ").trim();
}

/** @returns {{ byFile: Map<string, Map<number, string>>, mapping: object[] }} */
function collectSectionUpdates() {
  /** @type {Map<string, Map<number, string>>} */
  const byFile = new Map();
  /** @type {object[]} */
  const mapping = [];

  for (const grade of GRADES) {
    const entry = getLearningBookEntry("english", grade);
    if (!entry) throw new Error(`Missing english catalog entry: ${grade}`);

    let pageNumber = 0;
    for (const page of entry.loader.loadAllPages()) {
      for (const section of page.sections) {
        pageNumber += 1;
        const fullTxtPath = path.join(
          TXT_ROOT,
          `english-${grade}`,
          "pages",
          `page-${padPageNum(pageNumber)}.txt`
        );

        if (!fs.existsSync(fullTxtPath)) {
          throw new Error(`Missing approved txt: ${fullTxtPath}`);
        }

        const txtBody = normalizeText(fs.readFileSync(fullTxtPath, "utf8"));
        const mdRel = `${entry.registry.meta.draftsDir}/${page.pageId}.md`.replace(/\\/g, "/");

        if (!byFile.has(mdRel)) byFile.set(mdRel, new Map());
        byFile.get(mdRel).set(section.number, txtBody);

        mapping.push({
          grade,
          pageNum: pageNumber,
          txt: `english-${grade}/pages/page-${padPageNum(pageNumber)}.txt`,
          md: mdRel,
          section: section.number,
          topicId: page.pageId,
        });
      }
    }

    if (pageNumber !== EXPECTED_PAGES[grade]) {
      throw new Error(`english-${grade}: expected ${EXPECTED_PAGES[grade]} pages, got ${pageNumber}`);
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

  for (let i = 0; i < matches.length; i += 1) {
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

const { byFile, mapping } = collectSectionUpdates();
/** @type {string[]} */
const changedFiles = [];
/** @type {object[]} */
const updatedPages = [];
/** @type {object[]} */
const exportMismatches = [];

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

  for (const section of parsed.sections) {
    const txt = sectionBodies.get(section.number);
    const mdBody = extractSectionBodyFromRaw(next, section.number);
    const exported = normalizeText(prepareBookSectionExportNarrationText(section));
    const mapRow = mapping.find(
      (m) => m.md === mdRel && m.section === section.number
    );
    if (mapRow && mdBody !== txt) {
      throw new Error(`${mdRel} §${section.number}: md body !== txt after sync`);
    }
    if (mapRow && contentKey(exported) !== contentKey(txt)) {
      exportMismatches.push({
        pageNum: mapRow.pageNum,
        md: mdRel,
        section: section.number,
        txtPreview: txt.slice(0, 120),
        exportPreview: exported.slice(0, 120),
      });
    }
    if (mapRow && next !== original) {
      updatedPages.push({
        grade: mapRow.grade,
        pageNum: mapRow.pageNum,
        md: mdRel,
        section: section.number,
        topicId: mapRow.topicId,
      });
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  direction: "TXT → site markdown",
  filesChanged: changedFiles.length,
  files: changedFiles.sort(),
  pagesSynced: mapping.length,
  sectionsUpdatedInChangedFiles: updatedPages.length,
  byGrade: Object.fromEntries(
    GRADES.map((g) => [
      g,
      {
        pages: EXPECTED_PAGES[g],
        changedMdFiles: changedFiles.filter((f) => f.includes(`/g${g.slice(1)}/`)).length,
        updatedSections: updatedPages.filter((p) => p.grade === g).length,
      },
    ])
  ),
  exportNarrationMismatches: exportMismatches.length,
  exportMismatches,
  mapping,
};

fs.writeFileSync(
  path.join(ROOT, "exports/audio-text/english-pilot-content-sync-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8"
);

console.log(
  JSON.stringify(
    {
      filesChanged: report.filesChanged,
      pagesSynced: report.pagesSynced,
      byGrade: report.byGrade,
      exportNarrationMismatches: report.exportNarrationMismatches,
    },
    null,
    2
  )
);

if (exportMismatches.length > 0) {
  console.warn(`\nNote: ${exportMismatches.length} page(s) have quote/label render spacing diffs (md body matches TXT)`);
}

console.log("\napply-english-pilot-content-sync: OK");
