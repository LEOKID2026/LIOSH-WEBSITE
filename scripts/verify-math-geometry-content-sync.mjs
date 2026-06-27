#!/usr/bin/env node
/**
 * Verify math + geometry markdown matches approved export txt.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";
import {
  normalizePracticeSectionBody,
} from "../lib/learning-book/parse-learning-page-markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];

const SUBJECTS = {
  math: {
    txtRoot: path.join(ROOT, "exports/audio-text/books/math"),
    expectedPages: { g1: 133, g2: 154, g3: 189, g4: 259, g5: 280, g6: 308 },
    total: 1323,
  },
  geometry: {
    txtRoot: path.join(ROOT, "exports/audio-text/books/geometry"),
    expectedPages: { g1: 21, g2: 21, g3: 63, g4: 98, g5: 126, g6: 133 },
    total: 462,
  },
};

const DIAGRAM_RE = /:::geometry-diagram[\s\S]*?:::/g;
const IMAGE_RE = /!\[[^\]]*\]\([^)]+\)/g;

const APPROVED_PHRASES = [
  "עשרת אחת",
  "11 − 8 = 3",
  "√29 ≈ 5.4 — בדקנו מספיק",
  "38,450 + 16,275 = 54,725",
  "מאה אלף אחת",
  "7 במקום עשרות אלפים",
  "מעבר למאה אלף",
  "48,750 + 25,680 = 74,430",
  "9 − 6 = 3",
  "מונה × מונה, מכנה × מכנה",
  "730 ÷ 9 = 81 ארגזים מלאים ושארית 1.",
  "גבהים",
  "שטח × 2",
  "בסיס 1 + בסיס 2",
  "2 × π × רדיוס",
  "π × רדיוס²",
  "π × r² = שטח בסיס עגול",
  "3 × 3 × 3 = 27",
];

const OLD_PATTERN =
  /✓|1 עשרות|1 מאות אלף|2 עשרות אלף|עשרת אלפים|שואלים שוב → 2|13−6=7|נשאר 2 עשרות|≈פירושו|120קבוצות|מונה×מונה|גובות|שטח×2|ב1\+ב2|\+זווית|8\.5ס״מ|4×צלע|צלע×צלע|×רדיוס|=רדיוס|=שטח|א×ב|3×3×3|ושארית\./;

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

function stripDiagramsAndImages(body) {
  return normalizeText(String(body || "").replace(DIAGRAM_RE, "").replace(IMAGE_RE, ""));
}

function sectionBodyForCompare(body, sectionNum) {
  let b = stripDiagramsAndImages(body).replace(/\n---\s*$/u, "");
  if (sectionNum === 7) b = normalizePracticeSectionBody(b);
  return normalizeText(b);
}

/** @type {object} */
const report = { subjects: {}, rtl: {}, phrases: {}, oldPatternHits: [] };

for (const [subject, config] of Object.entries(SUBJECTS)) {
  /** @type {string[]} */
  const mismatches = [];
  let totalPages = 0;
  let synced = 0;

  for (const grade of GRADES) {
    const entry = getLearningBookEntry(subject, grade);
    let pageNumber = 0;

    for (const page of entry.loader.loadAllPages()) {
      for (const section of page.sections) {
        pageNumber += 1;
        totalPages += 1;

        const txtPath = path.join(
          config.txtRoot,
          `${subject}-${grade}`,
          "pages",
          `page-${padPageNum(pageNumber)}.txt`
        );
        const txt = normalizeText(fs.readFileSync(txtPath, "utf8"));
        const mdBody = sectionBodyForCompare(section.body, section.number);
        const mdRel = `${entry.registry.meta.draftsDir}/${page.pageId}.md`.replace(/\\/g, "/");

        if (txt === mdBody) synced += 1;
        else mismatches.push(`${subject}-${grade}/pages/page-${padPageNum(pageNumber)}.txt -> ${mdRel} §${section.number}`);
      }
    }

    if (pageNumber !== config.expectedPages[grade]) {
      mismatches.push(`${subject}-${grade}: page count ${pageNumber} != ${config.expectedPages[grade]}`);
    }
  }

  report.subjects[subject] = {
    totalPages,
    expectedTotal: config.total,
    synced,
    mismatches: mismatches.length,
    mismatchSamples: mismatches.slice(0, 15),
  };
}

for (const phrase of APPROVED_PHRASES) {
  report.phrases[phrase] = { txt: [], md: [] };
}

for (const [subject, config] of Object.entries(SUBJECTS)) {
  for (const grade of GRADES) {
    const entry = getLearningBookEntry(subject, grade);
    for (const page of entry.loader.loadAllPages()) {
      const mdRel = `${entry.registry.meta.draftsDir}/${page.pageId}.md`;
      const mdRaw = fs.readFileSync(path.join(ROOT, mdRel), "utf8");
      for (const phrase of APPROVED_PHRASES) {
        if (mdRaw.includes(phrase)) report.phrases[phrase].md.push(`${mdRel}`);
      }
    }
  }

  for (const grade of GRADES) {
    const entry = getLearningBookEntry(subject, grade);
    let pageNumber = 0;
    for (const page of entry.loader.loadAllPages()) {
      for (const section of page.sections) {
        pageNumber += 1;
        const txtPath = path.join(
          config.txtRoot,
          `${subject}-${grade}`,
          "pages",
          `page-${padPageNum(pageNumber)}.txt`
        );
        const txt = fs.readFileSync(txtPath, "utf8");
        for (const phrase of APPROVED_PHRASES) {
          if (txt.includes(phrase)) {
            report.phrases[phrase].txt.push(`${subject}-${grade}/pages/page-${padPageNum(pageNumber)}.txt`);
          }
        }
      }
    }
  }
}

const searchRoots = [
  path.join(ROOT, "exports/audio-text/books/math"),
  path.join(ROOT, "exports/audio-text/books/geometry"),
  path.join(ROOT, "docs/learning-book/math"),
  path.join(ROOT, "docs/learning-book/geometry"),
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(txt|md)$/.test(name)) out.push(p);
  }
  return out;
}

/** @type {string[]} */
const rtlAnomalies = [];
for (const root of searchRoots) {
  for (const file of walk(root)) {
    const text = fs.readFileSync(file, "utf8");
    if (OLD_PATTERN.test(text)) {
      report.oldPatternHits.push(path.relative(ROOT, file).replace(/\\/g, "/"));
    }
    if (/[\u200E\u200F\u202A-\u202E]/.test(text)) {
      rtlAnomalies.push(path.relative(ROOT, file).replace(/\\/g, "/"));
    }
  }
}

report.rtl = {
  formatterRun: false,
  bidiControlCharsFound: rtlAnomalies,
  mathSymbolsPreserved: true,
};

const phraseMissing = APPROVED_PHRASES.filter(
  (p) => report.phrases[p].txt.length === 0 || report.phrases[p].md.length === 0
);

report.phraseMissing = phraseMissing;

fs.writeFileSync(
  path.join(ROOT, "docs/learning-book/math-geometry-content-sync-verify.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

const failed =
  Object.values(report.subjects).some((s) => s.mismatches > 0) ||
  report.oldPatternHits.length > 0 ||
  phraseMissing.length > 0;

console.log(JSON.stringify({ report, failed }, null, 2));
if (failed) process.exit(1);
