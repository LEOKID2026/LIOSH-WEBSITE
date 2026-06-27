/**
 * PASS 12 — exact English final cleanup.
 * Applies full-page replacements only to exports/audio-text/books/english-g1..g6.
 * Does not touch other subjects.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CANDIDATES = [
  path.join(ROOT, "pass12_exact_english_final_fix", "pass12_exact_english_replacements.json"),
  path.join(ROOT, "pass12_exact_english_replacements.json"),
  path.join(ROOT, "scripts", "pass12_exact_english_replacements.json"),
];

const replacementsPath = CANDIDATES.find((p) => fs.existsSync(p));
if (!replacementsPath) {
  console.error("Could not find pass12_exact_english_replacements.json");
  console.error("Checked:");
  for (const p of CANDIDATES) console.error(" - " + p);
  process.exit(1);
}

const BOOKS_ROOT = path.join(ROOT, "exports", "audio-text", "books");
const replacements = JSON.parse(fs.readFileSync(replacementsPath, "utf8"));

const allowedBooks = new Set(["english-g1", "english-g2", "english-g3", "english-g4", "english-g5", "english-g6"]);
const changed = [];

function resolveEnglishPagePath(book, page) {
  const candidates = [
    path.join(BOOKS_ROOT, book, "pages", page),
    path.join(BOOKS_ROOT, "english", book, "pages", page),
  ];
  for (const target of candidates) {
    if (fs.existsSync(target)) return target;
  }
  throw new Error(`Missing page file for ${book}/${page}`);
}

for (const item of replacements) {
  const { book, page, content } = item;
  if (!allowedBooks.has(book)) throw new Error(`Blocked book outside English scope: ${book}`);
  if (!/^page-\d{3}\.txt$/.test(page)) throw new Error(`Bad page filename: ${page}`);
  const target = resolveEnglishPagePath(book, page);
  const rel = path.relative(ROOT, target).replaceAll("\\", "/");
  if (
    !rel.startsWith(`exports/audio-text/books/${book}/pages/`) &&
    !rel.startsWith(`exports/audio-text/books/english/${book}/pages/`)
  ) {
    throw new Error(`Blocked path outside expected scope: ${rel}`);
  }

  const next = content.endsWith("\n") ? content : `${content}\n`;
  const current = fs.readFileSync(target, "utf8");
  if (current !== next) {
    fs.writeFileSync(target, next, "utf8");
    changed.push(rel);
  }
}

const report = {
  pass: "PASS 12 exact English final cleanup",
  replacements: replacements.length,
  changedCount: changed.length,
  changed,
};
fs.writeFileSync(
  path.join(ROOT, "exports", "audio-text", "pass12-exact-english-report.json"),
  JSON.stringify(report, null, 2) + "\n",
  "utf8"
);
console.log(JSON.stringify(report, null, 2));
