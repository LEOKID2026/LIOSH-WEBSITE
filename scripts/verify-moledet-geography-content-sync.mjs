#!/usr/bin/env node
/**
 * Verify moledet + geography markdown matches approved export txt.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";
import { normalizePracticeSectionBody } from "../lib/learning-book/parse-learning-page-markdown.js";

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

const APPROVED_PHRASES = [
  "במקום יבש",
  "שלוש מילים חשובות",
  "על הרצפה",
  "גם כשאף אחד לא אומר לנו",
  "שניהם נכונים",
  "שם נמצא הים התיכון",
  "יכולה להיות מדינה אחרת או ים",
  "זכות וחובה יכולות להיות קשורות זו לזו",
  "מים לא קיימים בלי סוף",
  "מקור אנרגיה נקי ומתחדש",
  "שיטפונות",
  "שיטפון — הרבה מים",
  "להקשיב להוראות המבוגר האחראי",
  "במקום אחד:",
  "ניקיון",
  "מצמצמים פסולת ושומרים על סביבה נקייה יותר",
  "קיבוץ — יישוב קהילתי, שבעבר התבסס יותר על חיים ועבודה משותפים.",
  "בחלק מהקיבוצים יש מסורות של שיתוף ועבודה בקבוצה.",
  "קהילה קטנה יחסית, עם מסורת של שיתוף ועזרה הדדית.",
  "זה קיבוץ — יישוב קהילתי עם מסורת של שיתוף.",
];

const OLD_PATTERN =
  /יבוש|שלושה מילים|הריצפה|כשלא מישהו אומר|שניהם נכון|זכות וחובה תמיד|לא אין סוף|משאב טבעי שלא נגמר|שטפונות|(?<![א-ת])שטף(?![א-ת])|בשטף|יושבים ליד שולחן|עומדים ליד קיר פנימי|בבמקום|(?<![א-ת])נקיון(?![א-ת])|משאבים ממוחזרים|איכות האוויר, המים והנוף|קיבוץ — קהילה שחיה ועובדת יחד|קיבוץ — חדר אוכל משותף|כל המשפחות עובדות יחד בשדות ואוכלות יחד|יישוב שבו כולם עובדים יחד ואוכלים יחד|קיבוץ — חיים ועבודה משותפת לכולם|חדר אוכל לכולם/;

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

function sectionBodyForCompare(body, sectionNum) {
  let b = normalizeText(body).replace(/\n---\s*$/u, "");
  if (sectionNum === 7) b = normalizePracticeSectionBody(b);
  return normalizeText(b);
}

/** @type {string[]} */
const mismatches = [];
let totalPages = 0;
let synced = 0;
/** @type {Record<string, number>} */
const byGrade = {};

for (const book of BOOKS) {
  const entry = getLearningBookEntry(book.websiteSubject, book.grade);
  let pageNumber = 0;

  for (const page of entry.loader.loadAllPages()) {
    for (const section of page.sections) {
      pageNumber += 1;
      totalPages += 1;

      const txtPath = path.join(
        TXT_ROOT,
        book.txtFolder,
        "pages",
        `page-${padPageNum(pageNumber)}.txt`
      );
      const txt = normalizeText(fs.readFileSync(txtPath, "utf8"));
      const mdBody = sectionBodyForCompare(section.body, section.number);
      const mdRel = `${entry.registry.meta.draftsDir}/${page.pageId}.md`.replace(/\\/g, "/");

      if (txt === mdBody) synced += 1;
      else {
        mismatches.push(
          `${book.txtFolder}/pages/page-${padPageNum(pageNumber)}.txt -> ${mdRel} §${section.number}`
        );
      }
    }
  }

  if (pageNumber !== book.expectedPages) {
    mismatches.push(`${book.txtFolder}: page count ${pageNumber} != ${book.expectedPages}`);
  }
  byGrade[book.grade] = pageNumber;
}

/** @type {Record<string, { txt: string[], md: string[] }>} */
const phrases = Object.fromEntries(APPROVED_PHRASES.map((p) => [p, { txt: [], md: [] }]));

for (const book of BOOKS) {
  const entry = getLearningBookEntry(book.websiteSubject, book.grade);
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
      const txt = fs.readFileSync(txtPath, "utf8");
      const mdRel = `${entry.registry.meta.draftsDir}/${page.pageId}.md`;
      const mdRaw = fs.readFileSync(path.join(ROOT, mdRel), "utf8");

      for (const phrase of APPROVED_PHRASES) {
        if (txt.includes(phrase)) {
          phrases[phrase].txt.push(`${book.txtFolder}/pages/page-${padPageNum(pageNumber)}.txt`);
        }
        if (mdRaw.includes(phrase)) {
          phrases[phrase].md.push(mdRel);
        }
      }
    }
  }
}

const searchRoots = [
  path.join(ROOT, "exports/audio-text/books/moledet-geography"),
  path.join(ROOT, "docs/learning-book/moledet-geography/g2"),
  path.join(ROOT, "docs/learning-book/moledet-geography/g3"),
  path.join(ROOT, "docs/learning-book/moledet-geography/g4"),
  path.join(ROOT, "docs/learning-book/moledet-geography/g5"),
  path.join(ROOT, "docs/learning-book/moledet-geography/g6"),
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === "_archive" || name === "README.md") continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(txt|md)$/.test(name)) out.push(p);
  }
  return out;
}

/** @type {string[]} */
const oldPatternHits = [];
/** @type {string[]} */
const bidiHits = [];

for (const root of searchRoots) {
  for (const file of walk(root)) {
    const text = fs.readFileSync(file, "utf8");
    if (OLD_PATTERN.test(text)) {
      oldPatternHits.push(path.relative(ROOT, file).replace(/\\/g, "/"));
    }
    if (/[\u200E\u200F\u202A-\u202E]/.test(text)) {
      bidiHits.push(path.relative(ROOT, file).replace(/\\/g, "/"));
    }
  }
}

const phraseMissing = APPROVED_PHRASES.filter(
  (p) => phrases[p].txt.length === 0 || phrases[p].md.length === 0
);

const report = {
  totalPages,
  expectedTotal: TOTAL_EXPECTED,
  synced,
  mismatches: mismatches.length,
  mismatchSamples: mismatches.slice(0, 20),
  byGrade,
  oldPatternHits,
  phraseMissing,
  bidiControlCharsFound: bidiHits,
  g1Added: fs.existsSync(path.join(ROOT, "docs/learning-book/moledet-geography/g1/drafts")),
};

fs.writeFileSync(
  path.join(ROOT, "docs/learning-book/moledet-geography/moledet-geography-content-sync-verify.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

const failed =
  mismatches.length > 0 ||
  totalPages !== TOTAL_EXPECTED ||
  synced !== TOTAL_EXPECTED ||
  oldPatternHits.length > 0 ||
  phraseMissing.length > 0 ||
  report.g1Added;

console.log(JSON.stringify({ report, failed }, null, 2));
if (failed) process.exit(1);
