#!/usr/bin/env node
/**
 * Verify science markdown source matches approved export txt (266 pages).
 * Run after: node scripts/apply-science-content-sync.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const TXT_ROOT = path.join(ROOT, "exports/audio-text/books/science");
const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];
const EXPECTED_PAGES = { g1: 42, g2: 49, g3: 49, g4: 42, g5: 42, g6: 42 };

const APPROVED_PHRASES = [
  "אוכל ושתייה מגוונים",
  "כתמים עוזרים בהסוואה",
  "אור, מים ואוויר",
  "בשרשרת המזון הפשוטה הזאת",
  "הליכה ברגל",
];

const OLD_PHRASES = [
  "אוכל מגוון — פירות, ירקות, מים — כוח לגוף",
  "פסים עוזרים בהסוואה",
  "חומרים מהקרקע",
  "בכל שרשרת מזון",
  "נסיעה ברגל",
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

/** Strip section separator captured by markdown parser before next ## header. */
function sectionBodyForCompare(body) {
  return normalizeText(String(body || "").replace(/\n---\s*$/u, ""));
}

/** @type {Array<{ txt: string, md: string, section: number, status: string, note?: string }>} */
const rows = [];
/** @type {string[]} */
const mismatches = [];

let totalPages = 0;

for (const grade of GRADES) {
  const entry = getLearningBookEntry("science", grade);
  let pageNumber = 0;

  for (const page of entry.loader.loadAllPages()) {
    for (const section of page.sections) {
      pageNumber += 1;
      totalPages += 1;

      const txtRel = `science-${grade}/pages/page-${padPageNum(pageNumber)}.txt`;
      const txtPath = path.join(TXT_ROOT, `science-${grade}`, "pages", `page-${padPageNum(pageNumber)}.txt`);
      const txt = normalizeText(fs.readFileSync(txtPath, "utf8"));
      const mdBody = sectionBodyForCompare(section.body);
      const mdRel = `${entry.registry.meta.draftsDir}/${page.pageId}.md`.replace(/\\/g, "/");

      const ok = txt === mdBody;
      if (!ok) {
        mismatches.push(`${txtRel} -> ${mdRel} §${section.number}`);
      }

      rows.push({
        txt: txtRel,
        md: mdRel,
        section: section.number,
        status: ok ? "synced" : "mismatch",
      });
    }
  }

  if (pageNumber !== EXPECTED_PAGES[grade]) {
    mismatches.push(`science-${grade}: page count ${pageNumber} != ${EXPECTED_PAGES[grade]}`);
  }
}

/** @type {Record<string, string[]>} */
const phraseHits = { approved: [], old: [] };

for (const grade of GRADES) {
  const entry = getLearningBookEntry("science", grade);
  for (const page of entry.loader.loadAllPages()) {
    const mdRel = `${entry.registry.meta.draftsDir}/${page.pageId}.md`;
    const raw = fs.readFileSync(path.join(ROOT, mdRel), "utf8");
    for (const p of APPROVED_PHRASES) {
      if (raw.includes(p)) phraseHits.approved.push(`${mdRel}: ${p}`);
    }
    for (const p of OLD_PHRASES) {
      if (raw.includes(p)) phraseHits.old.push(`${mdRel}: ${p}`);
    }
  }
}

const report = {
  totalPages,
  expectedTotal: 266,
  synced: rows.filter((r) => r.status === "synced").length,
  mismatches: mismatches.length,
  mismatchSamples: mismatches.slice(0, 20),
  approvedPhraseHits: phraseHits.approved,
  oldPhraseHits: phraseHits.old,
  rows,
};

fs.writeFileSync(
  path.join(ROOT, "docs/learning-book/science/science-content-sync-verify.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log(
  JSON.stringify(
    {
      totalPages: report.totalPages,
      synced: report.synced,
      mismatches: report.mismatches,
      approvedPhraseHits: report.approvedPhraseHits.length,
      oldPhraseHits: report.oldPhraseHits,
    },
    null,
    2
  )
);

if (mismatches.length > 0 || phraseHits.old.length > 0) {
  console.error("\nverify-science-content-sync: FAILED");
  process.exit(1);
}

console.log("\nverify-science-content-sync: PASS");
