#!/usr/bin/env node
/*
  Leo Kids book content validation after content cleanup.
  Usage from repo root:
    node scripts/validate-book-content-cleanup.mjs
  Or:
    BOOKS_ROOT=path/to/audio-text/books node scripts/validate-book-content-cleanup.mjs
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root =
  process.env.BOOKS_ROOT || path.join(__dirname, "..", "exports", "audio-text", "books");
const problems = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  /** @type {string[]} */
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/page-\d+\.txt$/.test(name)) out.push(p);
  }
  return out;
}

function rel(p) {
  return path.relative(process.cwd(), p).replaceAll(path.sep, "/");
}

function add(severity, category, file, detail) {
  problems.push({ severity, category, file: rel(file), detail });
}

const files = walk(root);
const exactBad = [
  "שאלה מסעיף 5",
  "הַסֵּפֶר עָמֹד",
  "שממנן",
  "מוצאים את הזר — המוזרה",
  "מה מצפים ממנו",
  "דברים שממנו עשויים חפצים",
  "שותים ממנו",
  "There was much water in the bottle",
  "made a project",
  "כמות בעבר ועתיד",
  "מים, לא זזים הרבה",
  "כמה משקל בנפח נתון",
  "אנרגיה שהצטברה במעטפת משתחררת",
  "אנרגיה משתחררת עמוק בתוך כדור הארץ (במעטפת)",
];
const metaGradePatterns = [
  /בכיתה\s*[אבגדהו][׳'’]?\s+(לומדים|נלמד|מתמקדים|בודקים|עובדים|משווים|מזהים|מרחיבים|קוראים|הקטעים|השגיאות|לא)/,
  /כיתה\s*[אבגדהו][׳'’]?\s*—/,
  /ברמת\s+כיתה\s*[אבגדהו]/,
  /תלמידי\s+כיתה\s*[אבגדהו]/,
  /קשר\s+לכיתה\s*[אבגדהו]/,
  /לא\s+נלמדים\s+כאן.*לכיתה\s*[אבגדהו]/,
  /מניחים\s+שעברתם\s+על\s+יסודות\s+כיתה/,
  /מכיתה\s*[אבגדהו][׳'’]?\s+כותבים/,
];

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const bad of exactBad) {
    if (text.includes(bad)) add("FAIL", "forbidden_exact_text", file, bad);
  }
  const lines = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i] === lines[i - 1] && lines[i].length > 1) {
      add("FAIL", "adjacent_duplicate_line", file, `line ${i}: ${lines[i]}`);
    }
  }
  for (const ptn of metaGradePatterns) {
    if (ptn.test(text)) add("REVIEW", "grade_meta_wording", file, String(ptn));
  }
}

const byContent = new Map();
for (const file of files) {
  const text = fs.readFileSync(file, "utf8").replace(/\s+/g, " ").trim();
  if (text.length < 30) continue;
  if (!byContent.has(text)) byContent.set(text, []);
  byContent.get(text).push(file);
}
for (const [, group] of byContent) {
  const books = new Set(group.map((f) => path.basename(path.dirname(path.dirname(f)))));
  if (group.length > 1 && books.size > 1) {
    for (const file of group) {
      add("REVIEW", "cross_book_exact_duplicate_page", file, group.map(rel).join(" | "));
    }
  }
}

const failCount = problems.filter((p) => p.severity === "FAIL").length;
const reviewCount = problems.filter((p) => p.severity === "REVIEW").length;
const report = { checkedFiles: files.length, failCount, reviewCount, problems };
console.log(JSON.stringify(report, null, 2));
if (failCount > 0) process.exit(1);
