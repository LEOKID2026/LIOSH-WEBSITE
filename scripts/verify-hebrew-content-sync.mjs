#!/usr/bin/env node
/**
 * Verify hebrew markdown source matches approved export txt (1204 pages).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const TXT_ROOT = path.join(ROOT, "exports/audio-text/books/hebrew");
const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];
const EXPECTED_PAGES = { g1: 224, g2: 161, g3: 217, g4: 203, g5: 196, g6: 203 };

const APPROVED_PHRASES = [
  "בחרו: יושב או עומד.",
  "יושב או עומד?",
  "משפטים שבהם צריך להתאים את הפועל לנושא.",
  "אם הנושא ברבים — גם הפועל צריך להתאים לרבים.",
  '"הנושא מעניין. אסביר בשלושה נימוקים."',
  "לכל אות יש צליל משלה.",
  "המורה נתנה מטלה",
  "אפשר בבקשה עזרה?",
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

let totalPages = 0;

for (const grade of GRADES) {
  const entry = getLearningBookEntry("hebrew", grade);
  let pageNumber = 0;

  for (const page of entry.loader.loadAllPages()) {
    for (const section of page.sections) {
      pageNumber += 1;
      totalPages += 1;

      const txtPath = path.join(
        TXT_ROOT,
        `hebrew-${grade}`,
        "pages",
        `page-${padPageNum(pageNumber)}.txt`
      );
      const txt = normalizeText(fs.readFileSync(txtPath, "utf8"));
      const mdPath = path.join(ROOT, `${entry.registry.meta.draftsDir}/${page.pageId}.md`);
      const mdRaw = fs.readFileSync(mdPath, "utf8");
      const mdBody = extractSectionBodyFromRaw(mdRaw, section.number);
      const mdRel = `${entry.registry.meta.draftsDir}/${page.pageId}.md`.replace(/\\/g, "/");

      const ok = txt === mdBody;
      if (!ok) {
        mismatches.push(`hebrew-${grade}/pages/page-${padPageNum(pageNumber)}.txt -> ${mdRel} §${section.number}`);
      }

      rows.push({
        txt: `hebrew-${grade}/pages/page-${padPageNum(pageNumber)}.txt`,
        md: mdRel,
        section: section.number,
        status: ok ? "synced" : "mismatch",
      });
    }
  }

  if (pageNumber !== EXPECTED_PAGES[grade]) {
    mismatches.push(`hebrew-${grade}: page count ${pageNumber} != ${EXPECTED_PAGES[grade]}`);
  }
}

/** @type {{ txt: string[], md: string[] }} */
const phraseHits = { txt: [], md: [] };

for (const phrase of APPROVED_PHRASES) {
  const txtFound = [];
  const mdFound = [];
  for (const grade of GRADES) {
    const entry = getLearningBookEntry("hebrew", grade);
    let pageNumber = 0;
    for (const page of entry.loader.loadAllPages()) {
      for (const section of page.sections) {
        pageNumber += 1;
        const txtPath = path.join(
          TXT_ROOT,
          `hebrew-${grade}`,
          "pages",
          `page-${padPageNum(pageNumber)}.txt`
        );
        const txt = fs.readFileSync(txtPath, "utf8");
        const mdRel = `${entry.registry.meta.draftsDir}/${page.pageId}.md`;
        const mdRaw = fs.readFileSync(path.join(ROOT, mdRel), "utf8");
        if (txt.includes(phrase)) txtFound.push(`hebrew-${grade}/pages/page-${padPageNum(pageNumber)}.txt`);
        if (mdRaw.includes(phrase)) mdFound.push(`${mdRel.replace(/\\/g, "/")}`);
      }
    }
  }
  if (txtFound.length) phraseHits.txt.push({ phrase, hits: txtFound });
  if (mdFound.length) phraseHits.md.push({ phrase, hits: mdFound });
}

const report = {
  totalPages,
  expectedTotal: 1204,
  synced: rows.filter((r) => r.status === "synced").length,
  mismatches: mismatches.length,
  mismatchSamples: mismatches.slice(0, 20),
  approvedPhraseHits: phraseHits,
  rows,
};

fs.writeFileSync(
  path.join(ROOT, "docs/learning-book/hebrew/hebrew-content-sync-verify.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log(
  JSON.stringify(
    {
      totalPages: report.totalPages,
      synced: report.synced,
      mismatches: report.mismatches,
      approvedPhrasesInTxt: phraseHits.txt.length,
      approvedPhrasesInMd: phraseHits.md.length,
    },
    null,
    2
  )
);

if (mismatches.length > 0) {
  console.error("\nverify-hebrew-content-sync: FAILED");
  process.exit(1);
}

console.log("\nverify-hebrew-content-sync: PASS");
